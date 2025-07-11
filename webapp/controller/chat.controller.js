sap.ui.controller("chatapp.chat", {

	/**
	 * Called when a controller is instantiated and its View controls (if
	 * available) are already created. Can be used to modify the View before it
	 * is displayed, to bind event handlers and do other one-time
	 * initialization.
	 * 
	 * @memberOf chatapp.chat
	 */
	onInit : function() {
		var oData = {
			current_room: "Please select a room",
			current_chat: [],
			subscribed_channels : []
		};
		var oModelCh = new sap.ui.model.json.JSONModel();
		oModelCh.setData(oData);
		sap.ui.getCore().setModel(oModelCh, "chat");
		console.log(sap.ui.getCore().getModel("chat").getData());
		var oModel = new sap.ui.model.json.JSONModel();
		sap.ui.getCore().setModel(oModel, "table");
		pubnub.addListener({
			message: function(message) {
				console.log(message);
				var oDataAppend = sap.ui.getCore().getModel("chat").getData();
				if(!oDataAppend.hasOwnProperty(message.channel)) {
					oDataAppend[message.channel] = [];
				}
				oDataAppend[message.channel].push({
					"message": message.message.message,
					"username": message.message.username,
					"timestamp": Date(message.message.timestamp)
				});
				console.log(oDataAppend);
				if(message.channel == channel) {
					oDataAppend["current_chat"].push({
						"message": message.message.message,
						"username": message.message.username,
						"timestamp": Date(message.message.timestamp)
					});
				}
				oModelCh.refresh();
			}
		});
	},

	sendMessage : function(oEvt) {
		var sValue = oEvt.getSource().getValue();
		if(sValue == "") {
			return;
		}
		var oGroup = sap.ui.getCore().getModel("table").getData();
		if(oGroup[0] && oGroup[0].Channel) {
			pubnub.publish({
		        message: {
		            message: sValue,
		            timestamp: new Date(),
		            username: sName || pubnub.getUUID()
		        },
		        channel: oGroup[0].Channel
		    },
		    function (status, response) {
		    	console.log(response);
			});
			oEvt.getSource().setValue("");
		} else {
			sap.m.MessageToast.show("Choose a group first", {
				my: "center top",
				at: "center top"
			});
		}
	}

/**
 * Similar to onAfterRendering, but this hook is invoked before the controller's
 * View is re-rendered (NOT before the first rendering! onInit() is used for
 * that one!).
 * 
 * @memberOf chatapp.chat
 */
// onBeforeRendering: function() {
//
// },
/**
 * Called when the View has been rendered (so its HTML is part of the document).
 * Post-rendering manipulations of the HTML could be done here. This hook is the
 * same one that SAPUI5 controls get after being rendered.
 * 
 * @memberOf chatapp.chat
 */
// onAfterRendering: function() {
//
// },
/**
 * Called when the Controller is destroyed. Use this one to free resources and
 * finalize activities.
 * 
 * @memberOf chatapp.chat
 */
// onExit: function() {
//
// }
});