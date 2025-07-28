sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation"
  ],
  function (BaseController, JSONModel, MessageToast, utils) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.LoginPage",
      {
        onInit: function () {
          this.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel({ that: this }), "ThisModel");
          this.getRouter().getRoute("RouteLoginPage").attachMatched(this._onRouteMatched, this);
          const model = new JSONModel({
            // for Database connection
            url: "https://rest.kalpavrikshatechnologies.com/",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              "Content-Type": "application/json",
            },
            isRadioVisible: false,
          });
          this.getOwnerComponent().setModel(model, "LoginModel");
        },
        _onRouteMatched: function () {
          this.closeBusyDialog();
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          var oLoginModel = new JSONModel({
            "userId": "",
            "userName": "",
            "password": "",
            "otp": "",
            // "SetUser": "",
            "isPasswordSelected": true,
            "isOtpSelected": false,
            "isPasswordVisible": true,
            "isOtpVisible": false,
            "isSendOtpVisible": false,
            "isForgotPasswordVisible": true,
            "sendOtpText": "Send OTP",
            "passwordValueState": "None",
            "continue": "Continue",

            "frgUserId": "",
            "frgUserIdValueState": "None",
            "frgUserName": "",
            "frgUserNameValueState": "None",
            "frgOtp": "",
            "frgOtpValueState": "None",
            "frgOtpVisible": false,
            // "Setvisibleuser": false,
            "frgNewPassword": "",
            "frgNewPasswordValueState": "None",
            "frgNewPasswordVisible": false,
            "frgConfirmPassword": "",
            "frgConfirmPasswordValueState": "None",
            "frgConfirmPasswordVisible": false
          });
          this.getView().setModel(oLoginModel, "LoginViewModel");
       
        },
        
        onpresshome: function () {
          this.getRouter().navTo("RouteHomePage");
        },
        //for validation purposes
        LP_onValidateUserId: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        LP_onValidateUsername: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        SM_onChnageSetAndConfirm: function (oEvent) {
          utils._LCvalidatePassword(oEvent);
        },
        LP_onpresPassword(oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        //for OTPsend
        LP_onOtppress: async function () {
          const oModel = this.getView().getModel("LoginViewModel");
          // Validation
          if (
            !utils._LCvalidateMandatoryField(this.byId("Lp_id_Userid"), "ID") ||
            !utils._LCvalidateName(this.byId("Lp_id_Username"), "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("validateUser"));
            return;
          }
          // Send OTP via AJAX
          this.getBusyDialog();
          try {
            await this.ajaxCreateWithJQuery("SendOTP", {
              EmployeeID: oModel.getProperty("/userId"),
              EmployeeName: oModel.getProperty("/userName"),
              Type: "OTP"
            }).then((response) => {
              if (response && response.success === true) {
                this.closeBusyDialog();
                oModel.setProperty("/isOtpVisible", true);
                oModel.setProperty("/isSendOtpVisible", true);
                oModel.setProperty("/otp", "");
                oModel.setProperty("/sendOtpText", this.i18nModel.getText("msgresndotp"));
                MessageToast.show(this.i18nModel.getText("sentOTP"));
              } else {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("errorMsguser"));
              }
            }).catch((error) => {
              this.closeBusyDialog();
              MessageToast.show(this.i18nModel.getText(error.responseJSON.message));
            });
          } catch (err) {
            // Fallback error (in case .then/.catch block fails)
            MessageToast.show(this.i18nModel.getText("errorMsguser"));
          }
        },
        LP_onLogin: function () {
          const oLoginModel = this.getView().getModel("LoginModel");
          const oVM = this.getView().getModel("LoginViewModel");
          // Validate User ID and Name
          if (
            !utils._LCvalidateMandatoryField(this.byId("Lp_id_Userid"), "ID") ||
            !utils._LCvalidateName(this.byId("Lp_id_Username"), "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          // Validate OTP if selected
          if (oVM.getProperty("/isOtpSelected") && !oVM.getProperty("/otp")) {
            MessageToast.show(this.i18nModel.getText("checkOTP"));
            return;
          }
          // Validate Password if selected
          if (oVM.getProperty("/isPasswordSelected")) {
            const isPasswordValid = utils._LCvalidateMandatoryField(this.byId("Lp_id_PasswordInput"), "ID");
            if (!isPasswordValid) {
              MessageToast.show(this.i18nModel.getText("mandetoryFields"));
              return;
            }
          }
          // Backend call using then-catch
          try {
            this.getBusyDialog();
            this.ajaxReadWithJQuery("LoginDetails", {
              EmployeeID: this.byId("Lp_id_Userid").getValue(),
              EmployeeName: this.byId("Lp_id_Username").getValue(),
              OTP: oVM.getProperty("/isOtpSelected") ? oVM.getProperty("/otp") : "",
              Password: oVM.getProperty("/isPasswordSelected") ? btoa(this.byId("Lp_id_PasswordInput").getValue()) : ""
            }).then((response) => {
              if (response?.success && response.data?.length > 0) {
                this.closeBusyDialog();
                const userData = response.data[0];

                if (oVM.getProperty("/isOtpSelected")) {
                  var timeDifference = new Date().getTime() - new Date(parseInt(userData.TimeDate)).getTime();
                  if (timeDifference >= 600000) {
                    MessageToast.show(this.i18nModel.getText("loginTimeOut")); // "OTP expired"
                    return;
                  }
                }

                if (
                  oVM.getProperty("/userId") === userData.EmployeeID &&
                  oVM.getProperty("/userName") === userData.EmployeeName
                ) {
                  // Save to LoginModel 
                  oLoginModel.setProperty("/EmployeeID", userData.EmployeeID);
                  oLoginModel.setProperty("/EmployeeName", userData.EmployeeName);
                  oLoginModel.setProperty("/EmailID", userData.EmailID);
                  oLoginModel.setProperty("/Role", userData.Role);
                  oLoginModel.setProperty("/FolderID", response.FolderID);
                  oLoginModel.setProperty("/EducationalandDocumentsDetailFolderID", userData.EducationalandDocumentsDetailFolderID);
                  oLoginModel.setProperty("/EmploymentDetailFolderID", userData.EmploymentDetailFolderID);
                  oLoginModel.setProperty("/BranchCode", userData.BranchCode);
                  oLoginModel.setProperty("/MobileNo", userData.MobileNo);
                  oLoginModel.setProperty("/RichText", false);
                  oLoginModel.setProperty("/SimpleForm", true);

                  // Reset LoginViewModel
                  oVM.setProperty("/userId", ""); oVM.setProperty("/userName", ""); oVM.setProperty("/otp", ""); oVM.setProperty("/password", ""); oVM.setProperty("/isOtpVisible", false); oVM.setProperty("/isPasswordVisible", false); oVM.setProperty("/isSendOtpVisible", false); oVM.setProperty("/sendOtpText", this.i18nModel.getText("sendOtp")); oVM.setProperty("/isOtpSelected", false); oVM.setProperty("/isPasswordSelected", false); oVM.setProperty("/isForgotPasswordVisible", false);
                  // Navigate
                  this.getRouter().navTo("RouteTilePage");
                  // Add this block after navigation
                  window.history.pushState(null, "", window.location.href);
                  window.addEventListener("popstate", function (event) {
                    window.history.pushState(null, "", window.location.href);
                  })
                } else {
                  this.closeBusyDialog();
                  MessageToast.show(this.i18nModel.getText("errorMsguser"));
                }
              } else {
                this.closeBusyDialog();
                const backendMsg = response?.message || this.i18nModel.getText("commonErrorMessage");
                MessageToast.show(backendMsg);
              }
            }).catch((error) => {
              this.closeBusyDialog();
              const errorMsg = error?.responseText
                ? JSON.parse(error.responseText).message
                : this.i18nModel.getText("commonErrorMessage");
              MessageToast.show(errorMsg);
            });
          } catch (e) {
            this.closeBusyDialog();
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
        },
        onOTPlength: function (oEvent) {
          var oInput = oEvent.getSource();
          var sValue = oEvent.getParameter("value");

          // Allow only digits and limit to 6 characters
          sValue = sValue.replace(/\D/g, "").substring(0, 6);

          oInput.setValue(sValue);

          // Optionally update model if needed
          var oModel = this.getView().getModel("LoginViewModel");
          if (oModel) {
            oModel.setProperty("/frgOtp", sValue);
          }
        },

        onLoginOptionChange: function (oEvent) {
          const oVM = this.getView().getModel("LoginViewModel");
          if (oEvent.getSource().getId().includes("PasswordRadio")) {
            // User selected password login
            oVM.setProperty("/isPasswordVisible", true); oVM.setProperty("/isForgotPasswordVisible", true); oVM.setProperty("/isOtpVisible", false); oVM.setProperty("/isSendOtpVisible", false); oVM.setProperty("/isPasswordSelected", true); oVM.setProperty("/isOtpSelected", false);
          } else {
            // User selected OTP login
            oVM.setProperty("/userIdValueState", "None"); oVM.setProperty("/userNameValueState", "None"); oVM.setProperty("/password", ""); oVM.setProperty("/passwordValueState", "None"); oVM.setProperty("/isPasswordVisible", false); oVM.setProperty("/isForgotPasswordVisible", false); oVM.setProperty("/isSendOtpVisible", true); oVM.setProperty("/isOtpVisible", false); oVM.setProperty("/isPasswordSelected", false); oVM.setProperty("/isOtpSelected", true);
          }
        },
        //Password login change event
        LP_onpasswordchange: function () {
          this.LP_onLogin();
        },
        // //OTP login change event
        LP_onOTPchange: function () {
          this.LP_onLogin();
        },
        // Forgot Password button event
        LP_onForgotPassword: function () {
          const oVM = this.getView().getModel("LoginViewModel");
          const resetFields = () => {
            sap.ui.getCore().byId("FSM_id_userIdInput").setEditable(true);
            sap.ui.getCore().byId("FSM_id_userNameInput").setEditable(true);
            sap.ui.getCore().byId("FSM_id_otpInput").setEditable(true); oVM.setProperty("/userId", ""); oVM.setProperty("/userIdValueState", "None"); oVM.setProperty("/userName", ""); oVM.setProperty("/userNameValueState", "None"); oVM.setProperty("/password", ""); oVM.setProperty("/passwordValueState", "None");
            // Disable save button in fragment
            sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(true);;
          };
          if (!this.oPassforgot) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.SetPassword",
              controller: this,
            }).then((oPassforgot) => {
              this.oPassforgot = oPassforgot;
              this.getView().addDependent(this.oPassforgot);
              this.oPassforgot.open();
              resetFields();
            });
          } else {
            this.oPassforgot.open();
            resetFields();
          }
        },
        // Close the dialog when the cancel button is pressed
        SM_onPressCancle: function () {
          const oFragModel = this.getView().getModel("LoginViewModel");
          // Reset all values and value states in the model
          oFragModel.setProperty("/frgUserId", ""); oFragModel.setProperty("/frgUserIdValueState", "None"); oFragModel.setProperty("/frgUserName", ""); oFragModel.setProperty("/frgUserNameValueState", "None"); oFragModel.setProperty("/frgOtp", ""); oFragModel.setProperty("/frgOtpValueState", "None"); oFragModel.setProperty("/frgOtpVisible", false);
          // oFragModel.setProperty("/Setvisibleuser", false);
          oFragModel.setProperty("/frgNewPassword", ""); oFragModel.setProperty("/frgNewPasswordValueState", "None");
          oFragModel.setProperty("/frgNewPasswordVisible", false); oFragModel.setProperty("/frgConfirmPassword", ""); oFragModel.setProperty("/frgConfirmPasswordValueState", "None"); oFragModel.setProperty("/frgConfirmPasswordVisible", false);
          // Reset value states on input fields themselves
          const oNewPasswordInput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          const oConfirmPasswordInput = sap.ui.getCore().byId("FSM_id_confirmPasswordInput");
          if (oNewPasswordInput) {
            oNewPasswordInput.setValueState("None");
          }
          if (oConfirmPasswordInput) {
            oConfirmPasswordInput.setValueState("None");
          }
          // Close the dialog
          if (this.oPassforgot) {
            this.oPassforgot.close();
          }
        },

        SM_onTogglePasswordVisibility: function (oEvent) {
          var oInput = oEvent.getSource();
          var sType = oInput.getType() === "Password" ? "Text" : "Password";
          oInput.setType(sType);
          // Toggle the value help icon properly without losing the value
          var sIcon =
            sType === "Password" ? "sap-icon://show" : "sap-icon://hide";
          oInput.setValueHelpIconSrc(sIcon);
          // Ensure the current value of the password is retained
          var sCurrentValue = oInput.getValue();
          oInput.setValue(sCurrentValue);
        },
        LP_onTogglePasswordVisibility: function (oEvent) {
          this.SM_onTogglePasswordVisibility(oEvent)
        },

        FSM_userID: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        SM_onPressSave: async function () {
          const oFragModel = this.getView().getModel("LoginViewModel");

          // Step 1: Validate User ID & Username, then send OTP
          if (!oFragModel.getProperty("/frgOtpVisible")) {
            if (
              !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FSM_id_userIdInput"), "ID") ||
              !utils._LCvalidateName(sap.ui.getCore().byId("FSM_id_userNameInput"), "ID")
            ) {
              MessageToast.show(this.i18nModel.getText("validateUser"));
              return;
            }

            try {
              this.getBusyDialog();
              await this.ajaxCreateWithJQuery("SendOTP", {
                EmployeeID: oFragModel.getProperty("/frgUserId"),
                EmployeeName: oFragModel.getProperty("/frgUserName"),
                Type: "OTP"
              }).then((response) => {
                if (response.success === true) {
                  this.closeBusyDialog();
                  MessageToast.show(this.i18nModel.getText("sentOTP"));
                  sap.ui.getCore().byId("FSM_id_userIdInput").setEditable(false);
                  sap.ui.getCore().byId("FSM_id_userNameInput").setEditable(false);
                  oFragModel.setProperty("/frgOtpVisible", true); oFragModel.setProperty("/frgOtp", ""); oFragModel.setProperty("/frgOtpVerified", false);

                  // Reset OTP verification flag
                } else {
                  this.closeBusyDialog();
                  MessageToast.show(this.i18nModel.getText("errorMsguser"));
                }
              }).catch(() => {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("errorMsguser"));
              });
            } catch (error) {
              MessageToast.show(this.i18nModel.getText("errorMsguser"));
            }
            return;
          }

          // Step 2: Verify OTP and reset password validation logic
          if (!oFragModel.getProperty("/frgOtpVerified")) {
            if (!oFragModel.getProperty("/frgOtp")) {
              MessageToast.show(this.i18nModel.getText("rqForotp"));
              return;
            }

            try {
              this.getBusyDialog();
              await this.ajaxReadWithJQuery("LoginDetails", {
                EmployeeID: oFragModel.getProperty("/frgUserId"),
                EmployeeName: oFragModel.getProperty("/frgUserName"),
                OTP: oFragModel.getProperty("/frgOtp")
              }).then((response) => {
                if (response.success === true) {
                  this.closeBusyDialog();
                  oFragModel.setProperty("/continue", this.i18nModel.getText("save"));
                  MessageToast.show(this.i18nModel.getText("verifiedOTP"));
                  sap.ui.getCore().byId("FSM_id_userIdInput").setEditable(false);
                  sap.ui.getCore().byId("FSM_id_userNameInput").setEditable(false);
                  sap.ui.getCore().byId("FSM_id_otpInput").setEditable(false);
                  oFragModel.setProperty("/frgOtpVerified", true); oFragModel.setProperty("/frgNewPasswordVisible", true); oFragModel.setProperty("/frgConfirmPasswordVisible", true);
                  //  oFragModel.setProperty("/Setvisibleuser", true);
                } else {
                  this.closeBusyDialog();
                  MessageToast.show(this.i18nModel.getText("invalidOTP"));
                  oFragModel.setProperty("/frgOtpVerified", false); // Ensure unsuccessful verification doesn't trigger password step
                }
              }).catch(() => {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("invalidOTP"));
                oFragModel.setProperty("/frgOtpVerified", false);
              });
            } catch (error) {
              MessageToast.show(this.i18nModel.getText("invalidOTP"));
              oFragModel.setProperty("/frgOtpVerified", false);
            }
            return;
          }

          // Step 3: Validate Passwords & Update
          const oNewPwInput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          if (!utils._LCvalidatePassword(oNewPwInput, "ID")) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          if (oFragModel.getProperty("/frgNewPassword") !== oFragModel.getProperty("/frgConfirmPassword")) {
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          }
          //  EmployeeName: sap.ui.getCore().byId("FSM_id_setusername").getValue()
          try {
            this.getBusyDialog();
            await this.ajaxUpdateWithJQuery("LoginDetails", {
              data: { Password: btoa(sap.ui.getCore().byId("FSM_id_newPasswordInput").getValue()) },
              filters: { EmployeeID: sap.ui.getCore().byId("FSM_id_userIdInput").getValue() }
            }).then((response) => {
              if (response.success === true) {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("updatepassword"));

                // Reset form state after successful password update
                sap.ui.getCore().byId("FSM_id_SaveBTN").setText(this.i18nModel.getText("continue"));
                sap.ui.getCore().byId("FSM_id_confirmPasswordInput").setValueState("None")
                oFragModel.setProperty("/frgUserId", ""); oFragModel.setProperty("/frgUserName", "");
                oFragModel.setProperty("/frgOtp", ""); oFragModel.setProperty("/frgOtpVisible", false); oFragModel.setProperty("/frgOtpVerified", false); oFragModel.setProperty("/frgNewPassword", ""); oFragModel.setProperty("/frgConfirmPassword", ""); oFragModel.setProperty("/frgNewPasswordVisible", false); oFragModel.setProperty("/frgConfirmPasswordVisible", false);
                //  oFragModel.setProperty("/Setvisibleuser", false);
                //  oFragModel.setProperty("/SetUser", "");

                if (this.oPassforgot) {
                  this.oPassforgot.close();
                }
              } else {
                this.closeBusyDialog();
                MessageToast.show("An error occurred: " + response.message);
              }
            }).catch(() => {
              this.closeBusyDialog();
              MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            });
          } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
        },
        FSM_OnsendOTP: function () {
          this.SM_onPressSave()
        },
        OnOTPverify: function () {
          this.SM_onPressSave()
        },

        FSM_onConfirm: function () {
          const oFragModel = this.getView().getModel("LoginViewModel");
          if (oFragModel.getProperty("/frgNewPassword") !== oFragModel.getProperty("/frgConfirmPassword")) {
            sap.ui.getCore().byId("FSM_id_confirmPasswordInput").setValueState("Error")
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          } else {
            sap.ui.getCore().byId("FSM_id_confirmPasswordInput").setValueState("None")
          }
        },
        FSM_onConfirmPass: function () {
          this.SM_onPressSave()
        },
      }
    );
  }
);
