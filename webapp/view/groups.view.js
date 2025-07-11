sap.ui.jsview("chatapp.groups", {

	/** Specifies the Controller belonging to this View. 
	* In the case that it is not implemented, or that "null" is returned, this View does not have a Controller.
	* @memberOf chatapp.groups
	*/ 
	getControllerName : function() {
		return "chatapp.groups";
	},

	/** Is initially called once after the Controller has been instantiated. It is the place where the UI is constructed. 
	* Since the Controller is given to this method, its event handlers can be attached right away. 
	* @memberOf chatapp.groups
	*/ 
	createContent : function(oController) {
		var oInp = new sap.m.Input({
			placeholder : "Enter your name and Press ↵ to submit.",
			submit : [ oController.changeName, oController ]
		});
		
		var oList = new sap.m.List({
			headerText: "Chat Groups"
		});

		// bind the oList items to the oData collection
		oList.bindItems({
			path: "list>/names",
			template: new sap.m.StandardListItem({
				title: "{list>Name}",
				description: "{list>Description}",
				type: sap.m.ListType.Navigation,
				press: [oController.enterGroup, oController]
			})
		});
 		return new sap.m.Page({
			title: "ChatApp",
			content: [
				oInp, oList
			]
		});
	}

});