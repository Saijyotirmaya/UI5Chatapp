
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "../utils/CommonAgreementPDF"
], function (
    BaseController,
    JSONModel,
    utils,
    MessageToast,
    jsPDF
) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.PurchaseOrderObject", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("PurchaseOrderObject").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            //   await   this._fetchCommonData("BaseLocation", "BaseLocationModel");


            var LoginFunction = await this.commonLoginFunction("PurchaseOrder");
            if (!LoginFunction) return;
            this.getBusyDialog()
            this.unit = true
            this.PoNumber = oEvent.getParameter("arguments").sPath;

            this.byId("FPO_id_CustomerName").setEditable(true).setValueState("None")
            this.byId("FPO_id_CustDescription").setEditable(true).setValueState("None")
            this.byId("FPO_id_Currency").setEditable(true)
            this.byId("PO_id_PaymantTerms").setEditable(true)
            this.byId("POO_idSubmitButton").setVisible(true)
            this.byId("FPO_id_StartDate").setEditable(true).setValueState("None")
            this.byId("FPO_id_EndDate").setEditable(true).setValueState("None")
            this.byId("FPO_id_Date").setEditable(true).setValueState("None")
            this.byId("PO_id_Type").setEditable(true)
            this.byId("FPO_idRichTextEditor").setEditable(true)
            this.byId("POO_idAddItemButton").setVisible(true)
            this.byId("FPO_id_BranchCode").setEditable(true).setValueState("None")

            this.byId("POO_idClearButton").setVisible(true)
            this.byId("POO_idSaveButton").setVisible(false)
            this.byId("POO_ideditButton").setVisible(false)
            this.byId("FPO_id_LUT").setVisible(false)
            this.byId("POO_idmailButton").setVisible(false)
            this.byId("POO_idPDFButton").setVisible(false)
            this.byId("FPO_id_PoNumber").setVisible(false)


            var Layout = this.byId("ObjectPageLayout");
            Layout.setSelectedSection(this.byId("purchaseOrderHeaderSection1"));
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            //  this._fetchCommonData("Currency", "CurrencyModel");
            // await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel");
            //  this._fetchCommonData("PaymentTerms", "ContractpaymentModel")
            this._fetchCommonData("EmailContent", "CCMailModel", { Type: "PurchaseOrder", Action: "CC" })

            this.getView().byId("FPO_id_StartDate").setMinDate(null)
            var sdate = this.getView().byId("FPO_id_StartDate")
            var enddate = this.getView().byId("FPO_id_EndDate");

            this.getView().byId("FPO_id_StartDate").attachChange(function (oEvent) {
                var startDate = oEvent.getSource().getDateValue();
                enddate.setMinDate(startDate);
                sdate.setMinDate(startDate)
            });
            this.getView().byId("FPO_id_Date").setMinDate(new Date(new Date().setDate(new Date().getDate() - 30)));
            var model = new JSONModel({
                "PoNumber": this.PoNumber,
                "CustomerName": "",
                "CustomerDesignation": "",
                "CustomerHeadName": "",
                "City": "",
                "Country": "",
                "Type": "Internal",
                "PaymentTerms": "",
                "Address": "",
                "CustDescription": "",
                "StartDate": "",
                "EndDate": "",
                "PAN": "",
                "CurrentDate": "",
                "Description": "",
                "Unit": "",
                "Amount": "",
                "Currency": "INR",
                "Notes": "",
                "GSTIN": "",
                "customerEmail": "",
                "mobileNo": "",
                "Tax": "",
                "LUT": "",
                "STDCode": "",
                "Period": "",
                "SubTotal": "",
                "IGST": "",
                "CGST": "",
                "SGST": "",
                "GSTType": "",
                "GrantTotal": "",
                "SerialNo": "",
                "TotalAmount": "",
                "BranchCode": "",
                "CompanyName": "",
                "CompanyPANNo": "",
                "CompanyGSTNo": "",
                "CompanyEmail": "",
                "CompanyAddress": "",
                "PurchaseOrders": [],
            })
            this.getView().setModel(model, "PurchaseOrderModel");

            var PoData = await this.ajaxReadWithJQuery("CompanyCodeDetails", { branchCode: "KLB01" }).then((oData) => {
                var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
                return PoData[0]
            });

            this.getView().getModel("PurchaseOrderModel").setProperty("/BranchCode", PoData.branchCode);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyName", PoData.companyName);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyAddress", PoData.longAddress);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyGSTNo", PoData.gstin);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyEmail", PoData.carrerEmail);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyPANNo", PoData.pan);

            this.getView().getModel("PurchaseOrderModel").setProperty("/Editable", true);

            this._ViewDatePickersReadOnly(["FPO_id_StartDate", "FPO_id_EndDate", "FPO_id_Date"], this.getView());

            if (oEvent.getParameter("arguments").sPath !== "PurchaseOrder") {
                this.getView().byId("POO_idSubmitButton").setVisible(false)
                this.getView().byId("POO_idSaveButton").setVisible(true)
                this.getView().byId("POO_ideditButton").setVisible(true)

                this.PoNumber = oEvent.getParameter("arguments").sPath;
                await this.ajaxReadWithJQuery("PurchaseOrderItems", { PoNumber: this.PoNumber }).then((oData) => {
                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "objectModel");

                    const purchaseOrderData = oFCIAerData[0];
                    const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");


                    purchaseOrderModel.setProperty("/CustomerName", purchaseOrderData.PurchaseOrder[0].CustomerName);
                    purchaseOrderModel.setProperty("/Type", purchaseOrderData.PurchaseOrder[0].Type);
                    purchaseOrderModel.setProperty("/Address", purchaseOrderData.PurchaseOrder[0].Address);
                    purchaseOrderModel.setProperty("/StartDate", new Date(purchaseOrderData.PurchaseOrder[0].StartDate).toLocaleDateString('en-GB'));
                    purchaseOrderModel.setProperty("/EndDate", purchaseOrderData.PurchaseOrder[0].EndDate);
                    purchaseOrderModel.setProperty("/PAN", purchaseOrderData.PurchaseOrder[0].PAN);
                    purchaseOrderModel.setProperty("/CurrentDate", new Date(purchaseOrderData.PurchaseOrder[0].CurrentDate).toLocaleDateString('en-GB'));
                    purchaseOrderModel.setProperty("/EndDate", new Date(purchaseOrderData.PurchaseOrder[0].EndDate).toLocaleDateString('en-GB'));
                    purchaseOrderModel.setProperty("/GSTIN", purchaseOrderData.PurchaseOrder[0].GST);
                    purchaseOrderModel.setProperty("/mobileNo", purchaseOrderData.PurchaseOrder[0].MobileNumber);
                    purchaseOrderModel.setProperty("/customerEmail", purchaseOrderData.PurchaseOrder[0].Email);
                    purchaseOrderModel.setProperty("/PurchaseOrders", purchaseOrderData.PurchaseOrderItems);
                    purchaseOrderModel.setProperty("/Notes", purchaseOrderData.PurchaseOrder[0].Notes);
                    purchaseOrderModel.setProperty("/STDCode", purchaseOrderData.PurchaseOrder[0].STDCode);
                    purchaseOrderModel.setProperty("/Tax", purchaseOrderData.PurchaseOrder[0].TaxPercentage);
                    purchaseOrderModel.setProperty("/CompanyName", purchaseOrderData.PurchaseOrder[0].CompanyName);
                    purchaseOrderModel.setProperty("/CompanyAddress", purchaseOrderData.PurchaseOrder[0].CompanyAddress);
                    purchaseOrderModel.setProperty("/CompanyEmail", purchaseOrderData.PurchaseOrder[0].CompanyEmail);
                    purchaseOrderModel.setProperty("/CompanyGSTNo", purchaseOrderData.PurchaseOrder[0].CompanyGSTNo);
                    purchaseOrderModel.setProperty("/CompanyPANNo", purchaseOrderData.PurchaseOrder[0].CompanyPANNo);
                    purchaseOrderModel.setProperty("/BranchCode", purchaseOrderData.PurchaseOrder[0].BranchCode);
                    purchaseOrderModel.setProperty("/SubTotal", purchaseOrderData.PurchaseOrder[0].SubTotal);
                    purchaseOrderModel.setProperty("/GSTType", purchaseOrderData.PurchaseOrder[0].GSTType);
                    purchaseOrderModel.setProperty("/CustomerHeadName", purchaseOrderData.PurchaseOrder[0].CustomerHeadName);
                    purchaseOrderModel.setProperty("/CustDescription", purchaseOrderData.PurchaseOrder[0].Description);
                    purchaseOrderModel.setProperty("/IGST", purchaseOrderData.PurchaseOrder[0].IGST);
                    purchaseOrderModel.setProperty("/CGST", purchaseOrderData.PurchaseOrder[0].CGST);
                    purchaseOrderModel.setProperty("/SGST", purchaseOrderData.PurchaseOrder[0].SGST);
                    purchaseOrderModel.setProperty("/GrantTotal", purchaseOrderData.PurchaseOrder[0].GrantTotal);
                    purchaseOrderModel.setProperty("/PaymentTerms", purchaseOrderData.PurchaseOrder[0].PaymentTerms);
                    purchaseOrderModel.setProperty("/Currency", purchaseOrderData.PurchaseOrderItems[0].Currency);
                    purchaseOrderModel.setProperty("/Country", purchaseOrderData.PurchaseOrder[0].Country);
                    purchaseOrderModel.setProperty("/City", purchaseOrderData.PurchaseOrder[0].City);
                    purchaseOrderModel.setProperty("/CustomerDesignation", purchaseOrderData.PurchaseOrder[0].CustomerDesignation);




                    var length = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0
                    if (length == false) {
                        var oModel = this.getView().getModel("PurchaseOrderModel")
                        oModel.setProperty("/IGST", "");
                        oModel.setProperty("/CGST", "");
                        oModel.setProperty("/SGST", "");
                        oModel.setProperty("/GrantTotal", "");
                        oModel.setProperty("/SubTotal", "0.00");
                    }

                    const purchaseOrders = purchaseOrderData.PurchaseOrderItems;
                    purchaseOrders.forEach((item, index) => {
                        item.SerialNo = (index + 1).toString();
                    });
                    purchaseOrderModel.setProperty("/PurchaseOrders", purchaseOrders);

                    this.byId("FPO_id_CustomerName").setEditable(false)
                    this.byId("FPO_id_StartDate").setEditable(false)
                    this.byId("FPO_id_EndDate").setEditable(false)
                    this.byId("FPO_id_Date").setEditable(false)
                    this.byId("PO_id_Type").setEditable(false)
                    this.byId("FPO_id_Currency").setEditable(false)
                    this.byId("FPO_id_BranchCode").setEditable(false)
                    this.byId("FPO_idRichTextEditor").setEditable(false)
                    this.getView().byId("FPO_id_CustDescription").setEditable(false)
                    this.getView().byId("PO_id_PaymantTerms").setEditable(false)
                    this.byId("POO_idAddItemButton").setVisible(false)
                    this.getView().byId("POO_idSaveButton").setVisible(false)
                    this.getView().byId("POO_idClearButton").setVisible(false)
                    this.byId("FPO_id_PoNumber").setVisible(true)
                    this.getView().byId("POO_idmailButton").setVisible(true)
                    this.getView().byId("POO_idPDFButton").setVisible(true)

                    
                  
                    purchaseOrderModel.setProperty("/Editable", false);

                });
            }
            this.closeBusyDialog()
        },
        PO_onButtonPress: function () {
            this.showConfirmationDialog(
           "Confirm Action",
           "Are you sure you want to go back?",
           ()=>{
               this.getRouter().navTo("PurchaseOrder");
             }
            )

        },
        PO_onComboBoxChange: function () {
            var selectedkey = this.byId("FPO_id_CustomerName").getSelectedKey();
            var Customer = this.getView().getModel("ManageCustomerModel").getData().find(function (cust) {
                return cust.companyName === selectedkey
            });
            this.getView().getModel("PurchaseOrderModel").setProperty("/Address", Customer.address);
            this.getView().getModel("PurchaseOrderModel").setProperty("/PAN", Customer.PAN);
            this.getView().getModel("PurchaseOrderModel").setProperty("/GSTIN", Customer.GST);
            this.getView().getModel("PurchaseOrderModel").setProperty("/customerEmail", Customer.customerEmail);
            this.getView().getModel("PurchaseOrderModel").setProperty("/mobileNo", Customer.mobileNo);
            this.getView().getModel("PurchaseOrderModel").setProperty("/Tax", Customer.value);
            this.getView().getModel("PurchaseOrderModel").setProperty("/STDCode", Customer.stdCode);
            this.getView().getModel("PurchaseOrderModel").setProperty("/GSTType", Customer.type);
            this.getView().getModel("PurchaseOrderModel").setProperty("/Country", Customer.country);
            this.getView().getModel("PurchaseOrderModel").setProperty("/City", Customer.baseLocation);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CustomerDesignation", Customer.HeadPosition);


            this.getView().getModel("PurchaseOrderModel").setProperty("/CustomerHeadName", Customer.name);


            if (Customer.LUT && Customer.LUT.trim() !== "") {
                this.getView().byId("FPO_id_LUT").setVisible(true)
                this.getView().getModel("PurchaseOrderModel").setProperty("/LUT", Customer.LUT);
            } else {
                this.getView().byId("FPO_id_LUT").setVisible(false)

            }
            var length = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0
            if (length == false) {
                var oModel = this.getView().getModel("PurchaseOrderModel")
                oModel.setProperty("/IGST", "");
                oModel.setProperty("/CGST", "");
                oModel.setProperty("/SGST", "");
                oModel.setProperty("/GrantTotal", "");
                oModel.setProperty("/SubTotal", "0.00");
            }
            this._calculateGSTandTotal();

            this.byId("FPO_id_CustomerName").setValueState("None");
        },
        PO_onComboBoxBranchChange: async function () {
            var selectedkey = this.byId("FPO_id_BranchCode").getSelectedKey();
            this.getBusyDialog()
            var PoData = await this.ajaxReadWithJQuery("CompanyCodeDetails", { branchCode: selectedkey }).then((oData) => {
                var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
                return PoData[0]
            });
            this.closeBusyDialog()

            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyName", PoData.companyName);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyAddress", PoData.longAddress);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyGSTNo", PoData.gstin);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyEmail", PoData.carrerEmail);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyPANNo", PoData.pan);


            this.byId("FPO_id_BranchCode").setValueState("None");
        },
        onAddItemButtonPress: function () {
            var oModel = this.getView().getModel("PurchaseOrderModel");
            var aData = oModel.getProperty("/PurchaseOrders") || [];

            aData.push({
                SerialNo: aData.length + 1,
                ConsultantName: "",
                Description: "",
                Unit: "",
                Amount: "",
                Currency: "",
                Period: "",
                TotalAmount: ""
            });

            oModel.setProperty("/PurchaseOrders", aData);
        },

        onSelectCurrencyChange: function () {
            this._calculateGSTandTotal();
        },

        PO_onAmountInputChange: function (oEvent) {
            this.unit = utils._LCvalidateAmount(oEvent);

            var oInput = oEvent.getSource();
            var oContext = oInput.getBindingContext("PurchaseOrderModel");
            var sPath = oContext.getPath();
            var model = this.getView().getModel("PurchaseOrderModel");

            var oParent = oInput.getParent();
            var aItems = oParent.getCells();
            var sUnit = aItems[3].getValue();
            var sAmount = aItems[5].getValue();

            var fUnit = parseFloat(sUnit);
            var fAmount = parseFloat(sAmount);

            if (!isNaN(fUnit) && !isNaN(fAmount)) {
                var fTotal = fUnit * fAmount;
                model.setProperty(sPath + "/TotalAmount", fTotal.toFixed(2));
            } else {
                model.setProperty(sPath + "/TotalAmount", "");
            }

            this._calculateGSTandTotal();
        },

        _calculateGSTandTotal: function () {
            var model = this.getView().getModel("PurchaseOrderModel");

            var aPOs = model.getProperty("/PurchaseOrders") || [];
            var fSubTotal = 0;
            aPOs.forEach(function (item) {
                var fItemTotal = parseFloat(item.TotalAmount);
                if (!isNaN(fItemTotal)) {
                    fSubTotal += fItemTotal;
                }
            });
            model.setProperty("/SubTotal", fSubTotal.toFixed(2));

            var tax = parseFloat(this.getView().byId("FPO_id_tax").getValue()) || 0;
            var GSTtype = this.getView().byId("FPO_id_type").getValue();
            var Currency = this.getView().byId("FPO_id_Currency").getSelectedKey();

            var GST = fSubTotal * tax / 100;

            model.setProperty("/IGST", "");
            model.setProperty("/CGST", "");
            model.setProperty("/SGST", "");

            if (GSTtype === "IGST" && Currency === "INR") {
                model.setProperty("/IGST", GST.toFixed(2));
                model.setProperty("/GrantTotal", (fSubTotal + GST).toFixed(2));
            } else if (GSTtype === "CGST/SGST" && Currency === "INR") {
                model.setProperty("/CGST", GST.toFixed(2));
                model.setProperty("/SGST", GST.toFixed(2));
                model.setProperty("/GrantTotal", (fSubTotal + GST * 2).toFixed(2));
            } else {
                model.setProperty("/GrantTotal", fSubTotal.toFixed(2));
            }
        },
        POO_onSubmitButtonPress: async function () {

            var purchaseOrders = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders");

            var oModel = this.getView().getModel("PurchaseOrderModel").getData()
            try {
                if (utils._LCstrictValidationComboBox(this.getView().byId("FPO_id_BranchCode"), "ID") &&
                    utils._LCstrictValidationComboBox(this.getView().byId("FPO_id_CustomerName"), "ID") &&
                    utils._LCvalidateDate(this.getView().byId("FPO_id_Date"), "ID") &&
                    utils._LCvalidateDate(this.getView().byId("FPO_id_StartDate"), "ID") &&
                    utils._LCvalidateDate(this.getView().byId("FPO_id_EndDate"), "ID")
                    && utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_CustDescription"), "ID") &&
                    this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0


                ) {

                    var isValid = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").every(function (item, index) {
                        if (!item.Description || !item.Unit || !item.Amount || !item.ConsultantName) {

                            sap.m.MessageBox.error("Please complete all the fields in row " + (index + 1))
                            return false;
                        }
                        return true;
                    });
                    if (!isValid) {
                        return;
                    }
                    const valid = !!this.unit;
                    if (!valid) {
                        return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }
                    var notes = this.getView().getModel("PurchaseOrderModel").getProperty("/Notes")
                    if (!notes) {
                        MessageToast.show(this.i18nModel.getText("quotaionNotemsg"));
                        return;
                    }

                    var data =
                    {
                        "CustomerName": oModel.CustomerName,
                        "Address": oModel.Address,
                        "StartDate": oModel.StartDate.split('/').reverse().join('-'),
                        "EndDate": oModel.EndDate.split('/').reverse().join('-'),
                        "PAN": oModel.PAN || "",
                        "PaymentTerms": oModel.PaymentTerms || "10 Days",
                        "CurrentDate": oModel.CurrentDate.split('/').reverse().join('-'),
                        "Type": oModel.Type || "internal",
                        "Notes": oModel.Notes,
                        "MobileNumber": oModel.mobileNo || "",
                        "GST": oModel.GSTIN || "",
                        "Email": oModel.customerEmail,
                        "TaxPercentage": oModel.Tax || "",
                        "STDCode": oModel.STDCode || "",
                        "LUT": oModel.LUT || "",
                        "BranchCode": oModel.BranchCode,
                        "CompanyName": oModel.CompanyName,
                        "CompanyPANNo": oModel.CompanyPANNo || "",
                        "CompanyGSTNo": oModel.CompanyGSTNo,
                        "CompanyEmail": oModel.CompanyEmail,
                        "CompanyAddress": oModel.CompanyAddress,
                        "SubTotal": oModel.SubTotal,
                        "IGST": oModel.IGST,
                        "CGST": oModel.CGST,
                        "SGST": oModel.SGST,
                        "GrantTotal": oModel.GrantTotal,
                        "GSTType": oModel.GSTType || "",
                        "Description": oModel.CustDescription,
                        "CustomerHeadName": oModel.CustomerHeadName,
                        "Country": oModel.Country,
                        "City": oModel.City,
                        "CustomerDesignation": oModel.CustomerDesignation,



                    };
                    var Items = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").map(function (item, index) {

                        var itemObj = {
                            data: {
                                "ConsultantName": item.ConsultantName,
                                "Description": item.Description,
                                "Unit": item.Unit,
                                "Amount": item.Amount,
                                "Currency": oModel.Currency || "INR",
                                "Period": item.Period || "Per Day",
                                "TotalAmount": item.TotalAmount

                            }
                        };

                        return itemObj;
                    });

                    var oPayLoad = {
                        data,
                        Items
                    }
                    this.getBusyDialog();
                    var response = await this.ajaxCreateWithJQuery("PurchaseOrder", oPayLoad);
                    this.PoNumber = response.PoNumber;
                    await this.onSuccessDialog();
                    this.closeBusyDialog();


                }

                else {
                    MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));

                }
            }
            catch (e) {
                MessageToast.show(this.i18nModel.getText("technicalError"));

                console.error(e);
            }
        },
           onSuccessDialog  : function () {
            if (!this._oDialog) {
                this._oDialog = new sap.m.Dialog({
                    title: "Success",
                    type: "Message",
                    state: "Success",
                    content: new sap.m.Text({
                        text: "Purchase order created successfully"
                    }),
                    endButton: new sap.m.Button({
                        text: "Generate PDF",
                        type: "Attention",
                        press: function () {
                            this.PoNumber
                            this.POO_onPDFButtonPress();
                            this._oDialog.close();

                            this.getRouter().navTo("PurchaseOrder");
                        }.bind(this)
                    }),
                    beginButton: new sap.m.Button({
                        text: "OK",
                        type: "Accept",
                        press: function () {
                            this._oDialog.close();
                            this.getRouter().navTo("PurchaseOrder");

                        }.bind(this)
                    }),

                });
                this.getView().addDependent(this._oDialog);
            }
            this._oDialog.open();
        },
        POO_onSaveButtonPress: async function (oEvent) {
            this.getRouter().getRoute("PurchaseOrder")
            const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");

            var oModel = this.getView().getModel("PurchaseOrderModel").getData()


            if (utils._LCstrictValidationComboBox(this.getView().byId("FPO_id_BranchCode"), "ID") &&
                utils._LCstrictValidationComboBox(this.getView().byId("FPO_id_CustomerName"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_Date"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_StartDate"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_EndDate"), "ID") &&

                utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_CustDescription"), "ID") &&
                this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0
            ) {
                var isValid = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").every(function (item, index) {
                    if (!item.Description || !item.Unit || !item.Amount || !item.ConsultantName) {
                        sap.m.MessageBox.error("Please fill in all required fields for each row " + (index + 1))
                        return false;
                    }
                    return true;
                });
                if (!isValid) {
                    return;
                }
                const valid = !!this.unit;
                if (!valid) {
                    return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                }
                var notes = this.getView().getModel("PurchaseOrderModel").getProperty("/Notes")
                if (!notes) {
                    MessageToast.show(this.i18nModel.getText("quotaionNotemsg"));
                    return;
                }


                var data = {
                    "CustomerName": oModel.CustomerName,
                    "Address": oModel.Address,
                    "StartDate": oModel.StartDate.split('/').reverse().join('-'),
                    "EndDate": oModel.EndDate.split('/').reverse().join('-'),
                    "PAN": oModel.PAN || "",
                    "PaymentTerms": oModel.PaymentTerms || "10 Days",
                    "CurrentDate": oModel.CurrentDate.split('/').reverse().join('-'),
                    "Type": oModel.Type || "internal",
                    "Notes": oModel.Notes,
                    "MobileNumber": oModel.mobileNo || "",
                    "GST": oModel.GSTIN || "",
                    "Email": oModel.customerEmail,
                    "TaxPercentage": oModel.Tax || "",
                    "STDCode": oModel.STDCode || "",
                    "LUT": oModel.LUT || "",
                    "BranchCode": oModel.BranchCode,
                    "CompanyName": oModel.CompanyName,
                    "CompanyPANNo": oModel.CompanyPANNo || "",
                    "CompanyGSTNo": oModel.CompanyGSTNo,
                    "CompanyEmail": oModel.CompanyEmail,
                    "CompanyAddress": oModel.CompanyAddress,
                    "SubTotal": oModel.SubTotal,
                    "IGST": oModel.IGST,
                    "CGST": oModel.CGST,
                    "SGST": oModel.SGST,
                    "GrantTotal": oModel.GrantTotal,
                    "GSTType": oModel.GSTType || "",
                    "Description": oModel.CustDescription,
                    "CustomerHeadName": oModel.CustomerHeadName,
                    "Country": oModel.Country,
                    "City": oModel.City,
                    "CustomerDesignation": oModel.CustomerDesignation,

                };
                var Items = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").map(function (item, index) {

                    var itemObj = {
                        data: {
                            "ConsultantName": item.ConsultantName,
                            "Description": item.Description,
                            "Unit": item.Unit,
                            "Amount": item.Amount,
                            "Currency": oModel.Currency || "INR",
                            "Period": item.Period || "Per Day",
                            "TotalAmount": item.TotalAmount

                        }
                    };
                    if (item.ItemId) {
                        itemObj.filters = { ItemId: item.ItemId };
                    }
                    else {
                        itemObj.filters = { flag: "create", PoNumber: this.PoNumber };
                        itemObj.data.PoNumber = this.PoNumber;

                    }
                    return itemObj;
                }.bind(this));

                const filters = {
                    PoNumber: this.PoNumber,

                }
                var PayLoad = {
                    data,
                    filters,
                    Items,
                }
                this.getBusyDialog()
                await this.ajaxUpdateWithJQuery("PurchaseOrder", PayLoad);
                MessageToast.show(this.i18nModel.getText("purchaseOrderupdated"));
                this.closeBusyDialog()

                this.getView().byId("POO_idSaveButton").setVisible(false)
                this.getView().byId("POO_ideditButton").setVisible(true)
                this.byId("FPO_id_CustomerName").setEditable(false)
                this.byId("FPO_id_StartDate").setEditable(false)
                this.byId("FPO_id_EndDate").setEditable(false)
                this.byId("FPO_id_Date").setEditable(false)
                this.byId("PO_id_Type").setEditable(false)
                this.byId("FPO_idRichTextEditor").setEditable(false)
                this.byId("POO_idAddItemButton").setVisible(false)
                this.byId("FPO_id_BranchCode").setEditable(false)
                this.byId("FPO_id_CustDescription").setEditable(false)
                this.byId("PO_id_PaymantTerms").setEditable(false)
                this.byId("FPO_id_Currency").setEditable(false)
                this.byId("POO_idmailButton").setVisible(true)
                this.byId("POO_idPDFButton").setVisible(true)
                this.byId("POO_idClearButton").setVisible(false)
                this.byId("FPO_id_PoNumber").setVisible(true)



                purchaseOrderModel.setProperty("/Editable", false);
            } else {
                MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));

            }

        },
        onClearNotesPress: function () {
            this.getView().getModel("PurchaseOrderModel").setProperty("/Notes", "")
        },
        POO_onEditButtonPress: function () {
            const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");

            this.byId("FPO_id_CustomerName").setEditable(true)
            this.byId("FPO_id_StartDate").setEditable(true)
            this.byId("FPO_id_EndDate").setEditable(true)
            this.byId("FPO_id_Date").setEditable(true)
            this.byId("PO_id_Type").setEditable(true)
            this.byId("FPO_idRichTextEditor").setEditable(true)
            this.byId("POO_idAddItemButton").setVisible(true)
            this.byId("FPO_id_BranchCode").setEditable(true)
            this.byId("FPO_id_CustDescription").setEditable(true)
            this.byId("PO_id_PaymantTerms").setEditable(true)
            this.byId("FPO_id_Currency").setEditable(true)
            this.byId("POO_idmailButton").setVisible(false)
            this.byId("POO_idPDFButton").setVisible(false)
            this.byId("POO_idClearButton").setVisible(true)
            this.byId("FPO_id_PoNumber").setVisible(true)




            purchaseOrderModel.setProperty("/Editable", true);
            this.getView().byId("POO_idSaveButton").setVisible(true)

        },
        FPO_onDateChange: function (oEvent) {
            utils._LCvalidateDate(oEvent)
        },
        PO_onConsultantnameLiveChange: function (oEvent) {
            utils._LCvalidateName(oEvent)
        },
        POO_onCustDescriptionLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
        },
        POO_onPOTableDelete: async function (oEvent) {
            const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");
            const oTable = this.byId("idTable");
            oTable.setMode(purchaseOrderModel.getProperty("/Editable") ? "Delete" : "None");

            var oSelectedItem = oEvent.getParameter("listItem");
            var oModel = this.getView().getModel("PurchaseOrderModel");
            var oData = oModel.getProperty("/PurchaseOrders");
            var sPath = oSelectedItem.getBindingContext("PurchaseOrderModel").getPath();
            var iIndex = parseInt(sPath.split("/")[2]);
            var oDeletedItem = oData[iIndex];

            if (oDeletedItem.ItemId) {
                var payload = {
                    filters: {
                        ItemId: oDeletedItem.ItemId
                    }
                };

                this.ajaxDeleteWithJQuery("PurchaseOrderItems", payload)
                this.showConfirmationDialog(
                    "Delete Confirmation",
                    "Are you sure you want to delete this Purchase order item?",
                    () => {
                        this.getBusyDialog()
                        this.ajaxDeleteWithJQuery("PurchaseOrderItems", payload).then(() => {
                            MessageToast.show(this.i18nModel.getText("purchaseOrderDeleted"));
                            oData.splice(iIndex, 1);
                            oData.forEach(function (item, index) {
                                item.SerialNo = index + 1;
                            });
                            oModel.setProperty("/PurchaseOrders", oData);
                            if (oData.length === 0) {
                                oModel.setProperty("/SubTotal", "0.00");
                                oModel.setProperty("/IGST", "");
                                oModel.setProperty("/CGST", "");
                                oModel.setProperty("/SGST", "");
                                oModel.setProperty("/GrantTotal", "0.00");
                            } else {
                                var fSubTotal = 0;
                                oData.forEach(function (item) {
                                    var total = parseFloat(item.TotalAmount);
                                    if (!isNaN(total)) fSubTotal += total;
                                });
                                oModel.setProperty("/SubTotal", fSubTotal.toFixed(2));
                                this._calculateGSTandTotal()
                            }
                            this.closeBusyDialog()
                        });
                    },
                );
            } else {
                oData.splice(iIndex, 1);
                oData.forEach(function (item, index) {
                    item.SerialNo = index + 1;
                });
                oModel.setProperty("/PurchaseOrders", oData);
                if (oData.length === 0) {

                    oModel.setProperty("/SubTotal", "0.00");
                    oModel.setProperty("/IGST", "");
                    oModel.setProperty("/CGST", "");
                    oModel.setProperty("/SGST", "");
                    oModel.setProperty("/GrantTotal", "0.00");
                } else {
                    var fSubTotal = 0;
                    oData.forEach(function (item) {
                        var total = parseFloat(item.TotalAmount);
                        if (!isNaN(total)) fSubTotal += total;
                    });
                    oModel.setProperty("/SubTotal", fSubTotal.toFixed(2));
                    this._calculateGSTandTotal();
                }
            }
        },

        POO_onPDFButtonPress: async function () {
            var oPDFModel = this.getView().getModel("PDFData");
            var oPOModel = this.getView().getModel("PurchaseOrderModel").getData();
            oPDFModel.setProperty("/ClientCompanyName", oPOModel.CustomerName);
            oPDFModel.setProperty("/ClientCompanyAddress", oPOModel.Address);
            oPDFModel.setProperty("/ClientName", oPOModel.CustomerHeadName);
            oPDFModel.setProperty("/ClientCompanyPAN", oPOModel.PAN);
            oPDFModel.setProperty("/PONumber", this.PoNumber);
            oPDFModel.setProperty("/POType", oPOModel.Type);
            oPDFModel.setProperty("/POFrom", oPOModel.StartDate);
            oPDFModel.setProperty("/POTo", oPOModel.EndDate);
            oPDFModel.setProperty("/PODate", oPOModel.CurrentDate);
            oPDFModel.setProperty("/POItems", oPOModel.PurchaseOrders);
            oPDFModel.setProperty("/Tax", oPOModel.Tax);
            oPDFModel.setProperty("/SubTotal", oPOModel.SubTotal);
            oPDFModel.setProperty("/IGST", oPOModel.IGST);
            oPDFModel.setProperty("/CGST", oPOModel.CGST);
            oPDFModel.setProperty("/SGST", oPOModel.SGST);
            oPDFModel.setProperty("/GSTType", oPOModel.GSTType);
            oPDFModel.setProperty("/GSTIN", oPOModel.GSTIN);
            oPDFModel.setProperty("/TotalPOAmount", oPOModel.GrantTotal);
            oPDFModel.setProperty("/Currency", oPOModel.Currency);
            var amountInWords = await this.convertNumberToWords(oPOModel.GrantTotal, oPOModel.Currency);
            oPDFModel.setProperty("/POAmountInWords", amountInWords);
            var htmlContent = oPOModel.Notes;
               this.getBusyDialog();
            await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: oPOModel.BranchCode });
            var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
            if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64 && !oCompanyDetailsModel.emailLogoBase64) {
                try {
                    const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
                    const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], { type: "image/png" });
                    const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });
                    const emailBlob = new Blob([new Uint8Array(oCompanyDetailsModel.emailLogo?.data)], { type: "image/png" });

                    const [logoBase64, signBase64, backgroundBase64, emailBase64] = await Promise.all([
                        this._convertBLOBToImage(logoBlob),
                        this._convertBLOBToImage(signBlob),
                        this._convertBLOBToImage(backgroundBlob),
                        this._convertBLOBToImage(emailBlob)
                    ]);

                    oCompanyDetailsModel.companylogo64 = logoBase64;
                    oCompanyDetailsModel.signature64 = signBase64;
                    oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
                    oCompanyDetailsModel.emailLogoBase64 = emailBase64;
                } catch (err) {
                    console.error("Image compression failed:", err);
                    this.closeBusyDialog();
                }

            }
            if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePOPDF === "function") {
                    jsPDF._GeneratePOPDF(this, oPDFModel.getData(), oCompanyDetailsModel, htmlContent);
                } else {
                    console.error("Error: jsPDF._GeneratePOPDF function not found.");
                    this.closeBusyDialog();
                }
            }
        },

        POO_onmailButtonPress: function () {
            var oEmployeeEmail = this.getView().getModel("PurchaseOrderModel").getData().customerEmail;
            if (!oEmployeeEmail || oEmployeeEmail.length === 0) {
                sap.m.MessageBox.error("To Email is missing");
                return;
            }
            var oUploaderDataModel = new JSONModel({
                isEmailValid: true,
                ToEmail: oEmployeeEmail,
                CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                name: "",
                mimeType: "",
                content: "",
                isFileUploaded: false,
                button: false
            });
            this.getView().setModel(oUploaderDataModel, "UploaderData");
            this.EOD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
            this.validateSendButton();
        },
        EOD_commonOpenDialog: function (fragmentName) {
            if (!this.EOU_oDialogMail) {
                sap.ui.core.Fragment.load({
                    name: fragmentName,
                    controller: this,
                }).then(function (EOU_oDialogMail) {
                    this.EOU_oDialogMail = EOU_oDialogMail;
                    this.getView().addDependent(this.EOU_oDialogMail);
                    this.EOU_oDialogMail.open();
                }.bind(this));
            } else {
                this.EOU_oDialogMail.open();
            }
        },

        //close mail dialog
        Mail_onPressClose: function () {
            this.EOU_oDialogMail.destroy();
            this.EOU_oDialogMail = null;
        },
        //File upload function calling from base controller
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
        //Mail dialog button visibility
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
        //Send mail
        Mail_onSendEmail: function () {
            var oModel = this.getView().getModel("PurchaseOrderModel").getData();
            const uploaderModel = this.getView().getModel("UploaderData").getProperty("/attachments");
            if (uploaderModel == false) {
                MessageToast.show(this.i18nModel.getText("attachmentRequired"))
                return;
            }
            var oPayload = {
                "toEmailID": oModel.customerEmail,
                "CustomerHeadName": oModel.CustomerHeadName,
                "PoNumber": this.PoNumber,
                "CompanyName": oModel.CompanyName,
                "StartDate": oModel.StartDate,
                "EndDate": oModel.EndDate,
                "Description": oModel.CustDescription,
                "PaymentTerms": oModel.PaymentTerms || "10 Days",
                "GrantTotal": oModel.GrantTotal,
                "CC": this.getView().getModel("UploaderData").getProperty("/CCEmail"),
                "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
            };
            this.getBusyDialog();

            this.ajaxCreateWithJQuery("PurchaseOrderEmail", oPayload).then((oData) => {
                MessageToast.show(this.i18nModel.getText("emailSuccess"));
                this.closeBusyDialog();
                this.EOU_oDialogMail.close()
            })


        },
    });
});