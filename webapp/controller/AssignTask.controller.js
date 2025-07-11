sap.ui.define(
  [
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
  ],
  function (BaseController, utils, JSONModel, MessageToast, MessageBox) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.AssignTask",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteAssignTask").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
          var LoginFunction = await this.commonLoginFunction("ManageAssignment");
          if (!LoginFunction) return;
          this.getBusyDialog();
          const sTaskID = oEvent.getParameter("arguments").taskID;
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          // Save the taskID to the controller
          this.FAT_onPressClear()
          this._currentTaskID = sTaskID;
          this._fetchTaskDetails(sTaskID);
          this.readCallForAllLoginDetails();
          this.CommonReadcall({ TaskID: sTaskID });
        },

        onLogout: function () {
          this.CommonLogoutFunction();
        },

        _fetchTaskDetails: async function (sTaskID) {
          try {
            const response = await this.ajaxReadWithJQuery("NewTask", {
              TaskID: sTaskID,
            });

            if (response.success) {
              this.closeBusyDialog();
              const oTaskDetails = Array.isArray(response.data)
                ? response.data[0]
                : response.data;

              // Set view-level model for ObjectHeader
              this.getView().setModel(new JSONModel(oTaskDetails), "TaskDetailsModel");

              // Set this as the current task ID for reuse
              this._currentTaskID = oTaskDetails.TaskID;
              // Set task details model
              this.getView().setModel(new JSONModel(oTaskDetails), "TaskDetailsModel");
              this._currentTaskID = oTaskDetails.TaskID;

              // Prepare newTaskModel with minDate and maxDate
              const oNewTaskModel = new JSONModel({
                minDate: new Date(oTaskDetails.StartDate),
                maxDate: new Date(oTaskDetails.EndDate)
              });

              // Set this model at view level so fragment can access it
              this.getView().setModel(oNewTaskModel, "newTaskModel");
            }
          } catch (error) {
            this.closeBusyDialog();
            MessageToast.show(this.i18nModel.getText("smgerrorloading"));
          }
        },

        readCallForAllLoginDetails: async function (filter) {
          // Fetch all login details
          await this.ajaxReadWithJQuery("AllLoginDetails", filter)
            .then((oData) => {
              let loginData = Array.isArray(oData.data) ? oData.data : [oData.data];

              // Set full data model
              this.getView().setModel(
                new JSONModel(loginData), "LoginDetailsModel"
              );

              // If "Initial", filter unique entries by LoginID or another field
              if (filter === "Initial") {
                const uniqueLoginData = [...new Map(loginData.filter((item) => item.LoginID && item.LoginID.trim() !== ""
                ).map((item) => [item.LoginID.trim(), item])).values(),];

                this.getView().setModel(
                  new JSONModel(uniqueLoginData), "AllLoginDetailsModelInitial"
                );
              }
              this.closeBusyDialog();
            })
            .catch((oError) => {
              this.closeBusyDialog();
              MessageToast.show(this.i18nModel.getText("smgerrorlogindetails"));
            });
        },

        AT_validateDate: function (oEvent) {
          utils._LCvalidateDate(oEvent);
        },
        AT_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        FAT_onchangeEmpId: function (oEvent) {
          utils._LCvalidationComboBox(oEvent);
        },
        AT_ValidateHournFields: function (oEvent) {
          utils._LCvalidateTimeLimit(oEvent);
        },

        AT_onPressback: function () {
          this.getRouter().navTo("RouteManageAssignment");
        },
        //open task fragment
        AT_onAssignEmpTask: function () {
          this.manageTaskDetails(false); // false means create
        },

        AT_onEditTask: function () {
          this.manageTaskDetails(true); // true means edit
        },

        manageTaskDetails: function (bIsEdit) {
          const oView = this.getView();
          // Add 'isEditMode' to track edit state (true = edit mode, false = create mode)
          const oVisibleModel = new JSONModel({
            save: false,
            submit: true,
            isEditMode: bIsEdit, // New property to control field editability
          });
          oView.setModel(oVisibleModel, "visiblePlay");

          let oModel;

          if (bIsEdit) {
            oVisibleModel.setProperty("/save", true);
            oVisibleModel.setProperty("/submit", false);

            const oTable = this.byId("AT_id_TaskTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
              return MessageToast.show(this.i18nModel.getText("smgforedittask"));
            }

            const oData = oSelectedItem.getBindingContext("AssignModel").getObject();

            // Deep clone to avoid mutation of original model data
            const oClonedData = JSON.parse(JSON.stringify(oData));

            this._originalTaskData = oClonedData; // Store the clean original data
            oModel = new JSONModel(oClonedData);
          }
          else {
            this._originalTaskData = null;

            //  Get StartDate from the view model
            const oTaskDetails = this.getView().getModel("TaskDetailsModel")?.getData();
            const sStartDateFromView = oTaskDetails?.StartDate || "";

            const newTaskData = {
              EmployeeID: "",
              EmployeeName: "",
              HoursWorked: "",
              TaskName: "",
              TaskID: "",
              StartDate: sStartDateFromView, // Set from view
              EndDate: "",
            };

            oModel = new JSONModel(newTaskData);
          }

          oView.setModel(oModel, "EditTaskModel");

          if (!this.oTaskDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.AssignTask",
              controller: this,
            }).then(
              function (oDialog) {
                this.oTaskDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
                this._FragmentDatePickersReadOnly(["FAT_id_StartDate", "FAT_id_EndDate"]);
              }.bind(this)
            );
          } else {
            this.oTaskDialog.open();
            this._FragmentDatePickersReadOnly(["FAT_id_StartDate", "FAT_id_EndDate"]);
          }
        },

        FAT_onTaskClose: function () {
          if (this.oTaskDialog) {
            this.byId("AT_id_TaskTable").removeSelections(true);

            sap.ui.getCore().byId("FAT_id_EmployeeID").setValueState(sap.ui.core.ValueState.None);
            sap.ui.getCore().byId("FAT_id_StartDate").setValueState(sap.ui.core.ValueState.None);
            sap.ui.getCore().byId("FAT_id_EndDate").setValueState(sap.ui.core.ValueState.None);
            sap.ui.getCore().byId("FAT_id_HoursWorked").setValueState(sap.ui.core.ValueState.None);

            this.oTaskDialog.close();
          }
        },
        FAT_onSearch: function () {
          const aFilterItems = this.byId("AT_id_FilterBar").getFilterGroupItems();
          const params = {
            // Always include the current task ID
            TaskID: this._currentTaskID
          };
          aFilterItems.forEach(function (oItem) {
            const oControl = oItem.getControl();
            const sValue = oItem.getName();
            if (oControl && oControl.getValue()) {
              params[sValue] = oControl.getValue();
            }
          });
          // Use the merged params 
          this._fetchCommonData("AssignedTask", "AssignModel", params);
          this.CommonReadcall(params);
        },
        FAT_onPressClear: function () {
          var oFilterBar = this.getView().byId("AT_id_FilterBar");
          oFilterBar.getFilterGroupItems().forEach(function (oItem) {
            var oControl = oItem.getControl();
            if (oControl.setSelectedKey) {
              oControl.setSelectedKey("");
            } else if (oControl.setValue) {
              oControl.setValue("");
            }
          });
        },

        CommonReadcall: async function (params) {
          try {
            this.getBusyDialog();
            const response = await this.ajaxReadWithJQuery(
              "AssignedTask",
              params
            );
            if (response.success) {
              this.closeBusyDialog();
              let taskData = Array.isArray(response.data) ? response.data : [response.data];

              const aEmployees =
                this.getView().getModel("LoginDetailsModel")?.getData() || [];

              // Enrich data with EmployeeName
              taskData = taskData.map((task) => {
                if (task.EmployeeID) {
                  const empIDs = task.EmployeeID.split(",");
                  const names = empIDs.map((id) => {
                    const emp = aEmployees.find((e) => e.EmployeeID === id);
                    return emp ? emp.EmployeeName : "";
                  }).filter((name) => name !== "").join(", ");
                  task.EmployeeName = names;
                }
                return task;
              });

              this.getView().setModel(new JSONModel(taskData), "AssignModel");
            }
          } catch (error) {
            this.getBusyDialog();
            MessageToast.show(this.i18nModel.getText("smgerrorassigntask"));
          }
        },

        //Submit the task details
        FAT_onSubmitTask: async function () {
          const oView = this.getView();
          const aEmployees = oView.getModel("LoginDetailsModel").getData();

          // Validate all fields
          if (
            !utils._LCvalidationComboBox(sap.ui.getCore().byId("FAT_id_EmployeeID"), "ID") ||
            !utils._LCvalidateDate(sap.ui.getCore().byId("FAT_id_EndDate"), "ID") ||
            !utils._LCvalidateTimeLimit(sap.ui.getCore().byId("FAT_id_HoursWorked"), "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }

          const aSelectedIDs = sap.ui.getCore().byId("FAT_id_EmployeeID").getSelectedKeys().filter(key => key.trim() !== "");
          const sTaskID = sap.ui.getCore().byId("FAT_id_TaskID").getValue();

          // Fetch existing assignments for current TaskID
          const aAssignedTasks = oView.getModel("AssignModel").getData() || [];

          // Extract already assigned EmployeeIDs
          const existingEmployeeIDs = aAssignedTasks.map(task => task.EmployeeID.trim());
          const aFilteredIDs = aSelectedIDs.filter(id => !existingEmployeeIDs.includes(id.trim()));

          if (aFilteredIDs.length === 0) {
            MessageBox.error(this.i18nModel.getText("smgEmptask"));
            this.oTaskDialog.close();
            return;
          }

          const sTaskName = sap.ui.getCore().byId("FAT_id_TaskName").getValue();
          const sHoursWorked = sap.ui.getCore().byId("FAT_id_HoursWorked").getValue();
          const sStartDate = sap.ui.getCore().byId("FAT_id_StartDate").getValue();
          const sEndDate = sap.ui.getCore().byId("FAT_id_EndDate").getValue();

          // Construct full payload array
          const aPayloadData = aFilteredIDs.map(empID => {
            const oEmployee = aEmployees.find(emp => emp.EmployeeID === empID);
            return {
              TaskID: sTaskID,
              TaskName: sTaskName,
              EmployeeID: empID,
              EmployeeName: oEmployee ? oEmployee.EmployeeName : "",
              HoursWorked: sHoursWorked,
              StartDate: sStartDate.split("/").reverse().join('-'),
              EndDate: sEndDate.split("/").reverse().join('-')

            };
          });

          this.getBusyDialog();
          const response = await this.ajaxCreateWithJQuery("AssignedTask", { data: aPayloadData });
          if (response.success) {
            this.closeBusyDialog();
            sap.ui.getCore().byId("FAT_id_EmployeeID").setSelectedKeys([]);
            sap.ui.getCore().byId("FAT_id_StartDate").setDateValue(null)
            await this._fetchCommonData("AssignedTask", "AssignModel", { TaskID: sTaskID });
            await this.CommonReadcall({ TaskID: sTaskID });
            this.FAT_onPressClear()
            //  Reset EditTaskModel to clear previous values
            this.getView().setModel(null, "EditTaskModel");
            MessageToast.show("Employee assigned successfully");
            this.oTaskDialog.close();

          }
          else {
            MessageToast.show(this.i18nModel.getText("smgFailtoassign"));
          }
        },

        //Update the task details
        MA_onPressSave: async function () {
          const oTable = this.byId("AT_id_TaskTable");
          const oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show(this.i18nModel.getText("smgSelecttask"));
            return;
          }
          const oEditModel = this.getView().getModel("EditTaskModel");
          const oRawData = { ...oEditModel.getData() }; // Clone data to avoid mutation
          const oEmpId = oSelectedItem.getBindingContext("AssignModel").getProperty("EmployeeID");
          if (
            !utils._LCvalidationComboBox(sap.ui.getCore().byId("FAT_id_EmployeeID"), "ID") ||
            !utils._LCvalidateDate(sap.ui.getCore().byId("FAT_id_EndDate"), "ID") ||
            !utils._LCvalidateTimeLimit(sap.ui.getCore().byId("FAT_id_HoursWorked"), "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }


          const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
          const sQuotationDate = oDateFormat.format(sap.ui.getCore().byId("FAT_id_StartDate").getDateValue());
          const sValidUntilDate = oDateFormat.format(sap.ui.getCore().byId("FAT_id_EndDate").getDateValue());

          const oData = {
            ...oRawData,
            StartDate: sQuotationDate,
            EndDate: sValidUntilDate
          };

          const filters = {
            EmployeeID: oEmpId,
            TaskID: this._currentTaskID
          };

          try {
            this.getBusyDialog();
            const response = await this.ajaxUpdateWithJQuery("/AssignedTask", {
              filters: filters,
              data: oData,
            });

            if (response.success) {
              this.closeBusyDialog();
              // Refresh data and UI
              this._fetchCommonData("AssignedTask", "AssignModel");
              this.FAT_onPressClear()
              this.FAT_onSearch();
              oTable.removeSelections();
              this.oTaskDialog.close();
              MessageToast.show(this.i18nModel.getText("smgUpdatetask"));
            } else {
              this.closeBusyDialog();
              MessageToast.show("Update failed: " + (response.message || ""));
            }
          } catch (error) {
            this.closeBusyDialog();
            MessageToast.show("Error updating task: " + error.message);
          }
        },

        AT_onstartDatevalidateDate: function (oEvent) {
          const oStartDatePicker = oEvent.getSource();
          const oStartDate = oStartDatePicker.getDateValue();

          if (!oStartDate) {
            oStartDatePicker.setValueState("Error");
            oStartDatePicker.setValueStateText("Invalid start date");
            return;
          } else {
            oStartDatePicker.setValueState("None"); //  Reset if valid
          }
          const oEndDatePicker = sap.ui.getCore().byId("FAT_id_EndDate");

          if (oEndDatePicker) {
            let oEndDate = oEndDatePicker.getDateValue();
            oEndDatePicker.setMinDate(oStartDate);
            if (oEndDate && oEndDate < oStartDate) {
              oEndDatePicker.setDateValue(null);
              oEndDatePicker.setValueState("Error");
              oEndDatePicker.setValueStateText("End date must be after start date.");
            } else if (oEndDate) {
              oEndDatePicker.setValueState("None"); //  Reset EndDate state if valid
            }
          }
        },
      }
    );
  }
);
