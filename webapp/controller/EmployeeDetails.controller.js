sap.ui.define([
    "./BaseController", "sap/m/MessageToast", "../model/formatter"],
    function (BaseController, MessageToast, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                try {
                    var LoginFunction = await this.commonLoginFunction("EmployeeDetails");
                    if (!LoginFunction) return;

                    this.getBusyDialog();
                    if (oEvent.getParameter("arguments").sPath === 'EmployeeDetails') {
                        this.onClearEmployeeDetails(); // this will now work as expected
                    }
                    this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                    this.getView().getModel("LoginModel").setProperty("/HeaderName", "Employee Details");
                    // common role get call
                    // this.CommonReadCall();
                    this.Emp_det_onSearch();
                    this.closeBusyDialog();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
                this.initializeBirthdayCarousel();
            },

            Emp_det_onSearch: async function () {
                try {
                      this.getBusyDialog();
                    const aFilterItems = this.byId("ED_id_FilterBar").getFilterGroupItems();
                    // Check if the user is an Admin ,HR,HR Manager
                    if(this.getView().getModel("LoginModel").getProperty("/Role") === "Admin" || this.getView().getModel("LoginModel").getProperty("/Role") === "HR" || this.getView().getModel("LoginModel").getProperty("/Role") === "HR Manager") {
                        var params = {}; // Initialize with empty object for Admin
                    }else{
                        var params = {ManagerID: this.getView().getModel("LoginModel").getProperty("/EmployeeID")}; // Initialize with ManageID
                    }

                    // Collect parameters from filter bar
                    aFilterItems.forEach(function (oItem) {
                        const oControl = oItem.getControl();
                        const sKey = oItem.getName();

                        if (oControl && typeof oControl.getValue === "function") {
                            const sValue = oControl.getValue().trim();
                            if (sValue) {
                                params[sKey] = sValue;
                            }
                        }
                    });
                    await this._fetchCommonData("EmployeeDetails", "sEmployeeDetails", params); // Fetch all
                    const allData = this.getView().getModel("sEmployeeDetails").getData();
                    // Now apply filters manually
                    let filteredData = allData.filter((item) => {
                        let match = true;
                        for (let key in params) {
                            if (key === "Type") {
                                if (params.Type === "Trainee") {
                                    match = match && item.EmployeeID.startsWith("KT-T");
                                } else if (params.Type === "Employee") {
                                    match = match && item.EmployeeID.startsWith("KT") && !item.EmployeeID.startsWith("KT-T");
                                }
                            } else {
                                if (item[key] == null || !item[key].toString().toLowerCase().includes(params[key].toLowerCase())) {
                                    match = false;
                                }
                            }
                        }
                        return match;
                    });
                    // Set filtered data
                    this.getView().getModel("sEmployeeDetails").setData(filteredData);
                    this.closeBusyDialog();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            onClearEmployeeDetails: function () {
                var aFilterItems = this.byId("ED_id_FilterBar").getFilterGroupItems();
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

            CommonReadCall: async function () {
                await this._fetchCommonData("EmployeeDetails", "FilterEmployeeDetails", {});
            },

            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.CommonLogoutFunction();
                this.getRouter().navTo("RouteLoginPage");
            },

            ED_onPressEmployeeRow: function (oEvent) {
                var EmployeeID = oEvent.getSource().getBindingContext("sEmployeeDetails").getProperty("EmployeeID");
                var EmployeeRole = oEvent.getSource().getBindingContext("sEmployeeDetails").getProperty("Role");
                this.getRouter().navTo("SelfService", {
                    sPath: EmployeeID,
                    Role: EmployeeRole
                });
            }


        });
    });