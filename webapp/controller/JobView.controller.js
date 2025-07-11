sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageToast", "sap/ui/core/Fragment"],
  (Controller, MessageToast, Fragment) => {
    ("use strict");
    return Controller.extend("sap.kt.com.minihrsolution.controller.JobView", {
      onInit: function () {
        this.getView().addStyleClass("sapUiSizeCompact");

        const oRouter = this.getOwnerComponent().getRouter();
        oRouter
          .getRoute("RouteJobView")
          .attachPatternMatched(this._onRouteMatched, this);

        const oI18nModel = this.getOwnerComponent().getModel("i18n");
        this.oResourceBundle = oI18nModel.getResourceBundle();

        const oCitiesModel = new sap.ui.model.json.JSONModel({ cities: [] });
        this.getView().setModel(oCitiesModel, "cities");

        this.tokenModel = new sap.ui.model.json.JSONModel({
          tokens: [],
        });
        this.getView().setModel(this.tokenModel, "tokenModel");

        this.getView().setModel(this.oFileModel);

        // Attach change handler to the native file input
        setTimeout(() => {
          const fileInput = document.getElementById("hiddenFileInput");
          if (fileInput) {
            fileInput.addEventListener(
              "change",
              this.onFilesSelected.bind(this)
            );
          }
        }, 0);
      },

      onFileChange: function (oEvent) {
        const oFile = oEvent.getParameter("files")[0];
        if (!oFile) {
          MessageToast.show("No file selected.");
          return;
        }
        const oModel = this.getView().getModel("tokenModel");
        let aTokens = oModel.getProperty("/tokens") || [];

        // Restrict to one file
        if (aTokens.length >= 1) {
          sap.m.MessageBox.error("Only one file uploaded");
          return;
        }

        const reader = new FileReader();
        const that = this;

        reader.onload = function (e) {
          const base64 = e.target.result.split(",")[1];
          const oUploadModel = that.getView().getModel("UploadModel");
          if (!oUploadModel) {
            that
              .getView()
              .setModel(new sap.ui.model.json.JSONModel(), "UploadModel");
          }
          that.getView().getModel("UploadModel").setData({
            File: base64,
            FileName: oFile.name,
            FileType: oFile.type,
          });
          aTokens.push({ key: oFile.name, text: oFile.name });
          oModel.setProperty("/tokens", aTokens);

          const fileErrorLayout = sap.ui.core.Fragment.byId(
            "jobFormFrag",
            "fileErrorLayout"
          );

          const fileErrorText = sap.ui.core.Fragment.byId(
            "jobFormFrag",
            "fileErrorText"
          );
          fileErrorText.setText("");
          fileErrorText.setVisible(false);
          fileErrorLayout.setVisible(false);

          MessageToast.show("File uploaded successfully: " + oFile.name);
        };

        reader.readAsDataURL(oFile);
      },

      onTokenDelete: function (oEvent) {
        // Get the model
        var oModel = this.getView().getModel("tokenModel");
        var aTokens = oModel.getProperty("/tokens") || [];

        // Get deleted tokens from event
        var aTokensToDelete = oEvent.getParameter("tokens");

        // Filter out deleted tokens
        aTokensToDelete.forEach(function (oDeletedToken) {
          var sKey = oDeletedToken.getKey();
          aTokens = aTokens.filter(function (token) {
            return token.key !== sKey;
          });
        });

        // Update model
        oModel.setProperty("/tokens", aTokens);

        // Clear upload model if all tokens are deleted
        if (aTokens.length === 0) {
          const uploadModel = this.getView().getModel("UploadModel");
          if (uploadModel) {
            uploadModel.setData({ File: "", FileName: "", FileType: "" });
          }

          const fileErrorText = sap.ui.core.Fragment.byId(
            "jobFormFrag",
            "fileErrorText"
          );
          const fileErrorLayout = sap.ui.core.Fragment.byId(
            "jobFormFrag",
            "fileErrorLayout"
          );

          if (fileErrorText) {
            fileErrorText.setText("Please upload your resume");
            fileErrorText.setVisible(true);
            fileErrorLayout.setVisible(true);
          }

          this.oSelectedFile = null;
        }
      },

      onFileSizeExceeds: function (oEvent) {
        const fileErrorText = sap.ui.core.Fragment.byId(
          "jobFormFrag",
          "fileErrorText"
        );
        const fileErrorLayout = sap.ui.core.Fragment.byId(
          "jobFormFrag",
          "fileErrorLayout"
        );
        fileErrorLayout.setVisible(true);
        fileErrorText.setVisible(true);
        fileErrorText.setText("File size must be under 5MB");
        // MessageToast.show("File size must be under 5MB");

        const fileUploader = oEvent.getSource();

        loader.setValueStateText("File too large");

        //  Clear fileUploader input
        fileUploader.setValue("");

        //  Clear UploadModel
        const uploadModel = this.getView().getModel("UploadModel");
        if (uploadModel) {
          uploadModel.setData({ File: "", FileName: "", FileType: "" });
        }

        //  Clear Tokenizer model
        const tokenizer = sap.ui.core.Fragment.byId("jobFormFrag", "id_tokenizer");
        const tokenModel = tokenizer.getModel("tokenModel");
        if (tokenModel) {
          tokenModel.setProperty("/tokens", []);
        }

        //  Clear stored file
        this.oSelectedFile = null;
      },

      _onRouteMatched: function () {
        const oView = this.getView();
        const oModel = this.getOwnerComponent().getModel("SelectedCandidate");

        if (!oModel) {
          const sMessage = this.oResourceBundle.getText("v2_m_notselectGoBk");
          MessageToast.show(sMessage);
          return;
        }

        oView.setModel(oModel, "SelectedCandidate");
        oView.bindElement({
          path: "/",
          model: "SelectedCandidate",
        });

        try {
          const fieldsToClean = [
            "/SecondarySkills",
            "/SkillRequirements",
            "/KeyResponsibilities",
            "/JobDescription",
          ];

          fieldsToClean.forEach((sPath) => {
            let sValue = oModel.getProperty(sPath);

            if (sValue && typeof sValue === "string") {
              if (!sValue.includes("<")) {
                const keywords = sValue
                  .split(",")
                  .map((s) => `<strong>${s.trim()}</strong>`)
                  .join(", ");
                sValue = `<p>${keywords}</p>`;
              }

              // Clean unsupported tags (like <mark>)
              if (this._cleanUnsupportedTags) {
                sValue = this._cleanUnsupportedTags(sValue);
              }

              oModel.setProperty(sPath, sValue);
              //  console.log(` Processed ${sPath}:`, sValue);
            } else {
              //  console.warn(` Skipped ${sPath} — Empty or invalid format`);
            }
          });
        } catch (e) {
          // console.warn(" Could not clean one or more fields from SelectedCandidate model.", e);
        }

        if (this._cleanFormattedTextStyles) {
          setTimeout(() => this._cleanFormattedTextStyles(), 300);
        }
      },

      onNavBack: function () {
        var oHistory = sap.ui.core.routing.History.getInstance();
        var sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          this.getOwnerComponent().getRouter().navTo("RouteHomePage", {}, true); // fallback
        }
      },

      anySkillPresent: function (primary, secondary, required) {
        return (
          (primary && primary.trim().length > 0) ||
          (secondary && secondary.trim().length > 0) ||
          (required && required.trim().length > 0)
        );
      },

      hasValue: function (val) {
        if (val === null || val === undefined) {
          return false;
        }

        if (typeof val === "string") {
          return val.trim().length > 0;
        }

        if (typeof val === "number") {
          return val !== 0; // e.g., 1 returns true, 0 returns false
        }

        return !!val; // fallback — converts to boolean
      },

      _cleanFormattedTextStyles: function () {
        const els = document.querySelectorAll(
          ".myFormattedText span, .myFormattedText li, .myFormattedText strong, .myFormattedText .highlight, .myFormattedText p"
        );
        els.forEach((el) => {
          el.removeAttribute("style");
          el.style.fontSize = "20px";
          el.style.lineHeight = "1.5";
          el.style.marginBottom = "1em";
          el.style.fontWeight = "bold";
          el.style.color = "#2c3e50";
        });
      },

      _cleanUnsupportedTags: function (html) {
        return html
          .replace(/<mark>/gi, '<span class="highlight">')
          .replace(/<\/mark>/gi, "</span>");
      },

      onApply: function () {
        const that = this;

        if (!this._oJobDialog) {
          Fragment.load({
            id: "jobFormFrag",
            name: "sap.kt.com.minihrsolution.fragment.JobApplication",
            controller: this,
          }).then(function (oDialog) {
            that._oJobDialog = oDialog; //  Save the actual Dialog after loading
            that.getView().addDependent(oDialog);
            //  Reattach tokenModel to the dialog fragment
            const tokenModel =
              that.tokenModel ||
              new sap.ui.model.json.JSONModel({ tokens: [] });
            oDialog.setModel(tokenModel, "tokenModel");
            const fileUploader = sap.ui.core.Fragment.byId(
              "jobFormFrag",
              "jobFileUploader"
            );
            if (fileUploader) {
              fileUploader.data("required", true); //  runtime-only
            }

            //  Set DOB min/max range
            const oToday = new Date();
            const oMinDOB = new Date(
              oToday.getFullYear() - 65,
              oToday.getMonth(),
              oToday.getDate()
            );
            const oMaxDOB = new Date(
              oToday.getFullYear() - 18,
              oToday.getMonth(),
              oToday.getDate()
            );
            const oDatePicker = Fragment.byId("jobFormFrag", "dobPicker");
            if (oDatePicker) {
              oDatePicker.setMinDate(oMinDOB);
              oDatePicker.setMaxDate(oMaxDOB);
              // set datepicker focus to 2000-01-01
              oDatePicker.setInitialFocusedDateValue(new Date(2000, 0, 1));
            }

            // local json countries file
            const oCountryModel = new sap.ui.model.json.JSONModel();
            oCountryModel.loadData("model/countries.json");
            // oCountryModel.setSizeLimit(250); //  //
            that.getView().setModel(oCountryModel, "countries");
            oCountryModel.attachRequestCompleted(function () {
              // console.log("Loaded countries:", oCountryModel.getData());
            });

            const oCities = new sap.ui.model.json.JSONModel();
            oCities.loadData("model/cities.json");
            oCities.setSizeLimit(500);
            that.getView().setModel(oCities, "cities");

            oCities.attachRequestCompleted(function () {
              // console.log(" Cities Loaded:", oCities.getData());
            });

            const oQualModel = new sap.ui.model.json.JSONModel();
            oQualModel.loadData("model/qualifications.json");
            that.getView().setModel(oQualModel, "qualifications");

            const oUniModel = new sap.ui.model.json.JSONModel();
            oUniModel.loadData("model/universities.json");
            oUniModel.setSizeLimit(1000);
            that.getView().setModel(oUniModel, "universities");

            oUniModel.attachRequestCompleted(function () {
              // console.log(" Universities Loaded:", oUniModel.getData());
            });

            //PreviousJob model definition
            const oPrevJobModel = new sap.ui.model.json.JSONModel();
            oPrevJobModel.loadData("model/PreviousJobTitles.json");
            that.getView().setModel(oPrevJobModel, "DesignationModel");

            // notice period model
            const oNoticePeriod = new sap.ui.model.json.JSONModel();
            oNoticePeriod.loadData("model/noticePeriod.json");
            //oCities.setSizeLimit(500);
            that.getView().setModel(oNoticePeriod, "noticePeriod");

            const oISDModel = new sap.ui.model.json.JSONModel();
            oISDModel.loadData("model/isd.json");
            oISDModel.setSizeLimit(300);
            oISDModel.attachRequestCompleted(function () {
              const aAllISD = oISDModel.getData()?.ISDCodes || [];

              //  Extract unique ISD codes based on "text"
              const seen = {};
              const aUniqueISD = aAllISD.filter((item) => {
                if (!seen[item.text]) {
                  seen[item.text] = true;
                  return true;
                }
                return false;
              });

              //  Set cleaned list back to model
              oISDModel.setData({ ISDCodes: aUniqueISD });
              // console.log(" Unique ISD codes loaded:", aUniqueISD);
            });

            // bind to view
            that.getView().setModel(oISDModel, "isd");

            //  Year of Passing: allow selection only between current year and 45 years back
            const oYearPicker = Fragment.byId("jobFormFrag", "PassingYear");
            if (oYearPicker) {
              const oToday = new Date();
              const oMaxYear = new Date(oToday.getFullYear(), 11, 31); // Current year end
              const oMinYear = new Date(oToday.getFullYear() - 45, 0, 1); // Jan 1st 45 years ago

              oYearPicker.setMinDate(oMinYear);
              oYearPicker.setMaxDate(oMaxYear);
              // oYearPicker.setDateValue(oMaxYear); // Optional: pre-fill with current year

              const oToday2 = new Date();

              //  DOB limits
              const oMinDOB = new Date(
                oToday2.getFullYear() - 65,
                oToday2.getMonth(),
                oToday2.getDate()
              );
              const oMaxDOB = new Date(
                oToday2.getFullYear() - 18,
                oToday2.getMonth(),
                oToday2.getDate()
              );
              const oDOB = Fragment.byId("jobFormFrag", "dobPicker");
              if (oDOB) {
                oDOB.setMinDate(oMinDOB);
                oDOB.setMaxDate(oMaxDOB);
              }

              //  Work Experience limits (30 years ago to 90 days ahead)
              const oExpRange = Fragment.byId("jobFormFrag", "experienceRange");
              if (oExpRange) {
                const oMinStart = new Date(
                  oToday2.getFullYear() - 30,
                  oToday2.getMonth(),
                  oToday2.getDate()
                );
                const oMaxEnd = new Date(
                  oToday2.getTime() + 90 * 24 * 60 * 60 * 1000
                );

                oExpRange.setMinDate(oMinStart);
                oExpRange.setMaxDate(oMaxEnd);
                oDialog.open();
              }
            }
          });
        } else {
          this._oJobDialog.open(); //  Now this is safe and will not error
        }
      },

      onClose: function () {
        if (this._oJobDialog) {
          this._oJobDialog.close();
          this.getView().getModel("tokenModel").setProperty("/tokens", []);
          this._oJobDialog.destroy();
          this._oJobDialog = null;
        }
      },

      onNameChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Trim leading and trailing spaces (we check this separately too)
        var sTrimmedValue = sValue.trim();

        // 1. Allow only letters, spaces, and periods
        var bIsValidChars = /^[a-zA-Z. ]+$/.test(sValue);

        // 2. Must be 2–30 characters (after trimming)
        var bIsCorrectLength =
          sTrimmedValue.length >= 2 && sTrimmedValue.length <= 50;

        var bHasBadPatterns = /\s{2,}|\.{2,}|^\s|\s$|^\./.test(sValue);

        if (!bIsValidChars || !bIsCorrectLength || bHasBadPatterns) {
          oInput.setValueState(sap.ui.core.ValueState.Error);

          //const sMessage = this.oResourceBundle.getText("v2_m_errName");

          oInput.setValueStateText(
            "Name must be 2–50 characters long, using only letters, spaces, or periods. It cannot start or end with a space"
          );
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        }
      },
      onCompanyChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Trim leading and trailing spaces (we check this separately too)
        var sTrimmedValue = sValue.trim();

        // 1. Allow only letters, spaces, and periods
        var bIsValidChars = /^[a-zA-Z. ]+$/.test(sValue);

        // 2. Must be 2–30 characters (after trimming)
        var bIsCorrectLength =
          sTrimmedValue.length >= 2 && sTrimmedValue.length <= 50;

        var bHasBadPatterns = /\s{2,}|\.{2,}|^\s|\s$|^\./.test(sValue);

        if (!bIsValidChars || !bIsCorrectLength || bHasBadPatterns) {
          oInput.setValueState(sap.ui.core.ValueState.Error);

          const sMessage = this.oResourceBundle.getText("v2_m_Company");

          oInput.setValueStateText(sMessage);
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        }
      },

      onMobileChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sRawValue = oInput.getValue();

        // Step 1: Remove non-digit characters immediately
        var sSanitized = sRawValue.replace(/\D/g, ""); // Only digits remain

        // Step 2: Enforce max length
        if (sSanitized.length > 10) {
          sSanitized = sSanitized.slice(0, 10);
        }

        // Step 3: Update input value with cleaned version
        if (sRawValue !== sSanitized) {
          oInput.setValue(sSanitized); // Prevent entering letters, `e`, etc.
        }

        // Step 4: Validation logic
        var isTenDigits = sSanitized.length === 10;
        var startsCorrectly = sSanitized.charAt(0) !== "0";

        if (isTenDigits && startsCorrectly) {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        } else {
          oInput.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_errMob");

          oInput.setValueStateText(sMessage);
        }
      },
      onEmailChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // 1. Check for spaces
        if (/\s/.test(sValue)) {
          oInput.setValueState(sap.ui.core.ValueState.Error);

          const sMessage = this.oResourceBundle.getText("v2_m_error");
          //  MessageToast.show(sMessage);

          oInput.setValueStateText(sMessage);
          return;
        }

        // 2. Split by comma and validate each email
        var aEmails = sValue.split(",");
        var bAllValid = aEmails.every(function (email) {
          // Basic email regex
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        });

        if (!bAllValid) {
          oInput.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_emailComa");
          //  MessageToast.show(sMessage);

          oInput.setValueStateText(sMessage);
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        }
      },
      onAddressChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Trim just for visual cleanup — do not use for length or alpha count
        var sTrimmed = sValue.trim();

        // Rule 1: Must be minimum 8 characters
        var bMinLength = sValue.length >= 8;

        // Rule 2: Must contain at least 10 alphabets (a-z, A-Z)
        var letterMatches = sValue.match(/[a-zA-Z]/g);
        var bHasEnoughLetters = letterMatches && letterMatches.length >= 8;

        // Rule 3: Must not be all spaces or just symbols
        var bNotOnlySpaces = !/^\s*$/.test(sValue); // not just spaces
        var bNotOnlyDots = !/^[.]+$/.test(sValue); // not just dots

        if (
          !bMinLength ||
          !bHasEnoughLetters ||
          !bNotOnlySpaces ||
          !bNotOnlyDots
        ) {
          oInput.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_errAddress");
          //  MessageToast.show(sMessage);

          oInput.setValueStateText(sMessage);
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        }
      },
      onLearningChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Trim just for visual cleanup — do not use for length or alpha count
        var sTrimmed = sValue.trim();

        // Rule 1: Must be minimum 8 characters
        var bMinLength = sValue.length >= 8;

        // Rule 2: Must contain at least 10 alphabets (a-z, A-Z)
        var letterMatches = sValue.match(/[a-zA-Z]/g);
        var bHasEnoughLetters = letterMatches && letterMatches.length >= 8;

        // Rule 3: Must not be all spaces or just symbols
        var bNotOnlySpaces = !/^\s*$/.test(sValue); // not just spaces
        var bNotOnlyDots = !/^[.]+$/.test(sValue); // not just dots

        if (
          !bMinLength ||
          !bHasEnoughLetters ||
          !bNotOnlySpaces ||
          !bNotOnlyDots
        ) {
          oInput.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_errLearning");
          //  MessageToast.show(sMessage);

          oInput.setValueStateText(sMessage);
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        }
      },

      onExpertiseChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Trim just for visual cleanup — do not use for length or alpha count
        var sTrimmed = sValue.trim();

        // Rule 1: Must be minimum 8 characters
        var bMinLength = sValue.length >= 8;

        // Rule 2: Must contain at least 10 alphabets (a-z, A-Z)
        var letterMatches = sValue.match(/[a-zA-Z]/g);
        var bHasEnoughLetters = letterMatches && letterMatches.length >= 8;

        // Rule 3: Must not be all spaces or just symbols
        var bNotOnlySpaces = !/^\s*$/.test(sValue); // not just spaces
        var bNotOnlyDots = !/^[.]+$/.test(sValue); // not just dots

        if (
          !bMinLength ||
          !bHasEnoughLetters ||
          !bNotOnlySpaces ||
          !bNotOnlyDots
        ) {
          oInput.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_errAddress");
          //  MessageToast.show(sMessage);

          oInput.setValueStateText(sMessage);
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        }
      },
      onRolesChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Trim just for visual cleanup — do not use for length or alpha count
        var sTrimmed = sValue.trim();

        // Rule 1: Must be minimum 8 characters
        var bMinLength = sValue.length >= 8;

        // Rule 2: Must contain at least 10 alphabets (a-z, A-Z)
        var letterMatches = sValue.match(/[a-zA-Z]/g);
        var bHasEnoughLetters = letterMatches && letterMatches.length >= 8;

        // Rule 3: Must not be all spaces or just symbols
        var bNotOnlySpaces = !/^\s*$/.test(sValue); // not just spaces
        var bNotOnlyDots = !/^[.]+$/.test(sValue); // not just dots

        if (
          !bMinLength ||
          !bHasEnoughLetters ||
          !bNotOnlySpaces ||
          !bNotOnlyDots
        ) {
          oInput.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_errRoles");
          //  MessageToast.show(sMessage);

          oInput.setValueStateText(sMessage);
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        }
      },

      onSkillsChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Trim just for visual cleanup — do not use for length or alpha count
        var sTrimmed = sValue.trim();

        // Rule 1: Must be minimum 8 characters
        var bMinLength = sValue.length >= 8;

        // Rule 2: Must contain at least 10 alphabets (a-z, A-Z)
        var letterMatches = sValue.match(/[a-zA-Z]/g);
        var bHasEnoughLetters = letterMatches && letterMatches.length >= 8;

        // Rule 3: Must not be all spaces or just symbols
        var bNotOnlySpaces = !/^\s*$/.test(sValue); // not just spaces
        var bNotOnlyDots = !/^[.]+$/.test(sValue); // not just dots

        if (
          !bMinLength ||
          !bHasEnoughLetters ||
          !bNotOnlySpaces ||
          !bNotOnlyDots
        ) {
          oInput.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_errSkills");
          //  MessageToast.show(sMessage);

          oInput.setValueStateText(sMessage);
        } else {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        }
      },

      onDOBChange: function (oEvent) {
        var oDatePicker = oEvent.getSource();
        var oSelectedDate = oDatePicker.getDateValue(); // JS Date object

        if (!oSelectedDate) {
          oDatePicker.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_errDOB");
          //    MessageToast.show(sMessage);

          oDatePicker.setValueStateText(sMessage);
          return;
        }

        var oToday = new Date();

        // 1. Must be at least 18 years old
        var oMaxDOB = new Date(
          oToday.getFullYear() - 18,
          oToday.getMonth(),
          oToday.getDate()
        );

        // 2. Must be younger than 65
        var oMinDOB = new Date(
          oToday.getFullYear() - 65,
          oToday.getMonth(),
          oToday.getDate()
        );

        if (oSelectedDate > oMaxDOB) {
          oDatePicker.setValueState(sap.ui.core.ValueState.Error);

          const sMessage = this.oResourceBundle.getText("v2_m_err18YO");

          oDatePicker.setValueStateText(sMessage);
        } else if (oSelectedDate < oMinDOB) {
          oDatePicker.setValueState(sap.ui.core.ValueState.Error);
          const sMessage = this.oResourceBundle.getText("v2_m_err65YO");

          oDatePicker.setValueStateText(sMessage);
        } else {
          oDatePicker.setValueState(sap.ui.core.ValueState.None);
          oDatePicker.setValueStateText("");
        }
      },
      onSalaryChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Block invalid characters instantly (remove alphabets, symbols except '.')
        sValue = sValue.replace(/[^0-9.]/g, "");

        // Allow only one decimal point
        var parts = sValue.split(".");
        if (parts.length > 2) {
          parts = [parts[0], parts[1]]; // remove extra dots
        }

        // Limit to 2 decimal digits
        if (parts[1]) {
          parts[1] = parts[1].substring(0, 2);
        }

        // Rebuild clean value
        var cleanValue = parts.join(".");

        // Block starting with 0 unless followed by '.'
        if (/^0\d/.test(cleanValue)) {
          cleanValue = cleanValue.replace(/^0+/, ""); // Remove leading zero(s)
        }

        // Update input value immediately (blocks typing junk)
        oInput.setValue(cleanValue);

        // Final validation: format + length + minimum amount
        var regex = /^(?!0\d)\d{1,9}(\.\d{0,2})?$/;
        var isFormatValid = regex.test(cleanValue);
        var isMinValid = parseFloat(cleanValue) >= 50000;

        if (isFormatValid && isMinValid && cleanValue.length <= 12) {
          oInput.setValueState(sap.ui.core.ValueState.None);
          oInput.setValueStateText("");
        } else {
          oInput.setValueState(sap.ui.core.ValueState.Error);

          const sMessage = this.oResourceBundle.getText("v2_m_errSal");

          oInput.setValueStateText(sMessage);
        }
      },

      onExperienceToggle: function (oEvent) {
        const fragId = "jobFormFrag";
        const bIsExperienced = oEvent.getParameter("state");

        const oExpSection = sap.ui.core.Fragment.byId(
          fragId,
          "experienceSection"
        );
        const oFreshSection = sap.ui.core.Fragment.byId(
          fragId,
          "fresherSection"
        );

        // Helper to clear values and error states
        const clearSectionInputs = (section) => {
          if (!section || !section.getItems) return;
          section.getItems().forEach((ctrl) => {
            if (typeof ctrl.setValue === "function") ctrl.setValue("");
            if (typeof ctrl.setSelectedKey === "function")
              ctrl.setSelectedKey("");
            if (typeof ctrl.setDateValue === "function")
              ctrl.setDateValue(null);
            if (typeof ctrl.setValueState === "function")
              ctrl.setValueState("None");
          });
        };

        // Toggle visibility
        oExpSection.setVisible(bIsExperienced);
        oFreshSection.setVisible(!bIsExperienced);

        // Clear inputs in the section that is being hidden
        if (bIsExperienced) {
          clearSectionInputs(oFreshSection);
        } else {
          clearSectionInputs(oExpSection);
        }
      },

      onExperienceChange: function (oEvent) {
        const oInput = oEvent.getSource();
        const sValue = oInput.getValue().trim();

        const fValue = parseFloat(sValue);
        const isValid =
          /^[0-9]+(\.[0-9]{1,2})?$/.test(sValue) &&
          fValue >= 0.1 &&
          fValue <= 30;

        if (!isValid) {
          oInput.setValueState("Error");

          const sMessage = this.oResourceBundle.getText("v2_m_errExp");
          oInput.setValueStateText(sMessage);
        } else {
          oInput.setValueState("None");
        }
      },
      validateStartEndDates: function (oStartDatePicker, oEndDatePicker) {
        const oStart = oStartDatePicker.getDateValue();
        const oEnd = oEndDatePicker.getDateValue();
        const oToday = new Date();

        if (!oStart || !oEnd || oStart > oEnd || oEnd > oToday) {
          oEndDatePicker.setValueState("Error");
          const sMessage = this.oResourceBundle.getText("v2_m_errEnddate");
          oEndDatePicker.setValueStateText(sMessage);
        } else {
          oEndDatePicker.setValueState("None");
        }
      },
      onExperienceDateChange: function (oEvent) {
        const oRange = oEvent.getSource();
        const oStart = oRange.getDateValue(); // Start Date
        const oEnd = oRange.getSecondDateValue(); // End Date
        const today = new Date();

        const minStartDate = new Date(
          today.getFullYear() - 30,
          today.getMonth(),
          today.getDate()
        );

        //  Error Messages
        const sMissing = this.oResourceBundle.getText("v2_m_errDatesreq");
        const sOrder = this.oResourceBundle.getText("v2_m_errStDatb4endDate");
        const sRange = this.oResourceBundle.getText("v2_m_errbetLast30Yrs");

        let errorMsg = "";

        if (!oStart || !oEnd) {
          errorMsg = sMissing;
        } else if (oStart > oEnd) {
          errorMsg = sOrder;
        } else if (oStart < minStartDate) {
          errorMsg = sRange;
        }

        if (errorMsg) {
          oRange.setValueState("Error");
          oRange.setValueStateText(errorMsg);
        } else {
          oRange.setValueState("None");
          oRange.setValueStateText("");
        }
      },

      onDOBChange: function (oEvent) {
        const dp = oEvent.getSource();
        const value = dp.getValue();
        const isValid = oEvent.getParameter("valid");

        if (!isValid || !value || value.trim() === "") {
          dp.setValueState("Error");

          const sMessage = this.oResourceBundle.getText("v2_m_errDate");
          dp.setValueStateText(sMessage);
        } else {
          dp.setValueState("None");
        }
      },

      // ...existing code...
      onPassingYearChange: function (oEvent) {
        const oDatePicker = oEvent.getSource();
        const sValue = oDatePicker.getValue(); // What user typed (string)
        const oDate = oDatePicker.getDateValue(); // Parsed date (null if invalid)

        const oToday = new Date();
        const minYear = oToday.getFullYear() - 45;
        const maxYear = oToday.getFullYear();

        // Check for empty or non-numeric input
        if (!sValue || !/^\d{4}$/.test(sValue)) {
          oDatePicker.setValueState("Error");
          oDatePicker.setValueStateText(
            `Enter a valid year of passing between ${minYear} and ${maxYear}`
          );
          return;
        }

        // Now check if year is in range
        const year = parseInt(sValue, 10);
        if (year < minYear || year > maxYear) {
          oDatePicker.setValueState("Error");
          oDatePicker.setValueStateText(
            `Enter a valid year of passsing between ${minYear} and ${maxYear}`
          );
          return;
        }

        // All good
        oDatePicker.setValueState("None");
        oDatePicker.setValueStateText("");
      },
      // ...existing code...
      onComboBoxChange: function (oEvent) {
        const combo = oEvent.getSource();
        const selectedKey = combo.getSelectedKey();

        if (combo.getRequired && combo.getRequired()) {
          if (!selectedKey || selectedKey.trim() === "") {
            combo.setValueState("Error");
            combo.setValueStateText("Please Choose from List");
          } else {
            combo.setValueState("None");
          }
        }
      },

      onNoticePeriodChange: function (oEvent) {
        const combo = oEvent.getSource();
        const selectedKey = combo.getSelectedKey();

        if (combo.getRequired && combo.getRequired()) {
          if (!selectedKey || selectedKey.trim() === "") {
            combo.setValueState("Error");
            combo.setValueStateText("Please Choose Notice Period from List");
          } else {
            combo.setValueState("None");
          }
        }
      },
      onEmpTypeChange: function (oEvent) {
        const combo = oEvent.getSource();
        const selectedKey = combo.getSelectedKey();

        if (combo.getRequired && combo.getRequired()) {
          if (!selectedKey || selectedKey.trim() === "") {
            combo.setValueState("Error");
            combo.setValueStateText("Please Choose Employment Type from List");
          } else {
            combo.setValueState("None");
          }
        }
      },

      onDesignationChange: function (oEvent) {
        const oInput = oEvent.getSource();
        const Designation = oInput.getValue().trim();
        const isValidFormat = /^[A-Za-z\s\-]+$/.test(Designation); // Only letters, spaces, hyphens

        if (!Designation) {
          oInput.setValueState("Error");
          oInput.setValueStateText("Designation cannot be empty.");
          return;
        }

        if (!isValidFormat) {
          oInput.setValueState("Error");
          oInput.setValueStateText(
            "Only letters, spaces, and hyphens allowed."
          );
          return;
        }
        oInput.setValueState("None");
      },

      onISDChange: function (oEvent) {
        const combo = oEvent.getSource();
        const selectedKey = combo.getSelectedKey();

        if (combo.getRequired && combo.getRequired()) {
          if (!selectedKey || selectedKey.trim() === "") {
            combo.setValueState("Error");
            combo.setValueStateText("Please Choose ISD Codes from List");
          } else {
            combo.setValueState("None");
          }
        }
      },
      onQalificationChange: function (oEvent) {
        const combo = oEvent.getSource();
        const selectedKey = combo.getSelectedKey();

        if (combo.getRequired && combo.getRequired()) {
          if (!selectedKey || selectedKey.trim() === "") {
            combo.setValueState("Error");
            combo.setValueStateText("Please Choose Qulification from List");
          } else {
            combo.setValueState("None");
          }
        }
      },

      onUniversityChange: function (oEvent) {
        const oInput = oEvent.getSource();
        const university = oInput.getValue().trim();
        const isValidFormat = /^[A-Za-z\s\-]+$/.test(university); // Only letters, spaces, hyphens

        if (!university) {
          oInput.setValueState("Error");
          oInput.setValueStateText("University cannot be empty.");
          return;
        }

        if (!isValidFormat) {
          oInput.setValueState("Error");
          oInput.setValueStateText(
            "Only letters, spaces, and hyphens allowed."
          );
          return;
        }
        oInput.setValueState("None");
      },

      onGenderChange: function (oEvent) {
        const combo = oEvent.getSource();
        const selectedKey = combo.getSelectedKey();

        if (combo.getRequired && combo.getRequired()) {
          if (!selectedKey || selectedKey.trim() === "") {
            combo.setValueState("Error");
            combo.setValueStateText("Please Choose Gender from List");
          } else {
            combo.setValueState("None");
          }
        }
      },
      onCountryChange: function (oEvent) {
        const selectedKey = oEvent.getSource().getSelectedKey();
        const oCityCombo = Fragment.byId("jobFormFrag", "cityCombo");
        const oISDCombo = Fragment.byId("jobFormFrag", "isd_code");
        const oCitiesModel = this.getView().getModel("cities");

        // Validate country selection
        if (!selectedKey || selectedKey.trim() === "") {
          oEvent.getSource().setValueState("Error");
          oEvent
            .getSource()
            .setValueStateText("Please Choose country from List");
          return;
        } else {
          oEvent.getSource().setValueState("None");
        }

        // Always show the City ComboBox
        oCityCombo.setVisible(true);
        oCityCombo.setValue("");
        oCityCombo.setSelectedKey("");

        if (selectedKey === "IN") {
          //  Bind cities
          oCityCombo.bindItems({
            path: "cities>/cities",
            template: new sap.ui.core.ListItem({ text: "{cities>}" }),
          });

          //  Auto-select ISD +91 and disable
          const isdItems = oISDCombo.getItems();
          for (let i = 0; i < isdItems.length; i++) {
            if (isdItems[i].getKey() === "IN") {
              oISDCombo.setSelectedItem(isdItems[i]);
              break;
            }
          }
          oISDCombo.setEnabled(false);
        } else {
          // For other countries: clear city suggestions
          oCityCombo.unbindItems();

          //  Enable ISD ComboBox
          oISDCombo.setSelectedKey("");
          oISDCombo.setEnabled(true);
        }
      },

      onCityChange: function (oEvent) {
        const oInput = oEvent.getSource();
        const city = oInput.getValue().trim();
        const isValidFormat = /^[A-Za-z\s\-]+$/.test(city); // Only letters, spaces, hyphens
        const oCountryCombo = Fragment.byId("jobFormFrag", "countryCombo");
        const selectedCountry = oCountryCombo.getSelectedKey();

        if (!city) {
          oInput.setValueState("Error");
          oInput.setValueStateText("City cannot be empty.");
          return;
        }

        if (!isValidFormat) {
          oInput.setValueState("Error");
          oInput.setValueStateText(
            "Only letters, spaces, and hyphens allowed."
          );
          return;
        }

        // Check only if India is selected
        if (selectedCountry === "IN") {
          const cityCombo = Fragment.byId("jobFormFrag", "cityCombo");
          const availableCities = cityCombo
            .getItems()
            .map((item) => item.getText());

          if (!availableCities.includes(city)) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "Please choose a valid city from the list."
            );
            return;
          }
        }

        oInput.setValueState("None");
      },

      onCityValidateChange: function (oEvent) {
        const oCombo = oEvent.getSource();
        const enteredValue = oCombo.getValue().trim();
        const isIndia =
          Fragment.byId("jobFormFrag", "countryCombo")?.getSelectedKey() ===
          "IN";

        if (!enteredValue) {
          oCombo.setValueState("Error");
          oCombo.setValueStateText("City cannot be empty.");
          return;
        }

        if (isIndia) {
          const items = oCombo.getItems();
          const found = items.some(
            (item) =>
              item.getText().toLowerCase() === enteredValue.toLowerCase()
          );
          if (!found) {
            oCombo.setValueState("Error");
            oCombo.setValueStateText(
              "Please select a valid city from the list."
            );
          } else {
            oCombo.setValueState("None");
          }
        } else {
          // Validate for other countries — only character validation
          const isValid = /^[A-Za-z\s\-]+$/.test(enteredValue);
          if (!isValid) {
            oCombo.setValueState("Error");
            oCombo.setValueStateText(
              "Only letters, spaces, and hyphens allowed."
            );
          } else {
            oCombo.setValueState("None");
          }
        }
      },
      onSubmit: function () {
        const fragId = "jobFormFrag";

        let hasErrors = false;

        const f = (id) => sap.ui.core.Fragment.byId(fragId, id);

        // Utility: collect all required, visible, enabled, input-type controls
        function collectControls(container, collected = []) {
          if (!container || typeof container !== "object") return;

          const children = [];
          if (typeof container.getItems === "function")
            children.push(...(container.getItems() || []));
          if (typeof container.getContent === "function")
            children.push(...(container.getContent() || []));
          if (typeof container.getFormElements === "function")
            children.push(...(container.getFormElements() || []));
          if (typeof container.getFields === "function")
            children.push(...(container.getFields() || []));
          if (typeof container.getCells === "function")
            children.push(...(container.getCells() || []));

          children.forEach((child) => collectControls(child, collected));

          if (
            (typeof container.getValue === "function" ||
              typeof container.getSelectedKey === "function") &&
            typeof container.setValueState === "function" &&
            container.getRequired?.() &&
            container.getVisible?.() &&
            container.getEnabled?.()
          ) {
            collected.push(container);
          }

          return collected;
        }

        //  Utility: validate each control
        function validateControls(controlList) {
          let errors = false;
          const getValue = (ctrl) => {
            const type = ctrl.getMetadata().getName();

            if (type === "sap.m.ComboBox") {
              const text = ctrl.getSelectedItem()?.getText?.();
              const typedValue = ctrl.getValue?.();
              return typedValue || text;
            }

            return ctrl.getValue?.() || ctrl.getSelectedKey?.();
          };

          controlList.forEach((ctrl) => {
            const val = getValue(ctrl);
            if (!val || (typeof val === "string" && val.trim() === "")) {
              ctrl.setValueState("Error");
              ctrl.setValueStateText("This field is required.");
              errors = true;
            } else {
              ctrl.setValueState("None");
            }
          });

          return errors;
        }
        const country = f("countryCombo")?.getSelectedKey();
        const cityCombo = f("cityCombo");
        const typedCity = cityCombo?.getValue().trim();
        const items = cityCombo?.getItems();

        if (country === "IN") {
          const match = items.some(
            (item) => item.getText().trim() === typedCity
          );
          if (!match) {
            cityCombo.setValueState("Error");
            cityCombo.setValueStateText("Please select a city from the list.");
            hasErrors = true;
          } else {
            cityCombo.setValueState("None");
          }
        }

        //  Validate all fields
        const dobControl = f("dobPicker");
        const root = dobControl?.getParent?.();
        const requiredControls = collectControls(root);
        hasErrors = validateControls(requiredControls);

        //  Skills manual check
        const skills = f("skillsInput");
        if (
          skills?.getRequired?.() &&
          skills.getVisible?.() &&
          skills.getEnabled?.()
        ) {
          const val = skills.getValue();
          if (!val || val.trim() === "") {
            skills.setValueState("Error");
            skills.setValueStateText("Please enter your skills.");
            hasErrors = true;
          } else {
            skills.setValueState("None");
          }
        }

        // dobPicker Validation
        const dobPicker = f("dobPicker");
        const dob = dobPicker?.getDateValue?.();
        const today = new Date();
        const maxDOB = new Date(
          today.getFullYear() - 18,
          today.getMonth(),
          today.getDate()
        );
        const minDOB = new Date(
          today.getFullYear() - 65,
          today.getMonth(),
          today.getDate()
        );

        if (!dob || dob < minDOB || dob > maxDOB) {
          dobPicker.setValueState("Error");
          dobPicker.setValueStateText(
            this.oResourceBundle.getText("v2_m_errDOB")
          );
          hasErrors = true;
        } else {
          dobPicker.setValueState("None");
        }
        // PassingYear Validation
        const yearInput = f("PassingYear");
        const yearVal = yearInput?.getValue?.();
        const currentYear = new Date().getFullYear();
        const minYear = currentYear - 45;

        if (
          !/^\d{4}$/.test(yearVal) ||
          yearVal < minYear ||
          yearVal > currentYear
        ) {
          yearInput.setValueState("Error");
          yearInput.setValueStateText(
            `Enter a valid year of passing year between ${minYear} and ${currentYear}`
          );
          hasErrors = true;
        } else {
          yearInput.setValueState("None");
          yearInput.setValueStateText("");
        }

        // experienceRange Validation
        const isExperience = f("experienceSwitch")?.getState?.();
        if (isExperience) {
          const rangeCtrl = f("experienceRange");
          const startDate = rangeCtrl?.getDateValue?.();
          const endDate = rangeCtrl?.getSecondDateValue?.();
          const maxEndDate = new Date(
            today.getTime() + 90 * 24 * 60 * 60 * 1000
          );
          const minStartDate = new Date(
            today.getFullYear() - 30,
            today.getMonth(),
            today.getDate()
          );

          if (!startDate || !endDate) {
            rangeCtrl.setValueState("Error");
            rangeCtrl.setValueStateText(
              this.oResourceBundle.getText("v2_m_errDatesreq")
            );
            hasErrors = true;
          } else if (startDate > endDate) {
            rangeCtrl.setValueState("Error");
            rangeCtrl.setValueStateText(
              this.oResourceBundle.getText("v2_m_errStDatb4endDate")
            );
            hasErrors = true;
          } else if (startDate < minStartDate || endDate > maxEndDate) {
            rangeCtrl.setValueState("Error");
            rangeCtrl.setValueStateText(
              this.oResourceBundle.getText("v2_m_errbetLast30Yrs")
            );
            hasErrors = true;
          } else {
            rangeCtrl.setValueState("None");
          }
        }
        //  Resume Validation (set text only)
        const fileErrorText = f("fileErrorText");
        const fileUploader = f("fileUploader");
        const uploadModel = this.getView().getModel("UploadModel");
        const fileData = uploadModel?.getData();
        const {
          File: fileBase64,
          FileName: fileName,
          FileType: fileType,
        } = fileData || {};
        const fileErrorLayout = f("fileErrorLayout");
        if (!fileBase64 || !fileName || !fileType) {
          fileErrorLayout.setVisible(false);
          //  MessageToast.show("Please upload your resume");
          fileErrorText.setText("Please upload your resume");
          fileErrorLayout.setVisible(true);
          fileErrorText.setVisible(true);
          fileUploader.setValueState("None");
          hasErrors = true;
        } else {
          fileErrorText.setText("");
          fileErrorText.setVisible(false);
        }

        // Experience/Fresher additional validation
        const isExperienced = f("experienceSwitch")?.getState?.();
        const section = f(
          isExperienced ? "experienceSection" : "fresherSection"
        );
        if (section?.getItems) {
          const extraControls = collectControls(section);
          if (validateControls(extraControls)) hasErrors = true;
        }

        //  Abort if errors found
        if (hasErrors) {
          sap.m. MessageToast.show("Make sure all the mandatory fields are filled/validate the entered value");
          return;
        }
        // Busy Indicator //
        sap.ui.core.BusyIndicator.show(0);

        //  Build final payload
        const jsonData = this.getFormDataAsJSON();

        //  Append additional ComboBox text fields
        const appendCombo = (id, field) => {
          const combo = f(id);
          if (combo) {
            const selectedText = combo.getSelectedItem()?.getText?.();
            const typedValue = combo.getValue?.();
            jsonData[field] = typedValue || selectedText || "";
          }
        };

        appendCombo("isd_code", "ISD");
        appendCombo("countryCombo", "Country");
        appendCombo("cityCombo", "City");
        appendCombo("previousJobTitleCombo", "Designation");
        appendCombo("universityCombo", "University");
        appendCombo("noticePeriodCombo", "NoticePeriod");

        const qualificationCombo = f("qualificationCombo");
        if (qualificationCombo) {
          const selectedItem = qualificationCombo.getSelectedItem();
          const value = selectedItem
            ? selectedItem.getText()
            : qualificationCombo.getValue();
          jsonData.HighestQualifaction = value || "";
        }
        // Add base64 file data
        jsonData.ResumeFile = fileBase64;

        $.ajax({
          url: "https://rest.kalpavrikshatechnologies.com/JobApplications",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({ data: jsonData }),
          headers: {
            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            password:
              "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
          },
          success: () => {
            sap.ui.core.BusyIndicator.hide();

            sap.m.MessageToast.show("Application submitted successfully!");

            const dialog = f("jobFormDialog");
            if (dialog) {
              this.getView().getModel("tokenModel").setProperty("/tokens", []);
              dialog.destroy(); //  Destroy to clear state
              delete this._oJobDialog;
            }
          },
          error: () => {
            sap.ui.core.BusyIndicator.hide();

            sap.m.MessageBox.error("Submission failed. Please try again.");
          },
        });
      },

      onOpenReferrerDialog: function () {
        const oView = this.getView();
        const oSelectedCandidateModel = oView.getModel("SelectedCandidate");

        if (!this.pReferrerDialogPromise) {
          this.pReferrerDialogPromise = Fragment.load({
            id: oView.getId(), // ensures scoped IDs
            name: "sap.kt.com.minihrsolution.fragment.ReferrerDetails",
            controller: this,
          }).then((oDialog) => {
            oView.addDependent(oDialog);
            oDialog.setModel(oSelectedCandidateModel, "SelectedCandidate");
            return oDialog;
          });
        }

        this.pReferrerDialogPromise.then((oDialog) => {
          // Set or refresh model
          oDialog.setModel(oSelectedCandidateModel, "SelectedCandidate");

          //  Delay this part slightly so the control is ready after rendering
          setTimeout(() => {
            const oTitle = Fragment.byId(oView.getId(), "positionInput");
            const jobTitle = oSelectedCandidateModel?.getProperty("/JobTitle");

            if (oTitle && jobTitle) {
              oTitle.setText(jobTitle);
            } else {
            }
          }, 0); // 0ms ensures it runs after rendering

          oDialog.open();
        });
      },

      onReferredToChange: function (oEvent) {
        const oCombo = oEvent.getSource();
        const sKey = oCombo.getSelectedKey();

        if (!sKey) {
          oCombo.setValueState("Error");
          oCombo.setValueStateText(
            "Please select a valid person from the list."
          );
        } else {
          oCombo.setValueState("None");
        }
      },

      onRemoveFile: function () {
        const fileUploader = sap.ui.core.Fragment.byId(
          "jobFormFrag",
          "FileUploader"
        );

        fileUploader.setValue(""); // Clear the file
        fileUploader.setValueState("Error"); // Set error state after removal
        fileUploader.setValueStateText("Please upload your resume"); // Optional, user-friendly message

        // Remove any previously selected file reference
        this.oSelectedFile = null;

        sap.m.MessageToast.show("File removed. Please upload your resume");
      },

      getFormDataAsJSON: function () {
        const fragId = "jobFormFrag";
        const f = (id) => sap.ui.core.Fragment.byId(fragId, id);

        //  Date Range Controls
        const rangeCtrl = f("experienceRange");
        const startDate = rangeCtrl?.getDateValue?.();
        const endDate = rangeCtrl?.getSecondDateValue?.();

        //  Selected Job Title from another model
        const jobTitle =
          this.getView()
            .getModel("SelectedCandidate")
            ?.getProperty("/JobTitle") || "Unknown";

        //  Helpers
        const safeVal = (ctrl) => ctrl?.getValue?.() || "";
        const safeKey = (ctrl) => ctrl?.getSelectedKey?.() || "";
        const safeDate = (date) =>
          date instanceof Date ? date.toISOString().split("T")[0] : "";

        return {
          FullName: safeVal(f("fullNameInput")),
          Gender: safeKey(f("genderCombo")),
          Mobile: safeVal(f("mobileInput")),
          Email: safeVal(f("emailInput")),
          Address: safeVal(f("addressInput")),
          DOB: safeDate(f("dobPicker")?.getDateValue?.()),

          University: safeVal(f("universityInput")),
          PassingYear: safeVal(f("PassingYear")),
          Skills: safeVal(f("skillsInput")),

          Experience: safeVal(f("experienceInput")),
          CurrentCompany: safeVal(f("companyInput")),
          Designation: safeVal(f("roleInput")), //  Role used as Designation

          CurrentSalary: safeVal(f("salaryInput")),
          WorkDurationStart: safeDate(startDate),
          WorkDurationEnd: safeDate(endDate),

          EmploymentType: safeKey(f("employmentTypeCombo")),
          NoticePeriod: safeVal(f("noticePeriodInput")),
          ExpectedSalary: safeVal(f("expectedSalaryInput")),
          ExpertiseIn: safeVal(f("fresherExpertiseInput")),
          DescribeYourSelf: safeVal(f("fresherSelfDesc")),

          HighestQualifaction: "",
          ISD: "",
          Country: "",
          City: "",

          JobTitle: jobTitle,
        };
      },

      onSharePress: function (oEvent) {
    const createItem = (iconPath, title, pressHandler) => {
        return new sap.m.CustomListItem({
            type: "Active",
            press: pressHandler,
            content: [
                new sap.m.HBox({
                    alignItems: "Center",
                    justifyContent: "Start",
                    width: "100%",
                    items: [
                        new sap.m.Image({
                            src: iconPath,
                            width: "18px",
                            height: "18px",
                            decorative: false,
                        }).addStyleClass("shareIcon"),
                        new sap.m.Text({
                            text: title,
                        }).addStyleClass("shareText"),
                    ],
                }).addStyleClass("shareItemBox"),
            ],
        });
    };

    const oSource = oEvent.getSource();

    // If Popover already exists and is open, close it
    if (this._oSharePopover && this._oSharePopover.isOpen()) {
        this._oSharePopover.close();
        return;
    }

    if (!this._oSharePopover) {
        const items = [
            createItem("image/linkedin.png", "LinkedIn", () => {
                window.open("https://linkedin.com", "_blank");
            }),
            createItem("image/Mail.png", "Email", () => {
                window.location.href =
                    "mailto:?subject=Check this out&body=" +
                    encodeURIComponent(window.location.href);
            }),
            createItem("image/whatsapp.png", "WhatsApp", () => {
                window.open(
                    "https://wa.me/?text=" +
                        encodeURIComponent(window.location.href),
                    "_blank"
                );
            }),
            createItem("image/link.png", "Copy Link", () => {
                navigator.clipboard.writeText(window.location.href);
                sap.m.MessageToast.show("Link copied!");
            }),
        ];

        // Style the last item differently
        const lastHBox = items[items.length - 1].getContent()[0];
        lastHBox.removeStyleClass("shareItemBox");
        lastHBox.addStyleClass("shareItemBoxLast");

        this._oSharePopover = new sap.m.Popover({
            placement: sap.m.PlacementType.Bottom,
            showHeader: false,
            contentWidth: "200px",
            content: [
                new sap.m.List({
                    items: items,
                }),
            ],
        });
    }

    // Open popover
    this._oSharePopover.openBy(oSource);
},

      onLinkedInPress: function () {
        window.open("https://linkedin.com", "_blank");
      },

      onEmailPress: function () {
        window.location.href =
          "mailto:?subject=Check this out&body=" +
          encodeURIComponent(window.location.href);
      },

      onWhatsAppPress: function () {
        const url = encodeURIComponent(window.location.href);
        window.open("https://wa.me/?text=" + url, "_blank");
      },

      onCopyLinkPress: function () {
        navigator.clipboard.writeText(window.location.href);
        sap.m.MessageToast.show("Link copied!");
      },
      copyDynamicLink: function (oEvent) {
        var that = this;

        // Optional: Get Job ID or Applicant ID if needed
        var jobId = "static123"; // replace with dynamic logic if needed

        $.ajax({
          url: "/api/getDynamicLink?jobId=" + jobId, // Replace with your real API
          method: "GET",
          success: function (response) {
            // Example response: { token: "abc123" }
            var token = response.token || "defaultToken";

            // Build your app link with hash-based routing
            var link =
              window.location.origin + "/index.html#/JobView?id=" + token;

            navigator.clipboard
              .writeText(link)
              .then(function () {
                sap.m.MessageToast.show("Link copied to clipboard!");
              })
              .catch(function (err) {
                sap.m.MessageBox.error("Failed to copy: " + err);
              });
          },
          error: function () {
            sap.m.MessageBox.error(
              "Could not fetch dynamic link from backend."
            );
          },
        });
      },
    });
  }
);
