sap.ui.define([], function () {
    "use strict";
    return {
        _GeneratePDF: function (that, oModel, oCompanyModel, content) {
            setTimeout(function () {
                var { jsPDF } = window.jspdf;
                var doc = new jsPDF({
                    unit: "mm",
                    format: "a4",
                    margins: { left: 30, right: 30 },
                    lineHeight: 1.5,
                    orientation: "portrait",
                });

                var pageWidth = doc.internal.pageSize.getWidth();
                var pageHeight = doc.internal.pageSize.getHeight();
                var margin = 25; // left and right margin
                var paraMargin = 6; // left margin for paragraphs
                var topMargin = 30;
                var footerHeight = 25; // reserve 25 units at the bottom for footer
                var maxWidth = pageWidth - 2 * margin; // usable width
                var pageMiddle = pageWidth / 2;
                let currentYPosition = 10; // Initial Y Position
                const backImgX = (pageWidth - 100) / 2; // Center horizontally
                const backImgY = (pageHeight - 100) / 2; // Center vertically
                const bottomLimit = pageHeight - footerHeight;
                let currentY;

                doc.setFont("times").setFontSize(12);

                function checkPageBreak(currentYPosition) {

                    if (currentYPosition >= bottomLimit) {
                        doc.addPage(); // Add a new page if the current position exceeds the limit
                        doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 145, 8, 45, 10);
                        doc.setGState(new doc.GState({ opacity: 0.1 }));
                        doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                        doc.setGState(new doc.GState({ opacity: 1 }));
                        currentYPosition = topMargin; // Reset to top margin on the new page
                    }
                    return currentYPosition; // Return updated Y position
                }

                doc.addImage(oCompanyModel.companylogo64, "PNG", margin, currentYPosition, 45, 45);
                doc.setGState(new doc.GState({ opacity: 0.1 }));
                doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                doc.setFontSize(12);

                let addressLines = doc.splitTextToSize(oCompanyModel.longAddress, 75);
                let addressY = currentYPosition + 15;
                addressLines.forEach((line) => {
                    let textWidth = doc.getTextWidth(line); // Measure text width
                    let xPosition = pageWidth - textWidth - margin; // Align to right

                    doc.text(line, xPosition, addressY);
                    addressY += 6.5;
                });

                let mobileNo = oCompanyModel.mobileNo;
                let mobileWidth = doc.getTextWidth(mobileNo);
                let mobileX = pageWidth - mobileWidth - margin;
                doc.text(mobileNo, mobileX, addressY);

                let emailY = addressY + 6.5;
                let carrerEmail = oCompanyModel.carrerEmail;
                let carrerEmailWidth = doc.getTextWidth(carrerEmail);
                let emailX = pageWidth - carrerEmailWidth - margin;
                doc.text(carrerEmail, emailX, emailY);

                let dateY = 65;
                doc.text(oModel.CreateDate, margin, dateY);

                let currentAfterDateY = dateY;
                if (oModel.Type === "Employee Offer") {
                    doc.setFont("times", "bold");
                    let empNameY = currentAfterDateY + 10;
                    doc.text(oModel.EmpName, margin, empNameY);

                    doc.setFont("times", "normal");
                    let empRoleY = empNameY + 6.5;
                    doc.text(oModel.EmpRole, margin, empRoleY);

                    let empAddressLines = doc.splitTextToSize(
                        oModel.EmpAddress,
                        65
                    );
                    let empAddressY = empRoleY + 6.5;
                    empAddressLines.forEach((line) => {
                        doc.text(line, margin, empAddressY);
                        empAddressY += 6;
                    });
                    currentAfterDateY = empAddressY - 6;
                }

                let titleY = currentAfterDateY + 11;
                let titleText = content[0].Title;
                doc.setFont("times", "bold").setFontSize(14);
                let textWidth = doc.getTextWidth(titleText);
                let titleX = (pageWidth - textWidth) / 2;
                doc.text(titleText, titleX, titleY);
                doc.setFont("times", "normal").setFontSize(12.5);

                let titleContentY = titleY + 10; // Initial Y position after titleY

                for (let i = 0; i < 10; i++) {
                    if (oModel.StipendSkipLine && i === oModel.StipendSkipLine - 1) continue;
                    if (oModel.TrainingFeesSkipLine && i === oModel.TrainingFeesSkipLine - 1) continue;
                    if (!content[i]?.TitleContent) break;  // Break the loop if TitleContent doesn't exist

                    // Evaluate TitleContent dynamically
                    let titleContent = new Function("oCompanyModel", "oModel", `return ${content[i].TitleContent};`)(oCompanyModel, oModel);
                    let titleContentLines = doc.splitTextToSize(titleContent, maxWidth);

                    titleContentLines.forEach((line, lineIndex) => {
                        let words = line.split(" ");
                        let totalWords = words.length;
                        let lineWidth = doc.getTextWidth(line);
                        let spaceWidth = doc.getTextWidth(" ");
                        let currentX = margin;

                        if (lineIndex < titleContentLines.length - 1) {
                            // Justify all lines except the last line
                            let extraSpace = totalWords > 1 ? (maxWidth - lineWidth) / (totalWords - 1) : 0;

                            words.forEach((word, index) => {
                                // Check if the word should be bold
                                if (word === "WHEREAS" || word.includes("Kalpavriksha Technologies")) {
                                    doc.setFont("times", "bold");
                                } else {
                                    doc.setFont("times", "normal");
                                }

                                doc.text(word, currentX, titleContentY);
                                currentX += doc.getTextWidth(word) + spaceWidth + (index < totalWords - 1 ? extraSpace : 0);
                            });

                        } else {
                            // Left-align the last line of the paragraph
                            words.forEach((word) => {
                                if (word === "WHEREAS" || word.includes("Kalpavriksha Technologies")) {
                                    doc.setFont("times", "bold");
                                } else {
                                    doc.setFont("times", "normal");
                                }

                                doc.text(word, currentX, titleContentY);
                                currentX += doc.getTextWidth(word) + spaceWidth;
                            });
                        }

                        titleContentY += 6.2; // Move down after each line
                    });

                    titleContentY += 5.5;  // Add extra spacing after each block of TitleContent
                }

                let contentafterTitleContentY = titleContentY;
                if (oModel.Type === "Employee Offer") {
                    doc.setFont("times", "bold");
                    let title3Y = contentafterTitleContentY + 2;
                    let title3 = new Function("oModel", `return ${content[2].Title};`)(oModel);
                    doc.text(title3, margin, title3Y);

                    let title4Y = title3Y + 11;
                    let title4 = new Function("oModel", `return ${content[3].Title};`)(oModel);
                    doc.text(title4, margin, title4Y);

                    currentY = title4Y + 11; // Start initial Y position
                    doc.setFont("times", "bold");

                    const maxPoints = 25; // Loop limit to handle up to 25 points

                    for (let i = 1; i <= maxPoints; i++) {
                        if (!content[i - 1]?.PointNo || !content[i - 1]?.PointTitle) break; // Break if data is missing to avoid errors
                        currentY += 3; // Add extra spacing between points
                        currentY = checkPageBreak(currentY);
                        // Add Point Number and Point Title
                        doc.setTextColor(0, 111, 191);
                        doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);
                        doc.text(content[i - 1].PointTitle, margin + paraMargin, currentY);
                        doc.setTextColor(0, 0, 0);

                        doc.setFont("times", "normal");
                        currentY += 11; // Increment Y position for the content section

                        let pointContentY = currentY;
                        let pointContentTemplate = new Function("oCompanyModel", "oModel", `return ${content[i - 1].PointDesc};`)(oCompanyModel, oModel);

                        let pointContentParas = pointContentTemplate.split(`\n\n`); // Split content by paragraphs

                        // Loop through each paragraph in the PointDesc
                        pointContentParas.forEach((paragraph) => {
                            let pointContentLines = doc.splitTextToSize(paragraph, maxWidth - paraMargin); // Break paragraph into lines

                            pointContentLines.forEach((line, lineIndex) => {
                                let words = line.split(" ");
                                let totalWords = words.length;

                                // Calculate line width and space width
                                let lineWidth = doc.getTextWidth(line);
                                let spaceWidth = doc.getTextWidth(" ");

                                // Apply the page-break check
                                pointContentY = checkPageBreak(pointContentY);

                                if (lineIndex < pointContentLines.length - 1) {
                                    // Justify all lines except the last line of each paragraph
                                    let extraSpace = totalWords > 1 ? ((maxWidth - paraMargin) - lineWidth) / (totalWords - 1) : 0;
                                    let currentX = margin + paraMargin;

                                    words.forEach((word, index) => {
                                        doc.text(word, currentX, pointContentY);
                                        currentX += doc.getTextWidth(word) + spaceWidth + (index < totalWords - 1 ? extraSpace : 0);
                                    });
                                } else {
                                    // Last line of the paragraph left-aligned
                                    doc.text(line, margin + paraMargin, pointContentY);
                                }

                                pointContentY += 6.2; // Increment Y position after each line
                            });

                            pointContentY += 3; // Add extra spacing between paragraphs
                        });

                        currentY = pointContentY; // Update Y position for the next PointTitle
                        doc.setFont("times", "bold");
                    }
                    contentafterTitleContentY = currentY;
                }

                if (oModel.Type === "Employee Offer") {
                    if (contentafterTitleContentY > bottomLimit - 90) {
                        doc.addPage();
                        doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 145, 8, 45, 10);
                        doc.setGState(new doc.GState({ opacity: 0.1 }));
                        doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                        doc.setGState(new doc.GState({ opacity: 1 }));
                        contentafterTitleContentY = topMargin;
                    }
                }

                doc.setFont("times", "bold").setFontSize(12);
                let forCoNameY = contentafterTitleContentY + 10;
                doc.text(`For ${oCompanyModel.companyName}.`, margin, forCoNameY);

                let coSignY = forCoNameY + 5;
                doc.addImage(oCompanyModel.signature64, "PNG", margin, coSignY, 57, 13);

                let headofCoNameY = coSignY + 20;
                doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

                doc.setFont("times", "normal");
                let headofCoRoleY = headofCoNameY + 5;
                doc.text(oCompanyModel.designation, margin, headofCoRoleY);

                let acceptTCVisY = headofCoRoleY + 15;
                if (oModel.Type === "Employee Offer") {
                    let acceptTCY = acceptTCVisY;
                    doc.text("I have read and accept the terms and conditions:", margin, acceptTCY);
                    acceptTCVisY = acceptTCY + 15;
                }

                let cNameY = acceptTCVisY;
                doc.text("Candidate Name: .................................................", margin, cNameY);

                let cJoinDate = cNameY + 11;
                doc.text("Date of Joining: ...................................................", margin, cJoinDate);

                let cSignY = cJoinDate + 11;
                doc.text("Signature: ............................................................", margin, cSignY);


                if (oModel.Type === "Employee Offer") {
                    doc.addPage();
                    doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 145, 8, 45, 10);
                    doc.setGState(new doc.GState({ opacity: 0.1 }));
                    doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                    doc.setGState(new doc.GState({ opacity: 1 }));

                    let salPageHeader = oModel.PageHeader;
                    doc.setFont("times", "bold").setFontSize(14);
                    let salPageHeaderWidth = doc.getTextWidth(salPageHeader);
                    let salPageHeaderX = (pageWidth - salPageHeaderWidth) / 2;
                    doc.text(salPageHeader, salPageHeaderX, topMargin);

                    let topLineY = topMargin + 10;
                    doc.setLineWidth(0.5);
                    doc.line(margin, topLineY, pageWidth - margin, topLineY);
                    doc.setLineWidth(0.4);

                    doc.setFont("helvetica", "bold");
                    let salTitleY = topLineY + 5;
                    let salTitle = oModel.Title;
                    let salTitleWidth = doc.getTextWidth(salTitle);
                    let salTitleX = (pageWidth - salTitleWidth) / 2;
                    doc.text(salTitle, salTitleX, salTitleY);

                    // Draw underline for salTitle
                    doc.line(salTitleX, salTitleY + 1, salTitleX + salTitleWidth, salTitleY + 1); // Line below the title text

                    let salSubTitleY = salTitleY + 12;
                    let salSubTitle = oModel.SubTitle;
                    let salSubTitleWidth = doc.getTextWidth(salSubTitle);
                    let salSubTitleX = (pageWidth - salSubTitleWidth) / 2;
                    doc.text(salSubTitle, salSubTitleX, salSubTitleY);

                    // Draw underline for salSubTitle
                    doc.line(salSubTitleX, salSubTitleY + 1, salSubTitleX + salSubTitleWidth, salSubTitleY + 1);
                    doc.setLineWidth(0.5);

                    var headers = oModel.Headers;
                    doc.setFontSize(11);

                    let headerY = salSubTitleY + 12; // Initial Y position

                    for (let i = 1; i <= headers.length; i++) {
                        // Break the loop if Title or Text is missing
                        if (!headers[i - 1]?.Title || !headers[i - 1]?.Text) break;

                        // Draw Title with bold font
                        doc.setFont("helvetica", "bold");
                        doc.text(headers[i - 1].Title, margin + 5, headerY);

                        // Draw Text with normal font
                        doc.text(`: ${headers[i - 1].Text}`, margin + 25, headerY);

                        // Increment Y position for the next header (adjust as per line height)
                        headerY += 8;
                    }

                    doc.setLineWidth(1);
                    doc.line(margin, headerY, pageWidth - margin, headerY);

                    let yearlyCompTitleY = headerY + 5;
                    doc.setFont("helvetica", "bold");
                    let yearlyCompTitle = "Yearly Components";
                    let yearlyCompTitleWidth = doc.getTextWidth(yearlyCompTitle);
                    let yearlyCompTitleX = (pageWidth - yearlyCompTitleWidth) / 2;
                    let yearlyCompTitleBotLineY = yearlyCompTitleY + 2;
                    doc.line(margin, yearlyCompTitleBotLineY, pageWidth - margin, yearlyCompTitleBotLineY);
                    doc.setLineWidth(0.5);
                    doc.setFillColor(191, 191, 191);
                    doc.rect(margin, headerY, maxWidth, yearlyCompTitleBotLineY - headerY, 'F');
                    doc.text(yearlyCompTitle, yearlyCompTitleX, yearlyCompTitleY);

                    doc.setFont("helvetica", "normal");
                    var yearlyComponents = oModel.YearlyComponents;
                    let monCurrentY = yearlyCompTitleBotLineY + 5;  // Initial Y position

                    for (let i = 1; i <= yearlyComponents.length - 1; i++) {

                        // Draw Title on the left
                        doc.text(yearlyComponents[i].Title, margin + 3, monCurrentY);

                        // Draw Text on the right, aligned to the right side
                        let compText = yearlyComponents[i].Text;
                        let compTextWidth = doc.getTextWidth(compText);
                        let compTextX = pageWidth - compTextWidth - margin - 3;
                        doc.text(compText, compTextX, monCurrentY);

                        // Draw a line under each item
                        let botLineY = monCurrentY + 2;
                        doc.line(margin, botLineY, pageWidth - margin, botLineY);

                        // Increment Y position for the next item
                        monCurrentY = botLineY + 5;
                    }

                    doc.setFont("helvetica", "bold");
                    let monComp0Y = monCurrentY;
                    doc.text(yearlyComponents[0].Title, margin + 3, monComp0Y);
                    let monComp0Text = yearlyComponents[0].Text;
                    let monComp0TextWidth = doc.getTextWidth(monComp0Text);
                    let monComp0TextX = pageWidth - monComp0TextWidth - margin - 3;
                    doc.text(monComp0Text, monComp0TextX, monComp0Y);
                    let monComp0BotLineY = monComp0Y + 2;
                    doc.setLineWidth(1);
                    doc.line(margin, monComp0BotLineY, pageWidth - margin, monComp0BotLineY);

                    let deductionsTitleY = monComp0BotLineY + 5;
                    let deductionsTitle = "Deductions";
                    let deductionsTitleWidth = doc.getTextWidth(deductionsTitle);
                    let deductionsTitleX = (pageWidth - deductionsTitleWidth) / 2;
                    let deductionsTitleBotLineY = deductionsTitleY + 2;
                    doc.line(margin, deductionsTitleBotLineY, pageWidth - margin, deductionsTitleBotLineY);
                    doc.setLineWidth(0.5);
                    doc.setFillColor(191, 191, 191);
                    doc.rect(margin, monComp0BotLineY, maxWidth, deductionsTitleBotLineY - monComp0BotLineY, 'F');
                    doc.text(deductionsTitle, deductionsTitleX, deductionsTitleY);

                    doc.setFont("helvetica", "normal");
                    var deductions = oModel.Deductions;
                    let dedCurrentY = deductionsTitleBotLineY + 5;  // Initial Y position

                    for (let i = 1; i <= deductions.length - 1; i++) {

                        // Draw Title on the left
                        doc.text(deductions[i].Title, margin + 3, dedCurrentY);

                        // Draw Text on the right, aligned to the right side
                        let compText = deductions[i].Text;
                        let compTextWidth = doc.getTextWidth(compText);
                        let compTextX = pageWidth - compTextWidth - margin - 3;
                        doc.text(compText, compTextX, dedCurrentY);

                        // Draw a line under each item
                        let botLineY = dedCurrentY + 2;
                        doc.line(margin, botLineY, pageWidth - margin, botLineY);

                        // Increment Y position for the next item
                        dedCurrentY = botLineY + 5;
                    }

                    doc.setFont("helvetica", "bold");
                    let deductions0Y = dedCurrentY;
                    doc.text(deductions[0].Title, margin + 3, deductions0Y);
                    let deductions0Text = deductions[0].Text;
                    let deductions0TextWidth = doc.getTextWidth(deductions0Text);
                    let deductions0TextX = pageWidth - deductions0TextWidth - margin - 3;
                    doc.text(deductions0Text, deductions0TextX, deductions0Y);
                    let deductions0BotLineY = deductions0Y + 2;
                    doc.setLineWidth(1);
                    doc.line(margin, deductions0BotLineY, pageWidth - margin, deductions0BotLineY);

                    let varCompTitleY = deductions0BotLineY + 5;
                    let varCompTitle = "Variable Component";
                    let varCompTitleWidth = doc.getTextWidth(varCompTitle);
                    let varCompTitleX = (pageWidth - varCompTitleWidth) / 2;
                    let varCompTitleBotLineY = varCompTitleY + 2;
                    doc.line(margin, varCompTitleBotLineY, pageWidth - margin, varCompTitleBotLineY);
                    doc.setLineWidth(0.5);
                    doc.setFillColor(191, 191, 191);
                    doc.rect(margin, deductions0BotLineY, maxWidth, varCompTitleBotLineY - deductions0BotLineY, 'F');
                    doc.text(varCompTitle, varCompTitleX, varCompTitleY);

                    doc.setFont("helvetica", "normal");
                    var varComp = oModel.VariableComponents;
                    let varCompCurrentY = varCompTitleBotLineY + 5;  // Initial Y position

                    for (let i = 1; i <= varComp.length - 1; i++) {

                        // Draw Title on the left
                        doc.text(varComp[i].Title, margin + 3, varCompCurrentY);

                        // Draw Text on the right, aligned to the right side
                        let compText = varComp[i].Text;
                        let compTextWidth = doc.getTextWidth(compText);
                        let compTextX = pageWidth - compTextWidth - margin - 3;
                        doc.text(compText, compTextX, varCompCurrentY);

                        // Draw a line under each item
                        let botLineY = varCompCurrentY + 2;
                        doc.line(margin, botLineY, pageWidth - margin, botLineY);

                        // Increment Y position for the next item
                        varCompCurrentY = botLineY + 5;
                    }

                    doc.setFont("helvetica", "bold");
                    let varComp0Y = varCompCurrentY;
                    doc.text(varComp[0].Title, margin + 3, varComp0Y);
                    let varComp0Text = varComp[0].Text;
                    let varComp0TextWidth = doc.getTextWidth(varComp0Text);
                    let varComp0TextX = pageWidth - varComp0TextWidth - margin - 3;
                    doc.text(varComp0Text, varComp0TextX, varComp0Y);
                    let varComp0BotLineY = varComp0Y + 2;
                    doc.setLineWidth(1);
                    doc.line(margin, varComp0BotLineY, pageWidth - margin, varComp0BotLineY);

                    let grossTitleY = varComp0BotLineY + 5;
                    let grossTitle = "Gross Pay";
                    let grossTitleWidth = doc.getTextWidth(grossTitle);
                    let grossTitleX = (pageWidth - grossTitleWidth) / 2;
                    let grossTitleBotLineY = grossTitleY + 2;
                    doc.line(margin, grossTitleBotLineY, pageWidth - margin, grossTitleBotLineY);
                    doc.setLineWidth(0.5);
                    doc.setFillColor(191, 191, 191);
                    doc.rect(margin, varComp0BotLineY, maxWidth, grossTitleBotLineY - varComp0BotLineY, 'F');
                    doc.text(grossTitle, grossTitleX, grossTitleY);

                    var gross = oModel.GrossPay;
                    let grossCurrentY = grossTitleBotLineY + 5;  // Initial Y position

                    for (let i = 1; i <= gross.length - 1; i++) {

                        // Draw Title on the left
                        doc.text(gross[i].Title, margin + 3, grossCurrentY);

                        // Draw Text on the right, aligned to the right side
                        let compText = gross[i].Text;
                        let compTextWidth = doc.getTextWidth(compText);
                        let compTextX = pageWidth - compTextWidth - margin - 3;
                        doc.text(compText, compTextX, grossCurrentY);

                        // Draw a line under each item
                        let botLineY = grossCurrentY + 2;
                        doc.line(margin, botLineY, pageWidth - margin, botLineY);

                        // Increment Y position for the next item
                        grossCurrentY = botLineY + 5;
                    }

                    doc.setFont("helvetica", "bold");
                    let gross0Y = grossCurrentY;
                    doc.text(gross[0].Title, margin + 3, gross0Y);
                    let gross0Text = gross[0].Text;
                    let gross0TextWidth = doc.getTextWidth(gross0Text);
                    let gross0TextX = pageWidth - gross0TextWidth - margin - 3;
                    doc.text(gross0Text, gross0TextX, gross0Y);
                    let gross0BotLineY = gross0Y + 2;
                    doc.line(margin, gross0BotLineY, pageWidth - margin, gross0BotLineY);

                    let grossPayLineTopY = gross0BotLineY + 7;
                    doc.setLineWidth(1);
                    doc.line(margin, grossPayLineTopY, pageWidth - margin, grossPayLineTopY);

                    doc.setTextColor(255, 255, 255);
                    let grossPayY = grossPayLineTopY + 5;
                    let grossPayText = oModel.EmpCTC;
                    let grossPayTextWidth = doc.getTextWidth(grossPayText);
                    let grossPayTextX = pageWidth - grossPayTextWidth - margin - 3;
                    let grossPayBotLineY = grossPayY + 2;
                    doc.line(margin, grossPayBotLineY, pageWidth - margin, grossPayBotLineY);
                    doc.setLineWidth(0.5);
                    doc.setFillColor(128, 128, 128);
                    doc.rect(margin, grossPayLineTopY, maxWidth, grossPayBotLineY - grossPayLineTopY, 'F');
                    doc.text("COST TO COMPANY", margin + 3, grossPayY);
                    doc.text(grossPayText, grossPayTextX, grossPayY);
                    doc.setTextColor(0, 0, 0);

                    doc.line(pageMiddle + 10, yearlyCompTitleBotLineY, pageMiddle + 10, monComp0BotLineY);
                    doc.line(pageMiddle + 10, deductionsTitleBotLineY, pageMiddle + 10, deductions0BotLineY);
                    doc.line(pageMiddle + 10, varCompTitleBotLineY, pageMiddle + 10, varComp0BotLineY);
                    doc.line(pageMiddle + 10, grossTitleBotLineY, pageMiddle + 10, grossPayBotLineY);
                    doc.line(margin, topLineY, margin, grossPayBotLineY);
                    doc.line(pageWidth - margin, topLineY, pageWidth - margin, grossPayBotLineY);

                    doc.setFontSize(12);
                    let salNoteTitleY = grossPayBotLineY + 10;
                    salNoteTitleY = checkPageBreak(salNoteTitleY);
                    var salNotes = oModel.Notes;
                    doc.text("NOTE:", margin, salNoteTitleY);
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(11);

                    let salNoteTextY = salNoteTitleY + 8; // Initial Y position after salNoteTitleY

                    for (let i = 1; i <= salNotes.length; i++) {
                        if (!salNotes[i]?.Text) break;  // Break loop if no text exists at index i

                        let salNotesTextLines = doc.splitTextToSize(salNotes[i].Text, maxWidth - 5); // Split text into lines
                        salNoteTextY = checkPageBreak(salNoteTextY); // Apply page-break check

                        salNotesTextLines.forEach((line) => {
                            doc.text(line, margin + 5, salNoteTextY);  // Draw each line of text
                            salNoteTextY += 6;  // Increment Y position for the next line
                        });

                        salNoteTextY += 3;  // Add extra spacing between blocks
                    }

                    if (salNotes[0].Text != "0") {
                        doc.setFont("helvetica", "bold").setFontSize(12);
                        let salNoteText0Y = salNoteTextY + 3;
                        doc.text(`${salNotes[0].Title} ${salNotes[0].Text}`, margin, salNoteText0Y);
                    }
                }
                doc.save(`${oModel.EmpName} ${oModel.Type} Letter.pdf`);
                that.closeBusyDialog();
            }, 1000);
        }
    };
});