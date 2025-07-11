sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../model/formatter",
  "sap/m/MessageToast",
], (BaseController, JSONModel, Formatter,MessageToast) => {
  "use strict";

  return BaseController.extend("sap.kt.com.minihrsolution.controller.DetailLeave", {
    Formatter: Formatter,

    onInit() {
      this.getRouter().getRoute("RouteDetailLeave").attachMatched(this._onRouteMatched, this);
    },
    _onRouteMatched: async function (oEvent) {
        var LoginFUnction = await this.commonLoginFunction("MyInbox");
        if (!LoginFUnction) return;
        const sParams = oEvent.getParameter("arguments").sLeaveID;
        const response = await this.ajaxReadWithJQuery("InboxDetails", { ID : sParams });
        response.data[0].StartDate = this.Formatter.formatDate(response.data[0].StartDate);
        response.data[0].EndDate = this.Formatter.formatDate(response.data[0].EndDate);
        response.data[0].SubmittedDate = this.Formatter.formatDate(response.data[0].SubmittedDate);
        this.getOwnerComponent().setModel(new JSONModel(response.data[0]), "oNavLeaveModel");
        this.modelData = this.getOwnerComponent().getModel("oNavLeaveModel").getData();
        var that = this;
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this.getView().getModel("LoginModel").setProperty("/HeaderName",this.i18nModel.getText("titleInBox") );
       // that.currentYear = new Date().getFullYear();
        that.userId = this.modelData.EmpID;
      
        //that.byId("AL_id_LeaveBarChart").setVisible(false);
        that.byId("AL_id_SmartTableCharBut").setVisible(false);
        //that.byId("AL_id_leavefilterbar").setVisible(true);
        //that.byId("AL_id_LeaveYear").setValue(that.currentYear);
        var barDataModel = new JSONModel({ Name: 'line', type: 'column', AllStatus: 'column' });
        that.getView().setModel(barDataModel, "MonthlyBar");
        this.getBusyDialog();
        if (that.userId.includes("KT-T")) {
            that.EmployeeDetReadCall("Trainee", { "TraineeID": that.userId });
            that.getView().byId("AL_id_YearlyChart").setVisible(false);
            that.getView().byId("AL_id_MonthlyChart").setVisible(false);
        } else {
            that.EmployeeDetReadCall("EmployeeDetails", { "EmployeeID": that.userId });
            that.getView().byId("AL_id_YearlyChart").setVisible(true);
            that.getView().byId("AL_id_MonthlyChart").setVisible(true);
        }                       
        //that.EmployeeDetReadCall("EmployeeDetails", { "EmployeeID": that.userId })
        var oType;
        var oJson = new JSONModel({ selectedType: 1 })
        this.getView().setModel(oJson, "selectedModel");
        this.year = this.modelData.StartDate.split("/").map(Number)[2];
        this.getView().byId("AL_id_LeaveYear").setSelectedKey(this.year);
        if (this.modelData.SubType === "LOP") {
            oType = "LOP"
            this.getView().getModel("selectedModel").setProperty("/selectedType", 2);
        } else {
            oType = "All In One Leave"
        }
        
        this.BarDisplayFunction(oType, this.year, that.userId);
        this.YearlyBarDisplayFunction(that.userId);
        this.MonthBarDisplayFunction(oType, this.year, that.userId);
    },
    DL_onBack:function () {
      this.getRouter().navTo("RouteMyInbox",{sMyInBox: "DetailLeave"});
    },
    onLogout:function () {  
        this.getRouter().navTo("RouteLoginPage");   
    },
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
                            properties: { color: "#fc7b03" },
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
                 EmployeeDetReadCall: async function (entity, value) {
                    try {
                        let data = await this.ajaxReadWithJQuery(entity, value);
                        if (data && data.data && data.data.length > 0) {
                            let joiningDateField = (entity === "Trainee") ? "JoiningDate" : "AppraisalDate";
                            this.JoiningDate = this.Formatter.formatDate(data.data[0][joiningDateField]).split("/").map(Number);
                            let addYears = [];
                            let length = new Date().getFullYear() - this.JoiningDate[2];
                            for (let i = 0; i <= length; i++) {
                                addYears.push({ key: this.JoiningDate[2] + i, text: this.JoiningDate[2] + i })
                                // addYears.push(this.JoiningDate[2] + i);
                            }
                            let yearModel = new JSONModel({ items: addYears });
                            this.getView().setModel(yearModel, "YearModel");
                            this.getView().byId("AL_id_LeaveYear").setSelectedKey(this.year);
                        } else {
                            MessageToast.show(this.i18nModel.getText("joiningDateMissing"));
                        }
                    } catch (error) {
                        MessageToast.show(error.message || error.responseText);
                    }
                },
                   _configureSecondChart: function (chartId, oModel, titleText, leaveType) {
                    let oVizFrame = this.getView().byId(chartId);
                    if (!oVizFrame) return;

                    oVizFrame.setModel(oModel);

                    let rules = [
                        {
                            dataContext: { LeaveType: "Submitted" },
                            properties: { color: "#fc7b03" },
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

    
   })
  })