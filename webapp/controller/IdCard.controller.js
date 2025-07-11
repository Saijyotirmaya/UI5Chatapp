sap.ui.define([
  "./BaseController", //call base controller
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
   "../utils/validation"
],
  function (BaseController, JSONModel, MessageToast, utils) {
      "use strict";
      return BaseController.extend("sap.kt.com.minihrsolution.controller.IdCard", {
          onInit: function () {
              this.getRouter().getRoute("RouteIDCardApplication").attachMatched(this._onRouteMatched, this);
          },

          _onRouteMatched: function () {
              var that = this
              that.getView().getModel("LoginModel").setProperty("/HeaderName", "ID CARD"); 
              that.i18nModelMess = that.getView().getModel('i18n').getResourceBundle()
              var oTextModel = new JSONModel({ name: "" });
              that.getView().setModel(oTextModel, "TextDisplay");
              var oIdCardModel = that.getView().getModel("IdCardModel");
              if (oIdCardModel) {
                  oIdCardModel.attachPropertyChange(this.IC_onPressDisplayImageOnCanvas.bind(this));
              }
          },

        onAfterRendering: function () {
          var canvasElement = document.getElementById("canvas");
          if (canvasElement) {
            var context = canvasElement.getContext("2d");
            if (context) {
              context.clearRect( 0, 0, canvasElement.width, canvasElement.height);
            }
          }
        },

        // Function to open the ID card details dialog
        IC_onPressIdCardDetails: function () {
          var oView = this.getView();
          this.onAfterRendering();
          // this.onFetchDetails();
          // this.FragmentDatePickersReadOnly(["DOB", "EmployeeID", "BloodGroup"])
          var idCardJson = {
            EmployeeID: "",
            EmployeeName: "",
            BloodGroup: "",
            DOB: "",
            Designation: "",
            MobileNo: "",
            Email: "",
            Attachment: "",
            name: "",
            mimeType: "",
            Submit: true,
            Save: false,
            isEmployeedetails: true,
            isEditable: true,
            minDOB: new Date(2000, 0, 1),
            today: new Date(),
          };
          var oIdCardModel = new JSONModel(idCardJson);
          this.getView().setModel(oIdCardModel, "IdCardModel");
          this.IC_openIdCardDialog(oView, true);
        },

        // Open the ID card dialog fragment
        IC_openIdCardDialog: function (oView, value) {
          this.getView().getModel("TextDisplay").setProperty("/name", "");
          if (!this.oDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.AddIdCard",
              controller: this,
            }).then(
              function (oDialog) {
                this.oDialog = oDialog;
                // this.FragmentDatePickersReadOnly(["idDateBirth"]);
                oView.addDependent(this.oDialog);
                this.oDialog.open();
              }.bind(this)
            );
          } else {
            // this.FragmentDatePickersReadOnly(["idDateBirth"]);
            this.oDialog.open();
          }
          if (value) {
            sap.ui.getCore().byId("IC_id_GroupC").setSelectedIndex(0);
            sap.ui.getCore().byId("IC_id_EmployeeID").setSelectedKey("");
          } else {
            if (this.oId.split("-").length === 1) {
              sap.ui.getCore().byId("IC_id_GroupC").setSelectedIndex(0);
            } else {
              sap.ui.getCore().byId("IC_id_GroupC").setSelectedIndex(1);
            }
          }
        },

        IC_onPressClose: function () {
          this.oDialog.close();
        },

        IC_onHandleUploadPress: function (oEvent) {
          var oFileUploader = oEvent.getSource();
          var oFile = oFileUploader.oFileUpload.files[0];

          if (!oFile) {
            MessageToast.show("No file selected.");
            return;
          }
          var validMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
          var validExtensions = ["jpg", "jpeg", "png"];
          var fileName = oFile.name.toLowerCase();
          var fileExtension = fileName.split(".").pop();
          if (
            !validMimeTypes.includes(oFile.type) &&
            !validExtensions.includes(fileExtension)
          ) {
            MessageToast.show("Invalid file type.");
            oFileUploader.clear();
            return;
          }
          if (oFile.size > 5242880) {
            // 5MB limit
            MessageBox.error("File size exceeds the limit of 5Mb.");
            oFileUploader.clear();
            return;
          }
          var oReader = new FileReader();
          oReader.onload = function (e) {
            var sFileBinary = e.target.result.split(",")[1];
            var oModel = this.getView().getModel("IdCardModel");
            if (oModel) {
              oModel.setProperty("/Attachment", sFileBinary);
              oModel.setProperty("/name", oFile.name);
              oModel.setProperty("/mimeType", oFile.type);
              this.IC_onPressDisplayImageOnCanvas(sFileBinary, oFile.type);
              this.getView()
                .getModel("TextDisplay")
                .setProperty("/name", oFile.name);
            }
            oFileUploader.clear();
          }.bind(this);
          oReader.readAsDataURL(oFile);
        },

        //open camera function
        IC_onPressOpenCamera: function () {
          var oView = this.getView();
          if (!this.oCameraDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.Camera",
              controller: this,
            }).then(
              function (oDialog) {
                this.oCameraDialog = oDialog;
                oView.addDependent(this.oCameraDialog);
                this.oCameraDialog.attachAfterOpen(
                  this.IC_StartCamera.bind(this)
                );
                this.oCameraDialog.attachAfterClose(
                  this.IC_StopCamera.bind(this)
                );
                this.oCameraDialog.open();
              }.bind(this)
            );
          } else {
            this.oCameraDialog.open();
          }
        },

        IC_StartCamera: function () {
          var oVideo = document.getElementById("video");
          if (!oVideo) {
            return;
          }
          navigator.mediaDevices
            .getUserMedia({ video: true })
            .then(
              function (stream) {
                oVideo.srcObject = stream;
                oVideo.play();
                this._cameraStream = stream;
              }.bind(this)
            )
            .catch(function (err) {
              MessageToast.show("Camera access denied");
            });
        },

        IC_StopCamera: function () {
          if (this._cameraStream) {
            this._cameraStream.getTracks().forEach(function (track) {
              track.stop();
            });
            this._cameraStream = null;
          }
          var oVideo = document.getElementById("video");
          if (oVideo) {
            oVideo.srcObject = null;
          }
        },

        IC_onCapturePress: function () {
          var oCanvas = document.getElementById("canvas");
          var oVideo = document.getElementById("video");
          if (
            !oCanvas ||
            !oVideo ||
            oVideo.readyState < oVideo.HAVE_CURRENT_DATA
          ) {
            return;
          }
          var oContext = oCanvas.getContext("2d", { willReadFrequently: true });
          if (!oContext) {
            return;
          }
          oCanvas.width = oVideo.videoWidth;
          oCanvas.height = oVideo.videoHeight;
          oContext.drawImage(oVideo, 0, 0, oCanvas.width, oCanvas.height);
          var base64Image = oCanvas.toDataURL("image/png");
          var mimeType = base64Image.substring(5, base64Image.indexOf(";"));
          var imageName = "captured_image.png";
          base64Image = base64Image.replace(
            "data:" + mimeType + ";base64,",
            ""
          );
          var oModel = this.getView().getModel("IdCardModel");
          oModel.setProperty("/Attachment", base64Image);
          oModel.setProperty("/mimeType", mimeType);
          oModel.setProperty("/name", imageName);
          oModel.setProperty("/capturedImage", base64Image);
          oModel.setProperty("/capturedImageName", imageName);
          this.getView().getModel("TextDisplay").setProperty("/name", "");
          this.IC_StopCamera();
          this.oCameraDialog.close();
        },

        IC_onPressCloseCameraDialog: function () {
          this.IC_StopCamera();
          if (this.oCameraDialog) {
            this.oCameraDialog.close();
          }
        },

        IC_onPressDisplayImageOnCanvas: function (sFileBinary, sFileType) {
          var canvas = document.getElementById("canvas");
          if (canvas) {
            var context = canvas.getContext("2d");
            var img = new Image();
            img.onload = function () {
              context.clearRect(0, 0, canvas.width, canvas.height);
              context.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = "data:" + sFileType + ";base64," + sFileBinary;
          }
        },

        onPressback: function () {
          this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
        },

        IC_ValidateEmployeeName: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        
        IC_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        IC_ValidateEmail: function (oEvent) {
          utils._LCvalidateEmail(oEvent);
        },

        IC_ValidateDate: function (oEvent) {
          utils._LCvalidateDate(oEvent);
        },

        IC_ValidateMobileNo: function (oEvent) {
          utils._LCvalidateMobileNumber(oEvent);
        },
        
        IC_onPressSubmit: function (oEvent) {
          try {
              if (
                  utils._LCvalidateName(sap.ui.getCore().byId("IC_id_EmployeeName"), "ID") &&
                  utils._LCvalidateMandatoryField(sap.ui.getCore().byId("IC_id_Designation"), "ID") &&
                  utils._LCvalidateEmail(sap.ui.getCore().byId("IC_id_Email"), "ID") &&
                  utils._LCvalidateDate(sap.ui.getCore().byId("IC_id_DateBirth"), "ID") &&
                  utils._LCvalidateMobileNumber(sap.ui.getCore().byId("IC_id_Mobile"), "ID") &&
                  utils._LCvalidateMandatoryField(sap.ui.getCore().byId("IC_id_bloodGroup"), "ID")) {  
              } else {
                  sap.m.MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value");
              }
          } catch (error) {
              sap.m.MessageToast.show("Technical error, please contact the administrator");
          }
      }      
      }
    );
  }
);
