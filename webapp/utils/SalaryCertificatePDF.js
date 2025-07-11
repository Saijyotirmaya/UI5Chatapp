
sap.ui.define([], function () {
    "use strict";
    return {
        _GeneratePDF: function (that, htmlContent, oCompanyModel, oModel) {
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
            var topMargin = 35;
            var footerHeight = 25; // reserve 25 units at the bottom for footer
            var maxWidth = pageWidth - 2 * margin; // usable width
            var pageMiddle = pageWidth / 2;
            var bottomLimit = pageHeight - footerHeight;
            let currentYPosition = 10; // Initial Y Position

            doc.addImage(oCompanyModel.companylogo64, "PNG", margin, currentYPosition, 45, 45);

            doc.setFont("times").setFontSize(12);
            let dateY = topMargin + 10;
            doc.text(oModel.CreateDate, maxWidth, dateY);

            doc.setFont("times", "bold").setFontSize(12);
            let titleText = oModel.CertificateTitle;
            let titletextWidth = doc.getTextWidth(titleText);
            let titleX = (pageWidth - titletextWidth) / 2;
            let titleY = dateY + 18;
            doc.text(titleText, titleX, titleY);
            doc.setLineWidth(0.4);
            doc.line(titleX, titleY + 1, titleX + titletextWidth + 1, titleY + 1);

            let subTitleText = oModel.CertificateSubTitle;
            let subTitletextWidth = doc.getTextWidth(subTitleText);
            let subTitleX = (pageWidth - subTitletextWidth) / 2;
            let subTitleY = titleY + 10;
            doc.text(subTitleText, subTitleX, subTitleY);
            doc.setLineWidth(0.4);
            doc.line(subTitleX, subTitleY + 1, subTitleX + subTitletextWidth + 1, subTitleY + 1);

            let mmToPx = (mm) => mm * (96 / 48);
            let containerWidthPx = mmToPx(maxWidth);

            let container = document.createElement("div");
            container.innerHTML = htmlContent;
            container.style.width = `${containerWidthPx}px`;
            container.style.fontFamily = "Times New Roman";
            container.style.fontSize = "6.5pt";
            container.style.lineHeight = "1.4";
            container.style.padding = "0";
            document.body.appendChild(container);

            let rteY = subTitleY + 5;
            doc.html(container, {
                x: margin,
                y: rteY,
                html2canvas: { scale: 0.5 },
                callback: function (doc) {
                    const endYmm = findHtmlEndYmm(doc, 1);
                    const backImgX = (pageWidth - 100) / 2;
                    const backImgY = (pageHeight - 100) / 2;
                    doc.setGState(new doc.GState({ opacity: 0.1 }));
                    doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                    doc.setGState(new doc.GState({ opacity: 1 }));
                    footerContent();
                    doc.setLineWidth(0.6);
                    let headerY = pageHeight - endYmm + 10;
                    if (headerY > 180) {
                        doc.addPage();
                        doc.setGState(new doc.GState({ opacity: 0.1 }));
                        doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                        doc.setGState(new doc.GState({ opacity: 1 }));
                        headerY = margin;
                        footerContent();
                    }
                    let tableX = margin + 15;
                    let tablemaxWidth = pageWidth - 2 * tableX;
                    doc.line(tableX, headerY, pageWidth - tableX, headerY);

                    let yearlyCompTitleY = headerY + 3.5;
                    doc.setFont("helvetica", "bold").setFontSize(8);
                    let yearlyCompTitle = "Yearly Components";
                    let yearlyCompTitleWidth = doc.getTextWidth(yearlyCompTitle);
                    let yearlyCompTitleX = (pageWidth - yearlyCompTitleWidth) / 2;
                    let yearlyCompTitleBotLineY = yearlyCompTitleY + 1.5;
                    doc.line(tableX, yearlyCompTitleBotLineY, pageWidth - tableX, yearlyCompTitleBotLineY);
                    doc.setLineWidth(0.3);
                    doc.setFillColor(191, 191, 191);
                    doc.rect(tableX, headerY, tablemaxWidth, yearlyCompTitleBotLineY - headerY, 'F');
                    doc.text(yearlyCompTitle, yearlyCompTitleX, yearlyCompTitleY);

                    doc.setFont("helvetica", "normal");
                    var yearlyComponents = oModel.YearlyComponents;
                    let monCurrentY = yearlyCompTitleBotLineY + 3.5;  // Initial Y position

                    for (let i = 1; i <= yearlyComponents.length - 1; i++) {

                        // Draw Title on the left
                        doc.text(yearlyComponents[i].Title, tableX + 3, monCurrentY);

                        // Draw Text on the right, aligned to the right side
                        let compText = yearlyComponents[i].Text;
                        let compTextWidth = doc.getTextWidth(compText);
                        let compTextX = pageWidth - compTextWidth - tableX - 3;
                        doc.text(compText, compTextX, monCurrentY);

                        // Draw a line under each item
                        let botLineY = monCurrentY + 1.5;
                        doc.line(tableX, botLineY, pageWidth - tableX, botLineY);

                        // Increment Y position for the next item
                        monCurrentY = botLineY + 3.5;
                    }

                    doc.setFont("helvetica", "bold");
                    let monComp0Y = monCurrentY;
                    doc.text(yearlyComponents[0].Title, tableX + 3, monComp0Y);
                    let monComp0Text = yearlyComponents[0].Text;
                    let monComp0TextWidth = doc.getTextWidth(monComp0Text);
                    let monComp0TextX = pageWidth - monComp0TextWidth - tableX - 3;
                    doc.text(monComp0Text, monComp0TextX, monComp0Y);
                    let monComp0BotLineY = monComp0Y + 1.5;
                    doc.setLineWidth(0.6);
                    doc.line(tableX, monComp0BotLineY, pageWidth - tableX, monComp0BotLineY);

                    let deductionsTitleY = monComp0BotLineY + 3.5;
                    let deductionsTitle = "Deductions";
                    let deductionsTitleWidth = doc.getTextWidth(deductionsTitle);
                    let deductionsTitleX = (pageWidth - deductionsTitleWidth) / 2;
                    let deductionsTitleBotLineY = deductionsTitleY + 1.5;
                    doc.line(tableX, deductionsTitleBotLineY, pageWidth - tableX, deductionsTitleBotLineY);
                    doc.setLineWidth(0.3);
                    doc.setFillColor(191, 191, 191);
                    doc.rect(tableX, monComp0BotLineY, tablemaxWidth, deductionsTitleBotLineY - monComp0BotLineY, 'F');
                    doc.text(deductionsTitle, deductionsTitleX, deductionsTitleY);

                    doc.setFont("helvetica", "normal");
                    var deductions = oModel.Deductions;
                    let dedCurrentY = deductionsTitleBotLineY + 3.5;  // Initial Y position

                    for (let i = 1; i <= deductions.length - 1; i++) {

                        // Draw Title on the left
                        doc.text(deductions[i].Title, tableX + 3, dedCurrentY);

                        // Draw Text on the right, aligned to the right side
                        let compText = deductions[i].Text;
                        let compTextWidth = doc.getTextWidth(compText);
                        let compTextX = pageWidth - compTextWidth - tableX - 3;
                        doc.text(compText, compTextX, dedCurrentY);

                        // Draw a line under each item
                        let botLineY = dedCurrentY + 1.5;
                        doc.line(tableX, botLineY, pageWidth - tableX, botLineY);

                        // Increment Y position for the next item
                        dedCurrentY = botLineY + 3.5;
                    }

                    doc.setFont("helvetica", "bold");
                    let deductions0Y = dedCurrentY;
                    doc.text(deductions[0].Title, tableX + 3, deductions0Y);
                    let deductions0Text = deductions[0].Text;
                    let deductions0TextWidth = doc.getTextWidth(deductions0Text);
                    let deductions0TextX = pageWidth - deductions0TextWidth - tableX - 3;
                    doc.text(deductions0Text, deductions0TextX, deductions0Y);
                    let deductions0BotLineY = deductions0Y + 1.5;
                    doc.setLineWidth(0.6);
                    doc.line(tableX, deductions0BotLineY, pageWidth - tableX, deductions0BotLineY);

                    let varCompTitleY = deductions0BotLineY + 3.5;
                    let varCompTitle = "Variable Component";
                    let varCompTitleWidth = doc.getTextWidth(varCompTitle);
                    let varCompTitleX = (pageWidth - varCompTitleWidth) / 2;
                    let varCompTitleBotLineY = varCompTitleY + 1.5;
                    doc.line(tableX, varCompTitleBotLineY, pageWidth - tableX, varCompTitleBotLineY);
                    doc.setLineWidth(0.3);
                    doc.setFillColor(191, 191, 191);
                    doc.rect(tableX, deductions0BotLineY, tablemaxWidth, varCompTitleBotLineY - deductions0BotLineY, 'F');
                    doc.text(varCompTitle, varCompTitleX, varCompTitleY);

                    doc.setFont("helvetica", "normal");
                    var varComp = oModel.VariableComponents;
                    let varCompCurrentY = varCompTitleBotLineY + 3.5;  // Initial Y position

                    for (let i = 1; i <= varComp.length - 1; i++) {

                        // Draw Title on the left
                        doc.text(varComp[i].Title, tableX + 3, varCompCurrentY);

                        // Draw Text on the right, aligned to the right side
                        let compText = varComp[i].Text;
                        let compTextWidth = doc.getTextWidth(compText);
                        let compTextX = pageWidth - compTextWidth - tableX - 3;
                        doc.text(compText, compTextX, varCompCurrentY);

                        // Draw a line under each item
                        let botLineY = varCompCurrentY + 1.5;
                        doc.line(tableX, botLineY, pageWidth - tableX, botLineY);

                        // Increment Y position for the next item
                        varCompCurrentY = botLineY + 3.5;
                    }

                    doc.setFont("helvetica", "bold");
                    let varComp0Y = varCompCurrentY;
                    doc.text(varComp[0].Title, tableX + 3, varComp0Y);
                    let varComp0Text = varComp[0].Text;
                    let varComp0TextWidth = doc.getTextWidth(varComp0Text);
                    let varComp0TextX = pageWidth - varComp0TextWidth - tableX - 3;
                    doc.text(varComp0Text, varComp0TextX, varComp0Y);
                    let varComp0BotLineY = varComp0Y + 1.5;
                    doc.setLineWidth(0.6);
                    doc.line(tableX, varComp0BotLineY, pageWidth - tableX, varComp0BotLineY);

                    let grossTitleY = varComp0BotLineY + 3.5;
                    let grossTitle = "Gross Pay";
                    let grossTitleWidth = doc.getTextWidth(grossTitle);
                    let grossTitleX = (pageWidth - grossTitleWidth) / 2;
                    let grossTitleBotLineY = grossTitleY + 1.5;
                    doc.line(tableX, grossTitleBotLineY, pageWidth - tableX, grossTitleBotLineY);
                    doc.setLineWidth(0.3);
                    doc.setFillColor(191, 191, 191);
                    doc.rect(tableX, varComp0BotLineY, tablemaxWidth, grossTitleBotLineY - varComp0BotLineY, 'F');
                    doc.text(grossTitle, grossTitleX, grossTitleY);

                    var gross = oModel.GrossPay;
                    let grossCurrentY = grossTitleBotLineY + 3.5;  // Initial Y position

                    for (let i = 1; i <= gross.length - 1; i++) {

                        // Draw Title on the left
                        doc.text(gross[i].Title, tableX + 3, grossCurrentY);

                        // Draw Text on the right, aligned to the right side
                        let compText = gross[i].Text;
                        let compTextWidth = doc.getTextWidth(compText);
                        let compTextX = pageWidth - compTextWidth - tableX - 3;
                        doc.text(compText, compTextX, grossCurrentY);

                        // Draw a line under each item
                        let botLineY = grossCurrentY + 1.5;
                        doc.line(tableX, botLineY, pageWidth - tableX, botLineY);

                        // Increment Y position for the next item
                        grossCurrentY = botLineY + 3.5;
                    }

                    doc.setFont("helvetica", "bold");
                    let gross0Y = grossCurrentY;
                    doc.text(gross[0].Title, tableX + 3, gross0Y);
                    let gross0Text = gross[0].Text;
                    let gross0TextWidth = doc.getTextWidth(gross0Text);
                    let gross0TextX = pageWidth - gross0TextWidth - tableX - 3;
                    doc.text(gross0Text, gross0TextX, gross0Y);
                    let gross0BotLineY = gross0Y + 1.5;
                    doc.line(tableX, gross0BotLineY, pageWidth - tableX, gross0BotLineY);

                    let grossPayLineTopY = gross0BotLineY;
                    doc.setLineWidth(0.6);
                    doc.line(tableX, grossPayLineTopY, pageWidth - tableX, grossPayLineTopY);

                    doc.setTextColor(255, 255, 255);
                    let grossPayY = grossPayLineTopY + 3.5;
                    let grossPayText = oModel.EmpCTC;
                    let grossPayTextWidth = doc.getTextWidth(grossPayText);
                    let grossPayTextX = pageWidth - grossPayTextWidth - tableX - 3;
                    let grossPayBotLineY = grossPayY + 1.5;
                    doc.line(tableX, grossPayBotLineY, pageWidth - tableX, grossPayBotLineY);
                    doc.setLineWidth(0.3);
                    doc.setFillColor(128, 128, 128);
                    doc.rect(tableX, grossPayLineTopY, tablemaxWidth, grossPayBotLineY - grossPayLineTopY, 'F');
                    doc.text("COST TO COMPANY", tableX + 3, grossPayY);
                    doc.text(grossPayText, grossPayTextX, grossPayY);
                    doc.setTextColor(0, 0, 0);

                    doc.line(pageMiddle + 10, yearlyCompTitleBotLineY, pageMiddle + 10, monComp0BotLineY);
                    doc.line(pageMiddle + 10, deductionsTitleBotLineY, pageMiddle + 10, deductions0BotLineY);
                    doc.line(pageMiddle + 10, varCompTitleBotLineY, pageMiddle + 10, varComp0BotLineY);
                    doc.line(pageMiddle + 10, grossTitleBotLineY, pageMiddle + 10, grossPayBotLineY);
                    doc.line(tableX, headerY, tableX, grossPayBotLineY);
                    doc.line(pageWidth - tableX, headerY, pageWidth - tableX, grossPayBotLineY);
                    let forCoNameY = grossPayBotLineY + 20;

                    if (pageHeight - grossPayBotLineY < 75) {
                        doc.addPage();
                        doc.setGState(new doc.GState({ opacity: 0.1 }));
                        doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                        doc.setGState(new doc.GState({ opacity: 1 }));
                        forCoNameY = margin;
                        footerContent();
                    }
                    doc.setFont("times", "bold").setFontSize(11);
                    doc.setTextColor(0, 0, 0);
                    doc.text(`For ${oCompanyModel.companyName}.`, margin, forCoNameY);

                    let coSignY = forCoNameY + 5;
                    doc.addImage(oCompanyModel.signature64, "PNG", margin, coSignY, 57, 13);

                    let headofCoNameY = coSignY + 20;
                    doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

                    doc.setFont("times", "normal");
                    let headofCoRoleY = headofCoNameY + 5;
                    doc.text(oCompanyModel.designation, margin, headofCoRoleY);

                    function footerContent() {
                        doc.setFont("times", "normal");
                        doc.setFillColor(128, 128, 128);
                        doc.rect(0, bottomLimit + 6, pageWidth, pageHeight - (bottomLimit + 6), 'F');
                        doc.setFontSize(12);
                        doc.setTextColor(255, 255, 255);
                        const addressLines = doc.splitTextToSize(oCompanyModel.longAddress, 120);
                        let addressY = bottomLimit + 14;
                        addressLines.forEach((line) => {
                            doc.text(line, 8, addressY);
                            addressY += 6.5;
                        });

                        const gstinNo = `GSTIN: ${oCompanyModel.gstin}`;
                        const gstinWidth = doc.getTextWidth(gstinNo);
                        const gstinX = pageWidth - gstinWidth - 8;
                        doc.text(gstinNo, gstinX, bottomLimit + 14);

                        const lutNo = `LUT No.: ${oCompanyModel.lutno}`;
                        const lutWidth = doc.getTextWidth(lutNo);
                        const lutX = pageWidth - lutWidth - 8;
                        doc.text(lutNo, lutX, bottomLimit + 20.5);
                        doc.setTextColor(0, 0, 0);
                    }

                    document.body.removeChild(container);
                    doc.save(`${oModel.CertificateTitle}.pdf`);
                    that.closeBusyDialog();
                }
            });

            function findHtmlEndYmm(doc, pageNumber = 1) {
                const pageCommands = doc.internal.pages[pageNumber];
                if (!Array.isArray(pageCommands)) {
                    console.warn(`No page #${pageNumber} found.`);
                    return 0;
                }

                // scaleFactor:  points per mm (≈ 72 pt/in ÷ 25.4 mm/in ≈ 2.8346)
                const scaleFactor = doc.internal.scaleFactor;

                // Regex to capture “<x> <y> Td”
                const tdRegex = /(\d+(\.\d+)?)\s+(\d+(\.\d+)?)\s+Td/;

                let minYpoints = Infinity;

                for (let chunk of pageCommands) {
                    // Each chunk is a string of PDF operators. We only care about lines containing “Td”.
                    const match = tdRegex.exec(chunk);
                    if (match) {
                        // match[1] = the X (in points), match[3] = the Y (in points)
                        const yPoints = parseFloat(match[3]);
                        if (!isNaN(yPoints) && yPoints < minYpoints) {
                            minYpoints = yPoints;
                        }
                    }
                }

                if (!isFinite(minYpoints)) {
                    // No “Td” found → no text
                    return 0;
                }

                // Convert points → mm:  y_mm = y_points ÷ scaleFactor
                const yMm = minYpoints / scaleFactor;
                return yMm;
            }
        }
    };
});