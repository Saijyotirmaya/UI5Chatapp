sap.ui.define(
  [
    "./BaseController",  //import base controller
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/m/MessageToast",
  ],
  function (BaseController, utils, JSONModel, Formatter, MessageToast) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.RouteHrQuotationDetails", {
      Formatter: Formatter,
      onInit: function () {
        var oQuotationModel = new JSONModel();
        this.getView().setModel(oQuotationModel, "QuotationModel");
        this.getRouter().getRoute("RouteHrQuotationDetails").attachMatched(this._onRouteMatched, this);
      },
      _onRouteMatched: async function (oEvent) {
        var oArgs = oEvent.getParameter("arguments");
        var sQuotationNo = decodeURIComponent(oArgs.sQuotationNo);
        var LoginFunction = await this.commonLoginFunction("HrQuotation");
        if (!LoginFunction) return;
        this.getBusyDialog();
        this._ViewDatePickersReadOnly(["HQD_id_Quotation", "HQD_id_QuotationValid"], this.getView())
        this.scrollToSection("HQD_id_QuotationDetailsPage", "HQD_id_Section");
        await this._fetchCommonData("Quotation", "QuotationPDFModel", {});
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        var oVisiModel = new JSONModel();

        if (sQuotationNo === "new") {
          // Create new mode
          var oRawData = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
          var oToday = new Date();
          oToday.setHours(0, 0, 0, 0);
          var oMinDate = new Date(oToday);
          oMinDate.setFullYear(oToday.getFullYear() - 100);
          var oValidUntil = new Date(oToday);
          oValidUntil.setDate(oValidUntil.getDate() + 30);

          var sMobileNo = oRawData.mobileNo || "";
          var sActualMobileNo = sMobileNo.startsWith("+91") ? sMobileNo.slice(3) : sMobileNo;

          var oBlankModel = new JSONModel({
            Date: oToday,
            ValidUntil: oValidUntil,
            CompanyName: oRawData.companyName,
            CompanyAddress: oRawData.longAddress,
            CompanyGSTNO: oRawData.gstin,
            CompanyEmailID: oRawData.carrerEmail,
            CompanyMobileNo: sActualMobileNo,
            STDCode: "+91",
            CustomerSTDCode: "+91",
            Country: "India",
            Branch: "Kalaburagi",
            Currency: "INR",
            gstEditable: true,
            IGSTSelected: false,
            CGSTVisible: true,
            Percentage: 9,
            SGSTVisible: true,
            IGSTVisible: false
          });
          this.byId("HQD_id_CompGSTNO").setEditable(true);
          this.getView().setModel(oBlankModel, "SingleCompanyModel");

          var oQuotationModel = new JSONModel({
            QuotationItemModel: [],
            CGSTSelected: true,
            IGSTSelected: false,
            SGSTVisible: true,
            CGSTVisible: true,
            IGSTVisible: false,
            ShowGSTFields: true,
            ShowSACAndGSTCalculation: true // Always show in create mode
          });

          this.getView().setModel(oQuotationModel, "QuotationModel");
          this.updateTotalAmount();

          var oDatePicker = this.getView().byId("HQD_id_Quotation");
          oDatePicker.setDateValue(oToday);
          oDatePicker.setMinDate(oMinDate);
          oDatePicker.setMaxDate(oToday);

          var oValidPicker = this.getView().byId("HQD_id_QuotationValid");
          oValidPicker.setMaxDate(oValidUntil);
          oValidPicker.setDateValue(oValidUntil);
          oVisiModel.setData({ editable: true });
          this.getView().setModel(oVisiModel, "visiablityPlay");
          this.UnitAmount = true;
        } else {
          // Edit Mode
          this._fetchCommonData("EmailContent", "CCMailModel", { Type: "Quotation", Action: "CC" });
          this.UnitAmount = true;
          var aQuotations = this.getView().getModel("QuotationPDFModel").getData();
          var oSelectedQuotation = aQuotations.find(item => item.QuotationNo === sQuotationNo);
          if (oSelectedQuotation) {
            var oSelectedModel = new JSONModel(oSelectedQuotation);
            // Determine GST values
            var cgst = parseFloat(oSelectedQuotation.CGST || 0);
            var sgst = parseFloat(oSelectedQuotation.SGST || 0);
            var igst = parseFloat(oSelectedQuotation.IGST || 0);
            var Percentage = parseFloat(oSelectedQuotation.Percentage || 0);

            // Calculate visibility and selection flags
            var cgstVisible = (cgst > 0 || sgst > 0);
            var sgstVisible = cgstVisible;
            var igstVisible = (igst > 0);
            var cgstSelected = (cgst > 0 || sgst > 0);
            var igstSelected = (igst > 0);
            // Determine which GST radio is selected
            var percentageToShow = "";

            // If CGST/SGST is selected, use Percentage
            if (cgstSelected && !igstSelected) {
              percentageToShow = Percentage;
            } else if (igstSelected && !cgstSelected) {
              percentageToShow = Percentage;
            }
            else if (cgstSelected && igstSelected) {
              percentageToShow = Percentage;
            }
            oSelectedModel.setProperty("/Percentage", percentageToShow);


            oSelectedModel.setProperty("/gstEditable", false); // Disable editing

            // Check currency and set visibility accordingly
            var sCurrency = oSelectedQuotation.Currency || "INR";
            var bShowGSTFields = sCurrency === "INR";
            // oSelectedModel.setProperty("/Percentage", " ")
            // Convert Notes from HTML to plain text for display
            var sNotes = oSelectedModel.getProperty("/Notes");
            if (sNotes) {
              var tmpDiv = document.createElement("div");
              tmpDiv.innerHTML = sNotes;
              oSelectedModel.setProperty("/Notes", tmpDiv.textContent || tmpDiv.innerText || "");
            }
            this.getView().setModel(oSelectedModel, "SingleCompanyModel");

            setTimeout(() => {
              const oEditor = this.byId("HQD_id_Notes");
              if (oEditor && sNotes) {
                oEditor._oEditor?.editorManager?.activeEditor?.setContent(sNotes);
              }
            }, 100)

            // Set flags in QuotationModel after fetching items
            try {
              const response = await this.ajaxReadWithJQuery("QuotationItem", { QuotationNo: sQuotationNo });
              if (response && response.data) {
                var aItems = Array.isArray(response.data) ? response.data : [response.data];
                var oQuotationModel = new JSONModel({
                  QuotationItemModel: aItems,
                  CGSTSelected: cgstSelected,
                  IGSTSelected: igstSelected,
                  CGSTVisible: cgstVisible && bShowGSTFields,
                  SGSTVisible: sgstVisible && bShowGSTFields,
                  IGSTVisible: igstVisible && bShowGSTFields,
                  ShowGSTFields: bShowGSTFields,
                  ShowSACAndGSTCalculation: bShowGSTFields,

                });
                this.getView().setModel(oQuotationModel, "QuotationModel");
                this.updateTotalAmount();
              }
            } catch (e) {
              MessageToast.show("Error loading items", e);
            }
          }
          oVisiModel.setData({ editable: false });
        }
        if (sQuotationNo === "new") {
          oVisiModel.setData({
            editable: true, createVisi: true, editVisi: false, merge: false
          });
        } else {
          oVisiModel.setData({
            editable: false, createVisi: false, editVisi: true, merge: true
          });
        }
        this.getView().setModel(oVisiModel, "visiablityPlay");
        this.closeBusyDialog();
      },

      onLogout: function () {
        this.CommonLogoutFunction();
      },

      HQD_onCountryChange: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent);
        var sSelectedKey = oEvent.getSource().getSelectedKey(); // country name
        var oCodeModel = this.getView().getModel("codeModel");
        var aCodeData = oCodeModel.getProperty("/") || [];
        var oSTDCodeField = this.byId("HQD_id_mobileNumber");
        var oCustomerSTDCodeField = this.byId("HQD_id_CustomerNumberSTD");
        var oCurrencyCombo = this.byId("HQD_id_Curency");
        var oSingleCompanyModel = this.getView().getModel("SingleCompanyModel");
        var oQuotationModel = this.getView().getModel("QuotationModel");
        var oVisibilityModel = this.getView().getModel("visiablityPlay");
        const oBranchComboBox = this.byId("HQD_id_BranchCode");
        oBranchComboBox.setBusy(true);
        // Find matching entry from codeModel based on country
        var oCountryData = aCodeData.find(function (item) {
          return item.country === sSelectedKey;
        });

        if (oCountryData) {
          // Set STD code and Currency
          var sSTDCode = oCountryData.calling_code;
          var sCurrency = oCountryData.currency_code;

          oSTDCodeField.setValue(sSTDCode);
          oCustomerSTDCodeField.setValue(sSTDCode);
          oCurrencyCombo.setSelectedKey(sCurrency);
          oSingleCompanyModel.setProperty("/STDCode", sSTDCode);
          oSingleCompanyModel.setProperty("/Currency", sCurrency);
          oSingleCompanyModel.setProperty("/CustomerSTDCode", sSTDCode);
        }

        if (sSelectedKey === "India") {
          var oRawData = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
          oSingleCompanyModel.setProperty("/Branch", "Kalaburagi");
          this._fetchCommonData("BaseLocation", "BaseLocationModel");
          oVisibilityModel.setProperty("/showBranch", true); oQuotationModel.setProperty("/ShowGSTFields", true); oQuotationModel.setProperty("/CGSTSelected", true); oQuotationModel.setProperty("/IGSTSelected", false); oQuotationModel.setProperty("/CGSTVisible", true);
          oQuotationModel.setProperty("/SGSTVisible", true); oQuotationModel.setProperty("/IGSTVisible", false); oSingleCompanyModel.setProperty("/Percentage", 9); oSingleCompanyModel.setProperty("/gstEditable", true);
          // Setting Mobile number
          var sMobileNo = oRawData.mobileNo || "";
          var sActualMobileNo = sMobileNo.startsWith("+91") ? sMobileNo.slice(3) : sMobileNo;
          oSingleCompanyModel.setProperty("/CompanyMobileNo", sActualMobileNo);
          oQuotationModel.setProperty("/ShowSACAndGSTCalculation", true);

        } else {
          this.CountryAndCity(); // fetch cities for other countries
          oQuotationModel.setProperty("/ShowSACAndGSTCalculation", false);
          var oRawData = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
          oSingleCompanyModel.setProperty("/Branch", " ");
          oSingleCompanyModel.setProperty("/gstEditable", true); oSingleCompanyModel.setProperty("/CompanyName", oRawData.companyName); oSingleCompanyModel.setProperty("/CompanyGSTNO", oRawData.gstin); oSingleCompanyModel.setProperty("/CompanyEmailID", oRawData.carrerEmail);
          oSingleCompanyModel.setProperty("/CompanyAddress", oRawData.longAddress);
          oSingleCompanyModel.setProperty("/CompanyMobileNo", ""); oSingleCompanyModel.setProperty("/CustomerMobileNo", "");
          // Hide GST fields and update percentage
          oQuotationModel.setProperty("/ShowGSTFields", false); oQuotationModel.setProperty("/CGSTSelected", false); oQuotationModel.setProperty("/IGSTSelected", true);
          oQuotationModel.setProperty("/CGSTVisible", false); oQuotationModel.setProperty("/SGSTVisible", false); oQuotationModel.setProperty("/IGSTVisible", false);
          oSingleCompanyModel.setProperty("/Percentage", 18);
        }
        // Reset tax-related values
        oQuotationModel.setProperty("/CGST", 0); oQuotationModel.setProperty("/SGST", 0);
        oQuotationModel.setProperty("/IGST", 0); oQuotationModel.setProperty("/SubTotal", 0);

        // Update GSTCalculation field in each item
        var aItems = oQuotationModel.getProperty("/QuotationItemModel") || [];
        aItems.forEach(function (item) {
          item.GSTCalculation = (sSelectedKey === "India") ? "Yes" : "No";
        });
        oQuotationModel.setProperty("/QuotationItemModel", aItems);

        this.updateTotalAmount();

        // Clear value state if blank
        if (oEvent.getSource().getValue() === '') {
          oEvent.getSource().setValueState("None");
        }

        oBranchComboBox.setBusy(false);
      },

      CountryAndCity: function () {
        var Code = this.getView().getModel("CountryModel").getData().filter((item) => item.countryName === this.byId("HQD_id_Country").getValue());
        var oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, Code[0].code);
        this.byId("HQD_id_BranchCode").getBinding("items").filter(oFilter);
      },

      HQD_onBrachChange: function (oEvent) {
        utils._LCvalidationComboBox(oEvent);
        var sSelectedBranchCode = oEvent.getSource().getSelectedKey();
        var aCompanyDetails = this.getView().getModel("CompanyCodeDetailsModel").getData();
        var oMatchedBranch = aCompanyDetails.find(function (entry) {
          return entry.branchCode === sSelectedBranchCode;
        });

        if (oMatchedBranch) {
          var oSingleCompanyModel = this.getView().getModel("SingleCompanyModel");

          // Get mobile number and extract STD code and number
          var sMobileNo = oMatchedBranch.mobileNo || "";
          var sSTDCode = "";
          var sActualMobileNo = sMobileNo;

          if (sMobileNo.startsWith("+91")) {
            sSTDCode = "+91";
            sActualMobileNo = sMobileNo.slice(3); // remove +91
          }
          oSingleCompanyModel.setProperty("/CompanyName", oMatchedBranch.companyName || "");
          oSingleCompanyModel.setProperty("/CompanyAddress", oMatchedBranch.longAddress || "");
          oSingleCompanyModel.setProperty("/CompanyGSTNO", oMatchedBranch.gstin || "");
          oSingleCompanyModel.setProperty("/CompanyEmailID", oMatchedBranch.carrerEmail || "");
          oSingleCompanyModel.setProperty("/CompanyMobileNo", sActualMobileNo);
          oSingleCompanyModel.setProperty("/STDCode", sSTDCode);
        }
      },

      HQD_onComGSTLiveChange: function (oEvent) {
        utils._LCvalidateGstNumber(oEvent);
        var oInput = oEvent.getSource();
        var sValueState = oInput.getValueState();
        var sGST = oInput.getValue().trim();

        if (oInput.getValue() === '') {
          oInput.setValueState("None");
          return;
        }
        // Get references to UI elements
        var oView = this.getView();
        var oCGSTRadio = oView.byId("HQD_id_CheckboxCGS");
        var oIGSTRadio = oView.byId("HQD_id_CheckboxIGS");
        var oCGSTPercent = oView.byId("HQD_id_Percentage");
        var oModel = oView.getModel("QuotationModel");

        if (sValueState === "None" && sGST) {
          // Enable fields
          oCGSTRadio.setEditable(true);
          oIGSTRadio.setEditable(true);
          oCGSTPercent.setEditable(true);
          oModel.setProperty("/ShowSACAndGSTCalculation", true);

          // Check GST number state code
          var stateCode = sGST.substring(0, 2);
          if (stateCode === "29") {
            // Karnataka GST - select CGST/SGST
            this.onSelectCGST();
            oCGSTRadio.setSelected(true);
            oIGSTRadio.setSelected(false);
          } else {
            // Other state GST - select IGST
            this.onSelectIGST();
            oCGSTRadio.setSelected(false);
            oIGSTRadio.setSelected(true);
          }

        } else {
          // Invalid GST - disable fields and clear values
          oCGSTRadio.setEditable(false);
          oIGSTRadio.setEditable(false);
          oCGSTPercent.setEditable(false);
          oModel.setProperty("/ShowSACAndGSTCalculation", false);
          oModel.setProperty("/CGSTSelected", false);
          oModel.setProperty("/IGSTSelected", false);
          oModel.setProperty("/CGSTPercent", "");
          oCGSTPercent.setValue("");
        }
      },
      updateTotalAmount: function () {
        var oView = this.getView();
        var oQuotationModel = oView.getModel("QuotationModel");
        var aItems = oQuotationModel.getProperty("/QuotationItemModel") || [];
        var sCurrency = this.getView().getModel("SingleCompanyModel").getProperty("/Currency");
        var bIsINR = sCurrency === "INR";

        // Declare required variables
        var subTotalTaxable = 0;
        var subTotalNonTaxable = 0;
        var cgst = 0;
        var sgst = 0;
        var igst = 0;
        var totalSum = 0;

        aItems.forEach(function (oItem) {
          // Enforce GSTCalculation based on currency
          if (!bIsINR) {
            oItem.GSTCalculation = "No";
            oItem.SAC = "-";
          }

          // Days is 0 or undefined
          var iDays = parseFloat(oItem.Days) || 0;
          var iUnitPrice = parseFloat(oItem.UnitPrice) || 0;
          // Calculate item total if Days is 0, just use UnitPrice
          var iItemTotal = iDays ? iDays * iUnitPrice : iUnitPrice;

          var iDiscount = 0;
          if (oItem.IsDiscountPercentage) {
            var percent = parseFloat(oItem.Discount || 0) / 100;
            iDiscount = iItemTotal * percent;
          } else {
            iDiscount = parseFloat(oItem.Discount || 0);
          }

          if (iDiscount > iItemTotal) {
            iDiscount = iItemTotal;
          }

          var finalItemTotal = iItemTotal - iDiscount;
          oItem.Total = parseFloat(finalItemTotal.toFixed(2));


          if (oItem.GSTCalculation === "Yes" && bIsINR) {
            subTotalTaxable += oItem.Total;
            oItem.SAC = "998314";
          } else {
            subTotalNonTaxable += oItem.Total;
            oItem.SAC = "-";
            oItem.GSTCalculation = "No"; // Ensure GST is No for non-INR
          }
        });

        // Update items back into model
        oQuotationModel.setProperty("/QuotationItemModel", aItems);
        oQuotationModel.setProperty("/SubTotal", parseFloat(subTotalTaxable.toFixed(2)));
        oQuotationModel.setProperty("/SubTotalNotGST", parseFloat(subTotalNonTaxable.toFixed(2)));

        // Tax calculations - only if currency is INR
        var oSingleCompanyModel = oView.getModel("SingleCompanyModel");
        var cgstPerc = 0, sgstPerc = 0, igstPerc = 0;

        if (bIsINR) {
          cgstPerc = oQuotationModel.getProperty("/CGSTSelected")
            ? parseFloat(oSingleCompanyModel.getProperty("/Percentage") || 9)
            : 0;
          sgstPerc = oQuotationModel.getProperty("/CGSTSelected")
            ? parseFloat(oSingleCompanyModel.getProperty("/Percentage") || 9)
            : 0;
          igstPerc = oQuotationModel.getProperty("/IGSTSelected")
            ? parseFloat(oSingleCompanyModel.getProperty("/Percentage") || 18)
            : 0;
        }

        oQuotationModel.setProperty("/CGST", 0);
        oQuotationModel.setProperty("/SGST", 0);
        oQuotationModel.setProperty("/IGST", 0);

        if (bIsINR && oQuotationModel.getProperty("/CGSTSelected")) {
          cgst = subTotalTaxable * (cgstPerc / 100);
          sgst = subTotalTaxable * (sgstPerc / 100);
          oQuotationModel.setProperty("/CGST", parseFloat(cgst.toFixed(2)));
          oQuotationModel.setProperty("/SGST", parseFloat(sgst.toFixed(2)));
          totalSum = subTotalTaxable + subTotalNonTaxable + cgst + sgst;
        } else if (bIsINR && oQuotationModel.getProperty("/IGSTSelected")) {
          igst = subTotalTaxable * (igstPerc / 100);
          oQuotationModel.setProperty("/IGST", parseFloat(igst.toFixed(2)));
          totalSum = subTotalTaxable + subTotalNonTaxable + igst;
        } else {
          totalSum = subTotalTaxable + subTotalNonTaxable;
        }
        oQuotationModel.setProperty("/TotalSum", parseFloat(totalSum.toFixed(2)));
        oQuotationModel.refresh();
      },

      HQD_onPercentageChange: function (oEvent) {
        utils._LCvalidateAmount(oEvent)
        this.updateTotalAmount()
      },

      onSelectCGST: function (oEvent) {
        // Uncheck IGST checkbox and ensure only CGST is selected
        this.getView().byId("HQD_id_CheckboxIGS").setSelected(false);

        var oModel = this.getView().getModel("SingleCompanyModel");
        var oQuotationModel = this.getView().getModel("QuotationModel");
        this.getView().byId("HQD_id_Percentage").setValueState(sap.ui.core.ValueState.None);
        oModel.setProperty("/CGSTSelected", true);
        oModel.setProperty("/IGSTSelected", false);
        // Update visibility for CGST/SGST and hide IGST
        oModel.setProperty("/CGSTVisible", true); oModel.setProperty("/SGSTVisible", true);
        oModel.setProperty("/IGSTVisible", false); oQuotationModel.setProperty("/CGSTVisible", true); oQuotationModel.setProperty("/SGSTVisible", true); oQuotationModel.setProperty("/IGSTVisible", false); oModel.setProperty("/Percentage", 9); oQuotationModel.setProperty("/CGSTSelected", true);
        this.updateTotalAmount();
      },

      onSelectIGST: function () {
        var oView = this.getView();

        // Uncheck CGST/SGST 
        oView.byId("HQD_id_CheckboxCGS").setSelected(false);

        // Access both models
        var oCompanyModel = oView.getModel("SingleCompanyModel");
        var oQuotationModel = oView.getModel("QuotationModel");
        oView.byId("HQD_id_Percentage").setValueState(sap.ui.core.ValueState.None);

        oQuotationModel.setProperty("/CGSTSelected", false);
        oQuotationModel.setProperty("/IGSTSelected", true);
        // Update visibility
        oQuotationModel.setProperty("/CGSTVisible", false);
        oQuotationModel.setProperty("/SGSTVisible", false);
        oQuotationModel.setProperty("/IGSTVisible", true);
        oCompanyModel.setProperty("/Percentage", 18);
        this.updateTotalAmount();
      },
      HQD_onBack: function () {
        var isEditMode = this.getView().getModel("visiablityPlay").getProperty("/editable");
        if (isEditMode) {
          this.showConfirmationDialog(
            this.i18nModel.getText("ConfirmActionTitle"),
            this.i18nModel.getText("backConfirmation"),
            function () {
              // Reset edit-related flags
              this.getView().getModel("visiablityPlay").setProperty("/editable", false);
              this.getView().getModel("visiablityPlay").setProperty("/merge", true);
              this.resetHQDForm()
              // Navigate back
              this.getRouter().navTo("RouteHrQuotation");
            }.bind(this)
          );
        } else {
          this.resetHQDForm()
          this.getRouter().navTo("RouteHrQuotation");
        }
      },
      HQD_DateValidate: function (oEvent) {
        var oView = this.getView();
        var oDatePicker = oEvent.getSource();
        var oDate = oDatePicker.getDateValue();

        if (oDate) {
          // Normalize current date
          oDate.setHours(0, 0, 0, 0);

          // Create fresh max date each time
          var oMaxDate = new Date(oDate.getTime());
          oMaxDate.setDate(oMaxDate.getDate() + 30);

          var oValidUntil = oView.byId("HQD_id_QuotationValid");
          oValidUntil.setMinDate(new Date(oDate.getTime()));
          oValidUntil.setMaxDate(new Date(oMaxDate.getTime()));

          var oCurrentValidUntil = oValidUntil.getDateValue();

          // Compare with fresh values
          if (!oCurrentValidUntil || oCurrentValidUntil < oDate || oCurrentValidUntil > oMaxDate) {
            //  Use a NEW Date object to trigger change
            var oNewValidDate = new Date(oMaxDate.getTime());
            oValidUntil.setDateValue(oNewValidDate);

            //  Update model with a fresh date
            var oModel = oView.getModel("SingleCompanyModel");
            oModel.setProperty("/ValidUntil", new Date(oNewValidDate.getTime()));
          }
        }
      },

      HQD_onNameLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent);
      },

      HQD_onMNumberLiveChange: function (oEvent) {
        utils._LCvalidateMobileNumber(oEvent);
      },

      HQD_EmailIDLiveChange: function (oEvent) {
        utils._LCvalidateEmail(oEvent);
      },

      HQD_onAddressLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent)
      },
      HQD_onItemDescriptionLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent);
      },
      HQD_STDCode: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent);
      },
      HQD_onCurrencyChange: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent);

        var sSelectedCurrency = oEvent.getSource().getSelectedKey();
        var oQuotationModel = this.getView().getModel("QuotationModel");
        var oSingleCompanyModel = this.getView().getModel("SingleCompanyModel");
        // GST-relevant fields and values
        var oView = this.getView();
        var oModelDataPro = this.getView().getModel("QuotationModel");
        var fTotal = parseFloat(oModelDataPro.getProperty("/TotalSum")) || 0;
        var fCGST = parseFloat(oModelDataPro.getProperty("/CGST")) || 0;
        var fSGST = parseFloat(oModelDataPro.getProperty("/SGST")) || 0;
        var fIGST = parseFloat(oModelDataPro.getProperty("/IGST")) || 0;

        if (sSelectedCurrency === "INR") {
          // Currency is INR — enable GST
          oQuotationModel.setProperty("/CGSTVisible", false); oQuotationModel.setProperty("/SGSTVisible", false); oQuotationModel.setProperty("/IGSTVisible", false);
          oQuotationModel.setProperty("/ShowGSTFields", true); oSingleCompanyModel.setProperty("/gstEditable", true); oQuotationModel.setProperty("/CGSTSelected", true);
          oQuotationModel.setProperty("/IGSTSelected", false); oQuotationModel.setProperty("/CGSTVisible", true); oQuotationModel.setProperty("/SGSTVisible", true);
          oQuotationModel.setProperty("/IGSTVisible", false);
          oSingleCompanyModel.setProperty("/Percentage", 9);
          oQuotationModel.setProperty("/ShowSACAndGSTCalculation", true);
          // Calculate Total with GST
          var fNewTotal = fTotal + fCGST + fSGST + fIGST;
          oModelDataPro.setProperty("/TotalSum", fNewTotal.toFixed(2));

          var aItems = oQuotationModel.getProperty("/QuotationItemModel") || [];
          aItems.forEach(function (item) {
            item.GSTCalculation = "Yes"; // Enforce GST
          });

          // Force update to model to reflect change
          oQuotationModel.setProperty("/QuotationItemModel", JSON.parse(JSON.stringify(aItems)));
          this.updateTotalAmount();

        } else {
          // Currency is NOT INR — disable GST
          oQuotationModel.setProperty("/ShowSACAndGSTCalculation", false);
          oQuotationModel.setProperty("/CGSTVisible", false); oQuotationModel.setProperty("/SGSTVisible", false); oQuotationModel.setProperty("/IGSTVisible", false);
          oQuotationModel.setProperty("/ShowGSTFields", false); oQuotationModel.setProperty("/CGSTSelected", false); oQuotationModel.setProperty("/IGSTSelected", true);
          oSingleCompanyModel.setProperty("/Percentage", 18);

          //  Mark all items as non-taxable (GSTCalculation = "No")
          var aItems = oQuotationModel.getProperty("/QuotationItemModel") || [];
          aItems.forEach(function (item) {
            item.GSTCalculation = "No";
          });

          oQuotationModel.setProperty("/QuotationItemModel", aItems);
          // Clear tax values
          oQuotationModel.setProperty("/CGST", 0);
          oQuotationModel.setProperty("/SGST", 0);
          oQuotationModel.setProperty("/IGST", 0);
          oQuotationModel.setProperty("/SubTotal", 0);
          //  Recalculate totals
          this.updateTotalAmount();
        }
      },

      HQD_onCustomerNameLiveChange: function (oEvent) {
        utils._LCvalidateName(oEvent);
      },

      HQD_EmailIDLiveChange: function (oEvent) {
        utils._LCvalidateEmail(oEvent)
      },

      HQD_onMNumberLiveChange: function (oEvent) {
        utils._LCvalidateMobileNumber(oEvent);
      },

      HQD_onAddressLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent)
      },

      HQD_onCustomerGSTLiveChange: function (oEvent) {
        const sGSTIN = oEvent.getSource().getValue();
        const oInput = oEvent.getSource();
        const regexGSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (sGSTIN && !regexGSTIN.test(sGSTIN)) {
          oInput.setValueState(sap.ui.core.ValueState.Error);
          oInput.setValueStateText("GST number should be in proper format (Eg:22AAAAA0000A1Z5)");
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
        }
      },
      HQD_onDiscountInfoPress: function (oEvent) {
        if (!this._oPopover) {
          this._oPopover = new sap.m.Popover({
            contentWidth: "400px",
            contentHeight: "auto",
            showHeader: false,
            placement: sap.m.PlacementType.Bottom,
            content: [
              new sap.m.VBox({
                alignItems: "Center",
                justifyContent: "Center",
                width: "100%",
                items: [
                  new sap.m.Text({
                    text: this.i18nModel.getText("discountInfoText"),
                    wrapping: true
                  })
                ]
              }).addStyleClass("customPopoverContent")
            ]
          });
          this.getView().addDependent(this._oPopover);
        }
        this._oPopover.openBy(oEvent.getSource());
      },
      HQD_onPressSubmit: async function () {
        const oView = this.getView();
        var that = this
        // Validate RichTextEditor content
        const oRichTextEditor = this.byId("HQD_id_Notes");
        const oNotesHTML = oRichTextEditor?._oEditor?.editorManager?.activeEditor?.getContent({ format: 'html' }) || "";

        const oCurrency1 = this.byId("HQD_id_Curency").getSelectedKey();

        const isINR = oCurrency1 === "INR";
        oView.getModel("QuotationModel").getData()
        const MainModel = that.getView().getModel("SingleCompanyModel");
        // Perform other validations
        const bIsValid =
          utils._LCvalidateDate(this.byId("HQD_id_Quotation"), "ID") &&
          utils._LCvalidateDate(this.byId("HQD_id_QuotationValid"), "ID") &&
          utils._LCstrictValidationComboBox(this.byId("HQD_id_Country"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyName"), "ID") &&
          utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCompanyMobileNo"), "ID") &&
          utils._LCvalidateEmail(this.byId("HQD_id_CompanyEmailID"), "ID") &&
          (!isINR || utils._LCvalidateGstNumber(this.byId("HQD_id_CompGSTNO"), "ID")) &&
          utils._LCstrictValidationComboBox(this.byId("HQD_id_Curency"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyAddress"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_CustomerName"), "ID") &&
          utils._LCvalidateEmail(this.byId("HQD_id_CustomerEmailID"), "ID") &&
          utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCustomerMobileNo"), "ID") && utils._LCstrictValidationComboBox(this.byId("HQD_id_CustomerNumberSTD"), "ID") && utils._LCstrictValidationComboBox(this.byId("HQD_id_mobileNumber"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCustomerAddress"), "ID") &&
          (!isINR || utils._LCvalidateMandatoryField(this.byId("HQD_id_Percentage"), "ID"));

        if (!bIsValid) {
          MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          return;
        }
        // Additional Customer GST validation based on valueState
        const oCustomerGSTInput = this.byId("HQD_id_InputCustomerGSTNO");
        if (oCustomerGSTInput.getValue() && oCustomerGSTInput.getValueState() !== sap.ui.core.ValueState.None) {
          MessageToast.show(this.i18nModel.getText("customerGStmsg"));
          return;
        }
        // Get values from QuotationModel
        const oQuotationModel = oView.getModel("QuotationModel");
        const oQuotationData = oQuotationModel.getData();

        // Validate all item descriptions are filled
        const aItemArray1 = oQuotationModel.getProperty("/QuotationItemModel") || [];
        if (aItemArray1.length === 0) {
          MessageToast.show(this.i18nModel.getText("companyTableValidation"));
          return false;
        }
        for (let i = 0; i < aItemArray1.length; i++) {
          const item = aItemArray1[i];
          if (!item.Description || !item.UnitPrice) {
            sap.m.MessageBox.error(`Please fill all mandatory fields (Description, UnitPrice) in item row ${i + 1}`);
            return false;
          }
        }

        const bOptionalValid = !!this.UnitAmount;
        if (!bOptionalValid) {
                return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
        }

        const tmpDiv = document.createElement("div");
        tmpDiv.innerHTML = oNotesHTML;
        if (!tmpDiv.textContent.trim()) {
          MessageToast.show(this.i18nModel.getText("quotaionNotemsg"));
          return;
        }

        // Validate ValueState of Days, UnitPrice, and Discount fields in table
        // const oTable = this.byId("HQD_id_SmartTableQuotationItem"); // Replace with your actual table ID
        // const aItems = oTable.getItems();

        // for (let i = 0; i < aItems.length; i++) {
        //   const oItem = aItems[i];
        //   const aCells = oItem.getCells();

        //   // Access actual input controls (even if wrapped inside layout containers)
        //   const oDaysInput = aCells[1].getContent ? aCells[1].getContent()[0] : aCells[1];
        //   const oUnitPriceInput = aCells[2].getContent ? aCells[2].getContent()[0] : aCells[2];
        //   const oDiscountInput = aCells[3].getContent ? aCells[3].getContent()[0] : aCells[3];

        //   // Check if inputs are valid UI5 Input fields and check value state
        //   if (
        //     oDaysInput instanceof sap.m.Input && oDaysInput.getValueState() !== sap.ui.core.ValueState.None ||
        //     oUnitPriceInput instanceof sap.m.Input && oUnitPriceInput.getValueState() !== sap.ui.core.ValueState.None ||
        //     oDiscountInput instanceof sap.m.Input && oDiscountInput.getValueState() !== sap.ui.core.ValueState.None
        //   ) {
        //     MessageToast.show(`Please correct errors in item row ${i + 1} before submission.`);
        //     return;
        //   }
        // }


        // Format dates
        const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
        const sQuotationDate = oDateFormat.format(this.byId("HQD_id_Quotation").getDateValue());
        const sValidUntilDate = oDateFormat.format(this.byId("HQD_id_QuotationValid").getDateValue());

        const oCurrency = this.byId("HQD_id_Curency").getSelectedKey();

        const data = {
          Date: sQuotationDate,
          ValidUntil: sValidUntilDate,
          CompanyName: this.byId("HQD_id_InputCompanyName").getValue(),
          CompanyMobileNo: this.byId("HQD_id_InputCompanyMobileNo").getValue(),
          CompanyEmailID: this.byId("HQD_id_CompanyEmailID").getValue(),
          Country: this.byId("HQD_id_Country").getSelectedKey(),
          Branch: this.byId("HQD_id_BranchCode").getSelectedKey(),
          CustomerSTDCode: this.byId("HQD_id_CustomerNumberSTD").getValue(),
          CompanyAddress: this.byId("HQD_id_InputCompanyAddress").getValue(),
          CompanyGSTNO: this.byId("HQD_id_CompGSTNO").getValue(),
          Percentage: this.byId("HQD_id_Percentage").getValue(),
          Currency: oCurrency,
          CustomerName: this.byId("HQD_id_CustomerName").getValue(),
          CustomerEmailID: this.byId("HQD_id_CustomerEmailID").getValue(),
          CustomerMobileNo: this.byId("HQD_id_InputCustomerMobileNo").getValue(),
          CustomerAddress: this.byId("HQD_id_InputCustomerAddress").getValue(),
          CustomerGSTNO: this.byId("HQD_id_InputCustomerGSTNO").getValue(),
          Notes: oNotesHTML,
          STDCode: this.byId("HQD_id_mobileNumber").getValue(),

          SubTotalNotGST: oQuotationData.SubTotalNotGST || "0.00",
          SubTotal: oQuotationData.SubTotal || "0.00",
          CGST: oQuotationData.CGST || "0.00",
          SGST: oQuotationData.SGST || "0.00",
          IGST: oQuotationData.IGST || "0.00",
          TotalSum: oQuotationData.TotalSum || "0.00"
        };
        // Extract table items
        const oModel = oView.getModel("QuotationModel");
        const aItemArray = oModel.getProperty("/QuotationItemModel") || [];

        const Items = aItemArray.map((item) => ({
          SAC: item.SAC || "",
          Days: item.Days || "",
          UnitPrice: item.UnitPrice || "",
          Total: item.Total || "0.00",
          Currency: item.Currency || oCurrency,
          Description: item.Description || "",
          GSTCalculation: item.GSTCalculation || "Yes",
          Discount: item.Discount || "0.00"
        }));

        const payload = {
          data,
          Items
        };
        this.getBusyDialog();
        try {
          const response = await this.ajaxCreateWithJQuery("Quotation", payload);

          this.closeBusyDialog();

          if (response.success === true) {
            oView.getModel("SingleCompanyModel").setProperty("/QuotationNo", response.QuotationNo);
            oView.getModel("SingleCompanyModel").setProperty("/TotalSum", data.TotalSum);
            MainModel.setProperty("/Date", sQuotationDate);
            MainModel.setProperty("/ValidUntil", sValidUntilDate);
            // Force model updates before generating PDF
            oView.getModel("SingleCompanyModel").updateBindings(true);
            oView.getModel("QuotationModel").updateBindings(true);

            var oDialog = new sap.m.Dialog({
              title: this.i18nModel.getText("success"),
              type: sap.m.DialogType.Message,
              state: sap.ui.core.ValueState.Success,
              content: new sap.m.Text({
                text: this.i18nModel.getText("quotaionmsg")
              }),
              beginButton: new sap.m.Button({
                text: "OK",
                type: "Accept",
                press: function () {
                  oDialog.close();
                  that.resetHQDForm();
                  that.getRouter().navTo("RouteHrQuotation");
                }
              }),
              endButton: new sap.m.Button({
                text: "Generate PDF",
                type: "Attention",
                press: function () {
                  oDialog.close();
                  // Use setTimeout to ensure UI updates complete
                  setTimeout(function () {
                    that.HQD_onPressMerge().then(function () {
                      that.resetHQDForm();
                      that.getRouter().navTo("RouteHrQuotation");
                    });
                  }, 100);
                }
              }),
              afterClose: function () {
                oDialog.destroy();
              }
            });
            oDialog.open();

          } else {
            MessageToast.show(this.i18nModel.getText("quotaioncreateError"));
          }
        } catch (error) {
          this.closeBusyDialog();
          MessageToast.show(this.i18nModel.getText("quotaioncreateError2"));
        }
      },
      HQD_onPressMerge: async function () {
        const oView = this.getView();
        // Force model bindings to update so latest data is reflected
        oView.getModel("SingleCompanyModel").updateBindings(true);
        oView.getModel("QuotationModel").updateBindings(true);

        // Now safely read the latest data
        const oCompanyDetailsModel = oView.getModel("CompanyCodeDetailsModel").getProperty("/0");
        const oData = oView.getModel("SingleCompanyModel").getData();
        const oQuotaionItem = oView.getModel("QuotationModel").getData();
        const aItems = oView.getModel("QuotationModel").getProperty("/QuotationItemModel") || [];

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        });

        let y = 10; // Starting Y position
        const pageHeight = doc.internal.pageSize.getHeight();
        // Logo
        const imgblob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
        const img = await this._convertBLOBToImage(imgblob);
        doc.addImage(img, "PNG", 13, y, 45, 45);
        y += 50;

        // Header Title
        doc.setFontSize(25);
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("quotation"), 158, 40);

        // Company Info
        doc.setFontSize(12);
        doc.setFont("times", "bold");
        doc.text(oData.CompanyName, 13, y);
        y += 5;
        doc.setFont("times", "normal");
        const splitAddress1 = doc.splitTextToSize(oData.CompanyAddress || "", 80);
        doc.text(splitAddress1, 13, y);
        y += splitAddress1.length * 5; // estimate 5mm per line        //  Adjust Y for mobile number
        doc.text(this.i18nModel.getText("pdfmobile") + oData.STDCode + " " + oData.CompanyMobileNo, 13, y);
        y += 5;
        doc.text(this.i18nModel.getText("pdfemail") + " " + oData.CompanyEmailID, 13, y);
        y += 5;
        if (oData.CompanyGSTNO) {
          const oCompanygst = this.i18nModel.getText("pdfCustomerGst") + " " + oData.CompanyGSTNO;
          doc.text(oCompanygst, 13, y);
        }
        y += 10;

        // Quotation Metas
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("pdfquotationNo"), 168, y - 36, { align: "right" });
        doc.text(this.i18nModel.getText("pdfDate"), 168, y - 31, { align: "right" });
        doc.text(this.i18nModel.getText("pdfValiduntil"), 168, y - 26, { align: "right" });

        doc.setFont("times", "normal");
        doc.text(oData.QuotationNo, 169, y - 36);
        doc.text(Formatter.formatDate(oData.Date), 169, y - 31);
        doc.text(Formatter.formatDate(oData.ValidUntil), 169, y - 26);

        // Customer Info
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("pdfto"), 13, y);
        y += 5;
        doc.text(oData.CustomerName, 13, y);
        y += 5;
        doc.setFont("times", "normal");

        //  Properly wrap address and calculate height
        const splitAddress = doc.splitTextToSize(oData.CustomerAddress || "", 80);
        doc.text(splitAddress, 13, y);
        y += splitAddress.length * 5; // estimate 5mm per line        //  Adjust Y for mobile number
        const customerMobileText = this.i18nModel.getText("pdfmobile") + oData.STDCode + " " + oData.CustomerMobileNo;
        doc.text(customerMobileText, 13, y);
        y += 5;
        //  Adjust Y for email
        const customerEmailText = this.i18nModel.getText("pdfemail") + " " + oData.CustomerEmailID;
        doc.text(customerEmailText, 13, y);
        y += 5;
        if (oData.CustomerGSTNO) {
          const customerGSTNo = this.i18nModel.getText("pdfCustomerGst") + oData.CustomerGSTNO;
          doc.text(customerGSTNo, 13, y);
          y += 5; // only add space if GSTIN exists
        }
        y += 5; // space before the next section

        // Build table body dynamically
        const body = aItems.map((item, index) => {
          const formattedDiscount = item.Discount
            ? Formatter.fromatNumber(item.Discount)
            : "0.00";

          return [
            index + 1,
            item.Description,
            item.Days,
            Formatter.fromatNumber(item.UnitPrice),
            formattedDiscount,
            item.GSTCalculation,
            Formatter.fromatNumber(item.Total)
          ]

        });
        // Build table head dynamically
        const head = [['Sl.No.', 'Description', 'Days', 'Unit Price', 'Discount', 'Tax', 'Total']]
        doc.autoTable({
          startY: y,
          head: head,
          body: body,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            font: "times",
            fontSize: 10
          },
          styles: {
            font: "times",
            fontSize: 10,
            cellPadding: 3,
            lineWidth: 0.5,
            lineColor: [30, 30, 30],
            halign: "center"
          },
          columnStyles:
          {
            0: { halign: 'center' }, // Sl.No.
            1: { halign: 'left' }, //Description
            2: { halign: 'center' }, //Days
            3: { halign: 'right' }, //Unit Price
            4: { halign: 'right' }, //Discount
            5: { halign: 'center' }, //Tax
            6: { halign: 'right' }  //Total
          },

        });
        y = doc.lastAutoTable.finalY;
        // Check for page overflow
        if (y + 40 > pageHeight) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("times", "bold");
        doc.setFontSize(12);

        const summaryBody = [];

        // SubTotal Without GST
        summaryBody.push([
          `${this.i18nModel.getText("subTotalNotGST")} (${oData.Currency})`,
          Formatter.fromatNumber(oQuotaionItem.SubTotalNotGST)
        ]);

        // SubTotal With GST
        summaryBody.push([
          `${this.i18nModel.getText("subTotalInGST")} (${oData.Currency})`,
          Formatter.fromatNumber(oQuotaionItem.SubTotal)
        ]);

        // GST Breakdown
        if (oData.Currency !== "USD") {
          const cgstValue = parseFloat(oQuotaionItem.CGST) || 0;
          const sgstValue = parseFloat(oQuotaionItem.SGST) || 0;
          const igstValue = parseFloat(oQuotaionItem.IGST) || 0;
          const percentage = oData.Percentage || 0;

          if (cgstValue > 0 || sgstValue > 0) {
            summaryBody.push([
              `CGST (${percentage}%)`,
              Formatter.fromatNumber(cgstValue.toFixed(2))
            ]);
            summaryBody.push([
              `SGST (${percentage}%)`,
              Formatter.fromatNumber(sgstValue.toFixed(2))
            ]);
          } else if (igstValue > 0 && oData.Currency === "INR") {
            summaryBody.push([
              `IGST (${percentage}%)`,
              Formatter.fromatNumber(igstValue.toFixed(2))
            ]);
          }
        }

        summaryBody.push([
          `${this.i18nModel.getText("pdfTotal")} (${oData.Currency})`,
          Formatter.fromatNumber(oQuotaionItem.TotalSum)
        ]);
        // Add ":" to labels
        summaryBody.forEach(row => row[0] = `${row[0]} :`);
        doc.autoTable({
          startY: y,
          head: [],
          body: summaryBody,
          theme: 'plain',
          styles: {
            font: "times",
            fontSize: 10,
            halign: "right",
            cellPadding: { top: 1, right: 3, bottom: 1, left: 3 }
          },
          columnStyles: {
            0: { halign: "right", cellWidth: 60 },
            1: { halign: "right", cellWidth: 40 }
          },
          margin: { left: 96 },
          didParseCell: function (data) {
            const lastRowIndex = summaryBody.length - 1;

            if (data.row.index === lastRowIndex) {
              data.cell.styles.lineWidth = { top: 0.5, right: 0, bottom: 0, left: 0 };
              data.cell.styles.lineColor = [0, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });

        // Update Y position
        y = doc.lastAutoTable.finalY + 5;
        // Amount in Words
        oData.AmountInWords = await this.convertNumberToWords(parseFloat(oQuotaionItem.TotalSum || 0), oData.Currency);
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("pdfaAmount"), 13, y);
        y += 5;
        doc.setFont("times", "normal");
        const amountHeight = doc.getTextDimensions(oData.AmountInWords || "").h;
        doc.text(oData.AmountInWords || "", 13, y, { maxWidth: 180 });
        y += amountHeight + 10;
        // Terms & Conditions with page break support
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("pdftermconditaion"), 13, y);
        y += 5;
        doc.setFont("times", "normal");
        const convertHtmlToTextLines = (html, maxWidth) => {
          const div = document.createElement("div");
          div.innerHTML = html;

          div.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
          div.querySelectorAll("p").forEach(p => p.appendChild(document.createTextNode("\n")));
          div.querySelectorAll("li").forEach(li => {
            const bullet = document.createTextNode(`• ${li.textContent}\n`);
            li.replaceWith(bullet);
          });

          const text = div.innerText || div.textContent || "";
          return doc.splitTextToSize(text.trim(), maxWidth);
        };

        const htmlNotes = oData.Notes || "";
        const noteLines = convertHtmlToTextLines(htmlNotes, 180);


        const lineHeight = 5;
        const availableHeight = pageHeight - y;

        let linesPerPage = Math.floor(availableHeight / lineHeight);
        let currentLine = 0;

        while (currentLine < noteLines.length) {
          if (y + lineHeight > pageHeight) {
            doc.addPage();
            y = 20;
          }
          const remainingLines = noteLines.length - currentLine;
          const linesToWrite = Math.min(linesPerPage, remainingLines);
          const linesChunk = noteLines.slice(currentLine, currentLine + linesToWrite);
          doc.text(linesChunk, 13, y);
          y += linesChunk.length * lineHeight;
          currentLine += linesToWrite;
          // Reset linesPerPage for next page if needed
          linesPerPage = Math.floor((pageHeight - 20) / lineHeight);
        }
        // Save PDF
        doc.save(`${oData.CustomerName}_Quotation.pdf`);
      },
      HQD_onPressAddQuotationItem: function () {
        var oView = this.getView();
        var oQuotationModel = oView.getModel("QuotationModel");
        var oVisibilityModel = oView.getModel("visiablityPlay");
        var aItems = oQuotationModel.getProperty("/QuotationItemModel") || [];
        var bEditMode = oVisibilityModel.getProperty("/editable");

        // Get currency from SingleCompanyModel
        var sCurrency = this.getView().getModel("SingleCompanyModel").getProperty("/Currency");
        var bIsINR = sCurrency === "INR";

        var oNewItem = {
          Description: "",
          SAC: "",
          // Set GSTCalculation based on currency
          GSTCalculation: bIsINR ? "Yes" : "No",
          Days: "",
          UnitPrice: "",
          Discount: "",
          Total: "0.00"
        };

        if (!bIsINR) {
          oNewItem.SAC = "-"; // Set SAC to "-" for non-INR currencies
        }

        if (bEditMode) {
          oNewItem.flag = "create";
        }

        aItems.push(oNewItem);
        oQuotationModel.setProperty("/QuotationItemModel", aItems);
        this.updateTotalAmount();
      },
      HQD_onInputChange: function (oEvent) {

        this.UnitAmount = utils._LCvalidateAmount(oEvent);
        var oBindingContext = oEvent.getSource().getBindingContext("QuotationModel");
        var oItemContext = oBindingContext.getObject();

        var days = parseFloat(oItemContext.Days) || 0;
        var unit = parseFloat(oItemContext.UnitPrice) || 0;
        var discount = parseFloat(oItemContext.Discount) || 0;

        var iTotal = days ? days * unit : unit;
        iTotal = iTotal - discount;

        oBindingContext.getModel().setProperty(oBindingContext.getPath() + "/Total", isNaN(iTotal) ? 0 : parseFloat(iTotal.toFixed(2)));
        this.updateTotalAmount();
      },

      HQD_onchangeDiscount: function (oEvent) {
        var oInput = oEvent.getSource();
        var sUserInput = oEvent.getParameter("value").trim();

        // Get binding context
        var oContext = oInput.getBindingContext("QuotationModel");
        if (!oContext) return;

        var oModel = oContext.getModel();
        var sPath = oContext.getPath();
        var oItem = oModel.getProperty(sPath);

        // Get UnitPrice and Days
        var unitPrice = parseFloat(oItem.UnitPrice || 0);
        var days = parseFloat(oItem.Days || 0);
        var itemTotal = days > 0 ? unitPrice * days : unitPrice;

        // Initialize discount
        var finalDiscount = 0;

        // Check if % entered
        var isPercentage = sUserInput.includes("%");

        // Extract number
        var sCleanValue = sUserInput.replace(/[^0-9.]/g, "");

        // Validate input
        var regex = /^[0-9]+(\.[0-9]{1,2})?$/;
        if (!sCleanValue || !regex.test(sCleanValue)) {
          oInput.setValueState("Error");
          oInput.setValueStateText(this.i18nModel.getText("discountValueText"));
          this.Discount = false;
          return;
        }

        // Parse cleaned value
        var parsedDiscount = parseFloat(sCleanValue);
        if (isPercentage) {
          finalDiscount = (parsedDiscount / 100) * itemTotal;
        } else {
          finalDiscount = parsedDiscount;
        }

        // Prevent over-discount
        if (finalDiscount > itemTotal) {
          finalDiscount = itemTotal;
        }
        // Set final values to model  
        oModel.setProperty(sPath + "/Discount", finalDiscount); // Store as absolute value
        oModel.setProperty(sPath + "/IsDiscountPercentage", false); // Already converted to absolute value
        if (isPercentage) {
          oInput.setValue(parsedDiscount.toFixed(2) + "%");
        } else {
          oInput.setValue(finalDiscount.toFixed(2));
        }

        // Update input with actual discount value (not percentage)
        oInput.setValue(finalDiscount);
        oInput.setValueState("None");
        oInput.setValueStateText("");
        this.Discount = true;
        this.updateTotalAmount();
      },

      HQD_onPressDelete: async function (oEvent) {
        const that = this;

        try {
          const oListItem = oEvent.getParameter("listItem");
          const oContext = oListItem.getBindingContext("QuotationModel");

          if (!oContext) throw new Error("Binding context not found for selected row.");

          const oItemData = oContext.getObject();
          const sPath = oContext.getPath();

          // Check if this is a newly created item (not yet saved to DB)
          const isNewItem = !(oItemData && oItemData.SlNo);

          if (isNewItem) {
            // Directly delete for new items
            const oModel = that.getView().getModel("QuotationModel");
            const aItems = oModel.getProperty("/QuotationItemModel");
            const iIndex = parseInt(sPath.split("/").pop(), 10);
            aItems.splice(iIndex, 1);
            oModel.setProperty("/QuotationItemModel", aItems);
            that.updateTotalAmount();
            return;
          }

          // For existing items, show confirmation dialog
          const confirmed = await new Promise((resolve) => {
            that.showConfirmationDialog(
              that.i18nModel.getText("msgBoxConfirm"),
              that.i18nModel.getText("msgBoxConfirmDelete"),
              () => resolve(true),
              () => resolve(false)
            );
          });

          if (!confirmed) {
            return;
          }

          // Delete existing item from backend
          const sQuotationNo = that.getView().getModel("SingleCompanyModel").getProperty("/QuotationNo");
          if (!sQuotationNo) {
            throw new Error("Quotation number is missing.");
          }

          this.getBusyDialog();
          await that.ajaxDeleteWithJQuery("/QuotationItem", {
            filters: {
              QuotationNo: sQuotationNo,
              SlNo: oItemData.SlNo
            }
          });

          // Remove from local model
          const oModel = that.getView().getModel("QuotationModel");
          const aItems = oModel.getProperty("/QuotationItemModel");
          const iIndex = parseInt(sPath.split("/").pop(), 10);
          aItems.splice(iIndex, 1);
          oModel.setProperty("/QuotationItemModel", aItems);

          that.updateTotalAmount();
          MessageToast.show(that.i18nModel.getText("msgQuotationitemdelete"));
        } catch (error) {
          MessageToast.show(error.message || "Error deleting Quotation item");
        } finally {
          this.closeBusyDialog();
        }
      },

      EOD_commonOpenDialog: function (fragmentName) {
        if (!this.EOU_oDialogMail) {
          sap.ui.core.Fragment.load({
            name: fragmentName,
            controller: this,
          }).then(function (EOU_oDialogMail) {
            this.EOU_oDialogMail = EOU_oDialogMail;
            this.getView().addDependent(this.EOU_oDialogMail);
            this.EOU_oDialogMail.open();
          }.bind(this));
        } else {
          this.EOU_oDialogMail.open();
        }
      },
      HQD_onPressSendEmail: function () {
        var oEmployeeEmail = this.getView().getModel("SingleCompanyModel").getData().CustomerEmailID;
        if (!oEmployeeEmail || oEmployeeEmail.length === 0) {
          MessageBox.error("To Email is missing");
          return;
        }
        var oUploaderDataModel = new JSONModel({
          isEmailValid: true,
          ToEmail: oEmployeeEmail,
          CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
          name: "",
          mimeType: "",
          content: "",
          isFileUploaded: false,
          button: false
        });
        this.getView().setModel(oUploaderDataModel, "UploaderData");
        this.EOD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
        this.validateSendButton();
      },
      Mail_onPressClose: function () {
        this.EOU_oDialogMail.destroy();
        this.EOU_oDialogMail = null;
      },
      Mail_onUpload: function (oEvent) {
        this.handleFileUpload(
          oEvent,
          this,                      // context
          "UploaderData",            // model name
          "/attachments",            // path to attachment array
          "/name",                   // path to comma-separated file names
          "/isFileUploaded",         // boolean flag path
          "uploadSuccessfull",       // i18n success key
          "fileAlreadyUploaded",     // i18n duplicate key
          "noFileSelected",          // i18n no file selected
          "fileReadError",           // i18n file read error
          () => this.validateSendButton()
        );
      },
      Mail_onEmailChange: function () {
        this.validateSendButton();
      },
      validateSendButton: function () {
        const sendBtn = sap.ui.getCore().byId("SendMail_Button");
        const emailField = sap.ui.getCore().byId("CCMail_TextArea");
        const uploaderModel = this.getView().getModel("UploaderData");
        if (!sendBtn || !emailField || !uploaderModel) {
          return;
        }
        const isEmailValid = utils._LCvalidateEmail(emailField, "ID") === true;
        const isFileUploaded = uploaderModel.getProperty("/isFileUploaded") === true;

        sendBtn.setEnabled(isEmailValid && isFileUploaded);
      },
      Mail_onSendEmail: function () {
        try {
          var oModel = this.getView().getModel("SingleCompanyModel").getData();
          var oquotationitem = this.getView().getModel("QuotationModel").getData();

          // Format date to DD/MM/YYYY
          var oDate = new Date(oModel.Date); // Ensure it's a Date object
          var sFormattedDate = [
            ("0" + oDate.getDate()).slice(-2),
            ("0" + (oDate.getMonth() + 1)).slice(-2),
            oDate.getFullYear()
          ].join("/");
          var aAttachments = this.getView().getModel("UploaderData").getData().attachments;
          if (!aAttachments || aAttachments.length === 0) {
            MessageToast.show(this.i18nModel.getText("attachmentRequired"));
            return;
          }
          var oPayload = {
            "CustomerName": oModel.CustomerName,
            "CustomerEmailID": oModel.CustomerEmailID,
            "QuotationNo": oModel.QuotationNo,
            "Date": sFormattedDate,
            "TotalSum": (`${Formatter.fromatNumber(oquotationitem.TotalSum)} ${oModel.Currency}`),
            "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
            "attachments": this.getView().getModel("UploaderData").getProperty("/attachments")
          };

          this.getBusyDialog();
          this.ajaxCreateWithJQuery("QuotationSendEmail", oPayload).then((oData) => {
            MessageToast.show(this.i18nModel.getText("emailSuccess"));
            this.closeBusyDialog();
          }).catch((error) => {
            this.closeBusyDialog();
            MessageToast.show(error.responseText);
          });
          this.Mail_onPressClose();
        } catch (error) {
          this.closeBusyDialog();
          MessageToast.show(error.responseText);
        }
      },

      resetHQDForm: function () {
        const fields = [
          "HQD_id_QuotationValid", "HQD_id_InputCompanyName", "HQD_id_InputCompanyMobileNo",
          "HQD_id_CompanyEmailID", "HQD_id_Country", "HQD_id_InputCompanyAddress", "HQD_id_CompGSTNO",
          "HQD_id_Percentage", "HQD_id_Curency", "HQD_id_CustomerName", "HQD_id_CustomerEmailID",
          "HQD_id_InputCustomerMobileNo", "HQD_id_InputCustomerAddress", "HQD_id_InputCustomerGSTNO", "HQD_id_mobileNumber", "HQD_id_CustomerNumberSTD", "HQD_id_BranchCode", "HQD_id_UnitPriceInput", "HQD_id_DiscountInput", "HQD_id_DaysInput"
        ];

        fields.forEach(id => {
          const oControl = this.byId(id);
          if (oControl?.setValue) oControl.setValue("");
          if (oControl?.setSelectedKey) oControl.setSelectedKey("");
          if (oControl?.setDateValue) oControl.setDateValue(null);

          if (oControl.setValueState) oControl.setValueState("None");
          if (oControl.setValueStateText) oControl.setValueStateText("");

        });
        // Clear rich text editor
        this.byId("HQD_id_Notes")._oEditor?.editorManager?.activeEditor.setContent("");
        const oModel = this.getView().getModel("QuotationModel");

        //Clear calculation-related fields
        oModel.setProperty("/QuotationItemModel", []); oModel.setProperty("/SubTotal", ""); oModel.setProperty("/SubTotalNotGST", ""); oModel.setProperty("/CGST", ""); oModel.setProperty("/SGST", ""); oModel.setProperty("/IGST", ""); oModel.setProperty("/TotalSum", ""); oModel.setProperty("/CGSTVisible", false); oModel.setProperty("/SGSTVisible", false); oModel.setProperty("/IGSTVisible", false);
        // Also reset relevant fields in SingleCompanyModel
        const oSingleModel = this.getView().getModel("SingleCompanyModel");
        oSingleModel.setProperty("/Percentage", "");
        oSingleModel.setProperty("/Currency", "");
      },

      HQD_onChangeGSTCalculation: function (oEvent) {
        var oSource = oEvent.getSource(); // The ComboBox that was changed
        var sSelectedKey = oSource.getSelectedKey();
        var oContext = oSource.getBindingContext("QuotationModel");

        if (!oContext) return;

        var sPath = oContext.getPath(); //  /QuotationItemModel/0
        var oQuotationModel = oContext.getModel();

        // Update GSTCalculation
        oQuotationModel.setProperty(sPath + "/GSTCalculation", sSelectedKey);

        // Get SACModel data
        var oSACModel = this.getView().getModel("InvoiceSAC");
        var aSACList = oSACModel ? oSACModel.getData() : [];

        // Apply logic based on selection
        if (sSelectedKey === "Yes") {
          // Set SAC to first ID's sac (ensure it exists)
          if (aSACList && aSACList.length > 1 && aSACList[1].SAC) {
            oQuotationModel.setProperty(sPath + "/SAC", aSACList[1].SAC);
          } else {
            oQuotationModel.setProperty(sPath + "/SAC", "-");
          }
        } else {
          // Set SAC to second ID's sac (ensure it exists)
          if (aSACList && aSACList.length > 2 && aSACList[2].SAC) {
            oQuotationModel.setProperty(sPath + "/SAC", aSACList[2].SAC);
          } else {
            oQuotationModel.setProperty(sPath + "/SAC", "-");
          }
        }

        // Optionally update global GSTCalculation
        oQuotationModel.setProperty("/GSTCalculation", sSelectedKey);
        this.updateTotalAmount();
      },

      onPercentageChange: function (oEvent) {
        var sPercentage = oEvent.getParameter("value");
        var oModel = this.getView().getModel("SingleCompanyModel");

        // Update the entered percentage in the model
        oModel.setProperty("/Percentage", sPercentage);

        this.updateTotalAmount();
      },
      HQD_onPressEdit: async function () {
        const oView = this.getView();
        const oModel = oView.getModel("visiablityPlay");
        const oRadiobtn = oView.getModel("SingleCompanyModel");
        const oQuotationModel = oView.getModel("QuotationModel");
        const oQuotationData = oQuotationModel.getData();

        const bEditable = oModel.getProperty("/editable");

        if (!bEditable) {
          oModel.setProperty("/editable", true);
          oModel.setProperty("/merge", false);
          oRadiobtn.setProperty("/gstEditable", true);
          const oCurrency = this.byId("HQD_id_Curency").getSelectedKey();
          const isINR = oCurrency === "INR";
          if (!isINR) {
            oRadiobtn.setProperty("/gstEditable", false);
            this.byId("HQD_id_Percentage").setEditable(false);

            // Optionally hide/show tax fields as needed
            const oQuotationModel = oView.getModel("QuotationModel");
            oQuotationModel.setProperty("/CGSTVisible", false);
            oQuotationModel.setProperty("/SGSTVisible", false);
            oQuotationModel.setProperty("/IGSTVisible", false);
          } else {
            // Percentage field for INR case
            this.byId("HQD_id_Percentage").setEditable(true);
          }

        } else {
          // Already in edit mode  perform Save logic
          const oRichTextEditor = this.byId("HQD_id_Notes");
          const oNotesHTML = oRichTextEditor?._oEditor?.editorManager?.activeEditor?.getContent({ format: 'html' }) || "";

          const oCurrency1 = this.byId("HQD_id_Curency").getSelectedKey();
          const isINR = oCurrency1 === "INR";

          const bIsValid =
            utils._LCvalidateDate(this.byId("HQD_id_Quotation"), "ID") &&
            utils._LCvalidateDate(this.byId("HQD_id_QuotationValid"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyName"), "ID") &&
            utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCompanyMobileNo"), "ID") &&
            utils._LCvalidateEmail(this.byId("HQD_id_CompanyEmailID"), "ID") &&
            utils._LCstrictValidationComboBox(this.byId("HQD_id_Country"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyAddress"), "ID") &&
            (!isINR || utils._LCvalidateGstNumber(this.byId("HQD_id_CompGSTNO"), "ID")) &&
            utils._LCstrictValidationComboBox(this.byId("HQD_id_Curency"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_CustomerName"), "ID") && utils._LCstrictValidationComboBox(this.byId("HQD_id_CustomerNumberSTD"), "ID") &&
            utils._LCvalidateEmail(this.byId("HQD_id_CustomerEmailID"), "ID") &&
            utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCustomerMobileNo"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCustomerAddress"), "ID") &&
            (!isINR || utils._LCvalidateMandatoryField(this.byId("HQD_id_Percentage"), "ID"));
          if (!bIsValid) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }

          const fTotalSum = parseFloat(oQuotationData.TotalSum || "0");
          if (isNaN(fTotalSum) || fTotalSum <= 0) {
            MessageToast.show(this.i18nModel.getText("quotaionTotalmsg"));
            return;
          }

          const bOptionalValid = !!this.UnitAmount;
          if (!bOptionalValid) {
                return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
          }

          const tmpDiv = document.createElement("div");
          tmpDiv.innerHTML = oNotesHTML;
          if (!tmpDiv.textContent.trim()) {
            MessageToast.show("Notes field is required.");
            return;
          }

          const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
          const sQuotationDate = oDateFormat.format(this.byId("HQD_id_Quotation").getDateValue());
          const sValidUntilDate = oDateFormat.format(this.byId("HQD_id_QuotationValid").getDateValue());

          const oSingleModel = oView.getModel("SingleCompanyModel");
          const oQuotationItem = oView.getModel("QuotationModel");
          const sQuotationNo = oSingleModel.getProperty("/QuotationNo");

          const data = {
            CompanyName: this.byId("HQD_id_InputCompanyName").getValue(),
            CompanyAddress: this.byId("HQD_id_InputCompanyAddress").getValue(),
            Date: sQuotationDate,
            ValidUntil: sValidUntilDate,
            Country: this.byId("HQD_id_Country").getSelectedKey(),
            Branch: this.byId("HQD_id_BranchCode").getSelectedKey(),
            CompanyGSTNO: this.byId("HQD_id_CompGSTNO").getValue(),
            CompanyMobileNo: this.byId("HQD_id_InputCompanyMobileNo").getValue(),
            CustomerSTDCode: this.byId("HQD_id_CustomerNumberSTD").getValue(),
            CompanyEmailID: this.byId("HQD_id_CompanyEmailID").getValue(),
            CustomerName: this.byId("HQD_id_CustomerName").getValue(),
            CustomerAddress: this.byId("HQD_id_InputCustomerAddress").getValue(),
            CustomerMobileNo: this.byId("HQD_id_InputCustomerMobileNo").getValue(),
            CustomerGSTNO: this.byId("HQD_id_InputCustomerGSTNO").getValue(),
            CustomerEmailID: this.byId("HQD_id_CustomerEmailID").getValue(),
            Currency: this.byId("HQD_id_Curency").getSelectedKey(),
            Percentage: this.byId("HQD_id_Percentage").getValue(),
            Notes: oNotesHTML,
            CGST: oQuotationItem.getProperty("/CGST"),
            SGST: oQuotationItem.getProperty("/SGST"),
            IGST: oQuotationItem.getProperty("/IGST"),
            SubTotal: oQuotationItem.getProperty("/SubTotal"),
            SubTotalNotGST: oQuotationItem.getProperty("/SubTotalNotGST"),
            TotalSum: oQuotationItem.getProperty("/TotalSum"),
          };

          const filtres = {
            QuotationNo: sQuotationNo
          };
          const aItemArray2 = oView.getModel("QuotationModel").getProperty("/QuotationItemModel") || [];
          if (aItemArray2.length === 0) {
            MessageToast.show(this.i18nModel.getText("companyTableValidation"));
            return false;
          }
          for (let i = 0; i < aItemArray2.length; i++) {
            const item = aItemArray2[i];
            if (!item.Description || !item.UnitPrice) {
              sap.m.MessageBox.error(`Please fill all mandatory fields (Description, UnitPrice) in item row ${i + 1}`);
              return false;
            }
          }
          const Items = aItemArray2.map((item) => {
            const oFilters = {
              QuotationNo: sQuotationNo,
              SlNo: item.SlNo || ""
            };

            // Include flag if it's a new item
            if (item.flag === "create") {
              oFilters.flag = "create";
            }

            return {
              data: {
                QuotationNo: sQuotationNo,
                SAC: item.SAC || "",
                Days: item.Days || 0,
                UnitPrice: item.UnitPrice || 0,
                Total: item.Total || "0.00",
                Currency: item.Currency || data.Currency,
                Description: item.Description || "",
                GSTCalculation: item.GSTCalculation || "Yes",
                Discount: item.Discount || "0.00"
              },
              filters: oFilters
            };
          });
          const payload = {
            data,
            filtres,
            Items
          };
          this.getBusyDialog();
          try {
            const response = await this.ajaxUpdateWithJQuery("Quotation", payload);
            this.closeBusyDialog();
            if (response.success === true) {
              oView.byId("HQD_id_DaysInput").setValueState(sap.ui.core.ValueState.None);
              oView.byId("HQD_id_UnitPriceInput").setValueState(sap.ui.core.ValueState.None);
              oView.byId("HQD_id_DiscountInput").setValueState(sap.ui.core.ValueState.None);
              MessageToast.show(`Quotation updated successfully!`);
              oModel.setProperty("/editable", false); // Exit edit mode
              oModel.setProperty("/merge", true); // Exit edit mode
              oRadiobtn.setProperty("/gstEditable", false);
            } else {
              MessageToast.show(this.i18nModel.getText("quotaionUpdatefail"));
            }
          } catch (error) {
            this.closeBusyDialog();
            MessageToast.show(this.i18nModel.getText("quotaionUpdateErroeCatch"));

          }
        }
      }
    }
    )
  });