sap.ui.define(
    [
        "./BaseController",
        "../utils/validation",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "../model/formatter", // Custom formatter functions
    ],
    function(BaseController, utils, JSONModel, MessageToast, Formatter) {
        "use strict";

        return BaseController.extend(
            "sap.kt.com.minihrsolution.controller.HomePage", {
                Formatter: Formatter,
                onInit: function() {
                    this.getRouter().getRoute("RouteHomePage").attachMatched(this._onRouteMatched, this);
                    var oFormData = new JSONModel({
                        CustomerName: "",
                        CompanyName: "",
                        Email: "",
                        Address: "",
                        TimeSlot: "",
                        MobileNo: "",
                        Comments: "",
                    });

                    this.getView().setModel(oFormData, "formData");

                    var oTData = new JSONModel({
                        Name: "",
                        CollegeName: "",
                        EmailID: "",
                        Course: "",
                        MobileNo: "",
                        Comments: "",
                    });

                    this.getView().setModel(oTData, "TraineeData");

                    var oView = this.getView();

                    const oExpYears = new JSONModel();
                    oExpYears.loadData("model/ExpYears.json", null, false);
                    oView.setModel(oExpYears, "ExpYears");

                    $.ajax({
                        url: "https://rest.kalpavrikshatechnologies.com/JobOpenings",
                        type: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        headers: {
                            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                        },
                        success: function(data) {
                            var oModel = new JSONModel({Candidates: data.data});
                            oView.setModel(oModel, "JobApplicationModel");
                            this._loadComboBoxModels(data.data, oView);
                        }.bind(this),
                        error: function(error) {
                            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
                            if (!error || !error.responseJSON) {
                                var sMessage = oResourceBundle.getText("V1_m_errFetchD");
                                MessageToast.show(sMessage);
                                return;
                            }
                            MessageToast.show("Error: " + error.responseJSON.message);
                        }.bind(this),
                    });
                },

                _onRouteMatched: function() {
                    const oTabHeader = this.byId("mainTabHeader");
                    if (oTabHeader) {
                        oTabHeader.setSelectedKey("idHome");
                    }
                    var oNavContainer = this.byId("pageContainer");
                    this.API = "https://www.rest.kalpavrikshatechnologies.com";
                    oNavContainer.to(this.byId("idHome"));
                    this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

                    var oCarousel = this.byId("videoCarousel");

                    var videoUrls = [
                        "../video/Employee offer.mp4",
                        "../video/Self Service.mp4",
                        "../video/Employee details Part 1.mp4",
                        "../video/Quotation.mp4",
                        "../video/Scheme upload.mp4",
                    ];

                    // Add videos dynamically to the carousel
                    videoUrls.forEach(function(url, index) {
                        var oHtmlControl = new sap.ui.core.HTML({
                            content: '<video width="100%" height="100%" autoplay muted loop>' +
                                '<source src="' +
                                url +
                                '" type="video/mp4">' +
                                "</video>",
                        });

                        var oVBox = new sap.m.VBox({
                            alignItems: "Center",
                            items: [
                                new sap.m.Title({
                                    level: "H2",
                                    class: "custom-text2",
                                }),
                                oHtmlControl,
                            ],
                        });

                        oVBox.addStyleClass("sapUiTinyMargin"); // Apply transparent background class
                        oCarousel.addPage(oVBox);
                    });

                    var iCurrentIndex = 0;
                    var aPages = oCarousel.getPages(); // Get all slides

                    function autoSlide() {
                        if (aPages.length > 1) {
                            iCurrentIndex = (iCurrentIndex + 1) % aPages.length; // Move to next slide
                            oCarousel.setActivePage(aPages[iCurrentIndex]); // Update active slide
                        }
                    }
                    setInterval(autoSlide, 30000);

                    var oData = {
                        pages: [{
                            pageId: "companyPageId",
                            header: "Company info",
                            title: "Kalpavriksha Technologies",
                            titleUrl: "",
                            icon: "./image/logo.jpg",
                            displayShape: "Circle",
                            description: "Cell Phone : +91 9686145959",
                            groups: [{
                                    heading: "Contact Details",
                                    elements: [],
                                },
                                {
                                    heading: "Main Contact",
                                    elements: [{
                                            label: "WhatsApp",
                                            value: "+91 9686145959",
                                            elementType: "pageLink",
                                            pageLinkId: "companyEmployeePageId",
                                        },
                                        {
                                            label: "Email",
                                            value: "accounts@kalpavrikshatechnologies.com",
                                            emailSubject: "Subject",
                                            elementType: "email",
                                        },
                                        {
                                            label: "Address",
                                            value: "#111 Karekal layout , Sharanbasaveshwar Nagar, Near Naganhalli Railway Over Bridge, Gulbarga, Karnataka 585102, IN",
                                            elementType: "text",
                                        },
                                        {
                                            label: "Find Us On Google Map",
                                            value: "Google Map",
                                            elementType: "link",
                                            url: "https://maps.app.goo.gl/zjt8Xy3FsgV13veMA",
                                        },
                                        {
                                            label: "Follow Us On Linked in",
                                            value: "Linked in",
                                            elementType: "link",
                                            url: "https://www.linkedin.com/company/kalpavriksha-technologies/",
                                        },
                                    ],
                                },
                            ],
                        }, ],
                    };

                    var oModel = new JSONModel(oData);
                    this.getView().setModel(oModel);
                },

                onTabSelect: function(oEvent) {
                    var oItem = oEvent.getParameter("item");
                    this.byId("pageContainer").to(this.byId(oItem.getKey()));
                },
                onpressLogin: function() {
                    //sap.m.URLHelper.redirect("https://www.kalpavrikshatechnologies.com/EmployeeLogin", true);
                    this.getRouter().navTo("RouteLoginPage");
                },
                //linkdin link
                onClicklinkdin: function() {
                    sap.m.URLHelper.redirect(
                        "https://www.linkedin.com/company/kalpavriksha-technologies/",
                        true
                    );
                },
                //Address link
                onPressAddress: function() {
                    sap.m.URLHelper.redirect(
                        "https://www.google.com/maps/dir/17.3390052,76.8399401/kalpavriksha+technologies/@17.3190648,76.8242773,14z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x3bc8c122d9181afd:0x6af9e90eb1f5fc8f!2m2!1d76.8487474!2d17.299382?entry=ttu",
                        true
                    );
                },
                //navigate to home page
                onpressHome: function() {
                    this.getRouter().navTo("RouteHomePage");
                },

                validateCompnayname: function(oEvent) {
                    utils._LCvalidateMandatoryField(oEvent);
                },
                validateName: function(oEvent) {
                    utils._LCvalidateName(oEvent);
                },
                validateMobileNo: function(oEvent) {
                    utils._LCvalidateMobileNumber(oEvent);
                },
                validateEmail: function(oEvent) {
                    utils._LCvalidateEmail(oEvent);
                },
                ValidateCommonFields: function(oEvent) {
                    utils._LCvalidateMandatoryField(oEvent);
                },

                onDemoformSave: function() {
                    var oModel = this.getView().getModel("formData");
                    var oData = JSON.parse(JSON.stringify(oModel.getData())); // Deep copy to avoid reference issues
                    var payload = [oData];

                    // Form Validation
                    if (
                        utils._LCvalidateMandatoryField(this.byId("idCompanyname"), "ID") &&
                        utils._LCvalidateName(this.byId("idcustomername"), "ID") &&
                        utils._LCvalidateEmail(this.byId("idCustmailid"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("idtimeslot"), "ID") &&
                        utils._LCvalidateMobileNumber(this.byId("idmobilenumber"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("idCustaddress"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("idcomment"), "ID")
                    ) {
                        // AJAX Call to Save Data
                        $.ajax({
                            url: this.API + "/CustomerDemo",
                            type: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                                password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                            },
                            data: JSON.stringify(payload),
                            success: function(response) {
                                var resetData = {
                                    CustomerName: "",
                                    CompanyName: "",
                                    Email: "",
                                    Address: "",
                                    TimeSlot: "",
                                    MobileNo: "",
                                    Comments: "",
                                };

                                oModel.setData(resetData);
                                oModel.refresh(true);
                                MessageToast.show("Data saved successfully!");

                                // AJAX Call to Send Email
                            },
                            error: function(xhr, status, error) {
                                MessageToast.show("Error saving data. Please try again.");
                            },
                        });
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                },

                onUI5ress: function() {
                    this.selectedCourse = "SAP UI5"; // Set selected course
                    var oView = this.getView();
                    if (!this.oDialog) {
                        sap.ui.core.Fragment.load({
                            name: "sap.kt.com.minihrsolution.fragment.TraningForm",
                            controller: this,
                        }).then(
                            function(oDialog) {
                                this.oDialog = oDialog;
                                oView.addDependent(this.oDialog);
                                this.oDialog.open();
                            }.bind(this)
                        );
                    } else {
                        this.oDialog.open();
                    }
                },

                onCapmpress: function() {
                    this.selectedCourse = "CAPM"; // Set selected course
                    var oView = this.getView();
                    if (!this.oDialog) {
                        sap.ui.core.Fragment.load({
                            name: "sap.kt.com.minihrsolution.fragment.TraningForm",
                            controller: this,
                        }).then(
                            function(oDialog) {
                                this.oDialog = oDialog;
                                oView.addDependent(this.oDialog);
                                this.oDialog.open();
                            }.bind(this)
                        );
                    } else {
                        this.oDialog.open();
                    }
                },

                FTF_onlivename: function(oEvent) {
                    utils._LCvalidateName(oEvent);
                },
                FTF_onliveclg: function(oEvent) {
                    utils._LCvalidateMandatoryField(oEvent);
                },
                FTF_onlivemail: function(oEvent) {
                    utils._LCvalidateEmail(oEvent);
                },
                FTF_onlivemobile: function(oEvent) {
                    utils._LCvalidateMobileNumber(oEvent);
                },
                FTF_onlivecomment: function(oEvent) {
                    utils._LCvalidateMandatoryField(oEvent);
                },

                FTF_onSubmitForm: function() {
                    var oModel = this.getView().getModel("TraineeData");
                    var oData = JSON.parse(JSON.stringify(oModel.getData()));

                    // Add selected course from button press
                    oData.Course = this.selectedCourse || ""; // fallback to empty if not set
                    var that = this;
                    if (
                        utils._LCvalidateName(sap.ui.getCore().byId("FTF_idName"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FTF_idClgname"), "ID") &&
                        utils._LCvalidateEmail(sap.ui.getCore().byId("FTF_idmail"), "ID") &&
                        utils._LCvalidateMobileNumber(sap.ui.getCore().byId("FTF_idMobnumber"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FTF_idcomments"), "ID")
                    ) {
                        $.ajax({
                            url: this.API + "/Training",
                            type: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                                password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                            },
                            data: JSON.stringify({
                                data: oData
                            }),
                            success: function(response) {
                                var resetData = {
                                    Name: "",
                                    CollegeName: "",
                                    EmailID: "",
                                    MobileNo: "",
                                    Comments: "",
                                };
                                oModel.setData(resetData);
                                oModel.refresh(true);
                                that.oDialog.close();
                                MessageToast.show(that.i18nModel.getText("msgTraineeformSuccess"));
                            },
                            error: function() {
                                MessageToast.show("Error saving data. Please try again.");
                            },
                        });
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                },

                FTF_onCancelform: function() {
                    var oModel = this.getView().getModel("TraineeData");
                    // Reset Data Model
                    var resetData = {
                        Name: "",
                        CollegeName: "",
                        EmailID: "",
                        MobileNo: "",
                        Comments: "",
                    };
                    oModel.setData(resetData);
                    oModel.refresh(true);

                    // Reset Value States for Validation
                    var aFields = [
                        "FTF_idName",
                        "FTF_idClgname",
                        "FTF_idmail",
                        "FTF_idMobnumber",
                        "FTF_idcomments",
                    ];

                    aFields.forEach(function(sFieldId) {
                        var oField = sap.ui.getCore().byId(sFieldId);
                        if (oField) {
                            oField.setValueState("None");
                        }
                    });
                    // Close the Dialog
                    this.oDialog.close();
                },

                _loadComboBoxModels: function(aCandidates, oView) {
                    function getUniqueValuesByKey(key) {
                        var map = {};
                        var result = [];

                        for (var i = 0; i < aCandidates.length; i++) {
                            var val = aCandidates[i][key];
                            if (typeof val === "string") {
                                val = val.trim();
                            }
                            if (val && !map[val]) {
                                result.push({
                                    key: val
                                });
                                map[val] = true;
                            }
                        }

                        result.sort((a, b) => a.key.localeCompare(b.key));
                        return result;
                    }

                    oView.setModel(
                        new JSONModel(getUniqueValuesByKey("PrimarySkills")),
                        "SkillModel"
                    );
                    oView.setModel(
                        new JSONModel(getUniqueValuesByKey("Location")),
                        "LocationModel"
                    );
                    oView.setModel(
                        new JSONModel(getUniqueValuesByKey("Experience")),
                        "ExpModel"
                    );
                },

                v1_filClear: function() {
                    this.byId("V1_ID_SkillsInput").setValue(""); // not setSelectedKey
                    this.byId("V1_ID_LocationComboBox").setSelectedKey("");
                    this.byId("V1_ID_ExpComboBox").setSelectedKey("");

                    // Optional: reload original unfiltered data (via GET)
                    $.ajax({
                        url: "https://rest.kalpavrikshatechnologies.com/JobOpenings",
                        method: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        headers: {
                            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                        },
                        success: function(data) {
                            const oModel = new sap.ui.model.json.JSONModel({
                                Candidates: data.data,
                            });
                            this.getView().setModel(oModel, "JobApplicationModel");
                        }.bind(this),
                        error: function() {
                            MessageToast.show("Error resetting filter.");
                        },
                    });
                },

                onSuggestSkills: function(oEvent) {
                    const sValue = oEvent.getParameter("suggestValue")?.toLowerCase() || "";

                    const aTableData =
                        this.getView()
                        .getModel("JobApplicationModel")
                        ?.getProperty("/Candidates") || [];

                    // Match any skill from comma-separated PrimarySkills string
                    const aMatchedSkills = aTableData
                        .map((item) => item.PrimarySkills?.trim())
                        .filter(Boolean)
                        .flatMap((skillStr) => skillStr.split(","))
                        .map((skill) => skill.trim())
                        .filter((skill) => skill.toLowerCase().includes(sValue));

                    const aUniqueSkills = [...new Set(aMatchedSkills)];

                    const aSuggestionItems = aUniqueSkills.map((skill) => ({
                        skill
                    }));

                    const oSuggestModel = new sap.ui.model.json.JSONModel({
                        skills: aSuggestionItems,
                    });
                    this.getView().setModel(oSuggestModel, "skillModel");
                },

                V1_onSearch: function() {
                    const oSkillInput = this.byId("V1_ID_SkillsInput")?.getValue()?.trim();
                    const oLocationKey = this.byId(
                        "V1_ID_LocationComboBox"
                    )?.getSelectedKey();
                    const oExpCombo = this.byId("V1_ID_ExpComboBox")
                        ?.getSelectedItem()
                        ?.getText();

                    const oResourceBundle = this.getView()
                        .getModel("i18n")
                        .getResourceBundle();

                    // Check: if all filters are empty
                    if (!oSkillInput && !oLocationKey && !oExpCombo) {
                        const sMessage = oResourceBundle.getText("v1_m_go");
                        MessageToast.show(sMessage);
                        return;
                    }

                    // --- Build payload ---
                    const oFilterPayload = {
                        PrimarySkills: oSkillInput || "",
                        Location: oLocationKey || "",
                        Experience: oExpCombo || "",
                    };

                    // --- Send POST to backend ---
                    $.ajax({
                        url: "https://rest.kalpavrikshatechnologies.com/JobOpenings" +
                            "?" +
                            $.param(oFilterPayload),

                        method: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        headers: {
                            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                        },

                        success: function(response) {
                            const aFilteredData = response.data || [];

                            const oFilteredModel = new sap.ui.model.json.JSONModel({
                                Candidates: aFilteredData,
                            });

                            this.getView().setModel(oFilteredModel, "JobApplicationModel");
                        }.bind(this),

                        error: function(err) {
                            if (err?.responseJSON?.message) {
                                MessageToast.show("Error: " + err.responseJSON.message);
                            } else {
                                MessageToast.show("Failed to load filtered data.");
                            }
                        },
                    });
                },

                v1_onViewItem: function(oEvent) {
                    var oSelectedItem = oEvent
                        .getSource()
                        .getBindingContext("JobApplicationModel");
                    var oSelectedData = oSelectedItem.getObject();
                    var oSelectedModel = new JSONModel(oSelectedData);

                    this.getOwnerComponent().setModel(oSelectedModel, "SelectedCandidate");

                    setTimeout(() => {
                        this.getOwnerComponent().getRouter().navTo("RouteJobView");
                    }, 100);
                },
            }
        );
    }
);