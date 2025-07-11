sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../utils/validation",
  "../model/formatter"
], (BaseController, JSONModel, utils, Formatter) => {
  "use strict";

  return BaseController.extend("sap.kt.com.minihrsolution.controller.LOPDetails", {
    Formatter: Formatter,
    onInit() {
      this.getRouter().getRoute("RouteLOPDetails").attachMatched(this._onRouteMatched, this);
    },

    LOD_onBack: function () {
      if (this.getView().getModel("PaySlip").getProperty("/isRouteLOP")) {
        this.getRouter().navTo("RouteNavAdminPaySlipApp");
      }
      else {
        this.getRouter().navTo("RouteMyInbox", { sMyInBox: "LOPDetail" });
      }
    },

    async _onRouteMatched(oEvent) {
       var LoginFunction = await this.commonLoginFunction("MyInbox");
          if (!LoginFunction) return;
      const currentDate = new Date();
      // Get first day of the month
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      // Get last day of the month
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      this.FilterFunction(startDate, endDate);
      var oDateRangeSelection = this.getView().byId("LOD_id_SubmittedDateFilter");
      oDateRangeSelection.setDateValue(startDate);
      oDateRangeSelection.setSecondDateValue(endDate);
    },

    LOD_onClearEmployeeDetails: function () {
      this.getView().byId("LOD_id_SubmittedDateFilter").setValue("");
    },

    LOD_onSearch: function () {
      var sValue = this.getView().byId("LOD_id_SubmittedDateFilter").getValue();
      const [startDate, endDate] = sValue.split('-').map(date => new Date(date));
      this.FilterFunction(startDate, endDate);
    },

    FilterFunction: async function (startDate, EndDate) {
      this.getBusyDialog();
      var params = {};
      if (this.getView().getModel("PaySlip").getProperty("/isRouteLOP")) params = { "employeeID": this.getView().getModel("PaySlip").getProperty("/EmpData/EmployeeID") };
      if (startDate && EndDate) {
        const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
        params["fromDate"] = oDateFormat.format(startDate);
        params["toDate"] = oDateFormat.format(EndDate);
      }
      params["typeOfLeave"] = "LOP";
      await this._fetchCommonData("Leaves", "LeaveModel", params);
      this.closeBusyDialog();
    }
  })
})