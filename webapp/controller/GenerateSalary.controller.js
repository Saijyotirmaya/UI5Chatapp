sap.ui.define(
  ["./BaseController", "sap/m/MessageToast", "sap/ui/core/BusyIndicator"],
  (Controller, MessageToast, BusyIndicator) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.GenerateSalary", {
      onInit: function () {
        this._initMessagePopover();
        this.getRouter().getRoute("RouteGenerateSalary").attachMatched(this._onRouteMatched, this);
      },

      GS_onOpenMessagePopover: function (oEvent) {
        this.oMessagePopover.openBy(oEvent.getSource());
      },

      _onRouteMatched: async function () {
        var LoginFunction = await this.commonLoginFunction("A_Payroll");
        if (!LoginFunction) return;
       
        this.getBusyDialog();
        this.checkLoginModel();
        this._makeDatePickersReadOnly(["FST_id_MonthYearPicker"]);
        this.oLoginModel = this.getView().getModel("LoginModel");
        this.oModel = this.getView().getModel("Payroll");
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this.byId("FST_id_FilterBranch").setSelectedKey(this.oLoginModel.getProperty("/BranchCode"));
        this.oLoginModel.setProperty("/HeaderName", this.i18nModel.getText("headerGenerateSalary"));
        this.oModel.setProperty("/ShowOnGenerate", true);
        this.oModel.setProperty("/ShowOnPayroll", false);
        this.oModel.setProperty("/TableData", null);
        this.resetColumnHeaders();
        this.oModel.setProperty("/isSELVisible", false);
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

      FST_onUpload: async function (e) {
        this.getBusyDialog();
        this.oModel.setProperty("/isExcelMismatch", false);
        var file = e.getParameter("files") && e.getParameter("files")[0];
        if (file) {
          var employeeName = this.oLoginModel.getProperty("/EmployeeName");
          var branch = this.byId("FST_id_FilterBranch").getValue();
          await this._commonGETCall("getDepartmentRule", "PayRollRules", { BranchCode: this.byId("FST_id_FilterBranch").getSelectedItem().getAdditionalText() });
          var oDate = this.byId("FST_id_MonthYearPicker").getDateValue();
          var pickerMonth = String(oDate.getMonth() + 1).padStart(2, '0');
          var pickerYear = String(oDate.getFullYear());
          this.updateDaysInColumns(pickerYear, pickerMonth);
          var reader = new FileReader();
          var ruleData = this.oModel.getProperty("/PayRollRules");
          var excelMismatch = this.oModel.getProperty("/isExcelMismatch");
          this.oModel.setProperty("/FilterBranch", branch);
          this.oModel.setProperty("/FilterMonth", pickerMonth);
          this.oModel.setProperty("/FilterYear", pickerYear);

          reader.onload = (e) => {
            var data = e.target.result;
            var workbook = XLSX.read(data, { type: "binary" });
            var consolidatedData = {};

            var sheetNames = workbook.SheetNames;
            for (let sheetIndex = 0; sheetIndex < sheetNames.length && sheetIndex < 31 && !excelMismatch; sheetIndex++) {
              var sheetName = sheetNames[sheetIndex];
              var sheetData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName], { range: 6 });

              for (let i = 0; i < sheetData.length; i++) {
                if (excelMismatch) break; // Stop processing further if a mismatch is found

                var row = sheetData[i];
                var empCode = row["Emp Code"];
                var empName = row["Emp Name"];
                var inTime = this._convertTimeToMinutes(row["In Time"]);
                var outTime = this._convertTimeToMinutes(row["Out Time"]);
                var duration = this._convertTimeToMinutes(row["Duration"]);
                var attDate = row["Att. Date"];
                var dateObj = new Date(attDate);
                var dayOfWeek = dateObj.toLocaleString("en-US", { weekday: "long" });
                var year = String(dateObj.getFullYear());
                var month = String(dateObj.getMonth() + 1).padStart(2, '0');
                var totalDays = new Date(year, month, 0).getDate();

                if (month != pickerMonth || year != pickerYear) {
                  MessageToast.show(this.i18nModel.getText("msgUploadCorrectExcel"));
                  this.oModel.setProperty("/isExcelMismatch", true);
                  this.oModel.setProperty("/TableData", null);
                  this.resetColumnHeaders();
                  this.oModel.setProperty("/isSELVisible", false);
                  this.closeBusyDialog();
                  return;
                }

                let checkWeek = (dayOfWeek === "Sunday") ? "FALSE" : "TRUE";
                var day = sheetIndex + 1;

                if (!consolidatedData[empCode]) {
                  consolidatedData[empCode] = {
                    Branch: branch,
                    Month: pickerMonth,
                    Year: pickerYear,
                    EmpCode: empCode,
                    EmpName: empName,
                    TotalDays: totalDays,
                    TotalPresent: 0,
                    TotalAbsent: 0,
                    ActualAbsent: 0,
                    TotalSunA: 0,
                    TotalLate: 0,
                    TotalHalf: 0,
                    TotalSunP: 0,
                    TotalSun: 0,
                    PayDays: 0,
                    Basic: 0,
                    HRA: 0,
                    EplyrPF: 0,
                    EplyrESI: 0,
                    MedInsurance: 0,
                    SpecAllowance: 0,
                    Advance: 0,
                    TDS: 0,
                    Gratuity: 0,
                    EplyePF: 0,
                    EplyeESI: 0,
                    PT: 0,
                    AdvanceDeduction: 0,
                    VariablePay: 0,
                    SecurityDeposit: 0,
                    Other: 0,
                    GrossPay: 0,
                    Status: "Saved",
                    UploadedBy: employeeName,
                    ChangedBy: ""
                  };
                }

                var empRuleFilter = ruleData.filter(rule =>
                  rule.EmployeeID === empCode && rule.WeekDays === checkWeek
                );
                var empRule = empRuleFilter.length > 0 ? empRuleFilter[0] : null;

                // **Check if EmployeeID is missing in ruleData**
                if (!empRule) {
                  var isEmpCodeMissing = !ruleData.some(rule => rule.EmployeeID === empCode);

                  if (isEmpCodeMissing) {
                    MessageToast.show(`Employee ID: ${empCode} not found in the database. Please check and try again.`);
                  } else {
                    MessageToast.show(this.i18nModel.getText("msgUploadCorrectExcel"));
                  }

                  this.oModel.setProperty("/isExcelMismatch", true);
                  this.oModel.setProperty("/TableData", null);
                  this.resetColumnHeaders();
                  this.oModel.setProperty("/isSELVisible", false);
                  this.closeBusyDialog();
                  return; // Exit the entire function
                }

                let attendanceStatus;
                var checkInRule = this._convertTimeToMinutes(empRule.CheckIn) + parseInt(empRule.Grace);
                var checkOutRule = this._convertTimeToMinutes(empRule.CheckOut);

                if (dayOfWeek === "Sunday") {
                  if (duration < 240 || !inTime || !outTime) {
                    if (consolidatedData[empCode].TotalSunA < 2) {
                      attendanceStatus = "SL";
                    } else {
                      attendanceStatus = "SA";
                      consolidatedData[empCode].ActualAbsent++;
                    }
                    consolidatedData[empCode].TotalSunA++;
                  } else if (inTime > 690 || duration < 300) {
                    attendanceStatus = "SH";
                    consolidatedData[empCode].TotalHalf++;
                    consolidatedData[empCode].TotalSunP++;
                  } else if (inTime > checkInRule || outTime < checkOutRule) {
                    attendanceStatus = "SLA";
                    consolidatedData[empCode].TotalLate++;
                    consolidatedData[empCode].TotalSunP++;
                  } else {
                    attendanceStatus = "SP";
                    consolidatedData[empCode].TotalPresent++;
                    consolidatedData[empCode].TotalSunP++;
                  }
                  consolidatedData[empCode].TotalSun++;
                } else {
                  if (duration < 240 || !inTime || !outTime) {
                    if (consolidatedData[empCode].TotalAbsent < 2) {
                      attendanceStatus = "L";
                    } else {
                      attendanceStatus = "A";
                      consolidatedData[empCode].ActualAbsent++;
                    }
                    consolidatedData[empCode].TotalAbsent++;
                  } else if (inTime > 690 || duration < 300) {
                    attendanceStatus = "H";
                    consolidatedData[empCode].TotalHalf++;
                  } else if (inTime > checkInRule || outTime < checkOutRule) {
                    attendanceStatus = "LA";
                    consolidatedData[empCode].TotalLate++;
                  } else {
                    attendanceStatus = "P";
                    consolidatedData[empCode].TotalPresent++;
                  }
                }

                consolidatedData[empCode][day] = attendanceStatus;
              }
            }

            var records = Object.values(consolidatedData);
            this._salaryCalculation(records);
          };

          reader.onerror = () => {
            MessageToast.show(this.i18nModel.getText("commonReadingDataError"));
            this.closeBusyDialog();
          };

          reader.readAsBinaryString(file);
        }
      },

      _salaryCalculation: async function (records) {
        var month = this.oModel.getProperty("/FilterMonth");
        var year = this.oModel.getProperty("/FilterYear");
        records.forEach(record => {
          var payDays = (record.TotalPresent + record.TotalLate + (record.TotalHalf / 2) + record.TotalAbsent + record.TotalSunA) - (parseInt((record.TotalLate / 3)) * 0.5);
          if (record.TotalAbsent > 2) {
            payDays -= record.TotalAbsent - 2;
          }
          if (record.TotalSunA > 2) {
            payDays -= record.TotalSunA - 2;
          }
          var tAbsent = record.TotalAbsent + record.TotalSunA;
          if (tAbsent < 3) {
            payDays += 1;
          }
          record.PayDays = parseFloat(payDays.toFixed(2));
        });

        var employeeCodes = JSON.stringify(records.map(record => record["EmpCode"]));
        await this._commonGETCall("SalaryDetailsFunction", "EmployeeSalaryData", { Month: month, Year: year, EmployeeID: employeeCodes });
        var empSalaryData = this.oModel.getProperty("/EmployeeSalaryData");
        for (let i = 0; i < records.length; i++) {
          let record = records[i];

          // Filter salary details for the employee
          let empSal = empSalaryData.find(sal => sal.EmployeeID === record.EmpCode);

          // **Check if Employee Salary is found**
          if (!empSal) {
            this.oModel.setProperty("/isExcelMismatch", true);
            this.oModel.setProperty("/Records", null);
            this.resetColumnHeaders();
            this.oModel.setProperty("/isSELVisible", false);
            this.closeBusyDialog();
            let isEmpCodeMissing = !empSalaryData.some(sal => sal.EmployeeID === record.EmpCode);
            if (isEmpCodeMissing) {
              MessageToast.show(`Salary details not found for Employee ID: ${record.EmpCode}. Please check and try again.`);
            } else {
              MessageToast.show("Salary Details not found!!");
            }
            return; // Exit the function early if no salary details found
          }

          // **Salary Calculations**
          record.Basic = +((((+(empSal.BasicSalary)/12) / record.TotalDays) * record.PayDays).toFixed(2)) || 0;
          record.HRA = +((((+(empSal.HRA)/12) / record.TotalDays) * record.PayDays).toFixed(2)) || 0;
          record.EplyrPF = +((((+(empSal.EmployerPF)/12) / record.TotalDays) * record.PayDays).toFixed(2)) || 0;
          record.MedInsurance = +((((+(empSal.MedicalInsurance)/12) / record.TotalDays) * record.PayDays).toFixed(2)) || 0;
          record.SpecAllowance = +((((+(empSal.SpecailAllowance)/12) / record.TotalDays) * record.PayDays).toFixed(2)) || 0;
          record.TDS = +((((+(empSal.IncomeTax)/12) / record.TotalDays) * record.PayDays).toFixed(2)) || 0;
          record.Gratuity = +((((+(empSal.Gratuity)/12) / record.TotalDays) * record.PayDays).toFixed(2)) || 0;
          record.EplyePF = +((((+(empSal.EmployeePF)/12) / record.TotalDays) * record.PayDays).toFixed(2)) || 0;
          record.PT = +((+(empSal.PT)/12).toFixed(2)) || 0;        
          record.VariablePay = +((+(empSal.VariablePay)/12).toFixed(2)) || 0;        

          // ESI calculation based on GrossPay condition
          if (empSal.GrossPayMontly <= 21000) {
            record.EplyeESI = +((+(empSal.GrossPayMontly) * (0.75 / 100)).toFixed(2)) || 0;
            record.EplyrESI = +((+(empSal.GrossPayMontly) * (3.25 / 100)).toFixed(2)) || 0;
          }

          // Final GrossPay calculation
          record.GrossPay = +((record.Basic + record.HRA + record.EplyrPF + record.MedInsurance + record.SpecAllowance + record.SecurityDeposit + record.Advance - record.TDS - record.Gratuity - record.EplyePF - record.EplyeESI - record.PT - record.AdvanceDeduction).toFixed(2)) || 0;
          if(record.Month === "03"){
            record.GrossPay = +((record.GrossPay + +(empSal.VariablePay)).toFixed(2));
          }
        }
        this._sortAndFormatRecords(records);
      },

      _sortAndFormatRecords: function (records) {
        records.sort((a, b) => a["EmpCode"] - b["EmpCode"]);
        records = records.map(record => {
          return {
            "Branch": record["Branch"] ? record["Branch"].toString() : "",
            "Month": record["Month"] ? record["Month"].toString() : "",
            "Year": record["Year"] ? record["Year"].toString() : "",
            "EmployeeID": record["EmpCode"] ? record["EmpCode"].toString() : "",
            "EmployeeName": record["EmpName"] ? record["EmpName"].toString() : "",
            ...[...Array(record.TotalDays || 0).keys()].reduce((acc, day) => {
              acc[`Day${day + 1}`] = record[day + 1] ? record[day + 1].toString() : "";
              return acc;
            }, {}),
            "TotalDays": record["TotalDays"] ? record["TotalDays"].toString() : "0",
            "TotalPresent": record["TotalPresent"] ? record["TotalPresent"].toString() : "0",
            "TotalAbsent": ((record["TotalAbsent"] ? record["TotalAbsent"] : 0) + (record["TotalSunA"] ? record["TotalSunA"] : 0)).toString(),
            "ActualAbsent": record["ActualAbsent"] ? record["ActualAbsent"].toString() : "0",
            "TotalLate": record["TotalLate"] ? record["TotalLate"].toString() : "0",
            "TotalHalf": record["TotalHalf"] ? record["TotalHalf"].toString() : "0",
            "TotalSunP": record["TotalSunP"] ? record["TotalSunP"].toString() : "0",
            "TotalSun": record["TotalSun"] ? record["TotalSun"].toString() : "0",
            "PayDays": record["PayDays"] ? record["PayDays"].toString() : "0",
            "Basic": record["Basic"] ? record["Basic"].toString() : "0",
            "HRA": record["HRA"] ? record["HRA"].toString() : "0",
            "EplyrPF": record["EplyrPF"] ? record["EplyrPF"].toString() : "0",
            "EplyrESI": record["EplyrESI"] ? record["EplyrESI"].toString() : "0",
            "MedInsurance": record["MedInsurance"] ? record["MedInsurance"].toString() : "0",
            "SpecAllowance": record["SpecAllowance"] ? record["SpecAllowance"].toString() : "0",
            "Advance": record["Advance"] ? record["Advance"].toString() : "0",
            "TDS": record["TDS"] ? record["TDS"].toString() : "0",
            "Gratuity": record["Gratuity"] ? record["Gratuity"].toString() : "0",
            "EplyePF": record["EplyePF"] ? record["EplyePF"].toString() : "0",
            "EplyeESI": record["EplyeESI"] ? record["EplyeESI"].toString() : "0",
            "PT": record["PT"] ? record["PT"].toString() : "0",
            "AdvanceDeduction": record["AdvanceDeduction"] ? record["AdvanceDeduction"].toString() : "0",
            "VariablePay": record["VariablePay"] ? record["VariablePay"].toString() : "0",
            "SD": record["SecurityDeposit"] ? record["SecurityDeposit"].toString() : "0",
            "Other": record["Other"] ? record["Other"].toString() : "0",
            "GrossPay": record["GrossPay"] ? record["GrossPay"].toString() : "0",
            "Status": record["Status"] ? record["Status"].toString() : "",
            "UploadedBy": record["UploadedBy"] ? record["UploadedBy"].toString() : "",
            "ChangedBy": record["ChangedBy"] ? record["ChangedBy"].toString() : "",
          };
        });
        this.oModel.setProperty("/TableData", records);
        this.oModel.setProperty("/isSELVisible", true);
        this.getView().byId("GS_id_BtnSave").setEnabled(true);
        this.closeBusyDialog();
      },

      _convertTimeToMinutes: function (timeStr) {
        if (typeof timeStr === "string") {
          timeStr = timeStr.trim();
          if (!timeStr.includes(":")) {
            return isNaN(parseInt(timeStr, 10)) ? 0 : parseInt(timeStr, 10);
          }
          const [hours, minutes] = timeStr.split(":").map(Number);
          if (isNaN(hours) || isNaN(minutes)) {
            return 0;
          }
          return hours * 60 + minutes;
        }
        return null;
      },

      GS_onPressSave: async function () {
        var that = this;
        this.getBusyDialog();
        $.ajax({
          url: that.oLoginModel.getData().url + "A_PayRoll",
          method: "POST",
          data: JSON.stringify({ data: that.oModel.getProperty("/TableData") }),
          headers: that.oLoginModel.getData().headers,
          success: function () {
            that.getView().byId("GS_id_BtnSave").setEnabled(false);
            that._onExportSalary();
            that.closeBusyDialog();
            MessageToast.show(that.i18nModel.getText("msgSalUploadSuccess"));
          },
          error: function (error) {
            console.log(error);
            that.closeBusyDialog();
            try {
              if (error.responseJSON.message.error.substring(0, 15) === "Duplicate entry") {
                that.getView().byId("GS_id_BtnSave").setEnabled(false);
                MessageToast.show(that.i18nModel.getText("msgDataExistsInDB"));
              }
              else {
                MessageToast.show(that.i18nModel.getText("msgTraineeformerror"));
              }
            }
            catch (e) {
              MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
            }
          }
        });
      },

      _onExportSalary: function () {
        var branch = this.oModel.getProperty("/FilterBranch");
        var month = this.oModel.getProperty("/FilterMonth");
        var year = this.oModel.getProperty("/FilterYear");
        const aData = this.oModel.getProperty("/TableData");
        var worksheet = XLSX.utils.json_to_sheet(aData);
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${branch} Salary Data ${month}-${year}.xlsx`);
      }
    });
  }
);