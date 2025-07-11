sap.ui.define(["./BaseController", "../model/formatter", "../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/BusyIndicator", "sap/m/MessageToast", "sap/m/MessageBox", "../utils/SalaryCertificatePDF", "../fonts/EBGaramond", "../fonts/Allura", "../fonts/Poppins", "../fonts/Plight"],
    (Controller, Formatter, utils, JSONModel, BusyIndicator, MessageToast, MessageBox, jsPDF, EBGaramond, Allura, Poppins, Plight) => {
        "use strict";
        return Controller.extend("sap.kt.com.minihrsolution.controller.SelfService", {
            Formatter: Formatter,
            onInit: function () {
                const today = new Date();
                const nextMonthFirstDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                const maxDate18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                var oDateModel = new sap.ui.model.json.JSONModel();
                oDateModel.setData({ maxDate: maxDate18YearsAgo, focusedDate: new Date(2000, 0, 1), minDate: new Date(1950, 0, 1), nextMonthMinDate: nextMonthFirstDate });
                this.getView().setModel(oDateModel, "controller");
                this.getRouter().getRoute("SelfService").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                try {
                    var LoginFUnction = await this.commonLoginFunction("SelfService");
                    if (!LoginFUnction) return;
                    this.initializeBirthdayCarousel();
                    this.getBusyDialog();
                    const oView = this.getView();
                    this.i18nModel = oView.getModel("i18n").getResourceBundle();
                    this.companyName = "Kalpavriksha Technologies";
                    this._fetchCommonData("EmployeeDetailsData", "empModel");

                    this._makeDatePickersReadOnly(["SS_id_Dob", "SS_id_ResgEndDate", "SS_id_DocType"]);
                    const viewModel = new sap.ui.model.json.JSONModel({
                        fragmentSave: false, fragmentSubmit: false, isEditMode: false, EmployeeStatus: false, isRoleMode: false, Max: new Date(), TraineeRole: false, Letter: false, ResignationVisible: false, CanWithdrawResignation: false, ShowStatusControl: false,
                        isVisitMode: true, isIdMode: true, isEditButtonVisible: true, PhotoSave: true, PhotoSubmit: false, BtnVisible: true, AdminRole: false, RelievingLetter: false, SelfService: false, min: new Date(), SetProfile: false, SalarySectionVisible: false, WorkCompletedVisible: false, SelfServiceBtn: false
                    });
                    oView.setModel(viewModel, "viewModel");
                    this.ViewModel = this.getView().getModel("viewModel");
                    const loginModel = this.getOwnerComponent().getModel("LoginModel");
                    var sLoggedInRole = loginModel.getProperty("/Role");
                    if (["Admin", "HR Manager", "HR"].includes(sLoggedInRole)) {
                        this.ViewModel.setProperty("/ShowStatusControl", true);
                    } else {
                        this.ViewModel.setProperty("/ShowStatusControl", false);
                    }
                    this.sNavigatedRole = oEvent.getParameter("arguments").Role; // Role from navigation
                    this.sPath = oEvent.getParameter('arguments').sPath;
                    // sections if role is "Trainee" from either login or navigation
                    var bHideSalarySection = sLoggedInRole === "Trainee" || this.sNavigatedRole === "Trainee";
                    this.ViewModel.setProperty("/TraineeRole", bHideSalarySection);

                    var aIds = ["SS_id_ldob", "SS_id_lb", "SS_id_lpa", "SS_id_lca", "SS_id_Lmo", "SS_id_lr", "SS_id_les", "SS_id_Pf", "SS_id_lName", "SS_id_Rf", "SS_id_Mf", "SS_id_Af", "SS_id_Ps", "SS_idEmeSalS", "SS_id_lN", "SS_id_Ms", "SS_id_As",
                        "SS_id_An", "SS_id_Ah", "SS_id_Bn", "SS_id_Bb", "SS_id_Ifc", "SS_id_Ba", "SS_id_LPan", "SS_id_LAdhar"];
                    if (this.sPath === "SelfService") {
                        this.ViewModel.setProperty("/SelfServiceBtn", true);
                        this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("tileSelfSerciceFooter"));
                        this.ViewModel.setProperty("/SetProfile", true);
                        if (loginModel) this.EmployeeID = loginModel.getProperty("/EmployeeID");
                        aIds.forEach(function (sId) {
                            this.getView().byId(sId).setRequired(true);
                        }.bind(this));
                        this.byId("SS_id_lc").setRequired(false)
                        this.byId("SS_id_lbase").setRequired(false)
                        this.byId("SS_id_lds").setRequired(false)
                        this.byId("SS_id_Lmg").setRequired(false)
                    }
                    else {
                        this.ViewModel.setProperty("/SelfServiceBtn", false);
                        this.EmployeeID = this.sPath;
                        this.byId("SS_id_lc").setRequired(true)
                        this.byId("SS_id_lbase").setRequired(true)
                        this.byId("SS_id_Lmg").setRequired(true)

                        this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("headerEmpDetails"));
                        if (this.sPath !== "SelfService" && ["Admin", "HR Manager", "HR"].includes(sLoggedInRole) && sLoggedInRole !== "Trainee" && this.sNavigatedRole !== "Trainee") {
                            this.ViewModel.setProperty("/Letter", true);
                        } else {
                            this.ViewModel.setProperty("/Letter", false);
                        }
                        if (["Admin", "HR Manager", "HR"].includes(loginModel.getProperty("/Role"))) {
                            this.ViewModel.setProperty("/RelievingLetter", true);
                        }
                        aIds.forEach(function (sId) {
                            this.getView().byId(sId).setRequired(false);
                        }.bind(this));
                    }
                    if (this.sPath === "SelfService" && sLoggedInRole !== "Trainee" && this.sNavigatedRole !== "Trainee") {
                        this.ViewModel.setProperty("/ResignationVisible", true);
                    } else {
                        this.ViewModel.setProperty("/ResignationVisible", false);
                    }
                    var employeeModel = new JSONModel();
                    this.getOwnerComponent().setModel(employeeModel, "employeeModel");
                    if (this.EmployeeID) {
                        await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", {
                            EmployeeID: this.EmployeeID
                        });
                        oView.getModel("sEmployeeModel").refresh(true);
                        var oModelAllData = this.getView().getModel("sEmployeeModel").getData()[0];
                        if (this.sPath === "SelfService" && oModelAllData.Type !== "Submit") this.ViewModel.setProperty("/SelfService", true);

                        if (!oModelAllData.EContactIStdCode) oModelAllData.EContactIStdCode = "+91";
                        if (!oModelAllData.EContactIIStdCode) oModelAllData.EContactIIStdCode = "+91";

                        // --- Releving letter Button Visibility Logic ---
                        if (this.sPath !== "SelfService" && ["Admin", "HR Manager", "HR"].includes(sLoggedInRole) && this.sNavigatedRole !== "Trainee") {
                            this.byId("SS_id_Action").setVisible(true);
                            this.ViewModel.setProperty("/TraineeRole", false);

                            if (oModelAllData.EmployeeStatus === "Inactive") {
                                this.ViewModel.setProperty("/WorkCompletedVisible", true);
                                this.ViewModel.setProperty("/Letter", false);
                                this.ViewModel.setProperty("/isVisitMode", false);
                                this.ViewModel.setProperty("/RelievingLetter", false);
                            } else if (oModelAllData.EmployeeStatus === "Active") {
                                this.ViewModel.setProperty("/WorkCompletedVisible", false);
                                this.ViewModel.setProperty("/isVisitMode", true);
                                this.ViewModel.setProperty("/Letter", true);
                            }
                        } else {
                            this.ViewModel.setProperty("/WorkCompletedVisible", false);
                            if (oModelAllData.EmployeeStatus === "Inactive") {
                                this.byId("SS_id_Action").setVisible(false);
                            }
                        }
                        const oObjectPage = this.byId("ObjectPageLayout");
                        const oSection = this.byId("basicDetailsSection");
                        if (oObjectPage && oSection) {
                            oObjectPage.setSelectedSection(oSection);
                        }
                    }
                    this.managerID = this.getView().getModel("sEmployeeModel").getProperty("/0/ManagerID");
                    var oTextModel = new JSONModel({ name: "" });
                    this.getView().setModel(oTextModel, "TextDisplay");
                    var oIdCardModel = this.getView().getModel("IdCardModel");
                    if (oIdCardModel) {
                        oIdCardModel.attachPropertyChange(this.IC_onPressDisplayImageOnCanvas.bind(this));
                    }
                    this.byId("SS_id_EmeNameF").setValueState("None");
                    this.byId("SS_idRelF").setValueState("None");
                    this.byId("SS_id_EmpMoF").setValueState("None");
                    this.byId("SS_id_AddF").setValueState("None");
                    this.byId("SS_id_NameS").setValueState("None");
                    this.byId("SS_idRelS").setValueState("None");
                    this.byId("SS_id_EmpMoS").setValueState("None");
                    this.byId("SS_id_PAddress").setValueState("None");
                    this.byId("SS_id_Manager").setValueState("None");
                    this.byId("SS_id_BloodGroup").setValueState("None");
                    this.byId("SS_id_CAdress").setValueState("None");
                    this.byId("SS_id_EmpAddS").setValueState("None");
                    this.byId("SS_id_MobileNo").setValueState("None");
                    this.byId("SS_id_STDCode").setValueState("None");
                    this.byId("SS_id_STDCodeRI").setValueState("None");
                    this.byId("SS_id_STDCodeRII").setValueState("None");
                    this.byId("SS_id_FatherName").setValueState("None");
                    this.byId("SS_id_Compmail").setValueState("None");

                } catch (error) { } finally {
                    this.closeBusyDialog();
                }
                this.oModel = this.getView().getModel("PaySlip");
                this._currentSection = this.byId("ObjectPageLayout").getSelectedSection();
                this.initAddressToggleModel();
            },

            onSectionChange: async function (oEvent) {
                const viewModel = this.getView().getModel("viewModel");
                const oNewSection = oEvent.getParameter("section");
                const oCurrentSection = this._currentSection;

                // If in edit mode, show confirmation dialog
                if (viewModel.getProperty("/isEditMode")) {
                    this.showConfirmationDialog(
                        this.i18nModel.getText("confirmNavigationTitle"),
                        this.i18nModel.getText("sectionChangeConfirm"),
                        async () => {
                            viewModel.setProperty("/isEditMode", false);
                            this._currentSection = oNewSection;
                            const sectionTitle = oNewSection.getTitle();

                            switch (sectionTitle) {
                                case "Basic Details":
                                    await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", { EmployeeID: this.EmployeeID });
                                    this.getView().getModel("sEmployeeModel").refresh(true);
                                    break;

                                case "Salary Details":
                                    this.SS_readSalaryDetails(this.EmployeeID);
                                    break;

                                case "Payslip":
                                    await this._commonGETCall("AdminPaySlip", "EmpTable", { EmployeeID: this.EmployeeID });
                                    break;

                                case "Document":
                                    [
                                        "SS_id_AcName", "SS_id_Acno", "SS_id_BankName", "SS_id_Branch",
                                        "SS_id_IfcsCode", "SS_id_Address", "SS_id_Pan", "SS_idAdhar",
                                        "SS_id_Passport", "SS_id_Voterid"
                                    ].forEach(id => this.byId(id)?.setValueState("None"));
                                    this.SS_readEducationalDetails(this.EmployeeID);
                                    this.SS_readEmploymentDetails(this.EmployeeID);
                                    break;

                                case "Attachment":
                                    this.byId("SS_id_DocType")?.setValueState("None");
                                    this.ReadEmployeeDocument();
                                    break;
                            }
                        },
                        () => {
                            this.byId("ObjectPageLayout").setSelectedSection(oCurrentSection);
                        },
                        this.i18nModel.getText("OkButton"),
                        this.i18nModel.getText("CancelButton")
                    );
                    return;
                }
                this._currentSection = oNewSection;
                const sectionTitle = oNewSection.getTitle();
                switch (sectionTitle) {
                    case "Basic Details":
                        await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", { EmployeeID: this.EmployeeID });
                        this.getView().getModel("sEmployeeModel").refresh(true);
                        break;
                    case "Salary Details":
                        this.SS_readSalaryDetails(this.EmployeeID);
                        break;
                    case "Payslip":
                        this.getBusyDialog();
                        await this._commonGETCall("AdminPaySlip", "EmpTable", { EmployeeID: this.EmployeeID });
                        this.closeBusyDialog();
                        break;
                    case "Document":
                        this.byId("SS_id_AcName").setValueState("None");
                        this.byId("SS_id_Acno").setValueState("None");
                        this.byId("SS_id_BankName").setValueState("None");
                        this.byId("SS_id_Branch").setValueState("None");
                        this.byId("SS_id_IfcsCode").setValueState("None");
                        this.byId("SS_id_Address").setValueState("None");
                        this.byId("SS_id_Pan").setValueState("None");
                        this.byId("SS_idAdhar").setValueState("None");
                        this.byId("SS_id_Passport").setValueState("None");
                        this.byId("SS_id_Voterid").setValueState("None");
                        this.SS_readEducationalDetails(this.EmployeeID);
                        this.SS_readEmploymentDetails(this.EmployeeID);
                        break;
                    case "Attachment":
                        this.byId("SS_id_DocType").setValueState("None");
                        this.byId("SS_id_DocType").setValue("");
                        this.ReadEmployeeDocument();
                        break;
                }
            },
            onOpenActionBtn: function (oEvent) {
                var oBtn = oEvent.getSource();
                if (!this._oActionBtn) {
                    this._oActionBtn = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.SelfServiceActionDialog", this);
                    this.getView().addDependent(this._oActionBtn);
                }
                this._oActionBtn.openBy(oBtn);
            },
            SS_readEducationalDetails: async function (filter) {
                try {
                    this.getBusyDialog();
                    const oData = await this.ajaxReadWithJQuery("EducationalDetails", { EmployeeID: filter },);
                    const offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "sEducationModel");
                    this.closeBusyDialog();
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                    this.closeBusyDialog();
                }
            },
            SS_readEmploymentDetails: async function (filter) {
                try {
                    this.getBusyDialog();
                    const oData = await this.ajaxReadWithJQuery("EmploymentDetails", { EmployeeID: filter },);
                    const offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "sEmploymentModel");
                    this.closeBusyDialog();
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                    this.closeBusyDialog();
                }
            },
            SS_commonEduFunction() {
                var eduModel = new JSONModel({
                    EmployeeID: this.EmployeeID,
                    CollegeName: "",
                    DegreeName: "",
                    EducationStartDate: "",
                    EducationEndDate: "",
                    Grade: "",
                    GradeType: "",
                });
                this.getView().setModel(eduModel, "educationModel");
            },
            SS_commonEmpFunction() {
                var empModel = new JSONModel({
                    EmployeeID: this.EmployeeID,
                    CompanyName: "",
                    Designation: "",
                    StartDate: "",
                    EndDate: "",
                    OfficeAddress: "",
                    RCISal: "",
                    RCIName: "",
                    RCIAddress: "",
                    RCIEmailID: "",
                    RCIMobileNo: "",
                    RCIISal: "",
                    RCIIName: "",
                    RCIIAddress: "",
                    RCIIEmailID: "",
                    RCIIMobileNo: "",
                });
                this.getView().setModel(empModel, "employmentModel");
            },
            SS_validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
            },
            SS_validateCombo: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },
            SS_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
            },
            SS_validateVoterId: function (oEvent) {
                utils._LCvalidateVoterId(oEvent);
            },
            SS_validateAadharCard: function (oEvent) {
                utils._LCvalidateAadharCard(oEvent);
            },
            SS_validatePassport: function (oEvent) {
                utils._LCvalidatePassport(oEvent);
            },
            SS_validatePanCard: function (oEvent) {
                utils._LCvalidatePanCard(oEvent);
            },
            SS_validateAccountNo: function (oEvent) {
                utils._LCvalidateAccountNo(oEvent);
            },
            SS_validateIfcCode: function (oEvent) {
                utils._LCvalidateIfcCode(oEvent);
            },
            SS_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            SS_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            Emp_onDesignationChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            oEmpStartDateChange: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            SS_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            SS_validateGrade: function (oEvent) {
                var sGradeTypeId = "AddEd_id_GradeType";
                var oGradeField = oEvent.getSource();
                if (oGradeField && sap.ui.getCore().byId(sGradeTypeId)) {
                    utils._LCvalidateGrade(oGradeField, "ID", sGradeTypeId);
                }
            },
            SS_validateGradeType: function () {
                var oGradeField = sap.ui.getCore().byId("AddEd_id_Grade");
                if (oGradeField) {
                    utils._LCvalidateGrade(oGradeField, "ID", "AddEd_id_GradeType");
                }
            },

            FSA_onNomineNameLiveChange: function (oEvent) {
                // utils._LCvalidateMandatoryField(oEvent);
                utils._LCvalidateName(oEvent);
            },

            FAA_onDateChange: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            // Edit button visibility with role-based access control and SelfService 
            SS_onEditPress: function (oEvent) {
                var isEditMode = this.getView().getModel("viewModel").getProperty("/isEditMode");
                var Role = this.getView().getModel("LoginModel").getProperty("/Role");
                var allowedRoles = ["Admin", "HR Manager", "HR"];
                // Allow all users to edit in SelfService mode
                if (this.sPath === "SelfService") {
                    if (isEditMode) {
                        if (this.SS_onSavePress(oEvent.getSource().getId().split('--').pop())) {
                            this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                        }
                    } else {
                        this.getView().getModel("viewModel").setProperty("/isEditMode", true);
                        this.getView().getModel("viewModel").setProperty("/AdminRole", false);
                    }
                    return;
                }
                // Role-based edit for other cases
                if (isEditMode) {
                    if (this.SS_onSavePress(oEvent.getSource().getId().split('--').pop())) {
                        this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                    }
                } else {
                    if (allowedRoles.includes(Role)) {
                        this.getView().getModel("viewModel").setProperty("/isEditMode", true);
                        this.getView().getModel("viewModel").setProperty("/AdminRole", ["Admin", "HR Manager", "HR"].includes(Role));
                    } else {
                        sap.m.MessageToast.show(this.i18nModel.getText("permissionDenied"));
                    }
                }
            },

            onPressSubmit: async function (oEvent) {
                const that = this;
                await this.ReadEmployeeDocument();
                var oModel = this.getView().getModel("DocumentModel").getData();
                if (!oModel || oModel.items.length === 0) {
                    sap.m.MessageBox.error(this.i18nModel.getText("uploadAtLeastOneDocumentMessage"),
                        { title: this.i18nModel.getText("selfsubmitErr") }); return;
                }
                const ID = oEvent.getSource().getId().split("--").pop();
                that.SS_onSavePress(ID);
            },

            onChangeResigEndDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },

            SS_onSavePress: function (ID) {
                var oView = this.getView();
                var oDataModel = oView.getModel("sEmployeeModel").getData()[0];
                let isValid = true;
                let optionalValid = true;
                var Message = this.i18nModel.getText("selfServiceUpdateAdmin");
                if (this.sNavigatedRole !== "Trainee") {
                    if (ID !== "Submit" && oDataModel.EmployeeStatus === 'Inactive' && !oView.byId("SS_id_ResgEndDate").getValue()) {
                        MessageToast.show(this.i18nModel.getText("resignationEndDateRequired"));
                        return;
                    }
                }
                try {
                    if (ID !== "Submit") {
                        if (this.sPath === 'SelfService') {
                            var Message = this.i18nModel.getText("selfServiceUpdateEmployee");
                            if (ID === "BasicDetailsBtn") {
                                isValid =
                                    utils._LCvalidateDate(oView.byId("SS_id_Dob"), "ID") &&
                                    utils._LCstrictValidationComboBox(oView.byId("SS_id_BloodGroup"), "ID") &&
                                    utils._LCvalidateMandatoryField(oView.byId("SS_id_PAddress"), "ID") &&
                                    utils._LCvalidateMandatoryField(oView.byId("SS_id_CAdress"), "ID") &&
                                    utils._LCstrictValidationComboBox(oView.byId("SS_id_STDCode"), "ID") &&
                                    utils._LCvalidateMobileNumber(oView.byId("SS_id_MobileNo"), "ID") &&
                                    utils._LCvalidateName(oView.byId("SS_id_EmeNameF"), "ID") &&
                                    utils._LCstrictValidationComboBox(oView.byId("SS_id_STDCodeRI"), "ID") &&
                                    utils._LCvalidateMobileNumber(oView.byId("SS_id_EmpMoF"), "ID") &&
                                    utils._LCvalidateMandatoryField(oView.byId("SS_id_AddF"), "ID") &&
                                    utils._LCvalidateName(oView.byId("SS_id_NameS"), "ID") &&
                                    utils._LCstrictValidationComboBox(oView.byId("SS_id_STDCodeRII"), "ID") &&
                                    utils._LCvalidateMobileNumber(oView.byId("SS_id_EmpMoS"), "ID") &&
                                    utils._LCvalidateMandatoryField(oView.byId("SS_id_EmpAddS"), "ID") &&
                                    utils._LCvalidateEmail(oView.byId("SS_id_Compmail"), "ID");
                            } else if (ID === "DocumentBtn") {
                                isValid =
                                    utils._LCvalidateName(oView.byId("SS_id_AcName"), "ID") &&
                                    utils._LCvalidateAccountNo(oView.byId("SS_id_Acno"), "ID") &&
                                    utils._LCvalidateMandatoryField(oView.byId("SS_id_BankName"), "ID") &&
                                    utils._LCvalidateMandatoryField(oView.byId("SS_id_Branch"), "ID") &&
                                    utils._LCvalidateIfcCode(oView.byId("SS_id_IfcsCode"), "ID") &&
                                    utils._LCvalidateMandatoryField(oView.byId("SS_id_Address"), "ID") &&
                                    utils._LCvalidatePanCard(oView.byId("SS_id_Pan"), "ID") &&
                                    utils._LCvalidateAadharCard(oView.byId("SS_idAdhar"), "ID");
                            }
                            if (!isValid) {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                                return;
                            }
                        }
                        // Validate company mail, Manager, Country, and Base Location fields
                        if (
                            !utils._LCvalidateEmail(oView.byId("SS_id_Compmail"), "ID") ||
                            !utils._LCstrictValidationComboBox(oView.byId("SS_id_Country"), "ID") ||
                            !utils._LCstrictValidationComboBox(oView.byId("SS_id_BaseL"), "ID") ||
                            !utils._LCstrictValidationComboBox(oView.byId("SS_id_Manager"), "ID")
                        ) {
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                            return;
                        }
                        // Optional field validation
                        const passport = oView.byId("SS_id_Passport").getValue().trim();
                        const voterId = oView.byId("SS_id_Voterid").getValue().trim();
                        const optionalValid =
                            (passport === "" || utils._LCvalidatePassport(oView.byId("SS_id_Passport"), "ID")) &&
                            (voterId === "" || utils._LCvalidateVoterId(oView.byId("SS_id_Voterid"), "ID")) &&
                            (oDataModel.MobileNo == null || oDataModel.MobileNo.trim() === "" || utils._LCvalidateMobileNumber(oView.byId("SS_id_MobileNo"), "ID")) &&
                            (oDataModel.AccountNo == null || oDataModel.AccountNo.trim() === "" || utils._LCvalidateAccountNo(oView.byId("SS_id_Acno"), "ID")) &&
                            (oDataModel.IFSCCode == null || oDataModel.IFSCCode.trim() === "" || utils._LCvalidateIfcCode(oView.byId("SS_id_IfcsCode"), "ID")) &&
                            (oDataModel.PANCard == null || oDataModel.PANCard.trim() === "" || utils._LCvalidatePanCard(oView.byId("SS_id_Pan"), "ID")) &&
                            (oDataModel.AdharCard == null || oDataModel.AdharCard.trim() === "" || utils._LCvalidateAadharCard(oView.byId("SS_idAdhar"), "ID")) &&
                            (oDataModel.EmployeeStatus === 'Inactive' && this.sNavigatedRole !== "Trainee" ? utils._LCvalidateDate(oView.byId("SS_id_ResgEndDate"), "ID") : true);

                        if (!optionalValid) {
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                            return;
                        }

                        // Update some fields before sending
                        oDataModel.DateOfBirth = oView.byId("SS_id_Dob").getValue().split("/").reverse().join("-");
                        oDataModel.EmergencyContactPerson1Salutation = oView.byId("SS_idEmeSalF").getSelectedKey();
                        oDataModel.EmergencyContactPerson2Salutation = oView.byId("SS_idEmeSalS").getSelectedKey();
                        oDataModel.EmergencyContactPerson1Realtion = oView.byId("SS_idRelF").getSelectedKey();
                        oDataModel.EmergencyContactPerson2Realtion = oView.byId("SS_idRelS").getSelectedKey();
                    } else {
                        oDataModel.Type = "Submit";
                        var Message = this.i18nModel.getText("confirmSubmitMessage");
                    }

                    const oPayload = {
                        data: oDataModel,
                        filters: {
                            EmployeeID: this.EmployeeID
                        }
                    };

                    if (optionalValid) {
                        this.showConfirmationDialog(this.i18nModel.getText("confirmTitle"), Message,
                            function () {
                                this.getBusyDialog();
                                this.updateFunctionForSelf(oPayload, ID);
                            }.bind(this),
                            function () {
                                this.closeBusyDialog();
                            }.bind(this)
                        );
                    }

                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || "Unexpected error");
                }
            },
            updateFunctionForSelf: function (oPayload, ID) {
                var oView = this.getView();
                var oDataModel = oView.getModel("sEmployeeModel").getData()[0];
                this.ajaxUpdateWithJQuery("EmployeeDetails", oPayload)
                    .then((oData) => {
                        if (oData.success) {
                            if (ID === 'Submit') {
                                this.ViewModel.setProperty("/SelfService", false);
                            }
                            MessageToast.show(this.i18nModel.getText("dataSaved"));
                            oView.getModel("viewModel").setProperty("/isEditMode", false);
                            oView.getModel("viewModel").setProperty("/AdminRole", false);
                            this._updateAddressModel(oDataModel);
                            this._fetchCommonData("EmployeeDetails", "sEmployeeModel", {
                                EmployeeID: this.EmployeeID
                            });
                            this.byId("SS_id_Passport").setValueState("None");
                            this.byId("SS_id_Voterid").setValueState("None");
                        } else {
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        }
                        this.closeBusyDialog();
                        sap.ui.core.BusyIndicator.hide(0);
                    })
                    .catch((oError) => {
                        this.closeBusyDialog();
                        MessageToast.show(oError.responseText || oError.message);
                    });
            },
            onManagerChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
                const oDataModel = this.getView().getModel("sEmployeeModel").getProperty("/0");
                const requestData = { ManagerID: oDataModel.ManagerID, Status: "Submitted" };
                oDataModel.ManagerID = oEvent.getSource().getSelectedKey();
                oDataModel.ManagerName = oEvent.getSource().getSelectedItem() ? oEvent.getSource().getSelectedItem().getText() : oEvent.getSource().getValue();
                var oPayload = {
                    data: oDataModel,
                    filters: {
                        EmployeeID: this.EmployeeID
                    }
                };
                if (!oDataModel.ManagerName && !oDataModel.ManagerID) {
                    return
                }
                this.getBusyDialog();
                var that = this;
                this.ajaxReadWithJQuery("InboxDetails", requestData)
                    .then((oData) => {
                        this.closeBusyDialog();
                        if (oData.data && oData.data.length > 0 && this.managerID !== oDataModel.ManagerID) {
                            MessageBox.show(this.getView().getModel("i18n").getResourceBundle().getText("managerChangeMsg"), {
                                icon: sap.m.MessageBox.Icon.INFORMATION,
                                title: "Confirmation",
                                actions: [sap.m.MessageBox.Action.OK, "Cancle"],
                                onClose: async function (sAction) {
                                    if (sAction === "OK") {
                                        this.getBusyDialog();
                                        // oData.ManagerID = managerId;
                                        await this.updateFunctionForSelf(oPayload, "");
                                        var flag = false;
                                        for (let i = 0; i < oData.data.length; i++) {
                                            oData.data[i].ManagerName = oPayload.data.ManagerName
                                            oData.data[i].ManagerID = oPayload.data.ManagerID
                                            oData.data[i].ManagerChanges = "Manager Changes"

                                            const payLoad = {
                                                data: oData.data[i],
                                                filters: {
                                                    ID: oData.data[i].ID
                                                }
                                            }
                                            await this.ajaxUpdateWithJQuery("InboxDetails", payLoad)
                                                .then((oData) => {
                                                    flag = true;
                                                })
                                                .catch((oError) => {
                                                    flag = false;
                                                    this.closeBusyDialog();
                                                    return;
                                                }).bind(this);

                                        };
                                        if (flag) {
                                            // sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("managerUpdate"));
                                        } else {
                                            sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("commomerror"));
                                        }
                                        //sap.ui.core.BusyIndicator.hide(0);

                                    } else {
                                        await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", {
                                            EmployeeID: this.EmployeeID
                                        }).then(async () => {
                                            oPayload.data = that.getView().getModel("sEmployeeModel").getData()[0]
                                            that.getView().byId("SS_id_Manager").setSelectedKey(oPayload.data.ManagerID);
                                            //await that.updateFunctionForSelf(oPayload, "");
                                        });
                                        this.closeBusyDialog();
                                    }
                                }.bind(this)
                            });
                        } else {
                            this.getBusyDialog();
                            this.updateFunctionForSelf(oPayload, "");
                            // sap.ui.core.BusyIndicator.hide(0);
                        }
                    }).bind(this)
                    .catch((oError) => {
                        MessageToast.show(oError)
                        this.closeBusyDialog();
                    }).bind(this);
                this.getView().getModel("sEmployeeModel").refresh();
                this.byId("SS_id_Manager").setValueState("None")
            },
            setMinEndDate: function (sStartDateId, sEndDateId) {
                let oStartDatePicker = sap.ui.getCore().byId(sStartDateId);
                let oEndDatePicker = sap.ui.getCore().byId(sEndDateId);
                if (oStartDatePicker && oEndDatePicker) {
                    let oStartDate = oStartDatePicker.getDateValue();
                    let oEndDate = oEndDatePicker.getDateValue();
                    oEndDatePicker.setMinDate(oStartDate);
                    if (oEndDate && oEndDate < oStartDate) {
                        oEndDatePicker.setDateValue(null);
                    }
                }
            },
            onStartDateChange: function (oEvent) {
                this.setMinEndDate("AddEd_id_StartEdu", "AddEd_id_EndEdu");
                sap.ui.getCore().byId("AddEd_id_StartEdu").setValueState("None");
            },
            oEmpStartDateChange: function () {
                this.setMinEndDate("AddEmp_id_StartDate", "AddEmp_id_EndDate");
                sap.ui.getCore().byId("AddEmp_id_StartDate").setValueState("None");
            },

            SS_commonOpenDialog: function (dialogProperty, fragmentName, datePickerIds = []) {
                if (!this[dialogProperty]) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(oDialog => {
                        this[dialogProperty] = oDialog;
                        this.getView().addDependent(oDialog);
                        this._FragmentDatePickersReadOnly(datePickerIds);
                        oDialog.open();
                    });
                } else {
                    this._FragmentDatePickersReadOnly(datePickerIds);
                    this[dialogProperty].open();
                }
            },

            EdF_AddEdu: function () {
                this.ViewModel.setProperty("/fragmentSubmit", true);
                this.ViewModel.setProperty("/fragmentSave", false);
                this.SS_commonEduFunction();
                this.SS_commonOpenDialog("SEd_oDialog", "sap.kt.com.minihrsolution.fragment.AddEducation", ["AddEd_id_StartEdu", "AddEd_id_EndEdu"]);
            },

            AddEd_onCloseDial: async function () {
                this.SEd_oDialog.close();
                this.byId("EdF_id_EduTable").removeSelections(true);
                const ids = ["AddEd_id_College", "AddEd_id_StartEdu", "AddEd_id_EndEdu", "AddEd_id_Grade"];
                ids.forEach((id) => {
                    sap.ui.getCore().byId(id).setValueState("None");
                });
                await this._fetchCommonData("EducationalDetails", "sEducationModel", {
                    EmployeeID: this.EmployeeID
                });
            },

            AddEmp_onClose: function () {
                this.SEmp_oDialog.close();
                this.byId("EmpF_id_EmpTable").removeSelections(true);
                const ids = ["AddEmp_id_Company", "AddEmp_id_Desig", "AddEmp_id_OfcAddress", "AddEmp_id_StartDate", "AddEmp_id_EndDate", "AdEmp_id_RCNameI", "AdEmp_id_RCAddressI", "AdEmp_id_RCMailI", "AdEmp_id_RCMobileI", "AdEmp_id_RCSalII", "AdEmp_id_RCNameII", "AdEmp_id_RCAddressII", "AdEmp_id_RCMailII", "AdEmp_id_RCMobileII"];
                ids.forEach((id) => {
                    sap.ui.getCore().byId(id).setValueState("None");
                });
                this._fetchCommonData("EmploymentDetails", "sEmploymentModel", { EmployeeID: this.EmployeeID });
            },

            EDF_EditEducation: function () {
                this.SS_commonEduFunction();
                var oSelectedItem = this.byId("EdF_id_EduTable").getSelectedItem();
                if (oSelectedItem) {
                    var oData = oSelectedItem.getBindingContext("sEducationModel").getObject();
                    this.getView().getModel("educationModel").setData(oData);
                    this.ViewModel.setProperty("/fragmentSubmit", false);
                    this.ViewModel.setProperty("/fragmentSave", true);
                    this.SS_commonOpenDialog("SEd_oDialog", "sap.kt.com.minihrsolution.fragment.AddEducation", ["AddEd_id_StartEdu", "AddEd_id_EndEdu"]);
                } else {
                    MessageToast.show(this.i18nModel.getText("selectRowUpdate"));
                }
            },

            EdF_DeletEdu: function () {
                var that = this;
                var oSelectedItem = this.byId("EdF_id_EduTable").getSelectedItem();
                if (!oSelectedItem) {
                    sap.m.MessageToast.show(this.i18nModel.getText("selctRowtoDelete"));
                    return;
                }
                var oContext = oSelectedItem.getBindingContext("sEducationModel").getProperty("ID");
                // Use common confirmation dialog
                this.showConfirmationDialog(
                    this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("edudeletConfirmation"),
                    function () {
                        that.getBusyDialog();
                        that.ajaxDeleteWithJQuery("/EducationalDetails", {
                            filters: {
                                ID: oContext
                            }
                        }).then(() => {
                            sap.m.MessageToast.show(that.i18nModel.getText("eduDataDeletSuucess"));
                            that._fetchCommonData("EducationalDetails", "sEducationModel", { EmployeeID: that.EmployeeID },);
                            that.closeBusyDialog();
                        }).catch((error) => {
                            that.closeBusyDialog();
                            sap.m.MessageToast.show(error.responseText);
                        });
                    },
                    function () { // On Cancel
                        that.closeBusyDialog();
                        that.byId("EdF_id_EduTable").removeSelections(true);
                    }
                );
            },

            EmpF_onAddEmployment: function () {
                this.ViewModel.setProperty("/fragmentSubmit", true);
                this.ViewModel.setProperty("/fragmentSave", false);
                this.SS_commonEmpFunction();
                this.SS_commonOpenDialog("SEmp_oDialog", "sap.kt.com.minihrsolution.fragment.AddEmployment", ["AddEmp_id_StartDate", "AddEmp_id_EndDate"]);
            },
            EmpF_onAddEmployment: function () {
                this.ViewModel.setProperty("/fragmentSubmit", true);
                this.ViewModel.setProperty("/fragmentSave", false);
                this.SS_commonEmpFunction();
                this.SS_commonOpenDialog("SEmp_oDialog", "sap.kt.com.minihrsolution.fragment.AddEmployment", ["AddEmp_id_StartDate", "AddEmp_id_EndDate"]);
            },

            EmpF_onEditEmployment: function () {
                var oSelectedItem = this.byId("EmpF_id_EmpTable").getSelectedItem();
                if (oSelectedItem) {
                    this.SS_commonEmpFunction();
                    var oData = oSelectedItem.getBindingContext("sEmploymentModel").getObject();
                    this.getView().getModel("employmentModel").setData(oData);
                    this.ViewModel.setProperty("/fragmentSubmit", false);
                    this.ViewModel.setProperty("/fragmentSave", true);
                    this.SS_commonOpenDialog("SEmp_oDialog", "sap.kt.com.minihrsolution.fragment.AddEmployment", ["AddEmp_id_StartDate", "AddEmp_id_EndDate"]);
                } else {
                    MessageToast.show(this.i18nModel.getText("selectRowUpdate"));
                }
            },

            EmpF_onDeletEmployment: function () {
                var that = this;
                var oSelectedItem = this.byId("EmpF_id_EmpTable").getSelectedItem();
                if (!oSelectedItem) {
                    sap.m.MessageToast.show(this.i18nModel.getText("selctRowtoDelete"));
                    return;
                }
                var oContext = oSelectedItem.getBindingContext("sEmploymentModel").getProperty("ID");
                // Show common confirmation dialog
                this.showConfirmationDialog(
                    this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("empdeleteConfirmation"),
                    function () {
                        that.getBusyDialog();
                        that.ajaxDeleteWithJQuery("/EmploymentDetails", {
                            filters: {
                                ID: oContext
                            }
                        }).then(() => {
                            sap.m.MessageToast.show(that.i18nModel.getText("empDataDeleteSuccess"));
                            that._fetchCommonData("EmploymentDetails", "sEmploymentModel", { EmployeeID: that.EmployeeID },);
                            that.closeBusyDialog();
                        }).catch((error) => {
                            sap.m.MessageToast.show(error.responseText);
                            that.closeBusyDialog();
                        });
                    },
                    function () {
                        that.byId("EmpF_id_EmpTable").removeSelections(true);
                        that.closeBusyDialog();
                    }
                );
            },
            onPressback: function (oEvent) {
                if (this.getView().getModel("viewModel").getProperty("/isEditMode")) {
                    this.showConfirmationDialog(
                        this.i18nModel.getText("ConfirmActionTitle"),
                        this.i18nModel.getText("backConfirmation"),
                        function () {
                            if (this.sPath === "SelfService") {
                                this.getRouter().navTo("RouteTilePage");
                            } else {
                                this.getRouter().navTo("RouteEmployeeDetails", { sPath: "SelfService" });
                            }
                        }.bind(this)
                    );
                } else {
                    if (this.sPath === "SelfService") {
                        this.getRouter().navTo("RouteTilePage");
                    } else {
                        this.getRouter().navTo("RouteEmployeeDetails", { sPath: "SelfService" });
                    }
                }
                if (this["SSReg_oDialog"]) {
                    this["SSReg_oDialog"].close();
                    this["SSReg_oDialog"].destroy();
                    this["SSReg_oDialog"] = null;
                }
            },
            onLogout: function () {
                this.getRouter().navTo("LoginPage");
                this.CommonLogoutFunction();
            },

            onDocumentTypeChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            onBeforeUploadStarts: function (oEvent) {
                var Selected = this.byId("SS_id_DocType").getSelectedItem();
                if (!utils._LCvalidateMandatoryField(this.byId("SS_id_DocType"), "ID") && !Selected) {
                    return MessageToast.show(this.i18nModel.getText("decumentType"));
                }
                this.getBusyDialog();
                var oModel = this.getView().getModel("sEmployeeModel");
                // var oUploadItem = oEvent.getParameter("item");
                var oFile = oEvent.getParameter("files")[0];
                if (oFile) {
                    var reader = new FileReader();
                    var that = this;
                    reader.onload = function (e) {
                        var base64 = e.target.result.split(',')[1];
                        var oPayload = {
                            "data": {
                                DocumentType: Selected.getText(),
                                EmployeeID: oModel.getData()[0].EmployeeID,
                                CreatedBy: that.getView().getModel("LoginModel").getData().EmployeeName,
                                CreatedOn: new Date().toISOString(),
                                File: base64,
                                FileName: oFile.name,
                                FileType: oFile.type,
                            }
                        };
                        that.ajaxCreateWithJQuery("EmployeeDocument", oPayload)
                            .then(function () {
                                MessageToast.show("File upload sucessfully");
                                that.ReadEmployeeDocument();
                                that.byId("SS_id_DocType").setSelectedKey("");
                            })
                            .catch(function (err) {
                                MessageToast.show("File upload failed");
                                this.closeBusyDialog();
                            });
                    };
                    reader.readAsDataURL(oFile);
                }
            },

            ReadEmployeeDocument: async function () {
                try {
                    this.getBusyDialog();
                    const oData = await this.ajaxReadWithJQuery("EmployeeDocument", { EmployeeID: this.EmployeeID });
                    const offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    const wrappedData = {
                        items: offerData
                    };
                    this.getOwnerComponent().setModel(new JSONModel(wrappedData), "DocumentModel");
                    this.closeBusyDialog();
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                    this.closeBusyDialog();
                }
            },

            onDeleteFiles: function () {
                var that = this;
                this.showConfirmationDialog(
                    that.i18nModel.getText("msgBoxConfirm"),
                    that.i18nModel.getText("msgBoxConfirmDelete"),
                    async function () {
                        that.getBusyDialog();
                        const ID = that.byId("table-uploadSet").getSelectedItem().getBindingContext("DocumentModel").getProperty("ID");
                        try {
                            await that.ajaxDeleteWithJQuery("/EmployeeDocument", {
                                filters: { ID: ID }
                            });
                            MessageToast.show(that.i18nModel.getText("DocumentDeleteSuccess"));
                            that.ReadEmployeeDocument();
                            that.byId("downloadSelectedButton").setEnabled(false);
                            that.byId("DeleteSelectedButton").setEnabled(false);
                        } catch (error) {
                            MessageToast.show(that.i18nModel.getText("DocumentDeleteError"));
                        } finally {
                            that.closeBusyDialog();
                        }
                    },
                    function () {
                        that.byId("table-uploadSet").removeSelections(true)
                        that.byId("downloadSelectedButton").setEnabled(false);
                        that.byId("DeleteSelectedButton").setEnabled(false);
                    })
            },

            onSelectionChange: function (oEvent) {
                this.byId("downloadSelectedButton").setEnabled(true);
                this.byId("DeleteSelectedButton").setEnabled(true);
            },

            onDownloadFiles: function (oEvent) {
                const oTable = this.byId("table-uploadSet");
                const oContexts = oTable.getSelectedContexts();
                if (oContexts && oContexts.length) {
                    oContexts.forEach((oContext) => {
                        const oData = oContext.getObject();
                        const base64Data = oData.File; // Assuming base64 is in 'content'
                        const mimeType = oData.FileType || "image/png"; // Default fallback
                        const fileName = oData.FileName || "downloaded_image.png";

                        // Create a blob and download
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], {
                            type: mimeType
                        });
                        // Trigger download
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        this.byId("downloadSelectedButton").setEnabled(false);
                        this.byId("DeleteSelectedButton").setEnabled(false);
                        this.byId("table-uploadSet").removeSelections(true);
                    });
                }
            },

            openPreviewDocument: function (oEvent) {
                const oContext = oEvent.getSource().getBindingContext("DocumentModel");
                const oData = oContext.getObject();
                const sMimeType = oData.FileType || "image/png";
                const sBase64 = oData.File;
                const sFileName = "Document Preview";
                if (!this._oPreviewDialog) {
                    this._oPreviewDialog = new sap.m.Dialog({
                        title: sFileName,
                        contentWidth: "50%",
                        contentHeight: "auto",
                        resizable: true,
                        draggable: true,
                        content: [],
                        endButton: new sap.m.Button({
                            text: "Close",
                            type :"Reject",
                            press: function () {
                                if (this._pdfBlobUrl) {
                                    URL.revokeObjectURL(this._pdfBlobUrl);
                                    this._pdfBlobUrl = null;
                                }
                                this._oPreviewDialog.close();
                            }.bind(this)
                        })
                    });
                    this.getView().addDependent(this._oPreviewDialog);
                }
                this._oPreviewDialog.removeAllContent();
                if (sMimeType.startsWith("image/")) {
                    const sFileUri = `data:${sMimeType};base64,${sBase64}`;
                    const oImage = new sap.m.Image({
                        src: sFileUri,
                        densityAware: false
                    });
                    oImage.addStyleClass("imagePreviewFit");
                    this._oPreviewDialog.addContent(oImage);
                } else if (sMimeType === "application/pdf") {
                    // Convert base64 to Blob
                    const byteCharacters = atob(sBase64);
                    const byteArrays = [];
                    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                        const slice = byteCharacters.slice(offset, offset + 512);
                        const byteNumbers = new Array(slice.length);
                        for (let i = 0; i < slice.length; i++) {
                            byteNumbers[i] = slice.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        byteArrays.push(byteArray);
                    }
                    const blob = new Blob(byteArrays, { type: sMimeType });
                    const sBlobUrl = URL.createObjectURL(blob);
                    this._pdfBlobUrl = sBlobUrl;
                    this._oPreviewDialog.addContent(new sap.ui.core.HTML({
                        content: `<iframe src="${sBlobUrl}" width="100%" height="600px" style="border:none;"></iframe>`
                    }));
                } else {
                    this._oPreviewDialog.addContent(new sap.m.Text({
                        text: "Preview not supported."
                    }));
                }
                this._oPreviewDialog.open();
            },

            onFileSizeExceeds: function () {
                MessageToast.show(this.i18nModel.getText("uploadDocSize"));
            },

            onPressSetPhoto: function () {
                this.onAfterRendering();
                var oModel = new JSONModel({
                    "name": ""
                });
                this.getView().setModel(oModel, "IdCardModel");
                this.SS_commonOpenDialog("SetProfile", "sap.kt.com.minihrsolution.fragment.AddIdCard", []);
            },

            IC_onPressClose: function () {
                this.SetProfile.close();
            },

            IC_onPressOpenCamera: function () {
                if (!this.oCameraDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.Camera",
                        controller: this,
                    }).then(
                        function (oDialog) {
                            this.oCameraDialog = oDialog;
                            this.getView().addDependent(this.oCameraDialog);
                            this.oCameraDialog.attachAfterOpen(this._StartCamera.bind(this));
                            this.oCameraDialog.attachAfterClose(this._StopCamera.bind(this));
                            this.oCameraDialog.open();
                        }.bind(this)
                    );
                } else {
                    this.oCameraDialog.open();
                }
            },
            _StartCamera: function () {
                var oVideo = document.getElementById("video");
                if (!oVideo) return;
                navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
                    oVideo.srcObject = stream;
                    oVideo.play();
                    this._cameraStream = stream;
                }.bind(this))
                    .catch(function (err) {
                        MessageToast.show("Camera access denied");
                    });
            },

            _StopCamera: function () {
                if (this._cameraStream) {
                    this._cameraStream.getTracks().forEach(function (track) {
                        track.stop();
                    });
                    this._cameraStream = null;
                }
                var oVideo = document.getElementById("video");
                if (oVideo) oVideo.srcObject = null;
            },

            IC_onCapturePress: function () {
                var oCanvas = document.getElementById("canvas");
                var oVideo = document.getElementById("video");
                if (!oCanvas || !oVideo || oVideo.readyState < oVideo.HAVE_CURRENT_DATA) return
                var oContext = oCanvas.getContext("2d", {
                    willReadFrequently: true
                });
                if (!oContext) return
                oCanvas.width = oVideo.videoWidth;
                oCanvas.height = oVideo.videoHeight;
                oContext.drawImage(oVideo, 0, 0, oCanvas.width, oCanvas.height);
                var base64Image = oCanvas.toDataURL("image/png");
                var mimeType = base64Image.substring(5, base64Image.indexOf(";"));
                var imageName = "captured_image.png";
                base64Image = base64Image.replace(
                    "data:" + mimeType + ";base64,", "");
                var oModel = this.getView().getModel("IdCardModel");
                oModel.setProperty("/Attachment", base64Image);
                oModel.setProperty("/mimeType", mimeType);
                oModel.setProperty("/name", imageName);
                oModel.setProperty("/capturedImage", base64Image);
                oModel.setProperty("/capturedImageName", imageName);
                this.getView().getModel("IdCardModel").setProperty("/name", "");
                this._StopCamera();
                this.oCameraDialog.close();
            },

            IC_onPressCloseCameraDialog: function () {
                this._StopCamera();
                if (this.oCameraDialog) {
                    this.oCameraDialog.close();
                }
            },

            IC_onHandleUploadPress: function (oEvent) {
                var oFileUploader = oEvent.getSource();
                var oFile = oFileUploader.oFileUpload.files[0];
                if (!oFile) {
                    return MessageToast.show("No file selected.");
                }
                var validMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
                var validExtensions = ["jpg", "jpeg", "png"];
                var fileName = oFile.name.toLowerCase();
                var fileExtension = fileName.split(".").pop();
                if (
                    !validMimeTypes.includes(oFile.type) &&
                    !validExtensions.includes(fileExtension)
                ) {
                    MessageToast.show("Invalid file type.");
                    oFileUploader.clear();
                    return;
                }
                if (oFile.size > 5 * 1024 * 1024) { // 5MB = 5 * 1024 * 1024 bytes
                    MessageToast.show("File size exceeds the limit of 5 MB.");
                    oFileUploader.clear();
                    return;
                }
                var oReader = new FileReader();
                oReader.onload = function (e) {
                    var sFileBinary = e.target.result.split(",")[1];
                    var oModel = this.getView().getModel("IdCardModel");
                    if (oModel) {
                        oModel.setProperty("/Attachment", sFileBinary);
                        oModel.setProperty("/name", oFile.name);
                        oModel.setProperty("/mimeType", oFile.type);
                        this.onPressDisplayImageOnCanvas(sFileBinary, oFile.type);
                        this.getView().getModel("IdCardModel").setProperty("/name", oFile.name);
                    }
                    oFileUploader.clear();
                }.bind(this);
                oReader.readAsDataURL(oFile);
            },

            onPressDisplayImageOnCanvas: function (sFileBinary, sFileType) {
                var canvas = document.getElementById("canvas");
                if (canvas) {
                    var context = canvas.getContext("2d");
                    var img = new Image();
                    img.onload = function () {
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                    img.src = "data:" + sFileType + ";base64," + sFileBinary;
                }
            },

            IC_onPressSave: async function () {
                try {
                    var Attchement = this.getView().getModel("IdCardModel");
                    var Employee = this.getView().getModel("sEmployeeModel").getData()[0];
                    var oPayload = {
                        data: {
                            "ProfilePhoto": Attchement.getProperty("/Attachment"),
                            "ProfilePhotoType": Attchement.getProperty("/mimeType"),
                        },
                        filters: { ID: Employee.ID }
                    };
                    if (!oPayload.data.ProfilePhoto && !oPayload.data.ProfilePhotoType) {
                        MessageToast.show(this.i18nModel.getText("selectImage"));
                        return;
                    }
                    this.getBusyDialog();
                    // Await the ajax call directly
                    var oData = await this.ajaxUpdateWithJQuery("EmployeeDetails", oPayload);
                    if (oData.success) {
                        await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", {
                            EmployeeID: this.EmployeeID
                        });
                        this.SetProfile.close();
                        MessageToast.show(this.i18nModel.getText("setProfile"));
                    } else {
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    }
                } catch (oError) {
                    MessageToast.show(oError.responseText);
                } finally {
                    this.closeBusyDialog();
                }
            },
            onAfterRendering: function () {
                var canvasElement = document.getElementById("canvas");
                if (canvasElement) {
                    var context = canvasElement.getContext("2d");
                    if (context) {
                        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
                    }
                }
            },

            saveEducationDetails: async function (bIsCreate) {
                try {
                    const isValid = utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEd_id_College"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEd_id_StartEdu"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEd_id_EndEdu"), "ID") && utils._LCvalidateGrade(sap.ui.getCore().byId("AddEd_id_Grade"), "ID", "AddEd_id_GradeType");
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    this.getBusyDialog();
                    // Prepare model data
                    let oModel = this.getView().getModel("educationModel").getData();
                    oModel.EmployeeID = this.EmployeeID;
                    oModel.DegreeName = sap.ui.getCore().byId("AddEd_id_Degree").getSelectedKey() || "";
                    oModel.GradeType = sap.ui.getCore().byId("AddEd_id_GradeType").getSelectedKey() || "";

                    let startDate = sap.ui.getCore().byId("AddEd_id_StartEdu").getValue();
                    let endDate = sap.ui.getCore().byId("AddEd_id_EndEdu").getValue();
                    oModel.EducationStartDate = startDate ? startDate.split("/").reverse().join('-') : "";
                    oModel.EducationEndDate = endDate ? endDate.split("/").reverse().join('-') : "";

                    let oPayload, sSuccessMessage, oResponse;
                    if (bIsCreate) {
                        oPayload = {
                            tableName: "EducationalDetails",
                            data: oModel
                        };
                        sSuccessMessage = this.i18nModel.getText("eduDataSaved");
                        oResponse = await this.ajaxCreateWithJQuery("EducationalDetails", oPayload);
                    } else {
                        oPayload = {
                            data: oModel,
                            filters: { ID: oModel.ID }
                        };
                        sSuccessMessage = this.i18nModel.getText("eduDataupdate");
                        oResponse = await this.ajaxUpdateWithJQuery("EducationalDetails", oPayload);
                    }
                    if (oResponse.success) {
                        MessageToast.show(sSuccessMessage);
                        this.SEd_oDialog.close();
                        this.byId("EdF_id_EduTable").removeSelections(true);
                        this.SS_commonEduFunction();
                        await this._fetchCommonData("EducationalDetails", "sEducationModel", {
                            EmployeeID: this.EmployeeID
                        });
                        this.closeBusyDialog();
                    } else {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    }
                } catch (error) {
                    this.closeBusyDialog();
                    const errorMessage = error?.responseText || error.message || "Unexpected error";
                    MessageToast.show(errorMessage);
                }
            },
            AddEd_onSubmitEdDetails: function () {
                this.saveEducationDetails(true); // create mode
            },
            AddEd_onUpdateEdDetails: function () {
                this.saveEducationDetails(false); // update mode
            },

            //Employment detail create calls
            saveEmploymentDetails: function (bIsCreate) {
                try {
                    // this.getBusyDialog();
                    const isValid = utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_Company"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_Desig"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_OfcAddress"), "ID") &&
                        utils._LCvalidateDate(sap.ui.getCore().byId("AddEmp_id_StartDate"), "ID") &&
                        utils._LCvalidateDate(sap.ui.getCore().byId("AddEmp_id_EndDate"), "ID")
                    if (!isValid) {
                        //.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    // Optional Fields Validation
                    const name = sap.ui.getCore().byId("AdEmp_id_RCNameI").getValue().trim();
                    const mail = sap.ui.getCore().byId("AdEmp_id_RCMailI").getValue().trim();
                    const mobileNo = sap.ui.getCore().byId("AdEmp_id_RCMobileI").getValue().trim();
                    const nameTwo = sap.ui.getCore().byId("AdEmp_id_RCNameII").getValue().trim();
                    const mailTwo = sap.ui.getCore().byId("AdEmp_id_RCMailII").getValue().trim();
                    const mobileNoTwo = sap.ui.getCore().byId("AdEmp_id_RCMobileII").getValue().trim();
                    const optionalValid =
                        (name === "" || utils._LCvalidateName(sap.ui.getCore().byId("AdEmp_id_RCNameI"), "ID")) &&
                        (mail === "" || utils._LCvalidateEmail(sap.ui.getCore().byId("AdEmp_id_RCMailI"), "ID")) &&
                        (mobileNo === "" || utils._LCvalidateMobileNumber(sap.ui.getCore().byId("AdEmp_id_RCMobileI"), "ID")) &&
                        (nameTwo === "" || utils._LCvalidateName(sap.ui.getCore().byId("AdEmp_id_RCNameII"), "ID")) &&
                        (mailTwo === "" || utils._LCvalidateEmail(sap.ui.getCore().byId("AdEmp_id_RCMailII"), "ID")) &&
                        (mobileNoTwo === "" || utils._LCvalidateMobileNumber(sap.ui.getCore().byId("AdEmp_id_RCMobileII"), "ID"))
                    if (!optionalValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    this.getBusyDialog();
                    // Prepare data model for submission
                    let oModel = this.getView().getModel("employmentModel").getData();
                    oModel.EmployeeID = this.EmployeeID;
                    oModel.Designation = sap.ui.getCore().byId("AddEmp_id_Desig").getValue();
                    oModel.RCISal = sap.ui.getCore().byId("AddEmp_id_SalI").getSelectedKey() || "";
                    oModel.RCIISal = sap.ui.getCore().byId("AdEmp_id_RCSalII").getSelectedKey() || "";
                    oModel.StartDate = sap.ui.getCore().byId("AddEmp_id_StartDate").getValue().split("/").reverse().join('-');
                    oModel.EndDate = sap.ui.getCore().byId("AddEmp_id_EndDate").getValue().split("/").reverse().join('-');

                    let oPayload;
                    let fnCall;
                    let sSuccessMessage;
                    if (bIsCreate) {
                        oPayload = {
                            "tableName": "EmploymentDetails",
                            "data": oModel
                        };
                        fnCall = this.ajaxCreateWithJQuery("EmploymentDetails", oPayload);
                        sSuccessMessage = this.i18nModel.getText("empDataSaved");
                        sap.ui.getCore().byId("AdEmp_id_RCNameI").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCMailI").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCMobileI").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCNameII").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCMailII").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCMobileII").setValueState("None");
                    } else {
                        oPayload = {
                            "data": oModel,
                            "filters": {
                                "ID": oModel.ID
                            }
                        };
                        fnCall = this.ajaxUpdateWithJQuery("EmploymentDetails", oPayload);
                        sSuccessMessage = this.i18nModel.getText("empDataupdate");
                        sap.ui.getCore().byId("AdEmp_id_RCNameI").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCMailI").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCMobileI").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCNameII").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCMailII").setValueState("None");
                        sap.ui.getCore().byId("AdEmp_id_RCMobileII").setValueState("None");
                    }
                    fnCall.then((oData) => {
                        this.closeBusyDialog();
                        if (oData.success) {
                            MessageToast.show(sSuccessMessage);
                            this.SEmp_oDialog.close();
                            this.byId("EmpF_id_EmpTable").removeSelections(true);
                            this.SS_commonEmpFunction();
                            this._fetchCommonData("EmploymentDetails", "sEmploymentModel", {
                                EmployeeID: this.EmployeeID
                            });
                            this.closeBusyDialog();
                        } else {
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                            this.closeBusyDialog();
                        }
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.responseText);
                    });

                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.responseText);
                }
            },

            AddEmp_onSubmitEmpDetails: function () {
                this.saveEmploymentDetails(true); // create mode
            },

            AddEmp_onUpdateEmpDetails: function () {
                this.saveEmploymentDetails(false); // update mode
            },

            //Reference details
            EmpF_onReferenceDetails: function () {
                var that = this;
                var oTable = this.byId("EmpF_id_EmpTable");
                var aSelectedContexts = oTable.getSelectedContexts();
                if (aSelectedContexts.length === 0) {
                    sap.m.MessageToast.show(that.i18nModel.getText("selectRowToEdit")); // Using i18n for message text
                    return;
                }
                var dataModel = aSelectedContexts[0].getObject();
                // Check if at least one reference set is available
                var referenceDetailsExist =
                    (dataModel.RCISal && dataModel.RCIName && dataModel.RCIAddress && dataModel.RCIEmailID && dataModel.RCIMobileNo) ||
                    (dataModel.RCIISal && dataModel.RCIIName && dataModel.RCIIAddress && dataModel.RCIIEmailID && dataModel.RCIIMobileNo);
                if (!referenceDetailsExist) {
                    sap.m.MessageToast.show(that.i18nModel.getText("noReferenceDetails")); // Using i18n for warning message
                    return;
                }
                var formattedReferenceData = `<div style="padding-left: 15px; padding-right: 15px;">`;
                // Add first reference if available
                if (dataModel.RCISal && dataModel.RCIName && dataModel.RCIAddress && dataModel.RCIEmailID && dataModel.RCIMobileNo) {
                    formattedReferenceData += `
                    <p><b>${that.i18nModel.getText("name")}:</b> ${dataModel.RCISal} ${dataModel.RCIName}</p>
                    <p><b>${that.i18nModel.getText("address")}:</b> ${dataModel.RCIAddress}</p>
                    <p><b>${that.i18nModel.getText("emailId")}:</b> ${dataModel.RCIEmailID}</p>
                    <p><b>${that.i18nModel.getText("mobileNo")}:</b> ${dataModel.RCIMobileNo}</p>
                    <br/>`;
                }
                // Add second reference if available
                if (dataModel.RCIISal && dataModel.RCIIName && dataModel.RCIIAddress && dataModel.RCIIEmailID && dataModel.RCIIMobileNo) {
                    formattedReferenceData += `
                    <p><b>${that.i18nModel.getText("name")}:</b> ${dataModel.RCIISal} ${dataModel.RCIIName}</p>
                    <p><b>${that.i18nModel.getText("address")}:</b> ${dataModel.RCIIAddress}</p>
                    <p><b>${that.i18nModel.getText("emailId")}:</b> ${dataModel.RCIIEmailID}</p>
                    <p><b>${that.i18nModel.getText("mobileNo")}:</b> ${dataModel.RCIIMobileNo}</p>`;
                }
                formattedReferenceData += `</div>`;

                // Create a dialog to display the reference details
                var oDialog = new sap.m.Dialog({
                    title: that.i18nModel.getText("referenceDetails"),
                    draggable: false,
                    resizable: false,
                    contentWidth: "500px",
                    contentHeight: "400px",
                    verticalScrolling: true,
                    content: new sap.ui.core.HTML({
                        content: formattedReferenceData
                    }),
                    beginButton: new sap.m.Button({
                        text: that.i18nModel.getText("close"),
                        type: "Reject",
                        press: function () {
                            oDialog.close();
                            oTable.removeSelections(true);
                        }
                    })
                });
                oDialog.open();
            },

            // Function to display salary panels and handle Appraisal button logic

            SS_readSalaryDetails: async function (filter) {
                try {
                    this.getBusyDialog();
                    const oData = await this.ajaxReadWithJQuery("SalaryDetails", {
                        EmployeeID: this.EmployeeID
                    });
                    const offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "salaryData");
                    this.displaySalaryPanels(offerData);
                    this.closeBusyDialog();
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                    this.closeBusyDialog();
                }
            },

            // Function to display salary data in UI panels
            displaySalaryPanels: function (salaryDetailsArray) {
                var nextMonthDate = this.getView().getModel("controller").getProperty("/nextMonthMinDate");
                var AppraisalModel = new JSONModel({
                    CtcPercentage: "",
                    VariablePay: "0",
                    TotalCTC: "0",
                    TotalVariablePay: "0",
                    EffectiveDate: nextMonthDate
                });
                this.getView().setModel(AppraisalModel, "AppraisalModel");
                var oVBox = this.byId("salaryVBox");
                oVBox.removeAllItems();
                var oToday = new Date();
                salaryDetailsArray.forEach((offerData, index) => {
                    var oEffectiveDate = new Date(offerData.EffectiveDate);
                    var isLastRecord = index === salaryDetailsArray.length - 1;
                    var sTitleText = isLastRecord
                        ? `${this.i18nModel.getText("salaryEffectiveDate")}: ${this.Formatter.formatDate(offerData.EffectiveDate || "")}, ${this.i18nModel.getText("salaryYearlyGross")}: ${this.i18nModel.getText("salaryINR")} ${this.Formatter.fromatNumber(offerData.GrossPay)}`
                        : `${this.i18nModel.getText("salaryAppraisalDate")}: ${this.Formatter.formatDate(offerData.AppraisalDate)}, ${this.i18nModel.getText("salaryEffectiveDate")}: ${this.Formatter.formatDate(offerData.EffectiveDate || "")}, ${this.i18nModel.getText("salaryYearlyGross")}: ${this.i18nModel.getText("salaryINR")} ${this.Formatter.fromatNumber(offerData.GrossPay)}`;
                    var oTitleText = new sap.m.Text({
                        text: sTitleText,
                        wrapping: true
                    }).addStyleClass("sapUiTinyMarginBottom");

                    var aButtonContent = [];
                    // Delete button
                    if (salaryDetailsArray.length > 1 && oEffectiveDate > oToday && this.sPath !== "SelfService") {
                        var oDeleteButton = new sap.m.Button({
                            text: this.i18nModel.getText("delete"),
                            type: "Reject",
                            press: function () {
                                this.onDeleteSalary(offerData);
                            }.bind(this)
                        }).addStyleClass("sapUiTinyMarginBegin");
                        aButtonContent.push(oDeleteButton);
                    }
                    // Appraisal button
                    if (index === 0 && oEffectiveDate < oToday && this.sPath !== "SelfService") {
                        var oAppraisalButton = new sap.m.Button({
                            text: this.i18nModel.getText("appraisal"),
                            type: "Emphasized",
                            //visible: this.ViewModel.getProperty("/RelievingLetter"),
                            press: function () {
                                this._fetchCommonData("TaxCalculation", "TDSModel", { Country: this.getView().getModel("sEmployeeModel").getData()[0].CountryCode });
                                this.SS_commonOpenDialog("Appraisal", "sap.kt.com.minihrsolution.fragment.Appraisal", ["SS_id_Joinn"]);
                                setTimeout(() => {
                                    this.onAppraisalDialogReady(offerData);
                                }, 300);
                            }.bind(this)
                        }).addStyleClass("sapUiTinyMarginBegin");
                        aButtonContent.push(oAppraisalButton);
                    }
                    var oButtonBox = new sap.m.HBox({
                        items: aButtonContent,
                        alignItems: "Center",
                        justifyContent: "End",
                        wrap: "Wrap"
                    });
                    var oHeaderBox = new sap.m.HBox({
                        items: [oTitleText, oButtonBox],
                        justifyContent: "SpaceBetween",
                        alignItems: "Center",
                        width: "100%"
                    });
                    var oPanel = new sap.m.Panel({
                        expandable: true,
                        expanded: true,
                        headerToolbar: new sap.m.Toolbar({ content: [oHeaderBox] })
                    });
                    oPanel.addStyleClass("sapUiSmallMarginBottom");
                    var oFragModel = new sap.ui.model.json.JSONModel(offerData);
                    oPanel.setModel(oFragModel, "salaryData");
                    var oFragment = sap.ui.xmlfragment(
                        this.getView().getId(),
                        "sap.kt.com.minihrsolution.fragment.SalaryDisplay",
                        this
                    );
                    oPanel.addContent(oFragment);
                    oVBox.addItem(oPanel);
                });
            },

            // Function to initialize dialog values
            onAppraisalDialogReady: function (latestSalaryData) {
                const AppraisalModel = this.getView().getModel("AppraisalModel");
                const lastCTC = parseFloat(latestSalaryData.CTC?.toString().replaceAll(",", "")) || 0;
                const lastVariablePay = parseFloat(latestSalaryData.VariablePay) || 0;

                AppraisalModel.setProperty("/PreviousGrossPay", this.Formatter.fromatNumber(lastCTC));
                AppraisalModel.setProperty("/PreviousVariablePay", this.Formatter.fromatNumber(lastVariablePay));
                const EmployeePF = parseFloat(latestSalaryData.EmployeePF) || 0;
                const EmployerPF = parseFloat(latestSalaryData.EmployerPF) || 0;
                const oRadioGroup = sap.ui.getCore().byId("AF_id_RadioButTds");
                const oTDSRadio = sap.ui.getCore().byId("AF_id_TDSRadio");
                const oPFRadio = oRadioGroup.getButtons()[1];

                if (!oRadioGroup || !oTDSRadio || !oPFRadio) return;

                // Check if both PF values exist
                if (EmployeePF > 0 && EmployerPF > 0) {
                    oRadioGroup.setVisible(false); // Hide entire radio button group
                    oRadioGroup.setSelectedIndex(1);
                } else {
                    oRadioGroup.setVisible(true); // Show the radio button group when PF is not applicable
                    oRadioGroup.setSelectedIndex(0);
                }
            },

            onPressAppraisalClose: function () {
                sap.ui.getCore().byId("AF_id_CTC").setValue("")
                sap.ui.getCore().byId("AF_idTextCTC").setText("")
                sap.ui.getCore().byId("AE_idTextVP").setText("")
                sap.ui.getCore().byId("AF_id_CTC").setValueState("None");
                sap.ui.getCore().byId("AF_id_VariablePay").setValueState("None")
                this.Appraisal.close();
            },

            onDeleteSalary: function (value) {
                this.showConfirmationDialog(
                    this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("appraisalDeleteMess"),
                    async function () {
                        this.getBusyDialog(); // Show busy dialog                  
                        try {
                            await this.ajaxDeleteWithJQuery("/SalaryDetails", {
                                filters: { UUID: value.UUID, EmployeeID: value.EmployeeID }
                            });
                            MessageToast.show(this.i18nModel.getText("appraisalDeleteMessageSucc"));
                            this.SS_readSalaryDetails();
                        } catch (error) {
                            MessageToast.show(this.i18nModel.getText("DocumentDeleteError") || "Error deleting document.");
                        } finally {
                            this.closeBusyDialog(); // Ensure the busy dialog is always closed
                        }
                    }.bind(this) // Important: bind 'this' to maintain context
                );
            },

            EOD_validateAmount: function (oEvent) {
                var CTCType = sap.ui.getCore().byId("ED_Frg_idAppraisalType")._getSelectedItemText();
                if (CTCType === 'Percentage') {
                    utils._LCvalidateTraineeAmount(oEvent);
                } else {
                    utils._LCvalidateCTC(oEvent);
                }
                this.CommonCalculation();
            },

            CommonCalculation: async function () {
                var AppraisalModel = this.getView().getModel("AppraisalModel");
                var salaryData = this.getView().getModel("salaryData").getData();

                var oSelect = sap.ui.getCore().byId("ED_Frg_idAppraisalType");
                var CTCType = oSelect.getSelectedItem().getText(); // 'CTC' or 'Percentage'

                this.latest = salaryData.reduce(function (latestEntry, currentEntry) {
                    return new Date(currentEntry.EffectiveDate) > new Date(latestEntry.EffectiveDate) ? currentEntry : latestEntry;
                });

                var ctcPercentage = parseFloat(AppraisalModel.getProperty("/CtcPercentage")) || 0;

                // Safely remove commas and parse CTC
                var baseCTC = parseFloat((this.latest.CTC || "0").toString().replace(/,/g, "")) || 0;

                // Calculate the increment amount
                var CtcCalculate = baseCTC * ctcPercentage / 100;

                // Calculate the new CTC based on the CTCType
                var NewCTC = (CTCType === "Percentage")
                    ? baseCTC + CtcCalculate
                    : baseCTC + ctcPercentage;

                this.getView().getModel("employeeModel").setProperty("/CTC", this.Formatter.fromatNumber(NewCTC));
                this.getView().getModel("employeeModel").setProperty("/JoiningBonus", this.Formatter.fromatNumber(0));
                var type = sap.ui.getCore().byId("AF_id_RadioButTds").getSelectedButton().getText();
                var variablePay = AppraisalModel.getProperty("/VariablePay");
                this.getView().getModel("employeeModel").setProperty("/VariablePercentage", variablePay);
                this._calculateSalaryComponents(type);
                AppraisalModel.setProperty("/TotalCTC", this.Formatter.fromatNumber(NewCTC));
                AppraisalModel.setProperty("/TotalVariablePay", this.Formatter.fromatNumber(this.getView().getModel("employeeModel").getData().VariablePay));
            },
            EOD_validatevariable: function (oEvent) {
                utils._LCvalidateVariablePay(oEvent);
                this.CommonCalculation();
            },

            createAppraisalPayload: function () {
                var employeeData = this.getView().getModel("employeeModel").getData();
                var appraisalData = this.getView().getModel("AppraisalModel").getData();
                const year = appraisalData.EffectiveDate.getFullYear();
                const month = String(appraisalData.EffectiveDate.getMonth() + 1).padStart(2, '0');
                return {
                    data: {
                        EmployeeID: this.EmployeeID,
                        JoiningDate: this.latest.JoiningDate || "",
                        CTC: employeeData.CTC,
                        EmploymentBond: employeeData.EmploymentBond || false,
                        JoiningBonus: employeeData.JoiningBonus,
                        BaseLocation: this.latest.BaseLocation,
                        BasicSalary: employeeData.BasicSalary,
                        HRA: employeeData.HRA,
                        IncomeTax: employeeData.IncomeTax,
                        MedicalInsurance: employeeData.MedicalInsurance,
                        Gratuity: employeeData.Gratuity,
                        VariablePay: employeeData.VariablePay,
                        CostofCompany: employeeData.CostofCompany,
                        Total: employeeData.Total,
                        HikePercentage: appraisalData.CtcPercentage,
                        AppraisalDate: new Date().toISOString().split('T')[0] || "",
                        EffectiveDate: `${year}-${month}-01`,
                        EmployeePF: employeeData.EmployeePF,
                        EmployerPF: employeeData.EmployerPF,
                        TotalDeduction: employeeData.TotalDeduction,
                        SpecailAllowance: employeeData.SpecailAllowance,
                        PT: employeeData.PT,
                        GrossPay: employeeData.GrossPay,
                        VariablePercentage: employeeData.VariablePercentage,
                        GrossPayMontly: employeeData.GrossPayMontly
                    }
                };
            },

            onSelectChange: function (oEvent) {
                // Validate CTC based on selected type      
                oEvent.getSource().getSelectedItem().getText() === "Percentage" ? utils._LCvalidateTraineeAmount(sap.ui.getCore().byId("AF_id_CTC"), "ID")
                    : utils._LCvalidateAmount(sap.ui.getCore().byId("AF_id_CTC"), "ID");
            },

            onPressAppraisalSave: async function () {
                await this.CommonCalculation();
                var oSelect = sap.ui.getCore().byId("ED_Frg_idAppraisalType");
                var CTCType = oSelect.getSelectedItem().getText();

                var isCTCValid = CTCType === "Percentage"
                    ? utils._LCvalidateTraineeAmount(sap.ui.getCore().byId("AF_id_CTC"), "ID")
                    : utils._LCvalidateAmount(sap.ui.getCore().byId("AF_id_CTC"), "ID");

                var isVariablePayValid = utils._LCvalidateVariablePay(sap.ui.getCore().byId("AF_id_VariablePay"), "ID");
                if (isCTCValid && isVariablePayValid) {
                    this.getBusyDialog();
                    try {
                        var oPayload = this.createAppraisalPayload();
                        await this.ajaxCreateWithJQuery("SalaryDetails", oPayload);
                        await this.SS_readSalaryDetails();

                        MessageToast.show(this.i18nModel.getText("appraisalSaved"));
                        sap.ui.getCore().byId("EOUF_id_CTCPercentage").setValueState("None");
                        this.Appraisal.close();
                    } catch (err) {
                        console.error("Appraisal save failed:", err);
                        this.Appraisal.close();
                    } finally {
                        this.closeBusyDialog();
                    }
                } else {
                    sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            SS_onBaseLocationChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
                this.handleBaseLocationChange(
                    oEvent,
                    "BaseLocationModel",         // Source model
                    "sEmployeeModel",     // Target model
                    "/0/BranchCode"                // Path in target model
                );
                this._LCstrictValidationComboBox()
            },
            //  download Visiting Card
            onDownloadVisitCard: function () {
                var oEmployeeData = this.getView().getModel("sEmployeeModel").getData();
                if (oEmployeeData) {
                    this.CommonVisitingCard(oEmployeeData[0].EmployeeName, oEmployeeData[0].MobileNo, oEmployeeData[0].CompanyEmailID,
                        oEmployeeData[0].Designation, oEmployeeData[0].BranchCode);
                }
            },
            SS_onDownloadExperienceLetter: function () {
                this.getView().getModel("PDFData").setProperty("/OnlyRTEFlag", true);
                var oEmpModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var today = new Date();
                var date = Formatter.formatDate(today);
                var twoMonthsLater = new Date(today.setMonth(today.getMonth() + 2));
                var relievingDate = Formatter.formatDate(twoMonthsLater);
                var joiningDate = Formatter.formatDate(oEmpModel.JoiningDate);
                var empName = oEmpModel.Salutation + " " + oEmpModel.EmployeeName;
                var empID = oEmpModel.EmployeeID;
                var empDesig = oEmpModel.Designation;
                this.getView().getModel("PDFData").setProperty("/CreateDate", date);
                this.getView().getModel("PDFData").setProperty("/CertificateTitle", "RELIEVING AND EXPERIENCE LETTER");
                var data = `
            <div style="text-align: justify;">
                <p> This is to certify that <b>${empName}</b> with Employee ID <b>${empID}</b> has worked with our company <b>${this.companyName}</b> as a <b>${empDesig}</b> from <b>${joiningDate}</b> to <b>${date}</b>. During his tenure with us his contributions to the organization are highly appreciated. He possesses good moral values and the right attitude</p> 
                <p>With reference to your resignation, you stand relieved from the services of ${this.companyName} with effect from the close of working hours <b>${relievingDate}</b>. We would like you to continue to be bound by the conditions of confidentiality and other relevant terms of the employment agreement you signed with ${this.companyName}</p>
                <p>Wishing you all the best in your future endeavors.</p>
            </div>`;
                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.SS_commonOpenDialog("SSRTE_oDialog", "sap.kt.com.minihrsolution.fragment.CommonRTE");
            },

            SS_onDownloadTerminateLetter: function () {
                this.getView().getModel("PDFData").setProperty("/OnlyRTEFlag", true);
                var oEmpModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var date = Formatter.formatDate(new Date());
                var empName = oEmpModel.Salutation + " " + oEmpModel.EmployeeName;
                var empDesig = oEmpModel.Designation;
                this.getView().getModel("PDFData").setProperty("/CreateDate", date);
                this.getView().getModel("PDFData").setProperty("/CertificateTitle", "TERMINATION LETTER");
                var data = `
                <div style="text-align: justify;">
                    <p>This is to formally notify that <b>${empName}</b>, has been terminated from the services of <b>${this.companyName}</b> with effect from <b>${date}</b> due to reasons communicated during prior discussions. During their tenure as <b>${empDesig}</b>, we have reviewed the performance and discussed areas of concern in detail.</p> 
                    <p>Despite efforts to resolve these concerns, we find it necessary to discontinue the employment relationship effective immediately. Please ensure that all company assets and materials in your possession are returned by the specified date. You are reminded of your obligation to maintain confidentiality and abide by other terms of the employment agreement.</p>
                    <p>Kindly acknowledge the copy of the document for office records. We look forward to a fruitful association.</p>
                    <p>We wish you the best of luck in your future endeavors</p>
                </div>`;

                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.SS_commonOpenDialog("SSRTE_oDialog", "sap.kt.com.minihrsolution.fragment.CommonRTE");
            },

            SS_onDownloadWorkLetter: function () {
                this.getView().getModel("PDFData").setProperty("/OnlyRTEFlag", true);
                var oEmpModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var today = new Date();
                var date = Formatter.formatDate(today);
                var joiningDate = Formatter.formatDate(oEmpModel.JoiningDate);
                var empName = oEmpModel.Salutation + " " + oEmpModel.EmployeeName;
                var empDesig = oEmpModel.Designation;
                var empID = oEmpModel.EmployeeID;
                this.getView().getModel("PDFData").setProperty("/CreateDate", date);
                this.getView().getModel("PDFData").setProperty("/CertificateTitle", "WORK LETTER");
                var data = `
                <div style="text-align: justify;">
                    <p>This is to certify that <b>${empName}</b>, holding <b>${empID}</b>, was employed with <b>${this.companyName}</b> as a <b>${empDesig}</b> from <b>${joiningDate}</b> to <b>${date}</b> During their tenure with us, they exhibited a high level of professionalism, dedication, and a strong sense of responsibility towards assigned tasks. They consistently met project deadlines, and contributed positively to the success of the team.</p> 
                    <p>${empName} demonstrated sound technical knowledge and excellent interpersonal skills. Maintained good relationships with colleagues, clients, actively participated in various organizational activities.</p>
                    <p>We thank ${empName} for their services and wish them all the very best in their future endeavors.</p>
                </div>`;

                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.SS_commonOpenDialog("SSRTE_oDialog", "sap.kt.com.minihrsolution.fragment.CommonRTE");
            },

            SS_onDownloadSalLetter: function () {
                this.getView().getModel("PDFData").setProperty("/OnlyRTEFlag", false);
                var oEmpModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var today = new Date();
                var date = Formatter.formatDate(today);
                var joiningDate = Formatter.formatDate(oEmpModel.JoiningDate);
                var empID = oEmpModel.EmployeeID;
                var empDesig = oEmpModel.Designation;
                var department = oEmpModel.Department;
                var empName = oEmpModel.Salutation + " " + oEmpModel.EmployeeName;
                this.getView().getModel("PDFData").setProperty("/CreateDate", date);
                this.getView().getModel("PDFData").setProperty("/CertificateTitle", "SALARY CERTIFICATE");
                var data = `
                <div style="text-align: justify; font-family: Times;">
                    <p> This is to certify that <b>${empName}</b>, holding the position of <b>${empDesig}</b> with <b>${this.companyName}</b>, has been employed with us since <b>${joiningDate}</b>.</p>
                    <p> As of the date of this certificate, the details of their current salary structure are as follows: </p>
                </div>`;
                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.SS_commonOpenDialog("SSRTE_oDialog", "sap.kt.com.minihrsolution.fragment.CommonRTE");
            },

            FCR_onDownloadPDF: async function () {
                const empData = this.getView().getModel("sEmployeeModel").getData()[0];
                if (this.getView().getModel("PDFData").getProperty("/OnlyRTEFlag")) {
                    this.generateCertificatePDF(this.getView().getModel("PDFData").getProperty("/RTEText"), empData.BranchCode);
                }
                else {
                    try {
                        const empID = this.getView().getModel("sEmployeeModel").getData()[0].EmployeeID;
                        const salaryResponse = await this.ajaxReadWithJQuery("SalaryDetails", { EmployeeID: empID });
                        let latestSalary;
                        if (Array.isArray(salaryResponse.data)) {
                            const sortedSalaries = salaryResponse.data.sort((a, b) => new Date(a.EffectiveDate) - new Date(b.EffectiveDate));
                            latestSalary = sortedSalaries[sortedSalaries.length - 1];
                        } else {
                            latestSalary = salaryResponse.data;
                        }
                        var oPDFModel = this.getView().getModel("PDFData");
                        oPDFModel.setProperty("/YearlyComponents/0/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.Total));
                        oPDFModel.setProperty("/YearlyComponents/1/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.BasicSalary));
                        oPDFModel.setProperty("/YearlyComponents/2/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.HRA));
                        oPDFModel.setProperty("/YearlyComponents/3/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.EmployerPF));
                        oPDFModel.setProperty("/YearlyComponents/4/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.MedicalInsurance));
                        oPDFModel.setProperty("/YearlyComponents/5/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.Gratuity));
                        oPDFModel.setProperty("/Deductions/0/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.TotalDeduction));
                        oPDFModel.setProperty("/Deductions/1/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.IncomeTax));
                        oPDFModel.setProperty("/Deductions/2/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.EmployeePF));
                        oPDFModel.setProperty("/Deductions/3/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.PT));
                        oPDFModel.setProperty("/VariableComponents/0/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.VariablePay));
                        oPDFModel.setProperty("/GrossPay/0/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.GrossPay));
                        oPDFModel.setProperty("/GrossPay/1/Text", empData.Currency + " " + Formatter.fromatNumber(latestSalary.GrossPayMontly));
                        oPDFModel.setProperty("/EmpCTC", empData.Currency + " " + Formatter.fromatNumber(latestSalary.CostofCompany));
                    } catch (error) {
                        MessageToast.show("Failed to fetch salary data.");
                    }
                    this.SSRTE_oDialog.close();
                    var oModel = this.getView().getModel("PDFData").getData();
                    await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: this.getView().getModel("sEmployeeModel").getData()[0].BranchCode });
                    var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                    if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64) {
                        try {
                            const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
                            const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], { type: "image/png" });
                            const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });

                            const [logoBase64, signBase64, backgroundBase64] = await Promise.all([
                                this._convertBLOBToImage(logoBlob),
                                this._convertBLOBToImage(signBlob),
                                this._convertBLOBToImage(backgroundBlob)
                            ]);

                            oCompanyDetailsModel.companylogo64 = logoBase64;
                            oCompanyDetailsModel.signature64 = signBase64;
                            oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
                        } catch (err) {
                            console.error("Image compression failed:", err);
                            this.closeBusyDialog();
                        }
                    }
                    if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                        if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePDF === "function") {
                            jsPDF._GeneratePDF(this, sap.ui.getCore().byId("FCR_id_RTE").getValue(), oCompanyDetailsModel, oModel);
                        }
                    }
                }
            },

            FCR_onCloseDialog: function () {
                this.SSRTE_oDialog.close();
            },

            SS_onDownloadSpotAward: function () {
                var oView = this.getView();
                var resetFields = function () {
                    let aInputIds = ["FSA_id_nominatedName"];
                    aInputIds.forEach(function (sId) {
                        let oControl = sap.ui.getCore().byId(sId);
                        if (oControl) {
                            oControl.setValueState("None");
                            oControl.setValue("");
                        }
                        let oDatePicker = sap.ui.getCore().byId("FSA_id_Date");
                        if (oDatePicker) {
                            let oToday = this.Formatter.formatDate(new Date());
                            oDatePicker.setValue(oToday);
                        }
                    }.bind(this));
                }.bind(this);
                if (!this.oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.SpotAward",
                        controller: this
                    }).then(function (oDialog) {
                        this.oDialog = oDialog;
                        oView.addDependent(this.oDialog);
                        this.oDialog.attachAfterOpen(resetFields);
                        this.oDialog.open();
                    }.bind(this));
                } else {
                    resetFields();
                    this.oDialog.attachAfterOpen(resetFields);
                }
            },

            FSA_onPressSubmit: async function () {
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: this.getView().getModel("sEmployeeModel").getData()[0].BranchCode });
                var oComapnyModel = this.getView().getModel("CompanyCodeDetailsModel").getData()[0];
                var coImg = await this._convertBLOBToImage(new Blob([new Uint8Array(oComapnyModel.companylogo?.data)], { type: "image/png" }));
                const oEmpModel = this.getView().getModel("sEmployeeModel").getData();
                const oName = oEmpModel[0].EmployeeName;
                const oNominee = sap.ui.getCore().byId("FSA_id_nominatedName").getValue();
                const oDate = sap.ui.getCore().byId("FSA_id_Date").getValue();
                if (!oNominee || !oDate) {
                    sap.m.MessageToast.show("Please fill all required fields.");
                    return;
                }
                this.getBusyDialog();
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({
                    orientation: "landscape",
                    unit: "cm",
                    format: "a4"
                });

                doc.addFileToVFS(EBGaramond.filename, EBGaramond.base64);
                doc.addFont(EBGaramond.filename, EBGaramond.name, EBGaramond.style);

                doc.addFileToVFS(Allura.filename, Allura.base64);
                doc.addFont(Allura.filename, Allura.name, Allura.style);

                doc.addFileToVFS(Poppins.filename, Poppins.base64);
                doc.addFont(Poppins.filename, Poppins.name, Poppins.style);

                doc.addFileToVFS(Plight.filename, Plight.base64);
                doc.addFont(Plight.filename, Plight.name, Plight.style);

                const pageHeight = doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageMiddle = pageWidth / 2;

                // Add background image (base64)
                const imgData = this.getView().getModel("PDFData").getProperty("/DemoBase64");
                doc.addImage(imgData, 0, 0, pageWidth, pageHeight);

                doc.setFont(EBGaramond.name, EBGaramond.style);
                doc.setFontSize(37);
                doc.text("SPOT AWARD", pageMiddle, 4, { align: "center" });

                doc.setFont("helvetica", "normal");
                doc.setFontSize(20);
                doc.text("This certificate is proudly presented to", pageMiddle, 5.5, { align: "center" });

                doc.setFont(Allura.name, Allura.style);
                doc.setFontSize(45);
                doc.setTextColor(0, 0, 0);
                doc.text(oName, pageMiddle, 8.5, { align: "center" });
                // drawDottedLine(doc, 5.5, 9, pageWidth - 4);

                doc.setFont("times", "normal");
                doc.setFontSize(15);
                doc.text(".............................................................................................................................................", pageMiddle, 9.5, { align: "center" });
                doc.setFont("helvetica", "normal");
                doc.setFontSize(15);
                doc.text("Excellence in overcoming challenges and timely delivery of solution", pageMiddle, 10.5, { align: "center" });
                doc.text("in new technology areas.", pageMiddle, 11.5, { align: "center" });

                doc.setFont(Poppins.name, Poppins.style);
                doc.setFontSize(16);
                doc.text(oNominee, 7, 15, { align: "center" }); // left
                doc.setFont("times", "normal");
                doc.setFontSize(15);
                doc.text("...............................", 7, 15.5, { align: "center" });

                doc.setFont(Poppins.name, Poppins.style);
                doc.setFontSize(16);
                const formattedDate = sap.ui.core.format.DateFormat.getInstance({ pattern: "dd MMMM yyyy" }).format(sap.ui.core.format.DateFormat.getInstance({ pattern: "dd/MM/yyyy" }).parse(sap.ui.getCore().byId("FSA_id_Date").getValue()));
                doc.text(formattedDate, pageMiddle, 15, { align: "center" });
                doc.setFont("times", "normal");
                doc.setFontSize(15);
                doc.text("...............................", pageMiddle, 15.5, { align: "center" });

                doc.setFont(Poppins.name, Poppins.style);
                doc.setFontSize(16);
                doc.text(oComapnyModel.headOfCompany, pageWidth - 7, 15, { align: "center" }); // right
                doc.setFont("times", "normal");
                doc.setFontSize(15);
                doc.text("...............................", pageWidth - 7, 15.5, { align: "center" });
                // Labels
                doc.setFont(Plight.name, Plight.style);
                doc.setFontSize(12);
                doc.text("Nominated by", 7, 16, { align: "center" });
                // drawDottedLine(doc, 2, 15, 4);
                doc.text("Date", pageMiddle, 16, { align: "center" });
                // drawDottedLine(doc, pageMiddle - 1.2, 18.0, pageMiddle + 1.2);
                doc.text(oComapnyModel.designation, pageWidth - 7, 16, { align: "center" });
                // drawDottedLine(doc, pageWidth - 4, 18.0, pageWidth - 3.2);

                doc.addImage(coImg, pageWidth - 5, 0.1, 4, 4);
                doc.save("SpotAward_Certificate.pdf");
                this.closeBusyDialog();
            },

            FSA_onPressClose: function () {
                this.oDialog.close();
            },

            CC_onPressIdCardDetails: function () {
                var oView = this.getView();
                var oEmployeeModel = oView.getModel("sEmployeeModel");
                var employeeData = oEmployeeModel && oEmployeeModel.getData();
                var employeeDetails = employeeData && employeeData[0];

                if (!employeeDetails) {
                    sap.m.MessageToast.show("Employee details not found.");
                    return;
                }

                var oTextDisplayModel = oView.getModel("TextDisplay");
                if (oTextDisplayModel) {
                    oTextDisplayModel.setProperty("/name", "");
                }

                // Prepare ID card data
                var idCardJson = {
                    EmployeeID: employeeDetails.EmployeeID || "",
                    EmployeeName: employeeDetails.EmployeeName || "",
                    Designation: employeeDetails.Designation || "",
                    Email: employeeDetails.CompanyEmailID || "",
                    BloodGroup: employeeDetails.BloodGroup || "",
                    DOB: this.Formatter.formatDate(employeeDetails.DateOfBirth) || "",
                    MobileNo: employeeDetails.MobileNo || "",
                    BaseLocation: employeeDetails.BaseLocation || "",
                    BranchCode: employeeDetails.BranchCode || "",
                    ProfilePhoto: employeeDetails.ProfilePhoto || ""
                };

                var oIdCardModel = new sap.ui.model.json.JSONModel(idCardJson);
                oView.setModel(oIdCardModel, "IdCardModel");

                // Show busy dialog
                this.getBusyDialog();

                var fnAfterOpen = function () {
                    var sFileBinary = employeeDetails.ProfilePhoto;
                    var sFileType = employeeDetails.ProfilePhotoType;

                    if (sFileBinary && sFileType) {
                        try {
                            this.onPressDisplayImageOnCanvas(sFileBinary, sFileType);
                        } catch (e) {
                            console.error("Error displaying image on canvas:", e);
                        }
                    }
                    this.closeBusyDialog();
                }.bind(this);

                if (!this.oIdCardDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AddCard",
                        controller: this
                    }).then(function (oDialog) {
                        this.oIdCardDialog = oDialog;
                        oView.addDependent(this.oIdCardDialog);
                        this.oIdCardDialog.attachAfterOpen(fnAfterOpen); // Attach only once
                        this.oIdCardDialog.open();
                    }.bind(this));
                } else {
                    this.oIdCardDialog.detachAfterOpen(fnAfterOpen); // Detach if already added
                    this.oIdCardDialog.attachAfterOpen(fnAfterOpen); // Attach freshly
                    this.oIdCardDialog.open();
                }
            },

            CC_onPressSubmit: async function () {
                try {
                    const oView = this.getView();
                    const oModelData = oView.getModel("IdCardModel").getData();

                    const isAllDataPresent = oModelData.EmployeeID && oModelData.EmployeeName && oModelData.Designation &&
                        oModelData.Email && oModelData.DOB && oModelData.MobileNo && oModelData.BloodGroup &&
                        oModelData.BaseLocation && oModelData.BranchCode && (oModelData.ProfilePhoto || oModelData.Attachment)

                    if (isAllDataPresent) {
                        oView.getModel("sEmployeeModel").setProperty("/ProfilePhoto", "");
                        oView.getModel("sEmployeeModel").setProperty("/ProfilePhotoType", "");
                        this.CC_onPressClose();
                        this.onPressMerge(oModelData);
                    }
                    else {
                        sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText);
                }
            },
            CC_onPressClose: function () {
                this.oIdCardDialog.close();
            },

            onPressMerge: async function (employeeDetails) {
                const { jsPDF } = window.jspdf;
                this.getBusyDialog(); // open BusyDialog immediately      
                try {
                    await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: employeeDetails.BranchCode });
                    var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");

                    const compLogoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.transparentComplogo?.data);
                    const templateBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.idCardTemplate?.data);
                    const address = oCompanyDetailsModel.shortAddress;

                    // Create the PDF document
                    const doc = new jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: [54, 86]  // Standard ID card size
                    });
                    // Set the background template 
                    if (templateBase64) {
                        doc.addImage(templateBase64, 'JPEG', 0, 0, 54, 86);
                    }
                    // company logo at top-right corner
                    if (compLogoBase64) {
                        doc.addImage(compLogoBase64, 'JPEG', 40, 2.5, 12, 12);   // logo at top-right
                    }
                    // Define the photo placeholder
                    const imageWidth = 20;
                    const imageHeight = 20;
                    const imageX = (54 - imageWidth) / 2; // Center horizontally
                    const imageY = 20;
                    // Set the border around the employee photo placeholder
                    doc.setDrawColor(72, 61, 139);
                    doc.setLineWidth(1);
                    // Draw the border exactly around the photo
                    doc.rect(imageX, imageY, imageWidth, imageHeight);
                    // Add a white rectangle as a placeholder for the employee photo
                    doc.setFillColor(255, 255, 255); // Fill color as white
                    doc.rect(imageX, imageY, imageWidth, imageHeight, 'F');
                    // Add employee image 
                    if (employeeDetails.Attachment) {
                        doc.addImage(employeeDetails.Attachment, 'JPEG', imageX, imageY, imageWidth, imageHeight);
                    } else if (employeeDetails.ProfilePhoto) {
                        doc.addImage(employeeDetails.ProfilePhoto, 'JPEG', imageX, imageY, imageWidth, imageHeight);
                    }
                    // Employee details below the image
                    const textStartY = imageY + imageHeight + 5;
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8.5);
                    // Center employee name and designation
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const employeeNameX = (pageWidth - doc.getTextWidth(employeeDetails.EmployeeName)) / 2;
                    const designationX = (pageWidth - doc.getTextWidth(employeeDetails.Designation)) / 2;
                    doc.text(employeeDetails.EmployeeName, employeeNameX, textStartY);
                    doc.text(employeeDetails.Designation, designationX, textStartY + 5);
                    // Other details
                    const lineHeight = 5;
                    const textYOffset = textStartY + 10;
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    const centerText = (text) => (pageWidth - doc.getTextWidth(text)) / 2;
                    doc.text(`Employee ID: ${employeeDetails.EmployeeID}`, centerText(`Employee ID: ${employeeDetails.EmployeeID}`), textYOffset);
                    doc.text(`DOB: ${employeeDetails.DOB}`, centerText(`DOB: ${employeeDetails.DOB}`), textYOffset + lineHeight);
                    doc.text(`Blood: ${employeeDetails.BloodGroup}`, centerText(`Blood: ${employeeDetails.BloodGroup}`), textYOffset + lineHeight * 2);
                    doc.text(`Phone: ${employeeDetails.MobileNo}`, centerText(`Phone: ${employeeDetails.MobileNo}`), textYOffset + lineHeight * 3);
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    const maxWidth = 44;
                    const addressLines = doc.splitTextToSize(address, maxWidth);
                    const addressY = textYOffset + lineHeight * 3 + 5;
                    doc.text(addressLines, centerText(addressLines[0]), addressY);
                    // Save the document
                    doc.save(`${employeeDetails.EmployeeName}_IDCard.pdf`);
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog();
                }
            },

            SS_onPressPayslipRow: function (oEvent) {
                var sPath = oEvent.getSource().getBindingContext("PaySlip").getPath();
                this.oModel.setProperty("/isCreate", false);
                this.oModel.setProperty("/isIdSelected", true);
                this.oModel.setProperty("/EmpData", {});
                this.oModel.setProperty("/BackRoute", "SelfService");
                this.oModel.setProperty("/BackPath", this.sPath);
                this.oModel.setProperty("/BackPathRole", this.sNavigatedRole);
                var month = this.oModel.getProperty(`${sPath}/YearMonth`).split("-")[1];
                var filters = {
                    ID: this.oModel.getProperty(`${sPath}/ID`),
                    EmployeeID: this.oModel.getProperty(`${sPath}/EmployeeID`),
                    FinancialYear: this.oModel.getProperty(`${sPath}/FinancialYear`),
                    Month: month,
                };
                this.oModel.setProperty("/SelectedFilters", filters);
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            },

            onApplyResignation: async function () {
                await this.SS_commonOpenDialog("SSReg_oDialog", "sap.kt.com.minihrsolution.fragment.Resignation", ["RF_id_StartDate", "RF_id_EndDate"]);
                let oModel = this.getView().getModel("sEmployeeModel");
                let oData = oModel.getProperty("/0");
                if (oData && (!oData.ResignationStartDate || !oData.ResignationEndDate || !oData.ResignComment)) {
                    // Data not loaded yet, fetch and retry
                    await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", { EmployeeID: this.EmployeeID });
                    oModel = this.getView().getModel("sEmployeeModel")
                    oData = oModel.getProperty("/0");
                }
                if (oData && oData.ResignationStartDate && oData.ResignationEndDate && oData.ResignComment) {
                    this.getView().getModel("viewModel").setProperty("/backButtonVisible", false)
                    this.getView().getModel("viewModel").setProperty("/BtnVisible", false);
                    this.getView().getModel("viewModel").setProperty("/CanWithdrawResignation", true);
                    this.getView().getModel("viewModel").setProperty("/editableResignatin", false)
                   // this.getView().getModel("viewModel").setProperty("/closeButtonVisible", true)
                    this._onPressPreview("Initial");
                } else {
                    this.getView().getModel("viewModel").setProperty("/backButtonVisible", false)
                  //  this.getView().getModel("viewModel").setProperty("/closeButtonVisible", true)
                    this.getView().getModel("viewModel").setProperty("/BtnVisible", true);
                    this.getView().getModel("viewModel").setProperty("/CanWithdrawResignation", false);
                    this.getView().getModel("viewModel").setProperty("/editableResignatin", true)
                    this.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview Certificate</b> to Preview the Certificate</p>");
                    this.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                }
            },
            RF_onPressCloseDialog: function () {
                // Only clear if resignation is NOT applied
                if (!this.getView().getModel("viewModel").getProperty("/CanWithdrawResignation")) {
                    // Clear values
                    sap.ui.getCore().byId("RF_id_StartDate").setValue("");
                    sap.ui.getCore().byId("RF_id_EndDate").setValue("");
                    sap.ui.getCore().byId("RF_id_ResignReason").setValue("");
                    sap.ui.getCore().byId("RF_id_ResignReason").setValueState("None");
                    // Reset preview
                    this.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                    this.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview Certificate</b> to Preview the Certificate</p>");
                }
                this.SSReg_oDialog.close();
            },
            RF_onPressHandlePreview: function () {
                const bPreviewFlag = this.getView().getModel("PDFData").getProperty("/PreviewFlag");
                if (bPreviewFlag) {
                    this._onPressApplyResign();
                } else {
                    this._onPressPreview("Preview");
                }
            },

            //download certificate
            _onPressPreview: function (flag) {
                var oEmployeeModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var startDate = Formatter.formatDate(oEmployeeModel.ResignationStartDate)
                var endDate = Formatter.formatDate(oEmployeeModel.ResignationEndDate)
                if (flag !== "Initial") {
                    if (
                        !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("RF_id_ResignReason"), "ID") ||
                        !utils._LCvalidateDate(sap.ui.getCore().byId("RF_id_StartDate"), "ID") ||
                        !utils._LCvalidateDate(sap.ui.getCore().byId("RF_id_EndDate"), "ID")
                    ) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }

                    var startDate = sap.ui.getCore().byId("RF_id_StartDate").getValue();
                    var endDate = sap.ui.getCore().byId("RF_id_EndDate").getValue();
                }
                var empName = oEmployeeModel.Salutation + " " + oEmployeeModel.EmployeeName;
                var joinDate = Formatter.formatDate(oEmployeeModel.JoiningDate);
                var resignComment = oEmployeeModel.ResignComment;
                var designation = oEmployeeModel.Designation;
                var managerName = oEmployeeModel.ManagerName;

                var data = `
                <div style="text-align: justify;">
                    <p>Dear <b>${managerName}</b>,</p>  
                    <p>I hope this message finds you well.</p>
                    <p>I <b>${empName}</b> writing to formally resign from my position as <b>${designation}</b> at <b>${this.companyName}</b>, effective <b>${startDate}</b>. My last working day will be <b>${endDate}</b>.</p>
                    <p>I joined this organization on <b>${joinDate}</b>, and it has been an incredibly rewarding journey filled with learning, professional growth, and meaningful relationships. I want to sincerely thank you for your guidance and support throughout my tenure.</p>
                    <p>The reason of resignation is as follows:</p>
                    <p>${resignComment}</p>                   
         <p>I will do my best during this transition period to ensure a smooth handover of my responsibilities. Please let me know how I can help during this time.</p>
        <p>Thanks & Best Regards,<br/>
        ${empName}<br/>
        ${designation}<br/>
        ${this.companyName}</p>
    </div>
`;                 
                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.getView().getModel("PDFData").setProperty("/PreviewFlag", true);
                if(flag !== "Preview"){
                    if(new Date(oEmployeeModel.ResignationEndDate) < new Date()){
                    this.getView().getModel("viewModel").setProperty("/BtnVisible", false);
                    this.getView().getModel("viewModel").setProperty("/CanWithdrawResignation", false);
                    }else{
                    this.getView().getModel("viewModel").setProperty("/CanWithdrawResignation", true);
                    }
                }
            },
            SS_ResignStartDateChange: function (oEvent) {
                var oStartDate = oEvent.getSource().getDateValue(); // Get selected Start Date
                var oEndDatePicker = sap.ui.getCore().byId("RF_id_EndDate");
                if (oStartDate) {
                    // Set min date for end date
                    oEndDatePicker.setMinDate(oStartDate);
                    // Calculate 60 days after start date
                    var oEndDate = new Date(oStartDate);
                    oEndDate.setDate(oEndDate.getDate() + 60);
                    // Set the value of End Date picker (format as needed)
                    var oLocale = sap.ui.getCore().getConfiguration().getFormatSettings().getFormatLocale();
                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy", locale: oLocale });
                    oEndDatePicker.setValue(oDateFormat.format(oEndDate));
                }
                utils._LCvalidateDate(oEvent.getSource(), "ID");
            },
            //apply for resignation send mail to manager
            _onPressApplyResign: async function () {
                var that = this;
                this.showConfirmationDialog(
                    this.i18nModel.getText("confirmTitle"),
                    this.i18nModel.getText("confirmResgn"),
                    async function () {
                        try {
                            // Validate fields
                            if (
                                !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("RF_id_ResignReason"), "ID") ||
                                !utils._LCvalidateDate(sap.ui.getCore().byId("RF_id_StartDate"), "ID") ||
                                !utils._LCvalidateDate(sap.ui.getCore().byId("RF_id_EndDate"), "ID")
                            ) {
                                MessageToast.show(that.i18nModel.getText("mandetoryFields"));
                                return;
                            }
                            var oEmployeeModel = that.getView().getModel("sEmployeeModel").getData()[0];
                            oEmployeeModel.ResignationStartDate = sap.ui.getCore().byId("RF_id_StartDate").getValue()
                            oEmployeeModel.ResignationEndDate = sap.ui.getCore().byId("RF_id_EndDate").getValue()
                            oEmployeeModel.resignComment = sap.ui.getCore().byId("RF_id_ResignReason").getValue()
                            var empName = oEmployeeModel.Salutation + " " + oEmployeeModel.EmployeeName;
                            var startDate = sap.ui.getCore().byId("RF_id_StartDate").getValue().split("/").reverse().join("-");
                            var endDate = sap.ui.getCore().byId("RF_id_EndDate").getValue().split("/").reverse().join("-");
                            var resignComment = sap.ui.getCore().byId("RF_id_ResignReason").getValue();
                            var subject = `Resignation Notice: ${empName}`;
                            // Use the RTE content as the email body
                            var body = sap.ui.getCore().byId("RF_id_RTE").getValue();

                            var oPayload = {
                                from: oEmployeeModel.CompanyEmailID,
                                fromName: empName,
                                to: "",
                                toName: "",
                                subject: subject,
                                body: body,
                                CC: [oEmployeeModel.CompanyEmailID],
                                EmployeeID: that.EmployeeID,
                                ResignationStartDate: startDate,
                                ResignationEndDate: endDate,
                                ResignComment: resignComment,
                                Inbox: oEmployeeModel
                            };
                            that.getBusyDialog();
                            await that.ajaxCreateWithJQuery("ResignationMail", oPayload);
                            MessageToast.show(that.i18nModel.getText("resignConfirmation"));
                            // Show Withdraw button (set a flag in your model)
                            that.getView().getModel("viewModel").setProperty("/CanWithdrawResignation", true);
                            that.getView().getModel("viewModel").setProperty("/BtnVisible", false);
                            that.getView().getModel("viewModel").setProperty("/editableResignatin", false)
                                ;
                            that.SSReg_oDialog.close();
                        } catch (error) {
                            MessageToast.show(error.message || "Failed to send resignation email.");
                        } finally {
                            that.closeBusyDialog();
                        }
                    },
                    function () { }
                );
            },
            onWithdrawResignation: async function () {
                var that = this;
                this.showConfirmationDialog(
                    this.i18nModel.getText("confirmTitle"),
                    this.i18nModel.getText("withdrawConf"),
                    async function () {
                        try {
                            var oEmployeeModel = that.getView().getModel("sEmployeeModel").getData()[0];
                            var empName = oEmployeeModel.Salutation + " " + oEmployeeModel.EmployeeName;
                            var designation = oEmployeeModel.Designation;
                            var subject = "Confirmation of Resignation Withdrawal";

                            var body = `
    <div style="text-align: justify; font-family: Arial, sans-serif;">
        <p>Dear <b>${empName}</b>,</p>
        <p>We acknowledge receipt of your request to withdraw your resignation from the position of <b>${designation}</b> at <b>${that.companyName}</b>.</p>
        <p>We are pleased to inform you that your request has been accepted, and your resignation has been officially withdrawn. You will continue in your current role with no change to your employment status or responsibilities.</p>
        <p>We appreciate your continued commitment to the organization and look forward to your continued contributions.</p>
        <p>Best regards,<br/>
        HR Department<br/>
        ${that.companyName}</p>
    </div>
`;
                            var oPayload = {
                                isWithdraw: "isWithdraw",
                                from: oEmployeeModel.CompanyEmailID,
                                fromName: empName,
                                to: oEmployeeModel.CompanyEmailID,
                                to: empName,
                                subject: subject,
                                body: body,
                                CC: [oEmployeeModel.CompanyEmailID],
                                EmployeeID: that.EmployeeID,
                                Inbox: oEmployeeModel
                            };
                            that.getBusyDialog();
                            await that.ajaxCreateWithJQuery("ResignationMail", oPayload);
                            MessageToast.show(that.i18nModel.getText("resignWithdrw"));
                            that.getView().getModel("viewModel").setProperty("/CanWithdrawResignation", false);

                            // Reset all fields in the resignation fragment
                            sap.ui.getCore().byId("RF_id_StartDate").setValue("");
                            sap.ui.getCore().byId("RF_id_EndDate").setValue("");
                            sap.ui.getCore().byId("RF_id_ResignReason").setValue("");
                            sap.ui.getCore().byId("RF_id_RTE").setValue(""); // If you want to clear the RTE
                            that.getView().getModel("viewModel").setProperty("/editableResignatin", true)
                            // Reset preview flag and text in PDFData model
                            that.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                            that.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview Certificate</b> to Preview the Certificate</p>");

                            // Show the preview button again if you have a flag for it
                            that.getView().getModel("viewModel").setProperty("/BtnVisible", true);
                            that.SSReg_oDialog.close();
                        } catch (error) {
                            MessageToast.show(error.message || "Failed to send withdrawal email.");
                        } finally {
                            that.closeBusyDialog();
                        }
                    },
                    function () { }
                );
            },
            SS_onChangeCountry: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
                this.onCountryChange(oEvent, { stdCodeCombo: "SS_id_STDCode", baseLocationCombo: "SS_id_BaseL", branchInput: "SS_id_BranchCode", mobileInput: "SS_id_MobileNo" });
            },
            initAddressToggleModel: function () {
                const fullPerm = this.getView().getModel("sEmployeeModel").getProperty("/0/PermanentAddress") || "";
                const fullCorr = this.getView().getModel("sEmployeeModel").getProperty("/0/CorrespondenceAddress") || "";

                const addressModel = new sap.ui.model.json.JSONModel({
                    // Permanent
                    permFull: fullPerm,
                    permTruncated: fullPerm.length > 60 ? fullPerm.slice(0, 60) + "..." : fullPerm,
                    permToggleText: fullPerm.length > 60 ? "Show More" : "",
                    permIsTruncated: true,
                    permShowToggle: fullPerm.length > 60,

                    // Correspondence
                    corrFull: fullCorr,
                    corrTruncated: fullCorr.length > 60 ? fullCorr.slice(0, 60) + "..." : fullCorr,
                    corrToggleText: fullCorr.length > 60 ? "Show More" : "",
                    corrIsTruncated: true,
                    corrShowToggle: fullCorr.length > 60
                });

                this.getView().setModel(addressModel, "addressModel");
            },
            onTogglePermanentAddress: function () {
                const oModel = this.getView().getModel("addressModel");
                const isTruncated = oModel.getProperty("/permIsTruncated");

                if (isTruncated) {
                    oModel.setProperty("/permTruncated", oModel.getProperty("/permFull"));
                    oModel.setProperty("/permToggleText", "Show Less");
                } else {
                    oModel.setProperty("/permTruncated", oModel.getProperty("/permFull").slice(0, 60) + "...");
                    oModel.setProperty("/permToggleText", "Show More");
                }

                oModel.setProperty("/permIsTruncated", !isTruncated);
            },

            onToggleCorrespondenceAddress: function () {
                const oModel = this.getView().getModel("addressModel");
                const isTruncated = oModel.getProperty("/corrIsTruncated");

                if (isTruncated) {
                    oModel.setProperty("/corrTruncated", oModel.getProperty("/corrFull"));
                    oModel.setProperty("/corrToggleText", "Show Less");
                } else {
                    oModel.setProperty("/corrTruncated", oModel.getProperty("/corrFull").slice(0, 60) + "...");
                    oModel.setProperty("/corrToggleText", "Show More");
                }

                oModel.setProperty("/corrIsTruncated", !isTruncated);
            },
            _updateAddressModel: function (oData) {
                const oAddressModel = this.getView().getModel("addressModel");
                const permanent = oData.PermanentAddress || "";
                const corr = oData.CorrespondenceAddress || "";
                oAddressModel.setData({
                    permFull: permanent,
                    permTruncated: permanent.length > 60 ? permanent.slice(0, 60) + "..." : permanent,
                    permToggleText: permanent.length > 60 ? "Show More" : "",
                    permShowToggle: permanent.length > 60,
                    permExpanded: false,
                    corrFull: corr,
                    corrTruncated: corr.length > 60 ? corr.slice(0, 60) + "..." : corr,
                    corrToggleText: corr.length > 60 ? "Show More" : "",
                    corrShowToggle: corr.length > 60,
                    corrExpanded: false,
                });
            },


        });
    });