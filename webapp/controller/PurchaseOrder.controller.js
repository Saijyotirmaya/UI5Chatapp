
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "../model/formatter",
    "sap/m/MessageToast",
], function (
    BaseController,
    JSONModel,
    utils,
    formatter,
    MessageToast) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.PurchaseOrder", {
        formatter: formatter,
        onInit: function () {
            this.getRouter().getRoute("PurchaseOrder").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function () {

            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            var LoginFUnction = await this.commonLoginFunction("PurchaseOrder");
            if (!LoginFUnction) return;
            this.finacial()
            await this.PO_onSearch()

            await this._fetchCommonData("ManageCustomer", "ManageCustomerModel");
            // this._fetchCommonData("Currency", "CurrencyModel");

            var model = new JSONModel({
                "CustomerName": "",
                "Type": "",
                "Address": "",
                "StartDate": "",
                "EndDate": "",
                "PAN": "",
                "CurrentDate": "",
                "Description": "",
                "Unit": "",
                "Amount": "",
                "Currency": "",
                "Notes": "",
                "PurchaseOrders": [],

            })
            this.getView().setModel(model, "PurchaseOrderModel");
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Purchase Order");
            this._ViewDatePickersReadOnly(["PO_idECreationDatePicker"], this.getView());
            this.initializeBirthdayCarousel();
        },
        finacial: function () {
            var oDateRange = this.byId("PO_idECreationDatePicker");
            var today = new Date();
            var currentYear = today.getFullYear();
            var currentMonth = today.getMonth();

            var startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
            var endYear = startYear + 1;

            var oStartDate = new Date(startYear, 3, 1);
            var oEndDate = new Date(endYear, 2, 31);

            oDateRange.setDateValue(oStartDate);
            oDateRange.setSecondDateValue(oEndDate)
        },
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.CommonLogoutFunction()
        },
        PO_onCreatePurchaseOrder: function () {

            this.getRouter().navTo("PurchaseOrderObject", { sPath: "PurchaseOrder" });

        },


        PO_onCloseFrag: function () {
            this.PO_oDialog.close();
            var oModel = this.getView().getModel("PurchaseOrderModel");

            // Clear the PurchaseOrders array
            oModel.setProperty("/PurchaseOrders", []);


        },

        PO_onAmountInputChange: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
        },
        onDescriptionInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
        },
        FPO_onDateChange: function (oEvent) {
            utils._LCvalidateDate(oEvent)
        },


        PO_ReadCall: async function () {
            this.getBusyDialog()
            await this.ajaxReadWithJQuery("PurchaseOrder").then((oData) => {
                var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.getOwnerComponent().setModel(new JSONModel(PoData), "POModel");
                this.closeBusyDialog()
            });

        },
        PO_onDeleteButtonPress: function () {

            var Table = this.getView().byId("idPOTable");
            var selectedItem = Table.getSelectedItem();
            if (!selectedItem) {
                MessageToast.show(this.i18nModel.getText("selectPurchaseOrder"));
                return;
            }

            var PoNumber = selectedItem.getBindingContext("POModel").getProperty("PoNumber");
            this.showConfirmationDialog(
                "Delete Confirmation",
                "Are you sure you want to delete this Purchase Order?",
                () => {
                    this.getBusyDialog()
                    this.ajaxDeleteWithJQuery("PurchaseOrder", { filters: { PoNumber: PoNumber } }).then(() => {
                        MessageToast.show(this.i18nModel.getText("purchaseOrderDeleted"));
                        this.PO_ReadCall();
                     
                    });
                },
                function () { Table.removeSelections() }
            );

        },
        onColumnListItemPress: function (oEvent) {

            var PoNumber = oEvent.getSource().getBindingContext("POModel").getObject().PoNumber;
            var onav = this.getOwnerComponent().getRouter()
            onav.navTo("PurchaseOrderObject", {
                sPath: PoNumber
            })
        },
        PO_onSearch: function () {
            var CustName1 = this.getView().byId("PO_id_CustomerName")
            var CustName = CustName1.getSelectedKey() ? CustName1.getSelectedKey() : CustName1.getValue()

            var Po = this.getView().byId("PO_id_PoNumber").getSelectedKey() ? this.getView().byId("PO_id_PoNumber").getSelectedKey() : this.getView().byId("PO_id_PoNumber").getValue()
            var oDateRange = this.getView().byId("PO_idECreationDatePicker")
            var odateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
            var oStartDate = oDateRange.getDateValue();
            var oEndDate = oDateRange.getSecondDateValue();


            var filters = {}

            if (CustName) {
                filters.CustomerName = CustName;
            }
            if (Po) {
                filters.PoNumber = Po;
            }
            if (oStartDate && oEndDate) {
                filters.StartDate = odateFormat.format(oStartDate);
                filters.EndDate = odateFormat.format(oEndDate);
            }
            this.getBusyDialog()
            this.ajaxReadWithJQuery("PurchaseOrder", filters).then((oData) => {
                var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.getOwnerComponent().setModel(new JSONModel(PoData), "POModel");
                 this.ajaxReadWithJQuery("PurchaseOrder").then((oData) => {
                var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.getOwnerComponent().setModel(new JSONModel(PoData), "POModelfilter");
                this.closeBusyDialog()
            });
                this.closeBusyDialog()
            });
        },
        PO_onPressClear: function () {
            this.getView().byId("PO_id_CustomerName").setSelectedKey("");
            this.getView().byId("PO_id_PoNumber").setSelectedKey("");
          this.finacial()
        },
        onClearNotesPress: function () {
            this.getView().getModel("PurchaseOrderModel").setProperty("/Notes", "")
        }

    });
});