sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox"
], (BaseController,MessageBox) => {
  "use strict";

  return BaseController.extend("sap.kt.com.minihrsolution.controller.App", {
    TIMEOUT_DURATION: 15 * 60 * 1000,
    logoutTimer: null,
    onInit: function () {
      // Reset the timer when the app is initialized
      this.resetLogoutTimer();

      // Listen for user activity
      this._attachEventHandlers();
    },
    _attachEventHandlers: function () {
      // Reset timer on mouse movement, keyboard input, or any interaction
      var oView = this.getView();
      oView.attachBrowserEvent("mousemove", this.resetLogoutTimer, this);
      oView.attachBrowserEvent("keydown", this.resetLogoutTimer, this);
      oView.attachBrowserEvent("touchstart", this.resetLogoutTimer, this);
    },

    resetLogoutTimer: function () {
      // Clear the existing timer and restart
      if (this.logoutTimer) {
        clearTimeout(this.logoutTimer);
      }
      // Set a new timeout to log out after 1 minute
      this.logoutTimer = setTimeout(this.logoutUser.bind(this), this.TIMEOUT_DURATION);
    },

    logoutUser: function () {
      // Clear any existing logout timer before proceeding with logout
      if (this.logoutTimer) {
        clearTimeout(this.logoutTimer);
      }
      this.getView().getModel("LoginModel").setData({});
      MessageBox.information(
        "Your session has expired due to inactivity. Please log in again to continue",
        {
          icon: sap.m.MessageBox.Icon.INFORMATION,
          title: "Session Expired",
          actions: [sap.m.MessageBox.Action.OK], // Define OK and CANCEL actions
          emphasizedAction: sap.m.MessageBox.Action.OK, // Make OK the emphasized button
          styleClass: "sapUiSizeCompact", // Optional: Add compact style for responsive padding
          dependentOn: this.getView(), // Optional: Makes the message box dependent on the current view

          onClose: function (sAction) {
            if (sAction === sap.m.MessageBox.Action.OK) {
              this.getView().getModel("LoginModel").setData({});
              window.location.reload(true);
              this.getOwnerComponent().getRouter().navTo("LoginPage");
            }
          }.bind(this) // Bind 'this' to ensure the correct context
        }
      );
    },
    // Manual logout function (can be used for a logout button)
    onManualLogout: function () {
      // Clear any existing logout timer before proceeding with logout
      if (this.logoutTimer) {
        clearTimeout(this.logoutTimer);
      }

      sap.m.MessageBox.information(
        "Your session has expired due to inactivity. Please log in again to continue",
        {
          icon: sap.m.MessageBox.Icon.INFORMATION,
          title: "Session Expired",
          actions: [sap.m.MessageBox.Action.OK], // Define OK and CANCEL actions
          emphasizedAction: sap.m.MessageBox.Action.OK, // Make OK the emphasized button
          styleClass: "sapUiSizeCompact", // Optional: Add compact style for responsive padding
          dependentOn: this.getView(), // Optional: Makes the message box dependent on the current view

          onClose: function (sAction) {
            if (sAction === sap.m.MessageBox.Action.OK) {
              this.getView().getModel("LoginModel").setData({});
              // Navigate to the login page
              this.getOwnerComponent().getRouter().navTo("LoginPage");
            }
          }.bind(this) // Bind 'this' to ensure the correct context
        });
    }
  });
});