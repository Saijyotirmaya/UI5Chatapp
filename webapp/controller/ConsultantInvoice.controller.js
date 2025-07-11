sap.ui.define(
    [
        "./BaseController", //call base controller
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "../model/formatter",
    ],
    function(
        BaseController, JSONModel, MessageToast, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ConsultantInvoice", {
            onInit: function() {
                this.getRouter().getRoute("RouteConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function() {
                var LoginFUnction = await this.commonLoginFunction("ConsultantInvoice");
                if (!LoginFUnction) return;
                // Get i18n resource bundle
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                // Set header name in LoginModel
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("consultantInvoice"));
                this._makeDatePickersReadOnly(["CI_id_DatePicker"]);
                this.onClearAndSearch("CI_id_ConsultantInvoiceFilterBar"); // Clear and search function
                this.ContractReadCall();
                this.bDateRangeTriggered = false;
                this.initializeBirthdayCarousel();
            },

            ContractReadCall: async function() {
                try {
                    const oView = this.getView();
                    const userData = this.getOwnerComponent().getModel("LoginModel").getData();
                    let filterObj = {};

                    // Set role-based filters
                    if (userData.Role === "Contractor") {
                        oView.byId("CI_filterItem_EmployeeID").setVisible(false);
                        filterObj.EmployeeID = userData.EmployeeID;
                    } else {
                        oView.byId("CI_filterItem_EmployeeID").setVisible(true);
                        if (userData.Role === "Admin" || userData.Role === "Account Manager") {
                            this.logindata();
                        } else {
                            filterObj.EmployeeID = userData.EmployeeID;
                            this.logindata();
                        }
                    }

                    // Add financial year date range to filter
                    const currentYear = new Date().getFullYear();
                    let fyStart, fyEnd;
                    if (new Date().getMonth() >= 3) { // April or later
                        fyStart = new Date(currentYear, 3, 1); // April 1st
                        fyEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
                    } else {
                        fyStart = new Date(currentYear - 1, 3, 1); // April 1st last year
                        fyEnd = new Date(currentYear, 2, 31); // March 31st this year
                    }

                    const formatDate = (date) => date.toISOString().split("T")[0];
                    filterObj.InvoiceStartDate = formatDate(fyStart);
                    filterObj.InvoiceEndDate = formatDate(fyEnd);

                    this.getBusyDialog();

                    const oData = await this.ajaxReadWithJQuery("ConsultantInvoice", filterObj);
                    const oConsultantModel = new JSONModel(oData.data);
                    this.getView().setModel(oConsultantModel, "ConsultantModel");

                    const oInvoiceModel = new JSONModel(oData.data);
                    this.getView().setModel(oInvoiceModel, "InvoiceModel");

                    // Set default range in date picker control
                    const dateControl = this.byId("CI_id_DatePicker");
                    if (dateControl) {
                        dateControl.setDateValue(fyStart);
                        dateControl.setSecondDateValue(fyEnd);
                    }

                    const oTable = this.getView().byId("CI_id_ConsultantInvoiceTable");
                    const oSorter = [];

                    if (userData.Role === "Admin" || userData.Role === "Account Manager") {
                        oSorter.push(new sap.ui.model.Sorter("EmployeeID", false, true));
                    } else if (userData.Role === "Contractor") {
                        oSorter.push(new sap.ui.model.Sorter("InvoiceDate", false, true));
                    }

                    oTable.bindItems({
                        path: "ConsultantModel>/",
                        sorter: oSorter,
                        template: oTable.getBindingInfo("items").template,
                        groupHeaderFactory: this._createGroupHeader.bind(this)
                    });

                    this.closeBusyDialog();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                }
            },

            _createGroupHeader: function(oGroup) {
                let sKey = oGroup.key;
                const userData = this.getView().getModel("LoginModel").getData();

                // Format InvoiceDate group headers if grouping by InvoiceDate
                if (userData.Role === "Contractor" && oGroup) {
                    sKey = this.Formatter.formatDate(sKey);
                }

                return new sap.m.GroupHeaderListItem({
                    title: sKey,
                    upperCase: false
                });
            },

            logindata: async function() {
                try {
                    await this.ajaxReadWithJQuery("AllLoginDetails", "EmpModel").then((data) => {
                        if (data.success) {
                            const filteredData = data.data.filter(emp => emp.Role !== 'Trainee');
                            var oModel = new JSONModel();
                            oModel.setData(filteredData);
                            this.getView().setModel(oModel, "EmpModel");
                        }
                    }).catch((error) => {
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                }
            },

            CI_onPressAddInvoice: function() {
                this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
                    sPath: "X",
                    oPath: "Y",
                });
            },

            CI_onPressInvoice: function(oEvent) {
                var oBindingContext = oEvent.getSource().getBindingContext("ConsultantModel");
                var oInvoiceNo = oBindingContext.getProperty("InvoiceNo");
                var oEmployeeID = oBindingContext.getProperty("EmployeeID");
                this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
                    sPath: encodeURIComponent(oInvoiceNo),
                    oPath: encodeURIComponent(oEmployeeID)
                });
            },

            onPressback: function() {
                this.getRouter().navTo("RouteTilePage");
            },

            onLogout: function() {
                this.getRouter().navTo("RouteLoginPage");
            },

            CI_onClearFilters: function() {
                const oFilterBar = this.getView().byId("CI_id_ConsultantInvoiceFilterBar");
                oFilterBar.getFilterGroupItems().forEach((oItem) => {
                    const oControl = oItem.getControl();
                    if (oControl) {
                        if (oControl.isA("sap.m.ComboBox")) {
                            oControl.setSelectedKey("");
                        } else if (oControl.setValue) {
                            oControl.setValue("");
                        }
                    }
                });
            },

            CI_OnSearch: async function() {
                try {
                    const oFilterBar = this.byId("CI_id_ConsultantInvoiceFilterBar");
                    const aFilterItems = oFilterBar.getFilterGroupItems();
                    const params = {};

                    if (params.InvoiceStartDate && params.InvoiceEndDate) {
                        this._filterInvoiceModelByDateRange(params.InvoiceStartDate, params.InvoiceEndDate);
                    }

                    // Get user data
                    const userData = this.getOwnerComponent().getModel("LoginModel").getData();

                    // Get current financial year range
                    const {
                        fyStart,
                        fyEnd,
                        financialYearLabel
                    } = this._getFinancialYearRange();
                    const formatDate = (date) => date.toISOString().split("T")[0];

                    let invoiceDateProvided = false;

                    // Process filter items
                    aFilterItems.forEach((oItem) => {
                        const oControl = oItem.getControl();
                        const sParamKey = oItem.getName();

                        if (oControl) {
                            if (oControl.isA("sap.m.ComboBox")) {
                                const selectedKey = oControl.getSelectedKey();
                                const inputValue = oControl.getValue(); // Get the manually entered value

                                if (sParamKey === "InvoiceNo") {
                                    if (selectedKey) {
                                        const [invoiceNo, employeeId] = selectedKey.split("|");
                                        if (invoiceNo) params["InvoiceNo"] = invoiceNo;
                                        if (employeeId) params["EmployeeID"] = employeeId;
                                    } else if (inputValue) {
                                        // Use the manually entered value
                                        params["InvoiceNo"] = inputValue;
                                    }
                                } else {
                                    // For other comboboxes (like EmployeeID)
                                    if (selectedKey) {
                                        params[sParamKey] = selectedKey;
                                    } else if (inputValue) {
                                        params[sParamKey] = inputValue;
                                    }
                                }
                            } else if (oControl.isA("sap.m.DateRangeSelection")) {
                                const value = oControl.getValue();
                                if (value && value.includes("-")) {
                                    const [start, end] = value.split("-").map(date =>
                                        date.trim().split("/").reverse().join("-")
                                    );
                                    params["InvoiceStartDate"] = start;
                                    params["InvoiceEndDate"] = end;
                                    invoiceDateProvided = true;
                                }
                            } else if (oControl.getValue && oControl.getValue()) {
                                params[sParamKey] = oControl.getValue();
                            }
                        }
                    });

                    if (userData.Role === "Contractor") {
                        params.EmployeeID = userData.EmployeeID;
                    }

                    // Set default financial year dates if none provided
                    if (!invoiceDateProvided) {
                        params.InvoiceStartDate = formatDate(fyStart);
                        params.InvoiceEndDate = formatDate(fyEnd);
                        params.FinancialYear = financialYearLabel;

                        // Update the DateRangeSelection control to show financial year range
                        const dateRangeControl = this.byId("CI_id_DatePicker");
                        if (dateRangeControl) {
                            dateRangeControl.setDateValue(fyStart);
                            dateRangeControl.setSecondDateValue(fyEnd);
                        }
                    } else {
                        // If selected dates exactly match financial year
                        const startDate = new Date(params.InvoiceStartDate);
                        const endDate = new Date(params.InvoiceEndDate);

                        if (startDate.getTime() === fyStart.getTime() &&
                            endDate.getTime() === fyEnd.getTime()) {
                            params.FinancialYear = financialYearLabel;
                        }
                    }

                    // Fetch data
                    this.getBusyDialog();
                    const oData = await this.ajaxReadWithJQuery("ConsultantInvoice", params);
                    if (oData && Array.isArray(oData.data)) {
                        const oModel = new JSONModel(oData.data);
                        this.getView().setModel(oModel, "ConsultantModel");
                        if (this.bDateRangeTriggered) {
                            const filteredData = oData.data.filter(item => {
                                const itemDate = new Date(item.InvoiceDate);
                                const start = new Date(this.dateRangeStart);
                                const end = new Date(this.dateRangeEnd);
                                return itemDate >= start && itemDate <= end;
                            });

                            const oInvoiceModel = new JSONModel(filteredData);
                            this.getView().setModel(oInvoiceModel, "InvoiceModel");
                            oInvoiceModel.refresh(true);
                            this.bDateRangeTriggered = false; // reset flag
                        }
                    }
                    this.closeBusyDialog();
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText || this.i18nModel.getText("technicalError"));
                } finally {
                    this.closeBusyDialog();
                }
            },

            // Helper function to get financial year range
            _getFinancialYearRange: function() {
                const today = new Date();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth(); // 0 = Jan, 3 = April

                let fyStart, fyEnd, financialYearLabel;

                if (currentMonth >= 3) { // April or later
                    fyStart = new Date(currentYear, 3, 1); // April 1st
                    fyEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
                    financialYearLabel = `${currentYear}-${currentYear + 1}`;
                } else {
                    fyStart = new Date(currentYear - 1, 3, 1); // April 1st last year
                    fyEnd = new Date(currentYear, 2, 31); // March 31st this year
                    financialYearLabel = `${currentYear - 1}-${currentYear}`;
                }

                return {
                    fyStart,
                    fyEnd,
                    financialYearLabel
                };
            },

            onDateRangeChange: function(oEvent) {
                try {
                    const oDateRange = oEvent.getSource();
                    const value = oDateRange.getValue();

                    if (value && value.includes("-")) {
                        const [start, end] = value.split("-").map(date =>
                            date.trim().split("/").reverse().join("-")
                        );

                        this.dateRangeStart = start;
                        this.dateRangeEnd = end;
                        this.bDateRangeTriggered = true;

                        const oComboBox = this.byId("CI_id_InvoiceNo");
                        if (oComboBox) {
                            oComboBox.setSelectedKey("");
                            oComboBox.setValue("");
                        }

                        this.CI_OnSearch();
                    }
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                }
            },


            _filterInvoiceModelByDateRange: function(startDate, endDate) {
                const oConsultantModel = this.getView().getModel("ConsultantModel");
                const oInvoiceModel = this.getView().getModel("InvoiceModel");

                if (!oConsultantModel || !oInvoiceModel) return;

                // Get all data from ConsultantModel
                const aAllData = oConsultantModel.getData();

                if (!Array.isArray(aAllData)) return;

                // Filter data by date range
                const aFilteredData = aAllData.filter(item => {
                    const itemDate = new Date(item.InvoiceDate);
                    const start = new Date(startDate);
                    const end = new Date(endDate);

                    return itemDate >= start && itemDate <= end;
                });

                // Update InvoiceModel with filtered data
                oInvoiceModel.setData(aFilteredData);
                oInvoiceModel.refresh(true);
            },
        })
    }

)