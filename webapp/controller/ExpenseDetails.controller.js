sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/suite/ui/commons/Timeline",
    "sap/suite/ui/commons/TimelineItem",
    "sap/collaboration/components/fiori/sharing/attachment/Attachment"
],
    function (Controller, JSONModel, utils, MessageToast, Formatter, MessageBox, Timeline, TimelineItem) {
        "use strict";
        return Controller.extend("sap.kt.com.minihrsolution.controller.ExpenseDetails", {
            Formatter: Formatter,
            onInit: function () {
                // Attach route matched event for "RouteExpensDetails"
                this.getRouter().getRoute("RouteExpensDetails").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                var LoginFUnction = await this.commonLoginFunction("Expense");
                if (!LoginFUnction) return;
                this.getBusyDialog();
                this.scrollToSection("objectPageLayoutExpence", "idExpObjectPageSection");
                try {
                    this.byId("objectPageLayoutExpence").setHeaderContentPinned(true); /// Header content pinned
                    this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                    this.ExpenseID = oEvent.getParameter("arguments").sPath;

                    this.MyInBox = false;
                    if (this.ExpenseID.includes("MyInbox")) {
                        // await this._fetchCommonData("Country", "CountryModel");
                        //  await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                        this.ExpenseID = this.ExpenseID.split("|")[0];
                        this.MyInBox = true;
                    }

                    // if (!this.getView().getModel("CurrencyModel")) await this._fetchCommonData("Currency", "CurrencyModel");
                    await this._fetchCommonData("Expense", "FilteredExpenseModel", {
                        ExpenseID: this.ExpenseID,
                    });

                    var viewModel = new JSONModel({
                        isEditMode: false,
                        status: true,
                        editable: false,
                        enable: true,
                        enableDelete: true,
                        required: true,
                        SubmitBtn: false,
                        SaveBtn: false,
                    });

                    this.getView().setModel(viewModel, "viewModel");
                    this.LoginModel = this.getView().getModel("LoginModel");
                    this.ViewModel = this.getView().getModel("viewModel");

                    var oUploadModel = new sap.ui.model.json.JSONModel({ File: "", FileName: "", FileType: "" });
                    this.getView().setModel(oUploadModel, "UploadModel");

                    this.FilteredExpenseModel = this.getView().getModel("FilteredExpenseModel").getData();

                    this.IndexNoIncreent();

                    if (this.FilteredExpenseModel[0].Status === "Submitted" || this.FilteredExpenseModel[0].Status === "Send to account") {
                        this.byId("exp_Id_ExpenseTable").setMode(sap.m.ListMode.None);
                    } else {
                        this.byId("exp_Id_ExpenseTable").setMode(sap.m.ListMode.SingleSelectLeft);
                    }

                    if (
                        this.FilteredExpenseModel[0].Status === "Draft" ||
                        this.FilteredExpenseModel[0].Status === "Send back by manager" ||
                        this.FilteredExpenseModel[0].Status === "Send back by account"
                    ) {
                        this.ViewModel.setProperty("/status", true);
                    } else {
                        this.ViewModel.setProperty("/status", false);
                    }

                    if (this.FilteredExpenseModel[0].TripType !== "Customer Facing") {
                        this.ViewModel.setProperty("/required", false);
                    }
                    var oTokenModel = new JSONModel({ tokens: [] });
                    this.getView().setModel(oTokenModel, "tokenModel");
                    this.CountryAndCity();
                    this.closeBusyDialog();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog();
                }
                
            },

            onLogout: function () {
                this.CommonLogoutFunction();
            },

            // Expense Item Index increment and ItemExpense Read call
            IndexNoIncreent: function () {
                var that = this;
                var oView = this.getView();
                this.getBusyDialog();
                this._fetchCommonData("ItemExpense", "ItemExpenseModel", {
                    EmployeeID: that.FilteredExpenseModel[0].EmployeeID,
                    ExpenseID: that.ExpenseID
                })
                    .then(function () {
                        let modelData = oView.getModel("ItemExpenseModel").getData();

                        if (!Array.isArray(modelData) || modelData.length === 0) {
                            that.IndexNo = 0;
                            return;
                        }

                        modelData.forEach((item, index) => {
                            item.IndexNo = index + 1;
                            that.IndexNo = index + 1;
                        });

                        oView.getModel("ItemExpenseModel").setData(modelData);
                    })
                    .catch(function (error) {
                        that.IndexNo = 0;
                    })
                    .finally(function () {
                        that.closeBusyDialog();
                    });
            },
            //Download Perdiem Declaration
            Exp_Det_onPressExpenseDownload: function () {
                let fileUrl = window.location.origin.split("index")[0] + "/Perdiem_DeclarationForm.doc";
                sap.m.URLHelper.redirect(fileUrl, true)
            },
            //Open Fragment in Expeanse Item Create and Update 
            openFragment: function () {
                var oView = this.getView();
                var oModel = oView.getModel("FilteredExpenseModel").getData()[0];
                this.ViewModel.setProperty("/MinDate", new Date(oModel.ExpStartDate.split("/").reverse().join("-")));
                this.ViewModel.setProperty("/MaxDate", new Date(oModel.ExpEndDate.split("/").reverse().join("-")));
                if (!this.ExpenseItem) {
                    this.ExpenseItem = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AddItemExpense",
                        controller: this,
                    }).then(
                        function (ExpenseItem) {
                            this.ExpenseItem = ExpenseItem;
                            oView.addDependent(this.ExpenseItem);
                            this.ExpenseItem.open();
                            this._FragmentDatePickersReadOnly(["ExpDet_id_ExpenseDate"])
                        }.bind(this)
                    );
                } else {
                    this.ExpenseItem.open();
                    this._FragmentDatePickersReadOnly(["ExpDet_id_ExpenseDate"])
                }
            },

            Exp_Det_onChangeExpanesItem: function (oEvent) {
                this.SelectedData = oEvent.getSource().getSelectedItem().getBindingContext("ItemExpenseModel").getObject();
                if (this.SelectedData.ItemType === "Peridiem") {
                    this.ViewModel.setProperty("/enable", true);
                    this.ViewModel.setProperty("/enableDelete", false);
                } else {
                    this.ViewModel.setProperty("/enable", true);
                    this.ViewModel.setProperty("/enableDelete", true);
                }
            },
            //  Create Expense Item
            Exp_Det_onPressAddExpenseItem: function () {
                this.ViewModel.setProperty("/SubmitBtn", true);
                this.ViewModel.setProperty("/enable", true);
                this.ViewModel.setProperty("/SaveBtn", false);
                var jsonExpense = {
                    EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
                    EmployeeName: this.LoginModel.getProperty("/EmployeeName"),
                    IndexNo: this.IndexNo + 1,
                    ItemType: "",
                    ExpenseAmount: "0",
                    Currency: "INR",
                    ModeOfPayment: "Employee",
                    ExpenseDate: this.Formatter.formatDate(this.getView().getModel("FilteredExpenseModel").getData()[0].ExpEndDate),
                    Comments: "",
                    Submit: true,
                    Save: false,
                    ConversionRate: "0",
                    ForeignAmount: "0",
                };
                var oExpenseCreateModel = new JSONModel(jsonExpense);
                this.getView().setModel(oExpenseCreateModel, "ExpenseCreateModel");
                this.getView().getModel("tokenModel").setProperty("/tokens", [])
                this.openFragment();
            },
            //Update Expense Items
            Exp_Det_onPressExpenseItemEdit: function () {
                if (this.byId("exp_Id_ExpenseTable").getSelectedItem() === null) {
                    return MessageToast.show(this.i18nModel.getText("expenseEditSelectRowMess"));
                }
                this.ViewModel.setProperty("/SubmitBtn", false);
                this.ViewModel.setProperty("/SaveBtn", true);
                this.openFragment();
                if (this.SelectedData.ItemType === "Perdiem Declaration") {
                    this.ViewModel.setProperty("/enable", false);
                } else {
                    this.ViewModel.setProperty("/enableDelete", true);
                }
                var jsonExpense = {
                    IndexNo: this.SelectedData.IndexNo,
                    ItemID: this.SelectedData.ItemID,
                    ItemType: this.SelectedData.ItemType,
                    ExpenseAmount: this.SelectedData.Currency === "INR" ? this.SelectedData.ExpenseAmount : this.SelectedData.ForeignAmount,
                    Currency: this.SelectedData.Currency,
                    Attachment: this.SelectedData.Attachment,
                    ModeOfPayment: this.SelectedData.ModeOfPayment,
                    ExpenseDate: this.Formatter.formatDate(this.SelectedData.ExpenseDate),
                    Comments: this.SelectedData.Comments,
                    ConversionRate: this.SelectedData.ConversionRate,
                    ForeignAmount: this.SelectedData.ForeignAmount,
                    Attachment: this.SelectedData.Attachment,
                    AttachmentType: this.SelectedData.AttachmentType,
                    AttachmentName: this.SelectedData.AttachmentName,
                    TotalAmount: this.SelectedData.ExpenseAmount,
                    Submit: false,
                    Save: true,
                };
                var oExpenseCreateModel = new JSONModel(jsonExpense);
                this.getView().setModel(oExpenseCreateModel, "ExpenseCreateModel");
                var oModel = this.getView().getModel("tokenModel");
                // Replace entire token list with just the new one
                oModel.setProperty("/tokens", [{
                    key: this.SelectedData.AttachmentName,
                    text: this.SelectedData.AttachmentName
                }]);
            },
            // close Fragment
            Exp_Det_onPressClose: function () {
                sap.ui.getCore().byId("ExpDet_id_Amount").setValueState("None");
                sap.ui.getCore().byId("ExpDet_id_ConvertionRate").setValueState("None");
                sap.ui.getCore().byId("ExpDet_id_Comments").setValueState("None");
                sap.ui.getCore().byId("ExpDet_id_ItemType").setValueState("None");
                this.byId("exp_Id_ExpenseTable").removeSelections();
                this.ViewModel.setProperty("/enable", true);
                this.ExpenseItem.close();
            },

            Exp_Det_onPressBackBtn: function () {
                if (this.MyInBox) {
                    this.getRouter().navTo("RouteMyInbox", { sMyInBox: "ExpenseDetail" });
                } else {
                    if (this.ViewModel.getProperty("/isEditMode")) {
                        this.showConfirmationDialog(
                            this.i18nModel.getText("ConfirmActionTitle"),
                            this.i18nModel.getText("backConfirmation"),
                            function () {
                                this.getRouter().navTo("RouteExpensePage");
                            }.bind(this),
                        );
                    } else {
                        this.getRouter().navTo("RouteExpensePage");
                    }
                    this.byId("Exp_id_Country").setValueState("None");
                    this.byId("Exp_id_Source").setValueState("None");
                    this.byId("Exp_id_Destination").setValueState("None");
                    this.byId("Exp_id_EmpRemark").setValueState("None");
                }
            },

            Exp_Det_onEditOrSavePress: function () {
                var isEditMode = this.ViewModel.getProperty("/isEditMode");
                this.byId("exp_Id_ExpenseTable").removeSelections();
                if (isEditMode) {
                    this.onPressSave();
                } else {
                    this.onMyButtonPressEdit();
                }
            },

            onMyButtonPressEdit: function () {
                this.ViewModel.setProperty("/editable", true);
                this.ViewModel.setProperty("/isEditMode", true);
                this.ViewModel.setProperty("/enable", false);
                this.ViewModel.setProperty("/enableDelete", false);
            },
            //Amount Validation
            LC_ExpAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.Exp_Frg_onChangeConverstionRate();
            },
            // Conversion Rate validation
            LC_ExpConversionRate: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.Exp_Frg_onChangeConverstionRate();
            },
            //Comments Validation
            LC_ExpComments: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            //Source Validation
            Exp_Det_SourceChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent, "oEvent");
                if (oEvent.getSource().getValue() === '') {
                    oEvent.getSource().setValueState("None")
                }
            },
            // Destination Validation
            Exp_Det_DestinationChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent, "oEvent");
                if (oEvent.getSource().getValue() === '') {
                    oEvent.getSource().setValueState("None")
                }
            },

            Exp_Det_CountryChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent, "oEvent");
                if (oEvent.getSource().getValue() === '') {
                    oEvent.getSource().setValueState("None")
                }
                this.byId("Exp_id_Source").setValue("");
                this.byId("Exp_id_Destination").setValue("");
                this.CountryAndCity();
            },

            CountryAndCity: function () {
                var Code = this.getView().getModel("CountryModel").getData().filter((item) => item.countryName === this.byId("Exp_id_Country").getValue());
                var oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, Code[0].code);
                this.byId("Exp_id_Source").getBinding("items").filter(oFilter);
                this.byId("Exp_id_Destination").getBinding("items").filter(oFilter);
            },

            onPressSave: async function () {
                if (
                    utils._LCvalidateMandatoryField(this.byId("Exp_id_Source"), "ID") &&
                    (this.ViewModel.getProperty("/required") === true ? utils._LCvalidateMandatoryField(this.byId("Exp_id_Destination"), "ID") : true) && utils._LCstrictValidationComboBox(this.byId("Exp_id_Country"), "ID")) {
                    var oModel = this.getView().getModel("FilteredExpenseModel");
                    oModel.getData()[0].ExpStartDate = oModel.getData()[0].ExpStartDate.split("T")[0];
                    oModel.getData()[0].ExpEndDate = oModel.getData()[0].ExpEndDate.split("T")[0];
                    delete oModel.getData()[0].Comments;
                    oModel.getData()[0].Visible = false;
                    var oData = {
                        data: oModel.getData()[0],
                        filters: {
                            ExpenseID: oModel.getData()[0].ExpenseID,
                        },
                    };
                    this.getBusyDialog();
                    await this.ajaxUpdateWithJQuery("Expense", oData)
                        .then((oData) => {
                            if (oData) {
                                this.ViewModel.setProperty("/editable", false);
                                this.ViewModel.setProperty("/isEditMode", false);
                                this.ViewModel.setProperty("/enable", true);
                                this.ViewModel.setProperty("/enableDelete", true);
                                MessageToast.show(this.i18nModel.getText("expenseUpdateMess"));
                            } else {
                                MessageToast.show(this.i18nModel.getText("expenseUpdateMessFailed"));
                            }
                            this.closeBusyDialog();
                        })
                        .catch((oError) => {
                            this.closeBusyDialog();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        });
                } else {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            OnPressAttachment: function (oEvent) {
                const oContext = oEvent.getSource().getBindingContext("ItemExpenseModel");
                const oData = oContext.getObject();
                const sMimeType = oData.AttachmentType || "image/png";
                const sBase64 = oData.Attachment;
                const sFileName = oData.FileName || "Document Preview";

                if (!this._oPreviewDialog) {
                    this._oPreviewDialog = new sap.m.Dialog({
                        title: sFileName,
                        contentWidth: "50%",
                        contentHeight: "50%",
                        resizable: true,
                        draggable: true,
                        content: [],
                        endButton: new sap.m.Button({
                            text: "Close",
                            type: "Reject",
                            press: function () {
                                if (this._pdfBlobUrl) {
                                    URL.revokeObjectURL(this._pdfBlobUrl);
                                    this._pdfBlobUrl = null;
                                }
                                this._oPreviewDialog.close();
                            }.bind(this)
                        })
                    });
                    this.getView().addDependent(this._oPreviewDialog);
                }

                this._oPreviewDialog.removeAllContent();

                if (sMimeType.startsWith("image/")) {
                    const sFileUri = `data:${sMimeType};base64,${sBase64}`;
                    const oImage = new sap.m.Image({
                        src: sFileUri,
                        densityAware: false
                    });
                    oImage.addStyleClass("imagePreviewFit");
                    this._oPreviewDialog.addContent(oImage);
                    this._oPreviewDialog.open();
                } else if (sMimeType === "application/pdf") {
                    const byteCharacters = atob(sBase64);
                    const byteArrays = [];
                    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                        const slice = byteCharacters.slice(offset, offset + 512);
                        const byteNumbers = new Array(slice.length);
                        for (let i = 0; i < slice.length; i++) {
                            byteNumbers[i] = slice.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        byteArrays.push(byteArray);
                    }
                    const blob = new Blob(byteArrays, { type: sMimeType });
                    const sBlobUrl = URL.createObjectURL(blob);
                    this._pdfBlobUrl = sBlobUrl;

                    this._oPreviewDialog.addContent(new sap.ui.core.HTML({
                        content: `<iframe src="${sBlobUrl}" width="100%" height="600px" style="border:none;"></iframe>`
                    }));
                    this._oPreviewDialog.open();
                } else {
                    // Unsupported type: Trigger download
                    try {
                        const byteCharacters = atob(sBase64);
                        const byteArrays = [];

                        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                            const slice = byteCharacters.slice(offset, offset + 512);
                            const byteNumbers = new Array(slice.length);
                            for (let i = 0; i < slice.length; i++) {
                                byteNumbers[i] = slice.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            byteArrays.push(byteArray);
                        }

                        const blob = new Blob(byteArrays, { type: sMimeType });
                        const sBlobUrl = URL.createObjectURL(blob);

                        const link = document.createElement("a");
                        link.href = sBlobUrl;
                        link.download = oData.FileName || "attachment";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        URL.revokeObjectURL(sBlobUrl);
                    } catch (e) {
                        MessageToast.show("Attachment could not be downloaded.");
                    }
                }
            },

            Exp_Frg_onItemTypeChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                var oText = oEvent.getSource().getSelectedItem().getText();
                if (oText === "Perdiem Declaration") {
                    this.ViewModel.setProperty("/enable", false);
                    this.getView().getModel("ExpenseCreateModel").getData().ExpenseAmount = 0;
                    this.getView().getModel("ExpenseCreateModel").getData().ModeOfPayment = "Company";
                } else {
                    this.ViewModel.setProperty("/enable", true);
                }
            },

            onFileSizeExceeds: function () {
                MessageToast.show(this.i18nModel.getText("fileSizeExceeds"));
            },

            onBeforeUploadStarts: function (oEvent) {
                const oFile = oEvent.getParameter("files")[0];
                if (!oFile) {
                    MessageToast.show("No file selected.");
                    return;
                }
                const oModel = this.getView().getModel("tokenModel");
                let aTokens = oModel.getProperty("/tokens") || [];

                // Restrict to one file
                if (aTokens.length >= 1) {
                    sap.m.MessageBox.error("Only one file can be uploaded at a time.");
                    return;
                }

                const reader = new FileReader();
                const that = this;

                reader.onload = function (e) {
                    const base64 = e.target.result.split(',')[1];
                    const oUploadModel = that.getView().getModel("UploadModel");
                    if (!oUploadModel) {
                        that.getView().setModel(new sap.ui.model.json.JSONModel(), "UploadModel");
                    }
                    that.getView().getModel("UploadModel").setData({
                        File: base64,
                        FileName: oFile.name,
                        FileType: oFile.type
                    });
                    aTokens.push({ key: oFile.name, text: oFile.name });
                    oModel.setProperty("/tokens", aTokens);

                    MessageToast.show("File uploaded successfully: " + oFile.name);
                };

                reader.readAsDataURL(oFile);
            },
            onTokenDelete: function (oEvent) {
                // Get the model
                var oModel = this.getView().getModel("tokenModel");
                var aTokens = oModel.getProperty("/tokens") || [];

                // Get deleted tokens from event
                var aTokensToDelete = oEvent.getParameter("tokens");

                // Filter out deleted tokens
                aTokensToDelete.forEach(function (oDeletedToken) {
                    var sKey = oDeletedToken.getKey();
                    aTokens = aTokens.filter(function (token) {
                        return token.key !== sKey;
                    });
                });

                // Update model
                oModel.setProperty("/tokens", aTokens);

                // Clear upload model if all tokens are deleted
                if (aTokens.length === 0) {
                    var oUploadModel = this.getView().getModel("UploadModel");
                    oUploadModel.setProperty("/File", "");
                    oUploadModel.setProperty("/FileName", "");
                    oUploadModel.setProperty("/FileType", "");
                }
            },

            async Exp_Det_onPressSubmit() {
                var oModel = this.getView().getModel("ExpenseCreateModel").getData();
                var oUploadModel = this.getView().getModel("UploadModel").getData();
                if (utils._LCvalidateDate(sap.ui.getCore().byId("ExpDet_id_ExpenseDate"), "ID") && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("ExpDet_id_ItemType"), "ID") && (oModel.ItemType !== "Perdiem Declaration" ? utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_Amount"), "ID") : true) && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("ExpDet_id_Comments"), "ID") && (oModel.Currency !== "INR" ? utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_ConvertionRate"), "ID") : true)) {

                    var Attachment = this.getView().getModel("tokenModel").getData();
                    if (!Attachment.tokens || Attachment.tokens.length === 0) {
                        return sap.m.MessageBox.error(this.i18nModel.getText("expUploadMessage"));
                    }

                    var FilterModel = this.getView().getModel("FilteredExpenseModel").getData()[0];
                    if (oModel.Currency !== "INR") this.Exp_Frg_onChangeConverstionRate();
                    var oData = {
                        data: {
                            Comments: oModel.Comments,
                            ExpenseID: FilterModel.ExpenseID,
                            ConversionRate: oModel.Currency !== "INR" ? oModel.ConversionRate : "1",
                            Currency: oModel.Currency,
                            EmployeeID: FilterModel.EmployeeID,
                            ExpenseAmount: oModel.Currency !== "INR" ? oModel.TotalAmount : oModel.ExpenseAmount,
                            ExpenseDate: oModel.ExpenseDate.split("/").reverse().join("-"),
                            ForeignAmount: oModel.ExpenseAmount,
                            ItemType: oModel.ItemType,
                            ModeOfPayment: oModel.ModeOfPayment,
                            Attachment: oUploadModel.File,
                            AttachmentType: oUploadModel.FileType,
                            AttachmentName: oUploadModel.FileName
                        },
                    };
                    this.getBusyDialog();
                    try {
                        const oCreateResponse = await this.ajaxCreateWithJQuery("ItemExpense", oData);
                        if (oCreateResponse) {
                            MessageToast.show(this.i18nModel.getText("expenseCreatedMess"));
                            this.IndexNoIncreent();
                            this.ViewModel.setProperty("/enable", true);
                            this.ExpenseItem.close();
                            this.ExpenseTotalCalculation();
                            this.closeBusyDialog();
                        } else {
                            MessageToast.show(this.i18nModel.getText("expenseCreatedMessFailed"));
                            this.closeBusyDialog();
                        }
                    } catch (oError) {
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    }
                } else {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            async Exp_Det_onPressSaveExpense() {
                var oModel = this.getView().getModel("ExpenseCreateModel").getData();
                var FilterModel = this.getView().getModel("FilteredExpenseModel").getData()[0];
                var oUploadModel = this.getView().getModel("UploadModel").getData();
                if (
                    utils._LCvalidateDate(sap.ui.getCore().byId("ExpDet_id_ExpenseDate"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("ExpDet_id_ItemType"), "ID") &&
                    (
                        oModel.ItemType === "Perdiem Declaration"
                            ? true
                            : (
                                utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_Amount"), "ID") &&
                                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("ExpDet_id_Comments"), "ID") &&
                                (
                                    oModel.Currency !== "INR"
                                        ? utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_ConvertionRate"), "ID")
                                        : true
                                )))) {

                    if (oModel.Currency !== "INR") this.Exp_Frg_onChangeConverstionRate();
                    var Attachment = this.getView().getModel("tokenModel").getData();
                    if (!Attachment.tokens.length > 0) {
                        return sap.m.MessageBox.warning(this.i18nModel.getText("expUploadMessage"));
                    }
                    var oData = {
                        data: {
                            Comments: oModel.Comments,
                            ExpenseID: FilterModel.ExpenseID,
                            ConversionRate: oModel.Currency !== "INR" ? oModel.ConversionRate : "1",
                            Currency: oModel.Currency,
                            EmployeeID: FilterModel.EmployeeID,
                            ExpenseAmount: oModel.Currency !== "INR" ? oModel.TotalAmount : oModel.ExpenseAmount,
                            ExpenseDate: oModel.ExpenseDate.split("/").reverse().join("-"),
                            ForeignAmount: oModel.ExpenseAmount,
                            ItemType: oModel.ItemType,
                            ModeOfPayment: oModel.ModeOfPayment,
                            Attachment: oUploadModel.File,
                            AttachmentType: oUploadModel.FileType,
                            AttachmentName: oUploadModel.FileName
                        },
                        filters: {
                            ItemID: this.SelectedData.ItemID,
                        },
                    };
                    this.getBusyDialog();
                    await this.ajaxUpdateWithJQuery("ItemExpense", oData)
                        .then((oData) => {
                            if (oData) {
                                this.IndexNoIncreent();
                                this.ExpenseTotalCalculation();
                                this.ExpenseItem.close();
                                this.ViewModel.setProperty("/enable", true);
                                MessageToast.show(this.i18nModel.getText("expenseUpdateMess"));
                                this.closeBusyDialog();
                            } else {
                                MessageToast.show(this.i18nModel.getText("expenseUpdateMessFailed"));
                                this.closeBusyDialog();
                            }
                        })
                        .catch((oError) => {
                            this.closeBusyDialog();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        });
                } else {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            Exp_Det_onPressExpenseItemDelete: async function () {
                const that = this;
                const selectedItem = this.byId("exp_Id_ExpenseTable").getSelectedItem();
                if (!selectedItem) {
                    return MessageToast.show(this.i18nModel.getText("expenseDeleteSelectRowMess"));
                }
                this.showConfirmationDialog(
                    this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("commonMesBoxConfirmDelete"),
                    async function () {
                        that.getBusyDialog();
                        try {
                            const itemID = selectedItem.getBindingContext("ItemExpenseModel").getObject().ItemID;
                            await that.ajaxDeleteWithJQuery("/ItemExpense", {
                                filters: {
                                    ItemID: itemID
                                }
                            });

                            MessageToast.show(that.i18nModel.getText("expenseDeleteMess"));

                            await that.ExpenseTotalCalculation();
                            await that.IndexNoIncreent();
                        } catch (error) {
                            MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
                        } finally {
                            that.closeBusyDialog();
                        }
                    },
                    function () {
                        that.closeBusyDialog();
                    });
            },

            ExpenseTotalCalculation: async function () {
                await this._fetchCommonData("ExpenseTotalCalculation", "", {
                    ExpenseID: this.ExpenseID
                });
                await this._fetchCommonData("Expense", "FilteredExpenseModel", {
                    ExpenseID: this.ExpenseID
                });
            },

            Exp_Det_onPressSubmitExpenseItems: function () {
                var that = this;
                var oModelData = that.getView().getModel("FilteredExpenseModel").getData()[0];

                if (oModelData.TotalAmount <= 0) {
                    return MessageBox.error(that.i18nModel.getText("expenseTotalAmountMess"));
                }

                var itemExpenses = that.getView().getModel("ItemExpenseModel").getData();

                if (oModelData.TravelAllowance === "YES") {
                    var hasPerDiemDeclaration = itemExpenses.some(function (item) {
                        return item.ItemType === "Perdiem Declaration";
                    });

                    if (!hasPerDiemDeclaration) {
                        return MessageBox.error(that.i18nModel.getText("expensePerdiemDeclarationValidation"));
                    }
                }

                var checkbox = new sap.m.CheckBox({
                    text: that.i18nModel.getText("expenseSubmittedMess"),
                    selected: false
                });

                var commentTextArea = new sap.m.TextArea({
                    placeholder: that.i18nModel.getText("enterComments"),
                    rows: 3,
                    width: "100%",
                    visible: oModelData.Status !== "Draft",
                    value: "",
                    valueState: sap.ui.core.ValueState.None
                });

                // Dialog for submission confirmation
                var dialog = new sap.m.Dialog({
                    title: that.i18nModel.getText("confirmTitle"),
                    type: sap.m.DialogType.Message,
                    content: [checkbox, commentTextArea],
                    beginButton: new sap.m.Button({
                        text: "OK",
                        type: "Accept",
                        press: function () {
                            if (checkbox.getSelected()) {
                                // 🔴 Validate if comment is required and empty
                                if (commentTextArea.getVisible() && !commentTextArea.getValue().trim()) {
                                    commentTextArea.setValueState(sap.ui.core.ValueState.Error);
                                    commentTextArea.setValueStateText(that.i18nModel.getText("commentsValueState"));
                                    return;
                                } else {
                                    commentTextArea.setValueState(sap.ui.core.ValueState.None); // reset if valid
                                }

                                var userComment = commentTextArea.getVisible() ? commentTextArea.getValue().trim() : "";

                                var inboxData = {
                                    data: {
                                        ExpenseID: oModelData.ExpenseID,
                                        EmployeeID: oModelData.EmployeeID,
                                        EmployeeName: oModelData.EmployeeName,
                                        Type: "Expense",
                                        TripType: oModelData.TripType,
                                        ExpStartDate: oModelData.ExpStartDate.split("T")[0],
                                        ExpEndDate: oModelData.ExpEndDate.split("T")[0],
                                        SubmittedDate: that.Formatter.formatDate(new Date()),
                                        Comments: userComment || (oModelData.comments?.[0]?.Comment || ""),
                                        TotalAmount: oModelData.TotalAmount,
                                        Status: oModelData.Status === "Send back by account" ? "Send to account" : "Submitted",
                                        ManagerRemark: oModelData.ManagerRemark,
                                        AccountingRemark: oModelData.AccountingRemark,
                                        Visible: commentTextArea.getVisible()
                                    },
                                    filters: {
                                        ExpenseID: oModelData.ExpenseID
                                    }
                                };

                                that.getBusyDialog();
                                that.ajaxUpdateWithJQuery("Expense", inboxData).then((oData) => {
                                    if (oData) {
                                        that._fetchCommonData("Expense", "FilteredExpenseModel", { ExpenseID: that.ExpenseID, });
                                        that.ViewModel.setProperty("/status", false);
                                        that.byId("exp_Id_ExpenseTable").setMode(sap.m.ListMode.None);
                                        dialog.close();
                                        MessageToast.show(that.i18nModel.getText("expenseSubmittedStatus"));
                                        that.closeBusyDialog();
                                    } else {
                                        MessageToast.show(that.i18nModel.getText("expenseSubmittedStatusFailed"));
                                        that.closeBusyDialog();
                                    }
                                }).catch((oError) => {
                                    dialog.close();
                                    that.closeBusyDialog();
                                    MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
                                });
                            } else {
                                MessageToast.show(that.i18nModel.getText("checkboxUnselectedMessage"));
                            }
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        type: "Reject",
                        press: function () {
                            dialog.close();
                        }
                    }),
                    afterClose: function () {
                        dialog.destroy();
                    }
                });

                dialog.open();
            },

            Exp_Frg_onChangeConverstionRate: function (oEvent) {
                var oModel = this.getView().getModel("ExpenseCreateModel");
                var oModelExpenseCreate = oModel.getData();
                if (oModelExpenseCreate.Currency !== "INR") {
                    var oData = parseFloat(oModelExpenseCreate.ExpenseAmount) * parseFloat(oModelExpenseCreate.ConversionRate);
                    oModel.setProperty("/TotalAmount", oData.toFixed(2));
                }
            },

            onShowMore: function (oEvent) {
                var oContext = oEvent.getSource().getBindingContext("ItemExpenseModel");
                var oData = oContext.getObject();
                var oComment = oData.Comments || {}; // Assuming single comment object

                var oTimelineItem = new sap.suite.ui.commons.TimelineItem({
                    dateTime: this.Formatter.formatDate(oData.ExpenseDate),
                    title: oData.ItemType || "Anonymous",
                    text: oComment || "No comment provided",
                    userNameClickable: false,
                    icon: "sap-icon://comment"
                });

                var oTimeline = new sap.suite.ui.commons.Timeline({
                    showHeader: false,
                    enableBusyIndicator: false,
                    width: "100%",
                    sortOldestFirst: true,
                    enableDoubleSided: false,
                    content: [oTimelineItem],
                    showHeaderBar: false
                });

                var oDialog = new sap.m.Dialog({
                    title: "Expense Item Comment",
                    contentWidth: "25rem",
                    contentHeight: "15rem",
                    draggable: true,
                    resizable: true,
                    content: [oTimeline],
                    endButton: new sap.m.Button({
                        text: "Close",
                        type: "Reject",
                        press: function () {
                            oDialog.close();
                            oDialog.destroy();
                        }
                    })
                });
                oDialog.open();
            },

            onSectionChange: function (oEvent) {
                var oSection = oEvent.getParameter("section");
                if (oSection.getTitle() === 'Comments') {
                    this.AL_onShowEmployeeComments(oEvent);
                }
            },

            AL_onShowEmployeeComments: function (oEvent) {
                var oView = this.getView();
                var aData = oView.getModel("FilteredExpenseModel").getData();
                var oData = Array.isArray(aData) && aData.length > 0 ? aData[0] : {};
                var aComments = oData.comments || [];

                var aTimelineItems = aComments.reverse().map(function (oComment) {
                    return new sap.suite.ui.commons.TimelineItem({
                        dateTime: new Date(oComment.CommentDateTime).toLocaleString(),
                        title: oComment.CommentedBy || "Anonymous",
                        text: oComment.Comment || "No comment provided",
                        userNameClickable: false,
                        icon: "sap-icon://comment"
                    });
                });
                var oTimeline = new sap.suite.ui.commons.Timeline({
                    showHeader: false,
                    enableBusyIndicator: false,
                    width: "100%",
                    sortOldestFirst: false,
                    enableDoubleSided: false,
                    content: aTimelineItems,
                    showHeaderBar: false
                });
                var oVBox = oView.byId("timelineContainer");
                oVBox.removeAllItems();
                oVBox.addItem(oTimeline);
            }

        });
    });