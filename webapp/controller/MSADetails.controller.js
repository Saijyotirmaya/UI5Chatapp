sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/m/MessageBox",
    "../utils/CommonAgreementPDF",
],
    function (BaseController, utils, JSONModel, MessageToast, Formatter, MessageBox, jsPDF) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSADetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteMSADetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function () {
                var LoginFUnction = await this.commonLoginFunction("MSA&SOW");
                if (!LoginFUnction) return;
                this._ViewDatePickersReadOnly(["MsaD_id_CreateMSADate"], this.getView());
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(false);
                this.byId("MsaD_id_Submit").setEnabled(false);
                this.byId("MasD_id_ThirdStep").getParent().setShowNextButton(false);
                this.byId("MsaD_id_Type").setEditable(true);
                this.T_onResetWizard();
                var oModelMSA = new JSONModel({
                    CompanyName: "",
                    CreateMSADate: this.Formatter.formatDate(new Date()),
                    PanCard: "",
                    Address: "",
                    CompanyHeadName: "",
                    CompanyHeadPosition: "",
                    MsaEmail: "",
                    PaymentTerms: "30 Days",
                    ContractPeriod: "12 Months",
                    Salutation: "Mr.",
                    Status: "New",
                    MsaContractPeriodEndDate: "",
                    BranchCode: "",
                    Type: "",
                    RateCharge: "",
                    PaymentAdvance: "",
                    PaymentBalance: "",
                    ReplacementMonth: "2 Months",
                    ReplacementRefund: "",
                    Country: "",
                    City: "",
                    GST: ""
                });
                this.getView().setModel(oModelMSA, "msaModelWizart");

                var oModel = new JSONModel({ Recruitment: false });
                this.getView().setModel(oModel, "VisibleModel")
                this.AdvanceBalance = true;
                this.byId("MsaD_id_Type").setSelectedIndex(0);
                this.GST = true;
            },

            onLogout: function () {
                this.CommonLogoutFunction();
            },

            onRadioButtonGroupSelect: function (oEvent) {
                if (oEvent.getSource().getSelectedButton().getText() === 'Recruitment') {
                    this.getView().getModel("VisibleModel").setProperty("/Recruitment", true);
                } else {
                    this.getView().getModel("VisibleModel").setProperty("/Recruitment", false);
                }
            },

            T_onResetWizard: function () {
                var oWizard = this.getView().byId("MsaD_id_Wizard");
                oWizard.discardProgress(oWizard.getSteps()[0]); // Discard progress 
                oWizard.goToStep(oWizard.getSteps()[0]); // Go to the first step
                this.byId("MasD_id_ThirdStep").getParent().setShowNextButton(true);
            },

            onPaymentAdvanceInputChange: function (oEvent) {
                var sAdvanceInput = this.byId("Msa_Id_PayAdvance");
                var sBalanceInput = this.byId("Msa_Id_PayBalance");

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

            MsaD_onBack: function () {
                this.getRouter().navTo("RouteMSA");
                this.byId("MsaD_id_CompanyName").setValueState("None");
                this.byId("MsaD_id_HeadName").setValueState("None");
                this.byId("MsaD_id_HeadPosition").setValueState("None");
                this.byId("MsaD_id_CreateMSADate").setValueState("None");
                this.byId("MsaD_id_Email").setValueState("None");
                this.byId("MsaD_id_Address").setValueState("None");
                this.byId("MsaD_id_PanCard").setValueState("None");
                this.byId("MSA_Id_Country").setValueState("None");
                this.byId("MSA_Id_City").setValueState("None");
                this.byId("Msa_Id_RateCharge").setValueState("None");
                this.byId("MsaD_id_GST").setValueState("None");
                this.byId("Msa_Id_PayAdvance").setValueState("None");
                this.byId("Msa_Id_PayBalance").setValueState("None");
                this.byId("Msa_Id_Refund").setValueState("None");
            },
            MsaD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.validateStep();
            },
            MsaD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.validateStep();
            },
            MsaD_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                this.validateStep();
            },
            MsaD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
            },

            Msa_BranchChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.validateStep();
            },

            LC_MSA_RateCharge: function (oEvent) {
                utils._LCvalidateTraineeAmount(oEvent);
                this.validateStep();
            },

            MsaD_validateGST: function (oEvent) {
                this.GST = utils._LCvalidateGstNumber(oEvent);
                if (oEvent.getSource().getValue() === "") {
                    this.GST = true; // If GST field is empty, consider it valid
                    this.byId("MsaD_id_GST").setValueState("None");
                }
                this.validateStep();
            },
            MSACountryComboBox: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.validateStep();
                this.byId("MSA_Id_City").setValue("");
                var oValue = oEvent.getSource().getSelectedItem().getAdditionalText();
                var oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, oValue);
                this.byId("MSA_Id_City").getBinding("items").filter(oFilter);
            },

            MSA_onChangeCity: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.validateStep();
            },

            validateStep: function () {
                // Check if all fields have values
                var allFieldsFilled = this.getView().byId("MsaD_id_CompanyName").getValue() && this.getView().byId("MsaD_id_HeadName").getValue() && this.getView().byId("MsaD_id_HeadPosition").getValue() && this.getView().byId("MsaD_id_CreateMSADate").getValue() && this.getView().byId("MsaD_id_PanCard").getValue() && this.getView().byId("MsaD_id_Email").getValue() && this.getView().byId('MsaD_id_Address').getValue();
                if (allFieldsFilled) {
                    // Validate each field 
                    var isRecruitment = this.getView().getModel("VisibleModel").getProperty("/Recruitment");

                    var isValid =
                        utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_CompanyName"), "ID") &&
                        utils._LCvalidateName(this.getView().byId("MsaD_id_HeadName"), "ID") &&
                        utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_HeadPosition"), "ID") &&
                        utils._LCvalidateDate(this.getView().byId("MsaD_id_CreateMSADate"), "ID") &&
                        utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_PanCard"), "ID") &&
                        utils._LCvalidateEmail(this.getView().byId("MsaD_id_Email"), "ID") &&
                        utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_Address"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("MsaD_id_Branch"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("MSA_Id_Country"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("MSA_Id_City"), "ID") && this.GST &&
                        (
                            !isRecruitment || (
                                utils._LCvalidateTraineeAmount(this.byId("Msa_Id_RateCharge"), "ID") &&
                                utils._LCvalidateTraineeAmount(this.byId("Msa_Id_Refund"), "ID") && this.AdvanceBalance
                            ));

                    this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(isValid);
                } else {
                    this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(false);
                    this.byId("MsaD_id_WizardO").getAggregation("_nextButton").setText(this.i18nModel.getText("review"));
                }
            },

            MsaD_onComplete: function () {
                this.byId("MasD_id_ThirdStep").getParent().setShowNextButton(false);
                this.byId("MsaD_id_Submit").setEnabled(true);
                this.byId("MsaD_id_Type").setEditable(false);
                this.byId("reviewPageType").setText(this.byId("MsaD_id_Type").getSelectedButton().getText());
            },

            MsaD_reviewSubmit: async function () {
                var that = this;
                const oWizard = this.byId("MsaD_id_Wizard");
                if (!oWizard.getSteps()[0].getValidated()) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                try {
                    this.getBusyDialog();
                    const oModelData = this.getView().getModel("msaModelWizart").getData();
                    const [day, month, year] = oModelData.CreateMSADate.split('/');
                    const assignmentEndDate = new Date(year, month - 1, day);

                    const contractPeriod = parseInt(oModelData.ContractPeriod.split(" ")[0]);
                    assignmentEndDate.setMonth(assignmentEndDate.getMonth() + contractPeriod);

                    oModelData.MsaContractPeriodEndDate = assignmentEndDate.toISOString().split('T')[0];
                    oModelData.CreateMSADate = oModelData.CreateMSADate.split("/").reverse().join("-");
                    oModelData.Type = this.byId("MsaD_id_Type").getSelectedButton().getText();

                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.ReplacementMonth = "0"
                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.ReplacementRefund = "0"
                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.PaymentBalance = "0"
                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.PaymentAdvance = "0"
                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.RateCharge = "0"

                    const oCreateResponse = await this.ajaxCreateWithJQuery("MSADetails", { data: oModelData });

                    if (oCreateResponse) {
                        var oDialog = new sap.m.Dialog({
                            title: this.i18nModel.getText("success"),
                            type: sap.m.DialogType.Message,
                            state: sap.ui.core.ValueState.Success,
                            content: new sap.m.Text({
                                text: this.i18nModel.getText("msaCreatedMsg")
                            }),
                            beginButton: new sap.m.Button({
                                text: "OK",
                                type: "Accept",
                                press: function () {
                                    oDialog.close();
                                    that.closeBusyDialog();
                                    that.getRouter().navTo("RouteMSA");
                                    that.byId("MasD_id_ThirdStep").getParent().setShowNextButton(true);
                                }
                            }),
                            endButton: new sap.m.Button({
                                text: "Generate PDF",
                                type: "Attention",
                                press: function () {
                                    oDialog.close();
                                    that.MsaE_onPressMerge();
                                    that.closeBusyDialog();
                                    that.getRouter().navTo("RouteMSA");
                                    that.byId("MasD_id_ThirdStep").getParent().setShowNextButton(true);
                                }
                            }),
                            afterClose: function () {
                                oDialog.destroy();
                            }
                        });
                        oDialog.open();
                    } else {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("expenseCreatedMessFailed"));
                    }
                } catch (oError) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            async MsaE_onPressMerge() {
                this.getBusyDialog();
                var oModel = this.getView().getModel("msaModelWizart").getData();
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

        });
    });