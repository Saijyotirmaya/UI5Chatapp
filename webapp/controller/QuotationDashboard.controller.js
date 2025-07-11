sap.ui.define([
  "./BaseController",
  "sap/ui/core/BusyIndicator",
  "sap/ui/model/json/JSONModel",
  "../model/formatter"
], (Controller, BusyIndicator, JSONModel, Formatter) => {
  "use strict";

  return Controller.extend("sap.kt.com.minihrsolution.controller.QuotationDashboard", {
    Formatter: Formatter,
    onInit() {
      this.getRouter().getRoute("RouteQuotationDashboard").attachMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: async function () {
      var LoginFunction = await this.commonLoginFunction("A_Quotations");
      if (!LoginFunction) return;
      this.checkLoginModel();
      this._makeDatePickersReadOnly(["QD_id_DateRange"]);
      var FirstModel = new JSONModel({ type: "column", type1: "line" });
      this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
      this.getView().setModel(FirstModel, "FirstChart");
      this.FirstModel = this.getView().getModel("FirstChart");
      this.loginModel = this.getView().getModel("LoginModel");
      var oDateRange = this.byId("QD_id_DateRange");
      var sDateRangeValue = oDateRange.getValue();
      var oToday = new Date();
      var oPastDate = new Date();
      oPastDate.setMonth(oPastDate.getMonth() - 3);
      var sFormattedStartDate = oPastDate.toISOString().split("T")[0];
      var sFormattedEndDate = oToday.toISOString().split("T")[0];
      sDateRangeValue = sFormattedStartDate + " to " + sFormattedEndDate;
      oDateRange.setValue(sDateRangeValue);
      this.getView().byId("QD_id_QuoIssuedByFirst").setValue(this.loginModel.getProperty("/EmployeeName"));
      this.getView().byId("QD_id_SecondQuoIssuedBy").setValue(this.loginModel.getProperty("/EmployeeName"));
      this.QD_onSearch();
      this.QD_onChangeCurrentMonthIssuedByFirst();
      this.QD_onChangeCurrentMonthIssuedBy();
    },

    QD_onPressBack: function () {
      BusyIndicator.show(0);
      this.getRouter().navTo("RouteQuotation");
    },

    QD_onSearch: function () {
      var aFilterItems = this.byId("QD_id_FilterBar").getFilterGroupItems();
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
      this.CommonReadCall("StatusPieChart", params, "DateRangePieChartModel", "QD_id_VizFrameAll", "QD_id_PieChartAll", "", "Quotation v/s Branch");
      this.CommonReadCall("BaseLocationChart", params, "DateRangeBarChartModel", "QD_id_VizFrame1", "QD_id_Popover1", "Status", "Quotation v/s Status");
    },

    CommonReadCall: async function (url, params, modelName, Id1, Id2, Text, Title) {
      var response = await this.ajaxCreateWithJQuery(url, params, [Id1, Id2]);
      if (response.success) {
        var oModel = new JSONModel({ items: response.results });
        this.getView().setModel(oModel, modelName);
        if (Id1 === "QD_id_VizFrame" || Id1 === "QD_id_VizFrame1") {
          var oVizFrame = this.getView().byId(Id1);
          oVizFrame.setVizProperties({
            legend: { title: { visible: true, text: Text } },
            title: { visible: true, text: Title },
            plotArea: {
              dataPointStyle: {
                rules: [
                  {
                    dataContext: { Status: "New" },
                    properties: { color: "#168eff" },
                    displayName: "New",
                  },
                  {
                    dataContext: { Status: "Booked" },
                    properties: { color: "#11bd08" },
                    displayName: "Booked",
                  },
                  {
                    dataContext: { Status: "Cancelled" },
                    properties: { color: "#cf1322" },
                    displayName: "Cancelled",
                  },
                ],
              },
            },
          });
          oVizFrame.setModel(oModel);
          var oPopOver = this.getView().byId(Id2);
          oPopOver.connect(oVizFrame.getVizUid());
        } else {
          var oVizFrame = this.getView().byId(Id1);
          oVizFrame.setVizProperties({
            legend: {
              title: {
                visible: true,
                text: "Count",
              },
            },
            title: {
              visible: true,
              text: Title,
            },
          });
          oVizFrame.setModel(oModel);
          var oPopOver = this.getView().byId(Id2);
          oPopOver.connect(oVizFrame.getVizUid());
        }
      } else {
        sap.m.MessageToast.show(`${this.i18nModel.getText("commonReadingDataError")}: ` + response.errorMessage);
      }
    },
    QD_onPressPie: function () {
      this.FirstModel.setProperty("/type", "pie");
    },

    QD_onPressColumn: function () {
      this.FirstModel.setProperty("/type", "column");
    },

    QD_onPressLine: function () {
      this.FirstModel.setProperty("/type1", "line");
    },

    QD_onPressDonut: function () {
      this.FirstModel.setProperty("/type1", "donut");
    },

    QD_onPressBack: function () {
      this.getRouter().navTo("RouteQuotation");
    },

    QD_onChangeCurrentMonthIssuedByFirst: function () {
      this.CommonReadCall("MonthlyBarChart", { QuotationIssuedBy: this.getView().byId("QD_id_SecondQuoIssuedBy").getValue() }, "GetPieChartCurrentMonth", "QD_id_VizFrame", "QD_id_Popover3", "Status", "Current Month Quotation v/s Employee");
    },

    QD_onChangeCurrentMonthIssuedBy: function () {
      this.CommonReadCall("QuotationStats", { QuotationIssuedBy: this.getView().byId("QD_id_QuoIssuedByFirst").getValue() }, "GetBarChatCurrentMonth", "QD_id_VizFrame2", "QD_id_Popover2", "Status", "Per Day Quotation v/s Employee");
    },
  });
}
);