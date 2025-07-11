sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",
    "../utils/AutomotiveQuotationPDF",
    "sap/ui/core/BusyIndicator"
], (BaseController, utils, MessageToast, Filter, FilterOperator, formatter, jsPDF, BusyIndicator) => {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.QuotationForm", {
        formatter: formatter,
        onInit() {
            this.getOwnerComponent().getRouter().getRoute("RouteQuotationForm").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            var LoginFunction = await this.commonLoginFunction("A_Quotations");
            if (!LoginFunction) return;
            BusyIndicator.hide();
            this.getBusyDialog();
            var oView = this.getView();
            this.oCore = sap.ui.getCore();
            this.oModel = oView.getModel("Quotation");
            this.oLoginModel = oView.getModel("LoginModel");
            this._makeDatePickersReadOnly(["QF_id_VehVariant"]);
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.checkLoginModel();
            var response = await this.ajaxCreateWithJQuery("UniqueScheme", { data: {} });
            if (response.success) {
                this.oModel.setProperty("/ModelList", response.results);
            } else {
                MessageToast.show(this.i18nModel.getText("msgTraineeformerror"));
            }
            oView.byId("QF_id_PDFBtn").setEnabled(true);
            await this._commonGETCall("CompanyCodeDetails", "CompanyCodeData", { branchCode: this.oModel.getProperty("/QuotationFormData/BranchCode") });
            this.oModel.setProperty("/VariantList", []);
            var aFieldIds = ["QF_id_BranchCodes", "QF_id_CustomerName", "QF_id_CustMobile", "QF_id_EmpMobile", "QF_id_CustEmail", "QF_id_CustAadhar", "QF_id_CustPanNumber", "QF_id_CustPinCode", "QF_id_CustGSTNo", "QF_id_CustAddress", "QF_id_VehModel", "QF_id_VehVariant"];
            aFieldIds.forEach(function (sId) {
                oView.byId(sId).setValueState("None");
            });
            this.closeBusyDialog();
        },

        QF_onNavBack: function () {
            if (this.oModel.getProperty("/MasterEdit")) {
                this.showConfirmationDialog(this.i18nModel.getText("ConfirmActionTitle"), this.i18nModel.getText("backConfirmation"), function () { BusyIndicator.show(0); this.getRouter().navTo("RouteQuotation"); }.bind(this))
            } else {
                BusyIndicator.show(0);
                this.getRouter().navTo("RouteQuotation");
            }
        },

        QF_onBranchCodeChange: async function (oEvent) {
            this.getView().byId("QF_id_HeaderContents").setBusy(true);
            if (utils._LCstrictValidationComboBox(oEvent)) {
                var sSelectedValue = (oEvent.getSource().getSelectedItem());
                await this._commonGETCall("CompanyCodeDetails", "CompanyCodeData", { branchCode: sSelectedValue.getKey() });
                this.oModel.setProperty("/QuotationFormData/BranchCode", sSelectedValue.getKey());
                this.oModel.setProperty("/QuotationFormData/Branch", sSelectedValue.getAdditionalText());
            }
            this.getView().byId("QF_id_HeaderContents").setBusy(false);
        },

        QF_onNameChange: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },

        QF_onMobileChange: function (oEvent) {
            utils._LCvalidateMobileNumber(oEvent);
        },

        QF_onEmailChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        QF_onAadharChange: function (oEvent) {
            utils._LCvalidateAadharCard(oEvent);
        },

        QF_onPanChange: function (oEvent) {
            utils._LCvalidatePanCard(oEvent);
        },

        QF_onGSTChange: function (oEvent) {
            if (oEvent.getParameter("newValue").trim() === "") {
                this.getView().byId("QF_id_CustGSTNo").setValueState("None");
                return;
            }
            utils._LCvalidateGstNumber(oEvent);
        },

        QF_onAddressChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        QF_onPinChange: function (oEvent) {
            utils._LCvalidatePinCode(oEvent);
        },

        QF_PriceValidation: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            if (/[^0-9.,]/.test(sValue)) oSource.setValue(sValue.replace(/[^0-9.,]/g, ""));
        },

        QF_onModelChange: async function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
            this.QF_onCallVariant(oEvent.getSource().getSelectedKey());
        },

        QF_onModelSelectionChange: function () {
            const properties = ["Variant", "Transmission", "Color", "Fuel", "BoardPlate", "Make", "Emission", "EXShowroom", "TCS1Perc", "ROADTAX", "AddOnInsurance", "TempCharges", "RegHypCharge", "ShieldOfTrust4YR45K", "EXTDWarrantyFOR4YR80K", "STDFittings", "FastTag", "VAS", "RSA", "DiscountOffers", "ConsumerScheme", "EXShowroomAfterScheme", "TotalOnRoad"];
            properties.forEach(prop => {
                this.oModel.setProperty(`/QuotationFormData/${prop}`, "");
            });
        },

        QF_onCallVariant: async function (selectedKey) {
            this.getView().byId("QF_id_VehVariant").setBusy(true);
            try {
                var response = await this.ajaxCreateWithJQuery("UniqueScheme", { filters: { Model: selectedKey } });
                if (response.success) {
                    this.oModel.setProperty("/VariantList", response.results);
                } else {
                    MessageToast.show(this.i18nModel.getText("msgTraineeformerror"));
                }
            }
            catch (e) {
                console.log(e);
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
            this.getView().byId("QF_id_VehVariant").setBusy(false);
        },

        QF_onVariantChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        QF_onOpenValueHelpDialog: function () {
            if (!this.QF_oDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.VehicleVariantList",
                    controller: this,
                }).then(function (oDialog) {
                    this.QF_oDialog = oDialog;
                    this.getView().addDependent(this.QF_oDialog);
                    this.QF_oDialog.open();
                }.bind(this));
            } else {
                this.QF_oDialog.open();
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            if (!sQuery) sQuery = oEvent.getParameter("query");
            var oBinding = this.oCore.byId("VVF_id_Table").getBinding("items");
            var aFilters = [];
            if (sQuery) {
                aFilters = [
                    new Filter("Variant", FilterOperator.Contains, sQuery),
                    new Filter("Transmission", FilterOperator.Contains, sQuery),
                    new Filter("Fuel", FilterOperator.Contains, sQuery),
                    new Filter("Color", FilterOperator.Contains, sQuery),
                    new Filter("BoardPlate", FilterOperator.Contains, sQuery),
                ];
                var oCombinedFilter = new Filter({
                    filters: aFilters,
                    and: false,
                });
                oBinding.filter(oCombinedFilter);
            } else {
                oBinding.filter([]);
            }
        },

        VVF_onVariantSelect: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("Quotation").getObject();
            var oOldData = this.oModel.getProperty("/QuotationFormData");
            var oNewData = Object.assign({}, oOldData, oContext);
            this.oModel.setProperty("/QuotationFormData", oNewData);
            this.getView().byId("QF_id_VehVariant").setValueState("None");
            this._calculateOnRoad();
            this.VVF_onCloseDialog();
        },

        VVF_onCloseDialog: function () {
            this.oCore.byId("VVF_id_SearchField").setValue("");
            var oBinding = this.oCore.byId("VVF_id_Table").getBinding("items");
            if (oBinding) oBinding.filter([]);
            this.QF_oDialog.close();
        },

        QF_onPriceChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue().trim();
            var rawValue = sValue.replace(/,/g, "");
            if (!/^\d*\.?\d*$/.test(rawValue)) {
                rawValue = 0;
            } else {
                rawValue = parseFloat(rawValue);
            }
            if (isNaN(rawValue)) {
                rawValue = 0;
            }
            var formattedValue = rawValue.toFixed(2);
            var sBindingPath = oSource.getBinding("value").getPath();
            this.oModel.setProperty(sBindingPath, formattedValue);
            this._calculateOnRoad();
        },

        _calculateOnRoad: function () {
            var exShowroomAfterScheme =
                (parseFloat(this.oModel.getProperty("/QuotationFormData/EXShowroom")) || 0) -
                (parseFloat(this.oModel.getProperty("/QuotationFormData/ConsumerScheme")) || 0);
            this.oModel.setProperty("/QuotationFormData/EXShowroomAfterScheme", exShowroomAfterScheme);

            var totalOnRoad =
                (parseFloat(this.oModel.getProperty("/QuotationFormData/EXShowroomAfterScheme")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/ENVTax1Perc")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/TCS1Perc")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/ROADTAX")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/AddOnInsurance")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/RegHypCharge")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/ShieldOfTrust4YR45K")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/EXTDWarrantyFOR4YR80K")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/STDFittings")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/FastTag")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/VAS")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/RSA")) || 0) -
                (parseFloat(this.oModel.getProperty("/QuotationFormData/DiscountOffers")) || 0);
            this.oModel.setProperty("/QuotationFormData/TotalOnRoad", totalOnRoad);
            this.oModel.refresh(true);
        },

        QF_onPressSubmit: async function () {
            BusyIndicator.show(0);
            var oData = this.oModel.getProperty("/QuotationFormData/");
            try {
                if (this._checkValidation()) {
                    oData.QuotationDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(oData.QuotationDate);
                    oData.ValidUpto = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(oData.ValidUpto);
                    delete oData.ID;
                    if (!oData.Branch) { oData.Branch = this.getView().byId("QF_id_BranchCodes").getSelectedItem().getAdditionalText(); }
                    var response = await this.ajaxCreateWithJQuery("A_Quotations", {
                        data: oData,
                    });
                    if (response.success) {
                        this.oModel.setProperty("/QuotationFormData/QuotationNumber", response.QuotationNumber);
                        this._submitSuccess();
                    } else {
                        MessageToast.show(this.i18nModel.getText("msgTraineeformerror"));
                    }
                }
                else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            } catch (error) {
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
            BusyIndicator.hide();
        },

        _submitSuccess: function () {
            BusyIndicator.show(0);
            var that = this;
            if (!this.QF_oSuccessDialog) {
                this.QF_oSuccessDialog = new sap.m.Dialog({
                    title: "Success",
                    type: sap.m.DialogType.Message,
                    state: "Success",
                    content: new sap.m.Text({
                        text: that.i18nModel.getText("qCreateSuccess"),
                    }),
                    buttons: [
                        new sap.m.Button({
                            text: that.i18nModel.getText("OkButton"),
                            type: "Accept",
                            press: function () {
                                BusyIndicator.show(0);
                                that.QF_oSuccessDialog.close();
                                that.getRouter().navTo("RouteQuotation");
                            },
                        }),
                        new sap.m.Button({
                            text: that.i18nModel.getText("tileUnit"),
                            type: "Reject",
                            press: function () {
                                BusyIndicator.show(0);
                                that.QF_oSuccessDialog.close();
                                that.QF_onDownloadPDF();
                                that.getRouter().navTo("RouteQuotation");
                            },
                        }),
                    ],
                });
                this.getView().addDependent(this.QF_oSuccessDialog);
            }
            this.QF_oSuccessDialog.open();
        },

        QF_onPressEdit: async function () {
            var sRole = this.oLoginModel.getProperty("/Role");
            var edits = this.oModel.getProperty("/isEditable");
            var masteredits = this.oModel.getProperty("/MasterEdit");
            if (sRole === "Admin" || sRole === "CEO") {
                this.oModel.setProperty("/isEditable", !edits);
                this.oModel.setProperty("/MasterEdit", !masteredits);
            } else {
                this.oModel.setProperty("/MasterEdit", !masteredits);
            }
            if (masteredits) {
                if (this._checkValidation()) {
                    BusyIndicator.show(0);
                    var oData = this.oModel.getProperty("/QuotationFormData/");
                    oData.QuotationDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(oData.QuotationDate));
                    oData.ValidUpto = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(oData.ValidUpto));
                    if (oData.ID) { delete oData.ID }
                    try {
                        var response = await this.ajaxUpdateWithJQuery("A_Quotations", {
                            data: oData,
                            filters: {
                                "QuotationNumber": this.oModel.getProperty("/QuotationFormData/QuotationNumber")
                            }
                        });
                        if (response.success) {
                            MessageToast.show(this.i18nModel.getText("qUpdated"));
                        }
                        else {
                            MessageToast.show(this.i18nModel.getText("msgTraineeformerror"));
                            this.oModel.setProperty("/MasterEdit", masteredits);
                            this.oModel.setProperty("/isEditable", edits);
                        }
                    }
                    catch (error) {
                        console.log(error);
                        MessageToast.show(this.i18nModel.getText("msgTraineeformerror"));
                        this.oModel.setProperty("/MasterEdit", masteredits);
                        this.oModel.setProperty("/isEditable", edits);
                    }
                    this.getView().byId("QF_id_PDFBtn").setEnabled(true);
                    this.oModel.setProperty("/VisibleStatus", false);
                    BusyIndicator.hide();
                } else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    this.oModel.setProperty("/MasterEdit", masteredits);
                    this.oModel.setProperty("/isEditable", edits);
                }
            } else {
                this.getView().byId("QF_id_PDFBtn").setEnabled(false);
                this.oModel.setProperty("/VisibleStatus", true);
                this.QF_onCallVariant(this.getView().byId("QF_id_VehModel").getValue());
            }
        },

        _checkValidation: function () {
            var oView = this.getView();
            if (
                utils._LCvalidateMobileNumber(oView.byId("QF_id_EmpMobile"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("QF_id_BranchCodes"), "ID") &&
                utils._LCvalidateName(oView.byId("QF_id_CustomerName"), "ID") &&
                utils._LCvalidateMobileNumber(oView.byId("QF_id_CustMobile"), "ID") &&
                utils._LCvalidateEmail(oView.byId("QF_id_CustEmail"), "ID") &&
                utils._LCvalidateAadharCard(oView.byId("QF_id_CustAadhar"), "ID") &&
                utils._LCvalidatePanCard(oView.byId("QF_id_CustPanNumber"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("QF_id_CustAddress"), "ID") &&
                utils._LCvalidatePinCode(oView.byId("QF_id_CustPinCode"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("QF_id_VehModel"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("QF_id_VehVariant"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("QF_id_VehTransmission"), "ID")) {
                if (oView.byId("QF_id_CustGSTNo").getValue().trim() === "" || utils._LCvalidateGstNumber(oView.byId("QF_id_CustGSTNo"), "ID")) return true
            } else {
                return false
            }
        },

        QF_onDownloadPDF: function () {
            jsPDF.onDownloadPDF(this.oModel);
        }
    });
});