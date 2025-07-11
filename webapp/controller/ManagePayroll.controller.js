sap.ui.define(
  ["./BaseController", "sap/m/MessageToast", "sap/ui/core/BusyIndicator"],
  (Controller, MessageToast, BusyIndicator) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.ManagePayroll", {
      onInit: function () {
        this._initMessagePopover();
        this.getRouter().getRoute("RouteManagePayroll").attachMatched(this._onRouteMatched, this);
      },

      MP_onOpenMessagePopover: function (oEvent) {
        this.oMessagePopover.openBy(oEvent.getSource());
      },

      _onRouteMatched: async function () {
        var LoginFunction = await this.commonLoginFunction("AdminPaySlip");
        if (!LoginFunction) return;
     
        this.getBusyDialog();
        this.checkLoginModel();
        this._makeDatePickersReadOnly(["FST_id_MonthYearPicker"]);
        this.oLoginModel = this.getView().getModel("LoginModel");
        this.oModel = this.getView().getModel("Payroll");
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this.byId("FST_id_FilterBranch").setSelectedKey(this.oLoginModel.getProperty("/BranchCode"));
        this.oLoginModel.setProperty("/HeaderName", this.i18nModel.getText("headerManagePayroll"));
        this.oModel.setProperty("/ShowOnGenerate", false);
        this.oModel.setProperty("/ShowOnPayroll", true);
        this.oModel.setProperty("/TableData", null);
        this.resetColumnHeaders();
        this.oModel.setProperty("/isSELVisible", false);
        this.getView().byId("MP_id_UpdateSalBtn").setEnabled(true);
        this.byId("FST_id_MonthYearPicker").setValue("");
        var aData = this.oModel.getProperty("/TableData");
        this.oModel.setProperty("/TableRowCount", aData ? aData.length : 0);
        var oBinding = this.oModel.bindList("/TableData");
        oBinding.attachChange(function () {
          this.oModel.setProperty("/TableRowCount", oBinding.getLength());
        });
        await this._commonGETCall("BaseLocation", "BaseLocationData", {});
        this.FST_onEnableImport();
        this.closeBusyDialog();
        this.initializeBirthdayCarousel();
      },

      onPressback: function () {
        this.getRouter().navTo("RouteTilePage");
      },

      onLogout: function () {
        this.getRouter().navTo("RouteLoginPage");
      },

      MP_onPressGo: async function () {
        this.getBusyDialog();
        this.oModel.setProperty("/isExcelMismatch", false);
        var branch = this.byId("FST_id_FilterBranch").getValue();
        var oDate = this.byId("FST_id_MonthYearPicker").getDateValue();
        var pickerMonth = String(oDate.getMonth() + 1).padStart(2, '0');
        var pickerYear = String(oDate.getFullYear());
        this.updateDaysInColumns(pickerYear, pickerMonth);
        this.oModel.setProperty("/FilterBranch", branch);
        this.oModel.setProperty("/FilterMonth", pickerMonth);
        this.oModel.setProperty("/FilterYear", pickerYear);
        await this._commonGETCall("A_PayRoll", "TableData", { Branch: branch, Month: pickerMonth, Year: pickerYear });
        var oData = this.oModel.getProperty("/TableData");
        if (!oData || oData.length === 0) {
          this.closeBusyDialog();
          MessageToast.show(this.i18nModel.getText("msgDataNotExistsInDB"));
          this.oModel.setProperty("/TableData", null);
          this.resetColumnHeaders();
          this.oModel.setProperty("/isSELVisible", false);
        }
        else {
          this._sortAndFormatRecords(oData);
        }
      },

      _sortAndFormatRecords: function (records) {
        records.sort((a, b) => a["EmployeeID"] - b["EmployeeID"]);
        records = records.map(record => {
          const fields = [
            "Branch", "Month", "Year", "EmployeeID", "EmployeeName",
            ...Array.from({ length: 31 }, (_, i) => `Day${i + 1}`),
            "TotalDays", "TotalPresent", "TotalAbsent", "ActualAbsent", "TotalLate",
            "TotalHalf", "TotalSunP", "TotalSun", "PayDays", "Basic", "HRA", "EplyrPF", "EplyrESI", 
            "MedInsurance", "SpecAllowance", "Advance", "TDS", "Gratuity", 
            "EplyePF", "EplyeESI", "PT", "AdvanceDeduction", "VariablePay", "SD", "Other", 
            "GrossPay", "Status", "UploadedBy", "ChangedBy"
          ];

          const result = fields.reduce((acc, field) => {
            acc[field] = record[field] ? record[field].toString() : (field === "TotalAbsent"
              ? ((parseInt(record["TotalAbsent"] || 0) + parseInt(record["TotalSunA"] || 0)).toString())
              : "");
            return acc;
          }, {});

          return result;
        });
        this.oModel.setProperty("/TableData", records);
        this.oModel.setProperty("/isSELVisible", true);
        this.getView().byId("MP_id_UpdateSalBtn").setEnabled(true);
        this.getView().byId("MP_id_DeleteBtn").setEnabled(true);
        this.closeBusyDialog();
      },

      MP_onPressSalUpdate: function (e) {
        this.getBusyDialog();
        var file = e.getParameter("files") && e.getParameter("files")[0];
        if (file) {
          var reader = new FileReader();
          var payrollData = this.oModel.getProperty("/TableData");
          reader.onload = (e) => {
            var data = e.target.result;
            var workbook = XLSX.read(data, { type: "binary" });
            var sheetName = workbook.SheetNames[0];
            var sheetData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
            var isMismatch = sheetData.some(row => {
              var matchingRecord = payrollData.find(record =>
                record["Branch"] === row["Branch"] &&
                record["Month"] === row["Month"] &&
                record["Year"] === row["Year"] &&
                record["EmployeeID"] === row["EmployeeID"] &&
                record["Basic"] === row["Basic"] &&
                record["UploadedBy"] === row["UploadedBy"]
              );
              return !matchingRecord; // Return true if mismatch found
            });
            if (isMismatch) {
              MessageToast.show(this.i18nModel.getText("msgUploadCorrectExcel"));
              this.closeBusyDialog();
              return;
            }
            sheetData = sheetData.map(row => {
              row["Status"] = "Paid";
              row["ChangedBy"] = this.oLoginModel.getProperty("/EmployeeName");
              return row;
            });
            var sheetFilters = sheetData.map(row => ({
              EmployeeID: row["EmployeeID"],
              Month: row["Month"],
              Year: row["Year"]
            }));
            var combinedData = sheetData.map((data, index) => ({
              data: data,
              filters: sheetFilters[index]
            }));
            this._updateData(sheetData, combinedData);
          };
          reader.onerror = () => {
            MessageToast.show(this.i18nModel.getText("commonReadingDataError"));
            this.closeBusyDialog();
          };
          reader.readAsBinaryString(file);
        }
      },

      _updateData: async function (sheetData, combinedData) {
        try {
          var response = await this.ajaxUpdateWithJQuery("A_PayRoll", { data: combinedData });
          if (response.success) {
            this.closeBusyDialog();
            this.oModel.setProperty("/TableData", sheetData);
            this.getView().byId("MP_id_UpdateSalBtn").setEnabled(false);
            MessageToast.show(this.i18nModel.getText("msgSalUploadSuccess"));
          } else {
            this.closeBusyDialog();
            MessageToast.show(this.i18nModel.getText("msgSchemeUploadFailed"));
          }
        }
        catch (error) {
          MessageToast.show(this.i18nModel.getText("commonError"));
          console.error("Error during update:", error);
          this.closeBusyDialog();
        }
      },

      MP_onPressExport: function () {
        var branch = this.oModel.getProperty("/FilterBranch");
        var month = this.oModel.getProperty("/FilterMonth");
        var year = this.oModel.getProperty("/FilterYear");
        const aData = this.oModel.getProperty("/TableData");
        var worksheet = XLSX.utils.json_to_sheet(aData);
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${branch} Salary Data ${month}-${year}.xlsx`);
      },

      MP_onPressDelete: function () {
        var that = this;
        if (!this._oWarningDialog) {
          this._oWarningDialog = new sap.m.Dialog({
            title: that.i18nModel.getText("warning"),
            type: sap.m.DialogType.Message,
            state: "Warning",
            content: new sap.m.Text({
              text: that.i18nModel.getText("msgConfirmDelSal"),
            }),
            buttons: [
              new sap.m.Button({
                text: that.i18nModel.getText("OkButton"),
                type: "Accept",
                press: async function () {
                  that.getBusyDialog();
                  that._oWarningDialog.close();
                  var response = await that.ajaxDeleteWithJQuery("A_Payroll", { filters: { Branch: that.oModel.getProperty("/FilterBranch"), Month: that.oModel.getProperty("/FilterMonth"), Year: that.oModel.getProperty("/FilterYear") } });
                  if (response.success) {
                    that.oModel.setProperty("/TableData", null);
                    that.resetColumnHeaders();
                    that.oModel.setProperty("/isSELVisible", false);
                    MessageToast.show(that.i18nModel.getText("salDeleteSuccess"));
                  } else {
                    MessageToast.show(that.i18nModel.getText("msgSchemeUploadFailed"));
                  }
                  that.closeBusyDialog();
                },
              }),
              new sap.m.Button({
                text: that.i18nModel.getText("btnCancel"),
                type: "Negative",
                press: function () {
                  that._oWarningDialog.close();
                },
              }),
            ],
          });
          this.getView().addDependent(this._oWarningDialog);
        }
        this._oWarningDialog.open();
      }
    });
  }
);