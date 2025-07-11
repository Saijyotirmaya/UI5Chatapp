sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",


], function (
    BaseController,
    Formatter,
    JSONModel
) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.AssetObjectPage", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("AssetObjectPage").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            var LoginFunction = await this.commonLoginFunction("AssetAssignment");
            if (!LoginFunction) return;
            var Layout = this.byId("ObjectPageLayout");
            Layout.setSelectedSection(this.byId("OB_Timeline"));
            this.getBusyDialog()
            this.Name = oEvent.getParameter("arguments").Name;
            this.Slno = oEvent.getParameter("arguments").sPath;
            await this._fetchCommonData("IncomeAsset", "objectModel", {
                SerialNumber: this.Slno,
            });


            this.closeBusyDialog()
            var data = this.getOwnerComponent().getModel("objectModel").getData();
            var timelineData = [];
            var currentItem = data.find(function (item) {
                return item.IsCurrent == 1;
            });

            if (currentItem) {
                this.getView().getModel("objectModel").setProperty("/Status", currentItem.Status);
            }
            data.forEach(function (item) {
                if (item.TransferDate && item.TransferDate !== "1899-11-30T00:00:00.000Z") {
                    timelineData.push({
                        type: "Transfer",
                        // dateTime: item.TransferDate,
                        // userName: item.TransferByName,
                        // title: item.TransferByID,
                        // Status: "Transferred",
                        text: item.ReferenceNumber ? "Reference Number: " + item.ReferenceNumber : "",

                        title: "The asset was transferred by " + item.TransferByName + " (" + item.TransferByID + ") to " + item.TransferBranch + " "
                            + "on " + new Date(item.TransferDate).toLocaleDateString('en-GB')

                    });
                }
                if (item.AssetCreationDate && item.Status != "Transferred") {
                    timelineData.push({
                        type: "Asset Creation",
                       
                        title: "The asset was picked by " + item.PickedEmployeeName + " (" + item.PickedEmployeeID + ") at " + item.PickedBranch + " "
                            + "on " + new Date(item.AssetCreationDate).toLocaleDateString('en-GB')
                    })
                }

                if (item.AssignedDate) {
                    timelineData.push({
                        type: "Assignment",
                     
                        title: "The asset was assigned to " + item.AssignEmployeeName + " (" + item.AssignEmployeeID + ") " + "by " +
                            item.AssignedByEmployeeName
                            + " (" + item.AssignedByEmployeeID + ") in " + item.AssignBranch + " " + "on "
                            + new Date(item.AssignedDate).toLocaleDateString('en-GB'),


                    });
                }

                if (item.ReturnDate && item.ReturnDate !== "1899-11-30T00:00:00.000Z") {
                    timelineData.push({
                        type: "Return",
                      
                        text: item.Comments ? "Comment: " + item.Comments : "",
                        title: "The asset was returned by " + item.AssignEmployeeName + " (" + item.AssignEmployeeID + ") to " + item.ReturnEmpName
                            + " (" + item.ReturnEmpID + ") at " + item.ReturnBranch + " " + "on " + new Date(item.ReturnDate).toLocaleDateString('en-GB')

                    });
                }
                if (item.TrashDate) {
                    timelineData.push({
                        type: "Trash",
                       
                        text: item.TrashComments ? "Comment: " + item.TrashComments : "",
                        title: "The asset was Trashed by " + item.TrashByEmployeeName + " (" + item.TrashByEmployeeID + ") at " + item.TrashBranch + " on " +
                            new Date(item.TrashDate).toLocaleDateString('en-GB')
                    });
                }
                
            });
            var oModel = new JSONModel(timelineData.reverse());
            this.getView().setModel(oModel, "Mymodel");

        },

        onLogout: function () {
            this.CommonLogoutFunction();
        },

        getTimelineDate: function (assetDate, assignedDate, status) {
            if (status === "Available") {
                return this.formatDate(assetDate);
            } else {
                return this.formatDate(assignedDate);
            }
        },
        AOP_onButtonPress: function () {
            if (this.Name === "Asset") {
                this.getRouter().navTo("RouteAssetAssignment");
            } else {
                this.getRouter().navTo("RouteIncomeAsset");
            }
        }
    });
});