sap.ui.define(
  [
    "./BaseController", // Import BaseController 
    "../model/formatter", // Import formatter utility
    "sap/ui/export/Spreadsheet", // Import Spreadsheet for Excel export functionality
    "sap/m/MessageToast", // Import MessageToast for notifications
    "sap/m/MessageBox", // Import MessageBox for alerts/confirmations
  ],
  function (BaseController, Formatter, Spreadsheet, MessageToast, MessageBox) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.Listofholidays",
      {
        Formatter: Formatter,
        onInit: function () {
          this.getRouter().getRoute("RouteListofholidays").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
          var that = this;
          var LoginFunction = await this.commonLoginFunction("Holiday");
          if (!LoginFunction) return;
          this.getBusyDialog(); // Show busy dialog
          // Set current year in the holidays input field
          this.byId("LOH_id_Holidays").setValue(new Date().getFullYear());
          // Make date pickers read-only
          this._makeDatePickersReadOnly(["LOH_id_Holidays"]);
          // Fetch holiday data for current year 
          await this._fetchCommonData("ListOfHolidays?", "HolidayModel", {
            startDate: `${new Date().getFullYear()}-01-01`,
            endDate: `${new Date().getFullYear()}-12-31`
          }).then(() => {
            // Get i18n resource bundle
            that.i18nModel = that.getView().getModel("i18n").getResourceBundle();
            // Set header name in LoginModel
            that.getView().getModel("LoginModel").setProperty("/HeaderName", that.i18nModel.getText("headerListOfHolidays"));
            this.closeBusyDialog();
          }).catch((error) => {
            this.closeBusyDialog();
            MessageToast.show(error.message || error.responseText);
          });
          this.initializeBirthdayCarousel();
        },

        onSearch: async function () {
          this.getBusyDialog(); // Show busy dialog
          var selectedYear = this.byId("LOH_id_Holidays").getValue(); // Get selected year from input field
          await this._fetchCommonData("ListOfHolidays?", "HolidayModel", {
            startDate: `${selectedYear}-01-01`,
            endDate: `${selectedYear}-12-31`
          }).then(() => {
            this.closeBusyDialog();
          }).catch((error) => {
            this.closeBusyDialog();
            MessageToast.show(error.message || error.responseText);
          });
        },

        // Opens the import dialog for holiday list
        LOH_onOpenImport: function () {
          var that = this;
          if (!this.oHolidayDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.AddHolidayList",
              controller: this,
            }).then(function (oHolidayDialog) {
              that.oHolidayDialog = oHolidayDialog;
              that.getView().addDependent(that.oHolidayDialog);
              that._resetDialogFields(); // Reset values
              that.oHolidayDialog.open();   // Open dialog
            });
          } else {
            this._resetDialogFields();  // Reset fields and open existing dialog
            this.oHolidayDialog.open();
          }
        },

        LOH_onPressClose: function () {
          this.oHolidayDialog.close(); //Closes the holiday dialog
        },

        _resetDialogFields: function () {
          // Set default year (next year)
          sap.ui.getCore().byId("ALH_id_Date").setValue(new Date().getFullYear() + 1);
          // Make date pickers read-only
          this._FragmentDatePickersReadOnly(["ALH_id_Date"]);
          // Clear file uploader
          sap.ui.getCore().byId("ALH_id_LocFileUpload").clear();
        },

        LOH_onUpload: function (e) {
          var oFileUploader = e.getSource();
          var file = e.getParameter("files") && e.getParameter("files")[0];
          var selectedYear = sap.ui.getCore().byId("ALH_id_Date").getValue();
          // Expected columns in the Excel file
          var expectedColumns = ["Name", "Date", "Day", "Karnataka", "OtherStates",
            "Maharashtra", "Delhi"];
          var that = this;
          // File reader to process the uploaded file
          var reader = new FileReader();
          reader.onload = function (event) {
            try {
              // Read Excel file
              var data = new Uint8Array(event.target.result);
              var workbook = XLSX.read(data, { type: "array" });
              var sheetName = workbook.SheetNames[0];
              var sheet = workbook.Sheets[sheetName];
              var excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
              // Check if file has data
              if (!excelData.length) {
                MessageToast.show(that.i18nModel.getText("noDatainFile"));
                oFileUploader.clear();
                return;
              }
              // Validate column headers
              var fileHeaders = excelData[0].map((header) => header.trim());
              if (!expectedColumns.every((col, index) => col === fileHeaders[index])) {
                MessageToast.show(that.i18nModel.getText("fileColumnOrderFormat"));
                oFileUploader.clear();
                return;
              }
              // Validate state data (Yes or No)
              var invalidData = excelData.slice(1).some((row) => {
                return [3, 4, 5, 6].some((index) => {
                  const value = String(row[index]).trim();
                  return value !== 'Yes' && value !== 'No';
                }
                );
              });
              if (invalidData) {
                MessageToast.show(that.i18nModel.getText("InvalidColStateFormat"));
                oFileUploader.clear();
                return;
              }
              // Validate year matches selected year
              var invalidYear = excelData.slice(1).some((row) => {
                var dateValue = row[1];
                var jsDate = that.excelDateToJSDate(dateValue);
                var rowYear = jsDate.getFullYear();
                return rowYear !== parseInt(selectedYear, 10);
              });
              if (invalidYear) {
                MessageToast.show(that.i18nModel.getText("IncorrectDataOfExcel"));
                oFileUploader.clear();
                return;
              }
              // Store valid data for submission
              that._uploadedExcelData = excelData;
            } catch (error) {
              MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
              oFileUploader.clear();
            }
          };
          reader.readAsArrayBuffer(file);
        },

        excelDateToJSDate: function (serial) {
          var excelEpoch = new Date(Date.UTC(1899, 11, 30));
          var date = new Date(excelEpoch.getTime() + serial * 86400000);
          return date;
        },

        LOH_onPressSubmit: async function () {
          try {
            var that = this;
            var selectedYear = sap.ui.getCore().byId("ALH_id_Date").getValue();
            if (!this._uploadedExcelData) {
              MessageToast.show(that.i18nModel.getText("uploadExcel"));
              return;
            }
            var formattedData = this._uploadedExcelData.slice(1).map((row) => ({
              Name: row[0],
              Date: this.excelDateToJSDate(row[1]).toISOString().split("T")[0],
              Day: row[2],
              Karnataka: row[3],
              OtherStates: row[4],
              Maharashtra: row[5],
              Delhi: row[6],
            }));
            await this.ajaxReadWithJQuery("ListOfHolidays", {
              startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-12-31`
            }).then((existingData) => {
              if (existingData.data.length > 0) {
                MessageBox.confirm(
                  `Previous data for ${selectedYear} will be deleted. Do you want to continue?`,
                  {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: async function (sAction) {
                      if (sAction === MessageBox.Action.YES) {
                        that.getBusyDialog(); // Show busy dialog
                        await that.ajaxDeleteWithJQuery("ListOfHolidays", {
                          filters: {
                            startDate: `${selectedYear}-01-01`,
                            endDate: `${selectedYear}-12-31`
                          },
                        }).then(() => {
                          return that.ajaxCreateWithJQuery("ListOfHolidays", { data: formattedData });
                        }).then(() => {
                          MessageToast.show(that.i18nModel.getText("uploadSuccessfull"));
                          that.byId("LOH_id_Holidays").setDateValue(new Date(selectedYear, 0, 1));
                          that.oHolidayDialog.close();
                          return that._fetchCommonData("ListOfHolidays?", "HolidayModel", {
                            startDate: `${selectedYear}-01-01`,
                            endDate: `${selectedYear}-12-31`
                          }, ["LOH_id_HolidayTable"]);
                        }).catch((error) => {
                          MessageToast.show(error.message || error.responseText);
                        }).finally(() => {
                          that.closeBusyDialog();
                        });
                      } else {
                        that.closeBusyDialog();
                      }
                    },
                  }
                );
              } else {
                that.getBusyDialog(); // Show busy dialog
                that.ajaxCreateWithJQuery("ListOfHolidays", { data: formattedData }).then(() => {
                  MessageToast.show(that.i18nModel.getText("uploadSuccessfull"));
                  that.byId("LOH_id_Holidays").setDateValue(new Date(selectedYear, 0, 1));
                  that.oHolidayDialog.close();
                  return that._fetchCommonData("ListOfHolidays?", "HolidayModel", {
                    startDate: `${selectedYear}-01-01`,
                    endDate: `${selectedYear}-12-31`
                  }, ["LOH_id_HolidayTable"]);
                }).catch((error) => {
                  MessageToast.show(error.message || error.responseText);
                }).finally(() => {
                  that.closeBusyDialog();
                });
              }
            }).catch((err) => {
              that.closeBusyDialog();
              MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
            });
          } catch (error) {
            that.closeBusyDialog();
            MessageToast.show(error.message || error.responseText);
          }
        },

        //Exports the holiday list to an Excel file
        LOH_onExport: function () {
          var oModel = this.byId("LOH_id_HolidayTable").getModel("HolidayModel").getData();
          if (!oModel || oModel.length === 0) {
            MessageToast.show(that.i18nModel.getText("noData"));
            return;
          }
          // Configure export settings
          const aCols = this.createColumnConfig();
          const oSettings = {
            workbook: { columns: aCols, hierarchyLevel: "Level" },
            dataSource: oModel,
            fileName: "List_Of_Holidays.xlsx",
            worker: false,
          };
          // Create and build spreadsheet
          const oSheet = new sap.ui.export.Spreadsheet(oSettings);
          oSheet.build().finally(function () {
            oSheet.destroy();
          });
        },

        //Creates column configuration for Excel export
        createColumnConfig: function () {
          return [
            { label: "Name", property: "Name", type: "string" },
            { label: "Date", property: "Date", type: "date" },
            { label: "Day", property: "Day", type: "string" },
            { label: "Karnataka", property: "Karnataka", type: "string" },
            { label: "OtherStates", property: "OtherStates", type: "string" },
            { label: "Maharashtra", property: "Maharashtra", type: "string" },
            { label: "Delhi", property: "Delhi", type: "string" },
          ];
        },

        onPressback: function () {
          this.getRouter().navTo("RouteTilePage"); // Navigate back to the tile page
        },

        onLogout: function () {
          this.CommonLogoutFunction(); // Navigate to the login page
        },
      }
    );
  }
);
