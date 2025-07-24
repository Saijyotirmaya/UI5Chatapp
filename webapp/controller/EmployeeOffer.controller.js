sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            Formatter: Formatter,
            onInit: function () {
                // Calculate max date as 18 years before today
                var today = new Date();
                var maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                var oDateModel = new sap.ui.model.json.JSONModel();
                oDateModel.setData({ maxDate: maxDate, focusedDate: new Date(2000, 0, 1), minDate: new Date(1950, 0, 1) });
                this.getView().setModel(oDateModel, "controller");
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                var LoginFunction = await this.commonLoginFunction("EmployeeOffer");
                if (!LoginFunction) return;
                this.getBusyDialog();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.byId("EO_id_OnboardBtn").setEnabled(false);
                this.byId("EO_id_RejectBtn").setEnabled(false);
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("pageTitleemployee"));
                this.oValue = oEvent.getParameter("arguments").valueEmp;
                this.Filter = true;
                if (this.oValue === "EmployeeOffer") {
                    this.readCallForEmployeeOffer("");
                    this.EO_onPressClear();
                }
                else {
                    this.EO_onSearch();
                }

                this._makeDatePickersReadOnly(["EO_id_JoiningDate"]);
                var oRoleModel = this.getView().getModel("RoleModel");
                if (oRoleModel) {
                    var aRoles = oRoleModel.getData();
                    // Filter out "Contractor" and "Trainee" roles
                    aRoles = aRoles.filter(function (role) {
                        return role.Role !== "Contractor" && role.Role !== "Trainee";
                    });
                    // Add empty role at the top if not present
                    if (!aRoles.length || aRoles[0].Role !== "") {
                        aRoles.unshift({ Role: "" });
                    }
                    oRoleModel.setData(aRoles);
                }
                this.initializeBirthdayCarousel();
            },
           getGroupHeader: function (oGroup) {
  const groupStyles = {
    "Onboarded": {
      background: "linear-gradient(to bottom right, rgba(141, 239, 226, 0.6), rgba(129, 179, 240, 0.6))",
      textColor: "#000000"
    },
    "Saved": {
      background: "linear-gradient(to bottom right, rgba(96, 249, 193, 0.6), rgba(122, 247, 247, 0.6))",
      textColor: "#000000"
    },
    "Rejected": {
      background: "linear-gradient(to bottom right, rgba(235, 115, 115, 0.6), rgba(199, 108, 108, 0.6))",
      textColor: "#ffffff"
    },
    "Offer Sent": {
      background: "linear-gradient(to bottom right, rgba(87, 208, 229, 0.6), rgba(109, 187, 251, 0.6))",
      textColor: "#000000"
    },
    "New": {
      background: "linear-gradient(to bottom right, rgba(64, 77, 80, 0.6), rgba(90, 100, 110, 0.6))",
      textColor: "#ffffff"
    }
  };

  const defaultStyle = {
    background: "linear-gradient(to bottom right, rgba(200, 200, 200, 0.4), rgba(220, 220, 220, 0.4))",
    textColor: "#000000"
  };

  const currentStyle = groupStyles[oGroup.key] || defaultStyle;

  const oHeader = new sap.m.GroupHeaderListItem({
    title: oGroup.key
  });

  oHeader._customBackground = currentStyle.background;
  oHeader._customTextColor = currentStyle.textColor;

  oHeader.addEventDelegate({
    onAfterRendering: function () {
      this.$().css("background", this._customBackground);
      this.$().css("color", this._customTextColor);
    }
  }, oHeader);

  return oHeader;
}
,
            
            // onAfterRendering: function () {
            //     var oTable = this.byId("EO_id_TableEOffer");

            //     setTimeout(function () {
            //         // Get all group headers
            //         var $groupHeaders = oTable.$().find(".sapMGHLI");

            //         $groupHeaders.each(function () {
            //             var $header = $(this);
            //             var titleText = $header.text().toLowerCase();

            //             // Remove all existing group styles
            //             $header.removeClass(function (index, className) {
            //                 return (className.match(/(^|\s)group-\S+/g) || []).join(' ');
            //             });

            //             // Add class based on title
            //             if (titleText.includes("active")) {
            //                 $header.addClass("group-active");
            //             } else if (titleText.includes("inactive")) {
            //                 $header.addClass("group-inactive");
            //             } else if (titleText.includes("onboard")) {
            //                 $header.addClass("group-onboarded");
            //             } else if (titleText.includes("reject")) {
            //                 $header.addClass("group-rejected");
            //             } else if (titleText.includes("new")) {
            //                 $header.addClass("group-new");
            //             } else {
            //                 $header.addClass("group-default");
            //             }
            //         });
            //     }, 0);
            // }
            // ,
            // Read call for employee offer data
            readCallForEmployeeOffer: async function (filter) {
                try {
                    this.getBusyDialog();
                    await this.ajaxReadWithJQuery("EmployeeOffer", filter).then((oData) => {
                        var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                        this.getView().setModel(new JSONModel(offerData), "EmployeeOfferModel");
                        if (this.Filter) {
                            var oFilterData = [...new Map(offerData.filter(item => item.ConsultantName && item.ConsultantName.trim() !== "").map(item => [item.ConsultantName.trim(), item])).values()];
                            this.getView().setModel(new JSONModel(oFilterData), "EmployeeOfferModelInitial");
                            this.getView().getModel("EmployeeOfferModelInitial").refresh(true);
                            this.Filter = true;
                        }
                        this.closeBusyDialog();
                    }).catch((oError) => {
                        this.closeBusyDialog();
                        MessageBox.error("Error while reading the employee offer details");
                    });
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },
            //Back to tile page
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            //Logout function
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
                this.CommonLogoutFunction();
            },
            //Navigation function
            EO_onPressEmployee: function (oEvent) {
                this.closeBusyDialog();
                var oParValue, value;
                if (oEvent.getSource().getId().lastIndexOf("EO_id_AddEOffBut") !== -1) {
                    oParValue = "CreateOfferFlag"
                    value = "CreateOffer";
                } else {
                    oParValue = oEvent.getSource().getBindingContext("EmployeeOfferModel").getModel().getData()[oEvent.getSource().getBindingContextPath().split("/")[1]].ID
                    value = "UpdateOffer";
                }
                this.getRouter().navTo("RouteEmployeeOfferDetails", {
                    sParOffer: oParValue,
                    sParEmployee: value
                });
            },
            //Onboard call
            EO_onOnboardPress: async function () {
                this.onHandleEmployeeAction("Onboarded", "onBoardEmployee");
                this._fetchCommonData("EmployeeDetailsData", "empModel");

            },
            //reject call
            EO_onRejectPress: function () {
                this.onHandleEmployeeAction("Rejected", "onRejectEmployee");
            },
            //Search call for filtering
            EO_onSearch: function () {
                this.getBusyDialog();
                var aFilterItems = this.byId("EO_id_FilterBar").getFilterGroupItems();
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    var sValue = oItem.getName();
                    if (oControl && oControl.getValue()) {
                        if (sValue === "JoiningDate") {
                            params["startDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[0]));
                            params["endDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[1]));
                        } else {
                            params[sValue] = oControl.getValue();
                        }
                    }
                });
                if (params && Object.keys(params).length > 0) {
                    this.Filter = false;
                }
                this.readCallForEmployeeOffer(params); // after filtering read call
                this.EO_ButtonVisibility();
            },
            // Update the status to 'Rejected' after confirmation
            onRejectEmployee: async function () {
                this.getBusyDialog();
                await this.updateCallForEmployeeOffer("Rejected");
                this.EO_ButtonVisibility();

            },
            //Common button visibility
            EO_ButtonVisibility: function () {
                this.byId("EO_id_TableEOffer").removeSelections(true);
                this.byId("EO_id_OnboardBtn").setEnabled(false);
                this.byId("EO_id_RejectBtn").setEnabled(false);
            },
            //Clear filter function
            EO_onPressClear: function () {
                var aFilterItems = this.byId("EO_id_FilterBar").getFilterGroupItems();
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl(); // Get the associated control
                    if (oControl) {
                        if (oControl.setValue) {
                            oControl.setValue(""); // Clear value for ComboBox, Input, DatePicker, etc.
                        }
                        if (oControl.setSelectedKey) {
                            oControl.setSelectedKey(""); // Reset selection for dropdowns
                        }
                        if (oControl.setSelected) {
                            oControl.setSelected(false); // Reset selection for Checkboxes
                        }
                    }
                });
            },
            //Common  reject or onboard action handling
            onHandleEmployeeAction: function (status, actionMethod) {
                var oSelectedData = this.byId("EO_id_TableEOffer").getSelectedItem().getBindingContext("EmployeeOfferModel").getObject();
                this.oSelectedRow = oSelectedData;
                var sName = oSelectedData.Salutation + " " + oSelectedData.ConsultantName;
                var that = this;
                // Build message and title
                var sMessage = (status === "Onboarded")
                    ? that.i18nModel.getText("confirmOnboard", [sName])
                    : that.i18nModel.getText("confirmReject", [sName]);
                var sTitle = (status === "Onboarded")
                    ? that.i18nModel.getText("confirmTitleOnboard")
                    : that.i18nModel.getText("confirmTitleReject");
                // Call reusable confirmation dialog
                that.showConfirmationDialog(
                    sTitle,
                    sMessage,
                    function () { // onConfirm
                        if (status === "Onboarded") {
                            const oEmployeeDetailsModel = new sap.ui.model.json.JSONModel({   //Common json data passing from frontend all record will be created from backend
                                ID: oSelectedData.ID,
                                Salutation: oSelectedData.Salutation,
                                EmployeeName: oSelectedData.ConsultantName,
                                Gender: oSelectedData.Gender,
                                JoiningDate: oSelectedData.JoiningDate.split('T')[0],
                                Role: " ",
                                DateOfBirth: "",
                                CompanyEmailID: "",
                                EmployeeEmail: oSelectedData.EmployeeEmail,
                                PermanentAddress: oSelectedData.ConsultantAddress,
                                CorrespondenceAddress: oSelectedData.ConsultantAddress,
                                Country: "India",
                                CountryCode: oSelectedData.CountryCode,
                                BaseLocation: oSelectedData.BaseLocation,
                                AppraisalDate: oSelectedData.JoiningDate.split('T')[0],
                                Designation: oSelectedData.Designation,
                                Department: oSelectedData.Department,
                                BranchCode: oSelectedData.BranchCode,
                                STDCode: "+91",
                                MobileNo: "",
                                ManagerID: "",
                                ManagerName: "",
                                BloodGroup: "",
                                EmployeeStatus: "Active",
                                CTC: oSelectedData.CTC,
                                Currency: "INR",
                                JoiningBonus: oSelectedData.JoiningBonus,
                                BasicSalary: oSelectedData.BasicSalary,
                                HRA: oSelectedData.HRA,
                                IncomeTax: oSelectedData.IncomeTax,
                                MedicalInsurance: oSelectedData.MedicalInsurance,
                                Gratuity: oSelectedData.Gratuity,
                                VariablePay: oSelectedData.VariablePay,
                                CostofCompany: oSelectedData.CostofCompany,
                                Total: oSelectedData.Total,
                                EmployeePF: oSelectedData.EmployeePF,
                                EmployerPF: oSelectedData.EmployerPF,
                                TotalDeduction: oSelectedData.TotalDeduction,
                                EmploymentBond: oSelectedData.EmploymentBond,
                                SpecailAllowance: oSelectedData.SpecailAllowance,
                                PT: oSelectedData.PT,
                                GrossPay: oSelectedData.GrossPay,
                                VariablePercentage: oSelectedData.VariablePercentage,
                                GrossPayMontly: oSelectedData.GrossPayMontly,
                                HikePercentage: oSelectedData.HikePercentage,
                                EffectiveDate: oSelectedData.JoiningDate.split('T')[0],
                            });
                            that.getView().setModel(oEmployeeDetailsModel, "oEmpolyeeDetailsModel");
                            that._commonFragmentOpenOffer(that, "OnboardEmployee");
                        } else {
                            that[actionMethod]();
                        }
                    },
                    function () {
                        that.EO_ButtonVisibility();
                    },
                    that.i18nModel.getText("OkButton"),
                    that.i18nModel.getText("CancelButton")
                );
            },
            //Common Dialog opening function
            _commonFragmentOpenOffer: function (name, fragmentName) {
                if (!this.oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.OnboardEmployee",
                        controller: this
                    }).then(dialog => {
                        this.oDialog = dialog;
                        this.getView().addDependent(this.oDialog);
                        //sap.ui.getCore().byId("OEF_id_DateofBirth").setMaxDate(new Date());
                        this._FragmentDatePickersReadOnly(["OEF_id_DateofBirth"]);
                        this.oDialog.open();
                    })
                } else {
                    this._FragmentDatePickersReadOnly(["OEF_id_DateofBirth"]);
                    this.oDialog.open();
                }
            },
            OEF_onPressClose: function () {
                const fields = ["OEF_id_CompanyMail", "OEF_id_DateofBirth", "OEF_id_Mobile", "OEF_id_EmployeeRole", "OEF_id_Country", "OEF_id_PAddress", "OEF_id_CAddress", "OEF_id_blood", "OEF_id_Manager"];
                fields.forEach(field => {
                    sap.ui.getCore().byId(field).setValueState("None");
                });
                this.oDialog.close();
                this.EO_ButtonVisibility();
            },
            //Validate date 
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            //Validate email
            validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            //Validate mobile 
            validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
            },
            //Validate comobox
            validateCombo: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },
            validateMandetory: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent)
            },
            //Onboard function
            OEF_onPressOnBoard: function (oEvent) {
                try {
                    var oModel = this.getView().getModel("oEmpolyeeDetailsModel").getData();
                    if (utils._LCstrictValidationComboBox(sap.ui.getCore().byId("OEF_id_EmployeeRole"), "ID") && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("OEF_id_Country"), "ID") && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("idSelect"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("OEF_id_CompanyMail"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("OEF_id_PAddress"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("OEF_id_CAddress"), "ID")
                        && utils._LCvalidateDate(sap.ui.getCore().byId("OEF_id_DateofBirth"), "ID") && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("OEF_id_blood"), "ID") && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("OEF_id_STDCode"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("OEF_id_Mobile"), "ID") && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("OEF_id_Manager"), "ID")) {
                        var oPayload = {
                            tableName: "EmployeeDetails",
                            data: oModel
                        };
                        oModel.DateOfBirth = oModel.DateOfBirth.split("/").reverse().join('-');
                        oModel.ManagerID = sap.ui.getCore().byId("OEF_id_Manager").getSelectedItem().getAdditionalText();
                        this.getBusyDialog();
                        this.ajaxCreateWithJQuery("EmployeeDetails", oPayload).then((oData) => {
                            if (oData.success) {
                                this.EO_onSearch();
                                this.oDialog.close();
                                MessageToast.show(this.i18nModel.getText("onBoardSuccess"));
                                this.getView().getModel("empModel").refresh(true);

                            } else {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                            }
                            this.closeBusyDialog();
                        }).catch((error) => {
                            this.closeBusyDialog();
                            MessageToast.show(error.message || error.responseText);
                        });
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));

                }
            },
            //Common update function
            updateCallForEmployeeOffer: async function (oStatus) {
                try {
                    this.getBusyDialog();
                    this.oSelectedRow.Status = oStatus;
                    var oModelOffer = {
                        "data": this.oSelectedRow,
                        "filters": {
                            "ID": this.oSelectedRow.ID
                        }
                    };
                    // call for EmployeeOffer
                    await this.ajaxUpdateWithJQuery("EmployeeOffer", oModelOffer).then((oData) => {
                        if (oData.success) {
                            var sSuccessMessage = (oStatus === "Onboarded")
                                ? this.i18nModel.getText("onBoardSuccess")
                                : this.i18nModel.getText("offerEmpReject");
                            MessageToast.show(sSuccessMessage);
                            this.EO_onSearch();
                            this.oDialog.close();
                            this.closeBusyDialog();
                        }
                    }).catch((error) => {
                        this.oDialog.close();
                        this.closeBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    this.closeBusyDialog();
                    this.oDialog.close();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },
            EO_onSelectionRadRowE: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                // If an item is selected, check the status and update button visibility accordingly
                if (oSelectedItem) {
                    var sStatus = oSelectedItem.getBindingContext("EmployeeOfferModel").getProperty("Status");
                    var isDisabled = sStatus === "Onboarded" || sStatus === "Rejected";
                    this.byId("EO_id_OnboardBtn").setEnabled(!isDisabled);
                    this.byId("EO_id_RejectBtn").setEnabled(!isDisabled);
                }
            },
            //Base location change code change
            EO_onBaseLocationChange: function (oEvent) {
                this.handleBaseLocationChange(
                    oEvent,
                    "BaseLocationModel",         // Source model
                    "oEmpolyeeDetailsModel",     // Target model
                    "/BranchCode"                // Path in target model
                );
            },
            OE_onChangeCountry: function (oEvent) {
                this.onCountryChange(oEvent, { stdCodeCombo: "OEF_id_STDCode", baseLocationCombo: "idSelect", branchInput: "OE_id_BranchInput", mobileInput: "OEF_id_Mobile" });
            }


        });
    });