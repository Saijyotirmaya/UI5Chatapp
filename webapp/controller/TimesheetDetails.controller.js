sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/unified/CalendarLegendItem",
], function (BaseController, utils, JSONModel, MessageToast, CalendarLegendItem) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetDetails", {
        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            var LoginFunction = await this.commonLoginFunction("Timesheet");
            if (!LoginFunction) return;
            this.getBusyDialog();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.branch = this.getOwnerComponent().getModel("LoginModel").getProperty("/BranchCode");
            this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
            await this._fetchCommonData("AssignedTask", "AssignModel", { EmployeeID: this.EmployeeID });
            await this._fetchCommonData("ListOfSateData", "HolidayModel", { branchCode: this.branch });
            //leave data with approved status
            await this._fetchCommonData("Leaves", "LeaveModel", { EmployeeID: this.EmployeeID, status: "Approved" });
            const oViewModel = new JSONModel({ isUpdate: false, isCreate: true, isSubmitted: false, isEditing: true, calendarStartDate: this._getStartOfWeek(new Date()), isCalendarEnabled: true, formTitle: "", pageTitle: "" });
            this.getView().setModel(oViewModel, "viewModel");
            this.byId("TSD_id_Assignment").setValueState("None");
            this.byId("TSD_id_TimeHours").setValueState("None");
            this.byId("TSD_id_EmpComment").setValueState("None");
            this._makeDatePickersReadOnly(["TSD_id_Assignment", "TSD_id_TimeHours"]);
            // Set current date as selected in the calendar
            var oCalendar = this.byId("calendar");
            if (oCalendar) {
                var oToday = new Date();
                var oDateRange = new sap.ui.unified.DateRange({ startDate: oToday });
                oCalendar.removeAllSelectedDates();
                oCalendar.addSelectedDate(oDateRange);
                this.onInitializeLegend({ getSource: () => oCalendar });
            }
            // Handle Edit and Create cases
            this.sArg = oEvent.getParameter("arguments").sPath;
            if (this.sArg !== "Timesheet") {
                await this.readCallTimesheet();
                const oData = this.getView().getModel("newModel").getData();
                let empComments = [];
                if (Array.isArray(oData.comments)) {
                    empComments = oData.comments.filter(
                        (comment) => comment.CommentedBy === oData.EmployeeName
                    );
                }
                if (empComments.length > 0) {
                    this.getView().getModel("newModel").setProperty("/Comment", empComments[empComments.length - 1].Comment);
                } else {
                    this.getView().getModel("newModel").setProperty("/Comment", "");
                }
                const isSubmitted = oData.Status === "Submitted" || oData.Status === "Approved";
                oViewModel.setProperty("/isUpdate", !isSubmitted);
                oViewModel.setProperty("/isCreate", false);
                oViewModel.setProperty("/isEditing", false);
                oViewModel.setProperty("/isCalendarEnabled", false);
                oViewModel.setProperty("/pageTitle", this.i18nModel.getText("pageTitleEdit"));
                // format date
                var editDate = this.getView().getModel("newModel").getProperty("/Date");
                if (editDate && editDate.includes("T")) {
                    editDate = editDate.split("T")[0];
                }
                var parts = editDate.split("-");
                if (parts.length === 3) {
                    editDate = parts[2] + "/" + parts[1] + "/" + parts[0];
                }
                oViewModel.setProperty("/formTitle", this.i18nModel.getText("formTitleEdit", [editDate]));
            } else {
                oViewModel.setProperty("/isUpdate", false);
                oViewModel.setProperty("/isCreate", true);
                oViewModel.setProperty("/isEditing", true);
                oViewModel.setProperty("/isCalendarEnabled", true);
                oViewModel.setProperty("/pageTitle", this.i18nModel.getText("pageTitleCreate"));
                var today = new Date();
                var todayStr = String(today.getDate()).padStart(2, '0') + "/" +
                    String(today.getMonth() + 1).padStart(2, '0') + "/" +
                    today.getFullYear();
                oViewModel.setProperty("/formTitle", this.i18nModel.getText("formTitleCreate", [todayStr]));
                const emptyData = {
                    TaskID: "",
                    TaskName: "",
                    HoursWorked: "",
                    ActualHours: "",
                    EmployeeID: this.EmployeeID,
                    EmployeeName: "",
                    ManagerName: "",
                    ManagerID: "",
                    Comment: ""
                };
                this.getView().setModel(new sap.ui.model.json.JSONModel(emptyData), "newModel");
                // Call onDateSelect only in create mode after all flags are set correctly.
                if (oCalendar) {
                    this.onDateSelect({ getSource: () => oCalendar });
                }
                if (this.getView().getModel("editModel")) {
                    this.getView().getModel("editModel").setProperty("/editableBut", true);
                }
            }
            this.closeBusyDialog();
        },

        //read Timesheet
        readCallTimesheet: async function () {
            try {
                this.getBusyDialog();
                await this.ajaxReadWithJQuery("Timesheet", { EmployeeID: this.EmployeeID }).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];

                    // Find the selected row using sPath (SrNo)
                    var selectedEntry = offerData.find(entry => entry.SrNo === this.sArg);
                    if (selectedEntry) {
                        this.getView().setModel(new JSONModel(selectedEntry), "newModel");
                    }
                    this.closeBusyDialog();

                }).catch((error) => {
                    MessageToast.show(error.message || error.responseText);
                    this.closeBusyDialog();
                });
            } catch (error) {
                MessageToast.show(this.i18nModel.getText("technicalError"));
                this.closeBusyDialog();
            }
        },
        //logout function
        onLogout: function () {
            this.CommonLogoutFunction();
        },
        //Start week day
        _getStartOfWeek: function (date) {
            const day = date.getDay(); // Sunday = 0, Monday = 1, ...
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust if Sunday
            return new Date(date.setDate(diff));
        },
        //validation function
        TD_ValidateCommonFields: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },
        //back function
        TSD_onPressBack: function () {
            this.getRouter().navTo("RouteTimesheet");
        },
        //validate time
        TD_ValidateTime: function (oEvent) {
            utils._LCvalidateTimeLimit(oEvent);
        },
        //open the value help to selct assignment
        onValueHelpRequest: function () {
            const oCalendar = this.getView().byId("calendar");
            const selectedDates = oCalendar ? oCalendar.getSelectedDates() : [];
            const selectedDateObj = selectedDates[0]?.getStartDate();
            if (!selectedDateObj) {
                MessageToast.show(this.i18nModel.getText("selectDateT"));
                return;
            }
            // --- Leave check: block assignment value help if leave is applied (Approved) on selected date ---
            let leaves = this.getView().getModel("LeaveModel")?.getData() || [];
            if (!Array.isArray(leaves) && leaves.results) {
                leaves = leaves.results;
            }
            leaves = leaves.filter(leave => leave.employeeID === this.EmployeeID && leave.status === "Approved");
            var isLeave = leaves.some(function (leave) {
                if (!leave.fromDate || !leave.toDate) return false;
                let start = new Date(leave.fromDate);
                let end = new Date(leave.toDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                let sel = new Date(selectedDateObj);
                sel.setHours(0, 0, 0, 0);
                return sel >= start && sel <= end;
            });
            if (isLeave) {
                sap.m.MessageBox.error(this.i18nModel.getText("leaveDateT") || "You cannot fill timesheet on leave.");
                return;
            }
            // Format selected date as YYYY-MM-DD
            const selectedDateStr = [
                selectedDateObj.getFullYear(),
                String(selectedDateObj.getMonth() + 1).padStart(2, '0'),
                String(selectedDateObj.getDate()).padStart(2, '0')
            ].join('-');
            // Get assignment data
            const aAllAssignments = this.getView().getModel("AssignModel")?.getData() || [];
            // Filter assignments where selected date is between StartDate and EndDate
            const aFilteredAssignments = aAllAssignments.filter(oItem => {
                if (!oItem.StartDate || !oItem.EndDate) return false;
                const startDateStr = oItem.StartDate.split("T")[0];
                const endDateStr = oItem.EndDate.split("T")[0];
                return selectedDateStr >= startDateStr && selectedDateStr <= endDateStr;
            });
            if (aFilteredAssignments.length === 0) {
                MessageToast.show(this.i18nModel.getText("noAssignment"));
                return;
            }
            // Load the fragment 
            if (!this.TSD_oDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.TimesheetTask",
                    controller: this
                }).then(function (oDialog) {
                    this.TSD_oDialog = oDialog;
                    this.getView().addDependent(this.TSD_oDialog);
                    // Set model after fragment loads
                    this.TSD_oDialog.setModel(new sap.ui.model.json.JSONModel(aFilteredAssignments), "AssignModel");
                    this.TSD_oDialog.open();
                }.bind(this));
            } else {
                this.TSD_oDialog.setModel(new sap.ui.model.json.JSONModel(aFilteredAssignments), "AssignModel");
                this.TSD_oDialog.open();
            }
        },

        //Assignment live change
        onAssignmentLiveChange: function (oEvent) {
            const sQuery = oEvent.getParameter("value").toLowerCase(); // get input string
            const oBinding = oEvent.getSource().getBinding("items");

            const oFilter1 = new sap.ui.model.Filter("TaskName", sap.ui.model.FilterOperator.Contains, sQuery);
            const oFilter2 = new sap.ui.model.Filter("TaskID", sap.ui.model.FilterOperator.Contains, sQuery);

            const oCombinedFilter = new sap.ui.model.Filter([oFilter1, oFilter2], false); // OR logic
            oBinding.filter(oCombinedFilter);
        },
        //Submit the timesheet data
        TSD_onSubmit: async function () {
            try {
                await this._fetchCommonData("EmployeeDetails", "EmployeeModel", { EmployeeID: this.EmployeeID });
                if (!this._validateTimesheetFields(true)) return;
                this.getBusyDialog();

                const oCalendar = this.byId("calendar").getSelectedDates();
                const selectedDateObj = oCalendar[0]?.getStartDate();
                if (!selectedDateObj) {
                    MessageToast.show(this.i18nModel.getText("selectDateT"));
                    this.closeBusyDialog();
                    return;
                }
                const formattedDate = [
                    selectedDateObj.getFullYear(),
                    String(selectedDateObj.getMonth() + 1).padStart(2, '0'),
                    String(selectedDateObj.getDate()).padStart(2, '0')
                ].join('-');
                const oData = this.getView().getModel("newModel")?.getData() || {};
                const oPayload = {
                    TaskID: oData.TaskID,
                    TaskName: oData.TaskName,
                    EmployeeID: oData.EmployeeID,
                    EmployeeName: oData.EmployeeName,
                    ManagerName: this.getView().getModel("EmployeeModel").getData()[0].ManagerName,
                    ManagerID: this.getView().getModel("EmployeeModel").getData()[0].ManagerID,
                    HoursWorked: Number(this.byId("TSD_id_TimeHours").getValue()).toString(),
                    Date: formattedDate,
                    Month: selectedDateObj.toLocaleString('default', { month: 'long' }),
                    Year: selectedDateObj.getFullYear(),
                    Day: selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
                    Status: "Saved",
                    comments: oData.Comment
                };
                await this.ajaxCreateWithJQuery("Timesheet", { data: oPayload });
                MessageToast.show(this.i18nModel.getText("timesheetSuccess") || "Timesheet submitted!");
                this.clearTimesheetForm();
            } catch (err) {
                MessageToast.show(err.message || "Submission error.");
            } finally {
                this.closeBusyDialog();
            }
        },
        // Initialize calendar legend
        onMarkCalendarDates: function () {
            const that = this;
            const oCalendar = this.oDatePicker;
            if (!oCalendar) {
                console.log("Calendar instance not set!");
                return;
            }
            oCalendar.removeAllSpecialDates();
            // Get all leaves and filter for current user with status Approved
            let leaves = this.getView().getModel("LeaveModel")?.getData() || [];
            if (!Array.isArray(leaves) && leaves.results) {
                leaves = leaves.results;
            }
            // Filter for logged-in user and only approved leaves
            leaves = leaves.filter(leave => leave.employeeID === this.EmployeeID && leave.status === "Approved");
            leaves.forEach(function (leave) {
                if (!leave.fromDate || !leave.toDate) return;
                let start = new Date(leave.fromDate);
                let end = new Date(leave.toDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    d.setHours(0, 0, 0, 0);
                    const oDateRange = new sap.ui.unified.DateTypeRange({
                        startDate: new Date(d),
                        endDate: new Date(d),
                        type: "Type01", // Pink for leave
                        tooltip: that.i18nModel.getText("calendarLeave") || "Leave"
                    });
                    oCalendar.addSpecialDate(oDateRange);
                }
            });
            // Mark holidays, weekends, working days, future dates
            const holidays = this.getView().getModel("HolidayModel").getData();
            const holidayMap = new Map(holidays.map(holiday => [
                new Date(holiday.Date).toDateString(),
                holiday.Name
            ]));
            const yearStart = new Date(new Date().getFullYear(), 0, 1);
            const yearEnd = new Date(new Date().getFullYear(), 11, 31);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
                d.setHours(0, 0, 0, 0);
                const day = d.getDay();
                const isWeekend = (day === 0 || day === 6);
                const holidayName = holidayMap.get(d.toDateString());
                const isFutureDate = d > today;
                const oDateRange = new sap.ui.unified.DateTypeRange({
                    startDate: new Date(d),
                    endDate: new Date(d)
                });
                if (holidayName) {
                    oDateRange.setType("Type04");
                    oDateRange.setTooltip(this.i18nModel.getText("calendarHoliday") + " : " + holidayName);
                } else if (isWeekend) {
                    oDateRange.setType("Type09");
                    oDateRange.setTooltip(this.i18nModel.getText("calendarWeekend"));
                } else if (isFutureDate) {
                    oDateRange.setType("Type07");
                    oDateRange.setTooltip(this.i18nModel.getText("calendarFutureDate"));
                } else {
                    oDateRange.setType("Type06");
                    oDateRange.setTooltip(this.i18nModel.getText("calendarWorkingDay"));
                }
                oCalendar.addSpecialDate(oDateRange);
            }
        },

        // Initialize calendar legend with new "Future Date" type
        onInitializeLegend: function (oEvent) {
            this.oDatePicker = oEvent.getSource();
            if (this.oDatePicker) {
                const oLegend = new sap.ui.unified.CalendarLegend({
                    items: [
                        new CalendarLegendItem({ type: "Type04", text: this.i18nModel.getText("calendarHoliday") }),
                        new CalendarLegendItem({ type: "Type09", text: this.i18nModel.getText("calendarWeekend") }),
                        new CalendarLegendItem({ type: "Type06", text: this.i18nModel.getText("calendarWorkingDay") }),
                        new CalendarLegendItem({ type: "Type07", text: this.i18nModel.getText("calendarFutureDate") }),
                        new CalendarLegendItem({ type: "Type01", text: this.i18nModel.getText("calendarLeave") })
                    ]
                });
                this.oDatePicker.setLegend(oLegend);
                this.onMarkCalendarDates();
            }
        },
        //Date selection for fill timesheet
        onDateSelect: function (oEvent) {
            var that = this;
            var oViewModel = this.getView().getModel("viewModel");
            if (!oViewModel.getProperty("/isCalendarEnabled")) {
                return;
            }
            var selectedDates = oEvent.getSource().getSelectedDates();
            this.byId("TSD_id_Assignment").setValue("");
            this.byId("TSD_id_TimeHours").setValue("");
            this.byId("TSD_id_EmpComment").setValue("");
            this.byId("idTextActHour").setText("");
            //set value state none
            this.byId("TSD_id_Assignment").setValueState("None");
            this.byId("TSD_id_TimeHours").setValueState("None");
            this.byId("TSD_id_EmpComment").setValueState("None");

            if (selectedDates.length > 0) {
                var selectedDate = selectedDates[0].getStartDate();
                var formattedDate = that.Formatter.formatDate(selectedDate);
                var today = new Date();
                // Store raw selected date for use in assignment duplicate check
                this.getView().getModel("AssignModel").setProperty("/selectedDate", selectedDate);
                // Get holiday data
                var holidays = that.getView().getModel("HolidayModel").getData();
                var holidayMap = new Map(holidays.map(holiday => [new Date(holiday.Date).toDateString(), holiday.Name]));
                var day = selectedDate.getDay();
                var isWeekend = (day === 0 || day === 6);
                var isHoliday = holidayMap.has(selectedDate.toDateString());
                // Prevent future date selection
                if (selectedDate > today) {
                    sap.m.MessageBox.error(this.i18nModel.getText("futureDateT"));
                    return;
                }
                // Show warning for holiday or weekend
                if (isWeekend || isHoliday) {
                    sap.m.MessageBox.warning(this.i18nModel.getText("holidayWarning"));
                }
                // Update the SimpleForm title
                var oSimpleForm = that.getView().byId("SimpleFormToolbar");
                if (oSimpleForm) {
                    oSimpleForm.setTitle(this.i18nModel.getText("formTitleCreate", [formattedDate]));
                }
                // Update view model
                var oViewModel = that.getView().getModel("viewModel");
                oViewModel.setProperty("/selectedEntryDate", formattedDate);
            }
        },
        //Clear the data
        clearTimesheetForm: function () {
            const oAssignModel = this.getView().getModel("AssignModel");
            // Clear input values
            oAssignModel.setProperty("/selectedAssignment", "");
            oAssignModel.setProperty("/HoursWorked", "");
            oAssignModel.setProperty("/HoursWorked", "");
            // Clear UI controls manually if needed
            this.byId("TSD_id_Assignment").setValue("");
            this.byId("TSD_id_TimeHours").setValue("");
            this.byId("TSD_id_EmpComment").setValue("");
            this.byId("idTextActHour").setText("");
            // Clear value state errors if any
            this.byId("TSD_id_Assignment").setValueState("None");
            this.byId("TSD_id_TimeHours").setValueState("None");
            this.byId("TSD_id_EmpComment").setValueState("None");
            this.getView().setModel(new JSONModel({}), "newModel");
        },
        //Close the value help after selecting assignment
        onValueHelpDialogClose: async function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                console.warn("No selected item.");
                return;
            }
            const AllData = oSelectedItem.getBindingContext("AssignModel").getObject();
            if (!AllData) {
                console.warn("No data found for selected item.");
                return;
            }
            const selectedDate = this.getView().getModel("AssignModel").getProperty("/selectedDate");
            if (!selectedDate) {
                MessageToast.show(this.i18nModel.getText("selectDateT"));
                return;
            }
            // Format selected date to 'YYYY-MM-DD'
            const formattedDate = [selectedDate.getFullYear(), String(selectedDate.getMonth() + 1).padStart(2, '0'), String(selectedDate.getDate()).padStart(2, '0')].join('-');
            this.getBusyDialog();
            try {
                // Fetch all timesheet entries for this employee
                const checkDup = await this.ajaxReadWithJQuery("Timesheet", {
                    EmployeeID: this.EmployeeID
                });
                // Check if any entry matches the selected TaskID AND the selected Date
                const isDuplicate = Array.isArray(checkDup.data) && checkDup.data.some(entry => {
                    if (!entry.Date || !entry.TaskID) return false;
                    const entryDateObj = new Date(entry.Date);
                    const entryDateOnly = [entryDateObj.getFullYear(), String(entryDateObj.getMonth() + 1).padStart(2, '0'), String(entryDateObj.getDate()).padStart(2, '0')].join('-');
                    return entry.TaskID === AllData.TaskID && entryDateOnly === formattedDate;
                });
                if (isDuplicate) {
                    MessageToast.show(this.i18nModel.getText("duplicateEntry"));
                    this.closeBusyDialog();
                    return;
                }
                // Show actual hours in the UI
                this.getView().getModel("AssignModel").setProperty("/selectedAssignment", AllData.TaskName);
                this.getView().getModel("AssignModel").setProperty("/HoursWorked", AllData.HoursWorked);
                this.getView().byId("idTextActHour").setText("Actual Hours: " + (AllData.HoursWorked || "0"));

                // Merge with existing newModel data
                const oNewModelData = this.getView().getModel("newModel")?.getData() || {};
                oNewModelData.TaskID = AllData.TaskID;
                oNewModelData.TaskName = AllData.TaskName;
                oNewModelData.HoursWorked = AllData.HoursWorked;
                oNewModelData.ActualHours = AllData.HoursWorked;
                oNewModelData.EmployeeID = this.EmployeeID;
                oNewModelData.EmployeeName = AllData.EmployeeName;
                oNewModelData.ManagerName = AllData.ManagerName;
                oNewModelData.ManagerID = AllData.ManagerID;
                oNewModelData.Date = formattedDate;
                this.getView().getModel("newModel").setData(oNewModelData);

                const oInput = this.byId("TSD_id_Assignment");
                oInput.setValue(AllData.TaskName);
                oInput.setValueState("None");
                oInput.setValueStateText("");
            } catch (err) {
                MessageToast.show(err.message || "Error checking assignment.");
            } finally {
                this.closeBusyDialog();
            }
        },
        //Edit the timesheet data
        TSD_onToggleEdit: async function () {
            const oViewModel = this.getView().getModel("viewModel");

            if (oViewModel.getProperty("/isEditing")) {
                // Don't proceed with update if validation fails
                if (!this._validateTimesheetFields(false)) {
                    return;
                }
                await this.TSD_onUpdate();
                oViewModel.setProperty("/isEditing", false);
            } else {
                oViewModel.setProperty("/isEditing", true);

                // Get ActualHours from AssignModel
                const oAssignData = this.getView().getModel("AssignModel")?.getData() || [];
                const oModelData = this.getView().getModel("newModel")?.getData() || {};
                const match = oAssignData.find(a => a.TaskID === oModelData.TaskID);
                const hrs = match?.HoursWorked;

                this.getView().getModel("newModel").setProperty("/ActualHours", hrs || 0);
                const hoursText = hrs ? `${hrs} hours` : "Not available";
                this.byId("idTextActHour").setText(`Actual Hours: ${hoursText}`);
                //this.byId("TSD_id_TimeHours").focus();
            }
        },
        //Update the data
        TSD_onUpdate: async function () {
            try {
                this.getBusyDialog();
                if (!this._validateTimesheetFields(false)) {
                    this.closeBusyDialog();
                    return;
                }
                let oData = this.getView().getModel("newModel").getData();
                // Change status from "Rejected" to "Saved" on update
                if (oData.Status === "Rejected") {
                    oData.Status = "Saved";
                }
                delete oData.comments;
                delete oData.ActualHours;
                const oPayload = {
                    data: oData,
                    filters: { SrNo: this.sArg }
                };
                await this.ajaxUpdateWithJQuery("Timesheet", oPayload);
                MessageToast.show(this.i18nModel.getText("updateSuccess") || "Update successful.");

                const oViewModel = this.getView().getModel("viewModel");
                oViewModel.setProperty("/isEditing", false);
                oViewModel.setProperty("/isEditMode", true);
                oViewModel.setProperty("/editable", false);
                oViewModel.setProperty("/isVisiable", true);
                oViewModel.setProperty("/editBut", true);
                this.getView().getModel("newModel").refresh(true);
            } catch (err) {
                MessageToast.show(err.message || this.i18nModel.getText("technicalError") || "Update failed.");
            } finally {
                this.closeBusyDialog();
            }
        },

        //common validation for edit and create timesheet data
        _validateTimesheetFields: function (isCreateMode = true) {
            const oComment = this.byId("TSD_id_EmpComment");
            const oHours = this.byId("TSD_id_TimeHours");
            const oAssignment = this.byId("TSD_id_Assignment");
            const oData = this.getView().getModel("newModel")?.getData() || {};
            const aAssigns = this.getView().getModel("AssignModel")?.getData() || [];

            // Basic field validation
            if (!utils._LCvalidateMandatoryField(oAssignment, "ID") || !utils._LCvalidateTimeLimit(oHours, "ID") || !utils._LCvalidateMandatoryField(oComment, "ID")) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return false;
            }
            if (!oAssignment.getValue()) {
                oAssignment.setValueState("Error");
                oAssignment.setValueStateText(this.i18nModel.getText("selectAssignment"));
            } else {
                oAssignment.setValueState("None");
            }
            const sEnteredHours = Number(oHours.getValue());
            let sActualHours = Number(oData.ActualHours);
            // Fallback if ActualHours not populated
            if (!sActualHours || sActualHours === 0) {
                const match = aAssigns.find(a => a.TaskID === oData.TaskID);
                sActualHours = Number(match?.HoursWorked || 0);
                this.getView().getModel("newModel").setProperty("/ActualHours", sActualHours);
            }
            if (isNaN(sEnteredHours) || isNaN(sActualHours)) {
                MessageToast.show("Invalid hour value.");
                return false;
            }
            if (sEnteredHours > sActualHours) {
                const errorMsg = this.i18nModel.getText("hoursExceedError") || `Entered hours (${sEnteredHours}) cannot exceed assigned hours (${sActualHours}).`;
                MessageToast.show(errorMsg);
                oHours.setValueState("Error");
                oHours.setValueStateText(errorMsg);
                return false;
            }
            oHours.setValueState("None");
            return true;
        }
    });
});