sap.ui.define([
    "./BaseController", "../model/formatter", "sap/m/MessageBox", "../utils/PaySlipPDF"
],
    function (BaseController, Formatter, MessageBox, jsPDF) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlipDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteNavAdminPaySlipApp").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                if(!this.that) this.that = this.getOwnerComponent().getModel("ThisModel")?.getData().that;
                this.scrollToSection("APD_id_NavAdmin", "APD_id_First");
                var LoginFunction = await this.commonLoginFunction("PaySlip");
                if (!LoginFunction) return;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.oModel = this.getView().getModel("PaySlip");
                if (!this.oModel.getProperty("/isRouteLOP")) {
                    this.getView().byId("APD_id_Employee").setSelectedKey("");
                    if (this.oModel.getProperty("/isIdSelected")) this._fetchPaySlip(this.oModel.getProperty("/SelectedFilters"));
                    this.oModel.setProperty("/isRouteLOP", false);
                    this.flagID = false;
                }
                this.that.closeBusyDialog();
            },

            APD_onPressBack: function () {
                var oRoutePath = this.oModel.getProperty("/BackRoute");
                if (oRoutePath === "RouteAdminPaySlip") this.getRouter().navTo(oRoutePath);
                else this.getRouter().navTo(oRoutePath, { sPath: this.oModel.getProperty("/BackPath"), Role: this.oModel.getProperty("/BackPathRole") });
            },

            APD_onEmployeeIDChange: async function (oEvent) {
                var sValue = oEvent.getSource().getValue();
                if (sValue === "" || !sValue) return;
                await this._fetchPaySlip({ EmployeeID: sValue });
                this.flagID = false;
            },

            _fetchPaySlip: async function (filters) {
                this.getBusyDialog();
                try {
                    if (this.oModel.getProperty("/isCreate")) {
                        var response = await this.ajaxCreateWithJQuery("PaySlipDetails", filters);
                        if (response.success) {
                            var oData = response.result[0];
                            oData.YearMonth = this.getFirstDayOfMonth(oData.Month, oData.Year);
                            if (!oData.BankName || oData.BankName === "" || !oData.BankAccountNo || oData.BankAccountNo === "") {
                                this.oModel.setProperty("/EmpData", {});
                                this.oModel.setProperty("/isIdSelected", false);
                                MessageBox.error(this.i18nModel.getText("bankDetailsNotFound"));
                                return;
                            }
                            this.initializeCompAmounts(oData.EarningData);
                            this.initializeCompAmounts(oData.DeductionData);
                            oData.Currency = "INR";
                            oData.ProfilePhoto = "data:image/png;base64," + oData.ProfilePhoto;
                            oData.PaySlipGenerationDate = new Date();
                            this.oModel.setProperty("/EmpData", oData);
                            this.totalCalculationAmount();
                        }
                    }
                    else {
                        var response = await this.ajaxCreateWithJQuery("createUpdateAllData", filters);
                        if (response.success) {
                            var oData = response.data.AdminPaySlip[0];
                            oData.EarningData = response.data.Earning.filter(function (item) {
                                return !(item.Amount == null && item.YearlyAmount == null);
                            });
                            oData.DeductionData = response.data.Deduction.filter(function (item) {
                                return !(item.Amount == null && item.YearlyAmount == null);
                            });
                            oData.ProfilePhoto = "data:image/png;base64," + (response.data.ProfilePhoto || "");
                            this.oModel.setProperty("/EmpData", oData);
                            this.totalCalculationAmount();
                        }
                    }
                    this.oModel.setProperty("/isIdSelected", true);
                }
                catch (e) {
                    this.oModel.setProperty("/EmpData", {});
                    this.oModel.setProperty("/isIdSelected", false);
                    console.warn(e);
                    if (response.success) MessageBox.error(this.i18nModel.getText("paySlipNotFound"));
                    else MessageBox.error(this.i18nModel.getText("errorFetchingPaySlip"));
                }
                finally {
                    this.closeBusyDialog();
                }
            },

            totalCalculationAmount: async function () {
                const getTotal = (data, key) => data.reduce((total, item) => total + Number(item[key] || 0), 0);
                const empData = this.oModel.getProperty("/EmpData");
                const earnData = empData.EarningData || [];
                const dedData = empData.DeductionData || [];
                var earningsTotalMonthly = Math.max(0, getTotal(earnData, "Amount"));
                var earningsTotalYearly = Math.max(0, getTotal(earnData, "YearlyAmount"));
                var deductionsTotalMonthly = Math.max(0, getTotal(dedData, "Amount"));
                var deductionsTotalYearly = Math.max(0, getTotal(dedData, "YearlyAmount"));
                this.oModel.setProperty("/EmpData/EarningsTotalMonthly", earningsTotalMonthly);
                this.oModel.setProperty("/EmpData/EarningsTotalYearly", earningsTotalYearly);
                this.oModel.setProperty("/EmpData/DeductionsTotalMonthly", deductionsTotalMonthly);
                this.oModel.setProperty("/EmpData/DeductionsTotalYearly", deductionsTotalYearly);
                var totalNetPay = +((earningsTotalMonthly - deductionsTotalMonthly).toFixed(2));
                if (totalNetPay < 0) totalNetPay = 0;
                this.oModel.setProperty("/EmpData/NetPay", totalNetPay);
                this.oModel.setProperty("/EmpData/NetPayText", await this.convertNumberToWords(totalNetPay, "INR"));
            },

            APD_onPressSalAdd: function () {
                this._addRow("/EmpData/EarningData");
            },

            APD_onPressDedAdd: function () {
                this._addRow("/EmpData/DeductionData");
            },

            _addRow: function (sPath) {
                const oData = this.oModel.getProperty(sPath);
                const oNewSalaryField = {
                    Description: "",
                    Amount: "",
                    YearlyAmount: "",
                    Flag: true
                };
                oData.push(oNewSalaryField);
                this.oModel.setProperty(sPath, oData);
                this.oModel.refresh(true);
            },

            APD_onAmountChange: function (oEvent) {
                const sPath = oEvent.getSource().getBindingContext("PaySlip").getPath();
                let sValue = +(oEvent.getParameter("value"));
                sValue = sValue.toFixed(2);
                if (sValue && sValue.length > 10) {
                    sValue = this.oModel.getProperty(`${sPath}/InitialMonthly`);
                }
                oEvent.getSource().setValue(+(sValue));
                const fAmount = (parseFloat(this.oModel.getProperty(`${sPath}/Amount`)) || 0) - (parseFloat(this.oModel.getProperty(`${sPath}/InitialMonthly`)) || 0);
                const fYearlyAmount = parseFloat(this.oModel.getProperty(`${sPath}/InitialYearly`)) || 0;
                const fTotal = fAmount + fYearlyAmount;
                this.oModel.setProperty(`${sPath}/YearlyAmount`, +(fTotal.toFixed(2)));
                this.totalCalculationAmount();
            },

            APD_onPressDeleteEarningFields: function (oEvent) {
                this._deleteRows(oEvent.getSource().getBindingContext("PaySlip").getPath(), "/EmpData/EarningData");
            },

            APD_onPressDeleteDeductionFields: function (oEvent) {
                this._deleteRows(oEvent.getSource().getBindingContext("PaySlip").getPath(), "/EmpData/DeductionData");
            },

            _deleteRows: function (rowPath, delPath) {
                const aData = this.oModel.getProperty(rowPath);
                const aDataDeduction = this.oModel.getProperty(delPath);
                const index = aDataDeduction.indexOf(aData);
                if (index > -1) {
                    aDataDeduction.splice(index, 1);
                    this.oModel.setProperty(delPath, aDataDeduction);
                    this.oModel.refresh(true);
                    this.totalCalculationAmount();
                }
            },

            APD_onPressSubmit: async function () {
                var data = this.oModel.getData().EmpData;
                var month = data.Month.substring(0, 3);
                var yearKey = month + "YearlyAmount";
                var monthKey = month + "Amount";
                var earnData = data.EarningData;
                var dedData = data.DeductionData;
                try {
                    this.checkEmpty(earnData);
                    this.checkEmpty(dedData);
                } catch (err) {
                    MessageBox.error(err.message);
                    return;
                };
                this.getBusyDialog();
                this.transformCompData(earnData, data, yearKey, monthKey);
                this.transformCompData(dedData, data, yearKey, monthKey);
                delete data.EarningData;
                delete data.DeductionData;
                delete data.ProfilePhoto;
                delete data.Month;
                delete data.Year;
                delete data.NetPayText;
                data.JoiningDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(data.JoiningDate));
                data.PaySlipGenerationDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(data.PaySlipGenerationDate);
                data.YearMonth = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(data.YearMonth);
                if (data.Type === "Create") {
                    var oData = {
                        "PaySlipDetails": data,
                        "EarningData": earnData,
                        "DeductionData": dedData
                    }
                }
                else {
                    var oData = {
                        "PaySlipDetails": data,
                        "EarningData": this._addFilters(earnData),
                        "DeductionData": this._addFilters(dedData)
                    }
                }
                try {
                    var response = await this.ajaxCreateWithJQuery("createUpdateAllData", oData);
                    if (response.success) {
                        MessageBox.success(this.i18nModel.getText("paySlipCreated"), {
                            onClose: function () {
                                this.getRouter().navTo("RouteAdminPaySlip");
                            }.bind(this)
                        });
                    }
                }
                catch (e) {
                    console.warn(e);
                    MessageBox.error(this.i18nModel.getText("errorCreatingPaySlip"), {
                        onClose: function () {
                            this.getRouter().navTo("RouteAdminPaySlip");
                        }.bind(this)
                    });
                }
                finally {
                    this.closeBusyDialog();
                }
            },

            initializeCompAmounts: function (compData) {
                for (var i = compData.length - 1; i >= 0; i--) {
                    var item = compData[i];
                    if (item.Amount == null && item.YearlyAmount == null) {
                        compData.splice(i, 1); // Remove item
                        continue;
                    }
                    item.YearlyAmount = +((item.Amount + item.YearlyAmount).toFixed(2));
                    item.InitialYearly = item.YearlyAmount;
                    item.InitialMonthly = item.Amount;
                }
            },

            transformCompData: function (compData, data, yearKey, monthKey) {
                compData.forEach(function (item) {
                    item.EmployeeID = data.EmployeeID;
                    item.FinancialYear = data.FinancialYear;
                    item.Month = data.Month;
                    item[yearKey] = item.YearlyAmount;
                    item[monthKey] = item.Amount;
                    delete item.YearlyAmount;
                    delete item.Amount;
                    delete item.InitialYearly;
                    delete item.InitialMonthly;
                    if (item.Flag && data.Type === "Create") {
                        delete item.Flag; // Remove Flag if it's a new entry
                    }
                    if (item.ID === null || item.ID === undefined) {
                        delete item.ID; // Remove ID if it's a new entry
                        item.Flag = true
                    }
                    if (item.Description === "Variable Pay") {
                        item.Flag = true;
                    }
                });
            },

            _addFilters: function (data) {
                return data.map(function (item) {
                    var { ID, ...rest } = item;
                    return {
                        data: rest,
                        filters: { ID: ID }
                    };
                });
            },

            APD_onPressViewSalary: async function () {
                try {
                    if (!this.flagID) {
                        this.getBusyDialog();
                        var date = this.checkDate();
                        var response = await this.ajaxReadWithJQuery("SalaryDetails", {
                            EmployeeID: this.oModel.getProperty("/EmpData/EmployeeID"),
                            YearMonth: date
                        });
                        if (response.success) this.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel(response.data[0]), "salaryData");
                        this.flagID = true;
                    }
                    if (!this.APD_oDialog) {
                        sap.ui.core.Fragment.load({
                            name: "sap.kt.com.minihrsolution.fragment.ViewSalary",
                            controller: this,
                        }).then(function (oDialog) {
                            this.APD_oDialog = oDialog;
                            this.getView().addDependent(this.APD_oDialog);
                            this.APD_oDialog.open();
                        }.bind(this));
                    } else {
                        this.APD_oDialog.open();
                    }
                }
                catch (e) {
                    console.warn(e);
                    MessageBox.error(this.i18nModel.getText("errorFetchingSalaryDetails"));
                }
                finally {
                    this.closeBusyDialog();
                }
            },

            onLogout: function () {
                this.CommonLogoutFunction();
            },

            VSF_onCloseDialog: function () {
                if (this.APD_oDialog) {
                    this.APD_oDialog.close();
                }
            },

            APD_onPressViewLOP: function () {
                this.oModel.setProperty("/isRouteLOP", true);
                this.getRouter().navTo("RouteLOPDetails");
            },

            APD_onPressGeneratePdf: async function () {
                this.getBusyDialog();
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: "KLB01" });
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.backgroundLogoBase64) {
                    try {
                        const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
                        const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });
                        const [logoBase64, backgroundBase64] = await Promise.all([
                            this._convertBLOBToImage(logoBlob),
                            this._convertBLOBToImage(backgroundBlob)
                        ]);
                        oCompanyDetailsModel.companylogo64 = logoBase64;
                        oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
                    } catch (err) {
                        this.closeBusyDialog();
                        console.error(err);
                        MessageBox.error(this.i18nModel.getText("errorGeneratingPdf"));
                    }
                }
                jsPDF._GeneratePDF(this, this.oModel.getProperty("/EmpData"), oCompanyDetailsModel);
            },

            checkDate: function () {
                var joiningDate = new Date(this.oModel.getProperty("/EmpData/JoiningDate"));
                var yearMonth = new Date(this.oModel.getProperty("/EmpData/YearMonth"));

                const sameYear = joiningDate.getFullYear() === yearMonth.getFullYear();
                const sameMonth = joiningDate.getMonth() === yearMonth.getMonth(); // getMonth() is 0-based

                if (sameMonth && sameYear) {
                    return sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(joiningDate);
                }
                else {
                    return sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(yearMonth);
                }
            },

            checkEmpty: function (compData) {
                compData.forEach(function (item) {
                    if (!item.Description || !item.YearlyAmount) {
                        throw new Error("Fields cannot be Empty, please recheck the data.");
                    }
                });
            }
        });
    });