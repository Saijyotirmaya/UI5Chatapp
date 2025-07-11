sap.ui.jsview("chatapp.chat", {


	getControllerName : function() {
		return "chatapp.chat";
	},

	createContent : function(oController) {

		var oTimeline = new sap.suite.ui.commons.Timeline({
			noDataText : "Sorry no messages here",
			showFilterBar : false,
			width : "80%",
			enableScroll : false
		});

		oTimeline.bindAggregation("content", {
			path : "chat>/current_chat",
			template : new sap.suite.ui.commons.TimelineItem({
				dateTime : "{chat>timestamp}",
				text : "{chat>message}",
				userName : "{chat>username}",
				icon : "sap-icon://person-placeholder"
			})
		});

		var oScrollContainer = new sap.m.ScrollContainer({
			width : "100%",
			height : "90%",
			horizontal : false,
			vertical : true,
			content : [ oTimeline ]
		});

		var oInp = new sap.m.Input({
			placeholder : "Enter your message and Press ↵ to submit.",
			submit : [ oController.sendMessage, oController ]
		});

		return new sap.m.Page({
			title : "{chat>/current_room}",
			content : [ oScrollContainer, oInp ]
		});
	}

});