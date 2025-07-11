sap.ui.define([
  "./BaseController", "../model/formatter", "sap/ui/core/BusyIndicator"
], (BaseController, Formatter, BusyIndicator) => {
  "use strict";

  return BaseController.extend("sap.kt.com.minihrsolution.controller.Quotation", {
    Formatter: Formatter,
    onInit: function () {
      this.getOwnerComponent().getRouter().getRoute("RouteQuotation").attachMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: async function () {
      BusyIndicator.hide();
      var LoginFunction = await this.commonLoginFunction("A_Quotations");
      if (!LoginFunction) return;
      this.getBusyDialog();
      this.checkLoginModel();
      var oView = this.getView();
      this.oCore = sap.ui.getCore();
      this.oModel = oView.getModel("Quotation");
      this.oLoginModel = oView.getModel("LoginModel");
      this._makeDatePickersReadOnly(["Q_id_QDate"]);
      this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
      this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("qPageHeaderTitle"));
      this.oModel.setProperty("/QuotationFormData", {});
      this.oModel.setProperty("/MasterEdit", true);
      if (this.oModel.getProperty("/setDefFilter")) {
        this.getView().byId("Q_id_Status").setSelectedKey("New");
        this.getView().byId("Q_id_IssuedBy").setValue(this.oLoginModel.getProperty("/EmployeeName"));
        this.getView().byId("Q_id_FilterBranch").setSelectedKey(this.oLoginModel.getProperty("/BranchCode"));
      }
      var sRole = this.oLoginModel.getProperty("/Role");
      this.oModel.setProperty("/isEditable", sRole === "Admin" || sRole === "CEO");
      this.oModel.setProperty("/VisibleStatus", false);
      var aData = this.oModel.getProperty("/QTableData");
      this.oModel.setProperty("/RowCount", aData ? aData.length : 0);
      var oBinding = this.oModel.bindList("/QTableData");
      oBinding.attachChange(function () {
        this.oModel.setProperty("/RowCount", oBinding.getLength());
      });
      await this._commonGETCall("BaseLocation", "BaseLocationData", {});
      this.Q_onSearch();
      this.closeBusyDialog();
    },

    onPressback: function () {
      this.getRouter().navTo("RouteTilePage");
    },

    onLogout: function () {
      this.getRouter().navTo("RouteLoginPage");
    },

    Q_onPressDashboard: function () {
      this.getRouter().navTo("RouteQuotationDashboard");
    },

    Q_onPressCreate: function () {
      BusyIndicator.show(0);
      var today = new Date();
      this.oModel.setProperty("/setDefFilter", false);
      this.oModel.setProperty("/QuotationFormData/QuotationIssuedBy", this.oLoginModel.getProperty("/EmployeeName"));
      this.oModel.setProperty("/QuotationFormData/EmployeeMobile", this.oLoginModel.getProperty("/MobileNo"));
      this.oModel.setProperty("/QuotationFormData/BranchCode", this.oLoginModel.getProperty("/BranchCode"));
      this.oModel.setProperty("/QuotationFormData/QuotationDate", today);
      this.oModel.setProperty("/QuotationFormData/ValidUpto", new Date(today.getFullYear(), today.getMonth() + 1, 0));
      this.oModel.setProperty("/QuotationFormData/Status", "New");
      this.oModel.setProperty("/AddCase", true);
      this.oModel.setProperty("/ShowCase", false);
      this.getRouter().navTo("RouteQuotationForm");
    },

    Q_onFilterPinChange: function () {
      var data = this.getView().byId("Q_id_FilterPinCode");
      var sValue = data.getValue();
      if (sValue.length > 6) {
        sValue = sValue.slice(0, 6);
        data.setValue(sValue);
      }
    },

    Q_onSearch: async function () {
      this.getView().byId("Q_id_Table").setBusy(true);
      var aFilterItems = this.byId("Q_id_FilterBar").getFilterGroupItems();
      var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
      var params = {};
      aFilterItems.forEach(function (oItem) {
        var oControl = oItem.getControl();
        var sValue = oItem.getName();
        if (oControl && oControl.getValue()) {
          if (sValue === "QuotationDate") {
            params["QuotationStartDate"] = oDateFormat.format(new Date(oControl.getValue().split(' to ')[0]));
            params["QuotationEndDate"] = oDateFormat.format(new Date(oControl.getValue().split(' to ')[1]));
          } else {
            params[sValue] = oControl.getValue();
          }
        }
      });
      await this._commonGETCall("A_Quotations", "QTableData", params);
      this.getView().byId("Q_id_Table").setBusy(false);
    },

    Q_onPressClear: async function () {
      var sRole = this.oLoginModel.getProperty("/Role");
      var fValues;
      if (sRole === "Admin" || sRole === "CEO") {
        fValues = ["Q_id_FilterBranch", "Q_id_QDate", "Q_id_IssuedBy", "Q_id_FilterPinCode", "Q_id_Status"];
      } else {
        fValues = ["Q_id_QDate", "Q_id_FilterPinCode", "Q_id_Status"];
      }
      fValues.forEach((field) => {
        this.getView().byId(field).setValue("");
      });
    },

    Q_onRowPress: function (oEvent) {
      BusyIndicator.show(0);
      this.oModel.setProperty("/setDefFilter", false);
      this.oModel.setProperty("/MasterEdit", false);
      this.oModel.setProperty("/isEditable", false);
      this.oModel.setProperty("/AddCase", false);
      this.oModel.setProperty("/ShowCase", true);
      var oSelectedData = oEvent.getSource().getBindingContext("Quotation").getObject();
      this.oModel.setProperty("/QuotationFormData/", oSelectedData);
      this.getRouter().navTo("RouteQuotationForm");
    }
  });
});