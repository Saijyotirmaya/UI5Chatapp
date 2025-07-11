sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    'sap/ui/export/Spreadsheet',
    "../model/formatter",

  ],
  function (BaseController, MessageToast, Spreadsheet, Formatter) {

    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.CompanyInvoice",
      {
        Formatter: Formatter,

        onInit: function () {
          this.getRouter()
            .getRoute("RouteCompanyInvoice")
            .attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
          var LoginFUnction = await this.commonLoginFunction("CompanyInvoice");
          if (!LoginFUnction) return;
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("invoiceapp"));
          await this.CompanyInvoice_onSearch();
          this._fetchCommonData("ManageCustomer", "ManageCustomerModel");
          this.getView().getModel("LoginModel").setProperty("/RichText", false);
          this.initializeBirthdayCarousel();
        },

        CompanyInvoice_onSearch: async function () {
          try {
            this.getBusyDialog();
            const filterItems = this.byId("CI_id_InvoiceFilterBar").getFilterGroupItems();
            const params = {};

            let invoiceDateProvided = false;

            // Extract values from filter bar
            filterItems.forEach((item) => {
              const control = item.getControl();
              const key = item.getName();

              if (control && typeof control.getValue === "function") {
                const value = control.getValue().trim();

                if (key === "InvoiceDate" && value.includes("-")) {
                  const [start, end] = value.split("-").map(date =>
                    date.trim().split("/").reverse().join("-")
                  );
                  params.InvoiceStartDate = start;
                  params.InvoiceEndDate = end;
                  invoiceDateProvided = true;
                } else {
                  params[key] = value;
                }
              }
            });

            // Prepare financial year date range
            // const today = new Date();
            const currentYear = new Date().getFullYear();
            // const currentMonth = new Date().getMonth(); // 0 = Jan, 3 = April

            let fyStart, fyEnd, financialYearLabel;
            if (new Date().getMonth() >= 3) { // April or later
              fyStart = new Date(currentYear, 3, 1); // April 1st
              fyEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
              financialYearLabel = `${currentYear}-${currentYear + 1}`;
            } else {
              fyStart = new Date(currentYear - 1, 3, 1); // April 1st last year
              fyEnd = new Date(currentYear, 2, 31); // March 31st this year
              financialYearLabel = `${currentYear - 1}-${currentYear}`;
            }

            const formatDate = (date) => date.toISOString().split("T")[0];

            // Set default date if none provided
            if (!params.InvoiceStartDate && !params.InvoiceEndDate) {
              params.InvoiceStartDate = formatDate(fyStart);
              params.InvoiceEndDate = formatDate(fyEnd);
              params.FinancialYear = financialYearLabel;

              // Also set in DateRangeSelection control
              const dateRangeControl = this.byId("CI_id_InvoiceDatePicker");
              if (dateRangeControl) {
                dateRangeControl.setDateValue(fyStart);
                dateRangeControl.setSecondDateValue(fyEnd);
              }
            } else {
              // If dates match financial year, add FinancialYear param
              const startDate = new Date(params.InvoiceStartDate);
              const endDate = new Date(params.InvoiceEndDate);

              if (
                startDate.getTime() === fyStart.getTime() &&
                endDate.getTime() === fyEnd.getTime()
              ) {
                params.FinancialYear = financialYearLabel;
              }
            }
            // Fetch data
            this._fetchCommonData("CompanyInvoice", "CompanyInvoiceFilterModel", { InvoiceStartDate: params.InvoiceStartDate, InvoiceEndDate: params.InvoiceEndDate });
            await this._fetchCommonData("CompanyInvoice", "CompanyInvoiceModel", params);
            this.closeBusyDialog();
          } catch (error) {
            this.closeBusyDialog();
            MessageToast.show(this.i18nModel.getText("technicalError"));
          }
        },

        CI_onPressMSASOW: function () { this.getRouter().navTo("RouteMSA"); },
        onPressClear: function () {
          this.byId("CI_id_InvNo").setValue("");
          this.byId("CI_id_InvoiceDatePicker").setValue("");
          this.byId("CI_id_CustomerNameComboBox").setValue("");
          this.byId("CI_id_StatusComboBox").setValue("");
        },

        onSelectionChange: function (oEvent) {
          this.data = oEvent.getSource().getSelectedItem().getBindingContext("CompanyInvoiceModel").getObject();
          if (this.data.Status === "Submitted") {
            this.byId("CI_InvoiceDelete").setEnabled(true);
          } else {
            this.byId("CI_InvoiceDelete").setEnabled(false);
          }
        },

        CI_OnPressDeleteInvoice: function () {
          var that = this;
          this.showConfirmationDialog(
            that.i18nModel.getText("msgBoxConfirm"),
            that.i18nModel.getText("msgBoxConfirmDelete"),
            async function () {
              that.getBusyDialog();
              try {
                await that.ajaxDeleteWithJQuery("/CompanyInvoice", { filters: { InvNo: that.data.InvNo } });
                MessageToast.show(that.i18nModel.getText("CompanyDeleteMess"));
                that.CompanyInvoice_onSearch();
              } catch (error) {
                MessageToast.show(error.responseText || "Error deleting expense");
              } finally {
                that.closeBusyDialog();
              }
            },
            function () { that.closeBusyDialog(); })
        },

        CI_onPressAddInvoice: function () {
          this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: "X" });
        },

        CI_onPressInvoiceRow: function (oEvent) {
          this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("CompanyInvoiceModel").getObject().InvNo) });
        },

        onPressback: function () {
          this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
          this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
        },
        CI_onPressDownload: function () {
          var table = this.byId("CI_id_InvoiceTable");
          const oModelData = table.getModel("CompanyInvoiceModel").getData();
          const aFormattedData = oModelData.map(item => {
            return {
              ...item,
              InvoiceDate: Formatter.formatDate(item.InvoiceDate),
              PayByDate: Formatter.formatDate(item.PayByDate),
              TotalAmountCurrency: item.TotalAmount + " " + item.Currency 
              
            };
          });
          const aCols = [
            { label: this.i18nModel.getText("invoiceNo"), property: "InvNo", type: "string" },
            { label: this.i18nModel.getText("customerName"), property: "CustomerName", type: "string" },
            { label: this.i18nModel.getText("invoiceDate"), property: "InvoiceDate", type: "string" },
            { label: this.i18nModel.getText("invoiceDescription"), property: "InvoiceDescription", type: "string" },
            { label: this.i18nModel.getText("totalAmount"), property: "TotalAmountCurrency", type: "string" },
            { label: this.i18nModel.getText("PayByDate"), property: "PayByDate", type: "string " },
            { label: this.i18nModel.getText("status"), property: "Status", type: "string" },
          ];
          const oSettings = {
            workbook: {
              columns: aCols,
              context: {
                sheetName: this.i18nModel.getText("invoiceapp")
              }
            },
            dataSource: aFormattedData,
            fileName: "CompanyInvoice.xlsx"
          };
          const oSheet = new Spreadsheet(oSettings);
          oSheet.build().then(function () {
            MessageToast.show(this.i18nModel.getText("downloadsuccessfully"));
          }.bind(this))
            .finally(function () {
              oSheet.destroy();
            });

        }
      }
    );
  }
);
