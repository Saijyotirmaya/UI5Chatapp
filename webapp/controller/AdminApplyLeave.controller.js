sap.ui.define(
    [
        "./BaseController", // Import BaseController 
        "sap/ui/model/json/JSONModel", // JSON model for data handling
        "sap/m/MessageToast", // Import MessageToast for notifications
        "../utils/validation", // Custom validation utilities
        "../model/formatter", // Custom formatter functions
        "sap/m/MessageBox", //Import MessageBox for alerts/confirmations
        "sap/suite/ui/commons/Timeline", // Import Timeline for displaying comments
        "sap/suite/ui/commons/TimelineItem", //Import TimelineItem for individual comments
    ],
    function (BaseController, JSONModel, MessageToast, utils, Formatter, MessageBox, Timeline, TimelineItem) {
        "use strict";
        return BaseController.extend(
            "sap.kt.com.minihrsolution.controller.AdminApplyLeave",
            {
                Formatter: Formatter,
                onInit: function () {
                    this.getRouter().getRoute("RouteAdminApplyLeave").attachMatched(this._onRouteMatched, this);
                },

                _onRouteMatched: async function () {
                    var LoginFUnction = await this.commonLoginFunction("Leaves");
                    if (!LoginFUnction) return;
                    this.initializeBirthdayCarousel();
                    var that = this;
                    that.getBusyDialog(); // Show busy dialog
                    that.onClearAndSearch("AL_id_leavefilterbar");// Clear and search function
                    that._makeDatePickersReadOnly(["AL_id_DateRangeSelection"]);
                    that.oModel = that.getOwnerComponent().getModel();
                    var loginModel = that.getOwnerComponent().getModel("LoginModel");
                    that.userId = loginModel.getProperty("/EmployeeID");
                    that.Type = loginModel.getProperty("/Role");
                    that.branch = loginModel.getProperty("/BranchCode");
                    that.currentYear = new Date().getFullYear();

                    // Initialize UI controls visibility
                    that.byId("AL_id_LeaveBarChart").setVisible(false);
                    that.byId("AL_id_LeaveTableStandard").setVisible(true);
                    that.byId("AL_id_leavefilterbar").setVisible(true);
                    that.byId("AL_id_LeaveYear").setSelectedKey(that.currentYear);

                    // Start chained async calls
                    that._fetchCommonData("Leaves", "LeaveModel", { employeeID: that.userId }).then(() => {
                        return that._fetchCommonData("LeaveType", "leaveTypeModel", { type: "Employee" });
                    }).then(() => {
                        // Set i18n and header
                        that.i18nModel = that.getView().getModel("i18n").getResourceBundle();
                        that.getView().getModel("LoginModel").setProperty("/HeaderName", that.i18nModel.getText("leaveApplication"));

                        // Set selectedType model
                        var oJson = new JSONModel({ selectedType: 1 });
                        that.getView().setModel(oJson, "selectedModel");

                        // Fetch holidays data
                        return that._fetchCommonData("ListOfSateData", "HolidayModel", { branchCode: that.branch });
                    }).then(() => {
                        return that.BarDisplayFunction("All In One Leave", that.currentYear, that.userId);
                    }).then(() => {
                        var barDataModel = new JSONModel({ Name: 'line', type: 'column', AllStatus: 'column' });
                        that.getView().setModel(barDataModel, "MonthlyBar");
                        // Employee detail call
                        if (that.Type !== "Trainee") {
                            return that.EmployeeDetReadCall("EmployeeDetails", { "EmployeeID": that.userId });
                        } else {
                            return that.EmployeeDetReadCall("EmployeeDetails", { "EmployeeID": that.userId });
                        }
                    }).then(() => {
                        this.closeBusyDialog(); //  Close  BusyDialog
                    }).catch((error) => {
                        this.closeBusyDialog(); //  Close BusyDialog
                        MessageToast.show(error.message || error.responseText);
                    });
                },

                // Function to display bar chart data
                BarDisplayFunction: async function (leaveType, selectedYear, userId) {
                    let jsonData = {
                        "data": { "EmployeeID": userId, "selectYear": selectedYear, "LeaveType": leaveType }
                    };
                    try {
                        // Fetch data from backend
                        let oData = await this.ajaxCreateWithJQuery("LeavesFirstBarChart", jsonData);
                        this.closeBusyDialog(); //  Close BusyDialog
                        // Filter data for first chart
                        let firstChartData = oData.results.filter(item => ["Submitted", "Approved", "Quota"].includes(item.LeaveStatus));
                        // Filter data for second chart
                        let secondChartData = oData.results.filter(item => ["Submitted", "Approved", "All Quota"].includes(item.LeaveStatus));
                        // Set models for charts
                        let oFirstChartModel = new JSONModel({ chartData: firstChartData });
                        this.getView().setModel(oFirstChartModel, "firstLeaveData");

                        let oSecondChartModel = new JSONModel({ chartData: secondChartData });
                        this.getView().setModel(oSecondChartModel, "secondLeaveData");

                        // Configure charts
                        this._configureFirstChart("AL_id_VizFrame6", oFirstChartModel, this.i18nModel.getText("currentLeaveQuota"), leaveType);
                        this._configureSecondChart("AL_id_VizFrameAll", oSecondChartModel, this.i18nModel.getText("yearlyLeaveQuota"), leaveType);


                    } catch (error) {
                        this.closeBusyDialog(); //  Close BusyDialog
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    }
                },

                _configureFirstChart: function (chartId, oModel, titleText, leaveType) {
                    let oVizFrame = this.getView().byId(chartId);
                    if (!oVizFrame) return;

                    oVizFrame.setModel(oModel);

                    // Base rules
                    let rules = [
                        {
                            dataContext: { LeaveType: "Submitted" },
                            properties: { color: "#FFB347" },
                            displayName: "Submitted"
                        },
                        {
                            dataContext: { LeaveType: "Approved" },
                            properties: { color: "#4CAF50" },
                            displayName: "Approved"
                        }
                    ];

                    // Add "Quota" only if leaveType is not LOP
                    if (leaveType !== "LOP") {
                        rules.push({
                            dataContext: { LeaveType: "Quota" },
                            properties: { color: "#4c79e0" },
                            displayName: "Quota"
                        });
                    }

                    oVizFrame.setVizProperties({
                        legend: {
                            title: { visible: true, text: "All Measures" }
                        },
                        title: {
                            visible: true,
                            text: titleText
                        },
                        plotArea: {
                            dataPointStyle: {
                                rules: rules
                            }
                        }
                    });

                    let popoverId = (chartId === "AL_id_VizFrame6") ? "AL_id_PieChart" : null;
                    let oPopOver = popoverId ? this.getView().byId(popoverId) : null;
                    if (oPopOver) {
                        oPopOver.connect(oVizFrame.getVizUid());
                    }
                },

                _configureSecondChart: function (chartId, oModel, titleText, leaveType) {
                    let oVizFrame = this.getView().byId(chartId);
                    if (!oVizFrame) return;

                    oVizFrame.setModel(oModel);

                    let rules = [
                        {
                            dataContext: { LeaveType: "Submitted" },
                            properties: { color: "#FFB347" },
                            displayName: "Submitted"
                        },
                        {
                            dataContext: { LeaveType: "Approved" },
                            properties: { color: "#4CAF50" },
                            displayName: "Approved"
                        }
                    ];

                    if (leaveType !== "LOP") {
                        rules.push({
                            dataContext: { LeaveType: "All Quota" },
                            properties: { color: "#4c79e0" },
                            displayName: "Quota"
                        });
                    }

                    oVizFrame.setVizProperties({
                        legend: {
                            title: { visible: true, text: "All Measures" }
                        },
                        title: {
                            visible: true,
                            text: titleText
                        },
                        plotArea: {
                            dataPointStyle: {
                                rules: rules
                            }
                        }
                    });

                    let popoverId = (chartId === "AL_id_VizFrameAll") ? "AL_id_PieChartAll" : null;
                    let oPopOver = popoverId ? this.getView().byId(popoverId) : null;
                    if (oPopOver) {
                        oPopOver.connect(oVizFrame.getVizUid());
                    }
                },

                // Function to display monthly bar chart
                MonthBarDisplayFunction: async function (leaveType, selectedYear, userId) {
                    let jsonData = { "data": { "EmployeeID": userId, "selectYear": selectedYear, "LeaveType": leaveType } };
                    try {
                        let oData = await this.ajaxCreateWithJQuery("MonthyBarChart", jsonData);
                        this.closeBusyDialog(); //  Close BusyDialog
                        let oLeaveModel = new JSONModel({ chartData: oData.results });
                        this.getView().setModel(oLeaveModel, "MonthleaveData");
                        var oVizFrame = this.getView().byId("AL_id_VizFrame");
                        oVizFrame.setVizProperties({
                            legend: { title: { visible: true } },
                            title: { visible: true, text: this.i18nModel.getText("monthlyApprovedLeaveQuota") }
                        });
                        oVizFrame.setModel(oLeaveModel);
                        var oPopOver = this.getView().byId("AL_id_Popover");
                        oPopOver.connect(oVizFrame.getVizUid());
                    } catch (error) {
                        this.closeBusyDialog(); //  Close BusyDialog
                        MessageToast.show(error.message || error.responseText);
                    }
                },

                // Function to display yearly bar chart
                YearlyBarDisplayFunction: async function (userId) {
                    let jsonData = { "data": { "EmployeeID": userId } };
                    try {
                        let oData = await this.ajaxCreateWithJQuery("YearlyBarChart", jsonData);
                        this.closeBusyDialog(); //  Close BusyDialog
                        let rawData = oData.results;
                        let result = [];
                        // Process raw data into chart format
                        rawData.forEach(item => {
                            let yearEntry = result.find(entry => entry.Year === item.Year);
                            if (!yearEntry) {
                                yearEntry = { Year: item.Year };
                                result.push(yearEntry);
                            }
                            yearEntry[item.LeaveType.replace(/\s+/g, '')] = item.Count;
                        });
                        let oLeaveModel = new JSONModel({ chartData: result });
                        this.getView().setModel(oLeaveModel, "YearleaveData");
                        var oVizFrame = this.getView().byId("AL_id_VizFrameYear");
                        oVizFrame.setVizProperties({
                            legend: { title: { visible: true } },
                            title: { visible: true, text: this.i18nModel.getText("yearlyApprovedLeaveQuota") }
                        });
                        oVizFrame.setModel(oLeaveModel);
                        var oPopOver = this.getView().byId("AL_id_PopOver");
                        oPopOver.connect(oVizFrame.getVizUid());
                    } catch (error) {
                        this.closeBusyDialog(); //  Close BusyDialog
                        MessageToast.show(error.message || error.responseText);
                    }
                },

                // Function to fetch employee details
                 EmployeeDetReadCall: async function (entity, value) {
                    try {
                        let data = await this.ajaxReadWithJQuery(entity, value);
                        if (data && data.data && data.data.length > 0) {
                            let joiningDateField = (entity === "Trainee") ? "JoiningDate" : "JoiningDate";
                            this.JoiningDate = this.Formatter.formatDate(data.data[0][joiningDateField]).split("/").map(Number);
                            let addYears = [];
                            let length = new Date().getFullYear() - this.JoiningDate[2];
                            for (let i = 0; i <= length; i++) {
                                addYears.push({ key: this.JoiningDate[2] + i, text: this.JoiningDate[2] + i })
                                // addYears.push(this.JoiningDate[2] + i);
                            }
                            let yearModel = new JSONModel({ items: addYears });
                            this.getView().setModel(yearModel, "YearModel");
                            
                        } else {
                            MessageToast.show(this.i18nModel.getText("joiningDateMissing"));
                        }
                    } catch (error) {
                        MessageToast.show(error.message || error.responseText);
                    }
                },

                // Chart type change handlers
                AL_onPressPie: function () {
                    this.getView().getModel("MonthlyBar").setProperty("/type", "pie");
                },

                AL_onPressColumn: function () {
                    this.getView().getModel("MonthlyBar").setProperty("/type", "column");
                },

                AL_onPressBar: function () {
                    this.getView().getModel("MonthlyBar").setProperty("/type", "line");
                },

                // Leave type change handler
                AL_onChangeLeaveType: function (oEvent) {
                    this.getBusyDialog(); // Show busy dialog
                    var year = this.byId("AL_id_LeaveYear").getSelectedKey();
                    var type = oEvent.getSource().getSelectedItem().getText()
                    this.BarDisplayFunction(type, year, this.userId);
                    this.MonthBarDisplayFunction(type, year, this.userId);
                },

                // Year change handler
                AL_onChangeYears: function (oEvent) {
                    this.getBusyDialog(); // Show busy dialog
                    var type = this.byId("AL_id_TypeOfLeave").getSelectedItem().getText();
                    var year = oEvent.getSource().getSelectedKey()
                    this.BarDisplayFunction(type, year, this.userId);
                    this.MonthBarDisplayFunction(type, year, this.userId);
                },

                // Show bar chart view
                AL_onPressBarChart: function () {
                    this.getBusyDialog(); // Show busy dialog
                    this.byId("AL_id_LeaveBarChart").setVisible(true);
                    this.byId("AL_id_LeaveTableStandard").setVisible(false);
                    this.byId("AL_id_leavefilterbar").setVisible(false);
                    this.getView().byId("AL_id_LeaveYear").setSelectedKey(this.currentYear);
                    if (this.Type === "Trainee") {
                        this.byId("AL_id_MonthlyChart").setVisible(false);
                        this.byId("AL_id_YearlyChart").setVisible(false);
                        this.byId("AL_id_LeaveYear").setVisible(false);
                        this.byId("AL_id_YearLabel").setVisible(false);
                        this.BarDisplayFunction("All In One Leave", this.currentYear, this.userId).then(() => sap.ui.core.BusyIndicator.hide())
                            .catch((error) => {
                                this.closeBusyDialog(); //  Close BusyDialog
                                MessageToast.show(error.message || error.responseText);
                            });
                    } else {
                        this.byId("AL_id_MonthlyChart").setVisible(true);
                        this.byId("AL_id_YearlyChart").setVisible(true);
                        this.byId("AL_id_LeaveYear").setVisible(true);
                        this.byId("AL_id_YearLabel").setVisible(true);
                        this.BarDisplayFunction("All In One Leave", this.currentYear, this.userId),
                            this.MonthBarDisplayFunction("All In One Leave", this.currentYear, this.userId),
                            this.YearlyBarDisplayFunction(this.userId).then(() => sap.ui.core.BusyIndicator.hide())
                                .catch((error) => {
                                    this.closeBusyDialog(); //  Close BusyDialog
                                    MessageToast.show(error.message || error.responseText);
                                });
                    }
                },

                // Show table view
                AL_onPressGoSmartTable: function () {
                    this.byId("AL_id_LeaveBarChart").setVisible(false);
                    this.byId("AL_id_LeaveTableStandard").setVisible(true);
                    this.byId("AL_id_leavefilterbar").setVisible(true);
                },

                // Chart display mode handlers
                AL_onPressBarChartMonth: function () {
                    this.getView().getModel("MonthlyBar").setProperty("/Name", "column");
                },

                AL_onPresslineChartMonth: function () {
                    this.getView().getModel("MonthlyBar").setProperty("/Name", "line");
                },

                AL_onPressAreaChart: function () {
                    this.getView().getModel("MonthlyBar").setProperty("/AllStatus", "area");
                },

                AL_onPressColumnAllStatus: function () {
                    this.getView().getModel("MonthlyBar").setProperty("/AllStatus", "column");
                },

                AL_onShowEmployeeComments: function (oEvent) {
                    var oContext = oEvent.getSource().getBindingContext("LeaveModel");
                    var oData = oContext.getObject();
                    var aComments = oData.comments || [];
                    var aTimelineItems = aComments.reverse().map(function (oComment) {
                        return new TimelineItem({
                            dateTime: new Date(oComment.CommentDateTime).toLocaleString(),
                            title: oComment.CommentedBy || "Anonymous",
                            text: oComment.Comment || "No comment provided",
                            userNameClickable: false,
                            icon: "sap-icon://comment"
                        });
                    });
                    var oTimeline = new Timeline({
                        showHeader: false,
                        enableBusyIndicator: false,
                        width: "100%",
                        sortOldestFirst: false,
                        enableDoubleSided: false,
                        content: aTimelineItems,
                        showHeaderBar: false
                    });
                    var oDialog = new sap.m.Dialog({
                        title: "Leave Comments",
                        contentWidth: "25rem",
                        contentHeight: "15rem",
                        draggable: true,
                        resizable: true,
                        content: [oTimeline],
                        endButton: new sap.m.Button({
                            text: "Close",
                            type: "Reject",
                            press: function () {
                                oDialog.close();
                                oDialog.destroy();
                            }
                        })
                    });
                    oDialog.open();
                },

                // Mark calendar dates with leave and holiday information
                onMarkCalendarDatesAndLeaves: function () {
                    var that = this;
                    this.oDatePicker.removeAllSpecialDates();

                    // Get leave and holiday data
                    var leaveRecords = that.getView().getModel("LeaveModel").getData();
                    var holidays = that.getView().getModel("HolidayModel").getData();

                    // Create a map of holiday date string -> holiday name
                    var holidayMap = new Map(holidays.map(function (holiday) {
                        return [new Date(holiday.Date).toDateString(), holiday.Name];
                    }));

                    var appliedLeaves = [];
                    var yearStart = new Date(new Date().getFullYear(), 0, 1);
                    var yearEnd = new Date(new Date().getFullYear(), 11, 31);

                    // Process leave records
                    leaveRecords.forEach(function (record) {
                        if (record["status"] !== "Rejected") {
                            var fromDate = that.onFormatDate(that.Formatter.formatDate(record.fromDate));
                            var toDate = that.onFormatDate(that.Formatter.formatDate(record.toDate));
                            if (fromDate && toDate) {
                                for (var d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
                                    appliedLeaves.push({
                                        date: new Date(d),
                                        employeeId: record["employeeID"]
                                    });
                                }
                            }
                        }
                    });

                    var appliedLeavesSet = new Set(appliedLeaves.map(leave => leave.date.toDateString()));

                    // Mark each day of the year
                    for (var d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
                        var day = d.getDay();
                        var isWeekend = (day === 0 || day === 6);
                        var isAppliedLeave = appliedLeavesSet.has(d.toDateString());
                        var holidayName = holidayMap.get(d.toDateString());

                        var dateRange = new sap.ui.unified.DateTypeRange({
                            startDate: new Date(d),
                            endDate: new Date(d)
                        });

                        if (holidayName) {
                            dateRange.setType("Type04");
                            dateRange.setTooltip("Holiday : " + holidayName);
                        } else if (isWeekend) {
                            dateRange.setType("Type09");
                            dateRange.setTooltip("Weekend");
                        } else if (isAppliedLeave) {
                            dateRange.setType("Type05");
                            dateRange.setTooltip("Applied Leave");
                        } else {
                            dateRange.setType("Type06");
                            dateRange.setTooltip("Working Day");
                        }
                        this.oDatePicker.addSpecialDate(dateRange);
                    }
                    that.appliedLeavesSet = appliedLeavesSet;
                },

                // Initialize calendar legend
                onInitializeLegend: function (oEvent) {
                    try {
                        sap.ui.core.BusyIndicator.show(0);
                        this.oDatePicker = oEvent.getSource();
                        if (this.oDatePicker) {
                            var oLegend = new sap.ui.unified.CalendarLegend({
                                items: [
                                    new sap.ui.unified.CalendarLegendItem({ type: "Type04", text: "Holiday" }),
                                    new sap.ui.unified.CalendarLegendItem({ type: "Type09", text: "Weekend" }),
                                    new sap.ui.unified.CalendarLegendItem({ type: "Type06", text: "Working Day" }),
                                    new sap.ui.unified.CalendarLegendItem({ type: "Type05", text: "Applied Leaves" })
                                ]
                            });
                            this.oDatePicker.setLegend(oLegend);
                            this.onMarkCalendarDatesAndLeaves();
                        }
                    } catch (error) {
                        MessageToast.show(error.message || error.responseText);
                    } finally {
                       sap.ui.core.BusyIndicator.hide();
                    }
                },

                // Apply leave button handler
                AL_onPressApplyLeave: function () {
                    var oView = this.getView();
                    var loginData = this.getOwnerComponent().getModel("LoginModel").getData();
                    
                    if (!this.JoiningDate || this.JoiningDate.length < 3) {
                        sap.m.MessageToast.show("Joining date is not available or invalid.");
                        return;
                    }

                    // Parse joining date
                    var joiningDay = parseInt(this.JoiningDate[0]);
                    var joiningMonth = parseInt(this.JoiningDate[1]) - 1; // JS months are 0-based
                    var joiningYear = parseInt(this.JoiningDate[2]);

                    var currentYear = new Date().getFullYear();

                    // Check if joining year is in the future
                    if (joiningYear > currentYear) {
                        sap.m.MessageToast.show("Joining year is in the future. You cannot apply leave for future year.");
                        return;
                    }

                    // Create leave JSON model
                    var leaveJson = {
                        employeeID: loginData.EmployeeID,
                        employeeName: loginData.EmployeeName,
                        email: loginData.EmailID,
                        fromDate: "",
                        toDate: "",
                        NoofDays: "",
                        typeOfLeave: "All In One Leave",
                        comments: "",
                        Submit: true,
                        Save: false,
                        halfDay: false,
                        MinToDate: null,
                        managerRemark: "",
                        maxDate: new Date(currentYear, 11, 31),
                        minDate: new Date(joiningYear, joiningMonth, joiningDay),
                        isUpdate: false,
                    };

                    var oLeaveTempModel = new JSONModel(leaveJson);
                    oView.setModel(oLeaveTempModel, "LeaveTempModel");
                    this.openLeaveDialog(oView);
                },

               // Update leave button handler
                AL_onPressUpdate: function () {
                    var oView = this.getView();
                    var oTable = this.byId("AL_id_LeaveTableStandard").getSelectedItem();
                    var oModelData = JSON.parse(JSON.stringify(oTable.getBindingContext("LeaveModel").getObject()));
                    this._originalLeaveData = JSON.parse(JSON.stringify(oModelData));
                    this.UpdateNoofDays = oModelData.NoofDays;
                    this.previousLeaveDates = [];
                    let prevFrom = this.onFormatDate(this.Formatter.formatDate(oModelData.fromDate));
                    let prevTo = this.onFormatDate(this.Formatter.formatDate(oModelData.toDate));
                    for (let d = new Date(prevFrom); d <= prevTo; d.setDate(d.getDate() + 1)) {
                        this.previousLeaveDates.push(d.toDateString());
                    }

                    // Prepare leave data for dialog model
                    var leaveJson = {
                        ID: oModelData.ID,
                        employeeID: oModelData.employeeID,
                        employeeName: oModelData.employeeName,
                        email: oModelData.email,
                        fromDate: this.Formatter.formatDate(oModelData.fromDate),
                        toDate: this.Formatter.formatDate(oModelData.toDate),
                        NoofDays: oModelData.NoofDays,
                        typeOfLeave: oModelData.typeOfLeave,
                        comments: oModelData.comments[0].Comment,
                        Submit: false,
                        Save: true,
                        halfDay: oModelData.halfDay === 'false' ? false : true,
                        managerRemark: oModelData.ManagerRemark,
                        maxDate: new Date(this.currentYear, 11, 31),
                        minDate: new Date(this.JoiningDate[2], this.JoiningDate[1] - 1, this.JoiningDate[0]),
                        isUpdate: true
                    };
                    // Set data into LeaveTempModel
                    var oLeaveTempModel = new JSONModel(leaveJson);
                    oView.setModel(oLeaveTempModel, "LeaveTempModel");
                    this.openLeaveDialog(oView);
                },

                // Open the leave dialog fragment
                openLeaveDialog: function (oView) {
                    if (!this.oLeaveDialog) {
                        // Load dialog fragment if not already loaded
                        sap.ui.core.Fragment.load({
                            name: "sap.kt.com.minihrsolution.fragment.ApplyLeave",
                            controller: this,
                        }).then(function (oLeaveDialog) {
                            this.oLeaveDialog = oLeaveDialog;
                            oView.addDependent(this.oLeaveDialog);
                            this.oLeaveDialog.open();
                        }.bind(this));
                    } else {
                        this._resetDialogFields();
                        this.oLeaveDialog.open();
                    }
                },

                // Reset dialog fields
                _resetDialogFields: function () {
                    this._FragmentDatePickersReadOnly(["AL_id_FromDate", "AL_id_ToDate"]);
                    sap.ui.getCore().byId("AL_id_FromDate").setValueState("None");
                    sap.ui.getCore().byId("AL_id_ToDate").setValueState("None");
                    sap.ui.getCore().byId("AL_id_LeaveComments").setValueState("None");
                },

               // Close the leave dialog fragment
                AL_onPressClose: function () {
                    this.oLeaveDialog.close();
                    this.byId("AL_id_LeaveTableStandard").removeSelections(true); // Clear table selection
                    this.byId("AL_id_Updatebtn").setVisible(false);
                    this.byId("AL_id_Deletebtn").setVisible(false);
                    if (this._originalLeaveData) {
                        var aLeaveData = this.getView().getModel("LeaveModel").getProperty("/");
                        var iIndex = aLeaveData.findIndex(item => item.ID === this._originalLeaveData.ID);
                        if (iIndex > -1) {
                            aLeaveData[iIndex] = JSON.parse(JSON.stringify(this._originalLeaveData));
                            this.getView().getModel("LeaveModel").setProperty("/", aLeaveData);
                        }
                        this._originalLeaveData = null;
                    }
                },

                // Format date string to Date object
                onFormatDate: function (dateString) {
                    var parts = dateString.split('/');
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                },

                // Calculate leave days when dates change
                onLiveChange: function () {
                    var oLeaveModel = this.getView().getModel("LeaveTempModel");
                    var sFromDate = oLeaveModel.getProperty("/fromDate");
                    var sToDate = oLeaveModel.getProperty("/toDate");
                    var isHalfDay = oLeaveModel.getProperty("/halfDay");

                    var LeaveModel = this.getView().getModel("LeaveModel").getData();
                    var filterData = LeaveModel.filter((item) => {
                        return item.ID === oLeaveModel.getData().ID;
                    });

                    // Calculate business days excluding weekends and holidays
                    var holidays = this.getView().getModel("HolidayModel").getData();
                    var sNoofDays = this.calculateBusinessDays(sFromDate, sToDate, holidays);
                    if (isHalfDay && sNoofDays > 0) {
                        sNoofDays -= 0.5;
                    }

                    oLeaveModel.setProperty("/NoofDays", sNoofDays.toString());
                    if (filterData.length !== 0) {
                        filterData[0].NoofDays = oLeaveModel.getProperty("/NoofDays");
                    }
                },

                // Calculate business days between two dates
                calculateBusinessDays: function (startDate, endDate, holidays) {
                    var start = this.onFormatDate(startDate);
                    var end = this.onFormatDate(endDate);
                    // Create set of holiday dates
                    var holidaySet = new Set(holidays.map(function (holiday) {
                        var holidayDate = this.Formatter.formatDate(holiday.Date);
                        var dateObject = this.onFormatDate(holidayDate);
                        return dateObject.toDateString();
                    }, this));

                    var diff = end - start;
                    var totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
                    var businessDays = 0;

                    // Count business days (excluding weekends and holidays)
                    for (var i = 0; i < totalDays; i++) {
                        var currentDate = new Date(start);
                        currentDate.setDate(start.getDate() + i);
                        var dayOfWeek = currentDate.getDay();
                        var dateString = currentDate.toDateString();

                        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateString)) {
                            businessDays++;
                        }
                    }
                    return businessDays;
                },


                onHalfDaySelect: function (oEvent) {
                        var bSelected = oEvent.getParameter("selected"); // Always reliable
                        var oLeaveModel = this.getView().getModel("LeaveTempModel");
                        oLeaveModel.setProperty("/halfDay", bSelected); // Set updated value explicitly
                        this.onLiveChange(); // Recalculate
                },

                // Check if leave is already applied for given dates
                isLeaveAlreadyApplied: function (fromDate, toDate, previousDates = []) {
                    let from = this.onFormatDate(fromDate);
                    let to = this.onFormatDate(toDate);

                    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
                        let dateStr = d.toDateString();
                        if (this.appliedLeavesSet.has(dateStr) && !previousDates.includes(dateStr)) {
                            return true; // Date already applied by someone else and not in original
                        }
                    }
                    return false;
                },

                // Validation when from date changes
                onValidation: function () {
                    var oLeaveModel = this.getView().getModel("LeaveTempModel");
                    var sFromDate = oLeaveModel.getProperty("/fromDate");
                    sFromDate = this.onFormatDate(sFromDate);
                    var oFromDate = new Date(sFromDate);
                    if (!isNaN(oFromDate.getTime())) {
                        oLeaveModel.setProperty("/MinToDate", oFromDate);
                    }
                },

                // Validate from date
                AL_ValidateFromDate: function (oEvent) {
                    const oDate = oEvent.getSource().getDateValue();
                    if (oDate) {
                        oEvent.getSource().setValueState("None"); // Clear error state
                    }
                    const oFromDatePicker = sap.ui.getCore().byId("AL_id_FromDate");
                    const oToDatePicker = sap.ui.getCore().byId("AL_id_ToDate");
                    const oFromDate = oFromDatePicker.getDateValue(); // Date object
                    const oToDate = oToDatePicker.getDateValue(); // Date object
                    if (oFromDate && oToDate && oFromDate > oToDate) {
                        oToDatePicker.setDateValue(null); // Clear the ToDate if FromDate is greater
                        oToDatePicker.setValue("");
                        oToDatePicker.setValueState("Error");
                        oToDatePicker.setValueStateText("From Date cannot be greater than To Date");
                        this.onValidation();
                        return false;
                    }
                    this.onValidation();
                    this.onLiveChange();
                    return !!this.getView().getModel("LeaveTempModel").getProperty("/fromDate");
                },

                // Validate to date
                AL_ValidateToDate: function (oEvent) {
                    const oToDatePicker = oEvent.getSource(); // DatePicker control
                    const oToDate = oToDatePicker.getDateValue(); // Date object

                    if (oToDate) {
                        oToDatePicker.setValueState("None"); // Clear error state
                    }

                    const oFromDate = sap.ui.getCore().byId("AL_id_FromDate").getDateValue();
                    if (!oFromDate) {
                        oToDatePicker.setDateValue(null); // Clear the ToDate if FromDate is not selected
                        oToDatePicker.setValue("");       // Also clear the text input
                        oToDatePicker.setValueState("Error");
                        oToDatePicker.setValueStateText("Please select From Date");
                        return false;
                    }

                    this.onLiveChange();

                    return !!this.getView().getModel("LeaveTempModel").getProperty("/toDate");
                },

                // Validate common fields
                AL_ValidateCommonFields: function (oEvent) {
                    var oInput = oEvent.getSource();
                    utils._LCvalidateMandatoryField(oEvent);
                    if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                // Submit leave handler
                AL_onPressSubmit: async function () {
                    try {
                        // Validate fields
                        if (
                            utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_FromDate"), "ID") &&
                            utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_ToDate"), "ID") &&
                            utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AL_id_LeaveComments"), "ID")
                        ) {
                            var oData = this.getView().getModel("LeaveTempModel").getData();

                            // Parse dates
                            var fromDateParts = oData.fromDate.split("/").map(Number);
                            var startDate = new Date(fromDateParts[2], fromDateParts[1] - 1, fromDateParts[0]);
                            var toDateParts = oData.toDate.split("/").map(Number);
                            var endDate = new Date(toDateParts[2], toDateParts[1] - 1, toDateParts[0]);

                            // Allow last year leave only until Jan 31 of current year
                            var currentDate = new Date();
                            var jan31 = new Date(currentDate.getFullYear(), 0, 31);
                            var isFromLastYear = fromDateParts[2] === currentDate.getFullYear() - 1;
                            var isToLastYear = toDateParts[2] === currentDate.getFullYear() - 1;
                            var isCurrentYear = fromDateParts[2] === currentDate.getFullYear() && toDateParts[2] === currentDate.getFullYear();

                            if (!(isCurrentYear || (isFromLastYear && isToLastYear && currentDate <= jan31))) {
                                return MessageBox.error(this.i18nModel.getText("leaveSameYear"));
                            }

                            // Check if leave is on holiday
                            if (oData.fromDate === oData.toDate) {
                                var isValid = true;
                                var holidays = this.getView().getModel("HolidayModel").getData();
                                holidays.forEach((holiday) => {
                                    var holidayDate = new Date(holiday.Date);
                                    // Normalize both dates to ensure accurate comparison
                                    holidayDate.setHours(0, 0, 0, 0);
                                    startDate.setHours(0, 0, 0, 0);
                                    if (holidayDate.getTime() === startDate.getTime()) {
                                        isValid = false;
                                    }
                                });
                                if (!isValid) {
                                    return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                                }
                            }

                            if (parseFloat(oData.NoofDays) <= 0) {
                                return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                            }

                            // Check if leave is on weekend
                            if (parseFloat(oData.NoofDays) <= 2) {
                                var isFromWeekend = (startDate.getDay() === 0 || startDate.getDay() === 6);
                                var isToWeekend = (endDate.getDay() === 0 || endDate.getDay() === 6);
                                if (isFromWeekend && isToWeekend) {
                                    return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                                }
                            }

                            // Check if leave is already applied
                            if (this.isLeaveAlreadyApplied(oData.fromDate, oData.toDate)) {
                                return MessageBox.error(this.i18nModel.getText("leaveAlreadyApplied"));
                            }

                            // Calculate used leaves
                            var LeaveModel = this.getView().getModel("LeaveModel").getData();

                            // Filter leave data for current year
                            var filteredData = LeaveModel.filter((item) => {
                                if (item.typeOfLeave !== "All In One Leave") return false;

                                var fromDate = this.onFormatDate(this.Formatter.formatDate(item.fromDate));
                                var toDate = this.onFormatDate(this.Formatter.formatDate(item.toDate));
                                var startOfYear = new Date(this.currentYear, 0, 1);
                                var endOfYear = new Date(this.currentYear, 11, 31);

                                return fromDate >= startOfYear && toDate <= endOfYear;
                            });

                            // Exclude rejected leaves
                            filteredData = filteredData.filter((item) => item.status !== "Rejected");

                            // Calculate total leave days
                            var totalNoofDays = filteredData.reduce((total, item) => {
                                return total + parseFloat(item.NoofDays || 0);
                            }, 0);

                            totalNoofDays = totalNoofDays + parseFloat(oData.NoofDays);

                            // Check against quota
                            var oLeaveModel = this.getView().getModel("secondLeaveData");
                            var leaveData = oLeaveModel.getProperty("/chartData");

                            var quotaLeave = leaveData.find(function (leave) {
                                return leave.LeaveStatus === "All Quota";
                            });

                            if (oData.typeOfLeave === "LOP" || totalNoofDays <= quotaLeave.Count) {
                                oData.fromDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                                oData.toDate = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                                oData.halfDay = oData.halfDay.toString();
                                oData.status = "Submitted";

                                delete oData.Save;
                                delete oData.Submit;
                                delete oData.MinToDate;
                                delete oData.ManagerRemark;
                                delete oData.maxDate;
                                delete oData.minDate;
                                delete oData.isUpdate;

                                this.getBusyDialog(); // Show busy dialog

                                // Submit to backend
                                this.ajaxCreateWithJQuery("Leaves", { data: oData }).then(response => {
                                    this.closeBusyDialog(); //  Close BusyDialog
                                    this._handleResponse(response, "leaveSubmitted");
                                }).catch((error) => {
                                    this.closeBusyDialog(); //  Close BusyDialog
                                    MessageToast.show(error.message || error.responseText);
                                });
                            } else {
                                return MessageBox.error(this.i18nModel.getText("quotaExceeded"));
                            }

                        } else {
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        }
                    } catch (error) {
                        this.closeBusyDialog(); //  Close BusyDialog
                        MessageToast.show(error.message || error.responseText);
                    }
                },

                // Save leave handler
                AL_onPressSave: async function () {
                    try {
                        // Validate fields
                        if (
                            utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_FromDate"), "ID") &&
                            utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_ToDate"), "ID") &&
                            utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AL_id_LeaveComments"), "ID")
                        ) {
                            var oData = this.getView().getModel("LeaveTempModel").getData();

                            // Parse dates
                            var fromDateParts = oData.fromDate.split("/").map(Number);
                            var startDate = new Date(fromDateParts[2], fromDateParts[1] - 1, fromDateParts[0]);
                            var toDateParts = oData.toDate.split("/").map(Number);
                            var endDate = new Date(toDateParts[2], toDateParts[1] - 1, toDateParts[0]);

                            // Allow last year leave only until Jan 31 of current year
                            var currentDate = new Date();
                            var jan31 = new Date(currentDate.getFullYear(), 0, 31);
                            var isFromLastYear = fromDateParts[2] === currentDate.getFullYear() - 1;
                            var isToLastYear = toDateParts[2] === currentDate.getFullYear() - 1;
                            var isCurrentYear = fromDateParts[2] === currentDate.getFullYear() && toDateParts[2] === currentDate.getFullYear();

                            if (!(isCurrentYear || (isFromLastYear && isToLastYear && currentDate <= jan31))) {
                                return MessageBox.error(this.i18nModel.getText("leaveSameYear"));
                            }

                            // Check if leave is on holiday
                            if (oData.fromDate === oData.toDate) {
                                var isValid = true;
                                var holidays = this.getView().getModel("HolidayModel").getData();
                                holidays.forEach((holiday) => {
                                    var holidayDate = new Date(holiday.Date);
                                    // Normalize both dates to ensure accurate comparison
                                    holidayDate.setHours(0, 0, 0, 0);
                                    startDate.setHours(0, 0, 0, 0);
                                    if (holidayDate.getTime() === startDate.getTime()) {
                                        isValid = false;
                                    }
                                });
                                if (!isValid) {
                                    return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                                }
                            }

                            if (parseFloat(oData.NoofDays) <= 0) {
                                return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                            }

                            // Check if leave is on weekend
                            if (parseFloat(oData.NoofDays) <= 2) {
                                var isFromWeekend = (startDate.getDay() === 0 || startDate.getDay() === 6);
                                var isToWeekend = (endDate.getDay() === 0 || endDate.getDay() === 6);
                                if (isFromWeekend && isToWeekend) {
                                    return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                                }
                            }

                            if (this.isLeaveAlreadyApplied(oData.fromDate, oData.toDate, this.previousLeaveDates)) {
                                    return MessageBox.error(this.i18nModel.getText("leaveAlreadyApplied"));
                                }


                            // Leave model filtering
                            var LeaveModel = this.getView().getModel("LeaveModel").getData();

                            // Filter leave data for current year
                            var filteredData = LeaveModel.filter((item) => {
                                if (item.typeOfLeave !== "All In One Leave") return false;

                                var fromDate = this.onFormatDate(this.Formatter.formatDate(item.fromDate));
                                var toDate = this.onFormatDate(this.Formatter.formatDate(item.toDate));
                                var startOfYear = new Date(this.currentYear, 0, 1);
                                var endOfYear = new Date(this.currentYear, 11, 31);

                                return fromDate >= startOfYear && toDate <= endOfYear;
                            });

                            // Exclude rejected leaves
                            filteredData = filteredData.filter((item) => item.status !== "Rejected");

                            // Calculate total leave days
                            var totalNoofDays = filteredData.reduce((total, item) => {
                                return total + parseFloat(item.NoofDays || 0);
                            }, 0)

                            // Quota model
                            var oLeaveModel = this.getView().getModel("secondLeaveData");
                            var leaveData = oLeaveModel.getProperty("/chartData");

                            var quotaLeave = leaveData.find(function (leave) {
                                return leave.LeaveStatus === "All Quota";
                            });

                            // Final quota check
                            var valid = true;
                            if (parseFloat(this.UpdateNoofDays) === parseFloat(oData.NoofDays)) {
                                valid = true;
                            } else {
                                valid = totalNoofDays <= quotaLeave.Count
                            }

                            // Check leave type and quota
                            if (oData.typeOfLeave === "LOP" || valid) {
                                oData.fromDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                                oData.toDate = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                                oData.halfDay = oData.halfDay.toString();
                                oData.status = "Submitted";

                                delete oData.Save;
                                delete oData.Submit;
                                delete oData.MinToDate;
                                delete oData.ManagerRemark;
                                delete oData.maxDate;
                                delete oData.minDate;
                                delete oData.isUpdate;

                                this.getBusyDialog(); // Show busy dialog

                                // Save to backend
                                var requestData = { filters: { ID: oData.ID }, data: oData };
                                this.ajaxUpdateWithJQuery("Leaves", requestData).then(response => {
                                    this.closeBusyDialog(); //  Close BusyDialog
                                    this._handleResponse(response, "leaveUpdatedSuccess");
                                }).catch((error) => {
                                    this.closeBusyDialog(); //  Close BusyDialog
                                    MessageToast.show(error.message || error.responseText);
                                });
                            } else {
                                MessageBox.error(this.i18nModel.getText("quotaExceeded"));
                            }
                        }
                    } catch (error) {
                        this.closeBusyDialog(); //  Close BusyDialog
                        MessageToast.show(error.message || error.responseText);
                    }
                },

                // Handle response from backend
                _handleResponse: async function (response, successMessageKey) {
                    if (response.success === true) {
                        MessageToast.show(this.i18nModel.getText(successMessageKey));
                        this.oLeaveDialog.close();
                        this.byId("AL_id_LeaveTableStandard").removeSelections(true); // Clear table selection
                        this.byId("AL_id_Updatebtn").setVisible(false);
                        this.byId("AL_id_Deletebtn").setVisible(false);
                        // Refresh leave data
                        await this._fetchCommonData("Leaves", "LeaveModel", { employeeID: this.userId });
                    } else {
                        MessageToast.show(error.message || error.responseText);
                    }
                },

                AL_onPressDelete: async function () {
                        try {
                            var oTable = this.byId("AL_id_LeaveTableStandard").getSelectedItem();
                            if (!oTable) {
                                MessageToast.show(this.i18nModel.getText("selectLeaveToDelete"));
                                return;
                            }

                            var oModelData = oTable.getBindingContext("LeaveModel").getObject();
                            var requestData = { filters: { ID: oModelData.ID } };

                            // Show confirmation dialog before delete
                            this.showConfirmationDialog(
                                this.i18nModel.getText("confirmDeleteTitle"),   
                                this.i18nModel.getText("confirmDeleteMessage"),
                                async function () {
                                    this.getBusyDialog(); // Show busy dialog

                                    try {
                                        const response = await this.ajaxDeleteWithJQuery("Leaves", requestData);
                                        this.closeBusyDialog();

                                        if (response.success === true) {
                                            MessageToast.show(this.i18nModel.getText("leaveDeletedSuccess"));
                                            this.byId("AL_id_LeaveTableStandard").removeSelections(true);
                                            this.byId("AL_id_Updatebtn").setVisible(false);
                                            this.byId("AL_id_Deletebtn").setVisible(false);
                                            this._fetchCommonData("Leaves", "LeaveModel", { employeeID: this.userId });
                                        } else {
                                            MessageToast.show(response.message || response.responseText);
                                        }
                                    } catch (error) {
                                        this.closeBusyDialog();
                                        MessageToast.show(error.message || error.responseText);
                                    }
                                }.bind(this), // fnOnConfirm
                            );
                        } catch (error) {
                            this.closeBusyDialog();
                            MessageToast.show(error.message || error.responseText);
                        }
                    },

                // Selection change handler for leave table
                onSelectionChange: function (oEvent) {
                    var oSelectedItem = oEvent.getParameter("listItem");
                    var oContext = oSelectedItem.getBindingContext("LeaveModel");
                    var sStatus = oContext.getProperty("status");
                    var oUpdateButton = this.byId("AL_id_Updatebtn");
                    var oDeleteButton = this.byId("AL_id_Deletebtn");
                    var bVisible = sStatus === "Submitted";
                    oUpdateButton.setVisible(bVisible);
                    oDeleteButton.setVisible(bVisible);
                },

                AL_onSearch: async function () {
                    this.getBusyDialog(); // Show busy dialog
                    var aFilterItems = this.byId("AL_id_leavefilterbar").getFilterGroupItems();
                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
                    var params = {};
                    aFilterItems.forEach(function (oItem) {
                        var oControl = oItem.getControl();
                        var sValue = oItem.getName();
                        if (oControl && oControl.getValue()) {
                            if (sValue === "dateRange") {
                                var oFromDate = oControl.getDateValue();
                                var oToDate = oControl.getSecondDateValue();
                                params["fromDate"] = oDateFormat.format(oFromDate);
                                params["toDate"] = oDateFormat.format(oToDate);
                            } else {
                                params[sValue] = oControl.getValue();
                            }
                        }
                    });
                    try {
                        await this._fetchCommonData("Leaves", "LeaveModel", { employeeID: this.userId, ...params });
                    } catch (error) {
                        sap.m.MessageToast.show(error.message || error.responseText);
                    } finally {
                        this.closeBusyDialog(); // Close after call finishes
                    }
                },

                // Clear filters in leave filter bar
                AL_onClear: function () {
                    this.byId("AL_id_DateRangeSelection").setDateValue(null);
                    this.byId("AL_id_DateRangeSelection").setSecondDateValue(null);
                    var oComboBox = this.getView().byId("AL_id_TypeOfLeavecombo");
                    oComboBox.setSelectedKey("");
                },

                onPressback: function () {
                    this.getRouter().navTo("RouteTilePage"); // Navigate to tile page
                },

                onLogout: function () {
                    this.CommonLogoutFunction(); // Navigate to login page
                },
            },
        );
    }
);
