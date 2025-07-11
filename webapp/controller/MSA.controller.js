sap.ui.define([
    "./BaseController",
],
    function (BaseController,) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSA", {
            onInit: function () {
                this.getRouter().getRoute("RouteMSA").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function () {
                try {
                    var LoginFUnction = await this.commonLoginFunction("MSA&SOW");
                    if (!LoginFUnction) return;
                    this.closeBusyDialog();
                    this._fetchCommonData("ManageCustomer", "CompanyNameModel");
                    await this.MSA_onSearch();
                    this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog(); // Close after async call finishes
                }
                 this.initializeBirthdayCarousel();
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onPressClear: function () {
                this.byId("MSA_id_CompanyName").setValue('');
                this.byId("MSA_id_Type").setValue('');
                this.byId("id_msa_date").setValue('');
            },
            MSA_onAddCustomer: function () {
                this.getRouter().navTo("RouteManageCustomer", { value: "MSA" });
            },
            onLogout: function () {
                this.CommonLogoutFunction();
            },
            MSA_AddmsaDetails: function () {
                this.getRouter().navTo("RouteMSADetails");
            },

            OnPressNavigationMsaDet: function (oEvent) {
                var MsaID = oEvent.getSource().getBindingContext("MSADisplayModel").getProperty("MsaID");
                this.getRouter().navTo("RouteMSAEdit", { sPath: MsaID })
            },

            MSA_onSearch: async function () {
                try {
                    this.getBusyDialog();
                    var aFilterItems = this.byId("MSA_id_AdminFilter").getFilterGroupItems();
                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
                    var params = {};
                    aFilterItems.forEach(function (oItem) {
                        var oControl = oItem.getControl();
                        var sValue = oItem.getName();
                        if (oControl && oControl.getValue()) {
                            if (sValue === "CreateMSADate") {
                                params["StartDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[0].trim().split('/').reverse().join('-')));
                                params["EndDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[1].trim().split('/').reverse().join('-')));
                            } else {
                                params[sValue] = oControl.getValue();
                            }
                        }
                    });
                    if (params && Object.keys(params).length > 0) {
                        this.Filter = false;
                    }
                    // Fetch the data
                    await this._fetchCommonData("MSADetails", "MSADisplayModel", params);

                    // Get the loaded data from the model
                    var oModel = this.getView().getModel("MSADisplayModel");
                    var aData = oModel.getData();

                    // Loop and format each CreateMSADate
                    aData.forEach(item => {
                        if (item.CreateMSADate) {
                            item.CreateMSADate = this.Formatter.formatDate(item.CreateMSADate);
                        }
                    });

                    // Update model with new formatted field
                    oModel.setData(aData);

                    this.closeBusyDialog();
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    this.closeBusyDialog();
                }
            },


        });
    });