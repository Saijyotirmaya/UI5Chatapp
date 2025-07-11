sap.ui.define(
    [
        "./BaseController", //call base controller
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "../utils/validation",
        "../model/formatter",
    ],
    function (
        BaseController, JSONModel, MessageToast, utils, Formatter
    ) {
        "use strict";
        return BaseController.extend(
            "sap.kt.com.minihrsolution.controller.ConsultantInvoiceDetails",
            {
                Formatter: Formatter,
                onInit: function () {
                    this.getRouter().getRoute("RouteNavConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
                },
                _onRouteMatched: async function (oEvent) {
                    try {
                        var LoginFUnction = await this.commonLoginFunction("ConsultantInvoice");
                        if (!LoginFUnction) return;
                        this.selectedContractID = null;
                        this._makeDatePickersReadOnly(["CI_id_InDate", "CI_id_PaybyInv"]);
                        this.i18nModel = this.getView().getModel('i18n').getResourceBundle();
                        this.CI_CommonID();

                        this.getView().byId("CI_id_ColumnGST").setVisible(false);
                        this.getView().byId("CI_id_GSTCalc").setVisible(false);

                        var sPath = oEvent.getParameter("arguments").sPath;
                        var oPath = oEvent.getParameter("arguments").oPath;
                        this.decodedPath = decodeURIComponent(decodeURIComponent(sPath));
                        this.decodedEmployeeID = decodeURIComponent(oPath);
                        this.Discount = true;
                        this.UnitAmount = true;
                        this.getBusyDialog()
                        // if (!this.getView().getModel("CurrencyModel")) this._fetchCommonData("Currency", "CurrencyModel");
                         // await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel")
                        if (!this.getView().getModel("CCMailModel")) this._fetchCommonData("EmailContent", "CCMailModel", { Type: "ConsultantInvoice", Action: "CC" });
                       
                        var oInvoiceModel = new JSONModel({
                            EmployeeID: "", ConsultantName: "", InvoiceTo: "", InvoiceAddress: "",
                            InvoiceNo: "", InvoiceDate: "", ConsultantAddress: "", GSTNO: "",
                            CompanyGSTNO: "", MobileNo: "", CGST: false, SGST: false, IGST: false,
                            BankName: "", AccountName: "", AccountNo: "", IFSCCode: "", PayBy: "",
                            GSTValid: false, CGSTSelected: false, IGSTSelected: false, Percentage: "",
                            Currency: "INR", STDCode: "+91", ConsultantInvoiceItem: []
                        });
                        this.getView().setModel(oInvoiceModel, "ConsultantInvoiceModel");

                        var oInvoiceItemModel = new JSONModel({
                            SlNo: "", EmployeeID: "", Item: "", Days: "", SAC: "", UnitPrice: "",
                            Total: "", SubTotal: "", TotalSum: "", Currency: "INR"
                        });
                        this.getView().setModel(oInvoiceItemModel, "oModelDataPro");

                        var visibilityPlay = new JSONModel({
                            createVisi: true, editVisi: false, editable: true,
                            invBtn: true, merge: false
                        });
                        this.getView().setModel(visibilityPlay, "visiablityPlay");

                        var loginModel = this.getOwnerComponent().getModel("LoginModel");
                        var oComboBox = this.getView().byId("CI_id_Cont");
                        var isEditMode = sPath !== "X" && oPath !== "Y";

                        if (loginModel) {
                            this.sUserType = loginModel.getProperty("/Role");
                            if (this.sUserType === "Admin" && !isEditMode) {
                                oComboBox.setVisible(true);
                            } else {
                                oComboBox.setVisible(false);
                            }
                        }

                        if (sPath === "X" && oPath === "Y") {
                            this.onFetchContractDetails();
                            this.readFunction("ConsultantInvoice", "ConsultantInvoiceModel", true);
                            this.readFunction("ConsultantInvoiceItem", "oModelDataPro", true);
                            this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("Delete");
                        } else {
                            await this.commonFetchInvoiceData(this.decodedPath, this.decodedEmployeeID),
                            await this.commonFetchInvoiceItems(this.decodedPath, this.decodedEmployeeID)
                            await this.setVisibilityForEdit();
                            await this.onFetchContractDetails();
                        }
                        oComboBox.setSelectedKey("");
                        this.scrollToSection("CI_id_NavConsultantInvoicePage", "CI_id_FirstSection");
                    } catch (error) {
                        sap.m.MessageToast.show(error.message || error.responseText);
                    } finally {
                        this.closeBusyDialog(); // Close after async call finishes
                    }
                },

                onLogout: function () {
                    this.CommonLogoutFunction();
                },

                CI_CommonID: function () {
                    const ids = ["CI_id_InDate", "CI_id_PaybyInv", "CI_id_InputInvoiceTo", "CI_id_InputInvoiceAddress", "CI_id_InputCompGSTNO", "CI_id_ConsultantName", "CI_id_codeModel", "CI_id_InputMobile", "CI_id_InputConsultantAddress", "CI_id_InputGSTNO", "CI_id_InputBankName", "CI_id_InputAccountName", "CI_id_InputAccountNo", "CI_id_InputIFSCCode"]
                    ids.forEach((id) => {
                        this.byId(id).setValueState("None");
                    });
                },

                onFetchContractDetails: async function () {
                    try {
                        const contractData = await this.ajaxReadWithJQuery("EmployeeContract", {
                            Type: "Contract"
                        });
                        var jsonModel = new sap.ui.model.json.JSONModel({
                            contractDetails: contractData.data
                        });
                        this.getView().setModel(jsonModel, "contractModel");
                    } catch (error) {
                        this.closeBusyDialog(); // <-- Close custom BusyDialog
                        MessageToast.show(error.message || error.responseText);
                    }
                },

                // Common function to fetch invoice data
                commonFetchInvoiceData: async function (invoiceNo, userId) {
                    const requestData = { InvoiceNo: invoiceNo, EmployeeID: userId };
                    await this.ajaxReadWithJQuery("ConsultantInvoice", requestData).then(function (oData) {
                        this.InvoiceNo = oData.data;
                        this.EmployeeID = oData.data;
                        if (oData.data.length > 0) {
                            var invoiceData = oData.data[0];
                            invoiceData.CGST = parseFloat(invoiceData.CGST) || 0;
                            invoiceData.SGST = parseFloat(invoiceData.SGST) || 0;
                            invoiceData.IGST = parseFloat(invoiceData.IGST) || 0;

                            // Check if CGST and SGST are present
                            invoiceData.CGSTSelected = invoiceData.CGST && invoiceData.SGST ? true : false;
                            invoiceData.IGSTSelected = invoiceData.IGST ? true : false;

                            // Set visibility for CGST/SGST or IGST
                            invoiceData.CGSTVisible = invoiceData.CGST && invoiceData.SGST ? true : false;
                            invoiceData.SGSTVisible = invoiceData.SGST ? true : false;
                            invoiceData.IGSTVisible = invoiceData.IGST && (!invoiceData.CGST || !invoiceData.SGST) ? true : false;

                            if (invoiceData.GSTNO || invoiceData.GSTNO === "") {
                                invoiceData.GSTValid = false;
                            }

                            // Set the model with the updated data
                            var oNavigationModel = new sap.ui.model.json.JSONModel(invoiceData);
                            this.getView().setModel(oNavigationModel, "ConsultantInvoiceModel");
                            this.getView().byId("CI_id_InputGSTNO").setEnabled(invoiceData.Currency === "INR");
                        }
                    }.bind(this))
                        .catch(function (error) {
                            this.closeBusyDialog(); // <-- Close custom BusyDialog
                            MessageToast.show(error.message || error.responseText);
                        });
                },

                commonFetchInvoiceItems: async function (invoiceNo, userId) {
                    const requestData = { InvoiceNo: invoiceNo, EmployeeID: userId };
                    try {
                        const oData = await this.ajaxReadWithJQuery("ConsultantInvoiceItem", requestData);
                        if (oData && oData.data) {
                            var items = Array.isArray(oData.data) ? oData.data : [oData.data];
                            // Sort items
                            items.sort((a, b) => {
                                const valueA = a.Item || '';
                                const valueB = b.Item || '';
                                const isNumericA = !isNaN(valueA);
                                const isNumericB = !isNaN(valueB);

                                if (isNumericA && isNumericB) {
                                    return parseFloat(valueA) - parseFloat(valueB);
                                } else if (isNumericA) {
                                    return -1;
                                } else if (isNumericB) {
                                    return 1;
                                } else {
                                    return valueA.toUpperCase().localeCompare(valueB.toUpperCase());
                                }
                            });

                            // Add IndexNo
                            items.forEach((item, index) => {
                                item.IndexNo = index + 1;
                            });

                            //  Set ConsultantInvoiceItem in model
                            const oInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");
                            oInvoiceModel.setProperty("/ConsultantInvoiceItem", items || []);
                            oInvoiceModel.refresh(true);

                            const invoiceItemData = oData.data[0];
                            const oModelDataPro = this.getView().getModel("oModelDataPro");
                            oModelDataPro.setProperty("/CGST", parseFloat(invoiceItemData.CGST) || 0);
                            oModelDataPro.setProperty("/SGST", parseFloat(invoiceItemData.SGST) || 0);
                            oModelDataPro.setProperty("/IGST", parseFloat(invoiceItemData.IGST) || 0);

                            // Set visibility for CGST/SGST or IGST
                            oModelDataPro.setProperty("/CGSTVisible", invoiceItemData.CGST && invoiceItemData.SGST ? true : false);
                            oModelDataPro.setProperty("/SGSTVisible", invoiceItemData.SGST ? true : false);
                            oModelDataPro.setProperty("/IGSTVisible", invoiceItemData.IGST && (!invoiceItemData.CGST || !invoiceItemData.SGST) ? true : false);

                            // Update total amount
                            this.CI_updateTotalAmount();

                            var gstNo = oInvoiceModel.getProperty("/GSTNO");
                            var isGSTNOVisible = !!gstNo; // Check if GSTNO exists 
                            this.byId("CI_id_ConsultantInvoiceDeatailTable").getColumns()[2].setVisible(isGSTNOVisible);

                            var gstCalculation = items.every(function (item) {
                                return !item.GSTCalculation || item.GSTCalculation.trim() === "";
                            });

                            var gstColumn = this.byId("CI_id_GSTCalc");
                            if (gstCalculation) {
                                gstColumn.setVisible(false);
                            } else {
                                gstColumn.setVisible(true);
                            }
                        }
                    } catch (error) {
                        MessageToast.show(error.message || error.responseText);
                    } finally {
                        this.closeBusyDialog(); // Always close BusyDialog
                    }
                },

                CI_onChangeContractDetails: function (oEvent) {
                    let sValue = oEvent.getSource().getValue().split(' - ');   // Extract contract ID and name
                    let contractID = sValue[0];
                    let contractName = sValue[1];
                    let oMsgText = this.i18nModel.getText("selectContractNo"); // Confirmation message

                    let oModelData = this.getView().getModel("contractModel").getData(); // Get contract model data
                    let aContractData = Array.isArray(oModelData.contractDetails) ? oModelData.contractDetails : [];

                    // Find the matching contract
                    let oSelectedContract = aContractData.find(contract => contract.ContractNo === contractID);
                    if (!oSelectedContract) {
                        sap.m.MessageToast.show("Selected contract not found.");
                        return;
                    }

                    let sMobileNo = oSelectedContract.MobileNo || "";  // Get required fields
                    let sConsultantAddress = oSelectedContract.ConsultantAddress || "";  // Get required fields

                    // Show confirmation dialog
                    this.showConfirmationDialog(
                        this.i18nModel.getText("confirmTitle"),
                        oMsgText,
                        function () {
                            this.selectedContractID = contractID;
                            this.Copy = true;
                            this.readFunction("/ConsultantInvoice", "ConsultantInvoiceModel", true, contractID, contractName, sMobileNo, sConsultantAddress);
                            sap.m.MessageToast.show(this.i18nModel.getText("datadestroy"));
                        }.bind(this),
                        function () { }, // Cancel
                        this.i18nModel.getText("OkButton"),
                        this.i18nModel.getText("CancelButton")
                    );
                },

                readFunction: function (entitySet, modelName, isCreate, contractID, contractName, MobileNo, ConsultantAddress) {
                    this.ajaxReadWithJQuery(entitySet, {}).then(function (oData) {
                        var oJSONModel = new sap.ui.model.json.JSONModel(oData);
                        this.getView().setModel(oJSONModel, modelName);

                        if (isCreate && modelName === "ConsultantInvoiceModel") {
                            if (!this.copiedData || Object.keys(this.copiedData).length === 0) {
                                this.copiedData = {};
                            }

                            var filters = [];
                            var loginData = this.getOwnerComponent().getModel("LoginModel").getData();

                            if (this.Copy !== true) {
                                filters.push(new sap.ui.model.Filter("EmployeeID", sap.ui.model.FilterOperator.EQ, loginData.EmployeeID));
                                this.Copy = true;
                            } else if (this.selectedContractID) {
                                filters.push(new sap.ui.model.Filter("EmployeeID", sap.ui.model.FilterOperator.EQ, this.selectedContractID));
                            } else {
                                filters.push(new sap.ui.model.Filter("EmployeeID", sap.ui.model.FilterOperator.EQ, this.EmployeeID));
                                this.Copy = false;
                            }

                            var oInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");
                            if (this.Copy === false && this.Copy !== undefined) {
                                oInvoiceModel.setProperty("/EmployeeID", this.EmployeeID);
                                oInvoiceModel.setProperty("/ConsultantName", this.ConsultantName);
                            } else if (contractID) {
                                oInvoiceModel.setProperty("/EmployeeID", contractID);
                                oInvoiceModel.setProperty("/ConsultantName", contractName);
                            } else {
                                oInvoiceModel.setProperty("/EmployeeID", loginData.EmployeeID);
                                oInvoiceModel.setProperty("/ConsultantName", loginData.EmployeeName);
                            }

                            var oToday = new Date();
                            oToday.setHours(0, 0, 0, 0);

                            var oValidUntil = new Date(oToday);
                            oValidUntil.setDate(oValidUntil.getDate() + 30);

                            var oCompanyDetails = this.getView().getModel("CompanyCodeDetailsModel").getData()[0];
                            var InvoiceTo = oCompanyDetails.companyName;
                            var InvoiceAddress = oCompanyDetails.longAddress;
                            var CompanyGSTNO = oCompanyDetails.gstin;

                            oInvoiceModel.setProperty("/InvoiceTo", InvoiceTo);
                            oInvoiceModel.setProperty("/InvoiceAddress", InvoiceAddress);
                            oInvoiceModel.setProperty("/CompanyGSTNO", CompanyGSTNO);
                            oInvoiceModel.setProperty("/InvoiceDate", oToday);
                            oInvoiceModel.setProperty("/PayBy", oValidUntil);
                            oInvoiceModel.setProperty("/GSTValid", false);
                            oInvoiceModel.setProperty("/Currency", "INR");
                            oInvoiceModel.setProperty("/STDCode", "+91");
                            oInvoiceModel.setProperty("/MobileNo", MobileNo || "");
                            oInvoiceModel.setProperty("/ConsultantAddress", ConsultantAddress || "");

                            // Set visibility and enabled states
                            var oColumnGST = this.getView().byId("CI_id_ColumnGST");
                            if (oColumnGST) oColumnGST.setVisible(false);

                            var oGSTCalc = this.getView().byId("CI_id_GSTCalc");
                            if (oGSTCalc) oGSTCalc.setVisible(false);

                            this.getView().getModel("visiablityPlay").setProperty("/copyBtn", false);
                            // this.getView().getModel("visiablityPlay").setProperty("/pasteBtn", false);

                            var oGSTInput = this.getView().byId("CI_id_InputGSTNO");
                            if (oGSTInput) oGSTInput.setEnabled(oInvoiceModel.getProperty("/Currency") === "INR");

                            var oContractModel = this.getView().getModel("contractModel");
                            if (oContractModel) {
                                var contData = oContractModel.getData();

                                if (loginData.Role === "Contractor" && contData) {
                                    var aCData = Array.isArray(contData.contractDetails) ? contData.contractDetails : [];
                                    var oSelectedContract = aCData.find(contract => contract.ContractNo === loginData.EmployeeID);

                                    if (!oSelectedContract) {
                                        sap.m.MessageToast.show("Selected contract not found.");
                                        this.closeBusyDialog();
                                        return;
                                    }

                                    oInvoiceModel.setProperty("/MobileNo", oSelectedContract.MobileNo || "");
                                    oInvoiceModel.setProperty("/ConsultantAddress", oSelectedContract.ConsultantAddress || "");
                                }
                            }
                            this.CI_onPressPasteBtn();
                            this.closeBusyDialog();
                        }
                    }.bind(this)).catch(function (error) {
                        this.closeBusyDialog();
                        sap.m.MessageToast.show(error.message || error.responseText);
                    }.bind(this));
                },

                setVisibilityForEdit: function () {
                    this.getView().getModel("visiablityPlay").setProperty("/editVisi", true);
                    this.getView().getModel("visiablityPlay").setProperty("/createVisi", false);
                    this.getView().getModel("visiablityPlay").setProperty("/editable", false);
                    this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("None");
                    this.getView().getModel("visiablityPlay").setProperty("/invBtn", false);
                    this.getView().getModel("visiablityPlay").setProperty("/copyBtn", true);
                    // this.getView().getModel("visiablityPlay").setProperty("/pasteBtn", false);
                    this.getView().getModel("visiablityPlay").setProperty("/merge", true);
                },

                CI_onPressEdit: function () {
                    var isEditMode = this.getView().getModel("visiablityPlay").getProperty("/editable");
                    if (isEditMode) {
                        this.onPressUpdateInvoice();
                    } else {
                        this.getView().getModel("visiablityPlay").setProperty("/editable", true);
                        this.getView().getModel("visiablityPlay").setProperty("/invBtn", true);
                        this.getView().getModel("visiablityPlay").setProperty("/copyBtn", false);
                        this.getView().getModel("visiablityPlay").setProperty("/merge", false);
                        this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("Delete");
                        if (this.getView().getModel("ConsultantInvoiceModel").getData().GSTNO) {
                            this.getView().getModel("ConsultantInvoiceModel").setProperty("/GSTValid", true);
                        }
                    }
                },

                CI_onPressAddInvoiceDetails: function () {
                    var oModel = this.getView().getModel("ConsultantInvoiceModel");
                    var oData = oModel.getData();

                    if (!oData.ConsultantInvoiceItem) {
                        oData.ConsultantInvoiceItem = [];
                    }

                    var loginData = this.getOwnerComponent().getModel("LoginModel").getData();
                    var employeeID = loginData.EmployeeID;

                    var oVisibilityModel = this.getView().getModel("visiablityPlay");
                    var bEditMode = oVisibilityModel.getProperty("/editable");

                    var gstInput = this.byId("CI_id_InputGSTNO").getValue();
                    var GSTCalculationValue = gstInput ? "YES" : "NO";

                    var oNewInvoiceItem = {
                        IndexNo: oData.ConsultantInvoiceItem.length > 0
                            ? oData.ConsultantInvoiceItem[oData.ConsultantInvoiceItem.length - 1].IndexNo + 1
                            : 1,
                        EmployeeID: employeeID,
                        Item: "",
                        SAC: "",
                        GSTCalculation: GSTCalculationValue,
                        Days: "",
                        UnitPrice: "",
                        Discount: "",
                        Total: "",
                        Currency: "INR"
                    };

                    // If in edit mode, add flag
                    if (bEditMode) {
                        oNewInvoiceItem.flag = "create";
                    }

                    oData.ConsultantInvoiceItem.push(oNewInvoiceItem);
                    oModel.setData(oData);
                    oModel.refresh(true);
                },

                CI_onInputChange: async function (oEvent) {
                     this.UnitAmount = utils._LCvalidateAmount(oEvent);

                    const oInput = oEvent.getSource();
                    const oBindingContext = oInput.getBindingContext("ConsultantInvoiceModel");
                    if (!oBindingContext) return;

                    var oItemContext = oBindingContext.getObject();
                    var days = parseFloat(oItemContext.Days) || 0;
                    var unit = parseFloat(oItemContext.UnitPrice) || 0;
                    var discount = parseFloat(oItemContext.Discount) || 0;

                    var iTotal = days ? days * unit : unit;
                    iTotal = iTotal - discount;

                    oBindingContext.getModel().setProperty(oBindingContext.getPath() + "/Total", isNaN(iTotal) ? 0 : parseFloat(iTotal.toFixed(2)));

                    await this.CI_updateTotalAmount();
                },

                CI_updateTotalAmount: function () {
                    var oModel = this.getView().getModel("oModelDataPro");
                    var oConsultantInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");
                    var aItems = oConsultantInvoiceModel.getProperty("/ConsultantInvoiceItem") || [];

                    var subTotalTaxable = 0,
                        subTotalNonTaxable = 0;
                    var cgst = 0,
                        sgst = 0,
                        igst = 0,
                        totalSum = 0;

                    aItems.forEach(function (oItem) {
                        var unit = parseFloat(oItem.Days) || 0;
                        var rate = parseFloat(oItem.UnitPrice || 0);
                        const baseAmount = unit ? unit * rate : rate;

                        let discountAmount = 0;
                        if (typeof oItem.Discount === "string" && oItem.Discount.trim().endsWith("%")) {
                            const percent = parseFloat(oItem.Discount) / 100;
                            discountAmount = baseAmount * percent;
                            oItem.Discount = discountAmount.toFixed(2);
                        } else {
                            discountAmount = parseFloat(oItem.Discount) || 0;
                        }

                        const finalAmount = baseAmount - discountAmount;
                        if (finalAmount < 0) {
                            oItem.Total = '0.00';
                            oItem.Discount = unit * rate;
                        } else {
                            oItem.Total = finalAmount.toFixed(2);
                        }

                        // GST-related subtotal
                        if (oItem.GSTCalculation === "YES") {
                            subTotalTaxable += parseFloat(oItem.Total);
                            oItem.SAC = "998314";
                        } else {
                            subTotalNonTaxable += parseFloat(oItem.Total);
                            oItem.SAC = "-";
                        }
                    });

                    oModel.setProperty("/SubTotal", parseFloat(subTotalTaxable.toFixed(2)));
                    oModel.setProperty("/SubTotalNotGST", parseFloat(subTotalNonTaxable.toFixed(2)));
                    var oData = oConsultantInvoiceModel.getData();
                    var cgstPercentage = oData.CGSTSelected ? parseFloat(oData.Percentage || 9) : 0;
                    var sgstPercentage = oData.CGSTSelected ? parseFloat(oData.Percentage || 9) : 0;
                    var igstPercentage = oData.IGSTSelected ? parseFloat(oData.Percentage || 18) : 0;

                    var cgst = 0,
                        sgst = 0,
                        igst = 0,
                        totalSum = 0;

                    if (oData.CGSTSelected) {
                        cgst = subTotalTaxable * (cgstPercentage / 100);
                        sgst = subTotalTaxable * (sgstPercentage / 100);
                        totalSum = subTotalTaxable + subTotalNonTaxable + cgst + sgst;
                        oModel.setProperty("/CGST", parseFloat(cgst.toFixed(2)));
                        oModel.setProperty("/SGST", parseFloat(sgst.toFixed(2)));
                        oModel.setProperty("/CGSTPercentage", cgstPercentage);
                        oModel.setProperty("/SGSTPercentage", sgstPercentage);
                    } else if (oData.IGSTSelected) {
                        igst = subTotalTaxable * (igstPercentage / 100);
                        totalSum = subTotalTaxable + subTotalNonTaxable + igst;
                        oModel.setProperty("/IGST", parseFloat(igst.toFixed(2)));
                        oModel.setProperty("/IGSTPercentage", igstPercentage);
                    } else {
                        totalSum = subTotalTaxable + subTotalNonTaxable
                        oModel.setProperty("/CGST", 0);
                        oModel.setProperty("/SGST", 0);
                        oModel.setProperty("/IGST", 0);
                        oModel.setProperty("/CGSTPercentage", 0);
                        oModel.setProperty("/SGSTPercentage", 0);
                        oModel.setProperty("/IGSTPercentage", 0);
                    }
                    oModel.setProperty("/TotalSum", parseFloat(totalSum.toFixed(2)));
                    oModel.refresh();
                },

                CI_onchangeDiscount: function (oEvent) {
                    var sValue = oEvent.getParameter("value").trim();
                    var regex = /^[0-9]+(\.[0-9]{1,2})?%?$/;
                    var oInput = oEvent.getSource();
                    sValue = sValue.replace(/[^0-9.%]/g, "");

                    var isPercentage = sValue.indexOf('%') !== -1;
                    if (isPercentage) {
                        sValue = sValue.replace('%', '');
                    }

                    var parts = sValue.split('.');
                    if (parts.length > 1) {
                        parts[1] = parts[1].substring(0, 2);
                        sValue = parts.join('.');
                    }

                    if (isPercentage) {
                        sValue = sValue + '%';
                    }
                    oInput.setValue(sValue);

                    if (!sValue) {
                        oInput.setValueState("None");
                        oInput.setValueStateText("");
                        this.CI_updateTotalAmount();
                        this.Discount = true;
                    } else if (!regex.test(sValue)) {
                        oInput.setValueState("Error");
                        oInput.setValueStateText(this.i18nModel.getText("discountValueText"));
                        this.Discount = false;
                    } else {
                        oInput.setValueState("None");
                        oInput.setValueStateText("");
                        this.CI_updateTotalAmount();
                        this.Discount = true;
                    }
                },

                CI_onChangeGSTCalculation: function () {
                    this.CI_updateTotalAmount();
                },

                CI_onPercentageChange: function (oEvent) {
                    var sPercentage = oEvent.getParameter("value");
                    var oModel = this.getView().getModel("ConsultantInvoiceModel");

                    oModel.setProperty("/Percentage", sPercentage);
                    this.CI_updateTotalAmount();
                },

                CI_onSelectCGST: function () {
                    this.getView().byId("CI_id_CheckboxIGST").setSelected(false);

                    var oModel = this.getView().getModel("oModelDataPro");
                    var oConsultantInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");

                    oModel.setProperty("/CGSTSelected", true);
                    oModel.setProperty("/IGSTSelected", false);

                    oModel.setProperty("/CGSTVisible", true);
                    oModel.setProperty("/SGSTVisible", true);
                    oModel.setProperty("/IGSTVisible", false);
                    oModel.setProperty("/IGST", 0);

                    oConsultantInvoiceModel.setProperty("/CGSTVisible", true);
                    oConsultantInvoiceModel.setProperty("/SGSTVisible", true);
                    oConsultantInvoiceModel.setProperty("/IGSTVisible", false);

                    oConsultantInvoiceModel.setProperty("/Percentage", 9);
                    oConsultantInvoiceModel.setProperty("/CGSTSelected", true);

                    this.CI_updateTotalAmount();
                },

                CI_onSelectIGST: function () {
                    this.getView().byId("CI_id_CheckboxCGST").setSelected(false);

                    var oModel = this.getView().getModel("oModelDataPro");
                    var oConsultantInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");

                    oModel.setProperty("/IGSTSelected", true);
                    oModel.setProperty("/CGSTSelected", false);

                    oModel.setProperty("/IGSTVisible", true);
                    oModel.setProperty("/CGSTVisible", false);
                    oModel.setProperty("/SGSTVisible", false);
                    oModel.setProperty("/CGST", 0);
                    oModel.setProperty("/SGST", 0);

                    oConsultantInvoiceModel.setProperty("/IGSTVisible", true);
                    oConsultantInvoiceModel.setProperty("/CGSTVisible", false);
                    oConsultantInvoiceModel.setProperty("/SGSTVisible", false);

                    oConsultantInvoiceModel.setProperty("/Percentage", 18);
                    oConsultantInvoiceModel.setProperty("/IGSTSelected", true);

                    this.CI_updateTotalAmount();
                },

                CI_onPressDelete: function (oEvent) {
                    var that = this;
                    var oModel = this.getView().getModel("ConsultantInvoiceModel");
                    var oContext = oEvent.getParameter("listItem").getBindingContext("ConsultantInvoiceModel");
                    var sIndex = oContext.getPath().split("/")[2];
                    var aData = oModel.getData();
                    var oItemData = oContext.getObject();

                    if (oItemData.InvoiceNo && oItemData.SlNo) {
                        // If the item is saved in DB
                        this.showConfirmationDialog(
                            this.i18nModel.getText("msgBoxConfirm"),
                            this.i18nModel.getText("msgBoxConfirmDelete"),
                            function () {
                                that.getBusyDialog();

                                that.ajaxDeleteWithJQuery("/ConsultantInvoiceItem", {
                                    filters: {
                                        InvoiceNo: oItemData.InvoiceNo,
                                        SlNo: oItemData.SlNo
                                    }
                                }).then(() => {
                                    aData.ConsultantInvoiceItem.splice(sIndex, 1);
                                    aData.ConsultantInvoiceItem.forEach((item, index) => item.IndexNo = index + 1);
                                    oModel.setProperty("/ConsultantInvoiceItem", aData.ConsultantInvoiceItem);
                                    that.SNoValue = aData.ConsultantInvoiceItem.length;
                                    that.CI_updateTotalAmount();
                                    MessageToast.show(that.i18nModel.getText("consultantInvoiceDeleteSuccess"));
                                    that.closeBusyDialog();
                                }).catch((error) => {
                                    that.closeBusyDialog();
                                    MessageToast.show(error.message || error.responseText);
                                });
                            },
                            function () {
                                that.closeBusyDialog();
                            }
                        );
                    } else {
                        // Local item – delete directly
                        aData.ConsultantInvoiceItem.splice(sIndex, 1);
                        aData.ConsultantInvoiceItem.forEach((item, index) => item.IndexNo = index + 1);
                        oModel.setProperty("/ConsultantInvoiceItem", aData.ConsultantInvoiceItem);
                        this.SNoValue = aData.ConsultantInvoiceItem.length;
                        this.CI_updateTotalAmount();
                        MessageToast.show("Invoice item deleted successfully.");
                    }
                },

                CI_onChangeGstNo: function () {
                    // this.getView().getModel("visiablityPlay").setProperty("/pasteBtn", false);
                    this.copiedData = {}; // Reset copied data
                    var gstInput = this.byId("CI_id_InputGSTNO").getValue().trim();
                    var gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
                    var isGSTValid = gstRegex.test(gstInput);
                    if (isGSTValid) {
                        // Extract first 2 digits (state code)
                        const stateCode = gstInput.substring(0, 2);
                        if (stateCode === "29") {
                            this.CI_onSelectCGST();
                        } else {
                            this.CI_onSelectIGST();
                        }
                    }
                },

                CI_onPressCopyBtn: function () {
                    this.Copy = true;
                    this.getBusyDialog(); // Show custom BusyDialog
                    var oModel = this.getView().getModel("ConsultantInvoiceModel");
                    var oData = oModel.getProperty("/");

                    if (oData.InvoiceNo) {
                        this.copiedData = {
                            ConsultantName: oData.ConsultantName,
                            InvoiceTo: oData.InvoiceTo,
                            InvoiceAddress: oData.InvoiceAddress,
                            ConsultantAddress: oData.ConsultantAddress,
                            GSTNO: oData.GSTNO,
                            CompanyGSTNO: oData.CompanyGSTNO,
                            MobileNo: oData.MobileNo,
                            BankName: oData.BankName,
                            AccountName: oData.AccountName,
                            AccountNo: oData.AccountNo,
                            IFSCCode: oData.IFSCCode,
                            Currency: oData.Currency,
                            InvoiceDate: oData.InvoiceDate,
                            PayBy: oData.PayBy,
                        };

                        this.EmployeeID = oModel.getData().EmployeeID;
                        this.ConsultantName = oModel.getData().ConsultantName;
                        // Navigate to the specified route after copying
                        this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
                            sPath: "X",
                            oPath: "Y"
                        });
                    } else {
                        sap.m.MessageToast.show("No matching data found for the provided InvoiceNo and EmployeeID.");
                    }
                },

                CI_onPressPasteBtn: function () {
                    try {
                        this.Copy = false;
                        var oModel = this.getView().getModel("ConsultantInvoiceModel");

                        if (this.copiedData && Object.keys(this.copiedData).length > 0) {
                            if (oModel) {
                                // Paste copied data
                                Object.keys(this.copiedData).forEach(key => {
                                    oModel.setProperty("/" + key, this.copiedData[key]);
                                });

                                // Validate GST Number and set column visibility
                                var gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
                                var isGSTValid = gstRegex.test(this.copiedData.GSTNO);

                                oModel.setProperty("/GSTValid", isGSTValid && this.copiedData.GSTNO.trim() !== "");

                                var oGSTColumn = this.byId("CI_id_ColumnGST");
                                oGSTColumn.setVisible(isGSTValid);

                                var oGSTCalColumn = this.byId("CI_id_GSTCalc");
                                oGSTCalColumn.setVisible(isGSTValid);

                                // Trigger currency validation
                                if (this.copiedData.Currency !== "INR") {
                                    this.CI_onCurrencyChange(); // Trigger for non-INR currencies
                                } else {
                                    this.CI_onChangeGstNo(); // Trigger GST validation for INR currency
                                }

                                // Show success message and hide the paste button
                                sap.m.MessageToast.show("Data pasted successfully!");

                                // Clear copied data
                                this.copiedData = {}; // Reset copied data
                                this.closeBusyDialog();
                            }
                        }
                    } catch (error) {
                        this.closeBusyDialog();
                        sap.m.MessageToast.show(error.message || error.responseText);
                    }
                },

                CI_onCurrencyChange: function () {
                    var oConsultantModel = this.getView().getModel("ConsultantInvoiceModel");
                    var currency = oConsultantModel.getProperty("/Currency");

                    var oModelDataPro = this.getView().getModel("oModelDataPro");
                    var totalSum = parseFloat(oModelDataPro.getProperty("/TotalSum")) || 0;
                    var cgst = parseFloat(oModelDataPro.getProperty("/CGST")) || 0;
                    var sgst = parseFloat(oModelDataPro.getProperty("/SGST")) || 0;
                    var igst = parseFloat(oModelDataPro.getProperty("/IGST")) || 0;

                    var gstInputField = this.byId("CI_id_InputGSTNO");
                    var isGSTValid = utils._LCvalidateGstNumber({
                        getSource: () => gstInputField
                    });
                    oConsultantModel.setProperty("/GSTValid", isGSTValid && gstInputField !== "");
                    var gstValue = gstInputField.getValue().trim();

                    // Handle GST empty case
                    if (gstValue === "") {
                        gstInputField.setValueState("None");
                        oConsultantModel.setProperty("/GSTValid", false);
                    }

                    var oGSTColumn = this.byId("CI_id_ColumnGST");
                    var oGSTCalColumn = this.byId("CI_id_GSTCalc");

                    var isVisible = isGSTValid && gstInputField !== "" && currency === "INR";
                    oGSTColumn.setVisible(isVisible);
                    oGSTCalColumn.setVisible(isVisible);

                    if (currency !== "INR") {
                        var updatedTotalSum = totalSum;
                        var oData = oConsultantModel.getData();

                        if (oData.CGSTSelected) {
                            updatedTotalSum -= (cgst + sgst);
                        } else if (oData.IGSTSelected) {
                            updatedTotalSum -= igst;
                        }

                        oModelDataPro.setProperty("/SubTotalNotGST", updatedTotalSum.toFixed(2));
                        oModelDataPro.setProperty("/TotalSum", updatedTotalSum.toFixed(2));
                        oModelDataPro.setProperty("/SubTotal", "");

                        var gstProperties = ["/CGSTVisible", "/IGSTVisible", "/SGSTVisible", "/CGSTSelected", "/IGSTSelected"];
                        gstProperties.forEach(prop => {
                            oConsultantModel.setProperty(prop, false);
                            oModelDataPro.setProperty(prop, false);
                        });

                        oConsultantModel.setProperty("/Percentage", "");
                        oConsultantModel.setProperty("/GSTNO", "");
                        oConsultantModel.setProperty("/GSTValid", false);
                        this.getView().byId("CI_id_InputGSTNO").setEnabled(false);
                    } else {
                        gstInputField.setValueState("None");
                        this.getView().byId("CI_id_InputGSTNO").setEnabled(true);
                    }
                },

                CID_DateValidate: function (oEvent) {
                    var oStartDate = oEvent.getSource().getDateValue(); // Get selected Start Date
                    var oView = this.getView();
                    var oEndDatePicker = oView.byId("CI_id_PaybyInv");

                    if (oStartDate) {
                        oEndDatePicker.setMinDate(oStartDate);  // Set min date for end date picker
                        var oEndDate = new Date(oStartDate); // Calculate end date = start date + 30 days
                        oEndDate.setDate(oEndDate.getDate() + 30);

                        // Format for display in DatePicker
                        var oLocale = sap.ui.getCore().getConfiguration().getFormatSettings().getFormatLocale();
                        var oDateFormatDisplay = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy", locale: oLocale });

                        // Format for model
                        var oDateFormatModel = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                        var sStartDateFormatted = oDateFormatModel.format(oStartDate);
                        var sEndDateFormatted = oDateFormatModel.format(oEndDate);
                        oEndDatePicker.setValue(oDateFormatDisplay.format(oEndDate));  // Set EndDate in the UI

                        var oModel = oView.getModel("ConsultantInvoiceModel");
                        oModel.setProperty("/InvoiceDate", sStartDateFormatted);
                        oModel.setProperty("/PayBy", sEndDateFormatted);
                    }

                    // Validate the start date field
                    utils._LCvalidateDate(oEvent.getSource(), "ID");
                },

                CID_LastDate: function (oEvent) {
                    utils._LCvalidateDate(oEvent)
                },

                CID_ValidateConsultantGstNumber: function (oEvent) {
                    var oInput = oEvent.getSource ? oEvent.getSource() : this.byId("CI_id_InputGSTNO");

                    if (oInput.getValue() === "") {
                        oInput.setValueState("None");
                    }

                    var gstInputField = this.byId("CI_id_InputGSTNO");
                    var gstInput = gstInputField.getValue().trim();
                    var isGSTValid = utils._LCvalidateGstNumber({
                        getSource: () => gstInputField
                    });

                    if (gstInput === "") {
                        gstInputField.setValueState("None");
                    }

                    // Set GSTCalculation flag based on GST validity
                    var oConsultantModel = this.getView().getModel("ConsultantInvoiceModel");
                    var oData = oConsultantModel.getData();
                    var GSTCalculationValue = (isGSTValid && gstInput !== "") ? "YES" : "NO";

                    // Update GSTCalculation for each item
                    if (Array.isArray(oData.ConsultantInvoiceItem)) {
                        oData.ConsultantInvoiceItem.forEach(item => {
                            item.GSTCalculation = GSTCalculationValue;
                        });
                    }
                    // Apply changes back to the model
                    oConsultantModel.setData(oData);
                    oConsultantModel.refresh(true);

                    // Extract first 2 digits (state code)Add commentMore actions
                    const stateCode = gstInput.substring(0, 2);

                    if (isGSTValid && stateCode === "29") {
                        this.CI_onSelectCGST();
                    } else if (isGSTValid && stateCode !== "29") {
                        this.CI_onSelectIGST();
                    }

                    oConsultantModel.setProperty("/GSTValid", isGSTValid && gstInput !== "");
                    var oGSTColumn = this.byId("CI_id_ColumnGST");
                    var oGSTCalColumn = this.byId("CI_id_GSTCalc");
                    var isVisible = isGSTValid && gstInput !== "";
                    oGSTColumn.setVisible(isVisible);
                    oGSTCalColumn.setVisible(isVisible);

                    var oModelDataPro = this.getView().getModel("oModelDataPro");
                    var totalSum = parseFloat(oModelDataPro.getProperty("/TotalSum")) || 0;
                    var cgst = parseFloat(oModelDataPro.getProperty("/CGST")) || 0;
                    var sgst = parseFloat(oModelDataPro.getProperty("/SGST")) || 0;
                    var igst = parseFloat(oModelDataPro.getProperty("/IGST")) || 0;

                    if (gstInput === "") {
                        var updatedTotalSum = totalSum;
                        var oData = oConsultantModel.getData();

                        if (oData.CGSTSelected) {
                            updatedTotalSum -= (cgst + sgst);
                        } else if (oData.IGSTSelected) {
                            updatedTotalSum -= igst;
                        }

                        oModelDataPro.setProperty("/SubTotalNotGST", updatedTotalSum.toFixed(2));
                        oModelDataPro.setProperty("/TotalSum", updatedTotalSum.toFixed(2));
                        oModelDataPro.setProperty("/SubTotal", "");

                        ["CGSTVisible", "IGSTVisible", "SGSTVisible"].forEach(prop => {
                            oConsultantModel.setProperty(`/${prop}`, false);
                            oModelDataPro.setProperty(`/${prop}`, false);
                        });

                        oConsultantModel.setProperty("/Percentage", "");
                        ["CGSTSelected", "IGSTSelected"].forEach(prop => {
                            oConsultantModel.setProperty(`/${prop}`, false);
                            oModelDataPro.setProperty(`/${prop}`, false);
                        });
                    }
                },

                CID_ValidateGstNumber: function (oEvent) {
                    var oInput = oEvent.getSource();
                    utils._LCvalidateGstNumber(oEvent);
                    if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateCommonFields: function (oEvent) {
                    var oInput = oEvent.getSource();
                    utils._LCvalidateMandatoryField(oEvent);
                    if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateName: function (oEvent) {
                    var oInput = oEvent.getSource();
                    utils._LCvalidateName(oEvent);
                    if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateMobileNo: function (oEvent) {
                    var oInput = oEvent.getSource();
                    utils._LCvalidateMobileNumber(oEvent);
                    if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateAccountNo: function (oEvent) {
                    var oInput = oEvent.getSource();
                    utils._LCvalidateAccountNo(oEvent);
                    if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateIfscCode: function (oEvent) {
                    var oInput = oEvent.getSource();
                    utils._LCvalidateIfcCode(oEvent);
                    if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateComboBox: function (oEvent) {
                    var oInput = oEvent.getSource();
                    utils._LCstrictValidationComboBox(oEvent);
                    if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_onItemDescriptionLiveChange: function (oEvent) {
                    utils._LCvalidateMandatoryField(oEvent);
                },

                CI_onPressback: function () {
                    var isEditMode = this.getView().getModel("visiablityPlay").getProperty("/editable");
                    if (isEditMode) {
                        this.showConfirmationDialog(
                            this.i18nModel.getText("ConfirmActionTitle"),
                            this.i18nModel.getText("backConfirmation"),
                            function () {
                                // Reset edit-related flags
                                this.getView().getModel("visiablityPlay").setProperty("/editable", false);
                                this.getView().getModel("visiablityPlay").setProperty("/invBtn", false);
                                this.getView().getModel("visiablityPlay").setProperty("/copyBtn", true);
                                this.getView().getModel("visiablityPlay").setProperty("/merge", true);

                                // Set table mode back to default (e.g., "None")
                                this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("None");

                                // Navigate back
                                this.getRouter().navTo("RouteConsultantInvoiceApplication");
                            }.bind(this)
                        );
                    } else {
                        this.getRouter().navTo("RouteConsultantInvoiceApplication");
                    }
                },

                CI_onPressSubmit: async function () {
                    try {
                        const that = this;
                        var isMandatoryValid = (
                            utils._LCvalidateDate(this.byId("CI_id_InDate"), "ID") &&
                            utils._LCvalidateDate(this.byId("CI_id_PaybyInv"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceTo"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceAddress"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_ConsultantName"), "ID") &&
                            utils._LCstrictValidationComboBox(this.byId("CI_id_codeModel"), "ID") &&
                            utils._LCvalidateMobileNumber(this.byId("CI_id_InputMobile"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputConsultantAddress"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputBankName"), "ID") &&
                            utils._LCvalidateName(this.byId("CI_id_InputAccountName"), "ID") &&
                            utils._LCvalidateAccountNo(this.byId("CI_id_InputAccountNo"), "ID") &&
                            utils._LCvalidateIfcCode(this.byId("CI_id_InputIFSCCode"), "ID"));
                        if (!isMandatoryValid) {
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                            return;
                        }
                        {
                            const invoiceModel = that.getView().getModel("ConsultantInvoiceModel");
                            const invoiceData = invoiceModel.getData();

                            const itemModel = that.getView().getModel("oModelDataPro");
                            const itemData = itemModel.getData();

                            var isValid = true;
                            if (invoiceData.GSTNO && !utils._LCvalidateGstNumber(this.byId("CI_id_InputGSTNO"), "ID"))
                                isValid = false;
                            if (invoiceData.CompanyGSTNO && !utils._LCvalidateGstNumber(this.byId("CI_id_InputCompGSTNO"), "ID"))
                                isValid = false;
                            if (!isValid) {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                                return;
                            }

                            // Validate all item descriptions and unit prices are filled and valid
                            const aItemArray1 = invoiceModel.getProperty("/ConsultantInvoiceItem") || [];
                            const bAllItemsValid = aItemArray1.every(item =>
                                item.Item && item.Item.trim().length > 0 &&
                                item.UnitPrice && parseFloat(item.UnitPrice) > 0
                            );

                            if (!bAllItemsValid) {
                                MessageToast.show(this.i18nModel.getText("quotaionMsgDes"));
                                return;
                            }

                            if (!itemData.TotalSum || itemData.TotalSum <= 0) {
                                MessageToast.show("Please ensure that at least one item is filled!");
                                return;
                            }

                            if (invoiceData.GSTNO && invoiceData.Percentage && invoiceData.CGSTSelected && invoiceData.IGSTVisible) {
                                MessageToast.show("Checkbox and the percentage field are filled in before Submit");
                                return;
                            }

                            const bOptionalValid = !!this.Discount && !!this.UnitAmount;
                            if (!bOptionalValid) {
                                return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                            }

                            // Clean up unnecessary fields
                            delete invoiceData.results;
                            delete invoiceData.GSTValid;
                            delete invoiceData.CGSTSelected;
                            delete invoiceData.IGSTSelected;

                            const invoiceItemData = this.byId("CI_id_ConsultantInvoiceDeatailTable").getModel("ConsultantInvoiceModel")
                                .getData().ConsultantInvoiceItem;

                            // Format dates
                            const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                            const sInvoiceDate = oDateFormat.format(this.byId("CI_id_InDate").getDateValue());
                            const sPayByDate = oDateFormat.format(this.byId("CI_id_PaybyInv").getDateValue());

                            const cleanedInvoiceItems = Array.isArray(invoiceItemData)
                                ? invoiceItemData.map(item => {
                                    const cleanItem = { ...item };
                                    delete cleanItem.IndexNo;

                                    return {
                                        EmployeeID: invoiceData.EmployeeID,
                                        Item: cleanItem.Item,
                                        Days: cleanItem.Days,
                                        SAC: (invoiceData.GSTNO !== undefined && invoiceData.GSTNO !== "") ? (cleanItem.SAC || "") : "",
                                        GSTCalculation: (invoiceData.GSTNO !== undefined && invoiceData.GSTNO !== "") ? (cleanItem.GSTCalculation || "") : "",
                                        UnitPrice: parseFloat(cleanItem.UnitPrice),
                                        Discount: cleanItem.Discount === undefined ? "" : String(cleanItem.Discount),
                                        Total: parseFloat(cleanItem.Total),
                                        Currency: invoiceData.Currency,
                                    };
                                }) : [];

                            const consultantInvoicePayload = {
                                EmployeeID: invoiceData.EmployeeID,
                                ConsultantName: invoiceData.ConsultantName,
                                InvoiceTo: invoiceData.InvoiceTo,
                                InvoiceAddress: invoiceData.InvoiceAddress,
                                InvoiceDate: sInvoiceDate,
                                ConsultantAddress: invoiceData.ConsultantAddress,
                                GSTNO: invoiceData.GSTNO || "",
                                CompanyGSTNO: invoiceData.CompanyGSTNO || "",
                                MobileNo: invoiceData.MobileNo,
                                CGST: invoiceData.CGSTSelected === false ? 0.0 : parseFloat(itemData.CGST) || 0.0,
                                SGST: invoiceData.CGSTSelected === false ? 0.0 : parseFloat(itemData.SGST) || 0.0,
                                IGST: invoiceData.IGSTSelected === false ? 0.0 : parseFloat(itemData.IGST) || 0.0,
                                SubTotal: parseFloat(itemData.SubTotal) || 0,
                                SubTotalNotGST: parseFloat(itemData.SubTotalNotGST) || 0,
                                TotalSum: parseFloat(itemData.TotalSum) || 0,
                                BankName: invoiceData.BankName,
                                AccountName: invoiceData.AccountName,
                                AccountNo: invoiceData.AccountNo,
                                IFSCCode: invoiceData.IFSCCode,
                                PayBy: sPayByDate,
                                Currency: invoiceData.Currency,
                                Percentage: invoiceData.Percentage || "",
                                STDCode: invoiceData.STDCode || "",
                            };

                            const combinedPayload = {
                                data: consultantInvoicePayload,
                                Items: cleanedInvoiceItems
                            };

                            // Submit invoice
                            this.getBusyDialog();
                            try {
                                const response = await that.ajaxCreateWithJQuery("ConsultantInvoice", combinedPayload);
                                this.closeBusyDialog();

                                if (response.success === true) {
                                    invoiceModel.setProperty("/CGST", consultantInvoicePayload.CGST);
                                    invoiceModel.setProperty("/SGST", consultantInvoicePayload.SGST);
                                    invoiceModel.setProperty("/IGST", consultantInvoicePayload.IGST);
                                    invoiceModel.setProperty("/SubTotal", consultantInvoicePayload.SubTotal);
                                    invoiceModel.setProperty("/SubTotalNotGST", consultantInvoicePayload.SubTotalNotGST);
                                    invoiceModel.setProperty("/TotalSum", consultantInvoicePayload.TotalSum);
                                    invoiceModel.setProperty("/InvoiceDate", sInvoiceDate);
                                    invoiceModel.setProperty("/PayBy", sPayByDate);
                                    invoiceData.InvoiceNo = response.InvoiceNo;
                                    var oDialog = new sap.m.Dialog({
                                        title: this.i18nModel.getText("success"),
                                        type: sap.m.DialogType.Message,
                                        state: sap.ui.core.ValueState.Success,
                                        content: new sap.m.Text({
                                            text: this.i18nModel.getText("invoiceCreatemsg")
                                        }),
                                        beginButton: new sap.m.Button({
                                            text: "OK",
                                            type: "Accept",
                                            press: function () {
                                                oDialog.close();
                                                that.getRouter().navTo("RouteConsultantInvoiceApplication");
                                            }
                                        }),
                                        endButton: new sap.m.Button({
                                            text: "Generate PDF",
                                            type: "Attention",
                                            press: function () {
                                                oDialog.close();
                                                that.CI_onPressGeneratePdf();
                                                that.getRouter().navTo("RouteConsultantInvoiceApplication");
                                            }
                                        }),
                                        afterClose: function () {
                                            oDialog.destroy();
                                        }
                                    });

                                    oDialog.open();
                                } else {
                                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                                }
                            } catch (error) {
                                this.closeBusyDialog();
                                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                            }
                        }
                    } catch (error) {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    }
                },

                onPressUpdateInvoice: async function () {
                    var oView = this.getView();
                    var oConsultantInvoiceModel = oView.getModel("ConsultantInvoiceModel").getData();
                    var oModelDataPro = oView.getModel("oModelDataPro").getData();
                    var Currency = oConsultantInvoiceModel.Currency;

                    // Format dates
                    const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                    const sInvoiceDate = oDateFormat.format(this.byId("CI_id_InDate").getDateValue());
                    const sPayByDate = oDateFormat.format(this.byId("CI_id_PaybyInv").getDateValue());

                    var isMandatoryValid = (
                        utils._LCvalidateDate(this.byId("CI_id_InDate"), "ID") &&
                        utils._LCvalidateDate(this.byId("CI_id_PaybyInv"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceTo"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceAddress"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CI_id_ConsultantName"), "ID") &&
                        utils._LCstrictValidationComboBox(this.byId("CI_id_codeModel"), "ID") &&
                        utils._LCvalidateMobileNumber(this.byId("CI_id_InputMobile"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CI_id_InputConsultantAddress"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CI_id_InputBankName"), "ID") &&
                        utils._LCvalidateName(this.byId("CI_id_InputAccountName"), "ID") &&
                        utils._LCvalidateAccountNo(this.byId("CI_id_InputAccountNo"), "ID") &&
                        utils._LCvalidateIfcCode(this.byId("CI_id_InputIFSCCode"), "ID"));
                    if (!isMandatoryValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    } {
                        // TotalSum check
                        if (!oModelDataPro.TotalSum || oModelDataPro.TotalSum <= 0) {
                            MessageToast.show("Please ensure that at least one item is filled!");
                            return;
                        }

                        const bOptionalValid = !!this.Discount && !!this.UnitAmount;
                        if (!bOptionalValid) {
                            return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                        }

                        // GST Validation
                        if (oConsultantInvoiceModel.GSTNO && oConsultantInvoiceModel.GSTNO !== "") {
                            if (oConsultantInvoiceModel.Percentage && oConsultantInvoiceModel.Percentage !== "") {
                                if (oConsultantInvoiceModel.CGSTSelected && oConsultantInvoiceModel.IGSTVisible) {
                                    MessageToast.show("Both CGST and IGST are selected. Please review your GST setup.");
                                    return;
                                }
                            } else {
                                MessageToast.show("GST percentage is required when GST No is provided.");
                                return;
                            }
                        }

                        var isValid = true;
                        if (oConsultantInvoiceModel.GSTNO && !utils._LCvalidateGstNumber(this.byId("CI_id_InputGSTNO"), "ID"))
                            isValid = false;

                        if (oConsultantInvoiceModel.CompanyGSTNO && !utils._LCvalidateGstNumber(this.byId("CI_id_InputCompGSTNO"), "ID"))
                            isValid = false;

                        if (!isValid) {
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                            return;
                        }

                        // Prepare main invoice data payload
                        var data = {
                            InvoiceNo: oConsultantInvoiceModel.InvoiceNo,
                            EmployeeID: oConsultantInvoiceModel.EmployeeID,
                            ConsultantName: oConsultantInvoiceModel.ConsultantName,
                            InvoiceTo: oConsultantInvoiceModel.InvoiceTo,
                            InvoiceAddress: oConsultantInvoiceModel.InvoiceAddress,
                            InvoiceDate: sInvoiceDate,
                            ConsultantAddress: oConsultantInvoiceModel.ConsultantAddress,
                            GSTNO: oConsultantInvoiceModel.GSTNO,
                            CompanyGSTNO: oConsultantInvoiceModel.CompanyGSTNO,
                            MobileNo: oConsultantInvoiceModel.MobileNo.toString(),
                            CGST: oConsultantInvoiceModel.CGSTSelected === false ? 0 : parseFloat(oModelDataPro.CGST),
                            SGST: oConsultantInvoiceModel.CGSTSelected === false ? 0 : parseFloat(oModelDataPro.SGST),
                            IGST: oConsultantInvoiceModel.IGSTSelected === false ? 0 : parseFloat(oModelDataPro.IGST),
                            SubTotal: parseFloat(oModelDataPro.SubTotal) || 0,
                            SubTotalNotGST: parseFloat(oModelDataPro.SubTotalNotGST) || 0,
                            TotalSum: parseFloat(oModelDataPro.TotalSum) || 0,
                            BankName: oConsultantInvoiceModel.BankName,
                            AccountName: oConsultantInvoiceModel.AccountName,
                            AccountNo: oConsultantInvoiceModel.AccountNo.toString(),
                            IFSCCode: oConsultantInvoiceModel.IFSCCode,
                            PayBy: sPayByDate,
                            Percentage: oConsultantInvoiceModel.Percentage?.toString() || "0",
                            Currency: Currency,
                            STDCode: oConsultantInvoiceModel.STDCode || ""
                        };

                        const filters = {
                            InvoiceNo: oConsultantInvoiceModel.InvoiceNo,
                            EmployeeID: oConsultantInvoiceModel.EmployeeID
                        };

                        const aItemArray2 = oView.getModel("ConsultantInvoiceModel").getProperty("/ConsultantInvoiceItem") || [];
                        const bAllDescriptionsFilled1 = aItemArray2.every(item =>
                            item.Item && item.Item.trim().length > 0 &&
                            item.UnitPrice && parseFloat(item.UnitPrice) > 0
                        );

                        if (!bAllDescriptionsFilled1) {
                            MessageToast.show("Each item must have a description.");
                            return;
                        }

                        const aItemArray = oView.getModel("ConsultantInvoiceModel").getProperty("/ConsultantInvoiceItem") || [];

                        const Items = aItemArray.map((item) => {
                            const oFilters = {
                                InvoiceNo: oConsultantInvoiceModel.InvoiceNo,
                                SlNo: item.SlNo || ""
                            };

                            // Include flag if it's a new item
                            if (item.flag === "create") {
                                oFilters.flag = "create";
                            }

                            return {
                                data: {
                                    InvoiceNo: item.InvoiceNo || oConsultantInvoiceModel.InvoiceNo,
                                    SlNo: item.SlNo,
                                    EmployeeID: item.EmployeeID,
                                    Item: item.Item || "",
                                    SAC: (oConsultantInvoiceModel.GSTNO !== undefined && oConsultantInvoiceModel.GSTNO !== "") ? (item.SAC.toString() || "") : "",
                                    GSTCalculation: (oConsultantInvoiceModel.GSTNO !== undefined && oConsultantInvoiceModel.GSTNO !== "") ? (item.GSTCalculation || "") : "",
                                    Days: item.Days.toString(),
                                    UnitPrice: parseFloat(item.UnitPrice),
                                    Discount: item.Discount ? item.Discount.toString() : "",
                                    Total: parseFloat(item.Total),
                                    Currency: item.Currency || Currency,
                                },
                                filters: oFilters
                            };
                        });

                        const payload = {
                            data,
                            filters,
                            Items
                        };

                        this.getBusyDialog(); // <-- Open custom BusyDialog

                        try {
                            const response = await this.ajaxUpdateWithJQuery("ConsultantInvoice", payload);
                            if (response.success === true) {
                                this.closeBusyDialog(); // <-- Close custom BusyDialog
                                // Update model with final computed values
                                var oModel = this.getView().getModel("ConsultantInvoiceModel");
                                oModel.setProperty("/CGST", data.CGST);
                                oModel.setProperty("/SGST", data.SGST);
                                oModel.setProperty("/IGST", data.IGST);
                                oModel.setProperty("/SubTotal", data.SubTotal);
                                oModel.setProperty("/SubTotalNotGST", data.SubTotalNotGST);
                                oModel.setProperty("/TotalSum", data.TotalSum);
                                oModel.setProperty("/GSTValid", false);
                                oModel.setProperty("/CGSTSelected", oConsultantInvoiceModel.CGSTSelected);
                                oModel.setProperty("/IGSTSelected", oConsultantInvoiceModel.IGSTSelected);
                                oModel.setProperty("/InvoiceDate", sInvoiceDate);
                                oModel.setProperty("/PayBy", sPayByDate);


                                // Set view visibility and table mode
                                var oVisiModel = this.getView().getModel("visiablityPlay");
                                oVisiModel.setProperty("/editable", false);
                                oVisiModel.setProperty("/invBtn", false);
                                oVisiModel.setProperty("/copyBtn", true);
                                oVisiModel.setProperty("/merge", true);
                                this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("None");
                                sap.m.MessageBox.success(this.i18nModel.getText("invoiceUpdateMsg"));
                            }
                        } catch (error) {
                            this.closeBusyDialog(); // <-- Close custom BusyDialog
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        }
                    }
                },

                CI_commonOpenDialog: function (fragmentName) {
                    if (!this.CI_oDialogMail) {
                        sap.ui.core.Fragment.load({
                            name: fragmentName,
                            controller: this,
                        }).then(function (CI_oDialogMail) {
                            this.CI_oDialogMail = CI_oDialogMail;
                            this.getView().addDependent(this.CI_oDialogMail);
                            this.CI_oDialogMail.open();
                        }.bind(this));
                    } else {
                        this.CI_oDialogMail.open();
                    }
                },
                CI_onSendEmail: function () {
                    var oUploaderDataModel = new JSONModel({
                        isEmailValid: true,
                        ToEmail: this.getView().getModel("CCMailModel").getData()[0].ToEmailID,
                        CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                        name: "",
                        mimeType: "",
                        content: "",
                        isFileUploaded: false,
                        button: false
                    });
                    this.getView().setModel(oUploaderDataModel, "UploaderData");
                    this.CI_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
                    this.validateSendButton();
                },
                Mail_onPressClose: function () {
                    this.CI_oDialogMail.destroy();
                    this.CI_oDialogMail = null;
                    // this.CI_oDialogMail.close();
                },
                Mail_onUpload: function (oEvent) {
                    this.handleFileUpload(
                        oEvent,
                        this, // context
                        "UploaderData", // model name
                        "/attachments", // path to attachment array
                        "/name", // path to comma-separated file names
                        "/isFileUploaded", // boolean flag path
                        "uploadSuccessfull", // i18n success key
                        "fileAlreadyUploaded", // i18n duplicate key
                        "noFileSelected", // i18n no file selected
                        "fileReadError", // i18n file read error
                        () => this.validateSendButton()
                    );
                },

                validateSendButton: function () {
                    const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                    const emailField = sap.ui.getCore().byId("CCMail_TextArea");
                    const uploaderModel = this.getView().getModel("UploaderData");
                    if (!sendBtn || !emailField || !uploaderModel) {
                        return;
                    }
                    const isEmailValid = utils._LCvalidateEmail(emailField, "ID") === true;
                    const isFileUploaded = uploaderModel.getProperty("/isFileUploaded") === true;

                    sendBtn.setEnabled(isEmailValid && isFileUploaded);
                },

                Mail_onEmailChange: function () {
                    this.validateSendButton(); // Reuse from BaseController
                },
                Mail_onSendEmail: function () {
                    var oModel = this.getView().getModel("ConsultantInvoiceModel").getData();
                    // Format date to DD/MM/YYYY
                    var oDate = new Date(oModel.InvoiceDate); // Ensure it's a Date object
                    var sFormattedDate = [
                        ("0" + oDate.getDate()).slice(-2),
                        ("0" + (oDate.getMonth() + 1)).slice(-2),
                        oDate.getFullYear()
                    ].join("/");
                    var aAttachments = this.getView().getModel("UploaderData").getData().attachments;
                    if (!aAttachments || aAttachments.length === 0) {
                        MessageToast.show(this.i18nModel.getText("attachmentRequired"));
                        return;
                    }
                    var oPayload = {
                        "EmployeeID": oModel.EmployeeID,
                        "ConsultantName": oModel.ConsultantName,
                        "InvoiceNo": oModel.InvoiceNo,
                        "InvoiceDate": sFormattedDate,
                        "TotalSum": (`${Formatter.fromatNumber(oModel.TotalSum)} ${oModel.Currency}`),
                        "InvoiceTo": oModel.InvoiceTo,
                        "toEmailID": oModel.ContarctEmail,
                        "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
                        "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
                    };
                    this.getBusyDialog();
                    this.ajaxCreateWithJQuery("ConsultantInvoiceSendEmail", oPayload).then((oData) => {
                        MessageToast.show(this.i18nModel.getText("emailSuccess"));
                        this.closeBusyDialog();
                    }).catch((error) => {
                        MessageToast.show(error.responseText);
                        this.closeBusyDialog();
                    });
                    this.closeBusyDialog();
                    this.Mail_onPressClose();
                },

                CD_onDiscountInfoPress: function (oEvent) {
                    if (!this._oPopover) {
                        this._oPopover = new sap.m.Popover({
                            contentWidth: "400px",
                            contentHeight: "auto",
                            showHeader: false,
                            placement: sap.m.PlacementType.Bottom,
                            content: [
                                new sap.m.VBox({
                                    alignItems: "Center",
                                    justifyContent: "Center",
                                    width: "100%",
                                    items: [
                                        new sap.m.Text({
                                            text: this.i18nModel.getText("discountInfoText"),
                                            wrapping: true
                                        })
                                    ]
                                }).addStyleClass("customPopoverContent")
                            ]
                        });
                        this.getView().addDependent(this._oPopover);
                    }
                    this._oPopover.openBy(oEvent.getSource());
                },

                CI_onPressGeneratePdf: async function () {
                    const { jsPDF } = window.jspdf;
                    const oView = this.getView();
                    const oModel = oView.getModel("ConsultantInvoiceModel").getData();
                    const oConsultantItemModel = oModel.ConsultantInvoiceItem || [];

                    let totalInWords = await this.convertNumberToWords(oModel.TotalSum, oModel.Currency);
                    const showSAC = oModel.GSTNO !== undefined && oModel.GSTNO !== "";

                    const margin = 15;
                    const doc = new jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: "a4"
                    });

                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const usableWidth = pageWidth - 2 * margin;
                    const headerMargin = 25.4;
                    let currentY = headerMargin;

                    doc.setFontSize(16);
                    doc.setFont("times", "bold");
                    let headerLabel = (oModel.GSTNO === undefined || oModel.GSTNO === "") ? "INVOICE" : "TAX-INVOICE";
                    doc.text(headerLabel, pageWidth - 18, currentY, { align: "right" });

                    currentY += 10;

                    const detailsStartY = currentY;
                    const rowHeight = 6.5;
                    const columnWidths = [30, 30];
                    doc.setFontSize(12);
                    doc.setFont("times", "normal");
                    const rightAlignX = pageWidth - 13.5 - columnWidths[0] - columnWidths[1];

                    const detailsTable = [
                        { label: 'Invoice No. :', value: oModel.InvoiceNo },
                        { label: 'Date :', value: Formatter.formatDate(oModel.InvoiceDate) },
                    ];

                    detailsTable.forEach(row => {
                        doc.setFont("times", "bold");
                        doc.text(row.label, rightAlignX + columnWidths[0] - doc.getTextWidth(row.label), currentY + 5);
                        doc.setFont("times", "normal");
                        doc.text(row.value, rightAlignX + columnWidths[0] + 2, currentY + 5);
                        currentY += rowHeight;
                    });

                    currentY = detailsStartY + 5;
                    doc.setFont("times", "bold");
                    doc.text("From,", margin, currentY);
                    currentY = detailsStartY + 10;
                    doc.setFontSize(12);
                    doc.text(oModel.ConsultantName, margin, currentY);
                    currentY += 5;

                    const ConsultantAddressLines = doc.splitTextToSize(oModel.ConsultantAddress, usableWidth / 2 - 10);
                    doc.setFont("times", "normal");
                    doc.text(ConsultantAddressLines, margin, currentY);
                    currentY += ConsultantAddressLines.length * 5;

                    if (oModel.MobileNo) {
                        doc.text(`Mobile No : ${oModel.MobileNo}`, margin, currentY);
                        currentY += 5;
                    }

                    if (oModel.GSTNO !== undefined && oModel.GSTNO !== "") {
                        doc.text(`GSTIN : ${oModel.GSTNO}`, margin, currentY);
                        currentY += 5;
                    }

                    currentY += 5;
                    doc.setFont("times", "bold");
                    doc.text("To,", margin, currentY);
                    currentY += 5;
                    doc.text(oModel.InvoiceTo, margin, currentY);
                    currentY += 5;

                    const InvoiceAddressLines = doc.splitTextToSize(oModel.InvoiceAddress, usableWidth / 2 - 10);
                    doc.setFont("times", "normal");
                    doc.text(InvoiceAddressLines, margin, currentY);
                    currentY += InvoiceAddressLines.length * 5;

                    if (oModel.CompanyGSTNO !== undefined && oModel.CompanyGSTNO !== "") {
                        doc.text(`GSTIN : ${oModel.CompanyGSTNO}`, margin, currentY);
                        currentY += 2;
                    }

                    currentY += 5; // always add a little space before the next section

                    const body = oConsultantItemModel.map((item, index) => {
                        const row = [
                            index + 1,
                            item.Item,
                            item.Days || "-",
                            Formatter.fromatNumber(item.UnitPrice) || "-",
                            Formatter.fromatNumber(item.Discount) || "-",
                            Formatter.fromatNumber(item.Total)
                        ];
                        if (showSAC) row.splice(2, 0, item.SAC); // Insert SAC as 4th column if required
                        return row;
                    });

                    const head = showSAC
                        ? [['Sl.No.', 'Item Description', 'SAC', 'Days/Unit', 'Unit Price', 'Discount', 'Total']]
                        : [['Sl.No.', 'Item Description', 'Days/Unit', 'Unit Price', 'Discount', 'Total']];

                    doc.autoTable({
                        startY: currentY,
                        head: head,
                        body: body,
                        theme: 'grid',
                        headStyles: { fillColor: [41, 128, 185] },
                        styles: {
                            font: "times", fontSize: 10, cellPadding: 3, lineWidth: 0.5, lineColor: [30, 30, 30],
                            halign: "center", overflow: "ellipsize"
                        },
                        columnStyles: {
                            0: { halign: 'center' },
                            1: { halign: 'left' },
                            ...(showSAC ? {
                                2: { halign: 'center' },
                                3: { halign: 'right' },
                                4: { halign: 'right' },
                                5: { halign: 'right' },
                                6: { halign: 'right' }
                            } : {
                                2: { halign: 'center' },
                                3: { halign: 'right' },
                                4: { halign: 'right' },
                                5: { halign: 'right' }
                            })
                        },
                    });

                    currentY = doc.lastAutoTable.finalY + 5;

                    if (currentY + 40 > pageHeight) {
                        doc.addPage();
                        currentY = 20;
                    }

                    // Create summary table body
                    const summaryBody = [];

                    // SubTotal Without GST
                    if (oModel.SubTotalNotGST > 0) {
                        summaryBody.push([
                            `Sub-Total ( Non-Taxable ) (${oModel.Currency}) :`,
                            Formatter.fromatNumber(oModel.SubTotalNotGST)
                        ]);
                    }

                    // SubTotal With GST
                    if (oModel.SubTotal > 0) {
                        summaryBody.push([
                            `Sub-Total ( Taxable ) : (${oModel.Currency}) :`,
                            Formatter.fromatNumber(oModel.SubTotal)
                        ]);
                    }

                    // GST Breakdown
                    if (oModel.Currency !== "USD") {
                        const cgstValue = parseFloat(oModel.CGST) || 0;
                        const sgstValue = parseFloat(oModel.SGST) || 0;
                        const igstValue = parseFloat(oModel.IGST) || 0;

                        if (oModel.Currency === "INR" && oModel.CGST && oModel.SGST && oModel.CGSTVisible === true) {
                            summaryBody.push([
                                `CGST (${oModel.Percentage}%) :`,
                                Formatter.fromatNumber(cgstValue.toFixed(2))
                            ]);
                            summaryBody.push([
                                `SGST (${oModel.Percentage}%) :`,
                                Formatter.fromatNumber(sgstValue.toFixed(2))
                            ]);
                        } else if (oModel.IGST && oModel.Currency === "INR" && oModel.IGSTVisible === true) {
                            summaryBody.push([
                                `IGST (${oModel.Percentage}%) :`,
                                Formatter.fromatNumber(igstValue.toFixed(2))
                            ]);
                        }
                    }

                    // Total row
                    const totalRowIndex = summaryBody.length;
                    summaryBody.push([
                        `Total (${oModel.Currency}) :`,
                        Formatter.fromatNumber(oModel.TotalSum)
                    ]);

                    doc.autoTable({
                        startY: currentY,
                        head: [],
                        body: summaryBody,
                        theme: 'plain',
                        styles: {
                            font: "times",
                            fontSize: 10,
                            halign: "right",
                            cellPadding: 2,
                            overflow: "ellipsize"
                        },
                        columnStyles: {
                            0: { halign: "right", cellWidth: 60 },
                            1: { halign: "right", cellWidth: 40 }
                        },
                        margin: { left: 95 },
                        didParseCell: function (data) {
                            if (data.row.index === totalRowIndex) {
                                data.cell.styles.lineWidth = { top: 0.5, right: 0, bottom: 0, left: 0 };
                                data.cell.styles.lineColor = [0, 0, 0];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    });

                    currentY = doc.lastAutoTable.finalY + 10;

                    oModel.AmountInWords = totalInWords;
                    doc.setFont("times", "bold");
                    doc.text("Amount in Words :", 13, currentY);
                    currentY += 5;
                    doc.setFont("times", "normal");
                    const amountHeight = doc.getTextDimensions(oModel.AmountInWords || "").h;
                    doc.text(oModel.AmountInWords || "", 13, currentY, { maxWidth: 180 });
                    currentY += amountHeight + 10;

                    doc.setFont("times", "bold").setFontSize(11);
                    doc.text("PAYMENT METHOD :", margin - 2, currentY);
                    currentY += 5;

                    const paymentDetails = [
                        { label: "Bank Name", value: oModel.BankName },
                        { label: "Account Name", value: oModel.AccountName },
                        { label: "Account No", value: oModel.AccountNo },
                        { label: "IFSC Code", value: oModel.IFSCCode },
                        { label: "Pay By", value: Formatter.formatDate(oModel.PayBy) }
                    ];

                    paymentDetails.forEach(detail => {
                        doc.setFont("times", "bold");
                        const label = `${detail.label} :`;
                        const labelWidth = doc.getTextWidth(label);
                        doc.text(label, margin - 2, currentY);
                        doc.setFont("times", "normal");
                        doc.text(detail.value, margin + labelWidth, currentY);
                        currentY += 5;
                    });

                    currentY += 10;
                    doc.setFont("times", "bold").setFontSize(12);
                    const forLabelText = "For : " + oModel.ConsultantName;
                    const totalTextWidth = doc.getTextWidth(forLabelText);
                    doc.text(forLabelText, rightAlignX - totalTextWidth + 55, currentY);
                    currentY += 15;

                    doc.setFont("times", "normal").setFontSize(11);
                    doc.text("Thank you for your business!", margin - 2, currentY);

                    doc.save(`${oModel.ConsultantName}-${oModel.InvoiceNo}-Invoice.pdf`);
                }
            }
        );
    }
);
