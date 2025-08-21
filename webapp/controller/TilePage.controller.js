sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/m/MessageBox"
  ],
  function (BaseController,
    MessageToast,
    utils,
    JSONModel, Formatter, MessageBox) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.TilePage",
      {
        Formatter: Formatter,
        onInit: function () {
          this._autoScrollTimer = null;
          this.getRouter()
            .getRoute("RouteTilePage")
            .attachMatched(this._onRouteMatched, this);
        },

        onExit: function () {
          if (this._autoScrollTimer) {
            clearInterval(this._autoScrollTimer);
          }
        },
        _onRouteMatched: async function () {
          if (!this.that) this.that = this.getOwnerComponent().getModel("ThisModel")?.getData().that;
          var LoginFunction = await this.commonLoginFunction("TilePage");
          if (!LoginFunction) return;
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getBusyDialog()
          await this._fetchCommonData("AllLoginDetails", "EmpModel");
          await this._fetchCommonData("EmployeeDetails", "EmpDetails");
          var oChatModel = new JSONModel({
            messages: [],
            messageText: "",
            selectedEmployee: null
          });
          this.getView().setModel(oChatModel);
          var oData = {
            messages: [],
            current_chat: [],
            current_room: "",
            username: "",
            filteredEmployees: [],
            groups: [],
            editIndex: null,
            editMessageID: "",
            isRecording: false,
            isPaused: false,
          };

          var oModel = new JSONModel(oData);
          this.getView().setModel(oModel, "chat");
          sap.ui.getCore().setModel(oModel, "chat");
          const oLoginModel = this.getView().getModel("LoginModel");
          const sCurrentUserID = oLoginModel.getProperty("/EmployeeID");

          const oEmpModel = this.getView().getModel("EmpDetails");
          const aAllEmployees = oEmpModel.getData();
          const aFilteredEmployees = aAllEmployees.filter(function (oEmployee) {
            return oEmployee.EmployeeID !== sCurrentUserID;
          });
          this.getView().getModel("chat").setProperty("/filteredEmployees", aFilteredEmployees);
          this.closeBusyDialog();
          try {
            const response = await this.ajaxReadWithJQuery("Groups", {
              EmployeeID: sCurrentUserID
            });

            const aGroups = response.groups || [];
            this.getView().getModel("chat").setProperty("/groups", aGroups);

            // const oModel = new JSONModel({
            //   groupInfoSections: [
            //     { title: "Overview", icon: "sap-icon://hint", content: "This is the group overview." },
            //     { title: "Members", icon: "sap-icon://group", content: "Member list goes here." },
            //     { title: "Media", icon: "sap-icon://media-pause", content: "Media shared in this group." },
            //     { title: "Files", icon: "sap-icon://course-program", content: "Files shared in this group." },
            //     { title: "Links", icon: "sap-icon://chain-link", content: "Links shared in this group." },
            //     { title: "Event", icon: "sap-icon://appointment-2", content: "Group events appear here." },
            //     { title: "Groups", icon: "sap-icon://company-view", content: "Sub-groups or linked groups." }
            //   ]
            // });
            // this.getView().setModel(oModel);

          } catch (err) {
            this.closeBusyDialog();
            console.error("Failed to fetch filtered employees:", err);
            MessageToast.show("Could not load your contacts");
          }
          this.CreateEmployeeModel();
          this._updateCombinedContacts()
        },

        onPressCC: function () {
          MessageToast.show("Implementation in progress");
        },
        TileV_Quotation: function () {
          this.getRouter().navTo("RouteHrQuotation");
        },
        TileV_EmployeeOffer: function () {
          this.getRouter().navTo("RouteEmployeeOffer", {
            valueEmp: "EmployeeOffer",
          });
        },

        CreateEmployeeModel: function () {
          var empData = this.getView().getModel("EmpModel").getData() || [];
          var filteredData = empData.filter(function (item) {
            return item.Role !== "Trainee" && item.Role !== "Contractor";
          });
          var oFilteredModel = new JSONModel(filteredData);
          this.getOwnerComponent().setModel(oFilteredModel, "EmployeeModel");
        },

        onFloatingButtonPress: function () {
          // this.getRouter().navTo("RouteKTChat");
          var oView = this.getView();
          // Ensure user selection is reset before opening
          if (!this.Chatapp) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.KTChatApp",
              controller: this,

            }).then(
              function (Chatapp) {
                this.Chatapp = Chatapp;
                oView.addDependent(this.Chatapp);
                this.Chatapp.open();
                this.addEventListenerDataFunction();
                sap.ui.getCore().byId("scrollDownButton").setVisible(false)
              }.bind(this)
            );
          } else {
            this.Chatapp.open();
            this.addEventListenerDataFunction();
            sap.ui.getCore().byId("scrollDownButton").setVisible(false)
          }
        },



        onCloseDialog: function () {
          if (this.Chatapp) {
            this.Chatapp.close();
          }
          if (this.messagePollInterval) clearInterval(this.messagePollInterval)
        },

        // changeName: function (oEvent) {
        //   var sName = oEvent.getSource().getValue();
        //   if (!sName.trim()) {
        //     MessageToast.show("Please enter your name.");
        //     return;
        //   }

        //   var oChatModel = sap.ui.getCore().getModel("chat");
        //   oChatModel.setProperty("/username", sName);
        //   MessageToast.show("Name set to: " + sName);
        // },

        onFilterName: function (oEvent) {
          const sQuery = oEvent.getParameter("newValue").trim().toLowerCase();
          const oChatModel = this.getView().getModel("chat");

          // Original data
          const aGroups = oChatModel.getProperty("/groups") || [];
          const aEmployees = oChatModel.getProperty("/filteredEmployees") || [];


          const aGroupsFormatted = aGroups.map(group => ({
            ...group,
            isGroup: true,
            title: group.GroupName,
            icon: "sap-icon://group"
          }));

          // Format employees
          const aEmployeesFormatted = aEmployees.map(emp => ({
            ...emp,
            isGroup: false,
            title: emp.EmployeeName,
            employeeid: emp.EmployeeID,
            icon: emp.ProfilePhoto,
            gender: emp.Gender
          }));

          // Merge
          let aCombined = aGroupsFormatted.concat(aEmployeesFormatted);

          // Apply filter if query is not empty
          if (sQuery) {
            aCombined = aCombined.filter(item =>
              item.title.toLowerCase().includes(sQuery)
            );
          }

          // Update the combined list for the List binding
          oChatModel.setProperty("/combinedList", aCombined);

        },

        // For encoding and decoding base64 strings
        utf8ToBase64: function (str) {
          return btoa(new TextEncoder().encode(str).reduce((data, byte) => data + String.fromCharCode(byte), ""));
        },


        base64ToUtf8: function (b64) {
          const binaryStr = atob(b64);
          const bytes = new Uint8Array([...binaryStr].map(char => char.charCodeAt(0)));
          return new TextDecoder().decode(bytes);
        },
        // onAfterRendering: function () {
        //   const oTextArea = sap.ui.getCore().byId("messageInput1");

        //   if (oTextArea) {
        //     oTextArea.attachBrowserEvent("keydown", (oEvent) => {
        //       if (oEvent.key === "Enter" && !oEvent.shiftKey) {
        //         oEvent.preventDefault(); // Prevent newline
        //         this.sendMessage();     // Call your existing function
        //       }
        //     });
        //   }
        // }
        // ,

        sendMessage: function () {
          const oInput = sap.ui.getCore().byId("messageInput1");
          const sText = oInput.getValue().trim();

          const oChatModel = this.getView().getModel("chat");
          const oLoginModel = this.getView().getModel("LoginModel");

          const sSenderID = oLoginModel.getProperty("/EmployeeID");
          const sSenderName = oLoginModel.getProperty("/EmployeeName");
          const sReceiverID = oChatModel.getProperty("/current_room"); // Can be EmployeeID or GroupID
          const bIsGroup = oChatModel.getProperty("/isGroupChat");

          const oAttachment = oChatModel.getProperty("/pendingAttachment");

          if (!sText && !oAttachment) {
            MessageToast.show("Please enter a message or attach a file.");
            return;
          }
          if (!sSenderID || !sReceiverID) {
            MessageToast.show("Please select a recipient first.");
            return;
          }
          if (oAttachment && oAttachment.file && oAttachment.file.size > 10 * 1024 * 1024) {
            MessageToast.show("Attachment size must be less than 10MB.");
            return;
          }

          // --- EDIT MODE ---
          const sEditPath = oChatModel.getProperty("/editIndex");
          const sEditMsgID = oChatModel.getProperty("/editMessageID");
          if (sEditPath && sEditMsgID) {
            const oPayload = {
              data: {
                MessageID: sEditMsgID,
                MessageText: sText ? this.utf8ToBase64(sText) : "",
                Attachment: oAttachment ? oAttachment.preview : "",
                AttachmentName: oAttachment ? oAttachment.name : "",
                AttachmentType: oAttachment ? oAttachment.type : ""
              },
              filters: { MessageID: sEditMsgID }
            };

            this.ajaxUpdateWithJQuery("ChatApplication", oPayload)
              .then(() => {
                oChatModel.setProperty(sEditPath + "/text", sText);
                oChatModel.setProperty(sEditPath + "/attachment", oAttachment || null);
                oChatModel.setProperty("/editIndex", null);
                oChatModel.setProperty("/editMessageID", null);

                oInput.setValue("");
                oChatModel.setProperty("/pendingAttachment", null);

                if (this._oAttachmentDialog) {
                  this._oAttachmentDialog.close();
                }
                this._playSentSound();
              })
              .catch((err) => {
                MessageToast.show("Failed to update message.");
                console.error(err);
              });

            return;
          }

          // --- CREATE MODE ---
          const oPayload = {
            data: {
              SenderID: sSenderID,
              MessageText: sText ? this.utf8ToBase64(sText) : "",
              Attachment: oAttachment ? oAttachment.preview : "",
              AttachmentName: oAttachment ? oAttachment.name : "",
              AttachmentType: oAttachment ? oAttachment.type : ""
            }
          };

          if (bIsGroup) {
            oPayload.data.GroupID = sReceiverID;
          } else {
            oPayload.data.ReceiverID = sReceiverID;
          }

          this._sendPayloadAndUpdateUI(oPayload, sText, oChatModel, oInput);
        },

        _sendPayloadAndUpdateUI: function (oPayload, sText, oChatModel, oInput) {
          this.ajaxCreateWithJQuery("ChatApplication", oPayload)
            .then(() => {
              const aMsgList = oChatModel.getProperty("/messages") || [];
              const oNewMessage = {
                text: sText.trim(),
                sender: "me",
                time: new Date().toLocaleTimeString()
              };

              if (oPayload.data.Attachment) {
                oNewMessage.attachment = {
                  preview: oPayload.data.Attachment,
                  name: oPayload.data.AttachmentName || "Attachment",
                  type: oPayload.data.AttachmentType || "application/octet-stream"
                };
              }

              aMsgList.push(oNewMessage);
              oChatModel.setProperty("/messages", aMsgList);

              oInput.setValue("");
              oChatModel.setProperty("/pendingAttachment", null);

              if (this._oAttachmentDialog) {
                this._oAttachmentDialog.close();
              }

              setTimeout(() => {
                const oScrollContainer = sap.ui.getCore().byId("chatScrollContainer");
                if (oScrollContainer) {
                  oScrollContainer.scrollTo(0, 999999, 300);
                }
              }, 150);

              this._playSentSound();
            })
            .catch((err) => {
              MessageToast.show("Failed to send message.");
              console.error(err);
            });
        },
        onRecordAudioPress: async function() {
                    try {
                        var oModel = this.getView().getModel("chat");
                        oModel.setProperty("/isRecording", true);
                        oModel.setProperty("/isPaused", false); // start fresh, not paused
                        // Request microphone access
                        const stream = await navigator.mediaDevices.getUserMedia({
                            audio: true
                        });
                        this.audioChunks = [];
                        this.mediaRecorder = new MediaRecorder(stream);

                        // Track elapsed recording time
                        this.recordingStartTime = Date.now();
                        this.recordingTimer = setInterval(() => {
                            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                            if (elapsed >= 15) {
                                this._stopRecording();
                            } else {
                                console.log(`Recording: ${elapsed}s`);
                            }
                        }, 500);

                        // Push recorded audio chunks
                        this.mediaRecorder.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                this.audioChunks.push(event.data);
                            }
                        };

                        // When recording stops
                        this.mediaRecorder.onstop = async () => {
                            clearInterval(this.recordingTimer);

                            const audioBlob = new Blob(this.audioChunks, {
                                type: 'audio/webm'
                            });
                            const base64Data = await this._blobToBase64(audioBlob);

                            this.getView().getModel("chat").setProperty("/pendingAttachment", {
                                preview: base64Data,
                                name: "recording_" + Date.now() + ".webm",
                                type: "audio/webm",
                                file: audioBlob
                            });

                            MessageToast.show("Audio ready to send!");
                        };

                        // Start recording
                        this.mediaRecorder.start();
                        MessageToast.show("Recording started. Max 15s.");

                        // Store controls in view model for UI buttons
                        this.getView().getModel("chat").setProperty("/isRecording", true);
                        this.getView().getModel("chat").setProperty("/isPaused", false);

                    } catch (err) {
                        console.error("Mic access error:", err);
                        MessageToast.show("Microphone access denied.");
                    }
                },

                // Pause/Resume recording
                onTogglePauseRecording: function() {
                    var oModel = this.getView().getModel("chat");
                    var bPaused = oModel.getProperty("/isPaused");
                    oModel.setProperty("/isPaused", !bPaused);
                    if (!this.mediaRecorder) return;

                    if (this.mediaRecorder.state === "recording") {
                        this.mediaRecorder.pause();
                        this.getView().getModel("chat").setProperty("/isPaused", true);
                        MessageToast.show("Recording paused.");
                    } else if (this.mediaRecorder.state === "paused") {
                        this.mediaRecorder.resume();
                        this.getView().getModel("chat").setProperty("/isPaused", false);
                        MessageToast.show("Recording resumed.");
                    }
                },

                // Stop recording manually
                onStopRecordingPress: function() {
                    var oModel = this.getView().getModel("chat");
                    oModel.setProperty("/isRecording", false);
                    oModel.setProperty("/isPaused", false);
                    this._stopRecording();
                },

                // Internal stop logic
                _stopRecording: function() {
                    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
                        this.mediaRecorder.stop();
                        this.getView().getModel("chat").setProperty("/isRecording", false);
                    }
                },

                _blobToBase64: function(blob) {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                },
        _playSentSound: function () {
          const oAudio = new Audio(jQuery.sap.getModulePath("sap.kt.com.minihrsolution", "/Audio/KT_Message.mp3"));
          oAudio.play().catch((error) => {
            console.warn("Sound test failed:", error);
          });
        },
        _playReceiveSound: function () {
          const oAudio = new Audio(jQuery.sap.getModulePath("sap.kt.com.minihrsolution", "/Audio/Receive message.mp3"));
          oAudio.play().catch((error) => {
            console.warn("Receive sound failed:", error);
          });
        },

        onFileChange: function (oEvent) {
          const oFile = oEvent.getParameter("files")?.[0];
          if (!oFile) return;

          const oChatModel = this.getView().getModel("chat");

          const oAttachmentData = {
            file: oFile,
            name: oFile.name,
            type: oFile.type,
            preview: ""
          };

          const reader = new FileReader();
          reader.onload = (e) => {
            oAttachmentData.preview = e.target.result;
            oChatModel.setProperty("/pendingAttachment", oAttachmentData);

            // Open preview dialog
            if (!this._oAttachmentDialog) {
              this._oAttachmentDialog = sap.ui.xmlfragment(this.getView().getId(),
                "sap.kt.com.minihrsolution.fragment.AttachmentPreview",
                this
              );
              this.getView().addDependent(this._oAttachmentDialog);
            }
            this._oAttachmentDialog.open();
          };
          reader.readAsDataURL(oFile);
        },


        onPressGoToMaster: function (oEvent) {
          const oSelected = oEvent.getSource().getBindingContext("chat").getObject();
          const sReceiverID = oSelected.EmployeeID;
          const sReceiverName = oSelected.EmployeeName;
          var busylist = sap.ui.getCore().byId("chatList");

          const oChatModel = this.getView().getModel("chat");
          const oLoginModel = this.getView().getModel("LoginModel");
          const sSenderID = oLoginModel.getProperty("/EmployeeID");
          oChatModel.setProperty("/isGroupChat", false);
          const sReceiverPic = oSelected.ProfilePhoto?.startsWith("data:")
            ? oSelected.ProfilePhoto
            : `data:image/jpeg;base64,${oSelected.ProfilePhoto}`;


          oChatModel.setProperty("/current_room", sReceiverID);
          oChatModel.setProperty("/currentReceiverName", sReceiverName);
          oChatModel.setProperty("/currentReceiverPic", sReceiverPic);
          oChatModel.setProperty("/username", oLoginModel.getProperty("/EmployeeName"));
          oChatModel.setProperty("/messages", []);

          oChatModel.setProperty("/current_room", sReceiverID);
          oChatModel.setProperty("/currentReceiverPic", sReceiverPic);

          oChatModel.setProperty("/currentReceiverName", sReceiverName);
          oChatModel.setProperty("/username", oLoginModel.getProperty("/EmployeeName"));
          oChatModel.setProperty("/messages", []); // Clear previous messages

          const fetchMessages = () => {
            busylist.setBusy(true);

            oChatModel.setProperty("/currentReceiverIsGroup", true);

            // Get old messages to compare
            const aOldMessages = oChatModel.getProperty("/messages") || [];

            this.ajaxReadWithJQuery("getMessagesBetweenUsers", {
              SenderID: sSenderID,
              ReceiverID: sReceiverID
            }).then((response) => {
              busylist.setBusy(false);
              const aServerMessages = response.results || [];
              const aMessages = [];

              aServerMessages.forEach((msg) => {
                const decodedText = this.base64ToUtf8(msg.MessageText || "");

                const isMine = msg.Sender === oLoginModel.getProperty("/EmployeeName");

                const base64Decoded = atob(msg.Attachment || "");
                const isFullDataURL = base64Decoded.startsWith("data:");

                const sMimeType = msg.AttachmentType || "image/jpeg";

                const sPreview = msg.Attachment
                  ? (isFullDataURL
                    ? base64Decoded
                    : `data:${sMimeType};base64,${msg.Attachment}`)
                  : "";

                const oMessage = {
                  text: decodedText,
                  sender: isMine ? "me" : "them",
                  time: new Date(msg.SentAt).toLocaleTimeString(),
                  MsgId: msg.MessageID,
                  attachment: msg.Attachment ? {
                    preview: sPreview,
                    name: msg.AttachmentName || "Attachment",
                    type: sMimeType
                  } : null
                };
                aMessages.push(oMessage);
              });

              //  Play receive sound if new message from "them" is found
              const oldLength = aOldMessages.length;
              const newLength = aMessages.length;

              if (newLength > oldLength) {
                const newMessages = aMessages.slice(oldLength);
                const hasNewIncoming = newMessages.some(msg => msg.sender === "them");

                if (hasNewIncoming) {
                  this._playReceiveSound();
                }
              }

              oChatModel.setProperty("/messages", aMessages);

              // setTimeout(() => {
              //   const oScrollContainer = sap.ui.getCore().byId("chatScrollContainer");
              //   if (oScrollContainer) {
              //     oScrollContainer.scrollTo(0, 999999, 300);
              //   }
              // }, 150);

              const oTitle = sap.ui.getCore().byId("headerTitle");
              if (oTitle) {
                oTitle.setText(sReceiverName);
              }

            }).catch((err) => {
              busylist.setBusy(false);
              MessageToast.show("Failed to load messages");
              console.error(err);
            });
          };

          fetchMessages();

          if (this.messagePollInterval) clearInterval(this.messagePollInterval);
          this.messagePollInterval = setInterval(fetchMessages, 15000);
        },

        formatAttachmentHTML: function (oAttachment) {
          if (!oAttachment || !oAttachment.preview || !oAttachment.type) {
            return "";
          }
          const sPreview = oAttachment.preview;
          const sName = oAttachment.name || "Attachment";
          const sMimeType = oAttachment.type;

          // If it's an image, don't render download link here
          if (sMimeType.startsWith("image/")) {
            return "";
          } else if (sMimeType === "application/pdf") {
            return "";
          }else if (sMimeType.startsWith("audio/")) {
            return "";
          }

          // Render HTML download link for non-image files
          return `
          <a 
            href="${sPreview}" 
            download="${sName}" 
            target="_blank"
            style="color: #0a6ed1; text-decoration: underline;">
            📎 ${sName}
          </a>
        `;
        }
        ,
        onAttachmentPress: function (oEvent) {
          const oSource = oEvent.getSource();
          const sUrl = oSource.data("url");
          const sName = oSource.data("name") || "attachment";
          const sType = oSource.getBindingContext("chat").getProperty("attachment/type");

          if (!this._oAttachmentPreview) {
            this._oAttachmentPreview = sap.ui.xmlfragment(
              "sap.kt.com.minihrsolution.fragment.ImagePreview",
              this
            );
            this.getView().addDependent(this._oAttachmentPreview);
          }

          const oImage = sap.ui.getCore().byId("idPreviewImage");
          const oPdf = sap.ui.getCore().byId("idPreviewPdf");

          // Reset visibility
          oImage.setVisible(false);
          oPdf.setVisible(false);

          if (sType && sType.startsWith("image/")) {
            // Show image preview
            oImage.setSrc(sUrl);
            oImage.setVisible(true);
          } else if (sType === "application/pdf") {
            let pdfSrc = "";

            if (sUrl.startsWith("data:application/pdf")) {
              pdfSrc = sUrl;
            } else if (sUrl.startsWith("http") || sUrl.startsWith("/")) {
              pdfSrc = sUrl;
            } else {
              pdfSrc = "data:application/pdf;base64," + sUrl;
            }

            oPdf.setSource(pdfSrc);
            oPdf.setVisible(true);
          } else {
            // Direct download for others (Excel, Word, PPT)
            const link = document.createElement("a");
            link.href = sUrl;
            link.download = sName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return; // no preview dialog
          }

          // Store download data
          this._oAttachmentPreview.data("downloadUrl", sUrl);
          this._oAttachmentPreview.data("downloadName", sName);

          this._oAttachmentPreview.open();
        },

        onDownloadAttachment: function () {
          const sUrl = this._oAttachmentPreview.data("downloadUrl");
          const sName = this._oAttachmentPreview.data("downloadName");

          const link = document.createElement("a");
          link.href = sUrl;
          link.download = sName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        },

        onClosePreview: function () {
          if (this._oAttachmentPreview) {
            this._oAttachmentPreview.close();
          }
        }
        ,


        onRemoveAttachment: function () {
          const oChatModel = this.getView().getModel("chat");
          oChatModel.setProperty("/pendingAttachment", {});
        },
        onEmojiPress: function (oEvent) {
          if (!this._oEmojiPopover) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.Emoji",
              controller: this
            }).then((oPopover) => {
              this._oEmojiPopover = oPopover;
              this.getView().addDependent(this._oEmojiPopover);
              this._oEmojiPopover.openBy(oEvent.getSource());
            });
          } else {
            this._oEmojiPopover.openBy(oEvent.getSource());
          }
        }
        ,
        onEmojiSelect: function (oEvent) {
          const sEmoji = oEvent.getSource().getText();
          const oInput = sap.ui.getCore().byId("messageInput1");
          const currentText = oInput.getValue() || "";

          // Append emoji at the end
          oInput.setValue(currentText + sEmoji);

          // Close the popover
          if (this._oEmojiPopover) {
            this._oEmojiPopover.close();
          }
        }
        ,
        closeCall: async function (oEvent) {
          var that = this;
          var date = new Date();
          var endTime = date.getTime();
          if (that.rtc) {
            that.rtc.localAudioTrack.close();
            // that.rtc.localVideoTrack.stop();
            that.rtc.localVideoTrack.close();
            // Traverse all remote users.
            // Destroy the dynamically created DIV containers.
            const playerContainer = document.getElementById('div2');
            playerContainer && playerContainer.remove();
            // Leave the channel.
            await that.client.leave();
          }
        },
        // alertFunc: function () {
        //   var that = this;
        //   var countDownDate = that.appointmentURL.startTime;
        //   var now = new Date().getTime();
        //   var endTime = "10-22-05";

        //   var distance = now - countDownDate;

        //   var hours = that.doubleDigit(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
        //   var minutes = that.doubleDigit(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)));
        //   var seconds = that.doubleDigit(Math.floor((distance % (1000 * 60)) / 1000));

        //   var timeRemaining =
        //     new Date('01/01/2007 ' + endTime.split('-')[1] + ':00').getTime() -
        //     new Date('01/01/2007 ' + endTime.split('-')[0] + ':00').getTime();

        //   var diff = Math.abs(
        //     Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
        //   );
        //   //  Correct usage here
        //   var oRemaining = sap.ui.getCore().byId("idRemaining");
        //   if (oRemaining) {
        //     oRemaining.setText(hours + ':' + minutes + ':' + seconds);

        //     if (parseInt(minutes) > diff) {
        //       oRemaining.setType("Critical");
        //     }
        //   }
        // }
        // ,
        // doubleDigit: function (time) {
        //   return ("0" + time).slice(-2);
        // },
        // onVideoCallPress: async function (oEvent) {
        //   var oButton = oEvent.getSource(),
        //     oView = this.getView();
        //   // Ensure user selection is reset before opening
        //   if (!this._pPopover_video) {
        //     this._pPopover_video = sap.ui.core.Fragment.load({
        //       id: oView.getId(),
        //       name: "sap.kt.com.minihrsolution.fragment.Videocall",
        //       controller: this
        //     }).then(function (oPopover) {
        //       oView.addDependent(oPopover);
        //       return oPopover;
        //     });
        //   }
        //   this._pPopover_video.then(function (oPopover) {
        //     oPopover.openBy(oButton);
        //   });
        //   var that = this;
        //   this.flag = 0;
        //   try {
        //     var that = this;
        //     var date = new Date();
        //     var startTime = date.getTime();
        //     this.appointmentURL = {
        //       startTime: startTime,
        //       channel: "Sapui5",
        //       token: "007eJxTYEhT+33n95rf8x2iBIxWROrsz7ZzX2Cg7iMkGXqFa887lyMKDClpBqmpSRapZokGKSZpZgYWiaZmBuYWlqYGluaGJmmWNQsaMhoCGRlmNPmwMDJAIIjPxhCcWFCaacrAAABVYx7m"
        //     };
        //     this.timeOut = setInterval(function () {
        //       that.alertFunc()
        //     }.bind(that), 1000);
        //     that.rtc = {
        //       // For the local audio and video tracks.
        //       localAudioTrack: null,
        //       localVideoTrack: null,
        //     };
        //     if (this.appointmentURL) {
        //       var options = {
        //         // Pass your app ID here.
        //         appId: "df0eeb8e6a0d4f608a560789509714f9",
        //         // Set the channel name.
        //         channel: this.appointmentURL.channel,
        //         // Set the user role in the channel.
        //         role: "host"
        //       };
        //       var token = this.appointmentURL.token;
        //     }
        //     that.client = AgoraRTC.createClient({
        //       mode: "rtc",
        //       codec: "vp8"
        //     });
        //     var uid = "doctor";
        //     var div = document.createElement("div");
        //     div.id = uid;
        //     div.className = "zoomOut"
        //     that.client.on("user-left", async (user, mediaType) => {
        //       var elem = document.getElementById("id" + user.uid);
        //       elem.parentElement.removeChild(elem);
        //       console.log("left");
        //     });
        //     that.client.on("user-published", async (user, mediaType) => {
        //       await that.client.subscribe(user, mediaType);
        //       console.log("subscribe success");
        //       var uuid = "id" + user.uid;
        //       if (document.getElementById(uuid) == undefined) {
        //         var div = document.createElement("div");
        //         div.id = uuid;
        //         if (that.flag === 0) {
        //           div.className = "zoomIn"
        //         } else {
        //           div.className = "zoomOut"
        //         }
        //         that.buttonUID = uuid;
        //         var button = document.createElement("button");
        //         if (that.flag === 0) {
        //           button.innerHTML = "Unpin";
        //         } else {
        //           button.innerHTML = "Pin";
        //         }
        //         button.className = "zoomButton";
        //         that.flag = 1;
        //         button.addEventListener("click", function (oEvent) {
        //           var a = document.getElementById(uuid).className;
        //           if (a == "zoomOut") {
        //             if (document.getElementsByClassName("zoomIn").length > 0) {
        //               document.getElementsByClassName("zoomIn")[0].className = "zoomOut";
        //             }
        //             document.getElementById(uuid).className = "zoomIn";
        //             oEvent.currentTarget.innerHTML = "Unpin";
        //             var allButtons = document.getElementsByClassName("zoomOut");
        //             for (var i = 1; i < allButtons.length; i++) {
        //               var reqButton = allButtons[i].getElementsByClassName("zoomButton");
        //               if (reqButton.length > 0) {
        //                 reqButton[0].style.display = "none";
        //               }
        //             }
        //           } else {
        //             document.getElementById(uuid).className = "zoomOut";
        //             oEvent.currentTarget.innerHTML = "Pin";
        //             var allButtons = document.getElementsByClassName("zoomOut");
        //             for (var i = 1; i < allButtons.length; i++) {
        //               var reqButton = allButtons[i].getElementsByClassName("zoomButton");
        //               if (reqButton.length > 0) {
        //                 reqButton[0].style.display = "block";
        //               }
        //             }
        //           }
        //         });
        //         div.appendChild(button);
        //         document.getElementById("participant").appendChild(div);
        //       }
        //       const remoteVideoTrack = user.videoTrack;
        //       that.remotePlayerContainer = document.getElementById(uuid);
        //       remoteVideoTrack.play(that.remotePlayerContainer);
        //       if (mediaType === "audio") {
        //         const remoteAudioTrack = user.audioTrack;
        //         remoteAudioTrack.play();
        //       }
        //     });
        //     document.getElementById("participant").appendChild(div);
        //     // that.client.setClientRole(options.role);
        //     await that.client.join(options.appId, options.channel, token, 0);
        //     that.rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        //     that.rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        //     await that.client.publish([that.rtc.localAudioTrack, that.rtc.localVideoTrack]);
        //     that.localPlayerContainer = document.getElementById(uid);
        //     that.rtc.localVideoTrack.play(that.localPlayerContainer);
        //     // Users joins for the first time
        //   } catch (error) {
        //     console.log(error);
        //     var errorMessage;
        //     // Handle Errors here.
        //     if (error && error.message) {
        //       errorMessage = error.message;
        //       if (error.code == 'CAN_NOT_GET_GATEWAY_SERVER') {
        //         errorMessage = "The meeting session is no longer valid. Contact Admin";
        //       }
        //     } else {
        //       errorMessage = "Something went wrong, contact Admin if the error persists";
        //     }
        //     MessageBox.error(errorMessage, {
        //       actions: [MessageBox.Action.CLOSE],
        //       onClose: function (sAction) {
        //         if (sAction == 'CLOSE') {
        //           // Write close operation
        //         }
        //       }
        //     });
        //   };
        // },
        // group chat creation
        onOpenGroupChatDialog: function (oEvent) {
          var oButton = oEvent.getSource(),
            oView = this.getView();
          this.getView().getModel("chat").setProperty("/selectedEmployees", []);

          // Ensure user selection is reset before opening
          if (!this._pPopover) {
            this._pPopover = sap.ui.core.Fragment.load({
              id: oView.getId(),
              name: "sap.kt.com.minihrsolution.fragment.Groupchat",
              controller: this
            }).then(function (oPopover) {
              oView.addDependent(oPopover);
              return oPopover;
            });
          }
          this._pPopover.then(function (oPopover) {
            oPopover.openBy(oButton);
          });
        },
        onMultiEmployeeSelectionChange: function (oEvent) {
          const aSelectedItems = oEvent.getSource().getSelectedItems();
          const oChatModel = this.getView().getModel("chat");

          // Get all employees from model
          const aAllEmployees = oChatModel.getProperty("/filteredEmployees");

          // Get selected employee IDs
          const aSelectedIds = aSelectedItems.map(item => item.getKey());

          // Filter full employee list based on selected IDs
          const aSelectedEmployees = aAllEmployees.filter(emp => aSelectedIds.includes(emp.EmployeeID));

          // Set selected employees to a new model path
          oChatModel.setProperty("/selectedEmployees", aSelectedEmployees);
        }
        ,
        onCreateGroupConfirm: function () {
          const oChatModel = this.getView().getModel("chat");
          const oLoginModel = this.getView().getModel("LoginModel");

          const selectedEmployees = oChatModel.getProperty("/selectedEmployees");
          const groupName = oChatModel.getProperty("/groupName");

          if (!selectedEmployees || selectedEmployees.length === 0) {
            sap.m.MessageToast.show("Please select at least one employee");
            return;
          }

          if (!groupName || groupName.trim() === "") {
            sap.m.MessageToast.show("Please enter a group name");
            return;
          }

          const creatorID = oLoginModel.getProperty("/EmployeeID");
          const creatorName = oLoginModel.getProperty("/EmployeeName");
          const creatorDesignation = oLoginModel.getProperty("/Designation");

          const participantIDs = selectedEmployees.map(emp => emp.EmployeeID);

          //  Ensure creator is included
          if (!participantIDs.includes(creatorID)) {
            participantIDs.push(creatorID);
            selectedEmployees.push({
              EmployeeID: creatorID,
              EmployeeName: creatorName,
              Designation: creatorDesignation
            });
          }

          const payload = {
            data: {
              GroupName: groupName,
              Participants: participantIDs
            }
          };

          this.getBusyDialog();

          this.ajaxCreateWithJQuery("Groups", payload).then((response) => {
            this.closeBusyDialog();

            const newGroup = {
              GroupID: response.GroupID || "group_" + new Date().getTime(), // fallback
              GroupName: groupName,
              Members: selectedEmployees,
              isGroup: true,
              icon: "sap-icon://group"
            };

            // Add to chat model
            const existingGroups = oChatModel.getProperty("/groups") || [];
            existingGroups.push(newGroup);
            oChatModel.setProperty("/groups", existingGroups);

            // Reset UI
            oChatModel.setProperty("/selectedEmployees", []);
            oChatModel.setProperty("/groupName", "");
            this._updateCombinedContacts();
            this.byId("multiEmployeeSelect").removeAllSelectedItems();
            this.byId("myPopover").close();

            sap.m.MessageToast.show("Group created successfully!");
          }).catch((err) => {
            this.closeBusyDialog();
            console.error(err);
            sap.m.MessageToast.show("Failed to create group");
          });
        }
        ,

        onListItemPress: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext("chat");
          const oSelected = oContext.getObject();

          if (oSelected.isGroup) {
            this._openGroupChat(oSelected);
          } else {
            this.onPressGoToMaster(oEvent); // existing single chat function
          }
        },

        _updateCombinedContacts: function () {
          const oChatModel = this.getView().getModel("chat");
          const aGroups = oChatModel.getProperty("/groups") || [];
          const aEmployees = oChatModel.getProperty("/filteredEmployees") || [];

          const aGroupsFormatted = aGroups.map(group => ({
            ...group,
            isGroup: true,
            title: group.GroupName,
            icon: "sap-icon://group"
          }));

          const aEmployeesFormatted = aEmployees.map(emp => ({
            ...emp,
            isGroup: false,
            title: emp.EmployeeName,
            employeeid: emp.EmployeeID,
            icon: emp.ProfilePhoto,
            gender: emp.Gender
          }));

          const aCombined = aGroupsFormatted.concat(aEmployeesFormatted);
          oChatModel.setProperty("/combinedList", aCombined);
        }
        ,
        _openGroupChat: function (oGroup) {
          const oChatModel = this.getView().getModel("chat");
          const oLoginModel = this.getView().getModel("LoginModel");
          const sSenderID = oLoginModel.getProperty("/EmployeeID");
          oChatModel.setProperty("/isGroupChat", true);
          oChatModel.setProperty("/currentReceiverIsGroup", oGroup.IsGroup === true);
          // flipped
          // true if it's a group

          oChatModel.setProperty("/current_room", oGroup.GroupID);
          oChatModel.setProperty("/currentReceiverName", oGroup.GroupName);
          oChatModel.setProperty("/username", oLoginModel.getProperty("/EmployeeName"));
          oChatModel.setProperty("/messages", []);

          oChatModel.setProperty("/selectedGroup", oGroup);

          const fetchGroupMessages = () => {
            this.ajaxReadWithJQuery("Groups", {
              EmployeeID: sSenderID
            }).then((response) => {
              const aMessages = (response.results || []).map(msg => {
                const decodedText = atob(msg.MessageText || "");
                const isMine = msg.Sender === oLoginModel.getProperty("/EmployeeName");

                const base64Decoded = atob(msg.Attachment || "");
                const isFullDataURL = base64Decoded.startsWith("data:");
                const sMimeType = msg.AttachmentType || "image/jpeg";

                const sPreview = msg.Attachment
                  ? (isFullDataURL
                    ? base64Decoded
                    : `data:${sMimeType};base64,${msg.Attachment}`)
                  : "";

                return {
                  text: decodedText,
                  sender: isMine ? "me" : "them",
                  time: new Date(msg.SentAt).toLocaleTimeString(),
                  attachment: msg.Attachment ? {
                    preview: sPreview,
                    name: msg.AttachmentName || "Attachment",
                    type: sMimeType
                  } : null
                };
              });

              oChatModel.setProperty("/messages", aMessages);
              const oTitle = sap.ui.getCore().byId("headerTitle");
              if (oTitle) {
                oTitle.setText(oGroup.GroupName);
              }
            }).catch(err => {
              sap.m.MessageToast.show("Failed to load group messages");
              console.error(err);
            });
          };

          fetchGroupMessages();
          if (this.messagePollInterval) clearInterval(this.messagePollInterval);
          this.messagePollInterval = setInterval(fetchGroupMessages, 15000);
        },

        On_OpenOverview: function (oEvent) {
          const oChatModel = this.getView().getModel("chat");
          const bIsGroup = oChatModel.getProperty("/currentReceiverIsGroup"); // whether the selected user is part of a group
          const oLoginModel = this.getView().getModel("LoginModel");
          const sLoginEmployeeID = oLoginModel.getProperty("/EmployeeID");

          const oSelectedUser = oChatModel.getProperty("/selectedUser"); // Assuming selected user is in the model

          // Example: group information in chat model, modify according to your actual model structure
          const aUserGroups = oLoginModel.getProperty("/UserGroups") || []; // Groups the login user is part of
          const aSelectedUserGroups = oSelectedUser?.Groups || []; // Groups the selected user is part of

          // Check if both the login user and selected user share any group
          const bIsInSameGroup = aUserGroups.some(group => aSelectedUserGroups.includes(group));

          // Add to the "Groups" section if they are in the same group
          const aOriginalSections = [
            { title: "Overview", icon: "sap-icon://hint", content: "This is the group overview." },
            { title: "Members", icon: "sap-icon://collaborate", content: "Member list goes here." },
            { title: "Media", icon: "sap-icon://media-pause", content: "Media shared in this group." },
            { title: "Files", icon: "sap-icon://document", content: "Files shared in this group." },
            { title: "Links", icon: "sap-icon://chain-link", content: "Links shared in this group." },
            { title: "Event", icon: "sap-icon://calendar", content: "Group events appear here." },
            { title: "Groups", icon: "sap-icon://group", content: "Sub-groups or linked groups.", group: bIsInSameGroup ? "Same Group" : "No shared group" },
            { title: "C-icon", icon: "sap-icon://calendar", content: "Group events appear here." }
          ];

          const aFilteredSections = aOriginalSections.filter(section => {
            if (!bIsGroup && section.title === "Groups") return false; // Hide "Groups" if it's a single chat
            if (bIsGroup && section.title === "Members") return false; // Hide "Members" if it's a group chat
            return true;
          });

          // Add the "Groups" section data based on the group membership
          if (bIsInSameGroup) {
            aFilteredSections.push({
              title: "Same Group",
              icon: "sap-icon://group",
              content: "Both users are in the same group."
            });
          }

          // Set filtered sections to the model
          const oInfoModel = new JSONModel({
            groupInfoSections: aFilteredSections
          });
          this.getView().setModel(oInfoModel);

          // Load and open popover
          if (!this._OverViewPopover) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.information",
              controller: this
            }).then((oPopover) => {
              this._OverViewPopover = oPopover;
              this.getView().addDependent(this._OverViewPopover);
              this._OverViewPopover.openBy(oEvent.getSource());
            });
          } else {
            this._OverViewPopover.openBy(oEvent.getSource());
          }
        },

        onInformationSectionPress: function (oEvent) {
          const oSelectedItem = oEvent.getParameter("listItem");
          const oContext = oSelectedItem.getBindingContext();
          const oSectionData = oContext.getObject();

          const oDetailBox = sap.ui.getCore().byId("infoDetailBox");
          const oHeaderText = sap.ui.getCore().byId("infoDetailHeader");

          // Set header title
          oHeaderText.setText(oSectionData.title);
          oDetailBox.removeAllItems();
          oDetailBox.addItem(oHeaderText);

          // Check if the section selected is "Members"
          if (oSectionData.title === "Members") {
            const oGroup = this.getView().getModel("chat").getProperty("/selectedGroup");
            const aMembers = oGroup?.Participants || [];

            oHeaderText.setText(`Members (${aMembers.length})`);

            if (aMembers.length > 0) {
              const oList = new sap.m.List();
              aMembers.forEach(member => {
                oList.addItem(new sap.m.StandardListItem({
                  title: member.EmployeeName,
                  description: member.Designation || member.EmployeeID,
                  icon: "sap-icon://employee",
                  type: "Navigation",
                  press: () => {
                    this.onPressGoToMaster({
                      getSource: () => ({
                        getBindingContext: () => ({
                          getObject: () => member
                        })
                      })
                    });
                  }
                }));
              });
              oDetailBox.addItem(oList);
            } else {
              oDetailText.setText("No members available for this group.");
            }
          }

          //click for profile picture
         else if (oSectionData.title === "C-icon") {
 this._openProfileDialog();
         }

          // Check if the section selected is "Groups"
          else if (oSectionData.title === "Groups") {
            const oLoginModel = this.getView().getModel("LoginModel");
            const sLoginEmployeeID = oLoginModel.getProperty("/EmployeeID");
            const aUserGroups = oLoginModel.getProperty("/UserGroups") || [];

            const oChatModel = this.getView().getModel("chat");
            const oSelectedGroup = oChatModel.getProperty("/selectedGroup");
            const aAllGroups = oChatModel.getProperty("/groups");

            const aMatchingGroups = [];

            // Loop through all groups in chat model
            for (const groupID in aAllGroups) {
              const oGroup = aAllGroups[groupID];
              const aParticipants = oGroup.Participants || [];

              const bLoginUserInGroup = aParticipants.some(p => p.EmployeeID === sLoginEmployeeID);
              const bSelectedUserInGroup = aParticipants.some(p => p.EmployeeID === oSelectedGroup?.EmployeeID);

              if (bLoginUserInGroup && bSelectedUserInGroup) {
                aMatchingGroups.push(oGroup);
              }
            }

            if (aMatchingGroups.length > 0) {
              const oList = new sap.m.List();
              aMatchingGroups.forEach(oGroup => {
                oList.addItem(new sap.m.StandardListItem({
                  title: oGroup.GroupName,
                  description: oGroup.GroupDescription || "No description",
                  icon: "sap-icon://group",
                  type: "Navigation",
                  press: () => {
                    this.onPressGoToMaster({
                      getSource: () => ({
                        getBindingContext: () => ({
                          getObject: () => oGroup
                        })
                      })
                    });
                  }
                }));
              });
              oDetailBox.addItem(oList);
            } else {
              oDetailText.setText("No matching groups found.");
            }
          }


          // For other sections
          else {
            oDetailText.setText(oSectionData.content || "No content available.");
          }
        },

        onScrollToBottom: function () {
          const oScrollContainer = sap.ui.getCore().byId("chatScrollContainer");
          if (oScrollContainer) {
            oScrollContainer.scrollTo(0, 999999, 400);
          }
        },

        //     onAfterRendering: function () {
        //   Formatter.resetDateTracker(); // Very important!
        // }

        addEventListenerDataFunction: function () {
          var oScroll = sap.ui.getCore().byId("chatScrollContainer");
          var oDomRef = oScroll.getDomRef();

          if (oDomRef) {
            oDomRef.addEventListener("scroll", this._handleChatScroll.bind(this));
          }
        },

        _handleChatScroll: function () {
          var oScroll = sap.ui.getCore().byId("chatScrollContainer");
          var oDomRef = oScroll.getDomRef();
          if (!oDomRef) return;

          var scrollTop = oDomRef.scrollTop;
          var scrollHeight = oDomRef.scrollHeight;
          var clientHeight = oDomRef.clientHeight;

          var atBottom = (scrollTop + clientHeight >= scrollHeight - 5);
          sap.ui.getCore().byId("scrollDownButton").setVisible(!atBottom);
        },
        onIconPress: function (oEvent) {
          var oSource = oEvent.getSource();
          var oCtx = oSource.getBindingContext("chat");




          if (!this._oMsgPopover) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.Texthover",
              controller: this
            }).then((oPopover) => {
              this._oMsgPopover = oPopover;
              this.getView().addDependent(this._oMsgPopover);

              if (oCtx.getObject().sender === "them") {
                sap.ui.getCore().byId("id_EditMessage").setVisible(false);
                sap.ui.getCore().byId("id_DeleteMessage").setVisible(false);

              } else {
                sap.ui.getCore().byId("id_EditMessage").setVisible(true);
                sap.ui.getCore().byId("id_DeleteMessage").setVisible(true);

              }

              // store the MessageID directly
              this._oMsgPopover.data("msgID", oCtx);

              this._oMsgPopover.openBy(oSource);
            });
          } else {
            if (oCtx.getObject().sender === "them") {
              sap.ui.getCore().byId("id_EditMessage").setVisible(false);
              sap.ui.getCore().byId("id_DeleteMessage").setVisible(false);

            } else {
              sap.ui.getCore().byId("id_EditMessage").setVisible(true);
              sap.ui.getCore().byId("id_DeleteMessage").setVisible(true);

            }
            this._oMsgPopover.data("msgID", oCtx);
            this._oMsgPopover.openBy(oSource);
          }
        },
        onEditMessage: function () {
          var oCtx = this._oMsgPopover.data("msgID"); // retrieve saved context
          if (oCtx) {
            var oMsgData = oCtx.getObject();
            var oChatModel = this.getView().getModel("chat");

            // Save path & message ID in model for edit mode
            oChatModel.setProperty("/editIndex", oCtx.getPath());
            oChatModel.setProperty("/editMessageID", oMsgData.MsgId);

            // Set text in input field (decoded if needed)
            sap.ui.getCore().byId("messageInput1").setValue(oMsgData.text);
          }
          this._oMsgPopover.close();
        },
        onDeleteMessage: async function () {
          var oMsgPopover = this._oMsgPopover;
          var messageContext = oMsgPopover.data("msgID");
          var messageId = messageContext.getObject().MsgId;

          try {
            await this.ajaxDeleteWithJQuery("ChatApplication", {
              filters: {
                MessageID: [messageId]
              }
            });

            oMsgPopover.close();
            this.getView().getModel("chat").refresh(true);
          } catch (error) {
            console.error("Error deleting message:", error);
          }
        },
        onVoiceMessagePress: function () {
          var that = this;

          // Check browser support
          var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) {
            sap.m.MessageToast.show("Speech recognition is not supported in this browser.");
            return;
          }

          // Create recognition instance
          var recognition = new SpeechRecognition();
          recognition.lang = "en-US"; // Set language
          recognition.interimResults = false; // Only final results

          recognition.onstart = function () {
            sap.m.MessageToast.show("Listening...");
          };

          recognition.onresult = function (event) {
            var spokenText = event.results[0][0].transcript;

            // Set text in the TextArea
            sap.ui.getCore().byId("messageInput1").setValue(spokenText);

            // Also update the model binding if needed
            var oModel = that.getView().getModel("chat");
            if (oModel) {
              oModel.setProperty("/currentMessage", spokenText);
            }
          };

          recognition.onerror = function (event) {
            console.error("Speech recognition error", event.error);
            sap.m.MessageToast.show("Error: " + event.error);
          };

          recognition.start();
        },
        onCancelAttachmentPreview: function () {
          // Close the attachment preview popover
          if (this._oAttachmentDialog) {
            this._oAttachmentDialog.close();
          }
        },
        _openProfileDialog: function() {
    if (!this._oDialog) {
        this._oDialog = new sap.m.Dialog({
            title: "Update Profile Picture",
            content: new sap.ui.unified.FileUploader({
                fileType: ["jpg", "png"],
                change: function(oEvent) {
                    sap.m.MessageToast.show("File selected: " + oEvent.getParameter("newValue"));
                }
            }),

            beginButton: new sap.m.Button({
                text: "Save",
                press: function() {
                  
                    sap.m.MessageToast.show("Profile picture updated!");
                    this._oDialog.close();
                }.bind(this)
            }),
            endButton: new sap.m.Button({
                text: "Cancel",
                press: function() {
                    this._oDialog.close();
                }.bind(this)
            })
        });
    }
    this._oDialog.open();
    },




      }
    );
  }
);





