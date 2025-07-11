sap.ui.define([], function () {
  "use strict";
  return {
    // Validate mobile number
    _LCvalidateMobileNumber: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField
        .getValue()
        .replace(/[^0-9]/g, "")
        .slice(0, 10);
      if (oField.getValue() !== oValue) oField.setValue(oValue);
      var regex = /^\d{10}$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Email validation function
    _LCvalidateEmail: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var sValue = oField.getValue();
      if (!sValue) {
        oField.setValueState("Error");
        return false;
      }
      // Split emails by comma, semicolon, or space
      var aEmails = sValue.split(/[,;]+/).map(email => email).filter(email => email);
      var regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      var bAllValid = aEmails.every(email => regex.test(email));
      if (!bAllValid) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    _LCvalidateName: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField.getValue().trim();
      if (oValue === "") {
        oField.setValueState("Error");
        return false;
      }
      // Allow only letters, spaces, and dots
      var sanitizedValue = oValue.replace(/[^a-zA-Z\s./]/g, "");
      if (oValue !== sanitizedValue) oField.setValue(sanitizedValue);
      var regex = /^[a-zA-Z\s./]+$/;
      if (!regex.test(sanitizedValue)) {
        oField.setValueState("Error");
        return false;
      }
      var letterCount = (sanitizedValue.match(/[a-zA-Z]/g) || []).length;
      if (letterCount < 2) {
        oField.setValueState("Error");
        return false;
      }
      oField.setValueState("None");
      return true;
    },


    // Amount validation function
    _LCvalidateAmount: function (oEvent, type) {
      var oInput = type === "ID" ? (oInput = oEvent) : (oInput = oEvent.getSource());
      var value = oInput.getValue();
      var cleanedValue = value.replace(/[^0-9.]/g, "");
      var parts = cleanedValue.split(".");
      if (parts.length === 2) {
        cleanedValue = parts[0] + "." + parts[1].slice(0, 2);
      }
      oInput.setValue(cleanedValue);
      if (parseFloat(cleanedValue) <= 0) {
        oInput.setValueState("Error");
        return false;
      }
      if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
        oInput.setValueState("Error");
        return false;
      } else {
        oInput.setValueState("None");
        return true;
      }
    },

    _LCvalidateAmountZeroTaking: function (oEvent, type) {
      var oInput = type === "ID" ? (oInput = oEvent) : (oInput = oEvent.getSource());
      var value = oInput.getValue();
      var cleanedValue = value.replace(/[^0-9.]/g, "");
      var parts = cleanedValue.split(".");
      if (parts.length === 2) {
        cleanedValue = parts[0] + "." + parts[1].slice(0, 2);
      }
      oInput.setValue(cleanedValue);

      if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
        oInput.setValueState("Error");
        return false;
      } else {
        oInput.setValueState("None");
        return true;
      }
    },

    _LCvalidateJoiningBonus: function (oEvent, type) {
      var oInput = type === "ID" ? oEvent : oEvent.getSource();
      var value = oInput.getValue();
      var cleanedValue = value.replace(/[^0-9.]/g, "");
      var parts = cleanedValue.split(".");
      // Limit to 2 decimal places
      if (parts.length === 2) {
        cleanedValue = parts[0] + "." + parts[1].slice(0, 2);
      }
      oInput.setValue(cleanedValue);
      // Allow 0 or positive decimal numbers
      if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
        oInput.setValueState("Error");
        return false;
      } else {
        oInput.setValueState("None");
        return true;
      }
    },

    // PAN card validation function
    _LCvalidatePanCard: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      oField.setValue(oField.getValue().trim().toUpperCase());
      var regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!regex.test(oField.getValue().trim().toUpperCase())) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // IFSC code validation
    _LCvalidateIfcCode: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      oField.setValue(oField.getValue().trim().toUpperCase());
      var regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!regex.test(oField.getValue().trim().toUpperCase())) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Aadhar card validation
    _LCvalidateAadharCard: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField
        .getValue()
        .replace(/[^0-9]/g, "")
        .slice(0, 12);
      if (oField.getValue() !== oValue) oField.setValue(oValue);
      var regex = /^[0-9]{12}$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Voter ID validation
    _LCvalidateVoterId: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var value = oField.getValue().trim().toUpperCase();
      oField.setValue(value);
      var regex = /^[A-Z]{3,4}[0-9]{7,8}$/;
      if (!regex.test(value)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Passport validation
    _LCvalidatePassport: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var value = oField.getValue().trim().toUpperCase();
      oField.setValue(value);
      var regex = /^[A-PR-WY][1-9]\d\s?\d{4}[1-9]$/;
      if (!regex.test(value)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Account No Validation
    _LCvalidateAccountNo: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField
        .getValue()
        .replace(/[^0-9]/g, "")
        .slice(0, 18);
      if (oField.getValue() !== oValue) oField.setValue(oValue);
      var regex = /^[0-9]{9,18}$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Date validation function
    _LCvalidateDate: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var value = oField.getValue().trim();
      var regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
      if (!regex.test(value)) {
        oField.setValueState("Error");
        return false;
      }
      // Split the date into parts
      var parts = value.split("/");
      var date = new Date(
        parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)
      );
      if (
        date.getFullYear() !== parseInt(parts[2], 10) ||
        date.getMonth() !== parseInt(parts[1], 10) - 1 ||
        date.getDate() !== parseInt(parts[0], 10)
      ) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // GST Number Validation
    _LCvalidateGstNumber: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      oField.setValue(oField.getValue().toUpperCase());
      var regex =
        /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
      if (!regex.test(oField.getValue().toUpperCase())) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Mandatory Field Validation
    _LCvalidateMandatoryField: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField.getValue().trim();
      if (!oValue) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    _LCvalidateCTC: function (oEvent, type) {
      var oInput = type === "ID" ? oEvent : oEvent.getSource();
      var value = oInput.getValue().replace(/[^0-9.]/g, "");
      var parts = value.split(".");
      if (parts.length === 2) {
        value = parts[0] + "." + parts[1].slice(0, 2);
      }
      oInput.setValue(value);
      var num = parseFloat(value);
      if (!/^\d+(\.\d{1,2})?$/.test(value) || isNaN(num) || num < 50000) {
        oInput.setValueState("Error");
        return false;
      }
      oInput.setValueState("None");
      return true;
    },


    // Pin Code Validation (NEW FUNCTION ADDED)
    _LCvalidatePinCode: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField
        .getValue()
        .replace(/[^0-9]/g, "")
        .slice(0, 6);

      if (oField.getValue() !== oValue) {
        oField.setValue(oValue);
      }
      var regex = /^\d{6}$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    _LCvalidatePassword: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;

      var oValue = oField.getValue();
      var regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*+-])[A-Za-z\d!+-@#$%^&*()_=]{6,}$/;

      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    // LUT Number Validation
    _LCvalidateLutNumber: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      oField.setValue(oField.getValue().toUpperCase());
      var regex = /^[A-Z0-9]{16}$/;
      if (!regex.test(oField.getValue().toUpperCase())) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    _LCvalidateVariablePay: function (oEvent, type) {
      var oInput = type === "ID" ? oEvent : oEvent.getSource();
      var value = oInput.getValue();
      var cleanedValue = value.replace(/[^0-9.]/g, "");
      var parts = cleanedValue.split(".");
      if (parts.length === 2) {
        cleanedValue = parts[0] + "." + parts[1].slice(0, 2);
      }
      oInput.setValue(cleanedValue);
      var isValidFormat = /^\d+(\.\d{1,2})?$/.test(cleanedValue);
      var numValue = parseFloat(cleanedValue);
      if (!isValidFormat || isNaN(numValue) || numValue < 0 || numValue > 20) {
        oInput.setValueState("Error");
        return false;
      } else {
        oInput.setValueState("None");
        return true;
      }
    },

    _LCvalidationComboBox: function (oEvent, type) {
      var aSelectedKeys =
        type === "ID"
          ? oEvent.getSelectedKeys()
          : [oEvent.getParameter("value")];
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      aSelectedKeys =
        aSelectedKeys[0] === "" ? aSelectedKeys.slice(1) : aSelectedKeys;
      if (aSelectedKeys.length === 0) {
        oField.setValueState("Error");
        oField.setValueStateText("Please select at least one option");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    _LCvalidateGrade: function (oEventOrField, type, sGradeTypeId) {
      var oField = (type === "ID") ? oEventOrField : oEventOrField.getSource();
      if (!oField) return false;

      var sGradeValue = oField.getValue().trim();
      var cleanValue = sGradeValue.replace(/[^0-9.]/g, '');
      oField.setValue(cleanValue);

      if (!cleanValue) {
        oField.setValueState("Error");
        return false;
      }

      var regex = /^\d{1,5}(\.\d{1,2})?$/;
      if (!regex.test(cleanValue) || isNaN(cleanValue)) {
        oField.setValueState("Error");
        oField.setValueStateText("Enter a valid number with up to 2 decimal places.");
        return false;
      }

      var fGrade = parseFloat(cleanValue);
      var sGradeType = sap.ui.getCore().byId(sGradeTypeId)?.getSelectedKey() || "";
      var bIsValid = false;

      if (sGradeType === "Percentage") {
        bIsValid = fGrade >= 0 && fGrade <= 100;
      } else if (sGradeType === "CGPA") {
        bIsValid = fGrade >= 0 && fGrade <= 10;
      }

      if (bIsValid) {
        oField.setValueState("None");
        return true;
      } else {
        oField.setValueState("Error");
        var sErrorMsg = (sGradeType === "Percentage")
          ? "Grade must be between 0 and 100 for Percentage."
          : "Grade must be between 0 and 10 for CGPA.";
        oField.setValueStateText(sErrorMsg);
        return false;
      }
    },

    _LCvalidateTimeLimit: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var value = parseFloat(oField.getValue());
      if (isNaN(value) || value <= 0 || value > 8) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    _LCvalidateTraineeAmount: function (oEvent, type) {
      var oInput = type === "ID" ? oEvent : oEvent.getSource();
      var value = oInput.getValue().trim();

      // Remove invalid characters
      var cleanedValue = value.replace(/[^0-9.]/g, "");

      // Set cleaned value back to input
      oInput.setValue(cleanedValue);

      // Regex: Up to 2 digits before decimal, optional decimal, up to 2 digits after decimal
      var validFormat = /^(?:\d{1,2})(?:\.\d{1,2})?$/;

      // Check for value within 0-99.99 range and match regex
      if (!validFormat.test(cleanedValue) || parseFloat(cleanedValue) > 99.99) {
        oInput.setValueState("Error");
        return false;
      } else {
        oInput.setValueState("None");
        return true;
      }
    },

    _LCstrictValidationComboBox: function (oEvent, type) {
      var oComboBox = type === "ID" ? oEvent : oEvent.getSource();
      var sValue = oComboBox.getValue();
      if (!sValue) {
        oComboBox.setValueState("Error");
        return false;
      }
      var aItems = oComboBox.getItems();
      var bValid = aItems.some(function (oItem) {
        return oItem.getText() === sValue || oItem.getKey() === sValue;
      });
      if (!bValid) {
        oComboBox.setValueState("Error");
        return false;
      } else {
        oComboBox.setValueState("None");
        return true;
      }
    }
  };
});
