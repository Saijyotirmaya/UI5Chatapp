sap.ui.define([
    "./BaseController",//calling base controller
    "../utils/validation", //calling validation function
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
    "../utils/CommonJsPDF"],
    function (BaseController, utils, JSONModel, MessageToast, Formatter, jsPDF) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TraineeDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTraineeDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                var LoginFunction = await this.commonLoginFunction("Trainee");
                if (!LoginFunction) return;
                this.getBusyDialog();
                this.byId("TD_id_JoiningDate").setMinDate(new Date());
                this.sArgPara = oEvent.getParameter("arguments").sParTrainee;
                this.byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                this.byId("TD_id_TrainingDetailsBox").setVisible(false);
                this.byId("TD_id_TrainingAmountLabel").setVisible(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                var jsonData = {
                    "NameSalutation": "Mr.",
                    "TraineeName": "",
                    "ReportingManager": "",
                    "Type": "",
                    "Amount": "",
                    "Currency": "",
                    "ReleaseDate": this.Formatter.formatDate(new Date()),
                    "JoiningDate": "",
                    "TraineeEmail": "",
                    "TrainingDuration": "6 Month",
                    "BaseLocation": "Kalaburagi",
                    "Country": "India",
                    "MobileNumber": "",
                    "STDCode": "+91",
                    "Gender": ""
                };
                await this._fetchCommonData("EmailContent", "CCMailModel TraineeFlag", { Type: "TraineeOffer", Action: "CC" });
                this._fetchCommonData("EmployeeDetailsData", "empModel");
                this.getView().setModel(new JSONModel(jsonData), "oTraineeDetails");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false });
                this.getView().setModel(oViewModel, "viewModel");
                this.viewModel = this.getView().getModel("viewModel");
                ["TD_id_Name", "TD_id_ReportingManager", "TD_id_EmailID", "TD_id_TrainingType", "TD_id_JoiningDate", "TD_id_ReleaseDate", "TD_id_TrainingAmount", "TD_id_Location", "TD_Id_Country", "TD_id_STDCode", "TD_id_Mobile",
                    "TU_id_Name", "TU_id_Manager", "TU_id_TraineeMail", "TU_id_JoinDate", "TU_id_TrainingType", "TU_id_TrainingAmount", "TU_Id_Country", "TU_id_Location", "TU_id_STDCode", "TU_id_Mobile"].forEach(function (ids) {
                        this.getView().byId(ids).setValueState("None");
                    }.bind(this));
                if (this.sArgPara === "CreateTraineeFlag") {
                    this.getView().byId("TD_id_PageCreate").setVisible(true);
                    this.getView().byId("TUF_id_pageTrainee").setVisible(false);
                    this.T_onResetWizard();
                } else {
                    this.getView().byId("TD_id_PageCreate").setVisible(false);
                    this.getView().byId("TUF_id_pageTrainee").setVisible(true);
                    this.getModelData(this.sArgPara);
                }
                this._makeDatePickersReadOnly(["TD_id_JoiningDate", "TD_id_ReleaseDate", "TU_id_JoinDate", "TU_id_RelDate"]); //make date pickers read only
                this.getView().byId("TD_id_Submit").setEnabled(false);
                // this.closeBusyDialog();
            },
            //for edit case reading data from model
            getModelData: function (sArgPara) {
                var oModel = this.getOwnerComponent().getModel("traineeModel");
                var aFilteredData = oModel.getData().filter(function (oTrainee) {
                    return oTrainee.ID === sArgPara;
                });
                if (aFilteredData.length > 0) {
                    var traineeData = aFilteredData[0];
                    this.byId("TU_id_JoinDate").setMinDate(new Date(traineeData.ReleaseDate));
                    this.getView().setModel(new JSONModel(traineeData), "oTraineeDetails");
                    // Handle visibility and edit button based on trainee status
                    if (traineeData.Status === "Onboarded" || traineeData.Status === "Training Completed") {
                        this.viewModel.setProperty("/isVisiable", false);
                        this.viewModel.setProperty("/editBut", false);
                    } else if (traineeData.Status === "Rejected") {
                        this.viewModel.setProperty("/isVisiable", false);
                        this.viewModel.setProperty("/editBut", true);
                    } else if (traineeData.Status === "Saved") {
                        this.viewModel.setProperty("/isVisiable", true);
                        this.viewModel.setProperty("/editBut", true);
                    }
                    if (this.getView().getModel("oTraineeDetails").getProperty("/NameSalutation") === "Dr.") {
                        this.getView().byId("TU_id_Gender").setEnabled(true);
                    }
                    else {
                        this.getView().byId("TU_id_Gender").setEnabled(false);
                    }
                    this.closeBusyDialog();
                } else {
                    MessageBox.error(this.i18nModel.getText("commonErrorMessage"));
                    this.closeBusyDialog();
                }
            },
            //navigation to trainee view
            TUF_onPressback: function () {
                var oViewModel = this.getView().getModel("viewModel");
                // Check if in edit mode
                if (oViewModel.getProperty("/editable")) {
                    // Show confirmation dialog before navigating
                    this.showConfirmationDialog(
                        this.i18nModel.getText("ConfirmActionTitle"),
                        this.i18nModel.getText("backConfirmation"),
                        function () {
                            oViewModel.setProperty("/editable", false);
                            oViewModel.setProperty("/isEditMode", true);
                            this.getRouter().navTo("RouteTrainee", { value: "TraineeDetails" });
                        }.bind(this),
                    );
                } else {
                    this.getRouter().navTo("RouteTrainee", { value: "TraineeDetails" });
                }
            },
            // Reset wizard to initial state
            T_onResetWizard: function () {
                this.closeBusyDialog();
                var oWizard = this.getView().byId("TD_id_Wizard");
                oWizard.discardProgress(oWizard.getSteps()[0]); // Discard progress 
                oWizard.goToStep(oWizard.getSteps()[0]); // Go to the first step
                this.byId("TD_id_StepTwo").getParent().setShowNextButton(true);
            },
            //validate name function
            TD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
               if(this.sArgPara === "CreateTraineeFlag") this.TD_validateStep();
            },
            //validate email function
            TD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                if(this.sArgPara === "CreateTraineeFlag")this.TD_validateStep();
            },
            //validate amount function
            TD_validateAmount: function (oEvent) {
                utils._LCvalidateJoiningBonus(oEvent);
                if(this.sArgPara === "CreateTraineeFlag")this.TD_validateStep();
            },
            TD_validateMobile: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
                if(this.sArgPara === "CreateTraineeFlag")this.TD_validateStep();
            },
            //validate date function
            TD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent); // Base validation
                if(this.sArgPara === "CreateTraineeFlag")this.TD_validateStep(); // Step validation
                var oOfferDateId = oEvent.getSource().getId().split("--")[2];
                var releaseDate, joinDateVa;
                if (oOfferDateId === "TD_id_ReleaseDate" || oOfferDateId === "TU_id_RelDate") {
                    joinDateVa = oOfferDateId === "TD_id_ReleaseDate" ? "TD_id_JoiningDate" : "TU_id_JoinDate";
                    releaseDate = oEvent.getSource().getDateValue();
                    if (releaseDate) {
                        var oJoinDatePicker = this.byId(joinDateVa);
                        var joinDate = oJoinDatePicker.getDateValue();
                        oJoinDatePicker.setMinDate(releaseDate);
                        if (joinDate && joinDate < releaseDate) {
                            oJoinDatePicker.setValue("");
                            oJoinDatePicker.setValueState("Error");
                        } else {
                            oJoinDatePicker.setValueState("None");
                        }
                    }
                }
            },
            //wizard step validation function
            TD_validateStep: function () {
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                oModel.Currency = this.getView().byId("TD_id_Currency").getSelectedKey();
                oModel.Gender = this.getView().byId("TD_id_Gender").getSelectedKey();
                oModel.BaseLocation = this.getView().byId("TD_id_Location").getSelectedKey();
                oModel.TrainingDuration = this.getView().byId("TD_id_TDuration").getSelectedKey();
                const bAllFieldsFilled = this.getView().byId("TD_id_Name").getValue() && this.getView().byId("TD_id_ReportingManager").getSelectedKey() && this.getView().byId("TD_id_EmailID").getValue() && this.getView().byId("TD_id_TrainingType").getSelectedKey() && this.getView().byId("TD_id_TrainingAmount").getValue() && this.getView().byId("TD_id_ReleaseDate").getValue() &&
                    this.getView().byId("TD_id_JoiningDate").getValue() && this.getView().byId("TD_id_TDuration").getSelectedKey() && this.getView().byId("TD_Id_Country").getValue() && this.getView().byId("TD_id_Location").getSelectedKey() && this.getView().byId("TD_id_Mobile").getValue() && this.getView().byId("TD_id_STDCode").getValue();
                if (bAllFieldsFilled) {
                    let bValid = utils._LCvalidateName(this.getView().byId("TD_id_Name"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_id_ReportingManager"), "ID") && utils._LCvalidateEmail(this.getView().byId("TD_id_EmailID"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_id_TrainingType"), "ID") &&
                        utils._LCvalidateJoiningBonus(this.getView().byId("TD_id_TrainingAmount"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_ReleaseDate"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_JoiningDate"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_Id_Country"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_id_Location"), "ID") && utils._LCvalidateMobileNumber(this.getView().byId("TD_id_Mobile"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_id_STDCode"), "ID");
                    this.getView().byId("TD_id_Wizard").getSteps()[0].setValidated(bValid);
                } else {
                    this.getView().byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                    this.getView().byId("TD_id_StepOne").getAggregation("_nextButton").setText(this.i18nModel.getText("review"));
                }
            },

            //Submit trainee deatails 
            TD_onSubmitData: function (oEvent) {
                try {
                    var oModel = this.getView().getModel("oTraineeDetails").getData();
                    // Perform validations
                    var isValid =
                        utils._LCvalidateName(this.getView().byId("TD_id_Name"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("TD_id_ReportingManager"), "ID") &&
                        utils._LCvalidateEmail(this.getView().byId("TD_id_EmailID"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("TD_id_TrainingType"), "ID") &&
                        utils._LCvalidateJoiningBonus(this.getView().byId("TD_id_TrainingAmount"), "ID") &&
                        utils._LCvalidateDate(this.getView().byId("TD_id_ReleaseDate"), "ID") &&
                        utils._LCvalidateDate(this.getView().byId("TD_id_JoiningDate"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("TD_Id_Country"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("TD_id_Location"), "ID") &&
                        utils._LCvalidateMobileNumber(this.getView().byId("TD_id_Mobile"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("TD_id_STDCode"), "ID");
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    this.getBusyDialog();
                    // Prepare payload
                    oModel.Currency = this.byId("TD_id_Currency").getSelectedKey();
                    oModel.BranchCode = this.getView().byId("TD_id_Location").getSelectedItem().getAdditionalText();
                    oModel.ManagerID = this.getView().byId("TD_id_ReportingManager").getSelectedItem().getAdditionalText();
                    oModel.BaseLocation = oModel.BaseLocation !== "" ? oModel.BaseLocation : this.getView().byId("TD_id_Location").getSelectedKey();
                    oModel.Status = "Saved";
                    oModel.ReleaseDate = oModel.ReleaseDate.split("/").reverse().join('-');
                    oModel.JoiningDate = oModel.JoiningDate.split("/").reverse().join('-');
                    var oPayload = {
                        "tableName": "Trainee",
                        "data": oModel
                    };
                    this.ajaxCreateWithJQuery("Trainee", oPayload).then((oData) => {
                        if (oData.success) {
                            this.closeBusyDialog();
                            var oDialog = new sap.m.Dialog({
                                title: this.i18nModel.getText("success"),
                                type: sap.m.DialogType.Message,
                                state: sap.ui.core.ValueState.Success,
                                content: new sap.m.Text({ text: this.i18nModel.getText("traineeDataSubmitted") }),
                                beginButton: new sap.m.Button({
                                    text: "OK",
                                    type: "Accept",
                                    press: function () {
                                        oDialog.close();
                                        this.getView().byId("TD_id_StepTwo").getParent().setShowNextButton(true);
                                        this.getRouter().navTo("RouteTrainee", { value: "Trainee" });
                                        this.getView().getModel("oTraineeDetails").refresh(true);
                                    }.bind(this)
                                }),
                                endButton: new sap.m.Button({
                                    text: "Generate PDF",
                                    type: "Attention",
                                    press: function () {
                                        this.TD_onPressMerge("create");
                                        var oUpdatePayload = {
                                            data: { Status: "New" },
                                            filters: { ID: oData.ID }
                                        };
                                        this.ajaxUpdateWithJQuery("Trainee", oUpdatePayload).then((oData) => {
                                            this.closeBusyDialog();
                                            if (oData.success) {
                                                MessageToast.show(this.i18nModel.getText("pdfSucces"));
                                                oDialog.close();
                                                this.getView().byId("TD_id_StepTwo").getParent().setShowNextButton(true);
                                                this.getRouter().navTo("RouteTrainee", { value: "Trainee" });
                                                this.getView().getModel("oTraineeDetails").refresh(true);
                                            }
                                        }).catch((error) => {
                                            this.closeBusyDialog();
                                            MessageToast.show(error.message || error.responseText);
                                        });
                                    }.bind(this)
                                }),
                                afterClose: function () {
                                    oDialog.destroy();
                                }
                            });
                            oDialog.open();
                        }
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },
            //second step validation function
            TD_StepTwo: function () {
                this.getView().byId("TD_id_Submit").setEnabled(true);
                this.byId("TD_id_StepTwo").getParent().setShowNextButton(false);
            },

            //Edit/save button visibility function
            TU_onEditOrSavePress: function () {
                try {
                    if (this.viewModel.getProperty("/editable")) {
                        // Perform validations
                        var isValid =
                            utils._LCvalidateName(this.getView().byId("TU_id_Name"), "ID") &&
                            utils._LCstrictValidationComboBox(this.getView().byId("TU_id_Manager"), "ID") &&
                            utils._LCvalidateEmail(this.getView().byId("TU_id_TraineeMail"), "ID") &&
                            utils._LCstrictValidationComboBox(this.getView().byId("TU_id_TrainingType"), "ID") &&
                            utils._LCvalidateJoiningBonus(this.getView().byId("TU_id_TrainingAmount"), "ID") &&
                            utils._LCstrictValidationComboBox(this.getView().byId("TU_Id_Country"), "ID") &&
                            utils._LCstrictValidationComboBox(this.getView().byId("TU_id_Location"), "ID") &&
                            utils._LCvalidateMobileNumber(this.getView().byId("TU_id_Mobile"), "ID") &&
                            utils._LCstrictValidationComboBox(this.getView().byId("TU_id_STDCode"), "ID");
                        if (isValid) {
                            this.updateCallForTrainee(this.viewModel, "traineeDataUpdated");
                        } else {
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        }
                    } else {
                        this.viewModel.setProperty("/editable", true);
                        this.viewModel.setProperty("/isEditMode", false);
                    }
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            //Update trainee deatails 
            updateCallForTrainee: async function (oViewModel, text) {
                try {
                    this.getBusyDialog();
                    var oModel = this.getView().getModel("oTraineeDetails").getData();
                    oModel.BaseLocation = this.byId("TU_id_Location").getSelectedKey()
                    //  oModel.BaseLocation = oModel.BaseLocation !== "" ? oModel.BaseLocation : this.getView().byId("TU_id_Location").getSelectedKey();
                    oModel.BranchCode = this.getView().byId("TU_id_Location").getSelectedItem().getAdditionalText();

                    var sSelectedKey = this.byId("TU_id_Manager").getSelectedKey();
                    oModel.ManagerID = sSelectedKey ? sSelectedKey : oModel.ManagerID;
                    oModel.ReleaseDate = this.byId("TU_id_RelDate").getValue().split("/").reverse().join("-");
                    oModel.JoiningDate = this.byId("TU_id_JoinDate").getValue().split("/").reverse().join("-");
                    // Check and update the status if it is 'Rejected'
                    if (oModel.Status === "Rejected") {
                        oModel.Status = "Saved";
                    }
                    oModel.TrainingDuration = this.byId("TU_id_TDuration").getSelectedKey();
                    oModel = {
                        "data": oModel,
                        "filters": {
                            "ID": this.sArgPara
                        }
                    };
                    // AJAX call for updating the data
                    await this.ajaxUpdateWithJQuery("Trainee", oModel).then((oData) => {
                        if (oData.success) {
                            this.closeBusyDialog();
                            oViewModel.setProperty("/editable", false);
                            oViewModel.setProperty("/isEditMode", true);
                            oViewModel.setProperty("/isVisiable", true);
                            oViewModel.setProperty("editBut", true);
                            if (text && text !== "silent") {
                                MessageToast.show(this.i18nModel.getText(text));
                            }
                            this.getView().getModel("oTraineeDetails").refresh(true);
                        }
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            // common function for opening dialog
            TD_commonOpenDialog: function (fragmentName) {
                if (!this.TU_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (TU_oDialogMail) {
                        this.TU_oDialogMail = TU_oDialogMail;
                        this.getView().addDependent(this.TU_oDialogMail);
                        this.TU_oDialogMail.open();
                    }.bind(this));
                } else {
                    this.TU_oDialogMail.open();
                }
            },
            //Mail dialog open function
            TU_onSendEmail: function () {
                var oTraineeEmail = this.getView().getModel("oTraineeDetails").getData().TraineeEmail;
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
                this.TD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
                this.validateSendButton();
            },
            //back function
            TD_onPressback: function () {
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),
                    function () {
                        this.getRouter().navTo("RouteTrainee", { value: "TraineeDetails" });
                    }.bind(this)
                );
                this.byId("TD_id_StepTwo").getParent().setShowNextButton(true);
            },
            //  Mail dialog close function    
            Mail_onPressClose: function () {
                this.TU_oDialogMail.destroy();
                this.TU_oDialogMail = null;
            },
            //File upload function
            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(oEvent, this, "UploaderData", "/attachments", "/name", "/isFileUploaded", "uploadSuccessfull", "fileAlreadyUploaded", "noFileSelected", "fileReadError",
                    () => this.validateSendButton());
            },
            //validate button function
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

            //mail id change function
            Mail_onEmailChange: function () {
                this.validateSendButton();
            },
            //mail send function
            Mail_onSendEmail: function () {
                try {
                    var oModel = this.getView().getModel("oTraineeDetails").getData();
                    var aAttachments = this.getView().getModel("UploaderData").getProperty("/attachments");
                    if (!aAttachments || aAttachments.length === 0) {
                        MessageToast.show(this.i18nModel.getText("attachmentRequired")); // Or a hardcoded string: "Please add at least one attachment."
                        return;
                    }
                    this.getBusyDialog();
                    var oPayload = {
                        "TraineeName": oModel.TraineeName,
                        "toEmailID": oModel.TraineeEmail,
                        "JoiningDate": Formatter.formatDate(oModel.JoiningDate),
                        "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
                        "attachments": this.getView().getModel("UploaderData").getProperty("/attachments")
                    };
                    this.ajaxCreateWithJQuery("TraineeOfferEmail", oPayload).then((oData) => {
                        this.getView().getModel("oTraineeDetails").setProperty("/Status", "Offer Sent");
                        MessageToast.show(this.i18nModel.getText("emailSuccess"));
                        this.closeBusyDialog();
                        this.updateCallForTrainee(this.viewModel, "silent");
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.responseText);
                    });
                    this.Mail_onPressClose();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.responseText);
                }
            },
             TD_validateCombo: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                if(this.sArgPara === "CreateTraineeFlag") this.TD_validateStep();
            },
            //PDF generation function
            TD_onPressMerge: async function (value) {
                var oModel = this.getView().getModel("oTraineeDetails");
                this.getView().getModel("oTraineeDetails").setProperty("/Status", "New");
                if (value !== "create") {
                    await this.updateCallForTrainee(this.viewModel, "silent");
                }
                this.offerGeneratingPdfFunction(oModel);
                this.getView().getModel("oTraineeDetails").refresh(true);
            },
            async offerGeneratingPdfFunction(oModel) {
                this.getBusyDialog();
                var oEmpModel = oModel.getData();
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: oEmpModel.BranchCode });
                await this._fetchCommonData("PDFCondition", "PDFConditionModel", { Type: "TraineeOffer" });
                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/Type", "Trainee Offer");
                oPDFModel.setProperty("/EmpName", oEmpModel.NameSalutation + " " + oEmpModel.TraineeName);
                oPDFModel.setProperty("/EmpRole", "Trainee");
                oPDFModel.setProperty("/TrainingDuration", oEmpModel.TrainingDuration);
                oPDFModel.setProperty("/CreateDate", Formatter.formatDate(oEmpModel.ReleaseDate));
                oPDFModel.setProperty("/TrainingStartDate", Formatter.formatDate(oEmpModel.JoiningDate));
                oPDFModel.setProperty("/ReportingManager", oEmpModel.ReportingManager);
                oPDFModel.setProperty("/StipendOrFees", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.Amount));
                oPDFModel.setProperty("/StipendSkipLine", (oEmpModel.Type === "Paid" || parseInt(oEmpModel.Amount) === 0) ? 5 : null);
                oPDFModel.setProperty("/TrainingFeesSkipLine", (oEmpModel.Type === "Stipend" || parseInt(oEmpModel.Amount) === 0) ? 6 : null);
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                var oPDFConditionModel = this.getView().getModel("PDFConditionModel").getData();
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
                    }
                }
                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePDF === "function") {
                        jsPDF._GeneratePDF(this, oPDFModel.getData(), oCompanyDetailsModel, oPDFConditionModel);
                    }
                }
            },

            onLogout: function () {
                this.CommonLogoutFunction();
            },

            onTrainingTypeChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                if(this.sArgPara === "CreateTraineeFlag") this.TD_validateStep();
                var oComboBox = oEvent.getSource();
                var sSelectedKey = oComboBox.getSelectedKey();
                sSelectedKey = sSelectedKey ? sSelectedKey.trim() : oComboBox.getValue().trim();
                const oView = this.getView();
                if (sSelectedKey && oComboBox.getValueState() !== "Error") {
                    oView.byId("TD_id_TrainingAmountLabel").setVisible(true);
                    oView.byId("TD_id_TrainingDetailsBox").setVisible(true);
                    oView.byId("TD_id_TrainingAmount").setValue("");
                    oView.byId("TD_id_TrainingAmount").setValueState("None");
                } else {
                    oView.byId("TD_id_TrainingAmountLabel").setVisible(false);
                    oView.byId("TD_id_TrainingDetailsBox").setVisible(false);
                    oView.byId("TD_id_TrainingAmount").setValue("");
                    oView.byId("TD_id_TrainingAmount").setValueState("None");
                }
            },

            TD_CreateSalutationChange: function (oEvent) {
                this.onSalutationChangeCommon(
                    oEvent,
                    "oTraineeDetails",       // name of the model
                    "/Gender",           // path to gender property
                    "TD_id_Gender"        // ID of the gender control
                );
            },
            TU_EditSalutation: function (oEvent) {
                this.onSalutationChangeCommon(
                    oEvent,
                    "oTraineeDetails",       // name of the model
                    "/Gender",           // path to gender property
                    "TU_id_Gender"        // ID of the gender control
                );
            },
            TD_onChangeCountry: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
                this.onCountryChange(oEvent, { stdCodeCombo: "TD_id_STDCode", baseLocationCombo: "TD_id_Location", branchInput: "TD_id_BranchCode", mobileInput: "TD_id_Mobile" });
                if(this.sArgPara === "CreateTraineeFlag") this.TD_validateStep();
            },
            TU_onChangeCountry: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
                this.onCountryChange(oEvent, { stdCodeCombo: "TU_id_STDCode", baseLocationCombo: "TU_id_Location", branchInput: "TU_id_BranchCode", mobileInput: "TU_id_Mobile" });
            },
        });
    });
