sap.ui.define([
    "./BaseController", //call base controller
    "../utils/validation", // call validation function
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Trainee", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTrainee").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                var LoginFunction = await this.commonLoginFunction("Trainee");
                if (!LoginFunction) return;
                this.getBusyDialog();
                this.companyName = "Kalpavriksha Technologies"; // TO AVOID ONE MORE AJAX CALL (By Shivang)
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                // common company emails read call
                this.byId("T_id_OnboardBtn").setEnabled(false);
                this.byId("T_id_RejectBtn").setEnabled(false);
                this.byId("T_id_Download").setVisible(false);
                this.byId("T_id_EmpOnBoard").setVisible(false);
                this.byId("T_id_Cermail").setVisible(false);
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("traineeEdit"));
                this.oValue = oEvent.getParameter("arguments").value;
                this.Filter = true;
                this._fetchCommonData("EmployeeDetailsData", "empModel");
                if (this.oValue === "Trainee") {
                    await this.T_onPressClear();// clear the filter bar
                    await this.readCallForTrainee("");
                }
                else {
                    this.T_onSearch();// filter function for trainee 
                }
                this._makeDatePickersReadOnly(["T_id_JoiningDate"]);
                this.initializeBirthdayCarousel();
            },

            //read call for trainee
            readCallForTrainee: async function (filter) {
                try {
                    // this.getBusyDialog();
                    await this.ajaxReadWithJQuery("Trainee", filter).then((oData) => {
                        var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                        this.getOwnerComponent().setModel(new JSONModel(offerData), "traineeModel");
                        if (this.Filter) {
                            var oFilterData = [...new Map(offerData.filter(item => item.TraineeName && item.TraineeName.trim() !== "").map(item => [item.TraineeName.trim(), item])).values()];
                            this.getView().setModel(new JSONModel(oFilterData), "traineeNameModel");
                            this.getView().getModel("traineeNameModel").refresh(true);
                            this.Filter = true;
                        }
                        this.closeBusyDialog();
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },
            //validation function for mandatory fields
            T_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            //validation function for email
            T_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            //validation function for date
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            //validation function for date
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
                this.CommonLogoutFunction();
            },
            //Trainee creation button
            T_onPressAddTrainee: function (oEvent) {
                var oParValue;
                // Check if the button pressed is the "Add Trainee" button by looking at its ID
                if (oEvent.getSource().getId().lastIndexOf("T_id_AddBtn") !== -1) {
                    oParValue = "CreateTraineeFlag"
                } else {
                    // Else navigation to existing trainee details
                    oParValue = oEvent.getSource().getBindingContext("traineeModel").getModel().getData()[oEvent.getSource().getBindingContextPath().split("/")[1]].ID
                }
                this.getRouter().navTo("RouteTraineeDetails", { sParTrainee: oParValue });
            },
            // common open the dialog function
            T_commonOpenDialog: function (dialogProperty, fragmentName) {
                if (!this[dialogProperty]) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this
                    }).then(function (oDialog) {
                        this[dialogProperty] = oDialog;
                        this.getView().addDependent(this[dialogProperty]);
                        this[dialogProperty].open();
                    }.bind(this)).catch(function (oError) {
                    });
                } else {
                    this[dialogProperty].open();
                }
            },

            //Trainee table selection change function for button visibility
            T_onTableSelectionChange: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                this.SelectedData = oSelectedItem.getBindingContext("traineeModel").getObject();
                if (oSelectedItem) {
                    var sStatus = oSelectedItem.getBindingContext("traineeModel").getProperty("Status");
                    var isDisabled = sStatus === "Onboarded" || sStatus === "Rejected";
                    this.byId("T_id_OnboardBtn").setEnabled(!isDisabled);
                    this.byId("T_id_RejectBtn").setEnabled(!isDisabled);
                    var isCertificateVisible = sStatus === "Training Completed" || sStatus === "Onboarded";
                    this.byId("T_id_Download").setVisible(isCertificateVisible);
                    var isEmpOnBoardVisible = sStatus === "Training Completed";
                    this.byId("T_id_EmpOnBoard").setVisible(isEmpOnBoardVisible);
                    this.byId("T_id_Cermail").setVisible(isEmpOnBoardVisible);
                    var isOtherButtonsVisible = sStatus !== "Training Completed";
                    this.byId("T_id_OnboardBtn").setVisible(isOtherButtonsVisible);
                    this.byId("T_id_RejectBtn").setVisible(isOtherButtonsVisible);
                }
            },
            //update call for trainee
            updateCallForTrainee: async function (oTraineeData, text) {
                try {
                    this.getBusyDialog();
                    var that = this;
                    if (oTraineeData.Status === "Onboarded") {
                        oTraineeData.CompanyEmailID = sap.ui.getCore().byId("OTF_id_TraineeMail").getValue();
                    }
                    var oModelOffer = {
                        "data": oTraineeData,
                        "filters": {
                            "ID": oTraineeData.ID
                        }
                    };
                    await this.ajaxUpdateWithJQuery("Trainee", oModelOffer).then((oData) => {
                        MessageToast.show(that.i18nModel.getText(text));
                        this.closeBusyDialog();
                    }).catch((error) => {
                        this.getBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },
            //trainee onboard confirmation 
            T_onOnboardPress: function () {
                this.onHandleTraineeAction("onboard");
            },
            //trainee reject confirmation
            T_onRejectPress: function () {
                this.onHandleTraineeAction("reject");
            },
            //confirmation dialog function for trainee onboard and reject
            onHandleTraineeAction: function (action) {
                try {
                    var that = this;
                    var oContext = this.byId("T_id_TraineeTable").getSelectedItem()?.getBindingContext("traineeModel");
                    if (!oContext) {
                        MessageToast.show(this.i18nModel.getText("SelectTraineeMessage"));
                        return;
                    }
                    var sName = oContext.getProperty("NameSalutation") + " " + oContext.getProperty("TraineeName");
                    var sMessage = (action === "onboard")
                        ? this.i18nModel.getText("OnboardMessage", [sName])
                        : this.i18nModel.getText("RejectMessage", [sName]);
                    this.showConfirmationDialog(
                        this.i18nModel.getText("ConfirmActionTitle"),
                        sMessage,
                        function () {
                            // On Confirm
                            if (action === "onboard") {
                                that.T_commonOpenDialog("TOb_oDialog", "sap.kt.com.minihrsolution.fragment.OnboardTrainee");
                            } else if (action === "reject") {
                                that._handleReject(oContext);
                            }
                            // Clear selection after confirm
                            that.byId("T_id_TraineeTable").removeSelections(true);
                        },
                        function () {
                            that.T_ButtonVisibility();
                        }
                    );
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },
            T_ButtonVisibility: function () {
                this.byId("T_id_OnboardBtn").setEnabled(false);
                this.byId("T_id_RejectBtn").setEnabled(false);
                this.byId("T_id_TraineeTable").removeSelections(true);
            },
            //Reject trainee function
            _handleReject: async function (oContext) {
                this.getBusyDialog();
                oContext.getModel().setProperty(oContext.getPath() + "/Status", "Rejected");
                await this.updateCallForTrainee(oContext.getObject(), "traineeRejectSucess");
                this.T_ButtonVisibility();
                this.T_onSearch();
            },
            //Onboard trainee function
            OTF_onPressOnboard: async function (oTraineeData) {
                try {
                    if (utils._LCvalidateEmail(sap.ui.getCore().byId("OTF_id_TraineeMail"), "ID")) {
                        var oTraineeData = this.SelectedData;
                        oTraineeData.Status = "Onboarded";
                        await this.updateCallForTrainee(oTraineeData, "traineeOnboardSucess");
                        this.getView().getModel("traineeModel").setProperty("/Status", "Onboarded");
                        this.OTF_onPressClose();
                        // Clear selection and disable buttons
                        this.T_ButtonVisibility();
                        this.T_onSearch();
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                }
            },
            T_Button: function () {
                this.byId("T_id_OnboardBtn").setVisible(true);
                this.byId("T_id_RejectBtn").setVisible(true);
                this.byId("T_id_Download").setVisible(false);
                this.byId("T_id_EmpOnBoard").setVisible(false);
                this.byId("T_id_Cermail").setVisible(false);
            },

            //Close the  onboarding dialog function
            OTF_onPressClose: function () {
                sap.ui.getCore().byId("OTF_id_TraineeMail").setValueState("None");
                sap.ui.getCore().byId("OTF_id_TraineeMail").setValue("");
                this.T_ButtonVisibility()
                this.TOb_oDialog.close();
            },
            //Trainee  certificate  dialog function
            T_onCertDownload: function () {
                var oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                var oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                var oJoiningDate = new Date(oTraineeModel.JoiningDate);
                var trainingDuration = oTraineeModel.TrainingDuration;
                var monthsMatch = trainingDuration.match(/(\d+)/);
                var months = monthsMatch ? parseInt(monthsMatch[0]) : 0;
                if (months === 0) {
                    console.error("Invalid training duration");
                    return;
                }
                var oCalculatedEndDate = new Date(oJoiningDate);
                oCalculatedEndDate.setMonth(oCalculatedEndDate.getMonth() + months);  // Add the number of months
                var sFormattedEndDate = oCalculatedEndDate.toISOString().split("T")[0];
                oTraineeModel.EndDate = new Date(sFormattedEndDate);
                var oTraineeContext = oSelectedItem.getBindingContext("traineeModel");
                this.getView().setBindingContext(oTraineeContext, "traineeModel");
                this.T_commonOpenDialog("TC_oDialog", "sap.kt.com.minihrsolution.fragment.TraineeCertificate", "TCF_id_EndDate");
            },

            //Close the certificate dialog function
            TCF_onPressCloseDialog: function () {
                this.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                this.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview Certificate</b> to Preview the Certificate</p>");
                sap.ui.getCore().byId("TCF_id_ProjectName").setValueState("None");
                sap.ui.getCore().byId("TCF_id_ProjectName").setValue("");
                this.T_ButtonVisibility();
                this.TC_oDialog.close();
                this.T_Button();
            },
            //Preview and download certificate function
            TCF_onPressHandlePreview: function () {
                const bPreviewFlag = this.getView().getModel("PDFData").getProperty("/PreviewFlag");
                if (bPreviewFlag) {
                    this.TCF_onPressDownload();
                } else {
                    this.TCF_onPressPreview();
                }
            },
            //download certificate
            TCF_onPressPreview: function () {
                if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("TCF_id_ProjectName"), "ID")) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }
                let oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                let oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                var empName = oTraineeModel.NameSalutation + " " + oTraineeModel.TraineeName;
                var joinDate = Formatter.formatDate(oTraineeModel.JoiningDate);
                var endDate = sap.ui.getCore().byId("TCF_id_EndDate").getValue();
                var role = "Trainee";
                var department = sap.ui.getCore().byId("TCF_id_Department").getSelectedKey();
                var projectName = oTraineeModel.ProjectName;
                var supervisor = oTraineeModel.ReportingManager;
                var data = `
                <div style="text-align: justify;">
                    <p>This is to certify that <b>${empName}</b> has successfully completed an internship at <b>${this.companyName}</b> from <b>${joinDate}</b> to <b>${endDate}</b>.</p> 
                    <p>During this period, ${empName} was assigned the role of <b>${role}</b> in the ${department} department and worked on the <b>${projectName}</b>. The performance, skills, and dedication demonstrated by ${empName} during the internship have been highly commendable.</p>
                    <p>We wish ${empName} all the best in future endeavors and career pursuits.</p>
                    <h3>Details of the Internship:</h3>
                    <div style="margin-left: 10px;">
                        <p style="margin: 3px 0;"><b>• Intern's Name: ${empName}</b></p>
                        <p style="margin: 3px 0;"><b>• Position: ${role}</b></p>
                        <p style="margin: 3px 0;"><b>• Internship Duration: ${joinDate} to ${endDate}</b></p>
                        <p style="margin: 3px 0;"><b>• Department: ${department}</b></p>
                        <p style="margin: 3px 0;"><b>• Supervisor: ${supervisor}</b></p>
                        <p style="margin: 3px 0;"><b>• Project/Tasks: ${projectName}</b></p>
                    </div>
                    <p>We at <b>${this.companyName}</b> thank ${empName} for the valuable contributions made to our organization and wish success in all future endeavors.</p>
                </div>`;
                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.getView().getModel("PDFData").setProperty("/PreviewFlag", true);
            },
            //generate PDF function
            TCF_onPressDownload: async function () {
                var oRTE = sap.ui.getCore().byId("myRTE");
                var oEditor = oRTE._oEditor?.editorManager?.activeEditor;
                if (oEditor) {
                    var plainText = oEditor.getContent({ format: 'text' });
                    var charCount = plainText.length;
                    var lines = plainText.split(/\r\n|\r|\n/);
                    var lineCount = lines.length;
                } else {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                    return;
                }
                if (charCount > 1000 || lineCount > 21) {
                    MessageBox.error("Certificate content exceeds the limit of 1000 characters or 21 lines.");
                    return;
                }
                try {
                    // Get selected trainee's data from the table
                    let oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                    let oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                    this.getView().getModel("PDFData").setProperty("/CreateDate", Formatter.formatDate(new Date()));
                    this.getView().getModel("PDFData").setProperty("/CertificateTitle", "TRAINEE CERTIFICATE");
                    // Create the updated trainee data
                    const oUpdatedData = {
                        ID: oTraineeModel.ID,
                        TraineeID: oTraineeModel.TraineeID,
                        Department: sap.ui.getCore().byId("TCF_id_Department").getSelectedKey(),
                        ProjectName: oTraineeModel.ProjectName,
                        EndDate: oTraineeModel.EndDate,
                        Role: "Trainee",
                        Status: "Training Completed",
                    };
                    await this.updateCallForTrainee(oUpdatedData, "pdfDownloading");
                    await this.T_onSearch();
                    this.byId("T_id_TraineeTable").removeSelections(true);
                    this.byId("T_id_Download").setVisible(false);
                    this.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                    let htmlContent = sap.ui.getCore().byId("myRTE").getValue();
                    this.TC_oDialog.close();
                    this.T_ButtonVisibility();
                    this.closeBusyDialog();
                    this.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview</b> to Preview the Certificate</p>");
                    this.generateCertificatePDF(htmlContent, oTraineeModel.BranchCode);
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                }
            },
            //Trainee onboard function        
            T_onBoardTrainee: function () {
                var oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                var oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                this.getRouter().navTo("RouteEmployeeOfferDetails", {
                    sParOffer: oTraineeModel.TraineeName,
                    sParEmployee: oTraineeModel.NameSalutation
                });
            },
            //Trainee search function for filtering
            T_onSearch: async function () {
                try {
                    this.getBusyDialog();
                    var aFilterItems = this.byId("T_id_Filterbar").getFilterGroupItems();
                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                    var params = {};
                    aFilterItems.forEach(function (oItem) {
                        var oControl = oItem.getControl();
                        var sValue = oItem.getName();
                        if (oControl && oControl.getValue()) {
                            if (sValue === "JoiningDate") {
                                params["startDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[0]));
                                params["endDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[1]));
                            } else {
                                params[sValue] = oControl.getValue();
                            }
                        }
                    });
                    if (params && Object.keys(params).length > 0) {
                        this.Filter = false;
                    }
                    await this.readCallForTrainee(params); // read call for trainee after filter
                    this.T_ButtonVisibility();
                    this.T_Button();
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            //clear the filterbar
            T_onPressClear: async function () {
                var aFilterItems = this.byId("T_id_Filterbar").getFilterGroupItems();
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl(); // Get the associated control
                    if (oControl) {
                        if (oControl.setValue) {
                            oControl.setValue(""); // Clear value for ComboBox, Input, DatePicker, etc.
                        }
                        if (oControl.setSelectedKey) {
                            oControl.setSelectedKey(""); // Reset selection for dropdowns
                        }
                        if (oControl.setSelected) {
                            oControl.setSelected(false); // Reset selection for Checkboxes
                        }
                    }
                });
            },
            //Traniee certificate mail function
            T_onCerMail:async function () {
                try {
                    this.getBusyDialog();
                    await  this._fetchCommonData("EmailContent", "CCMailModel", { Type: "TraineeCertificate", Action: "CC" });
                    var oTraineeEmail = this.byId("T_id_TraineeTable").getSelectedItem().getBindingContext("traineeModel").getObject().TraineeEmail;
                    if (!oTraineeEmail || oTraineeEmail.length === 0) {
                        MessageBox.error("To Email is missing");
                        return;
                    }
                    var oUploaderDataModel = new JSONModel({
                        isEmailValid: true,
                        ToEmail: oTraineeEmail,
                        CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                        name: "",
                        mimeType: "",
                        content: "",
                        isFileUploaded: false,
                        button: false
                    });
                    this.getView().setModel(oUploaderDataModel, "UploaderData");
                    this.T_commonOpenDialog("T_MailDialog", "sap.kt.com.minihrsolution.fragment.CommonMail");
                    this.validateSendButton();
                    this.closeBusyDialog();;
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },
            //Close the mail dialog function
            Mail_onPressClose: function () {
                try {
                    if (this.T_MailDialog) {
                        this.T_MailDialog.destroy();
                        this.T_MailDialog = null;
                    }
                    this.T_ButtonVisibility();
                    this.T_Button();
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },
            //Handle the file upload function
            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(
                    oEvent, this,
                    "UploaderData", "/attachments", "/name", "/isFileUploaded", "uploadSuccessfull", "fileAlreadyUploaded", "noFileSelected", "fileReadError",
                    () => this.validateSendButton()
                );
            },
            //validation for send button
            validateSendButton: function () {
                try {
                    const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                    const emailField = sap.ui.getCore().byId("CCMail_TextArea");
                    const uploaderModel = this.getView().getModel("UploaderData");
                    if (!sendBtn || !emailField || !uploaderModel) {
                        return;
                    }
                    const isEmailValid = utils._LCvalidateEmail(emailField, "ID") === true;
                    const isFileUploaded = uploaderModel.getProperty("/isFileUploaded") === true;
                    sendBtn.setEnabled(isEmailValid && isFileUploaded);
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            //validation for email change        
            Mail_onEmailChange: function () {
                this.validateSendButton();
            },
            //send mail function
            Mail_onSendEmail: function () {
                try {
                    var oModel = this.byId("T_id_TraineeTable").getSelectedItem().getBindingContext("traineeModel").getObject();
                    var aAttachments = this.getView().getModel("UploaderData").getProperty("/attachments");
                    if (!aAttachments || aAttachments.length === 0) {
                        MessageToast.show(this.i18nModel.getText("attachmentRequired")); // Or a hardcoded string: "Please add at least one attachment."
                        return;
                    }
                    var oPayload = {
                        "TraineeName": oModel.TraineeName,
                        "toEmailID": oModel.TraineeEmail,
                        "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
                        "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
                    };
                    this.getBusyDialog();
                    this.ajaxCreateWithJQuery("TraineeCertificateEmail", oPayload).then((oData) => {
                        MessageToast.show(this.i18nModel.getText("certificateSuccess"));
                        this.byId("T_id_TraineeTable").removeSelections(true);
                        this.closeBusyDialog();
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.responseText);
                    });
                    this.Mail_onPressClose();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.responseText);
                }
            }
        });
    });