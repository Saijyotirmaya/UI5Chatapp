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

            doc.setFont("times").setFontSize(14);
            let dateY = topMargin+10;
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
                    let forCoNameY = pageHeight - endYmm + 15;
                    doc.setFont("times", "bold").setFontSize(11);
                    doc.text(`For ${oCompanyModel.companyName}.`, margin, forCoNameY);

                    let coSignY = forCoNameY + 5;
                    doc.addImage(oCompanyModel.signature64, "PNG", margin, coSignY, 57, 13);

                    let headofCoNameY = coSignY + 20;
                    doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

                    doc.setFont("times", "normal");
                    let headofCoRoleY = headofCoNameY + 5;
                    doc.text(oCompanyModel.designation, margin, headofCoRoleY);

                    doc.setFillColor(128, 128, 128);
                    doc.rect(0, bottomLimit+6, pageWidth, pageHeight-(bottomLimit+6), 'F');
                    doc.setFontSize(12.5);
                    doc.setTextColor(255, 255, 255);
                    let addressLines = doc.splitTextToSize(oCompanyModel.longAddress, 120);
                    let addressY = bottomLimit+ 14;
                    addressLines.forEach((line) => {       
                        doc.text(line, 8, addressY);
                        addressY += 6.5;
                    });

                    let gstinNo = `GSTIN: ${oCompanyModel.gstin}`;
                    let gstinWidth = doc.getTextWidth(gstinNo);
                    let gstinX = pageWidth - gstinWidth - 8;
                    doc.text(gstinNo, gstinX, bottomLimit+ 14);

                    let lutNo = `LUT No.: ${oCompanyModel.lutno}`;
                    let lutWidth = doc.getTextWidth(lutNo);
                    let lutX = pageWidth - lutWidth - 8;
                    doc.text(lutNo, lutX, bottomLimit+ 20.5);

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