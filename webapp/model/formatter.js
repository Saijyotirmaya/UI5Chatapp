sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";
    let _lastRenderedDate = null;
    return {

        getDateHeader: function (dateString) {
            const date = new Date(dateString);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            const isToday = date.toDateString() === today.toDateString();
            const isYesterday = date.toDateString() === yesterday.toDateString();

            if (isToday) return "Today";
            if (isYesterday) return "Yesterday";

            return date.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        },

        isDateHeaderVisible: function (dateString) {
            const date = new Date(dateString).toDateString();
            if (_lastRenderedDate !== date) {
                _lastRenderedDate = date;
                return true;
            }
            return false;
        },

        resetDateTracker: function () {
            _lastRenderedDate = null;
        },
        formatDate: function (sDate) {

            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        },

        formatMonthYear: function (sDateStr) {
            if (!sDateStr) return "";

            var oDate = new Date(sDateStr); // Convert ISO string to Date object
            var oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: "MM-yyyy" });

            return oDateFormat.format(oDate);
        },

        formatCurrency: function (value, code) {
            if (value || value === 0) {
                var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                    currencyCode: false // hides the currency code like "INR"
                });
                var formatted = oCurrencyFormat.format(value);
                return code ? formatted + " " + code : formatted;
            }
            return "";
        },

        CurrencyInINRText: function (sValue) {
            if (sValue || sValue === 0) {
                return "INR" + " " + parseFloat(sValue).toLocaleString('en-IN');
            }
            return "";
        },

        CurrencyInINR: function (sValue) {
            if (sValue || sValue === 0) {
                return parseFloat(sValue).toLocaleString('en-IN');
            }
            return "";
        },

        formatObjectStatus: function (sStatus) {
            switch (sStatus) {
                case "New":
                    return "Indication05";
                case "Renew":
                    return "Indication03";
                case "Active":
                    return "Success";
                case "Approved":
                    return "Success";
                case "Inactive":
                    return "Error";
                case "Rejected":
                    return "Error";
                case "Submitted":
                    return "Indication03";
                case "Company":
                    return "Indication13";
                case 'Employee':
                    return "Success";
                case 'Draft':
                    return "Indication17";
                case "Onboarded":
                    return "Success";
                case "Rejected":
                    return "Error";
                case "Offer Sent":
                    return "Indication06";
                case "Invoiced":
                    return "Success";
                case "Payment Received":
                    return "Success";
                case "Invoice Sent":
                    return "Indication03";
                case "Send back by account":
                    return "Indication06";
                case "PDF Generated":
                    return "Indication18";
                case "Send back by manager":
                    return "Information";
                case "Paid":
                    return "Success";
                case "Available":
                    return "Success"
                case "Returned":
                    return "Success"
                case "Trashed":
                    return "Error"
                case "Assigned":
                    return "Information"
                case "Transferred":
                    return "Warning"
                case "Saved":
                    return "Indication03";
                default:
                    return "Indication01";

            }
        },

        visibilityFormatter: function (selfServiceBtn, role, type) {
            var isAllowedRole = (role === 'Admin' || role === 'HR Manager' || role === 'HR');
            var isSaveOrSubmit = (type === 'Save' || type === 'Submit');
            // Self Service: show only if type is 'Save'
            if (selfServiceBtn) {
                return type === 'Save';
            }
            return isAllowedRole && isSaveOrSubmit;
        },
        resignationEndDateVisible: function (resignationEndDate, role) {
            var isAllowedRole = (role === 'Admin' || role === 'HR Manager' || role === 'HR');
            return !!resignationEndDate && isAllowedRole;
        },

        formatGrade: function (value) {
            if (!value) {
                return "";
            }
            if (value.includes("Percentage")) {
                var data = value.split(" ")
                return data[0] + " " + "%";
            }
            return value;
        },

        companyInvoicePayByDate: function (payByDate, status) {
            if (!payByDate || status !== "Invoice Sent") {
                return "None";
            }

            var dueDate = new Date(payByDate);
            var today = new Date();

            // Normalize time to 00:00:00 to avoid partial-day issues
            dueDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            var timeDiff = dueDate.getTime() - today.getTime();
            var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysDiff < 0) {
                return "Error"; // Overdue
            } else if (daysDiff <= 10) {
                return "Warning"; // Due soon
            } else {
                return "None"; // Not urgent
            }
        },


        // formatter.js
        formatContractEndState: function (endDate) {
            if (!endDate) return "None";

            const contractEnd = new Date(endDate);
            const today = new Date();

            contractEnd.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const diffDays = Math.ceil((contractEnd - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) return "Error";
            if (diffDays <= 10) return "Warning";
            return "None";
        }
        ,

        formatMaxDate: function () {
            var oDate = new Date()
            if (oDate) {
                return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
            }
            return null;
        },

        formatMinDate: function () {
            var oDate = new Date()
            if (oDate) {
                return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
            }
            return null;
        },

        formatCompanyAndDescription: function (description, startDate, EndDate) {
            if (description) {
                return description + " " + "(" + startDate + " - " + EndDate + ")";
            } else if (description) {
                return description;
            } else {
                return "";
            }
        },

        fromatNumber: function (avalue) {
            if (avalue === "0" || avalue === 0) {
                return "0.00";
            }
            var numericValue = parseFloat(avalue);
            if (isNaN(numericValue)) {
                return "";
            }

            var oFormatOptions = {
                groupingBaseSize: 3,
                groupingSize: 2,
                minIntegerDigits: 1,
                minFractionDigits: 2,
                maxFractionDigits: 4
            };

            var oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions);
            return oFloatFormat.format(numericValue);
        },

        bytesToMB: function (bytes) {
            if (!bytes || isNaN(bytes)) {
                return "0 MB";
            }

            const mb = bytes / (1024 * 1024);
            return mb.toFixed(2) + " MB";
        },

        YearlyToMontlyConv: function (value) {
            var Data = parseFloat(value);
            if (isNaN(Data)) {
                return "INR 0.00";
            }
            var oFormatOptions = {
                groupingBaseSize: 3,
                groupingSize: 2,
                minIntegerDigits: 1,
                minFractionDigits: 2,
                maxFractionDigits: 2
            };

            var oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions);
            // return oFloatFormat.format(numericValue);
            var monthlyValue = Data / 12;
            return "INR " + oFloatFormat.format(monthlyValue);
        },

        formatGradeWithType: function (sGrade, sGradeType) {
            if (!sGrade || isNaN(sGrade)) return "";
            var formattedGrade = parseFloat(sGrade).toFixed(2);
            if (sGradeType === "Percentage") {
                return formattedGrade + " %";
            } else if (sGradeType === "CGPA") {
                return formattedGrade + " CGPA";
            } else {
                return formattedGrade;
            }
        },

        getImageSrc: function (base64Str, gender,group) {
            if (base64Str) {
                return "data:image/png;base64," + base64Str;
            }

            if (gender === "Male") {
                return "image/male.jpg"; // put in webapp/images
            } else if (gender === "Female") {
                return "image/female.jpg"; // put in webapp/images
            }
           

            return ""; // fallback
        },
        formatMessageText: function (sText) {
            if (!sText) return "";

            // Simple URL regex
            const urlRegex = /(https?:\/\/[^\s]+)/g;

            // Replace URLs with clickable HTML link
            return sText.replace(urlRegex, function (url) {
                return `<a href="${url}" target="_blank" style="color:#0a6ed1;">${url}</a>`;
            });
        },


        statusState: function (Status) {
            if (Status === "Active") {
                return "Success";
            } else {
                return "Error";
            }
        },

        formatTimelineDate: function (status, creationDate, assignedDate, returnDate, trashDate, transferDate) {
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });

            if (status === "Assigned" && assignedDate) {
                return oDateFormat.format(new Date(assignedDate));
            }
            else if (status === "Returned" && returnDate) {
                return oDateFormat.format(new Date(returnDate))

            } else if (status === "Trashed" && trashDate) {
                return oDateFormat.format(new Date(trashDate))

            }
            else if (status === "Transferred" && transferDate) {
                return oDateFormat.format(new Date(transferDate))

            }
            else if (creationDate) {
                return oDateFormat.format(new Date(creationDate))
            }

            else {
                return "Date not available";
            }
        },

        formatCustomerTypeValue: function (sType, sValue) {
            if (sValue && sValue !== "") {
                return `${sType} (${sValue}%)`;
            }
            return sType;
        },

        formatId: function (status, pickId, assigneId) {
            if (status === "Assigned" && assigneId) {
                return assigneId;
            } else if (status === "Available" && pickId) {
                return pickId;
            } else {
                return " ";
            }
        },

        formatName: function (status, pickName, assigneByName, assigneName) {
            if (status === "Assigned" && assigneByName) {
                return assigneByName;
            } else if (status === "Available" && pickName) {
                return pickName;
            } else if (status === "Returned" && assigneName) {
                return assigneName;

            }
        },
        getGroupHeader: function (oGroup) {
            const sStatus = oGroup.key || "default";
            const statusLower = sStatus.toLowerCase();

            const oHeader = new sap.m.GroupHeaderListItem({
                title: sStatus,
                upperCase: false
            });
            oHeader.addStyleClass("group-header"); // universal
            oHeader.addStyleClass(groupClass);     // status-specific


            // Clear existing classes
            oHeader.removeStyleClass("group-active group-inactive group-onboarded group-rejected group-new group-default");

            // Apply new class
            let groupClass = "group-default";
            if (statusLower.includes("active")) groupClass = "group-active";
            else if (statusLower.includes("inactive")) groupClass = "group-inactive";
            else if (statusLower.includes("onboard")) groupClass = "group-onboarded";
            else if (statusLower.includes("reject")) groupClass = "group-rejected";
            else if (statusLower.includes("new")) groupClass = "group-new";

            oHeader.addStyleClass(groupClass);
            return oHeader;
        },


    }
});
