sap.ui.define([
     "./BaseController",
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",

   

], function(
    BaseController,
	Controller,
    JSONModel,
    Formatter
    
) {
	"use strict";

	return BaseController.extend("sap.kt.com.minihrsolution.controller.MyAsset", {
             Formatter: Formatter,
                 onInit: function () {
     this.getRouter().getRoute("MyAsset").attachMatched(this._onRouteMatched, this);

      },
      _onRouteMatched:async function(){
          var LoginFunction = await this.commonLoginFunction("MyAsset");
                if (!LoginFunction) return;
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Asset Details");

                  this.getBusyDialog()
                   this.ajaxReadWithJQuery("IncomeAsset", "Status=Assigned").then((oData) => {
                    let loginModel = this.getView().getModel("LoginModel").getData();

                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                      const filteredData = oFCIAerData.filter(item =>
                            item.AssignEmployeeID === loginModel.EmployeeID
                        );
                   this.getOwnerComponent().setModel(new JSONModel(filteredData), "incomeModel");
                   this.closeBusyDialog()
                })
                this.initializeBirthdayCarousel();
      },
       onPressback: function () {
        this.getOwnerComponent().getRouter().navTo("RouteTilePage");
      },

      onLogout: function () {
        var that = this
        that.CommonLogoutFunction();
      },
	});
});