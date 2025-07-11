sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "../utils/CommonAgreementPDF",
    "sap/m/MessageToast",
    "../model/formatter",
],
    function (BaseController, utils, JSONModel, jsPDF, MessageToast, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSAEdit", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteMSAEdit").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                var LoginFUnction = await this.commonLoginFunction("MSA&SOW");
                if (!LoginFUnction) return;
                this.getBusyDialog();
                this.scrollToSection("MsaE_id_ObjectPageLayout", "MsaE_id_SowDetailsSection");
                this._fetchCommonData("EmailContent", "CCMailModel", { Type: "MSA", Action: "CC" });

                this.MSAID = oEvent.getParameter("arguments").sPath;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

                var editable = new JSONModel({ editable: false, isEnabled: true, Mode: "Delete", save: false, submitBtn: false, ExpendBtn: false, RelesedBtn: false, Recruitment: true, BtnEnable: false, addSowBtn: false, ExpendBtn: false, minDate: new Date(), secondMinDate: new Date() });
                this.getView().setModel(editable, "simpleForm");

                this.SimpleFormModel = this.getView().getModel("simpleForm");
                var oModelDataPro = new JSONModel();
                this.getView().setModel(oModelDataPro, "oModelDataPro");
                var oSowCreateModel = new JSONModel();
                this.getView().setModel(oSowCreateModel, "sowCreateModel");
                this._makeDatePickersReadOnly(["MsaE_id_SowStatus"]);
                this.byId("MsaE_id_SowStatus").setValue("All");
                this.BusyIndicater = false;
                await this.MSADetailsReadCall();
                await this.CommonReadCallForSow();
                this.BusyIndicater = true;
                this.closeBusyDialog();
                this.AdvanceBalance = true;
                this.Rate = true;
                this.Desiganation = true;
                this.ConsultantName = true;
                this.GST = true;
            },

            onLogout: function () {
                this.CommonLogoutFunction();
            },

            onRadioButtonGroupSelect: function (oEvent) {
                if (oEvent.getSource().getSelectedButton().getText() === 'Recruitment') {
                    this.SimpleFormModel.setProperty("/Recruitment", true);
                } else {
                    this.SimpleFormModel.setProperty("/Recruitment", false);
                }
            },

            MsaE_GoToInvoice: function () {
                this.getRouter().navTo("RouteCompanyInvoice");
            },

            MSADetailsReadCall: async function () {
                if (this.BusyIndicater) this.getBusyDialog();
                try {
                    await this._fetchCommonData("MSADetails", "FilteredMsaModel", { MsaID: this.MSAID });
                    this.SimpleFormModel.setProperty("/minDate", new Date(this.getView().getModel("FilteredMsaModel").getData()[0].CreateMSADate));
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    this.closeBusyDialog();
                }
            },

            MsaE_onBack: function () {
                this.getRouter().navTo("RouteMSA");
            },

            SOW_onCloseFrag: function () {
                sap.ui.getCore().byId("SOW_id_MsaDesc").setValueState("None");
                sap.ui.getCore().byId("SOW_id_EndDate").setValueState("None");
                sap.ui.getCore().byId("SOW_id_StartDate").setValueState("None");
                this.SOW_oDialog.close();
                this.byId("Sow_Id_ReadTable").removeSelections();
            },
            MsaE_validateDate: function (oEvent) {
                if (oEvent.getParameter('id').split('_').pop() === 'StartDate') {
                    sap.ui.getCore().byId("SOW_id_EndDate").setMinDate(new Date(oEvent.getParameter('value').split('/').reverse().join('-')));
                }
                sap.ui.getCore().byId("SOW_id_EndDate").getValue();
                utils._LCvalidateDate(oEvent);
            },
            MSACountryComboBox: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                sap.ui.getCore().byId("MSA_Nav_Id_City").setValue("");
                var oValue = oEvent.getSource().getSelectedItem().getAdditionalText();
                var oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, oValue);
                sap.ui.getCore().byId("MSA_Nav_Id_Country").getBinding("items").filter(oFilter);
            },
            MSA_onChangeCity: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },
            MsaE_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            Msa_LC_CompanyName: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            Msa_LC_CompanyHeadName: function (oEvent) {
                utils._LCvalidateName(oEvent);
            },

            Msa_LC_HeadPosition: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            Msa_onComboBoxChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            Msa_LC_GSTNO: function (oEvent) {
                this.GST = utils._LCvalidateGstNumber(oEvent);
                if (oEvent.getSource().getValue() === "") {
                    this.GST = true;
                    sap.ui.getCore().byId("MsaE_id_MSA_GSTNO").setValueState("None");
                }
            },
            Msa_ChangeMsaDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.onContractPeriodSelectChange();
            },

            onContractPeriodSelectChange: function (oEvent) {
                const oModelData = this.getView().getModel("FilteredMsaModel").getData()[0];
                const [day, month, year] = sap.ui.getCore().byId("MsaE_id_CreateMSADate").getValue().split('/');
                const assignmentEndDate = new Date(year, month - 1, day);

                const contractPeriod = parseInt(oModelData.ContractPeriod);
                assignmentEndDate.setMonth(assignmentEndDate.getMonth() + contractPeriod);

                oModelData.MsaContractPeriodEndDate = assignmentEndDate.toISOString().split('T')[0];
                oModelData.CreateMSADate = sap.ui.getCore().byId("MsaE_id_CreateMSADate").getValue().split("/").reverse().join("-");
            },

            Msa_LC_PanCard: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            Msa_LC_EmailID: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },

            Msa_LC_Address: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },


            LC_MSA_RateCharge: function (oEvent) {
                utils._LCvalidateTraineeAmount(oEvent);
            },

            onPaymentAdvanceInputChange: function (oEvent) {
                var sAdvanceInput = sap.ui.getCore().byId("Msa_Id_PayAdvance");
                var sBalanceInput = sap.ui.getCore().byId("Msa_Id_PayBalance");

                var sAdvanceValue = sAdvanceInput.getValue();
                var sBalanceValue = sBalanceInput.getValue();

                // Allow up to 2 digits and optional 2 decimal places
                var regex = /^(?:100(?:\.00?)?|[0-9]{1,2}(?:\.\d{1,2})?)$/;

                var bAdvanceValid = regex.test(sAdvanceValue);
                var bBalanceValid = regex.test(sBalanceValue);

                if (!bAdvanceValid || !bBalanceValid) {
                    var msg = "Enter up to 2 digits and 2 decimal places (e.g. 99.99)";
                    sAdvanceInput.setValueState("Error");
                    sAdvanceInput.setValueStateText(msg);
                    sBalanceInput.setValueState("Error");
                    sBalanceInput.setValueStateText(msg);
                    this.AdvanceBalance = false;
                }

                var nAdvance = parseFloat(sAdvanceValue);
                var nBalance = parseFloat(sBalanceValue);
                var nTotal = nAdvance + nBalance;

                // Accept ONLY if total is exactly 100.00 (not 99.99 or 100.01)
                if (nTotal.toFixed(2) !== "100.00") {
                    var sMsg = "Total must be exactly 100%";
                    sAdvanceInput.setValueState("Error");
                    sAdvanceInput.setValueStateText(sMsg);
                    sBalanceInput.setValueState("Error");
                    sBalanceInput.setValueStateText(sMsg);
                    this.AdvanceBalance = false;
                } else {
                    sAdvanceInput.setValueState("None");
                    sBalanceInput.setValueState("None");
                    this.AdvanceBalance = true;
                }
                this.validateStep();
            },

            LC_MSA_RateCharge: function (oEvent) {
                utils._LCvalidateTraineeAmount(oEvent);
            },

            MsaE_onEditOrSavePress: async function () {
                var type = this.getView().getModel("FilteredMsaModel").getData()[0].Type;
                (type === "Recruitment") ? this.SimpleFormModel.setProperty("/Recruitment", true) : this.SimpleFormModel.setProperty("/Recruitment", false);
                if (!this.MSA_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.MSAUpdate",
                        controller: this,
                    }).then(function (MSA_oDialog) {
                        this.MSA_oDialog = MSA_oDialog;
                        this.getView().addDependent(this.MSA_oDialog);
                        this.MSA_oDialog.open();
                        type !== "Recruitment"
                            ? sap.ui.getCore().byId("MsaE_id_Type").setSelectedIndex(0)
                            : sap.ui.getCore().byId("MsaE_id_Type").setSelectedIndex(1);
                        this.resetMsaDialogFields();
                        this._FragmentDatePickersReadOnly(["MsaE_id_CreateMSADate"]);
                    }.bind(this));
                } else {
                    this.MSA_oDialog.open();
                    type !== "Recruitment"
                        ? sap.ui.getCore().byId("MsaE_id_Type").setSelectedIndex(0)
                        : sap.ui.getCore().byId("MsaE_id_Type").setSelectedIndex(1)
                    this.resetMsaDialogFields();
                    this._FragmentDatePickersReadOnly(["MsaE_id_CreateMSADate"]);
                }
            },

            resetMsaDialogFields: function () {
                var oView = sap.ui.getCore();

                // Input Fields
                oView.byId("MsaE_id_CompanyName")?.setValueState("None");
                oView.byId("MsaE_id_CreateMSADate")?.setValueState("None");
                oView.byId("MsaE_id_MsaHead")?.setValueState("None");
                oView.byId("MsaE_id_HeadPosition")?.setValueState("None");
                oView.byId("MsaE_id_MsaPanCard")?.setValueState("None");
                oView.byId("MsaE_id_MSAEmail")?.setValueState("None");
                oView.byId("MsaE_id_MSA_GSTNO")?.setValueState("None");
                oView.byId("Msa_Id_RateCharge")?.setValueState("None");
                oView.byId("Msa_Id_PayAdvance")?.setValueState("None");
                oView.byId("Msa_Id_PayBalance")?.setValueState("None");
                oView.byId("Msa_Id_Refund")?.setValueState("None");
            },

            MSA_Frg_Close: function () {
                this.MSA_oDialog.close();
            },

            MSA_Frg_Update: async function () {
                const isRecruitment = sap.ui.getCore().byId("MsaE_id_Type").getSelectedIndex() === 1;

                const get = sap.ui.getCore().byId.bind(sap.ui.getCore());

                const validationsPassed =
                    utils._LCvalidateMandatoryField(get("MsaE_id_CompanyName"), "ID") &&
                    utils._LCvalidateMandatoryField(get("MsaE_id_HeadPosition"), "ID") &&
                    utils._LCvalidateName(get("MsaE_id_MsaHead"), "ID") &&
                    utils._LCvalidateDate(get("MsaE_id_CreateMSADate"), "ID") &&
                    utils._LCvalidateMandatoryField(get("MsaE_id_MsaPanCard"), "ID") &&
                    utils._LCvalidateEmail(get("MsaE_id_MSAEmail"), "ID") &&
                    utils._LCvalidateMandatoryField(get("MsaE_id_MsaAddress"), "ID") &&
                    utils._LCvalidateMandatoryField(get("MSA_Nav_Id_Country"), "ID") &&
                    utils._LCvalidateMandatoryField(get("MSA_Nav_Id_City"), "ID") &&
                    utils._LCvalidateMandatoryField(get("MsaE_Id_Branch"), "ID") && this.GST &&
                    (!isRecruitment || (
                        utils._LCvalidateTraineeAmount(get("Msa_Id_RateCharge"), "ID") &&
                        utils._LCvalidateTraineeAmount(get("Msa_Id_Refund"), "ID") &&
                        this.AdvanceBalance
                    ));

                if (validationsPassed) {
                    const oModel = this.getView().getModel("FilteredMsaModel").getData()[0];
                    this.getView().getModel("FilteredMsaModel").getData()[0].CreateMSADate = sap.ui.getCore().byId("MsaE_id_CreateMSADate").getValue().split('/').reverse().join('-');

                    const oPayload = {
                        data: oModel,
                        filters: {
                            MsaID: oModel.MsaID
                        }
                    };
                    this.getView().getModel("FilteredMsaModel").refresh(true);
                    this.getBusyDialog();

                    try {
                        const oResponse = await this.ajaxUpdateWithJQuery("MSADetails", oPayload);
                        const messageKey = oResponse
                            ? "msaupdateSuccess"
                            : "msaupdateFailed";

                        MessageToast.show(this.i18nModel.getText(messageKey));
                        this.MSA_oDialog.close();
                    } catch (error) {
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    } finally {
                        this.closeBusyDialog();
                    }

                } else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    this.closeBusyDialog();
                }
            },

            CommonReadCallForSow: async function () {
                if (this.BusyIndicater) this.getBusyDialog();
                const selectedKey = this.byId("MsaE_id_SowStatus").getValue();
                let oFilter = { MsaID: this.MSAID };
                if (selectedKey !== "All") oFilter.Status = selectedKey;

                await this._fetchCommonData("SowDetails", "SowReadModel", oFilter);
                this.closeBusyDialog();
            },

            MsaE_onChangeSowStatus: async function () {
                await this.CommonReadCallForSow();
            },

            SOW_onSaveFrag: async function () {
                if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("SOW_id_MsaDesc"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("SOW_id_StartDate"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("SOW_id_EndDate"), "ID") && this.Rate && this.Desiganation && this.ConsultantName) {
                    var sowCreateModel = this.getView().getModel("sowCreateModel").getData();
                    var oModelDataPro = this.getView().getModel("oModelDataPro").getData();
                    if (!oModelDataPro || oModelDataPro.length === 0) return MessageToast.show(this.i18nModel.getText("msaTableValidation"));

                    for (let i = 0; i < oModelDataPro.length; i++) {
                        let row = oModelDataPro[i];
                        if (!row.Salutation || !row.ConsultantName || !row.Designation || !row.Rate) {
                            sap.m.MessageBox.error(`Please fill all mandatory fields in row ${i + 1}`);
                            return; // 🛑 Stop submission
                        }
                    }
                    this.getBusyDialog();
                    var oJson = {
                        "data": oModelDataPro.map(oModelDataPro => ({
                            "MsaID": sowCreateModel.MsaID,
                            "SowID": sowCreateModel.SowID,
                            "Description": sowCreateModel.Description,
                            "SNo": oModelDataPro.SNo,
                            "Salutation": oModelDataPro.Salutation,
                            "ConsultantName": oModelDataPro.ConsultantName,
                            "Designation": oModelDataPro.Designation,
                            "StartDate": sowCreateModel.StartDate.split('/').reverse().join('-'),
                            "EndDate": sowCreateModel.EndDate.split('/').reverse().join('-'),
                            "Rate": (sowCreateModel.Currency === 'INR') ? oModelDataPro.Rate + " " + sowCreateModel.Currency + " GST " + oModelDataPro.PerDay : oModelDataPro.Rate + " " + sowCreateModel.Currency + " " + oModelDataPro.PerDay,
                            "Status": oModelDataPro.Status
                        }))
                    };

                    await this.ajaxCreateWithJQuery("SowDetails", oJson).then((oData) => {
                        if (oData.success) {
                            this.byId("MsaE_id_SowStatus").setValue("New");
                            this.CommonReadCallForSow();
                            this.SOW_oDialog.close();
                            MessageToast.show(this.i18nModel.getText("sowSuccess"));
                        } else {
                            MessageToast.show(this.i18nModel.getText("sowFailed"));
                        }
                        this.closeBusyDialog();
                    }).catch((error) => {
                        MessageToast.show(error.responseText);
                        this.closeBusyDialog();
                    });
                } else {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            FragmentOpen: function () {
                if (!this.SOW_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.SowDetails",
                        controller: this,
                    }).then(function (SOW_oDialog) {
                        this.SOW_oDialog = SOW_oDialog;
                        this.getView().addDependent(this.SOW_oDialog);
                        this.SOW_oDialog.open();
                        var oTable = sap.ui.getCore().byId("SOW_id_oTableCreateSow");
                        if (oTable) oTable.removeSelections(true);
                        this._FragmentDatePickersReadOnly(["SOW_id_EndDate", "SOW_id_StartDate"]);
                    }.bind(this));
                } else {
                    this.SOW_oDialog.open();
                    var oTable = sap.ui.getCore().byId("SOW_id_oTableCreateSow");
                    if (oTable) oTable.removeSelections(true);
                    this._FragmentDatePickersReadOnly(["SOW_id_EndDate", "SOW_id_StartDate"]);
                }
            },

            SOW_onAddConsultant: function () {
                var oModelPro = this.getView().getModel("oModelDataPro");
                this.SNoValue = this.SNoValue + 1;
                var oDataPro = oModelPro.getProperty("/");
                oDataPro.push({
                    "IndexNo": String(this.SNoValue),
                    "ConsultantName": "",
                    "Designation": "",
                    "Rate": "",
                    "Salutation": "Mr.",
                    "Currency": "INR",
                    "PerDay": "Per Day",
                    "Status": "New"
                });
                oModelPro.setProperty("/", oDataPro);
            },

            onPressDeleteModeCreateSow: function (oEvent) {
                var that = this;
                var oModel = this.getView().getModel("oModelDataPro");
                var oContext = oEvent.getParameter("listItem").getBindingContext("oModelDataPro");
                var sIndex = oContext.getPath().split("/")[1];

                var aData = oModel.getData();
                var selectedItem = aData[sIndex]; // Capture item before modifying array

                if (selectedItem && selectedItem.SNo) {
                    this.showConfirmationDialog(
                        this.i18nModel.getText("msgBoxConfirm"),
                        this.i18nModel.getText("msgBoxConfirmDelete"),
                        function () {
                            that.getBusyDialog();
                            that.ajaxDeleteWithJQuery("/SowDetails", {
                                filters: { SNo: selectedItem.SNo }
                            }).then(() => {
                                MessageToast.show(that.i18nModel.getText("sowDeleteSuccess"));
                                that.CommonReadCallForSow();
                                aData.splice(sIndex, 1);
                                aData.forEach((item, index) => item.IndexNo = index + 1);
                                oModel.setData(aData);
                                that.SNoValue = aData.length;
                                that.closeBusyDialog();
                            }).catch((error) => {
                                that.closeBusyDialog();
                                MessageToast.show(error.responseText);
                            });
                        },
                        function () { that.closeBusyDialog(); }
                    );
                } else {
                    // Local item – delete directly
                    aData.splice(sIndex, 1);
                    aData.forEach((item, index) => item.IndexNo = index + 1);
                    oModel.setData(aData);
                    this.SNoValue = aData.length;
                }
            },

            MsaE_onPressCreateSow: function () {
                this.SimpleFormModel.setProperty("/save", true);
                this.SimpleFormModel.setProperty("/submitBtn", false);
                this.SimpleFormModel.setProperty("/ExpendBtn", false);
                this.SimpleFormModel.setProperty("/RelesedBtn", false);
                this.SimpleFormModel.setProperty("/addSowBtn", true);
                this.FragmentOpen();
                var jsonProData = [];
                this.SNoValue = 0;
                this.getView().getModel("oModelDataPro").setData(jsonProData);

                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                var result = ""
                for (var i = 0; i < 10; i++) {
                    result += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                var jsonSow = {
                    MsaID: this.MSAID,
                    Description: "",
                    SowID: result,
                    StartDate: "",
                    EndDate: "",
                    Currency: "INR"
                };
                this.getView().getModel("sowCreateModel").setData(jsonSow);
                this.SimpleFormModel.setProperty("/Mode", "Delete");
                // sap.ui.getCore().byId("SOW_id_oTableCreateSow").setMode("delete");
            },

            onPressChangeSow: function (oEvent) {
                this.Selected = oEvent.getParameter("listItem").getBindingContext("SowReadModel").getObject();
                if (this.Selected) this.SimpleFormModel.setProperty("/BtnEnable", true);
            },

            MsaE_onPressSOWActive: async function (oEvent) {
                if (!this.byId("Sow_Id_ReadTable").getSelectedItem()) {
                    return MessageToast.show(this.i18nModel.getText("noRowSelected"))
                }
                var FilterData = this.getView().getModel("SowReadModel").getData().filter((item) => item.SowID === this.Selected.SowID);
                var Status = (oEvent.getSource().getText() === "Inactive All") ? "Inactive" : "Active";
                var oData = {
                    "data": FilterData.map((item) => {
                        return {
                            "data": {
                                "Status": Status
                            },
                            "filters": {
                                "SowID": item.SowID
                            }
                        };
                    })
                };
                this.byId("MsaE_id_SowStatus").setValue(Status);
                var Message = (Status === "Inactive") ? this.i18nModel.getText("sowAllInactive") : this.i18nModel.getText("sowAllActive");
                await this.CommonUpdateCall(oData, Message, "ActiveInactive");
                this.SimpleFormModel.setProperty("/BtnEnable", false);
            },

            CommonUpdateCall: async function (Data, Message, type) {
                var oModelDataPro = this.getView().getModel("oModelDataPro").getData();
                if (type !== "ActiveInactive") {
                    if (!oModelDataPro || oModelDataPro.length === 0) return MessageToast.show(this.i18nModel.getText("msaTableValidation"));
                    for (let i = 0; i < oModelDataPro.length; i++) {
                        let row = oModelDataPro[i];
                        if (!row.Salutation || !row.ConsultantName || !row.Designation || !row.Rate) {
                            sap.m.MessageBox.error(`All  fields in Row  ${i + 1}  must be completed to continue`);
                            return;
                        }
                    }
                    if (this.ConsultantName === false || this.Desiganation === false || this.Rate === false) {
                        return MessageToast.show(this.i18nModel.getText("mandatoryFieldsSow"));
                    }
                }
                this.getBusyDialog();
                try {
                    var responce = await this.ajaxUpdateWithJQuery("SowDetails", Data);
                    if (responce) {
                        MessageToast.show(Message);
                        await this.CommonReadCallForSow();
                        if (this.SOW_oDialog) this.SOW_oDialog.close();
                        this.closeBusyDialog();
                    } else {
                        MessageToast.show("Sow updated failed");
                        this.closeBusyDialog();
                    }
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    this.closeBusyDialog();
                }
            },

            TableGetData: async function (value) {
                // Get full data from model
                this.getBusyDialog();
                var SowID = this.byId("Sow_Id_ReadTable").getSelectedItem().getBindingContext("SowReadModel").getObject().SowID;
                await this._fetchCommonData("SowDetails", "SowAllDataModel", { SowID: SowID });
                this.closeBusyDialog();
                var SowReadModel = this.getView().getModel("SowAllDataModel").getData();

                // Filter and deep copy to avoid mutating original model
                var FilterData = JSON.parse(JSON.stringify(
                    SowReadModel.filter((item) => item.SowID === this.Selected.SowID)
                ));

                var sowCreateModel = this.getView().getModel("sowCreateModel");

                if (value === 'Expend') {
                    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                    var result = "";
                    for (var i = 0; i < 10; i++) {
                        result += characters.charAt(Math.floor(Math.random() * characters.length));
                    }

                    var StartDate = new Date(FilterData[0].EndDate);
                    StartDate.setDate(StartDate.getDate() + 1);

                    var EndDate = new Date(StartDate);
                    EndDate.setMonth(EndDate.getMonth() + 3);
                }

                // Set properties for sowCreateModel
                sowCreateModel.setProperty("/SowID", value !== "Expend" ? FilterData[0].SowID : result);
                sowCreateModel.setProperty("/EndDate", this.Formatter.formatDate(value !== "Expend" ? FilterData[0].EndDate : EndDate));
                sowCreateModel.setProperty("/StartDate", this.Formatter.formatDate(value !== "Expend" ? FilterData[0].StartDate : StartDate));
                sowCreateModel.setProperty("/Description", FilterData[0].Description);
                sowCreateModel.setProperty("/Currency", FilterData[0].Rate.split(" ")[1]);

                this.SimpleFormModel.setProperty("/secondMinDate", new Date(FilterData[0].StartDate));

                // Modify local copy safely
                if (value === "Expend") {
                    var oFilteredData = FilterData.filter((item) => item.Status === "Active");
                    this.ExtendBtn = true;
                    if (oFilteredData.length === 0) {
                        this.ExtendBtn = false;
                        this.byId("Sow_Id_ReadTable").removeSelections();
                        return sap.m.MessageBox.error(this.i18nModel.getText("relesedActiveMess"));
                    }
                } else {
                    var oFilteredData = FilterData;
                }
                oFilteredData.forEach((selectedData, index) => {
                    var rateString = selectedData.Rate;
                    selectedData.IndexNo = index + 1;
                    this.SNoValue = selectedData.IndexNo;

                    if (rateString) {
                        var rateParts = rateString.split(" ").filter(Boolean);

                        var rateValue = rateParts[0];
                        var currency = rateParts[1];

                        var rateType = currency === "INR" ? rateParts.slice(3).join(" ") : rateParts.slice(2).join(" ");

                        selectedData.Rate = rateValue;
                        selectedData.Currency = currency;
                        selectedData.PerDay = rateType;
                    }
                });

                // Optionally filter based on status
                if (value === "Relesed") {
                    this.RelesedBtn = true;
                    oFilteredData = oFilteredData.filter((item) => item.Status === "Active");
                    if (oFilteredData.length === 0) {
                        this.RelesedBtn = false;
                        this.byId("Sow_Id_ReadTable").removeSelections();
                        return sap.m.MessageBox.error(this.i18nModel.getText("relesedActiveMess"));
                    }
                }
                oFilteredData.forEach((item, index) => {
                    item.IndexNo = (index + 1)
                })
                this.getView().getModel("oModelDataPro").setData(oFilteredData);
            },

            MsaE_onPressRelesedSow: async function () {
                this.SimpleFormModel.setProperty("/addSowBtn", false);
                await this.TableGetData("Relesed");
                this.SimpleFormModel.setProperty("/ExpendBtn", false);
                this.SimpleFormModel.setProperty("/save", false);
                this.SimpleFormModel.setProperty("/Mode", "MultiSelect");
                this.SimpleFormModel.setProperty("/submitBtn", false);
                this.SimpleFormModel.setProperty("/ExpendBtn", false);
                this.SimpleFormModel.setProperty("/RelesedBtn", true);
                if (this.RelesedBtn === true) this.FragmentOpen();
            },

            MasE_onPressExpendSow: async function () {
                var endDateObj = new Date(this.Selected.EndDate);
                var currentDate = new Date();
                var timeDiff = endDateObj.getTime() - currentDate.getTime();
                var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                if (daysDiff > 30) return sap.m.MessageBox.error(this.i18nModel.getText("sowExtend30Days"));
                this.SimpleFormModel.setProperty("/ExpendBtn", true);
                this.SimpleFormModel.setProperty("/addSowBtn", true);
                await this.TableGetData("Expend");
                this.SimpleFormModel.setProperty("/save", false);
                this.SimpleFormModel.setProperty("/Mode", "MultiSelect");
                this.SimpleFormModel.setProperty("/submitBtn", false);
                this.SimpleFormModel.setProperty("/ExpendBtn", true);
                this.SimpleFormModel.setProperty("/RelesedBtn", false);
                if (this.ExtendBtn) this.FragmentOpen();
            },

            MsaE_onPressUpdateSOW: async function () {
                this.SimpleFormModel.setProperty("/ExpendBtn", false);
                this.SimpleFormModel.setProperty("/addSowBtn", true);
                await this.TableGetData("Update");
                this.SimpleFormModel.setProperty("/save", false);
                this.SimpleFormModel.setProperty("/Mode", "Delete");
                this.SimpleFormModel.setProperty("/submitBtn", true);
                this.SimpleFormModel.setProperty("/ExpendBtn", false);
                this.SimpleFormModel.setProperty("/RelesedBtn", false);
                this.FragmentOpen();
            },

            SOW_onExpendFrag: async function () {
                var oTable = sap.ui.getCore().byId("SOW_id_oTableCreateSow");
                if (!oTable.getSelectedItem()) {
                    return MessageToast.show(this.i18nModel.getText("msaSelectMess"));
                }
                this.getBusyDialog();
                var aSelectedItems = oTable.getSelectedItems();
                var aSelectedData = aSelectedItems.map(function (oItem) {
                    return oItem.getBindingContext("oModelDataPro").getObject();
                });

                var SowId = sap.ui.getCore().byId("SOW_id_SowID").getValue();
                var StartDate = sap.ui.getCore().byId("SOW_id_StartDate").getValue();
                var EndDate = sap.ui.getCore().byId("SOW_id_EndDate").getValue();
                var Desc = sap.ui.getCore().byId("SOW_id_MsaDesc").getValue();
                var sowCreateModel = this.getView().getModel("sowCreateModel").getData();
                var commonMsaID = aSelectedData.length > 0 ? aSelectedData[0].MsaID : null;
                var oJson = {
                    data: aSelectedData.map((item) => ({
                        MsaID: commonMsaID,
                        SowID: SowId,
                        Description: Desc,
                        Salutation: item.Salutation,
                        ConsultantName: item.ConsultantName,
                        Designation: item.Designation,
                        StartDate: StartDate.split('/').reverse().join('-'),
                        EndDate: EndDate.split('/').reverse().join('-'),
                        Rate: (sowCreateModel.Currency === 'INR') ? `${item.Rate} ${sowCreateModel.Currency} GST ${item.PerDay}` : `${item.Rate} ${sowCreateModel.Currency} ${item.PerDay}`,
                        Status: "New"
                    }))
                };

                try {
                    const oData = await this.ajaxCreateWithJQuery("SowDetails", oJson);
                    if (oData.success) {
                        this.byId("MsaE_id_SowStatus").setValue("New");
                        await this.CommonReadCallForSow();
                        MessageToast.show(this.i18nModel.getText("sowExpendCreate"));
                        this.SimpleFormModel.setProperty("/BtnEnable", false);
                    } else {
                        MessageToast.show(this.i18nModel.getText("sowFailed"));
                    }
                } catch (error) {
                    MessageToast.show(error.responseText || this.i18nModel.getText("sowExpendCreateFailed"));
                } finally {
                    this.SOW_oDialog.close();
                }
            },

            SOW_onReleaseFrag: async function () {
                var oTable = sap.ui.getCore().byId("SOW_id_oTableCreateSow");
                if (!sap.ui.getCore().byId("SOW_id_oTableCreateSow").getSelectedItem()) {
                    return MessageToast.show(this.i18nModel.getText("msaSelectMess"))
                }
                this.closeBusyDialog();
                var aSelectedItems = oTable.getSelectedItems();
                var aSelectedData = aSelectedItems.map(function (oItem) {
                    return oItem.getBindingContext("oModelDataPro").getObject();
                });
                var oJson = {
                    data: aSelectedData.map((item) => ({
                        data: {
                            Status: "Inactive"
                        },
                        filters: {
                            SNo: item.SNo
                        }
                    }))
                };
                this.byId("MsaE_id_SowStatus").setValue("Inactive");
                await this.CommonUpdateCall(oJson, this.i18nModel.getText("sowAllRelesedUpdate"),"");
                // this.SOW_oDialog.close();
                this.SimpleFormModel.setProperty("/BtnEnable", false);
            },

            SOW_onSubmitFrag: async function () {
                // this.getBusyDialog();
                const oModelDataPro = this.getView().getModel("oModelDataPro").getData();
                const sowCreateModel = this.getView().getModel("sowCreateModel").getData();

                const transformedData = oModelDataPro.map((item) => ({
                    MsaID: this.MSAID,
                    SowID: sowCreateModel.SowID,
                    Description: sowCreateModel.Description,
                    SNo: item.SNo,
                    Salutation: item.Salutation,
                    ConsultantName: item.ConsultantName,
                    Designation: item.Designation,
                    StartDate: sowCreateModel.StartDate.split('/').reverse().join('-'),
                    EndDate: sowCreateModel.EndDate.split('/').reverse().join('-'),
                    Rate: (sowCreateModel.Currency === 'INR') ? `${item.Rate} ${sowCreateModel.Currency} GST ${item.PerDay}` : `${item.Rate} ${sowCreateModel.Currency} ${item.PerDay}`,
                    Status: item.Status
                }));
                const oData = {
                    data: transformedData.map((item) => ({
                        data: item,
                        filters: {
                            SNo: item.SNo
                        }
                    }))
                };
                this.byId("MsaE_id_SowStatus").setValue("New");
                await this.CommonUpdateCall(oData, this.i18nModel.getText("sowUpdate"),"");
                // this.SOW_oDialog.close();
                this.SimpleFormModel.setProperty("/BtnEnable", false);
            },

            onLiveConsultantName: function (oEvent) {
                this.ConsultantName = utils._LCvalidateName(oEvent);
            },

            onLiveChangeDesiganation: function (oEvent) {
                this.Desiganation = utils._LCvalidateMandatoryField(oEvent);
            },

            onRateChange: function (oEvent) {
                this.Rate = utils._LCvalidateAmount(oEvent);
            },

            onOpenActionSheet: function (oEvent) {
                var oButton = oEvent.getSource();
                if (!this._oActionSheet) {
                    this._oActionSheet = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.ActionsDialog", this);
                    this.getView().addDependent(this._oActionSheet);
                }
                this._oActionSheet.openBy(oButton);
            },

            MsaE_onSendEmailMSA: function (oEvent) {
                this.Type = oEvent.getSource().sId.split('--').pop();
                var oEmployeeEmail = this.getView().getModel("FilteredMsaModel").getData()[0].MsaEmail;
                if (!oEmployeeEmail || oEmployeeEmail.length === 0) {
                    MessageBox.error("To Email is missing");
                    return;
                }
                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: oEmployeeEmail,
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.EOD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
                this.validateSendButton();
            },

            Mail_onPressClose: function () {
                this.EOU_oDialogMail.close();
                this.EOU_oDialogMail.destroy(true);
                this.EOU_oDialogMail = null;
            },

            EOD_commonOpenDialog: function (fragmentName) {
                if (!this.EOU_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (EOU_oDialogMail) {
                        this.EOU_oDialogMail = EOU_oDialogMail;
                        this.getView().addDependent(this.EOU_oDialogMail);
                        this.EOU_oDialogMail.open();
                    }.bind(this));
                } else {
                    this.EOU_oDialogMail.open();
                }
            },

            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(
                    oEvent,
                    this,                      // context
                    "UploaderData",            // model name
                    "/attachments",            // path to attachment array
                    "/name",                   // path to comma-separated file names
                    "/isFileUploaded",         // boolean flag path
                    "uploadSuccessfull",       // i18n success key
                    "fileAlreadyUploaded",     // i18n duplicate key
                    "noFileSelected",          // i18n no file selected
                    "fileReadError",           // i18n file read error
                    () => this.validateSendButton()
                );
            },
            //Mail dialog button visibility
            validateSendButton: function () {
                const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                const emailField = sap.ui.getCore().byId("CCMail_TextArea");
                const uploaderModel = this.getView().getModel("UploaderData");
                if (!sendBtn || !emailField || !uploaderModel) {
                    return;
                }
                const isEmailValid = utils._LCvalidateEmail(emailField, "ID") === true;
                const isFileUploaded = uploaderModel.getProperty("/isFileUploaded") === true;

                sendBtn.setEnabled(isEmailValid && isFileUploaded);
            },

            Mail_onEmailChange: function () {
                this.validateSendButton();
            },

            // onCommonTokenDelete:function(){
            //     this.getView().getModel("UploaderData").setProperty("/attachments",[]);
            // },
            //Send mail
            Mail_onSendEmail: function () {
                try {
                    var aAttachments = this.getView().getModel("UploaderData").getProperty("/attachments");

                    if (!aAttachments || aAttachments.length === 0) {
                        MessageToast.show(this.i18nModel.getText("attachmentRequired")); // Or a hardcoded string: "Please add at least one attachment."
                        return;
                    }
                    var oModel = this.getView().getModel("FilteredMsaModel").getData()[0];

                    var oPayload = {
                        "EmployeeName": oModel.CompanyHeadName,
                        "toEmailID": oModel.MsaEmail,
                        "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
                        "attachments": this.getView().getModel("UploaderData").getProperty("/attachments")
                    };
                    this.getBusyDialog();
                    this.ajaxCreateWithJQuery(this.Type === 'MSA' ? "MSAEmail" : "SOWEmail", oPayload).then((oData) => {
                        MessageToast.show(this.i18nModel.getText("emailSuccess"));
                        this.byId("Sow_Id_ReadTable").removeSelections();
                        this.SimpleFormModel.setProperty("/BtnEnable", false);
                        this.closeBusyDialog();
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.responseText);
                    });
                    this.Mail_onPressClose();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.responseText);
                }
            },

            SOW_onDeleteExtendItem: function () {
                var oTable = sap.ui.getCore().byId("SOW_id_oTableCreateSow");
                var oModel = this.getView().getModel("oModelDataPro");
                var aData = oModel.getData();
                var aSelectedPaths = oTable.getSelectedItems().map(function (oItem) {
                    return oItem.getBindingContext("oModelDataPro").getPath(); // Full path like '/data/2'
                });
                // Extract indexes and sort in descending order to prevent reindexing issues while splicing
                var aIndexesToDelete = aSelectedPaths.map(function (path) {
                    return parseInt(path.split("/").pop());
                }).sort(function (a, b) {
                    return b - a;
                });
                // Remove items from data array
                aIndexesToDelete.forEach(function (index) {
                    aData.splice(index, 1);
                });
                // Update the model with the new data
                oModel.setProperty("/data", aData);
                oTable.removeSelections();
                if (oTable) {
                    oTable.removeSelections(true); // true = clears selection without triggering events
                }
            },

            async MsaE_onPressMerge() {
                this.getBusyDialog();
                var oModel = this.getView().getModel("FilteredMsaModel").getData()[0];
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: oModel.BranchCode });
                var msa = "MSA", nda = "NDA";
                if (oModel.Type === "Recruitment") { msa = "R-MSA"; nda = "R-NDA"; }
                await this._fetchCommonData("PDFCondition", "PDFNDAModel", { Type: nda });
                await this._fetchCommonData("PDFCondition", "PDFMSAModel", { Type: msa });
                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/AgreementDate", Formatter.formatDate(oModel.CreateMSADate));
                oPDFModel.setProperty("/AgreementEndDate", Formatter.formatDate(oModel.MsaContractPeriodEndDate));
                oPDFModel.setProperty("/ClientCompanyName", oModel.CompanyName);
                oPDFModel.setProperty("/ClientCompanyAddress", oModel.Address);
                oPDFModel.setProperty("/ClientName", oModel.Salutation + " " + oModel.CompanyHeadName);
                oPDFModel.setProperty("/ClientRole", oModel.CompanyHeadPosition);
                oPDFModel.setProperty("/AgreementDuration", oModel.ContractPeriod);
                oPDFModel.setProperty("/PaymentTerms", oModel.PaymentTerms);
                oPDFModel.setProperty("/PaymentPerc", oModel.RateCharge);
                oPDFModel.setProperty("/FirstHalfPerc", oModel.PaymentAdvance);
                oPDFModel.setProperty("/SecondHalfPerc", oModel.PaymentBalance);
                oPDFModel.setProperty("/CandidateWorkingMonths", oModel.ReplacementMonth);
                oPDFModel.setProperty("/LatePaymentThreshold", oModel.ReplacementRefund);
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                var oPDFNDAModel = this.getView().getModel("PDFNDAModel").getData();
                var oPDFMSAModel = this.getView().getModel("PDFMSAModel").getData();
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64 && !oCompanyDetailsModel.emailLogoBase64) {
                    try {
                        const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
                        const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], { type: "image/png" });
                        const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });
                        const emailBlob = new Blob([new Uint8Array(oCompanyDetailsModel.emailLogo?.data)], { type: "image/png" });

                        const [logoBase64, signBase64, backgroundBase64, emailBase64] = await Promise.all([
                            this._convertBLOBToImage(logoBlob),
                            this._convertBLOBToImage(signBlob),
                            this._convertBLOBToImage(backgroundBlob),
                            this._convertBLOBToImage(emailBlob)
                        ]);

                        oCompanyDetailsModel.companylogo64 = logoBase64;
                        oCompanyDetailsModel.signature64 = signBase64;
                        oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
                        oCompanyDetailsModel.emailLogoBase64 = emailBase64;
                    } catch (err) {
                        this.closeBusyDialog();
                        console.error("Image compression failed:", err);
                    }
                }
                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GenerateAgreementPDF === "function") {
                        jsPDF._GenerateAgreementPDF(this, oPDFModel.getData(), oCompanyDetailsModel, oPDFNDAModel, oPDFMSAModel);
                    } else {
                        this.closeBusyDialog();
                        console.error("Error: jsPDF._GenerateAgreementPDF function not found.");
                    }
                }
            },

            async MsaE_onPressMergeSow() {
                var tableData = this.getView().getModel("SowReadModel").getData().filter((item) => item.SowID === this.Selected.SowID && item.Status !== "Inactive");
                if (tableData.length === 0) {
                    return sap.m.MessageBox.error("PDF Cannot be generated as all contractors are inactive");
                }
                this.getBusyDialog();
                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/TableData", tableData);
                var oModel = this.getView().getModel("FilteredMsaModel").getData()[0];
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: "KLB01" });
                await this._fetchCommonData("PDFCondition", "PDFSOWModel", { Type: "SOW" });
                oPDFModel.setProperty("/AgreementDate", Formatter.formatDate(oModel.CreateMSADate));
                oPDFModel.setProperty("/ClientCompanyName", oModel.CompanyName);
                oPDFModel.setProperty("/ClientCompanyAddress", oModel.Address);
                oPDFModel.setProperty("/ClientName", oModel.Salutation + " " + oModel.CompanyHeadName);
                oPDFModel.setProperty("/ClientRole", oModel.CompanyHeadPosition);
                oPDFModel.setProperty("/AgreementDuration", oModel.ContractPeriod);
                oPDFModel.setProperty("/SOWCreateDate", Formatter.formatDate(new Date()));
                oPDFModel.setProperty("/SOWStartDate", Formatter.formatDate(oPDFModel.getProperty("/TableData/0/StartDate")));
                oPDFModel.setProperty("/SOWEndDate", Formatter.formatDate(oPDFModel.getProperty("/TableData/0/EndDate")));
                oPDFModel.setProperty("/SOWDescription", oPDFModel.getProperty("/TableData/0/Description"));
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                var oPDFSOWModel = this.getView().getModel("PDFSOWModel").getData();
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64 && !oCompanyDetailsModel.emailLogoBase64) {
                    try {
                        const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
                        const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], { type: "image/png" });
                        const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });
                        const emailBlob = new Blob([new Uint8Array(oCompanyDetailsModel.emailLogo?.data)], { type: "image/png" });

                        const [logoBase64, signBase64, backgroundBase64, emailBase64] = await Promise.all([
                            this._convertBLOBToImage(logoBlob),
                            this._convertBLOBToImage(signBlob),
                            this._convertBLOBToImage(backgroundBlob),
                            this._convertBLOBToImage(emailBlob)
                        ]);

                        oCompanyDetailsModel.companylogo64 = logoBase64;
                        oCompanyDetailsModel.signature64 = signBase64;
                        oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
                        oCompanyDetailsModel.emailLogoBase64 = emailBase64;
                    } catch (err) {
                        console.error("Image compression failed:", err);
                        this.closeBusyDialog();
                    }
                }
                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GenerateSOWPDF === "function") {
                        jsPDF._GenerateSOWPDF(this, oPDFModel.getData(), oCompanyDetailsModel, oPDFSOWModel);
                    } else {
                        console.error("Error: jsPDF._GenerateSOWPDF function not found.");
                        this.closeBusyDialog();
                    }
                }
            },

            onPressOpenRTE: function () {
                var data = `
                    <div style="text-align: justify;">
                        <h3>Terms And Conditions</h3>
                            <ul>
                                <li>Consultant should get time sheet approval from project manager on or before last date for every month.</li>
                                <li>Contract from KAAR TECHNOLOGIES INDIA PRIVATE LIMITED - SEZ UNIT (GST will not be applicable).</li>
                                <li>In case of any leaves availed, it will be considered as LOP. If so, the per day cost to be calculated with (30 days).</li>
                                <li>The invoice should be raised monthly once, upon customer approved days in Timesheet payment will be made.</li>
                                <li>Payment will be 15-20 days from the date of approved invoice.</li>
                                <li>Consultant <strong>(Mehak)</strong> will not discuss any commercial/contractual points with the end customer.</li>
                                <li>The above-mentioned “3rd” clause is applicable only for month rate-based consultants.</li>
                            </ul>
                    </div>`;
                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                if (!this.PORTE_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.CommonRTE",
                        controller: this,
                    }).then(function (oDialog) {
                        this.PORTE_oDialog = oDialog;
                        this.getView().addDependent(this.PORTE_oDialog);
                        this.PORTE_oDialog.open();
                    }.bind(this));
                } else {
                    this.PORTE_oDialog.open();
                }
            },

            FCR_onDownloadPDF: function () {
                this.getBusyDialog();
                this.PORTE_oDialog.close();
                let htmlContent = sap.ui.getCore().byId("FCR_id_RTE").getValue();
                this.MsaE_onPressMergePO(htmlContent);
            },

            FCR_onCloseDialog: function () {
                this.PORTE_oDialog.close();
            },

            MsaE_onPressMergePO: async function (htmlContent) {
                var oPDFModel = this.getView().getModel("PDFData");
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: "KLB01" });
                await this._fetchCommonData("PDFCondition", "PDFSOWModel", { Type: "SOW" });
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                var oPDFSOWModel = this.getView().getModel("PDFSOWModel").getData();
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64 && !oCompanyDetailsModel.emailLogoBase64) {
                    try {
                        const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
                        const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], { type: "image/png" });
                        const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });
                        const emailBlob = new Blob([new Uint8Array(oCompanyDetailsModel.emailLogo?.data)], { type: "image/png" });

                        const [logoBase64, signBase64, backgroundBase64, emailBase64] = await Promise.all([
                            this._convertBLOBToImage(logoBlob),
                            this._convertBLOBToImage(signBlob),
                            this._convertBLOBToImage(backgroundBlob),
                            this._convertBLOBToImage(emailBlob)
                        ]);

                        oCompanyDetailsModel.companylogo64 = logoBase64;
                        oCompanyDetailsModel.signature64 = signBase64;
                        oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
                        oCompanyDetailsModel.emailLogoBase64 = emailBase64;
                    } catch (err) {
                        console.error("Image compression failed:", err);
                        this.closeBusyDialog();
                    }
                }
                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePOPDF === "function") {
                        jsPDF._GeneratePOPDF(this, oPDFModel.getData(), oCompanyDetailsModel, htmlContent);
                    } else {
                        console.error("Error: jsPDF._GenerateSOWPDF function not found.");
                        this.closeBusyDialog();
                    }
                }
            }
        });
    });