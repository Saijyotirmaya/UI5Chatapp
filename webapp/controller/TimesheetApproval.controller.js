sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/unified/DateRange",
    "sap/suite/ui/commons/Timeline",
    "sap/suite/ui/commons/TimelineItem",
    "sap/ui/core/Fragment"
], function (BaseController, JSONModel, MessageToast, DateRange, Timeline, TimelineItem, Fragment) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetApproval", {

        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetApproval").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            var LoginFunction = await this.commonLoginFunction("TimesheetApproval");
            if (!LoginFunction) return;

            this.getBusyDialog();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("headerTimesheetApproval"));

            const oViewModel = new JSONModel({
                calendarStartDate: this._getStartOfWeek(new Date()),
                isCalendarEnabled: true,
                canApproveReject: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            this.getView().setModel(new JSONModel([]), "ApprovalTimesheetModel");
            this.getView().setModel(new JSONModel([]), "EmployeeFilterModel");

            const ManagerID = this.getView().getModel("LoginModel").getProperty("/EmployeeID");
            this.branch = this.getView().getModel("LoginModel").getProperty("/BranchCode");

            await this.readTimesheetsForManager(ManagerID);
            await this._initializeCalendarAndLegend();

            this.TSA_onClear(true); // Call clear but mark it as initial load
            this.byId("TSA_id_Status").setValue("Submitted"); // Set default status
            this._applyAllFilters(); // Apply the default filter
            this.closeBusyDialog();
            this.initializeBirthdayCarousel();
        },

        _getStartOfWeek: function (date) {
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff));
        },

        readTimesheetsForManager: async function (ManagerID) {
            this.getBusyDialog();
            try {
                const oData = await this.ajaxReadWithJQuery("Timesheet", { ManagerID: ManagerID });
                let timesheetData = Array.isArray(oData.data) ? oData.data : [oData.data];
                const aAllowedStatuses = ["Submitted", "Approved", "Rejected"];
                this._fullApprovalData = timesheetData.filter(entry => entry && entry.Status && aAllowedStatuses.includes(entry.Status));

                const uniqueEmployees = [];
                const employeeMap = new Set();
                this._fullApprovalData.forEach(entry => {
                    if (entry.EmployeeID && !employeeMap.has(entry.EmployeeID)) {
                        employeeMap.add(entry.EmployeeID);
                        uniqueEmployees.push({ EmployeeID: entry.EmployeeID, EmployeeName: entry.EmployeeName });
                    }
                });
                this.getView().getModel("EmployeeFilterModel").setData(uniqueEmployees);
            } catch (error) {
                MessageToast.show(error.message || error.responseText);
                this._fullApprovalData = [];
            } finally {
                this.closeBusyDialog();
            }
        },

        _applyAllFilters: function () {
            if (!this._fullApprovalData) { return; }

            const oViewModel = this.getView().getModel("viewModel");
            const oEmployeeFilter = this.byId("TSA_id_Employee");
            const oMonthFilter = this.byId("TSA_id_Month");
            const oStatusFilter = this.byId("TSA_id_Status");
            const oYearPicker = this.byId("TSA_id_Year");
            const sEmployeeValue = oEmployeeFilter.getValue();
            const sMonthValue = oMonthFilter.getValue();
            const sStatusValue = oStatusFilter.getValue();
            const sYearValue = oYearPicker.getValue();
            let aFilteredData = this._fullApprovalData;
            // Check if any filter in the filter bar is active
            const bIsFilterBarActive = sEmployeeValue || sMonthValue || sStatusValue || sYearValue;
            if (bIsFilterBarActive) {
                // The calendar is secondary. Disable it if Month or Year is used.
                oViewModel.setProperty("/isCalendarEnabled", !(sMonthValue || sYearValue));

                if (sEmployeeValue) { aFilteredData = aFilteredData.filter(entry => entry.EmployeeID === sEmployeeValue); }
                if (sStatusValue) { aFilteredData = aFilteredData.filter(entry => entry.Status === sStatusValue); }
                if (sYearValue) {
                    aFilteredData = aFilteredData.filter(entry => {
                        if (!entry.Date) return false;
                        return (new Date(entry.Date).getFullYear()).toString() === sYearValue;
                    });
                }
                if (sMonthValue) {
                    let sMonthKey = "-1";
                    const oSelectedItem = oMonthFilter.getItems().find(item => item.getText() === sMonthValue);
                    if (oSelectedItem) { sMonthKey = oSelectedItem.getKey(); }

                    aFilteredData = aFilteredData.filter(entry => {
                        if (!entry.Date) return false;
                        return (new Date(entry.Date).getMonth() + 1).toString() === sMonthKey;
                    });
                }
            } else {
                oViewModel.setProperty("/isCalendarEnabled", true);
                const oCalendar = this.byId("TSA_id_calendar");
                const oStartDate = new Date(oCalendar.getStartDate());
                oStartDate.setHours(0, 0, 0, 0);
                const oEndDate = new Date(oStartDate);
                oEndDate.setDate(oEndDate.getDate() + oCalendar.getDays() - 1);
                oEndDate.setHours(23, 59, 59, 999);
                aFilteredData = aFilteredData.filter(entry => {
                    if (!entry.Date) return false;
                    return new Date(entry.Date) >= oStartDate && new Date(entry.Date) <= oEndDate;
                });
            }

            const oModel = this.getView().getModel("ApprovalTimesheetModel");
            oModel.setData(aFilteredData);
            oModel.refresh(true);
            this.byId("TSA_id_Table").removeSelections(true);
            this.TSA_onSelect();
        },

        onFilterChange: function () {
            this._applyAllFilters();
        },
        filterTimesheetForCurrentWeek: function () {
            this.getBusyDialog();
            setTimeout(() => {
                this._applyAllFilters();
                this.closeBusyDialog();
            }, 500);
        },
        TSA_onCalendarDateSelect: function (oEvent) {
            this.getBusyDialog();
            setTimeout(() => {
                if (!this.getView().getModel("viewModel").getProperty("/isCalendarEnabled")) {
                    this.closeBusyDialog();
                    return;
                }
                const aSelectedDates = oEvent.getSource().getSelectedDates();
                if (aSelectedDates.length > 0) {
                    const oSelectedDate = aSelectedDates[0].getStartDate();
                    oSelectedDate.setHours(0, 0, 0, 0);
                    const sEmployeeValue = this.byId("TSA_id_Employee").getValue();
                    const sStatusValue = this.byId("TSA_id_Status").getValue();
                    const sYearValue = this.byId("TSA_id_Year").getValue();
                    const sMonthValue = this.byId("TSA_id_Month").getValue();
                    let aFilteredData = this._fullApprovalData;
                    if (sEmployeeValue) {
                        aFilteredData = aFilteredData.filter(e => e.EmployeeID === sEmployeeValue);
                    }
                    if (sStatusValue) {
                        aFilteredData = aFilteredData.filter(e => e.Status === sStatusValue);
                    }
                    aFilteredData = aFilteredData.filter(entry => {
                        if (!entry.Date) return false;
                        const entryDate = new Date(entry.Date);
                        entryDate.setHours(0, 0, 0, 0);
                        return entryDate.getTime() === oSelectedDate.getTime();
                    });
                    this.getView().getModel("ApprovalTimesheetModel").setData(aFilteredData);
                } else {
                    this._applyAllFilters();
                }
                this.byId("TSA_id_Table").removeSelections(true);
                this.TSA_onSelect();
                this.closeBusyDialog();
            }, 300);
        },
        TSA_onSearch: function () {
            this.getBusyDialog();
            setTimeout(() => {
                this._applyAllFilters();
                this.closeBusyDialog();
            }, 500);
        },

        TSA_onClear: function (bIsInitialLoad) {
            this.byId("TSA_id_Employee").setValue("");
            this.byId("TSA_id_Month").setValue("");
            this.byId("TSA_id_Status").setValue("");
            this.byId("TSA_id_Year").setValue("");
            // Only apply filters immediately if it's a user action, not on initial load
            if (!bIsInitialLoad) {
                this._applyAllFilters();
            }
        },

        TSA_onSelect: function () {
            const oTable = this.byId("TSA_id_Table");
            const oSelectedItems = oTable.getSelectedItems();
            let canApproveReject = false;
            if (oSelectedItems.length > 0) {
                canApproveReject = oSelectedItems.every(item => item.getBindingContext("ApprovalTimesheetModel").getProperty("Status") === "Submitted");
            }
            this.getView().getModel("viewModel").setProperty("/canApproveReject", canApproveReject);
        },

        //Approve Timesheet
        TSA_onApprove: function () {
            this._openManagerRemarkDialog("Approved");
        },
        //Reject timesheet
        TSA_onReject: function () {
            this._openManagerRemarkDialog("Rejected");
        },
        //Open manager remark dialog
        _openManagerRemarkDialog: function (status) {
            this._approvalStatus = status; // Store for use on submit
            const sTitle = status === "Approved"
                ? this.i18nModel.getText("confirmApprove")
                : this.i18nModel.getText("confirmRejectleave");

            if (!this._oManagerRemarkDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.ManagerRemarks",
                    controller: this
                }).then(function (oDialog) {
                    this._oManagerRemarkDialog = oDialog;
                    this.getView().addDependent(oDialog);

                    oDialog.setTitle(sTitle);
                    sap.ui.getCore().byId("MIF_id_RemarkLabel").setText(
                        status === "Approved"
                            ? this.i18nModel.getText("approveRemark")
                            : this.i18nModel.getText("rejectRemark")
                    );
                    sap.ui.getCore().byId("MIF_id_remark").setValue("");

                    // Set button type and text
                    var oOkBtn = sap.ui.getCore().byId("MIF_id_OkBtn");
                    if (oOkBtn) {
                        oOkBtn.setType(status === "Approved" ? "Emphasized" : "Emphasized");
                        oOkBtn.setText(status === "Approved"
                            ? this.i18nModel.getText("approve")
                            : this.i18nModel.getText("reject"));
                    }
                    oDialog.open();
                }.bind(this));
            } else {
                this._oManagerRemarkDialog.setTitle(sTitle);
                sap.ui.getCore().byId("MIF_id_RemarkLabel").setText(
                    status === "Approved"
                        ? this.i18nModel.getText("approveRemark")
                        : this.i18nModel.getText("rejectRemark")
                );
                sap.ui.getCore().byId("MIF_id_remark").setValue("");

                // Set button type and text
                var oOkBtn = sap.ui.getCore().byId("MIF_id_OkBtn");
                if (oOkBtn) {
                    oOkBtn.setType(status === "Approved" ? "Emphasized" : "Emphasized");
                    oOkBtn.setText(status === "Approved"
                        ? this.i18nModel.getText("approve")
                        : this.i18nModel.getText("reject"));
                }
                this._oManagerRemarkDialog.open();
            }
        },

        MTF_onPressOk: async function () {
            const oTable = this.byId("TSA_id_Table");
            const oSelectedItems = oTable.getSelectedItems();
            const sRemark = sap.ui.getCore().byId("MIF_id_remark").getValue();
            const ManagerID = this.getView().getModel("LoginModel").getProperty("/EmployeeID");

            if (!this.MIF_liveChangeForMangerComments()) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            const aPayload = oSelectedItems.map(item => {
                const srNo = item.getBindingContext("ApprovalTimesheetModel").getProperty("SrNo");
                const managerName = item.getBindingContext("ApprovalTimesheetModel").getProperty("ManagerName");
                return {
                    filters: { SrNo: srNo },
                    data: {
                        Status: this._approvalStatus,
                        ManagerName: managerName
                    }
                };
            });
            const finalPayload = {
                comments: sRemark,
                data: aPayload
            };
            this.getBusyDialog();
            try {
                await this.ajaxUpdateWithJQuery("Timesheet", finalPayload);
                MessageToast.show(
                    this._approvalStatus === "Approved"
                        ? this.i18nModel.getText("approvedSuccess")
                        : this.i18nModel.getText("rejectedSuccess")
                );
                this._oManagerRemarkDialog.close();
                await this.readTimesheetsForManager(ManagerID)
                this._applyAllFilters();
                this.getView().getModel("viewModel").setProperty("/canApproveReject", false);

            } catch (error) {
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },
        MIF_liveChangeForMangerComments() {
            const input = sap.ui.getCore().byId("MIF_id_remark");
            if (!input.getValue()) {
                input.setValueStateText(this.getView().getModel('i18n').getResourceBundle().getText("commentsValueState"));
                input.setValueState("Error");
                return false;
            }
            input.setValueState("None");
            return true;
        },

        MIF_onPressClose: function () {
            if (this._oManagerRemarkDialog) {
                this._oManagerRemarkDialog.close();
            }
            //removal table selection
            this.byId("TSA_id_Table").removeSelections(true);
            sap.ui.getCore().byId("MIF_id_remark").setValue("");
            sap.ui.getCore().byId("MIF_id_remark").setValueState("None"); // Reset value state
            //disable buttons
            this.getView().getModel("viewModel").setProperty("/canApproveReject", false);
            this._approvalStatus = null; // Reset approval status
        },
        //Back function
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
            if (this._oManagerRemarkDialog) {
                this._oManagerRemarkDialog.close();
                this._oManagerRemarkDialog.destroy();
                this._oManagerRemarkDialog = null;
            }
        },
        TSA_onShowComments: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("ApprovalTimesheetModel");
            var oData = oContext.getObject();
            var aComments = oData.comments || [];
            aComments.sort(function (a, b) {
                var dateA = new Date(a.CommentDateTime);
                var dateB = new Date(b.CommentDateTime);
                return dateB - dateA;
            });
            var aTimelineItems = aComments.map(function (oComment) {
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
                title: this.i18nModel.getText("tCommentsTitle"),
                contentWidth: "25rem",
                contentHeight: "15rem",
                draggable: true,
                resizable: true,
                content: [oTimeline],
                endButton: new sap.m.Button({
                    text: this.i18nModel.getText("close"),
                    type: "Reject",
                    press: function () {
                        oDialog.close();
                        oDialog.destroy();
                    }
                })
            });
            oDialog.open();
        },
        _initializeCalendarAndLegend: async function () {
            const oCalendar = this.byId("TSA_id_calendar");
            if (oCalendar) {
                // Set the default selected date
                const oToday = new Date();
                oCalendar.removeAllSelectedDates();
                oCalendar.addSelectedDate(new DateRange({ startDate: oToday }));
                await this.initCalendarLegend(oCalendar, this.branch);
            }
        },
        //logout function
        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },
    });
});