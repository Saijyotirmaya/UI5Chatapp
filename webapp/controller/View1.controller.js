sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../utils/validation"
], (Controller, utils) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.View1", {
        onInit() {

        },

        validatePassword: function (oEvent) {
            utils._LCvalidatePassword(oEvent);
        },
        validateMobileNo: function (oEvent) {
            utils._LCvalidateMobileNumber(oEvent);
        },
        validateName: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },
        validateEmail: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },
        validateAmount: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
        },
        validateVoterId: function (oEvent) {
            utils._LCvalidateVoterId(oEvent);
        },
        validateAadharCard: function (oEvent) {
            utils._LCvalidateAadharCard(oEvent);
        },
        validatePassport: function (oEvent) {
            utils._LCvalidatePassport(oEvent);
        },
        validatePanCard: function (oEvent) {
            utils._LCvalidatePanCard(oEvent);
        },
        validateAccountNo: function (oEvent) {
            utils._LCvalidateAccountNo(oEvent);
        },
        validateIfcCode: function (oEvent) {
            utils._LCvalidateIfcCode(oEvent);
        },
        validateDate: function (oEvent) {
            utils._LCvalidateDate(oEvent);
        },
        validateGstNumber: function (oEvent) {
            utils._LCvalidateGstNumber(oEvent);
        },
        ValidateCommonFields: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        //Save the Data
        V1_SubmitData: function (oEvent) {
            try {
                if (utils._LCvalidatePassword(this.byId("V1_id_Password"), "ID") && utils._LCvalidateMobileNumber(this.byId("V1_id_MobileNo"), "ID") && utils._LCvalidateEmail(this.byId("V1_id_Email"), "ID") && utils._LCvalidateName(this.byId("V1_id_Name"), "ID") && utils._LCvalidateAmount(this.byId("V1_id_Amount"), "ID") && utils._LCvalidateAccountNo(this.byId("V1_id_AccountNumber"), "ID") && utils._LCvalidateDate(this.byId("V1_id_Date"), "ID") && utils._LCvalidateMandatoryField(this.byId("V1_id_Address"), "ID") && utils._LCvalidatePanCard(this.byId("V1_id_PanCard"), "ID") && utils._LCvalidateAadharCard(this.byId("V1_id_AadharCard"), "ID") && utils._LCvalidateGstNumber(this.byId("V1_id_Gst"), "ID")
                    && utils._LCvalidateMandatoryField(this.byId("V1_id_CompanyName"), "ID") && utils._LCvalidateMandatoryField(this.byId("V1_id_Comments"), "ID") && utils._LCvalidateMandatoryField(this.byId("V1_id_Source"), "ID") && utils._LCvalidateMandatoryField(this.byId("V1_id_Destination"), "ID") && utils._LCvalidateMandatoryField(this.byId("V1_id_Country"), "ID") && utils._LCvalidateName(this.byId("V1_id_AccountHolderName"), "ID") && utils._LCvalidateMandatoryField(this.byId("V1_id_BankName"), "ID") && utils._LCvalidateIfcCode(this.byId("V1_id_IfscCode"), "ID") && utils._LCvalidatePassport(this.byId("V1_id_Passport"), "ID")
                    && utils._LCvalidateVoterId(this.byId("V1_id_VoterID"), "ID") && utils._LCvalidateMandatoryField(this.byId("V1_id_FileUploader"), "ID")) {
                }
                else {
                    sap.m.MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value");
                }
            }
            catch {
                sap.m.MessageToast.show("Technical error please connect to administrator");
            }

        }
    });
});
