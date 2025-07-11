sap.ui.define([
	"./BaseController",
	"../utils/validation",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/suite/ui/commons/Timeline",
	"sap/suite/ui/commons/TimelineItem"
], function (
	BaseController,
	utils,
	JSONModel,
	MessageToast,
	MessageBox,
	Timeline,
	TimelineItem
) {
	"use strict";
	return BaseController.extend("sap.kt.com.minihrsolution.controller.KTChat", {

		onInit: function () {
			this.getRouter().getRoute("RouteKTChat").attachMatched(this._onRouteMatched, this);
			// Initialize chat model
			var oData = {
				messages: [],         // For the input box chat bubbles
				current_chat: [],
				current_room: "",     // ReceiverID
				username: "",
				filteredEmployees: []
			};

			var oModel = new JSONModel(oData);
			this.getView().setModel(oModel, "chat");
			sap.ui.getCore().setModel(oModel, "chat");
			
		},
		_onRouteMatched: function (oEvent) {
			// Get logged-in user ID
			const oLoginModel = this.getView().getModel("LoginModel");
			const sCurrentUserID = oLoginModel.getProperty("/EmployeeID");

			// Get original employee data
			const oEmpModel = this.getView().getModel("EmpDetails");
			const aAllEmployees = oEmpModel.getData();

			// Filter out current user
			const aFilteredEmployees = aAllEmployees.filter(function (oEmployee) {
				return oEmployee.EmployeeID !== sCurrentUserID;
			});

			// Update model with filtered list
			this.getView().getModel("chat").setProperty("/filteredEmployees", aFilteredEmployees);
			this.initializeBirthdayCarousel();
		},

		changeName: function (oEvent) {
			var sName = oEvent.getSource().getValue();
			if (!sName.trim()) {
				MessageToast.show("Please enter your name.");
				return;
			}

			var oChatModel = sap.ui.getCore().getModel("chat");
			oChatModel.setProperty("/username", sName);
			MessageToast.show("Name set to: " + sName);
		},

		sendMessage: function () {
			const oInput = this.byId("messageInput1");
			const sText = oInput.getValue().trim();
			if (!sText) return;

			const oChatModel = this.getView().getModel("chat");
			const oLoginModel = this.getView().getModel("LoginModel");

			const sSenderID = oLoginModel.getProperty("/EmployeeID");
			const sSenderName = oLoginModel.getProperty("/EmployeeName");
			const sReceiverID = oChatModel.getProperty("/current_room");

			if (!sSenderID || !sReceiverID) {
				MessageToast.show("Please select a recipient first.");
				return;
			}

			const oPayload = {
				data: {
					SenderID: sSenderID,
					ReceiverID: sReceiverID,
					MessageText: btoa(sText)// Proper encoding
				}
			};

			this.ajaxCreateWithJQuery("ChatApplication", oPayload)
				.then(() => {
					// Update List model for chat bubble display
					const aMsgList = oChatModel.getProperty("/messages") || [];
					aMsgList.push({
						text: sText, // Store original text (not encoded) in local model
						sender: "me",
						time: new Date().toLocaleTimeString()
					});
					oChatModel.setProperty("/messages", aMsgList);
					oInput.setValue("");

				
				})
				.catch(function (err) {
					MessageToast.show("Failed to send message.");
					console.error(err);
				});
		},

		onPressGoToMaster: function (oEvent) {
			const oSelected = oEvent.getSource().getBindingContext("chat").getObject();
			const sReceiverID = oSelected.EmployeeID;
			const sReceiverName = oSelected.EmployeeName;

			const oChatModel = this.getView().getModel("chat");
			const oLoginModel = this.getView().getModel("LoginModel");

			const sSenderID = oLoginModel.getProperty("/EmployeeID");
			const sSenderName = oLoginModel.getProperty("/EmployeeName");

			oChatModel.setProperty("/current_room", sReceiverID);
			oChatModel.setProperty("/currentReceiverName", sReceiverName);
			oChatModel.setProperty("/username", sSenderName);
			oChatModel.setProperty("/messages", []); // Clear previous

			this.ajaxReadWithJQuery("getMessagesBetweenUsers", {
				SenderID: sSenderID,
				ReceiverID: sReceiverID
			}).then((response) => {
				const aServerMessages = response.results || [];

				const aMessages = aServerMessages.map((msg) => {
					// Decode the message
					let messageText = msg.MessageText;
					let decode = atob(messageText);
					return {
						text: decode,
						sender: msg.SenderID === sSenderID ? "me" : "them",
						time: new Date(msg.Timestamp).toLocaleTimeString()
					};
					
				});
                
				this.byId("headerTitle").setText(`Chat with ${sReceiverName}`);
				// Update chat model
				oChatModel.setProperty("/messages", aMessages);
							
			}).catch((err) => {
				MessageToast.show("Failed to load messages");
				console.error(err);
			});
		},

		onPressback: function () {
			this.getRouter().navTo("RouteTilePage");
		},

		onLogout: function () {
			localStorage.removeItem("chatMessages");
			this.CommonLogoutFunction();
		}

	});
});
