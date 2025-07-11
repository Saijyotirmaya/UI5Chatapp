sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "../utils/CommonAgreementPDF",
    "../model/formatter", "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, jsPDF, Formatter, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ContractDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteContractDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                var LoginFunction = await this.commonLoginFunction("Contract");
                if (!LoginFunction) return;
                this.getBusyDialog();
                this.pdfData = {};
                this.byId("CD_id_Datestart")?.setMinDate(null);
                this._makeDatePickersReadOnly(["CD_id_AgreeDate", "CD_id_Datestart", "CD_id_DateEnd"]);
                this._makeDatePickersReadOnly(["CU_id_AgreementDate", "CU_id_AssignmentStartDate", "CU_id_AssignmentEndDate"]);
                await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                // this._fetchCommonData("PaymentTerms", "ContractpaymentModel");
                // this._fetchCommonData("Country", "CountryModel");
                // this._fetchCommonData("Currency", "CurrencyModel");
                this._fetchCommonData("EmailContent", "CCMailModel", {
                    Type: "ContractActive", Action: "CC"
                });
                this._fetchCommonData("ManageCustomer", "CreateCustomerModel");

                this.sArgPara = oEvent.getParameter("arguments").sParContract;
                var AgreementNo = oEvent.getParameter("arguments").sID
                this.CD_onResetWizard();
                this.CD_CommonID();
                var oView = this.getView();
                this.i18nModel = oView.getModel("i18n").getResourceBundle();

                var oWizard = oView.byId("CD_id_Wizard");
                oWizard.discardProgress(oView.byId("CD_id_Firststep"));
                oWizard.goToStep(oView.byId("CD_id_Firststep"));

                this._wizard = oView.byId("wizardContentPage");
                oWizard.getSteps()[0].setValidated(false);

                if (this.sArgPara === "CreateContractFlag") {
                    try {
                        const oData = {
                            AgreementDate: this.Formatter.formatDate(new Date()),
                            ConsultantName: "",
                            ConsultantAddress: "",
                            ContarctEmail: "",
                            ConsultingService: "",
                            Rate: "Day",
                            Amount: "",
                            Currency: "INR",
                            EndClientHirer: "",
                            Location: "REMOTE",
                            HiringContact: "",
                            AssignmentStatus: "New",
                            StartDate: "",
                            EndDate: "",
                            InsuranceRequirement: "No",
                            WarrantyDate: "3 Months",
                            AdditionalRates: "No",
                            PaymentTerms: "30 Days",
                            Status: "Submitted",
                            Salutation: "Mr.",
                            Salutation2: "Mr.",
                            Country: "India",
                            contractLocation: "Kalaburagi",
                            STDCode: "+91",
                            MobileNo: ""
                        };

                        const oModel = new JSONModel(oData);
                        oView.setModel(oModel, "ContractModelWizart");
                        oView.byId("C_id_PageCreate").setVisible(true);
                        oView.byId("CUF_id_Contractpage").setVisible(false);
                        const supdateAgreementDate = new Date();
                        oView.byId("CD_id_Datestart")?.setMinDate(supdateAgreementDate);
                        oView.byId("CD_id_DateEnd")?.setMinDate(supdateAgreementDate);

                        this.getView().byId("CD_id_Submit").setEnabled(false);
                        this.CD_onResetWizard();
                        this.closeBusyDialog(); //  Close BusyDialog
                    } catch (error) {
                        this.closeBusyDialog(); //  Close BusyDialog
                        MessageToast.show(error.message || error.responseText || this.i18nModel.getText("commonErrorMessage"));
                    }
                } else {
                    // UPDATE case
                    this.getView().getModel("LoginModel").setProperty("/sendEmail", false);

                    var ContractStatusModel = new JSONModel({
                        status: false,
                        sendMail: false
                    });
                    this.getView().setModel(ContractStatusModel, "ContractStatus");
                    this.getView().getModel("ContractStatus").refresh(true);

                    var editable = new JSONModel({
                        editable: false,
                        Status: false,
                        renewStatus: false,
                        mobile: false
                    });
                    this.getView().setModel(editable, "simpleForm");
                    this.getView().getModel("simpleForm").refresh(true);

                    var oViewModel = new JSONModel({
                        isEditMode: false,
                        isVisiable: true,
                        isMerge: true,
                    });
                    this.getView().setModel(oViewModel, "viewModel");
                    this.getView().getModel("viewModel").refresh(true);

                    try {
                        var response = await this.ajaxReadWithJQuery("Contract", {
                            ContractNo: this.sArgPara,
                            AgreementNo: AgreementNo
                        });

                        var oResult = response.data[0];
                        this.ContractNo = oResult.ContractNo;
                        this.OldStatus = oResult.ContractStatus;
                        this.AssignmentStartDate = this.Formatter.formatDate(oResult.AssignmentStartDate);
                        this.AssignmentEndDate = this.Formatter.formatDate(oResult.AssignmentEndDate);
                        this.ContractStatus = oResult.ContractStatus;
                        this.AgreementDate = this.Formatter.formatDate(oResult.AgreementDate);
                        this._previousContractStatus = oResult.ContractStatus;

                        if (this.ContractStatus === "Active") {
                            this.getView().getModel("ContractStatus").setProperty("/status", true);
                            this.getView().getModel("ContractStatus").setProperty("/sendMail", false);
                        } else if (this.ContractStatus !== "Inactive" && this.ContractStatus !== "Renewed") {
                            this.getView().getModel("ContractStatus").setProperty("/status", true);
                            this.getView().getModel("ContractStatus").setProperty("/sendMail", true);
                        } else {
                            this.getView().getModel("ContractStatus").setProperty("/status", false);
                            this.getView().getModel("ContractStatus").setProperty("/sendMail", false);
                        }


                        var contractModel = new JSONModel(oResult);
                        this.getOwnerComponent().setModel(contractModel, "oFilteredContractModel");

                        this.getView().getModel("oFilteredContractModel").setProperty("/Amount", Number((oResult.ConsultantRate.split(" ")[0]).replace(/,/g, '')));
                        this.getView().getModel("oFilteredContractModel").setProperty("/Currency", oResult.ConsultantRate.split(" ")[1]);

                        var rateType = oResult.ConsultantRate.split(" ")[3];
                        var varible = rateType === "Hour" ? 0 : rateType === "Day" ? 1 : 2;
                        this.getView().getModel("oFilteredContractModel").setProperty("/HrDaliyMonth", varible);
                        this.getView().byId("C_id_PageCreate").setVisible(false);
                        this.getView().byId("CUF_id_Contractpage").setVisible(true);
                        this.pdfData = this.getView().getModel("oFilteredContractModel").getData();
                        this.onChangeAggrementDate();
                        this.CU_CommonID();
                        this.closeBusyDialog(); // Close BusyDialog
                    } catch (error) {
                        this.closeBusyDialog(); // Close BusyDialog
                        MessageToast.show(error.message || error.responseText || this.i18nModel.getText("commonErrorMessage"));
                    }
                }
            },

            onLogout: function () {
                this.CommonLogoutFunction();
            },

            CD_CommonID: function () {
                const ids = ["CD_id_CName", "CD_id_Address", "CD_id_Email", "CD_id_Amount", "CD_id_EndClientHirer", "CD_id_Locationcomb", "CD_id_HiringContact", "CD_id_ConLocation", "CD_id_ConsultingService", "CD_id_codeModel", "CD_id_Mobile", "CD_id_DateEnd", "CD_id_Datestart"]
                ids.forEach((id) => {
                    this.byId(id).setValueState("None");
                });
            },

            CU_CommonID: function () {
                const ids = ["CU_id_ConsultantName", "CU_id_Role", "CU_id_ContractEmailID", "CU_id_ContractAddress", "CU_id_EndClient", "CU_id_ClientReportContact", "CU_id_EditAmountInput", "CU_id_Country", "CU_id_ContractCity", "CU_id_codeModel",
                    "CU_id_Mobile", "CU_id_Comments"]
                ids.forEach((id) => {
                    this.byId(id).setValueState("None");
                });
            },

            // Reset wizard to initial state
            CD_onResetWizard: function () {
                var oWizard = this.getView().byId("CD_id_Wizard");
                oWizard.discardProgress(oWizard.getSteps()[0]); // Discard progress 
                oWizard.goToStep(oWizard.getSteps()[0]); // Go to the first step
                this.byId("CD_id_StepTwo").getParent().setShowNextButton(true);
            },

            ChangeAggrementDate: function () {
                const oAgreementDatePicker = this.byId("CD_id_AgreeDate");
                const oStartDatePicker = this.byId("CD_id_Datestart");
                const oEndDatePicker = this.byId("CD_id_DateEnd");
                const sAgreementDate = oAgreementDatePicker.getDateValue();

                if (sAgreementDate) {
                    const sStartDate = oStartDatePicker?.getDateValue();
                    const sEndDate = oEndDatePicker?.getDateValue();

                    // Validate Start Date
                    if (sStartDate && sStartDate < sAgreementDate) {
                        oStartDatePicker.setDateValue(null);
                        oStartDatePicker.setValue("");
                        oStartDatePicker.setValueState("Error");
                        oStartDatePicker.setValueStateText("Start Date must be after Agreement Date");
                    } else {
                        oStartDatePicker.setValueState("None");
                    }

                    // Validate End Date
                    if (sEndDate && sEndDate < sAgreementDate) {
                        oEndDatePicker.setDateValue(null);
                        oEndDatePicker.setValue("");
                        oEndDatePicker.setValueState("Error");
                        oEndDatePicker.setValueStateText("End Date must be after Agreement Date");
                    } else {
                        oEndDatePicker.setValueState("None");
                    }

                    oStartDatePicker.setMinDate(sAgreementDate);
                    oStartDatePicker.setMaxDate(null); // 👈 clear any previously set maxDate

                    oEndDatePicker.setMinDate(sAgreementDate);
                    oEndDatePicker.setMaxDate(null); // 👈 clear any previously set maxDate
                    this._forceRevalidate(oStartDatePicker);
                    this._forceRevalidate(oEndDatePicker);
                }
            },

            _forceRevalidate: function (oDatePicker) {
                const oDate = oDatePicker.getDateValue();
                if (oDate) {
                    oDatePicker.setDateValue(null);       // Temporarily clear
                    oDatePicker.setDateValue(oDate);      // Reset to trigger validation
                }
            },

            validateDate: function (oEvent) {
                let oStartDatePicker = this.byId("CD_id_Datestart");
                let oEndDatePicker = this.byId("CD_id_DateEnd");

                const oSource = oEvent.getSource();
                const sValue = oSource.getValue();
                const oDate = this.onFormatDate(sValue);

                if (oDate && !isNaN(oDate.getTime())) {
                    const sSourceId = oSource.getId();

                    // If End Date changed → restrict Start Date
                    if (sSourceId === oEndDatePicker.getId()) {
                        oStartDatePicker.setMaxDate(oDate);
                    }

                    // If Start Date changed → restrict End Date
                    if (sSourceId === oStartDatePicker.getId()) {
                        oEndDatePicker.setMinDate(oDate);
                    }
                }

                // Existing validations
                utils._LCvalidateDate(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep();
                }
            },

            onChangeAggrementDate: function () {
                const oAgreementDatePicker = this.byId("CU_id_AgreementDate");
                const oStartDatePicker = this.byId("CU_id_AssignmentStartDate");
                const oEndDatePicker = this.byId("CU_id_AssignmentEndDate");
                const oAgreementDate = oAgreementDatePicker?.getDateValue();

                if (oAgreementDate) {
                    const oStartDate = oStartDatePicker?.getDateValue();
                    const oEndDate = oEndDatePicker?.getDateValue();

                    if (oStartDate && oStartDate < oAgreementDate) {
                        oStartDatePicker.setValue("");
                        oStartDatePicker.setValueState("Error");
                    } else {
                        oStartDatePicker.setValueState("None");
                    }

                    if (oEndDate && oEndDate < oAgreementDate) {
                        oEndDatePicker.setValue("");
                        oEndDatePicker.setValueState("Error");
                    } else {
                        oEndDatePicker.setValueState("None");
                    }

                    oStartDatePicker?.setMinDate(oAgreementDate);
                    oEndDatePicker?.setMinDate(oAgreementDate);
                }
            },

            CD_validateDate: function (oEvent) {
                let oModel, oStartDatePicker, oEndDatePicker;
                if (this.sArgPara === "CreateContractFlag") {
                    oModel = this.getView().getModel("ContractModelWizart");
                    oStartDatePicker = this.byId("CD_id_Datestart");
                    oEndDatePicker = this.byId("CD_id_DateEnd");
                } else {
                    oModel = this.getView().getModel("oFilteredContractModel");
                    oStartDatePicker = this.byId("CU_id_AssignmentStartDate");
                    oEndDatePicker = this.byId("CU_id_AssignmentEndDate");
                }

                const oSource = oEvent.getSource();
                const sId = oSource.getId();
                const sValue = oSource.getValue();
                const oDate = this.onFormatDate(sValue); // Convert "dd/MM/yyyy" to Date object

                if (!isNaN(oDate?.getTime?.())) {
                    if (sId === oStartDatePicker.getId()) {
                        oEndDatePicker.setMinDate(oDate); // Start Date changed — set minDate on End Date
                    } else if (sId === oEndDatePicker.getId()) {
                        oStartDatePicker.setMaxDate(oDate); // End Date changed — set maxDate on Start Date
                    }
                }
                utils._LCvalidateDate(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); // Only run in create flow
                }
            },

            CD_validateName: function (oEvent) {
                const oSource = oEvent.getSource();
                const selectedKey = oSource.getSelectedKey?.().trim();
                const selectedItem = oSource.getSelectedItem();
                const value = selectedItem ? selectedItem.getAdditionalText() : ""; // Check if selectedItem is not null

                let oModel, oInput;
                if (this.sArgPara === "CreateContractFlag") {
                    oModel = this.getView().getModel("ContractModelWizart");
                    oInput = this.byId("CD_id_HiringContact");
                } else {
                    oModel = this.getView().getModel("oFilteredContractModel");
                    oInput = this.byId("CU_id_ClientReportContact");
                }

                if (oModel) {
                    if (selectedKey) {
                        oModel.setProperty("/Salutation2", selectedKey);
                        oModel.setProperty("/ClientReportContact", value);
                        if (oInput) {
                            oInput.setValueState("None");
                        }
                    }
                }

                utils._LCvalidateName(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); // Validation step for wizard flow
                }
            },

            CD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); //  validation if in create flow
                }
            },

            CD_validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); //  validation if in create flow
                }
            },

            CD_validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); //  validation if in create flow
                }
            },

            CD_onChangeCountry: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent, "oEvent");
                const oSource = oEvent.getSource();
                const selectedKey = oSource.getSelectedKey?.();

                let oModel;
                if (this.sArgPara === "CreateContractFlag") {
                    this.onCountryChange(oEvent, {
                        stdCodeCombo: "CD_id_codeModel",
                        baseLocationCombo: "CD_id_ConLocation",
                        mobileInput: "CD_id_Mobile"
                    });
                    oModel = this.getView().getModel("ContractModelWizart");
                } else {
                    this.onCountryChange(oEvent, {
                        stdCodeCombo: "CU_id_codeModel",
                        baseLocationCombo: "CU_id_ContractCity",
                        mobileInput: "CU_id_Mobile"
                    });
                    oModel = this.getView().getModel("oFilteredContractModel");
                }

                if (oModel) {
                    if (selectedKey) {
                        oModel.setProperty("/Country", selectedKey); // Set or clear country and STDCode 
                        oModel.setProperty("/STDCode", this.byId("CU_id_codeModel").getValue() || this.getView().byId("CD_id_codeModel").getValue());

                    } else {
                        oModel.setProperty("/Country", "");
                        oModel.setProperty("/STDCode", "");
                    }
                    oSource.setValueState("None");
                }

                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); //  validation if in create flow
                }
            },

            // Format date string to Date object
            onFormatDate: function (dateString) {
                var parts = dateString.split('/');
                return new Date(parts[2], parts[1] - 1, parts[0]);
            },

            CD_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); //  validation if in create flow
                }
            },

            CD_onBaseLocationChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); //  validation if in create flow
                }
            },

            CD_ValidateComboBox: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); //  validation if in create flow
                }
            },

            CD_ValidateConsultantName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                if (this.sArgPara === "CreateContractFlag") {
                    this.validateStep(); //  validation if in create flow
                }
            },

            //back function
            CD_onPressback: function () {
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),
                    function () {
                        this.getRouter().navTo("RouteContract");
                    }.bind(this)
                );
                this.byId("CD_id_StepTwo").getParent().setShowNextButton(true);
            },

            CU_onBack: function () {
                var isEditMode = this.getView().getModel("viewModel").getProperty("/isEditMode");
                if (isEditMode) {
                    this.showConfirmationDialog(
                        this.i18nModel.getText("ConfirmActionTitle"),
                        this.i18nModel.getText("backConfirmation"),
                        function () {
                            this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                            this.getView().getModel("simpleForm").setProperty("/editable", false);
                            this.getView().getModel("simpleForm").setProperty("/Status", false);
                            this.getView().getModel("simpleForm").setProperty("/renewStatus", false);
                            this.getView().getModel("simpleForm").setProperty("/mobile", false);
                            this.getRouter().navTo("RouteContract");
                            this.byId("CU_id_Merge").setEnabled(true);
                            this.byId("CU_id_Mail").setEnabled(true);

                        }.bind(this)
                    );
                } else {
                    this.getRouter().navTo("RouteContract");
                }
            },

            validateStep: function () {
                var oModel = this.getView().getModel("ContractModelWizart").getData();

                oModel.AgreementDate = this.byId("CD_id_AgreeDate").getValue();
                oModel.ConsultantName = this.byId("CD_id_CName").getValue();
                oModel.Address = this.byId("CD_id_Address").getValue();
                oModel.ConsultingService = this.byId("CD_id_ConsultingService").getValue();
                oModel.ContarctEmail = this.byId("CD_id_Email").getValue();
                oModel.EndClientHirer = this.byId("CD_id_EndClientHirer").getValue();
                oModel.Amount = this.byId("CD_id_Amount").getValue();
                oModel.ClientReportContact = this.byId("CD_id_HiringContact").getValue();
                oModel.StartDate = this.byId("CD_id_Datestart").getValue();
                oModel.EndDate = this.byId("CD_id_DateEnd").getValue();
                oModel.Country = this.byId("CD_id_Country").getSelectedKey();
                oModel.contractLocation = this.byId("CD_id_ConLocation").getSelectedKey();
                oModel.STDCode = this.byId("CD_id_codeModel").getValue();
                oModel.MobileNo = this.byId("CD_id_Mobile").getValue();

                // Include Country and ConLocation in field check
                const bAllFieldsFilled = oModel.AgreementDate && oModel.ConsultantName && oModel.ConsultantAddress && oModel.ConsultingService && oModel.ContarctEmail &&
                    oModel.EndClientHirer && oModel.Amount && oModel.ClientReportContact && oModel.StartDate && oModel.EndDate && oModel.Country && oModel.contractLocation && oModel.STDCode && oModel.MobileNo;

                if (bAllFieldsFilled) {
                    // Run validations with correct chaining using &&
                    let bValid =
                        utils._LCvalidateDate(this.byId("CD_id_AgreeDate"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_CName"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CD_id_Address"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_ConsultingService"), "ID") &&
                        utils._LCvalidateEmail(this.byId("CD_id_Email"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_EndClientHirer"), "ID") &&
                        utils._LCvalidateAmount(this.byId("CD_id_Amount"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_HiringContact"), "ID") &&
                        utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") &&
                        utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID") &&
                        utils._LCstrictValidationComboBox(this.byId("CD_id_Country"), "ID") &&
                        utils._LCstrictValidationComboBox(this.byId("CD_id_ConLocation"), "ID") &&
                        utils._LCstrictValidationComboBox(this.byId("CD_id_codeModel"), "ID") &&
                        utils._LCvalidateMobileNumber(this.byId("CD_id_Mobile"), "ID");

                    // Set wizard step validation
                    this.byId("CD_id_Wizard").getSteps()[0].setValidated(bValid);
                } else {
                    this.byId("CD_id_Wizard").getSteps()[0].setValidated(false);
                    this.byId("CD_id_Firststep").getAggregation("_nextButton").setText(this.i18nModel.getText("review"));
                }
            },

            //radio button select function
            RadioButtonSelect: function (oEvent) {
                var oModel = this.getView().getModel("ContractModelWizart");
                this.RadioButton = oEvent.getSource().getAggregation("buttons")[oEvent.getSource().mProperties.selectedIndex].getText()
                oModel.setProperty("/Rate", this.RadioButton);
            },

            //third step validation function
            CD_StepTwo: function () {
                this.getView().byId("CD_id_Submit").setEnabled(true);
                this.byId("CD_id_StepTwo").getParent().setShowNextButton(false);
            },

            CD_onSubmit: async function () {
                try {
                    if (
                        utils._LCvalidateDate(this.byId("CD_id_AgreeDate"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_CName"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CD_id_Address"), "ID") &&
                        utils._LCvalidateEmail(this.byId("CD_id_Email"), "ID") &&
                        utils._LCvalidateAmount(this.byId("CD_id_Amount"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_HiringContact"), "ID") &&
                        utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") &&
                        utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_EndClientHirer"), "ID") &&
                        utils._LCstrictValidationComboBox(this.byId("CD_id_Country"), "ID") &&
                        utils._LCstrictValidationComboBox(this.byId("CD_id_ConLocation"), "ID") &&
                        utils._LCstrictValidationComboBox(this.byId("CD_id_codeModel"), "ID") &&
                        utils._LCvalidateMobileNumber(this.byId("CD_id_Mobile"), "ID")
                    ) {
                        var formattedText;
                        switch (this.RadioButton) {
                            case "Hour":
                                formattedText = "Hour";
                                break;
                            case "Day":
                                formattedText = "Day";
                                break;
                            case "Month":
                                formattedText = "Month";
                                break;
                            default:
                                formattedText = "Day";
                        }

                        var oModel = this.getView().getModel("ContractModelWizart");
                        var selectedCurrency = this.byId("CD_id_Currency").getSelectedKey();
                        var branchCode = this.getView().byId("CD_id_ConLocation").getSelectedItem().getAdditionalText();

                        var data = {
                            "ConsultantNameSalutation": oModel.oData.Salutation,
                            "ConsultantName": oModel.oData.ConsultantName,
                            "ConsultantAddress": oModel.oData.ConsultantAddress,
                            "EndClient": oModel.oData.EndClientHirer,
                            "ConsultingService": oModel.oData.ConsultingService,
                            "LocationService": oModel.oData.Location,
                            "ContractStatus": oModel.oData.AssignmentStatus,
                            "AssignmentStartDate": oModel.oData.StartDate.split("/").reverse().join("-"),
                            "AssignmentEndDate": oModel.oData.EndDate.split("/").reverse().join("-"),
                            "ConsultantRate": Formatter.fromatNumber(oModel.oData.Amount) + " " + selectedCurrency + " Per " + formattedText,
                            "PaymentTerms": oModel.oData.PaymentTerms,
                            "ClientReportContactSalutation": oModel.oData.Salutation2,
                            "ClientReportContact": oModel.oData.ClientReportContact,
                            "SpecificInsuranceRequirement": oModel.oData.InsuranceRequirement,
                            "ContractPeriod": oModel.oData.WarrantyDate,
                            "ExpensesClaim": oModel.oData.AdditionalRates,
                            "Status": "Submitted",
                            "AgreementDate": oModel.oData.AgreementDate.split("/").reverse().join("-"),
                            "ContarctEmail": oModel.oData.ContarctEmail,
                            "ContractLocation": oModel.oData.contractLocation !== "" ? oModel.oData.contractLocation : this.getView().byId("CD_id_ConLocation"),
                            "AgreementNo": String(1).padStart(2, '0'),
                            "BranchCode": branchCode,
                            "Country": oModel.oData.Country,
                            "MobileNo": oModel.oData.MobileNo,
                            "STDCode": oModel.oData.STDCode,
                        };

                        this.getBusyDialog(); // Show busy dialog

                        var response = await this.ajaxCreateWithJQuery("Contract", {
                            data: data
                        });

                        if (response.success === true) {
                            this.closeBusyDialog(); // Close busy dialog
                            data.ContractNo = response.ContractNo;

                            var oDialog = new sap.m.Dialog({
                                title: this.i18nModel.getText("success"),
                                type: sap.m.DialogType.Message,
                                state: sap.ui.core.ValueState.Success,
                                content: new sap.m.Text({
                                    text: this.i18nModel.getText("contractSuccess")
                                }),
                                beginButton: new sap.m.Button({
                                    text: "OK",
                                    type: "Accept",
                                    press: function () {
                                        oDialog.close();
                                        this.getView().byId("CD_id_StepTwo").getParent().setShowNextButton(true);
                                        this.getRouter().navTo("RouteContract");
                                    }.bind(this)
                                }),
                                endButton: new sap.m.Button({
                                    text: "Generate PDF",
                                    type: "Attention",
                                    press: function () {
                                        oDialog.close();
                                        this.getView().byId("CD_id_StepTwo").getParent().setShowNextButton(true);
                                        this.getRouter().navTo("RouteContract");
                                        this.contractPDFgenerate(data);
                                    }.bind(this)
                                }),
                                afterClose: function () {
                                    oDialog.destroy();
                                }
                            });

                            oDialog.open();
                        }
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    this.closeBusyDialog(); // Close busy dialog
                    MessageToast.show(error.message || error.responseText || this.i18nModel.getText("commonErrorMessage"));
                }
            },

            onChangeContractStatus: function (oEvent) {
                var oSelectedItem = oEvent.getSource().getSelectedItem();
                var oSelectedValue = oSelectedItem ? oSelectedItem.getText() : "";
                if (oSelectedValue === "Renewed") {
                    this.getView().getModel("simpleForm").setProperty("/renewStatus", false);
                    this.getView().getModel("simpleForm").setProperty("/editable", false);
                    this.getView().getModel("simpleForm").setProperty("/Status", true);
                    this.getView().getModel("simpleForm").setProperty("/mobile", false);
                    MessageToast.show(this.i18nModel.getText("renewOperation"));
                } else if (oSelectedValue === "Inactive") {
                    this.getView().getModel("simpleForm").setProperty("/renewStatus", false);
                    this.getView().getModel("simpleForm").setProperty("/mobile", false);
                    this.getView().getModel("simpleForm").setProperty("/editable", false);
                    this.getView().getModel("simpleForm").setProperty("/Status", true);
                } else if (oSelectedValue === "Active") {
                    this.getView().getModel("simpleForm").setProperty("/renewStatus", false);
                    this.getView().getModel("simpleForm").setProperty("/editable", false);
                    this.getView().getModel("simpleForm").setProperty("/Status", true);
                    this.getView().getModel("simpleForm").setProperty("/mobile", true);
                } else if (oSelectedValue === "New" && this._previousContractStatus === "Active") {
                    this.getView().getModel("simpleForm").setProperty("/renewStatus", false);
                    this.getView().getModel("simpleForm").setProperty("/editable", false);
                    this.getView().getModel("simpleForm").setProperty("/Status", true);
                    this.getView().getModel("simpleForm").setProperty("/mobile", false);
                    MessageToast.show(this.i18nModel.getText("renewOperation"));
                } else if (oSelectedValue === "New") {
                    this.getView().getModel("simpleForm").setProperty("/renewStatus", true);
                    this.getView().getModel("simpleForm").setProperty("/editable", true);
                    this.getView().getModel("simpleForm").setProperty("/Status", true);
                    this.getView().getModel("simpleForm").setProperty("/mobile", true);
                }
            },

            onEditOrSavePress: function () {
                var oView = this.getView();
                var oViewModel = oView.getModel("viewModel");
                var oSimpleFormModel = oView.getModel("simpleForm");
                var isEditMode = oViewModel.getProperty("/isEditMode");
                if (isEditMode) {
                    this.onPressSave();
                } else {
                    var sStatus = this.ContractStatus;
                    if (sStatus === "Renewed") {
                        oSimpleFormModel.setProperty("/renewStatus", true);
                        oSimpleFormModel.setProperty("/editable", false);
                        oSimpleFormModel.setProperty("/Status", true);
                        oSimpleFormModel.setProperty("/mobile", false);
                    } else if (sStatus === "Inactive") {
                        oSimpleFormModel.setProperty("/renewStatus", false);
                        oSimpleFormModel.setProperty("/editable", false);
                        oSimpleFormModel.setProperty("/Status", true);
                        oSimpleFormModel.setProperty("/mobile", false);
                    } else if (sStatus === "Active") {
                        oSimpleFormModel.setProperty("/renewStatus", false);
                        oSimpleFormModel.setProperty("/editable", false);
                        oSimpleFormModel.setProperty("/Status", true);
                        oSimpleFormModel.setProperty("/mobile", true);
                    } else if (sStatus === "New") {
                        oSimpleFormModel.setProperty("/renewStatus", true);
                        oSimpleFormModel.setProperty("/editable", true);
                        oSimpleFormModel.setProperty("/Status", true);
                        oSimpleFormModel.setProperty("/mobile", true);
                    }

                    oViewModel.setProperty("/isEditMode", true);
                    this.byId("CU_id_Merge").setEnabled(false);
                    this.byId("CU_id_Mail").setEnabled(false);
                }
            },

            formatDateToISO: function (dateObj) {
                if (!dateObj || !(dateObj instanceof Date)) return "";
                const year = dateObj.getFullYear();
                const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
                const day = dateObj.getDate().toString().padStart(2, "0");
                return `${year}-${month}-${day}`; // YYYY-MM-DD
            },

            onPressSave: async function () {
                const oView = this.getView();

                const oStartDatePicker = this.byId("CU_id_AssignmentStartDate");
                const oEndDatePicker = this.byId("CU_id_AssignmentEndDate");
                const oStartDate = oStartDatePicker.getDateValue();
                const oEndDate = oEndDatePicker.getDateValue();

                let isDateRangeValid = true;
                if (oStartDate && oEndDate) {
                    if (oStartDate > oEndDate) {
                        oStartDatePicker.setValueState("Error");
                        oStartDatePicker.setValueStateText(this.i18nModel.getText("startDateValidation"));
                        isDateRangeValid = false;
                    } else {
                        oStartDatePicker.setValueState("None");
                    }
                }

                // Mandatory validation
                const isMandatoryValid = (
                    utils._LCvalidateName(this.byId("CU_id_ConsultantName"), "ID") &&
                    utils._LCvalidateEmail(this.byId("CU_id_ContractEmailID"), "ID") &&
                    utils._LCvalidateDate(this.byId("CU_id_AgreementDate"), "ID") &&
                    utils._LCvalidateDate(this.byId("CU_id_AssignmentStartDate"), "ID") &&
                    utils._LCvalidateDate(this.byId("CU_id_AssignmentEndDate"), "ID") &&
                    utils._LCvalidateMandatoryField(this.byId("CU_id_ContractAddress"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_Role"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_EndClient"), "ID") &&
                    utils._LCstrictValidationComboBox(this.byId("CD_id_contractStatus"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_ClientReportContact"), "ID") &&
                    utils._LCvalidateAmount(this.byId("CU_id_EditAmountInput"), "ID") &&
                    utils._LCstrictValidationComboBox(this.byId("CU_id_Country"), "ID") &&
                    utils._LCstrictValidationComboBox(this.byId("CU_id_ContractCity"), "ID") &&
                    utils._LCstrictValidationComboBox(this.byId("CU_id_codeModel"), "ID") &&
                    utils._LCvalidateMobileNumber(this.byId("CU_id_Mobile"), "ID")
                );

                if (!isMandatoryValid || !isDateRangeValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }


                const oModel = oView.getModel("oFilteredContractModel").getData();

                if (oModel.ContractStatus === "Renewed" ||
                    (this._previousContractStatus === "Active" && oModel.ContractStatus !== "Inactive")) {
                    const previousStatus = this._previousContractStatus;
                    this.getView().getModel("oFilteredContractModel").setProperty("/ContractStatus", previousStatus);
                    const oComboBox = this.byId("CD_id_contractStatus");
                    oComboBox.setSelectedKey(previousStatus);
                    this.getView().getModel("oFilteredContractModel").refresh(true);

                    oView.getModel("simpleForm").setProperty("/editable", false);
                    oView.getModel("simpleForm").setProperty("/Status", false);
                    oView.getModel("viewModel").setProperty("/isEditMode", false);
                    oView.getModel("simpleForm").setProperty("/renewStatus", false);
                    oView.getModel("simpleForm").setProperty("/mobile", false);

                    this.byId("CU_id_Merge").setEnabled(true);
                    this.byId("CU_id_Mail").setEnabled(true);

                    return sap.m.MessageBox.error(this.i18nModel.getText("renewOperation"));
                }

                const rateType = oModel.HrDaliyMonth;
                const rateText = rateType === 0 ? "Hour" : rateType === 1 ? "Day" : "Month";
                const selectedCurrency = this.byId("CU_id_CurrencySelect").getSelectedKey();
                const ConsultantRate = `${Formatter.fromatNumber(oModel.Amount)} ${selectedCurrency} Per ${rateText}`;
                const LocationService = this.byId("CD_id_contractLocation").getSelectedKey();
                const branchCode = this.byId("CU_id_ContractCity").getSelectedItem().getAdditionalText();
                const startDate = this.byId("CU_id_AssignmentStartDate").getDateValue();
                const endDate = this.byId("CU_id_AssignmentEndDate").getDateValue();
                const aggrementDate = this.byId("CU_id_AgreementDate").getDateValue();

                const jsonData = {
                    ContractNo: oModel.ContractNo,
                    AgreementNo: oModel.AgreementNo,
                    ConsultantNameSalutation: oModel.ConsultantNameSalutation,
                    ConsultantName: oModel.ConsultantName,
                    ConsultingService: oModel.ConsultingService,
                    ConsultantAddress: oModel.ConsultantAddress,
                    EndClient: oModel.EndClient,
                    LocationService: LocationService,
                    ContractStatus: oModel.ContractStatus,
                    AssignmentStartDate: this.formatDateToISO(startDate),
                    AssignmentEndDate: this.formatDateToISO(endDate),
                    ConsultantRate: ConsultantRate,
                    PaymentTerms: oModel.PaymentTerms,
                    ClientReportContactSalutation: oModel.ClientReportContactSalutation,
                    ClientReportContact: oModel.ClientReportContact,
                    SpecificInsuranceRequirement: oModel.SpecificInsuranceRequirement,
                    ContractPeriod: oModel.ContractPeriod,
                    ExpensesClaim: oModel.ExpensesClaim,
                    AgreementDate: this.formatDateToISO(aggrementDate),
                    ContarctEmail: oModel.ContarctEmail,
                    ContractLocation: oModel.ContractLocation ? oModel.ContractLocation : this.byId("CD_id_ConLocation").getSelectedKey(),
                    Comments: oModel.Comments,
                    BranchCode: branchCode,
                    Country: oModel.Country,
                    MobileNo: oModel.MobileNo,
                    STDCode: oModel.STDCode,
                };

                try {
                    this.getBusyDialog();
                    const requestData = {
                        filters: {
                            ContractNo: oModel.ContractNo,
                            AgreementNo: oModel.AgreementNo
                        },
                        data: jsonData
                    };
                    await this.ajaxUpdateWithJQuery("Contract", requestData);
                    this.pdfData = jsonData;
                    oView.getModel("simpleForm").setProperty("/editable", false);
                    oView.getModel("simpleForm").setProperty("/Status", false);
                    oView.getModel("viewModel").setProperty("/isEditMode", false);
                    oView.getModel("simpleForm").setProperty("/renewStatus", false);
                    oView.getModel("simpleForm").setProperty("/mobile", false);

                    this.byId("CU_id_Merge").setEnabled(true);
                    this.byId("CU_id_Mail").setEnabled(true);
                    await this.updateContractdata(oModel.ContractNo, oModel.AgreementNo);
                    this.closeBusyDialog();
                    this.getRouter().navTo("RouteContractDetails", {
                        sParContract: oModel.ContractNo,
                        sID: oModel.AgreementNo
                    });
                    MessageToast.show(this.i18nModel.getText("agreementUpdatedSuccess"));
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("updateContractFailed"));
                }
            },

            updateContractdata: async function (ContractNo, AgreementNo) {
                var response = await this.ajaxReadWithJQuery("Contract", {
                    ContractNo: ContractNo,
                    AgreementNo: AgreementNo
                });

                var oResult = response.data[0];
                this.ContractNo = oResult.ContractNo;
                this.OldStatus = oResult.ContractStatus;
                this.AssignmentStartDate = this.Formatter.formatDate(oResult.AssignmentStartDate);
                this.AssignmentEndDate = this.Formatter.formatDate(oResult.AssignmentEndDate);
                this.ContractStatus = oResult.ContractStatus;
                this._previousContractStatus = oResult.ContractStatus;

                if (this.ContractStatus === "Active") {
                    this.getView().getModel("ContractStatus").setProperty("/status", true);
                    this.getView().getModel("ContractStatus").setProperty("/sendMail", false);
                } else if (this.ContractStatus !== "Inactive" && this.ContractStatus !== "Renewed") {
                    this.getView().getModel("ContractStatus").setProperty("/status", true);
                    this.getView().getModel("ContractStatus").setProperty("/sendMail", true);
                } else {
                    this.getView().getModel("ContractStatus").setProperty("/status", false);
                    this.getView().getModel("ContractStatus").setProperty("/sendMail", false);
                }

                const contractModel = new JSONModel(oResult);
                this.getOwnerComponent().setModel(contractModel, "oFilteredContractModel");

                this.getView().getModel("oFilteredContractModel").setProperty("/Amount", Number((oResult.ConsultantRate.split(" ")[0]).replace(/,/g, '')));
                this.getView().getModel("oFilteredContractModel").setProperty("/Currency", oResult.ConsultantRate.split(" ")[1]);

                var rateType = oResult.ConsultantRate.split(" ")[3];
                var varible = rateType === "Hour" ? 0 : rateType === "Day" ? 1 : 2;
                this.getView().getModel("oFilteredContractModel").setProperty("/HrDaliyMonth", varible);
                this.getView().byId("C_id_PageCreate").setVisible(false);
                this.getView().byId("CUF_id_Contractpage").setVisible(true);
                this.CU_CommonID();
            },

            CUD_commonOpenDialog: function (fragmentName) {
                if (!this.CUD_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (CUD_oDialogMail) {
                        this.CUD_oDialogMail = CUD_oDialogMail;
                        this.getView().addDependent(this.CUD_oDialogMail);
                        this.CUD_oDialogMail.open();
                    }.bind(this));
                } else {
                    this.CUD_oDialogMail.open();
                }
            },
            CUD_onSendEmail: function () {
                var oContractEmail = this.getView().getModel("oFilteredContractModel").getData().ContarctEmail;
                if (!oContractEmail || oContractEmail.length === 0) {
                    MessageBox.error("To Email is missing");
                    return;
                }
                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: oContractEmail,
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.CUD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
                this.validateSendButton();
            },
            Mail_onPressClose: function () {
                this.CUD_oDialogMail.destroy();
                this.CUD_oDialogMail = null;
                // this.CUD_oDialogMail.close();
            },
            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(
                    oEvent,
                    this, // context
                    "UploaderData", // model name
                    "/attachments", // path to attachment array
                    "/name", // path to comma-separated file names
                    "/isFileUploaded", // boolean flag path
                    "uploadSuccessfull", // i18n success key
                    "fileAlreadyUploaded", // i18n duplicate key
                    "noFileSelected", // i18n no file selected
                    "fileReadError", // i18n file read error
                    () => this.validateSendButton()
                );
            },

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
                this.validateSendButton(); // Reuse from BaseController
            },
            Mail_onSendEmail: function () {
                var oModel = this.getView().getModel("oFilteredContractModel").getData();
               var aAttachments = this.getView().getModel("UploaderData").getData().attachments;
                    if (!aAttachments || aAttachments.length === 0) {
                        MessageToast.show(this.i18nModel.getText("attachmentRequired"));
                        return;
                    }
                var oPayload = {
                    "EmployeeName": oModel.ConsultantName,
                    "toEmailID": oModel.ContarctEmail,
                    "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
                    "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
                    "Designation": oModel.ConsultingService
                };
                this.getBusyDialog();
                this.ajaxCreateWithJQuery("ContractOfferMail", oPayload).then((oData) => {
                    MessageToast.show(this.i18nModel.getText("emailSuccess"));
                    this.closeBusyDialog();
                }).catch((error) => {
                    MessageToast.show(error.responseText);
                    this.closeBusyDialog();
                });
                this.closeBusyDialog();
                this.Mail_onPressClose();
            },

            //PDF download function
            onPressMerge: async function () {
                this.contractPDFgenerate(this.pdfData);
            },

            contractPDFgenerate: async function (oEmpModel) {
                this.getBusyDialog();
                // await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", {
                //     branchCode: oEmpModel.BranchCode
                // });
                await this._fetchCommonData("PDFCondition", "PDFConditionModel", {
                    Type: "Contract"
                });
                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/ContractNo", oEmpModel.ContractNo);
                oPDFModel.setProperty("/AgreementNo", oEmpModel.AgreementNo);
                oPDFModel.setProperty("/ClientName", oEmpModel.ConsultantNameSalutation + " " + oEmpModel.ConsultantName);
                oPDFModel.setProperty("/ClientReportingName", oEmpModel.ClientReportContactSalutation + " " + oEmpModel.ClientReportContact);
                oPDFModel.setProperty("/ClientCompanyAddress", oEmpModel.ConsultantAddress);
                oPDFModel.setProperty("/ClientCompanyName", oEmpModel.EndClient);
                oPDFModel.setProperty("/ConsultingService", oEmpModel.ConsultingService);
                oPDFModel.setProperty("/ClientRole", oEmpModel.ConsultingService);
                oPDFModel.setProperty("/LocationService", oEmpModel.LocationService);
                oPDFModel.setProperty("/ContractStatus", oEmpModel.ContractStatus);
                oPDFModel.setProperty("/AgreementStartDate", Formatter.formatDate(oEmpModel.AssignmentStartDate));
                oPDFModel.setProperty("/AgreementDate", Formatter.formatDate(oEmpModel.AgreementDate));
                oPDFModel.setProperty("/AgreementEndDate", Formatter.formatDate(oEmpModel.AssignmentEndDate));
                oPDFModel.setProperty("/ConsultantRate", oEmpModel.ConsultantRate);
                oPDFModel.setProperty("/PaymentTerms", oEmpModel.PaymentTerms);
                oPDFModel.setProperty("/SpecificInsuranceRequirement", oEmpModel.SpecificInsuranceRequirement);
                oPDFModel.setProperty("/AgreementDuration", oEmpModel.ContractPeriod);
                oPDFModel.setProperty("/ExpensesClaim", oEmpModel.ExpensesClaim);
                var oPDFConditionModel = this.getView().getModel("PDFConditionModel").getData();
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64 && !oCompanyDetailsModel.emailLogoBase64) {
                    try {
                        const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], {
                            type: "image/png"
                        });
                        const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], {
                            type: "image/png"
                        });
                        const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], {
                            type: "image/png"
                        });
                        const emailBlob = new Blob([new Uint8Array(oCompanyDetailsModel.emailLogo?.data)], {
                            type: "image/png"
                        });

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
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GenerateContractPDF === "function") {
                        jsPDF._GenerateContractPDF(this, oPDFModel.getData(), oCompanyDetailsModel, oPDFConditionModel);
                    }
                }
            }
        });
    });