sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/model/json/JSONModel"
  ],
  function (BaseController,
    MessageToast,
    utils,
    JSONModel) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.TilePage",
      {
        onInit: function () {
          this._autoScrollTimer = null;
          this.getRouter()
            .getRoute("RouteTilePage")
            .attachMatched(this._onRouteMatched, this);
        },

        onExit: function () {
          // 3. Final, essential cleanup
          if (this._autoScrollTimer) {
            clearInterval(this._autoScrollTimer);
          }
        },

        _onRouteMatched: async function () {
          if (!this.that) this.that = this.getOwnerComponent().getModel("ThisModel")?.getData().that;
          var LoginFunction = await this.commonLoginFunction("TilePage");
          if (!LoginFunction) return;
          this.scrollToSection("id_ObjectPageLayoutTile", "id_Sectiontile");
          this.getBusyDialog();
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          await this._fetchCommonData("getCompanyInvoice", "CompanyInvoiceModelData");
          this.getView().getModel("CompanyInvoiceModelData").setProperty("/length", this.getView().getModel("CompanyInvoiceModelData").getData().length);
          await this._fetchCommonData("getMSAEndingSoon", "MSASOWModel");
          this.getView().getModel("MSASOWModel").setProperty("/length", this.getView().getModel("MSASOWModel").getData().length);
          this.AppVisibilityReadCall();
          await this._fetchCommonData("AllLoginDetails", "EmpModel");
          await this._fetchCommonData("EmployeeDetails", "EmpDetails");
          // await this._fetchCommonData("getMessagesBetweenUsers", "MessageModel");
          var oChatModel = new JSONModel({
            messages: [],
            messageText: "",
            selectedEmployee: null
          });
          this.getView().setModel(oChatModel);
          var oData = {
            messages: [],         // For the input box chat bubbles
            current_chat: [],
            current_room: "",     // ReceiverID
            username: "",
            filteredEmployees: []
          };

          var oModel = new JSONModel(oData);
          this.getView().setModel(oModel, "chat");
          sap.ui.getCore().setModel(oModel, "chat");
          const oLoginModel = this.getView().getModel("LoginModel");
          const sCurrentUserID = oLoginModel.getProperty("/EmployeeID");

          // Get original employee data
          const oEmpModel = this.getView().getModel("EmpDetails");
          const aAllEmployees = oEmpModel.getData();

          // Filter out current user
          const aFilteredEmployees = aAllEmployees.filter(function (oEmployee) {
            return oEmployee.EmployeeID !== sCurrentUserID;

            // read all messages
    
          });

          // Update model with filtered list
          this.getView().getModel("chat").setProperty("/filteredEmployees", aFilteredEmployees);

          this.CreateEmployeeModel();
          this.initializeBirthdayCarousel();
        },

        onPressCC: function () {
          MessageToast.show("Implementation in progress");
        },


        CreateEmployeeModel: function () {
          var empData = this.getView().getModel("EmpModel").getData() || [];
          var filteredData = empData.filter(function (item) {
            return item.Role !== "Trainee" && item.Role !== "Contractor";
          });
          var oFilteredModel = new JSONModel(filteredData);
          this.getOwnerComponent().setModel(oFilteredModel, "EmployeeModel");
        },

        AppVisibilityReadCall: async function () {
          try {
            const oLoginModel = this.getView().getModel("LoginModel");
            if (!oLoginModel) return;

            const { Role } = oLoginModel.getData();
            const oData = await this.ajaxReadWithJQuery(
              "AppVisibility",
              { Role },
              []
            );
            this.closeBusyDialog();

            const firstEntry = Array.isArray(oData.data)
              ? oData.data[0]
              : oData.data;
            this.getOwnerComponent().setModel(
              new JSONModel(firstEntry),
              "AppVisibilityModel"
            );

            const tileNames = ["Home", "Timesheet", "Payslip", "OfferGeneration", "Invoice", "Quotation", "Expense", "ManageAsset", "Recruitment"];

            const tileKeys = firstEntry.TileKey?.split(",") || [];
            const tileMapping = tileNames.reduce((map, name, i) => {
              map[name] = tileKeys[i] || "0";
              return map;
            }, {});

            this.getView().setModel(new JSONModel(tileMapping), "TileAccessModel");
          } catch (oError) {
            MessageToast.show("Error in AppVisibilityReadCall");
          }
        },

        RP_onUseridpress: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        RP_onUsername: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        RP_onChangnewpass: function (oEvent) {
          utils._LCvalidatePassword(oEvent);
        },
        RP_onChangcomfirmpass: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        RP_onSelectUser: function () {
          var that = this;
          var oEmpCombo = sap.ui.getCore().byId("RP_id_userid"); // User ID input field
          var selectedKey = oEmpCombo.getSelectedKey(); // Get selected user ID

          if (!selectedKey) {
            oEmpCombo.setValueState("Error");
            return;
          } else {
            oEmpCombo.setValueState("None");
          }
          var oEmpModel = this.getView().getModel("EmpModel"); // Fetch employee model
          if (!oEmpModel) {
            MessageToast.show(that.i18nModel.getText("noemp"));
            return;
          }
          var aEmployees = oEmpModel.getProperty("/"); // Get employee data array
          // Find selected employee by EmployeeID
          var selectedEmployee = aEmployees.find(function (emp) {
            return emp.EmployeeID === selectedKey;
          });
          if (selectedEmployee) {
            // Ensure FragmentModel exists
            var oFragmentModel = this.getView().getModel("FragmentModel");
            if (!oFragmentModel) {
              oFragmentModel = new JSONModel({});
              this.getView().setModel(oFragmentModel, "FragmentModel");
            }
            // Set EmployeeID and EmployeeName in the model
            oFragmentModel.setProperty(
              "/EmployeeID",
              selectedEmployee.EmployeeID
            );
            oFragmentModel.setProperty(
              "/EmployeeName",
              selectedEmployee.EmployeeName
            );
            // Automatically populate the username field
            var oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
            oUserNameInput.setValue(selectedEmployee.EmployeeName);
            oUserNameInput.setValueState("None");
            // Clear password fields
            sap.ui
              .getCore()
              .byId("RP_id_NewPW")
              .setValue("")
              .setValueState("None");
            sap.ui
              .getCore()
              .byId("RP_id_ConfirmPW")
              .setValue("")
              .setValueState("None");
          } else {
            MessageToast.show(that.i18nModel.getText("empnotfound"));
          }
        },
        TP_onupdatepress: function () {
          var oView = this.getView();
          // Ensure user selection is reset before opening
          var oFragmentModel = this.getView().getModel("FragmentModel");
          if (oFragmentModel) {
            oFragmentModel.setData({ EmployeeID: "", EmployeeName: "" });
          }
          if (!this.oUpdatePass) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.ResetPassword",
              controller: this,
            }).then(
              function (oUpdatePass) {
                this.oUpdatePass = oUpdatePass;
                oView.addDependent(this.oUpdatePass);
                this.oUpdatePass.open();
              }.bind(this)
            );
          } else {
            this.oUpdatePass.open();
          }
        },
        RP_onPressCanclePW: function () {
          sap.ui
            .getCore().byId("RP_id_userid").setValue("").setSelectedKey("").setValueState("None");
          sap.ui.getCore().byId("RP_id_userid").setSelectedKey(null);
          var oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
          // Reset all input fields
          oUserNameInput.setValue("");
          oUserNameInput.setValueState("None");
          sap.ui.getCore().byId("RP_id_NewPW").setValue("").setValueState("None");
          sap.ui.getCore().byId("RP_id_ConfirmPW").setValue("").setValueState("None");
          // Close dialog
          if (this.oUpdatePass) {
            this.oUpdatePass.close();
          }
        },
        RP_onPressSetSave: async function () {
          const oUserIdInput = sap.ui.getCore().byId("RP_id_userid");
          const oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
          const oNewPwInput = sap.ui.getCore().byId("RP_id_NewPW");
          const oConfirmPwInput = sap.ui.getCore().byId("RP_id_ConfirmPW");
          const frgUserId = oUserIdInput.getValue();
          const newPassword = oNewPwInput.getValue();
          const confirmPassword = oConfirmPwInput.getValue();
          // Validate inputs
          if (
            !utils._LCvalidateMandatoryField(oUserIdInput, "ID") ||
            !utils._LCvalidateName(oUserNameInput, "ID") ||
            !utils._LCvalidatePassword(oNewPwInput, "ID") ||
            !utils._LCvalidateMandatoryField(oConfirmPwInput, "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          if (newPassword !== confirmPassword) {
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("Error");
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          }
          try {
            this.getBusyDialog();
            const response = await this.ajaxUpdateWithJQuery("LoginDetails", {
              data: {
                Password: btoa(newPassword),
              },
              filters: {
                EmployeeID: frgUserId,
              },
            });
            if (response.success === true) {
              this.closeBusyDialog();
              sap.ui.getCore().byId("RP_id_userid").setSelectedKey(null);
              sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("None");
              oUserIdInput.setValue("");
              oUserNameInput.setValue("");
              oNewPwInput.setValue("");
              oConfirmPwInput.setValue("");
              const oModel = this.getView().getModel("EmpModel");
              if (oModel) {
                oModel.refresh(true);
              }
              if (this.oUpdatePass) {
                this.oUpdatePass.close();
              }

              MessageToast.show(this.i18nModel.getText("updatepassword"));
            } else {
              MessageToast.show("Failed to update password.");
            }
          } catch (err) {
            MessageToast.show("An error occurred: " + err.message);
          }
        },
        RP_onComPass: function () {
          const oNewPwInput = sap.ui.getCore().byId("RP_id_NewPW");
          const oConfirmPwInput = sap.ui.getCore().byId("RP_id_ConfirmPW");
          const newPassword = oNewPwInput.getValue();
          const confirmPassword = oConfirmPwInput.getValue();
          if (newPassword !== confirmPassword) {
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("Error");
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          } else {
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("None");
          }
        },
        //password visibility change
        RP_onTogglePasswordVisibility: function (oEvent) {
          var oInput = oEvent.getSource();
          var sType = oInput.getType() === "Password" ? "Text" : "Password";
          oInput.setType(sType);

          // Toggle the value help icon properly without losing the value
          var sIcon =
            sType === "Password" ? "sap-icon://show" : "sap-icon://hide";
          oInput.setValueHelpIconSrc(sIcon);

          // Ensure the current value of the password is retained
          var sCurrentValue = oInput.getValue(); // Get the current value before toggling
          oInput.setValue(sCurrentValue);
        },

        TileV_onpressTrainee: function () {
          this.getRouter().navTo("RouteTrainee", { value: "Trainee" });
        },
        TileV_onPressOffer: function () {
          //this.getBusyDialog();
          this.getRouter().navTo("RouteEmployeeOffer", {
            valueEmp: "EmployeeOffer",
          });
        },
        TileV_onpresslistofholidays: function () {
          this.getRouter().navTo("RouteListofholidays");
        },
        TileV_onpressIDCARD: function () {
          this.getRouter().navTo("RouteIDCardApplication");
        },
        TileV_onpressLeave: function () {
          this.getRouter().navTo("RouteAdminApplyLeave");
        },
        TileV_onpressConsultantInvoice: function () {
          this.getRouter().navTo("RouteConsultantInvoiceApplication");
        },
        TileV_onpressContract: function () {
          this.getRouter().navTo("RouteContract", { valueEmp: "Contract" });
        },
        TileV_onPressAdminPaySlip: function () {
          this.that.getBusyDialog();
          this.getRouter().navTo("RouteAdminPaySlip");
        },
        TileV_onpressSelfservice: function () {
          this.getRouter().navTo("SelfService", { sPath: "SelfService", Role: "Role" });
        },
        TileV_onpressInbox: function () {
          this.getRouter().navTo("RouteMyInbox", { sMyInBox: "MyInboxView" });
        },
        TileV_onpressInvoiceApp: function () {
          this.getRouter().navTo("RouteCompanyInvoice");
        },
        TileV_onpressQuotation: function () {
          sap.ui.core.BusyIndicator.show(0);
          this.getRouter().navTo("RouteQuotation");
        },
        TileV_onpressAssignment: function () {
          this.getRouter().navTo("RouteManageAssignment");
        }, TileV_onpresstimesheet: function () {
          this.getRouter().navTo("RouteTimesheet");
        },
        TileV_onPressTimesheetApp: function () {
          this.getRouter().navTo("RouteTimesheetApproval");
        },
        TileV_onPressGenerateSalary: function () {

          this.getRouter().navTo("RouteGenerateSalary");
        },
        TileV_onPressManagePayroll: function () {

          this.getRouter().navTo("RouteManagePayroll");
        },
        TileV_onpressEmployeeDetails: function () {
          this.getRouter().navTo("RouteEmployeeDetails", {
            sPath: "EmployeeDetails",
          });
        },
        TileV_onBackPress: function () {
          this.CommonLogoutFunction();
        },
        TileV_onpressAddCustomer: function () {
          this.getRouter().navTo("RouteManageCustomer", {
            value: "ManageCustomer",
          });
        },
        TileV_onpressMSA: function () {
          this.getRouter().navTo("RouteMSA");
        },
        TileV_onpressExpenseApp: function () {
          // this.getBusyDialog();
          this.getRouter().navTo("RouteExpensePage");
        },
        TileV_onPressManageSchemeUpload: function () {
          this.getRouter().navTo("RouteSchemeUpload", {
            value: "SchemeUpload",
          });
        },
        TileV_onPressIncomeAsset: function () {
          this.getRouter().navTo("RouteIncomeAsset");
        },
        TileV_onPressAssetAssignment: function () {
          this.getRouter().navTo("RouteAssetAssignment");
        },
        TileV_onPressHrQuotation: function () {
          this.getRouter().navTo("RouteHrQuotation");
        },
        TileV_MyAsset: function () {
          this.getRouter().navTo("MyAsset");

        },
        TileV_onpressPoApp: function () {
          this.getRouter().navTo("PurchaseOrder");
        },
        TileV_Recruitment: function () {
          this.getRouter().navTo("Recruitment");
        },
        TileV_RecruitementDashbord: function () {
          this.getRouter().navTo("AppliedCandidates");
        },
        onFloatingButtonPress: function () {
          // this.getRouter().navTo("RouteKTChat");
          var oView = this.getView();
          // Ensure user selection is reset before opening
          if (!this.Chatapp) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.KTChatApp",
              controller: this,
            }).then(
              function (Chatapp) {
                this.Chatapp = Chatapp;
                oView.addDependent(this.Chatapp);
                this.Chatapp.open();
              }.bind(this)
            );
          } else {
            this.Chatapp.open();
          }
        },
        onCloseDialog: function () {
          if (this.Chatapp) {
            this.Chatapp.close();
          }
        },

        OnPressNavigationMsaDet: function (oEvent) {
          var MsaID = oEvent.getSource().getBindingContext("MSASOWModel").getProperty("MsaID");
          this.getRouter().navTo("RouteMSAEdit", { sPath: MsaID })
        },

        CI_onPressInvoiceRow: function (oEvent) {
          var Path = encodeURIComponent(oEvent.getSource().getBindingContext("CompanyInvoiceModelData").getObject().InvNo);
          this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: Path });
        },
        changeName: function (oEvent) {
          var sName = oEvent.getSource().getValue();
          if (!sName.trim()) {
            MessageToast.show("Please enter your name.");
            return;
          }

          var oChatModel = sap.ui.getCore().getModel("chat");
          oChatModel.setProperty("/username", sName);
          MessageToast.show("Name set to: " + sName);
        },
        sendMessage: function () {
          const oInput = sap.ui.getCore().byId("messageInput1");
          const sText = oInput.getValue().trim();
          if (!sText) return;

          const oChatModel = this.getView().getModel("chat");
          const oLoginModel = this.getView().getModel("LoginModel");

          const sSenderID = oLoginModel.getProperty("/EmployeeID");
          const sSenderName = oLoginModel.getProperty("/EmployeeName");
          const sReceiverID = oChatModel.getProperty("/current_room");

          if (!sSenderID || !sReceiverID) {
            MessageToast.show("Please select a recipient first.");
            return;
          }

          const oPayload = {
            data: {
              SenderID: sSenderID,
              ReceiverID: sReceiverID,
              MessageText: btoa(sText)// Proper encoding
            }
          };

          this.ajaxCreateWithJQuery("ChatApplication", oPayload)
            .then(() => {
              // Update List model for chat bubble display
              const aMsgList = oChatModel.getProperty("/messages") || [];
              aMsgList.push({
                text: sText,
                sender: "me",
                time: new Date().toLocaleTimeString()
              });
              oChatModel.setProperty("/messages", aMsgList);
              oInput.setValue("");
            })
            .catch(function (err) {
              MessageToast.show("Failed to send message.");
              console.error(err);
            });
        },
        onPressGoToMaster: function (oEvent) {
          const oSelected = oEvent.getSource().getBindingContext("chat").getObject();
          const sReceiverID = oSelected.EmployeeID;
          const sReceiverName = oSelected.EmployeeName;

          const oChatModel = this.getView().getModel("chat");
          const oLoginModel = this.getView().getModel("LoginModel");

          const sSenderID = oLoginModel.getProperty("/EmployeeID");

          oChatModel.setProperty("/current_room", sReceiverID);
          oChatModel.setProperty("/currentReceiverName", sReceiverName);
          oChatModel.setProperty("/username", oLoginModel.getProperty("/EmployeeName"));
          oChatModel.setProperty("/messages", []); // Clear old
            // var oScrollContainer = sap.ui.getCore().byId("chatScrollContainer");
            //   oScrollContainer.scrollTo(0, 9999999999999);

          // Function to fetch messages
          const fetchMessages = () => {
            this.ajaxReadWithJQuery("getMessagesBetweenUsers", {
              SenderID: sSenderID,
              ReceiverID: sReceiverID
            }).then((response) => {
              const aServerMessages = response.results || [];

              const sSenderName = oLoginModel.getProperty("/EmployeeName"); // Logged-in user's name

              const aMessages = aServerMessages.map((msg) => {
                const decodedText = atob(msg.MessageText);
                const isMine = msg.Sender === sSenderName; // Now comparing names
                return {
                  text: decodedText,
                  sender: isMine ? "me" : "them",
                  time: new Date(msg.SentAt).toLocaleTimeString()
                };
              });

              const oTitle = sap.ui.getCore().byId("headerTitle");
              if (oTitle) oTitle.setText(sReceiverName);

              oChatModel.setProperty("/messages", aMessages);

            
            }).catch((err) => {
              MessageToast.show("Failed to load messages");
              console.error(err);
            });
          };
          fetchMessages();
          if (this.messagePollInterval) {
            clearInterval(this.messagePollInterval);
          }
          // Set new  interval 
          this.messagePollInterval = setInterval(fetchMessages, 1000);
        }

      }
    );
  }
);





