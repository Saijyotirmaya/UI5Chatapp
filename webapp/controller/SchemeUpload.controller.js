sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/export/Spreadsheet",
  ],
  (
    Controller,
    MessageToast,
    JSONModel,
    MessageBox,
    BusyIndicator,
    Spreadsheet
  ) => {
    "use strict";
    return Controller.extend(
      "sap.kt.com.minihrsolution.controller.SchemeUpload",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteSchemeUpload").attachMatched(this._RouteAppVisibility, this);
        },
        _RouteAppVisibility: async function (oEvent) {
          var LoginFunction = await this.commonLoginFunction("SchemeUpload");
          if (!LoginFunction) return;
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView().setModel(new JSONModel({ isFileValid: false })); //for createfragmentsubmit button
          this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("schemeupload"));
          this.MainModel = new JSONModel({ items: [] }); // Store table data
          this.oValue = oEvent.getParameter("arguments").value;
          if (this.oValue === "SchemeUpload") {
            this.CommomReadCall("");
            this.fetchUniqueModels();
            this.SU_onClear();
          } else {
            this.SU_onSearch();
          }
        },
        // Add this function to fetch unique models
        fetchUniqueModels: async function () {
          try {
            const response = await this.ajaxCreateWithJQuery("UniqueScheme", { data: {} });
            if (response.success) {
              const oModel = new JSONModel({ results: response.results });
              this.getView().setModel(oModel, "ModelOnly");
            }
          } catch (e) {
            MessageToast.show("Failed to load models");
          }
        },
        //for Search
        SU_onSearch: function () {
          var aFilterItems = this.byId("SU_id_Filterbar").getFilterGroupItems();
          var params = {};
          aFilterItems.forEach(function (oItem) {
            var oControl = oItem.getControl();
            var sValue = oItem.getName();
            if (oControl && oControl.getValue()) {
              params[sValue] = oControl.getValue();
            }
          });
          // Call with filter to update table only
          this.CommomReadCall(params);
        },
        SU_onClear: function () {
          var oFilterBar = this.getView().byId("SU_id_Filterbar");
          oFilterBar.getFilterGroupItems().forEach(function (oItem) {
            var oControl = oItem.getControl();
            if (oControl.setSelectedKey) {
              oControl.setSelectedKey("");
            } else if (oControl.setValue) {
              oControl.setValue("");
            }
          });
        },
        // Add this handler for the Model ComboBox's change event
        SU_onModelChange: async function (oEvent) {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          const oVariantComboBox = this.getView().byId("SU_id_Variant1");
          const oTransmissionComboBox = this.getView().byId("SU_id_Transmission1");

          // Clear dependent fields regardless of selection
          if (oVariantComboBox && oTransmissionComboBox) {
            oVariantComboBox.setSelectedKey("");
            oVariantComboBox.setValue("");
            oTransmissionComboBox.setSelectedKey("");
            oTransmissionComboBox.setValue("");
          }

          // Exit if no valid selection
          if (!oSelectedItem) {
            return;
          }
          // Proceed only if there's a valid selected item
          oVariantComboBox.setBusy(true);
          try {
            const sSelectedModel = oSelectedItem.getKey(); // Now safe to call
            const response = await this.ajaxCreateWithJQuery("UniqueScheme", {
              filters: { Model: sSelectedModel }
            });
            if (response.success) {
              this.getView().setModel(
                new JSONModel({ results: response.results }),
                "VariantOnly",
                "TransmissionOnly"
              );
            } else {
              MessageToast.show(this.i18nModel.getText("msgTraineeformerror"));
            }
          } catch (e) {
            console.error(e);
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          } finally {
            oVariantComboBox.setBusy(false);
          }
        },
        // goto Tilepage
        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },
        //for Singout
        onLogout: function () {
          this.CommonLogoutFunction()
        },
        //open uploadBox
        SU_onUploadpress: function () {
          if (!this.oSchemeUploadDialog) {
            this.oSchemeUploadDialog = sap.ui.xmlfragment(
              "sap.kt.com.minihrsolution.fragment.Uploadscheme",
              this
            );
            this.getView().addDependent(this.oSchemeUploadDialog);
          }
          this.oSchemeUploadDialog.open();
        },
        FUS_onCreateDialogCancel: function () {
          this.byId("SU_id_Quotationtable").removeSelections(true);
          this.oSchemeUploadDialog.close();
          var oFileUploader = sap.ui.getCore().byId("idFileUploader");
          oFileUploader.setValue("");
        },
        FUS_onUpload: function (e) {
          var that = this;
          var file = e.getParameter("files") && e.getParameter("files")[0];
          var oModel = this.getView().getModel();
          if (file) {
            oModel.setProperty("/isFileValid", true);
            this._import(file);
          }
          // Validate file type
          var validTypes = ["xlsx"];
          var fileType = file.name.split(".").pop().toLowerCase();

          if (!validTypes.includes(fileType)) {
            MessageToast.show(that.i18nModel.getText("msgvalidfiletype")
            );
            return;
          }
        },
        _import: function (file) {
          var that = this;
          var excelData = [];
          if (file && window.FileReader) {
            var reader = new FileReader();
            reader.onload = function (e) {
              var data = e.target.result;
              var workbook = XLSX.read(data, { type: "binary" });
              workbook.SheetNames.forEach(function (sheetName) {
                excelData = XLSX.utils.sheet_to_row_object_array(
                  workbook.Sheets[sheetName]
                );
              });
              that._uploadedExcelData = excelData;
              // **Update MainModel to reflect the data in the UI**
              that.MainModel.setProperty("/items", excelData);
              that.MainModel.refresh(true); // Ensure UI updates
            };
            reader.onerror = function (ex) {
              MessageToast.show(
                that.i18nModel.getText("quoSchemereadingfileerror"),
                ex
              );
            };
            reader.readAsBinaryString(file);
          }
        },
        //export
        SU_onDownloadpress: function () {
          const oTable = this.byId("SU_id_Quotationtable");
          if (!oTable) {
            MessageToast.show("Table not found");
            return;
          }
          const oModel = oTable.getModel("MainModel");
          if (!oModel) {
            MessageToast.show("Model not found");
            return;
          }
          const oData = oModel.getData();
          const aResults = oData.results;

          const aCols = this.createColumnConfig();

          //  If no data, show a toast, but CONTINUE to create empty Excel with only headers
          if (!Array.isArray(aResults) || aResults.length === 0) {
            MessageToast.show(this.i18nModel.getText("noData"));
          }
          const oSettings = {
            workbook: { columns: aCols, hierarchyLevel: "Level" },
            dataSource: aResults || [], //  if aResults is undefined/null, pass empty array
            fileName: "QuotationScheme.xlsx",
            worker: false,
          };
          const oSheet = new Spreadsheet(oSettings);
          oSheet.build().finally(() => {
            oSheet.destroy();
          });
        },


        createColumnConfig: function () {
          return [
            { label: "Model", property: "Model", type: "string" },
            { label: "Variant", property: "Variant", type: "string" },
            { label: "Transmission", property: "Transmission", type: "string" },
            { label: "Color", property: "Color", type: "string" },
            { label: "Fuel", property: "Fuel", type: "string" },
            { label: "BoardPlate", property: "BoardPlate", type: "string" },
            { label: "Ex-showroom", property: "EXShowroom", type: "number" },
            { label: "Consumer Scheme", property: "ConsumerScheme", type: "number", },
            { label: "Ex-Showroom  after Scheme", property: "EXShowroomAfterScheme", type: "number", },
            { label: "TCS  1%", property: "TCS1Perc", type: "number" },
            { label: "ROAD TAX", property: "ROADTAX", type: "number" },
            { label: "Regular Insurance", property: "Regular Insurance", type: "number", },
            { label: "Add On Insurance", property: "AddOnInsurance", type: "number", },
            { label: "RegHypCHARGE", property: "RegHypCharge", type: "number" },
            { label: "Shield of trust 4YR45K", property: "ShieldOfTrust4YR45K", type: "number", },
            { label: "EXTD Warranty FOR 4YR80K", property: "EXTDWarrantyFOR4YR80K", type: "number", },
            { label: "RSA", property: "RSA", type: "number" },
            { label: "STD Fittings", property: "STDFittings", type: "number" },
            { label: "FAST TAG", property: "FastTag", type: "number" },
            { label: "VAS", property: "VAS", type: "number" },
            { label: "Discountoffers", property: "DiscountOffers", type: "number", },
            { label: "Make", property: "Make", type: "string" },
            { label: "Emission", property: "Emission", type: "string" },
            { label: "Regular Insurance", property: "RegularInsurance", type: "number" },
            { label: "ENV Tax 1%", property: "ENVTax1Perc", type: "number" },
          ];
        },
        //for delete
        SU_onDeletepress: function () {
          var that = this;
          var oSelectedItem = this.byId("SU_id_Quotationtable").getSelectedItem();

          // First check if any row is selected
          if (!oSelectedItem) {
            MessageToast.show(this.i18nModel.getText("msgSelectRow")); // "Please select a row to delete."
            return;
          }
          // Now safely get the context
          var oContext = oSelectedItem.getBindingContext("MainModel").getProperty("ID");

          this.showConfirmationDialog(
            this.i18nModel.getText("msgBoxConfirm"),
            this.i18nModel.getText("msgBoxConfirmDelete"),
            async function () {
              that.getBusyDialog();
              await that.ajaxDeleteWithJQuery("/SchemeUploade", { filters: { ID: oContext } }).then(() => {
                that.closeBusyDialog();
                MessageToast.show(that.i18nModel.getText("msgSchemeDeleted"));
                // that.CommomReadCall("");
                that.SU_onSearch();
              }).catch((error) => {
                that.closeBusyDialog();
                MessageToast.show(error.responseText);
              });
            },
            function () {
              that.byId("SU_id_Quotationtable").removeSelections(true);
            }
          );
        },

        FUS_onCreateDialogSubmit: async function () {
          var that = this;
          var oFileUploader = sap.ui.getCore().byId("idFileUploader");

          if (!that._uploadedExcelData || that._uploadedExcelData.length === 0) {
            MessageToast.show("No Data In Excel");
            return;
          }

          var validRows = that._uploadedExcelData.filter((row) => {
            return row["Model"] && row["Variant"];
          });

          if (validRows.length === 0) {
            MessageToast.show("No valid columns found");
            return;
          }

          var formattedData = that._uploadedExcelData.map((row) => ({
            Variant: row["Variant"] || "",
            Model: row["Model"] || "",
            Transmission: row["Transmission"] || "",
            Color: row["Color"] || "",
            Fuel: row["Fuel"] || "",
            BoardPlate: row["BoardPlate"] || "",
            EXShowroom: row["Ex-showroom"] || "",
            ConsumerScheme: row["Consumer Scheme"] || "",
            EXShowroomAfterScheme: row["Ex-Showroom  after Scheme"] || "",
            TCS1Perc: row["TCS  1%"] || "",
            ROADTAX: row["ROAD TAX"] || "",
            RegularInsurance: row["Regular Insurance"] || "",
            ENVTax1Perc: row["ENV Tax 1%"] || "",
            AddOnInsurance: row["Add On Insurance"] || "",
            RegHypCharge: row["RegHypCHARGE"] || "",
            ShieldOfTrust4YR45K: row["Shield of trust 4YR45K"] || "",
            EXTDWarrantyFOR4YR80K: row["EXTD Warranty FOR 4YR80K"] || "",
            STDFittings: row["STD Fittings"] || "",
            FastTag: row["FAST TAG"] || "",
            VAS: row["VAS"] || "",
            RSA: row["RSA"] || "",
            DiscountOffers: row["Discountoffers"] || "",
            Make: row["Make"] || "",
            Emission: row["Emission"] || "",
          }));

          // Show confirmation MessageBox before uploading
          MessageBox.confirm(
            "Previous data will be deleted. Do you want to continue?",
            {
              title: "Confirm Upload",
              actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
              emphasizedAction: MessageBox.Action.OK,
              onClose: async function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  // User confirmed, proceed with delete and upload
                  that.getBusyDialog();
                  try {

                    var deleteResponse = await that.ajaxDeleteWithJQuery("/SchemeUploade", {});

                    if (!deleteResponse.success) {
                      this.closeBusyDialog();
                      MessageToast.show("Failed to delete previous data.");
                      return;
                    }

                    // 2. Now Upload New Data
                    var uploadResponse = await that.ajaxCreateWithJQuery("SchemeUploade", { data: formattedData });

                    if (uploadResponse.success) {
                      that.closeBusyDialog();
                      MessageToast.show(that.i18nModel.getText("msgschemeupload"));

                      // Update UI Model after successful save
                      that.getView().setModel(that.MainModel, "MainModel");
                      that.MainModel.refresh(true);
                      that.CommomReadCall("");
                      oFileUploader.setValue(""); // Reset file uploader
                      that.SU_onClear();
                      that.oSchemeUploadDialog.close();
                    } else {
                      that.closeBusyDialog();
                      MessageToast.show("Failed to upload new data. Please try again.");
                    }
                  } catch (error) {
                    that.closeBusyDialog();
                    console.error(error);
                    MessageToast.show("An error occurred. Please try again.");
                  }
                } else {
                  // User cancelled
                  MessageToast.show("Upload cancelled.");
                }
              }
            }
          );
        },

        CommomReadCall: async function (filter) {
          this.getBusyDialog();
          await this.ajaxReadWithJQuery("SchemeUploade", filter)
            .then((oData) => {
              var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];

              // Save the full unfiltered data once (e.g., onInit) — if no filters applied
              // if (!filter || Object.keys(filter).length === 0) {
              //   this._fullOfferData = offerData; // Save for ComboBox deduplication
              //   this._populateComboBoxModels(offerData);
              // }

              // Always update the table view
              this.getView().setModel(
                new JSONModel({ results: offerData }),
                "MainModel"
              );

              this.closeBusyDialog();
            }).catch((Error) => {
              this.closeBusyDialog();
              MessageBox.error(
                this.i18nModel.getText("commonReadingDataError")
              );
            });
        },
        // _populateComboBoxModels: function (offerData) {
        //   const getUnique = (arr, key) => {
        //     const seen = new Set();
        //     return arr.filter((item) => {
        //       if (item[key] && !seen.has(item[key])) {
        //         seen.add(item[key]);
        //         return true;
        //       }
        //       return false;
        //     }).map((item) => ({ [key]: item[key] }));
        //   };

        //   const uniqueModels = getUnique(offerData, "Model");
        //   const uniqueVariants = getUnique(offerData, "Variant");
        //   const uniqueTransmissions = getUnique(offerData, "Transmission");

        //   this.getView().setModel(new JSONModel({ results: uniqueModels }), "ModelOnly");
        //   this.getView().setModel(new JSONModel({ results: uniqueVariants }), "VariantOnly");
        //   this.getView().setModel(new JSONModel({ results: uniqueTransmissions }), "TransmissionOnly");
        // },

        //Navigate to new page with data
        SU_onItemPress: function (oEvent) {
          var oSelectedContext = oEvent.getSource().getBindingContext("MainModel");
          if (!oSelectedContext) {
            return;
          }
          var oData = oSelectedContext.getObject();
          if (!oData) {
            return;
          }
          oData.isEditable = false;
          this.getRouter().navTo("RouteSchemeUploadDetails", {
            data: oData.ID,
          });
        },
        //create a new data
        SU_onCreateform: function () {
          this.getRouter().navTo("RouteSchemeUploadDetails", { data: "new" });
        },
      }
    );
  }
);
