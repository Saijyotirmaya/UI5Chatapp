sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
], function (Controller, utils, MessageToast, Formatter, JSONModel) {
    "use strict";
    return Controller.extend("sap.kt.com.minihrsolution.controller.ExpenseApplication", {
        Formatter: Formatter,
        onInit: function () {
            this.getRouter().getRoute("RouteExpensePage").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function (oEvent) {
            var LoginFUnction = await this.commonLoginFunction("Expense");
            if (!LoginFUnction) return;
            this.getBusyDialog();
            try {
                this.LoginModel = this.getView().getModel("LoginModel");

               if (!this.getView().getModel("ExpenseTypeModel")) this._fetchCommonData("ExpenseItemType", "ExpenseTypeModel");
                if (!this.getView().getModel("ManagerModel")) this._fetchCommonData("ManagerFunction", "ManagerModel", { ManagerID: this.LoginModel.getProperty("/EmployeeID") });

                let today = new Date();
                let year = today.getFullYear();
                let startDate, endDate;

                if (today.getMonth() + 1 < 4) {
                    startDate = new Date(year - 1, 3, 1);
                    endDate = new Date(year, 2, 31);
                } else {
                    startDate = new Date(year, 3, 1);
                    endDate = new Date(year + 1, 2, 31);
                }
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                var View = new JSONModel({
                    SaveBtn: false,
                    SubmitBtn: false,
                    required: true,
                    minDate: new Date(),
                    finacialStart: startDate,
                    finacialEnd: endDate
                });
                this.getOwnerComponent().setModel(View, "viewModel");
                this.ViewModel = this.getView().getModel("viewModel");

                this.CommonModel();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Expense Details");
                this.onChangeEmployeeID();
                this.Exp_onSearch();
            } catch (error) {
                this.closeBusyDialog();
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
            this.initializeBirthdayCarousel();
        },

        onTableSelectionChange: function (oEvent) {
            var Status = oEvent.getSource().getSelectedItem().getBindingContext("ExpenseModel").getObject().Status;
            this.DeleteExpID = oEvent.getSource().getSelectedItem().getBindingContext("ExpenseModel").getObject().ExpenseID;
            if (Status === "Draft") {
                this.byId("Exp_id_DeleteBtn").setEnabled(true);
            }else{
                this.byId("Exp_id_DeleteBtn").setEnabled(false);
            }
        },

        onChangeEmployeeID: async function () {
            var selectedItem = this.byId("Exp_id_EmployeeName").getSelectedItem();
            var EmployeeID = selectedItem
                ? selectedItem.getText()
                : this.LoginModel.getProperty("/EmployeeID");

            await this._fetchCommonData("Expense", "FilterExpenseModel", { "EmployeeID": EmployeeID });

            var FilterModel = this.getView().getModel("FilterExpenseModel");

            if (FilterModel) {
                var uniqueData = [
                    ...new Map(
                        FilterModel.getData().map(item => [item.ExpenseName, item])
                    ).values()
                ];
                FilterModel.setData(uniqueData);
            }
        },
        // Function to initialize the common model for expense creation
        CommonModel: function () {
            var oModel = new JSONModel({
                EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
                EmployeeName: this.LoginModel.getProperty("/EmployeeName"),
                ExpenseName: "",
                ExpStartDate: "",
                ExpEndDate: "",
                TravelAllowance: "NO",
                Country: "",
                Source: "",
                Destination: "",
                CostCenter: "Kalpavriksha Technologies Kalaburagi",
                TripType: "Customer Facing",
                Comments: "",
                Status: "Draft"
            });
            this.getOwnerComponent().setModel(oModel, "CreateExpenseModel");
        },
        // Navigate back to the tile page
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.CommonLogoutFunction();
        },
        // Open the "Add Expense" fragment
        Exp_onPressAddExpense: function () {
            this.CommonModel();
            var oView = this.getView();
            if (!this.Expense) {
                this.Expense = sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.AddExpense",
                    controller: this
                }).then(function (Expense) {
                    this.Expense = Expense;
                    oView.addDependent(this.Expense);
                    this.Expense.open();
                    this._FragmentDatePickersReadOnly(["exp-Id-StartDate", "exp-Id-EndDate"])
                }.bind(this));
            } else {
                this.Expense.open();
                this._FragmentDatePickersReadOnly(["exp-Id-StartDate", "exp-Id-EndDate"])
            }
        },
        // Close the "Add Expense" fragment and reset validation states
        Exp_Frg_onPressClose: function () {
            this.Expense.close();
            var core = sap.ui.getCore();
            core.byId("exp-Id-ExpenseName").setValueState("None");
            core.byId("exp-Id-StartDate").setValueState("None");
            core.byId("exp-Id-EndDate").setValueState("None");
            core.byId("exp-Id-Country").setValueState("None");
            core.byId("exp-Id-Source").setValueState("None");
            core.byId("exp-Id-Destination").setValueState("None");
            core.byId("exp-Id-EmployeeRemark").setValueState("None");
        },
        // Submit the expense after validation
        Exp_Frg_onPressSubmit: async function () {
            var that = this;
            try {
                const isValid =
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-ExpenseName"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("exp-Id-StartDate"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("exp-Id-EndDate"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("exp-Id-Country"), "ID") &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-Source"), "ID") &&
                    (this.ViewModel.getProperty("/required") === true ?
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-Destination"), "ID") :
                        true) &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-EmployeeRemark"), "ID");

                if (!isValid) {
                    return MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
                const oModel = this.getView().getModel("CreateExpenseModel").getData();
                oModel.ExpStartDate = oModel.ExpStartDate.split("/").reverse().join("-");
                oModel.ExpEndDate = oModel.ExpEndDate.split("/").reverse().join("-");
                this.getBusyDialog();
                const oResponse = await that.ajaxCreateWithJQuery("Expense", { data: oModel });
                if (oResponse) {
                    that.Expense.close();
                    await that.Exp_onPressClear();
                    await that._fetchCommonData("ExpenseTotalCalculation", "", { ExpenseID: oResponse.ExpenseID });
                    this.closeBusyDialog();
                    that.onChangeEmployeeID();
                    await that.Exp_onSearch();
                    MessageToast.show(that.i18nModel.getText("expenseCreatedMess"));
                } else {
                    MessageToast.show(that.i18nModel.getText("expenseCreatedMessFailed"));
                }
            } catch (oError) {
                MessageToast.show(that.i18nModel.getText("expenseCreatedMessFailed"));
            } finally {
                this.closeBusyDialog();
            }
        },

        Exp_onCheckExpenseDetails: function (oEvent) {
            var ExpenseID = oEvent.getSource().getBindingContext("ExpenseModel").getObject().ExpenseID;
            this.getRouter().navTo("RouteExpensDetails", {
                sPath: ExpenseID.replaceAll("/", "")
            });
        },

        Exp_onLiveExpenseName: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
        },

        Exp_onDatePickerChange: function (oEvent) {
            utils._LCvalidateDate(oEvent, "oEvent");
            sap.ui.getCore().byId("exp-Id-EndDate").setMinDate(new Date(oEvent.getSource().getValue().split("/").reverse().join('-')));
        },

        Exp_onEndDateChange: function (oEvent) {
            utils._LCvalidateDate(oEvent, "oEvent");
            // sap.ui.getCore().byId("exp-Id-EndDate").setMinDate(new Date(oEvent.getSource().getValue().split("/").reverse().join('-')));
        },

        Exp_onChangeCountry: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent, "oEvent");
            if (oEvent.getSource().getValue() === '') {
                oEvent.getSource().setValueState("None")
            }
            var oModel = this.getView().getModel("CreateExpenseModel");
            oModel.setProperty("/Destination","");
            oModel.setProperty("/Source","");
            var oValue = oEvent.getSource().getSelectedItem().getAdditionalText();
            var oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, oValue);
            sap.ui.getCore().byId("exp-Id-Source").getBinding("items").filter(oFilter);
            sap.ui.getCore().byId("exp-Id-Destination").getBinding("items").filter(oFilter);
        },

        Exp_onChangeSource: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
            if (oEvent.getSource().getValue() === '') {
                oEvent.getSource().setValueState("None")
            }
        },

        Exp_onChangeDestination: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
            if (oEvent.getSource().getValue() === '') {
                oEvent.getSource().setValueState("None")
            }
        },

        Exp_onChangeEmployeeRemark: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
        },

        Exp_onPressExpenseDownload: function () {
            let fileUrl = window.location.origin.split("index")[0] + "/Perdiem_DeclarationForm.doc";
            sap.m.URLHelper.redirect(fileUrl, true)
        },

        // Delete the Expenase and Expense Item
        Exp_onPressDeleteExpense: async function (oEvent) {
            var that = this;
            this.showConfirmationDialog(
                this.i18nModel.getText("msgBoxConfirm"),
                this.i18nModel.getText("commonMesBoxConfirmDelete"),
                async function () {
                   that.getBusyDialog();
                    try {
                        await that.ajaxDeleteWithJQuery("/Expense", { filters: { ExpenseID: that.DeleteExpID } });
                        MessageToast.show(that.i18nModel.getText("expenseDeleteMess")); // <== use 'that' instead of 'this'
                        that.onChangeEmployeeID();
                        that.Exp_onSearch();
                        that.byId("Exp_id_DeleteBtn").setEnabled(false);
                    } catch (error) {
                        MessageToast.show(error.responseText || "Error deleting expense");
                    } finally {
                        that.closeBusyDialog();
                    }
                },
                function () { that.closeBusyDialog(); })
        },
        //Filter Function
        Exp_onSearch: async function () {
            try {
                this.getBusyDialog();
                var oTable = this.getView().byId("exp_Id_ExpenseTable");
                oTable.setEnableBusyIndicator(true);
                const aFilterItems = this.byId("Exp-id-FilterBar").getFilterGroupItems();
                const params = { "EmployeeID": this.LoginModel.getProperty("/EmployeeID") };

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
                await this._fetchCommonData("Expense", "ExpenseModel", params, ["exp_Id_ExpenseTable"]);
                this.closeBusyDialog();
            } catch (error) {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
        },

        Exp_onPressClear: async function () {
            this.byId("Exp_id_EmployeeName").setSelectedKey("");
            this.byId("Exp_id_ConsFilterBar").setSelectedKey("");
            this.byId("Exp_id_SourceFilter").setSelectedKey("");
            this.byId("Exp_id_DestinationFilter").setSelectedKey("");
            this.byId("Exp_id_StatusFilter").setSelectedKey("");
        },

        Exp_onChangeExpenseType: function (oEvent) {
            if (oEvent.getSource()._getSelectedItemText() !== 'Customer Facing') {
                this.ViewModel.setProperty("/required", false);
            } else {
                this.ViewModel.setProperty("/required", true);
            }
        },


    });
});