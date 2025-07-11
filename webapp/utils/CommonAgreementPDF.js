sap.ui.define(["../model/formatter"], function (Formatter) {
    "use strict";
    return {
        Formatter: Formatter,

        _checkPageBreak: function (currentYPosition, bottomLimit, doc, topMargin, backImgX, backImgY, oCompanyModel) {
            if (currentYPosition >= bottomLimit) {
                doc.addPage(); // Add a new page if the current position exceeds the limit
                doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 127, 8, 63, 14.5);
                doc.setGState(new doc.GState({ opacity: 0.1 }));
                doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                currentYPosition = topMargin; // Reset to top margin on the new page
            }
            return currentYPosition; // Return updated Y position
        },

        _pdfContent: function (that, doc, pageWidth, pageHeight, margin, paraMargin, topMargin, maxWidth, pageMiddle, bottomLimit, currentY, backImgX, backImgY, oModel, oCompanyModel, content, type) {
            doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 127, 8, 63, 14.5);
            doc.setGState(new doc.GState({ opacity: 0.1 }));
            doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
            doc.setGState(new doc.GState({ opacity: 1 }));
            let titleY = currentY;
            let titleText = content[0].Title;
            doc.setFont("times", "bold").setFontSize(12);
            let textWidth = doc.getTextWidth(titleText);
            let titleX = (pageWidth - textWidth) / 2;
            doc.text(titleText, titleX, titleY);
            doc.setFont("times", "normal").setFontSize(11);

            let titleContentY = titleY + 10; // Initial Y position after titleY
            const boldWords = ["AND", `${oCompanyModel.companyName}`, "NON-DISCLOSURE AGREEMENT", "India", `${oCompanyModel.headOfCompany} - ${oCompanyModel.designation}`, `${oModel.ClientCompanyName}`, "Company", "Other Party", `${oModel.ClientName} - ${oModel.ClientRole}`, "Disclosing Party", "Receiving Party", "Contractor", "(SOW)", "Parties"];
            const trimmedBoldWords = boldWords.map(word => word.trim());
            const boldWordList = trimmedBoldWords.join(" ").split(" ").filter(item => item !== "");

            for (let i = 0; i < 10; i++) {
                if (!content[i]?.TitleContent) break;

                let titleContent = new Function("oCompanyModel", "oModel", `return ${content[i].TitleContent};`)(oCompanyModel, oModel);
                let titleContentLines = doc.splitTextToSize(titleContent, maxWidth);

                titleContentLines.forEach((line, lineIndex) => {
                    let words = line.split(/\s+/);
                    let totalWords = words.length;
                    let currentX = margin;
                    let lineWidth = 0;
                    let wordWidths = []; // To store widths

                    // Calculate line width, account for bold
                    words.forEach(word => {
                        let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                        doc.setFont("times", isBold ? "bold" : "normal");
                        let wordWidth = doc.getTextWidth(word);
                        wordWidths.push(wordWidth);
                        lineWidth += wordWidth;
                    });

                    let totalSpaces = totalWords - 1;
                    let extraSpace = totalSpaces > 0 ? (maxWidth - lineWidth) / totalSpaces : 0;

                    if (lineIndex < titleContentLines.length - 1 && totalWords > 1) {
                        // Justify all lines except the last
                        words.forEach((word, index) => {
                            let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                            doc.setFont("times", isBold ? "bold" : "normal");
                            doc.text(word, currentX, titleContentY);
                            currentX += wordWidths[index] + extraSpace;
                        });
                    } else {
                        // Left-align the last line
                        words.forEach((word, index) => { // Added index
                            let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                            doc.setFont("times", isBold ? "bold" : "normal");
                            doc.text(word, currentX, titleContentY);
                            currentX += wordWidths[index] + doc.getTextWidth(" ");
                        });
                    }
                    titleContentY += 6;
                });
                titleContentY += 3;
            }

            currentY = titleContentY; // Start initial Y position
            doc.setFont("times", "normal");

            for (let i = 1; i <= content.length; i++) {
                if (!content[i - 1]?.PointNo) break; // Break if data is missing to avoid errors
                currentY += 2; // Add extra spacing between points
                currentY = that._checkPageBreak(currentY, bottomLimit, doc, topMargin, backImgX, backImgY, oCompanyModel);
                // Add Point Number and Point Title
                if (content[i - 1].PointTitle) {
                    doc.setFont("times", "bold");
                    doc.setTextColor(0, 111, 191);
                    doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);
                    doc.text(content[i - 1].PointTitle, margin + paraMargin, currentY);
                    doc.setTextColor(0, 0, 0);
                    doc.setFont("times", "normal");
                    currentY += 10; // Increment Y position for the content section
                }
                else {
                    doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);
                }
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
                        pointContentY = that._checkPageBreak(pointContentY, bottomLimit, doc, topMargin, backImgX, backImgY, oCompanyModel);

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

                        pointContentY += 6; // Increment Y position after each line
                    });

                    pointContentY += 3; // Add extra spacing between paragraphs
                });

                currentY = pointContentY; // Update Y position for the next PointTitle
            }

            let pointContentLastY = currentY + 5;
            if (pointContentLastY > bottomLimit - 60) {
                doc.addPage();
                doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 130, 8, 60, 13);
                doc.setGState(new doc.GState({ opacity: 0.1 }));
                doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                pointContentLastY = topMargin;
            }
            doc.setFont("times", "bold");
            if (type === "Contract") {
                var pointContentLast = `Understood and agreed to by the duly authorized representative of ${oCompanyModel.companyName} and ${oModel.ClientName}`;
            }
            else {
                var pointContentLast = `Understood and agreed to by the duly authorized representative of ${oCompanyModel.companyName} and ${oModel.ClientCompanyName}`;
            }
            let pointContentLastLines = doc.splitTextToSize(pointContentLast, maxWidth);
            pointContentLastLines.forEach((line) => {
                doc.text(line, margin, pointContentLastY);
                pointContentLastY += 6;
            });

            let forCoNameY = pointContentLastY + 10;
            doc.text(`For ${oCompanyModel.companyName}`, margin, forCoNameY);
            doc.text("By:", margin, forCoNameY + 5);

            let headofCoNameY = forCoNameY + 30;
            doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

            doc.setFont("times", "normal");
            let headofCoRoleY = headofCoNameY + 5;
            doc.text(oCompanyModel.designation, margin, headofCoRoleY);
            doc.text(oModel.AgreementDate, margin, headofCoRoleY + 5);

            doc.setFont("times", "bold");
            if (type !== "Contract") {
                doc.text(`For ${oModel.ClientCompanyName}`, pageMiddle + 10, forCoNameY);
            }
            doc.text("By:", pageMiddle + 10, forCoNameY + 5);

            doc.text(oModel.ClientName, pageMiddle + 10, headofCoNameY);

            doc.setFont("times", "normal");
            doc.text(oModel.ClientRole, pageMiddle + 10, headofCoRoleY);
            doc.text(oModel.AgreementDate, pageMiddle + 10, headofCoRoleY + 5);
        },

        _GenerateAgreementPDF: function (that2, oModel, oCompanyModel, contentNDA, contentMSA) {
            var that = this;
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
                var topMargin = 35;
                var footerHeight = 25; // reserve 25 units at the bottom for footer
                var maxWidth = pageWidth - 2 * margin; // usable width
                var pageMiddle = pageWidth / 2;
                var bottomLimit = pageHeight - footerHeight;
                let currentY = topMargin;

                const backImgX = (pageWidth - 100) / 2; // Center horizontally
                const backImgY = (pageHeight - 100) / 2; // Center vertically

                that._pdfContent(that, doc, pageWidth, pageHeight, margin, paraMargin, topMargin, maxWidth, pageMiddle, bottomLimit, currentY, backImgX, backImgY, oModel, oCompanyModel, contentNDA);
                doc.addPage();
                that._pdfContent(that, doc, pageWidth, pageHeight, margin, paraMargin, topMargin, maxWidth, pageMiddle, bottomLimit, currentY, backImgX, backImgY, oModel, oCompanyModel, contentMSA);
                doc.save(`${oCompanyModel.companyName} - ${oModel.ClientCompanyName} MSA & NDA.pdf`);
                that2.closeBusyDialog();
            }, 1000);
        },

        _GenerateContractPDF: function (that2, oModel, oCompanyModel, content) {
            var that = this;
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
                var topMargin = 35;
                var footerHeight = 25; // reserve 25 units at the bottom for footer
                var maxWidth = pageWidth - 2 * margin; // usable width
                var pageMiddle = pageWidth / 2;
                var bottomLimit = pageHeight - footerHeight;
                let currentY = topMargin;

                const backImgX = (pageWidth - 100) / 2; // Center horizontally
                const backImgY = (pageHeight - 100) / 2; // Center vertically

                doc.setFont("times", "bold").setFontSize(12);
                doc.text(`Agreement Date : ${oModel.AgreementDate}`, margin, topMargin);
                doc.text(`Agreement No. : ${oModel.ContractNo} / ${oModel.AgreementNo}`, margin, topMargin + 10);
                var titleText = "SOLE TRADER AGREEMENT";
                let textWidth = doc.getTextWidth(titleText);
                let titleX = (pageWidth - textWidth) / 2;
                doc.text(titleText, titleX, topMargin + 30);
                currentY = topMargin + 40; // Update currentY after title

                that._pdfContent(that, doc, pageWidth, pageHeight, margin, paraMargin, topMargin, maxWidth, pageMiddle, bottomLimit, currentY, backImgX, backImgY, oModel, oCompanyModel, content, "Contract");
                doc.addPage();
                doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 127, 8, 63, 14.5);
                doc.setGState(new doc.GState({ opacity: 0.1 }));
                doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                doc.setFont("times", "bold").setFontSize(12);
                var titleText2 = "ASSIGNMENT SCHEDULE 1";
                let textWidth2 = doc.getTextWidth(titleText2);
                let titleX2 = (pageWidth - textWidth2) / 2;
                doc.text(titleText2, titleX2, topMargin);
                doc.setFont("times", "normal").setFontSize(11);
                const textBlock = "This Assignment Schedule is subject to and forms part of the Agreement (Agreement for the Engagement And Provision of Services). In the event of conflict between the Agreement and this Assignment Schedule, the Agreement will take precedence save where expressly provided for within the Agreement or where variations are expressly stated below within this Assignment Schedule.";
                const options = { maxWidth: maxWidth, align: "justify" };
                doc.text(textBlock, margin, topMargin + 10, options);
                const dimensions = doc.getTextDimensions(textBlock, options);
                const nextY = topMargin + dimensions.h + 20;

                const tableData = [
                    ["Agreement No.", `${oModel.ContractNo} / ${oModel.AgreementNo}`],
                    ["Client Company Name", oCompanyModel.companyName],
                    ["End Client / Hirer (if different from the Client)", oModel.ClientCompanyName],
                    ["Location(s) where Services are to be delivered", oModel.LocationService],
                    ["Client Hiring Contact", oModel.ClientReportingName],
                    ["Name of Consultant", oModel.ClientName],
                    ["Description of the Services", oModel.ConsultingService],
                    ["Assignment Status", oModel.ContractStatus],
                    ["Start Date", oModel.AgreementStartDate],
                    ["End Date", oModel.AgreementEndDate],
                    ["Specific Hours/Days and Time keeping Requirement", "Maximum of 60 days to be billed throughout the duration of the contract."],
                    ["Notice period for Consultant to terminate", "5 calendar weeks subject to clauses 23-27"],
                    ["Notice period for us to terminate", "5 calendar weeks subject to clauses 23-27"],
                    ["Specific Insurance Requirement", oModel.SpecificInsuranceRequirement],
                    ["Warranty Date", oModel.AgreementDuration],
                    ["Consultant Rate – standard daily rate (8 hrs)", oModel.ConsultantRate + " Including all tax"],
                    ["Consultant Rate – non-standard", "Any non-standard rate will be on a pro-rata basis with strict prior"],
                    ["Call-out/additional rates/expenses", oModel.ExpensesClaim],
                    ["Payment terms", oModel.PaymentTerms],
                    ["Agreed variations to Agreement", "Appendix 1 – Special Terms"]
                ];

                // Configuration
                const labelWidth = maxWidth * 0.52; // ~43% for label (left)
                const valueWidth = maxWidth - labelWidth; // Remaining width for value
                const fontSize = 10;
                const lineHeight = 5;
                let yPos = nextY;

                doc.setFontSize(fontSize);

                tableData.forEach(([label, value]) => {
                    const labelLines = doc.splitTextToSize(label, labelWidth - 2);
                    const valueLines = doc.splitTextToSize(value, valueWidth - 2);
                    const numLines = Math.max(labelLines.length, valueLines.length);
                    const rowHeight = numLines * lineHeight;

                    // Draw label
                    doc.setFont("times", "bold");
                    labelLines.forEach((line, i) => {
                        doc.text(line, margin + 1, yPos + i * lineHeight);
                    });

                    // Draw value
                    doc.setFont("times", "normal");
                    valueLines.forEach((line, i) => {
                        doc.text(line, margin + labelWidth + 1, yPos + i * lineHeight);
                    });

                    // Optional: Add horizontal line below row (uncomment if needed)
                    doc.line(margin, yPos + rowHeight - 2, margin + maxWidth, yPos + rowHeight - 2);

                    yPos += rowHeight + 2; // small spacing between rows
                });
                const startY = nextY; // Save this BEFORE the loop starts
                let endY = yPos; // yPos after the loop ends

                // Draw a rectangle around the entire table
                doc.setDrawColor(0); // Black border
                doc.setLineWidth(0.2); // Optional: adjust for thinner/thicker border
                doc.rect(margin, startY - 4, maxWidth, endY - startY); // Slight padding adjustment
                doc.line(margin + labelWidth, startY - 4, margin + labelWidth, endY - 4); // Vertical line between label and value
                doc.save(`${oModel.ClientName} Contract Letter.pdf`);
                that2.closeBusyDialog();
            }, 1000);
        },

        _GenerateSOWPDF: function (that2, oModel, oCompanyModel, content) {
            var that = this;
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
                var topMargin = 35;
                var footerHeight = 25; // reserve 25 units at the bottom for footer
                var maxWidth = pageWidth - 2 * margin; // usable width
                var pageMiddle = pageWidth / 2;
                var bottomLimit = pageHeight - footerHeight;
                let currentY;

                const backImgX = (pageWidth - 100) / 2; // Center horizontally
                const backImgY = (pageHeight - 100) / 2; // Center vertically

                doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 127, 8, 63, 14.5);
                doc.setGState(new doc.GState({ opacity: 0.1 }));
                doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                let titleY = topMargin;
                let titleText = content[0].Title;
                doc.setFont("helvetica", "bold").setFontSize(12);
                let titletextWidth = doc.getTextWidth(titleText);
                let titleX = (pageWidth - titletextWidth) / 2;
                doc.text(titleText, titleX, titleY);
                doc.line(titleX, titleY + 1, titleX + titletextWidth + 1, titleY + 1);
                doc.setFont("helvetica", "normal").setFontSize(11);

                let titleContent1Y = titleY + 10; // Initial Y position after titleY
                const boldWords = ["AND", `${oCompanyModel.companyName}`, "NON-DISCLOSURE AGREEMENT", "India", `${oCompanyModel.headOfCompany} - ${oCompanyModel.designation}`, `${oModel.ClientName} - ${oModel.ClientRole}`, `${oModel.ClientCompanyName}`, "Company", "Other Party", "Disclosing Party", "Receiving Party", "Contractor", "(SOW)"];
                const trimmedBoldWords = boldWords.map(word => word.trim());
                const boldWordList = trimmedBoldWords.join(" ").split(" ").filter(item => item !== "");

                function titleContent(i, titleContentY) {
                    let titleContent = new Function("oCompanyModel", "oModel", `return ${content[i].TitleContent};`)(oCompanyModel, oModel);
                    let titleContentLines = doc.splitTextToSize(titleContent, maxWidth);
                    titleContentLines.forEach((line, lineIndex) => {
                        let words = line.split(/\s+/);
                        let totalWords = words.length;
                        let currentX = margin;
                        let lineWidth = 0;
                        let wordWidths = []; // To store widths

                        // Calculate line width, account for bold
                        words.forEach(word => {
                            let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                            doc.setFont("helvetica", isBold ? "bold" : "normal");
                            let wordWidth = doc.getTextWidth(word);
                            wordWidths.push(wordWidth);
                            lineWidth += wordWidth;
                        });

                        let totalSpaces = totalWords - 1;
                        let extraSpace = totalSpaces > 0 ? (maxWidth - lineWidth) / totalSpaces : 0;

                        if (lineIndex < titleContentLines.length - 1 && totalWords > 1) {
                            // Justify all lines except the last
                            words.forEach((word, index) => {
                                let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                                doc.setFont("helvetica", isBold ? "bold" : "normal");
                                doc.text(word, currentX, titleContentY);
                                currentX += wordWidths[index] + extraSpace;
                            });
                        } else {
                            // Left-align the last line
                            words.forEach((word, index) => { // Added index
                                let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                                doc.setFont("helvetica", isBold ? "bold" : "normal");
                                doc.text(word, currentX, titleContentY);
                                currentX += wordWidths[index] + doc.getTextWidth(" ");
                            });
                        }
                        titleContentY += 6;
                    });
                    return titleContentY + 5; // Return updated Y position
                }

                let title2Y = titleContent(0, titleContent1Y); // Call for the first title content
                doc.setFont("helvetica", "bold");
                doc.text(content[1].Title, margin, title2Y); // Add the second title
                doc.setFont("helvetica", "normal");
                let titleContent2Y = title2Y + 6; // Initial Y position after title2Y
                let Title3Y = titleContent(1, titleContent2Y); // Call for the second title content
                doc.setFont("helvetica", "bold");
                doc.text(content[2].Title, margin, Title3Y + 3); // Add the third title
                currentY = Title3Y + 8; // Initial Y position after Title3Y

                for (let i = 1; i < content.length; i++) {
                    currentY += 5;
                    currentY = that._checkPageBreak(currentY, bottomLimit, doc, topMargin, backImgX, backImgY, oCompanyModel);

                    // Point number and title
                    doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);

                    let pointContentLines = doc.splitTextToSize(content[i - 1].PointTitle, maxWidth - 6);
                    pointContentLines.forEach((line) => {
                        doc.text(line, margin + paraMargin, currentY);
                        currentY += 6;
                    });
                    currentY -= 6;

                    let pointTitleWidth = doc.getTextWidth(content[i - 1].PointTitle);
                    let pointContentX = margin + paraMargin + pointTitleWidth + 2;

                    // Dynamic widths
                    let firstLineWidth = pageWidth - pointContentX - margin;
                    let remainingLineWidth = pageWidth - 2 * margin - paraMargin;

                    doc.setFont("helvetica", "normal");
                    let pointContentTemplate = new Function("oCompanyModel", "oModel", `return ${content[i - 1].PointDesc};`)(oCompanyModel, oModel);

                    if (pointContentTemplate === "Table") {
                        doc.setFont("helvetica", "bold").setFontSize(10);
                        let descriptionY = currentY + 8;
                        let label = "Description:";
                        let labelX = margin + paraMargin;
                        doc.text(label, labelX, descriptionY);
                        let labelWidth = doc.getTextWidth(label);
                        doc.setFont("helvetica", "normal");
                        let valueX = labelX + labelWidth + 2;
                        doc.text(oModel.SOWDescription, valueX, descriptionY);
                        currentY = descriptionY - 3;
                        const pageHeight = doc.internal.pageSize.height;
                        const lineHeight = 6;
                        const rowHeight = 6;
                        const headingFontSize = 8.5;
                        const bodyFontSize = 8;

                        // Column definitions
                        const columns = [
                            { title: "SNo", widthRatio: 0.06 },
                            { title: "Consultant Name", widthRatio: 0.32 },
                            { title: "Designation", widthRatio: 0.32 },
                            { title: "Rate Card", widthRatio: 0.3 }
                        ];

                        const tableStartX = margin + 6;
                        const tableMaxWidth = pageWidth - tableStartX - margin;
                        const columnWidths = columns.map(col => col.widthRatio * tableMaxWidth);
                        const columnXPositions = columnWidths.reduce((acc, width, i) => {
                            acc.push((acc[i - 1] || tableStartX) + (i ? columnWidths[i - 1] : 0));
                            return acc;
                        }, []);

                        // Draw Header Background
                        let firstLineY = currentY + 6;
                        let secondLineY = firstLineY + 4;
                        doc.setLineWidth(1).setDrawColor(231, 166, 0);
                        doc.line(tableStartX, firstLineY, pageWidth - margin, firstLineY);
                        doc.line(tableStartX, secondLineY, pageWidth - margin, secondLineY);
                        doc.setFillColor(255, 207, 84);
                        doc.rect(tableStartX, firstLineY, tableMaxWidth, secondLineY - firstLineY, 'F');

                        // Header Text
                        doc.setFont("helvetica", "bold").setFontSize(headingFontSize);
                        const headingY = firstLineY + 3;
                        columns.forEach((col, i) => {
                            const lines = col.title.split("\n");
                            lines.forEach((line, j) => {
                                doc.text(line, columnXPositions[i] + 1, headingY + (j * 4));
                            });
                        });

                        // Table Body
                        doc.setFont("helvetica", "normal").setFontSize(bodyFontSize);
                        const tableData = oModel.TableData;
                        let tableDataY = secondLineY + 4.5;

                        for (let i = 0; i < tableData.length; i++) {
                            const { Salutation, ConsultantName, Designation, Rate } = tableData[i];
                            const rowValues = [i + 1, Salutation + " " + ConsultantName, Designation, Rate];

                            // Wrap text for each cell and calculate line count
                            const wrappedLines = rowValues.map((val, j) => doc.splitTextToSize(val, columnWidths[j] - 2));
                            const lineCounts = wrappedLines.map(lines => lines.length);
                            const maxLineCount = Math.max(...lineCounts);
                            const dynamicRowHeight = maxLineCount * 4.5; // Adjust line height as needed

                            // Check for page overflow
                            if (tableDataY + dynamicRowHeight > pageHeight - margin) {
                                doc.addPage();
                                tableDataY = margin;
                            }

                            // Background fill
                            doc.setFillColor(255, 237, 194);
                            doc.rect(tableStartX, tableDataY - 4, tableMaxWidth, dynamicRowHeight, 'F');

                            // Draw text cell by cell
                            wrappedLines.forEach((lines, j) => {
                                for (let k = 0; k < lines.length; k++) {
                                    doc.text(lines[k], columnXPositions[j] + 1, (tableDataY + (k * 4) - 1));
                                }
                            });

                            // Bottom line
                            if (i == tableData.length - 1) doc.setLineWidth(0.5);
                            doc.line(tableStartX, tableDataY + dynamicRowHeight - 4, pageWidth - margin, tableDataY + dynamicRowHeight - 4);

                            // Move to next row
                            tableDataY += dynamicRowHeight;
                        }

                        // Reset and update Y position
                        doc.setDrawColor(0, 0, 0);
                        currentY = tableDataY + 4;
                        doc.setFont("helvetica", "bold").setFontSize(11);
                        continue;
                    }

                    // Split manually: we process line-by-line depending on the width
                    let allWords = pointContentTemplate.split(" ");
                    let lines = [];
                    let line = "";
                    let isFirstLine = true;
                    allWords.forEach((word) => {
                        let testLine = line.length ? line + " " + word : word;
                        let testWidth = doc.getTextWidth(testLine);
                        let maxWidth = isFirstLine ? firstLineWidth : remainingLineWidth;

                        if (testWidth <= maxWidth) {
                            line = testLine;
                        } else {
                            lines.push(line);
                            line = word;
                            isFirstLine = false;
                        }
                    });
                    if (line) lines.push(line); // Push last line

                    // Print lines
                    lines.forEach((lineText, index) => {
                        let lineX = index === 0 ? pointContentX : margin + paraMargin;
                        currentY = that._checkPageBreak(currentY, bottomLimit, doc, topMargin, backImgX, backImgY, oCompanyModel);
                        doc.text(lineText, lineX, currentY);
                        currentY += 6;
                    });

                    doc.setFont("helvetica", "bold");
                }

                let lastPointTitleY = currentY + 5;
                doc.text(`${content[15].PointNo}.`, margin + (paraMargin - 6), lastPointTitleY);
                doc.text(content[15].PointTitle, margin + paraMargin, lastPointTitleY);

                doc.setFont("helvetica", "normal");

                let lastPointContentY = lastPointTitleY + 10;
                let lastPointContentTemplate = new Function("oCompanyModel", "oModel", `return ${content[15].PointDesc};`)(oCompanyModel, oModel);

                let lastPointContentParas = lastPointContentTemplate.split(`\n\n`);

                lastPointContentParas.forEach((paragraph) => {
                    let pointContentLines = doc.splitTextToSize(paragraph, maxWidth - paraMargin);

                    pointContentLines.forEach((line, lineIndex) => {
                        let words = line.split(" ");
                        let totalWords = words.length;
                        let lineWidth = doc.getTextWidth(line);
                        let spaceWidth = doc.getTextWidth(" ");

                        lastPointContentY = that._checkPageBreak(lastPointContentY, bottomLimit, doc, topMargin, backImgX, backImgY, oCompanyModel);

                        if (lineIndex < pointContentLines.length - 1 && totalWords > 1) {
                            let extraSpace = ((maxWidth - paraMargin) - lineWidth) / (totalWords - 1);
                            let currentX = margin + paraMargin;

                            words.forEach((word, index) => {
                                doc.text(word, currentX, lastPointContentY);
                                currentX += doc.getTextWidth(word) + spaceWidth + (index < totalWords - 1 ? extraSpace : 0);
                            });
                        } else {
                            doc.text(line, margin + paraMargin, lastPointContentY);
                        }

                        lastPointContentY += 6;
                    });

                    lastPointContentY += 3;
                });

                currentY = lastPointContentY; // Update Y for next block
                doc.setFont("times", "bold");
                let pointContentLastY = currentY + 5;
                if (pointContentLastY > bottomLimit - 60) {
                    doc.addPage();
                    doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 130, 8, 60, 13);
                    doc.setGState(new doc.GState({ opacity: 0.1 }));
                    doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                    doc.setGState(new doc.GState({ opacity: 1 }));
                    pointContentLastY = topMargin;
                }
                var pointContentLast = `Understood and agreed to by the duly authorized representative of ${oCompanyModel.companyName} and ${oModel.ClientCompanyName}`;
                let pointContentLastLines = doc.splitTextToSize(pointContentLast, maxWidth);
                pointContentLastLines.forEach((line) => {
                    doc.text(line, margin, pointContentLastY);
                    pointContentLastY += 6;
                });

                let forCoNameY = pointContentLastY + 10;
                doc.text(`For ${oCompanyModel.companyName}`, margin, forCoNameY);
                doc.text("By:", margin, forCoNameY + 5);

                let headofCoNameY = forCoNameY + 30;
                doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

                doc.setFont("times", "normal");
                let headofCoRoleY = headofCoNameY + 5;
                doc.text(oCompanyModel.designation, margin, headofCoRoleY);
                doc.text(oModel.SOWCreateDate, margin, headofCoRoleY + 5);

                doc.setFont("times", "bold");
                doc.text(`For ${oModel.ClientCompanyName}`, pageMiddle + 10, forCoNameY);
                doc.text("By:", pageMiddle + 10, forCoNameY + 5);

                doc.text(oModel.ClientName, pageMiddle + 10, headofCoNameY);

                doc.setFont("times", "normal");
                doc.text(oModel.ClientRole, pageMiddle + 10, headofCoRoleY);
                doc.text(oModel.SOWCreateDate, pageMiddle + 10, headofCoRoleY + 5);

                doc.save(oModel.SOWDescription + " SOW.pdf");
                that2.closeBusyDialog();
            }, 1000);
        },

        _GeneratePOPDF: function (that, oModel, oCompanyModel, htmlContent) {
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
            var topMargin = 25;
            var footerHeight = 25; // reserve 25 units at the bottom for footer
            var maxWidth = pageWidth - 2 * margin; // usable width
            var pageMiddle = pageWidth / 2;
            var bottomLimit = pageHeight - footerHeight;
            let currentY;

            doc.setFont("times", "bold").setFontSize(14);

            const backImgX = (pageWidth - 100) / 2; // Center horizontally
            const backImgY = (pageHeight - 100) / 2; // Center vertically

            doc.addImage(oCompanyModel.companylogo64, "PNG", margin, topMargin - 10, 45, 45);

            let coAlignment = { maxWidth: 70, align: "right" };
            let coNameY = topMargin;

            doc.text(oCompanyModel.companyName, pageWidth - margin, coNameY, coAlignment)
            let coAddressY = doc.getTextDimensions(oCompanyModel.companyName, coAlignment).h + coNameY + 3;

            doc.setFont("times", "normal").setFontSize(12);
            doc.text(oCompanyModel.longAddress, pageWidth - margin, coAddressY, coAlignment)
            let coGSTINY = doc.getTextDimensions(oCompanyModel.longAddress, coAlignment).h + coAddressY + 3;

            doc.text("GSTIN: " + oCompanyModel.gstin, pageWidth - margin, coGSTINY, coAlignment);
            // currentY = doc.getTextDimensions("GSTIN: " + oCompanyModel.gstin, coAlignment).h; (NOT REQURIED AS OF NOW)

            let titleY = topMargin + 50;
            doc.setTextColor(34, 105, 155);
            doc.setFont("times", "bold").setFontSize(14);
            let titleText = "PURCHASE ORDER";
            let titletextWidth = doc.getTextWidth(titleText);
            let titleX = (pageWidth - titletextWidth) / 2;
            doc.text(titleText, titleX, titleY);

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);

            let clientAlignment = { maxWidth: 100, align: "left" };
            let clientNameY = titleY + 15;
            doc.text("To,", margin, clientNameY - 5, clientAlignment);
            doc.text(oModel.ClientCompanyName, margin, clientNameY);
            doc.setFont("times", "normal");
            doc.text(oModel.ClientCompanyAddress, margin, clientNameY + 6, clientAlignment);
            let clientPANY = doc.getTextDimensions(oModel.ClientCompanyAddress, clientAlignment).h + clientNameY + 8;
            doc.text("PAN: " + oModel.ClientCompanyPAN, margin, clientPANY);
            if (oModel.GSTIN !== ""){
                clientPANY += 6; // Add space for GSTIN if it exists
                doc.text("GSTIN: " + oModel.GSTIN, margin, clientPANY);
            } 

            doc.setFont("times", "bold");
            let poDetaisX = pageWidth - margin - 50;
            let poDetailsY = clientNameY - 4;
            doc.text("PO Number", poDetaisX, poDetailsY);
            doc.text("Type", poDetaisX, poDetailsY + 6);
            doc.text("From", poDetaisX, poDetailsY + 12);
            doc.text("To", poDetaisX, poDetailsY + 18);
            doc.text("Date", poDetaisX, poDetailsY + 24);
            doc.setFont("times", "normal");
            doc.text(`: ${oModel.PONumber}`, poDetaisX + 22, poDetailsY);
            doc.text(`: ${oModel.POType}`, poDetaisX + 22, poDetailsY + 6);
            doc.text(`: ${oModel.POFrom}`, poDetaisX + 22, poDetailsY + 12);
            doc.text(`: ${oModel.POTo}`, poDetaisX + 22, poDetailsY + 18);
            doc.text(`: ${oModel.PODate}`, poDetaisX + 22, poDetailsY + 24);

            let tableY = poDetailsY + 33;
            if(clientPANY > tableY - 5) tableY = clientPANY + 5; // Ensure table starts below client details

            doc.autoTable({
                startY: tableY,
                theme: 'grid',
                head: [["SNo", "Description", "Consultant Name", "Unit", "Rate", "Amount"]],
                body: oModel.POItems.map(item => [item.SerialNo, item.Description, item.ConsultantName, item.Unit, Formatter.fromatNumber(item.Amount), Formatter.fromatNumber(item.TotalAmount) + " " + item.Period]),

                styles: {
                    font: "times",
                    fontSize: 10,
                    cellPadding: 1,
                    overflow: 'linebreak',
                    halign: 'left',
                    valign: 'middle',
                    minCellHeight: 5,
                    textColor: [0, 0, 0],
                    lineColor: [0, 0, 0]
                },

                headStyles: {
                    fillColor: [41, 128, 186],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    valign: 'middle',
                    halign: 'center',
                    cellPadding: 1,
                    lineWidth: 0.3,
                    lineColor: [0, 0, 0]
                },

                bodyStyles: {
                    lineWidth: 0.3
                },

                columnStyles: {
                    0: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'right' }, // 'Rate' column (index starts at 0)
                    5: { halign: 'right' }  // 'Amount' column
                },

                tableWidth: maxWidth,
                margin: { left: margin, right: margin }
            });
            doc.setFont("times", "bold").setFontSize(11);
            const options = { maxWidth: 100, align: "right" };
            const dimensions = doc.getTextDimensions(Formatter.fromatNumber(oModel.TotalPOAmount), options);
            var totalAmountY = doc.lastAutoTable.finalY + 10;
            var amountLabelX = pageWidth - margin - dimensions.w - 2; // Align with PO details
            doc.setFont("times", "normal").setFontSize(10);
            doc.text(`Sub Total (${oModel.Currency}) :`, amountLabelX, totalAmountY, options);
            doc.text(Formatter.fromatNumber(oModel.SubTotal), pageWidth - margin - 2, totalAmountY, options);
            if (oModel.GSTType === "IGST" && oModel.Currency === "INR") {
                totalAmountY += 6;
                doc.text(`IGST (${oModel.Tax}%) :`, amountLabelX, totalAmountY, options);
                doc.text(Formatter.fromatNumber(oModel.IGST), pageWidth - margin - 2, totalAmountY, options);
            }
            if (oModel.GSTType === "CGST/SGST" && oModel.Currency === "INR") {
                totalAmountY += 6;
                doc.text(`CGST (${oModel.Tax}%) :`, amountLabelX, totalAmountY, options);
                doc.text(Formatter.fromatNumber(oModel.CGST), pageWidth - margin - 2, totalAmountY, options);
                totalAmountY += 6;
                doc.text(`SGST (${oModel.Tax}%) :`, amountLabelX, totalAmountY, options);
                doc.text(Formatter.fromatNumber(oModel.SGST), pageWidth - margin - 2, totalAmountY, options);
            }
            totalAmountY += 3;
            doc.setLineWidth(0.3);
            doc.line(amountLabelX - 38, totalAmountY, pageWidth - margin, totalAmountY); // Draw line for separation
            totalAmountY += 6;
            doc.setFont("times", "bold").setFontSize(11);
            doc.text(`Total Amount (${oModel.Currency}) :`, amountLabelX, totalAmountY, options);
            doc.text(Formatter.fromatNumber(oModel.TotalPOAmount), pageWidth - margin - 2, totalAmountY, options);
            let amtWordY = totalAmountY + 7;
            doc.setFontSize(10);
            doc.text(`Total Amount in Words (${oModel.Currency}) :`, margin, amtWordY);
            doc.setFont("times", "normal");
            doc.text(oModel.POAmountInWords, margin, amtWordY + 5, { maxWidth: maxWidth });
            doc.setFont("times", "bold").setFontSize(12);
            function prepareHtmlForPdf(htmlContent) {
                // Styles to inject
                const style = `
                        <style>
                            body {
                            margin: 0;
                            padding: 0;
                            }
                            li::marker {
                                vertical-align: middle;
                            }
                            ul,
                            li {
                                padding-left: 3px;
                                margin-left: 5px;
                            }
                            ol,
                            li {
                                padding-left: 3px;
                                margin-left: 5px;
                            }
                        </style>
                        `;

                return style + htmlContent;
            }

            let container = document.createElement("div");
            container.innerHTML = prepareHtmlForPdf(htmlContent);
            container.style.width = `${2 * maxWidth}px`;
            container.style.fontFamily = "Times New Roman";
            container.style.fontSize = "5.5pt";
            container.style.lineHeight = "1.4";
            container.style.position = "absolute";  // Prevent it from affecting layout
            container.style.padding = "0";
            document.body.appendChild(container);
            doc.setGState(new doc.GState({ opacity: 0.1 }));
            doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
            doc.setGState(new doc.GState({ opacity: 1 }));
            footerDesign();
            doc.addPage();
            doc.setFont("times", "bold").setFontSize(14);
            let noteY = topMargin + 6;
            let rteY = pageHeight + topMargin + 7;
            doc.addImage(oCompanyModel.emailLogoBase64, "PNG", 127, 8, 63, 14.5);

            doc.text("Terms and Conditions", pageMiddle, noteY, { maxWidth: 100, align: "center" });
            doc.html(container, {
                x: margin,
                y: rteY,
                html2canvas: { scale: 0.5 },
                callback: function (doc) {
                    doc.setGState(new doc.GState({ opacity: 0.1 }));
                    doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
                    doc.setGState(new doc.GState({ opacity: 1 }));
                    doc.setFont("times", "bold").setFontSize(11);
                    const endYmm = findHtmlEndYmm(doc);
                    let forCoNameY = rteY - pageHeight + 30 + (256 - endYmm);
                    doc.text(`For ${oCompanyModel.companyName}`, margin, forCoNameY);
                    doc.text("By:", margin, forCoNameY + 5);

                    let headofCoNameY = forCoNameY + 30;
                    doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

                    doc.setFont("times", "normal");
                    let headofCoRoleY = headofCoNameY + 5;
                    doc.text(oCompanyModel.designation, margin, headofCoRoleY);
                    doc.text(oModel.PODate, margin, headofCoRoleY + 5);

                    doc.setFont("times", "bold");
                    doc.text(`For ${oModel.ClientCompanyName}`, pageMiddle + 10, forCoNameY);
                    doc.text("By:", pageMiddle + 10, forCoNameY + 5);
                    doc.text(oModel.ClientName, pageMiddle + 10, headofCoNameY);

                    doc.setFont("times", "normal");
                    doc.text(oModel.ClientRole, pageMiddle + 10, headofCoRoleY);
                    doc.text(oModel.PODate, pageMiddle + 10, headofCoRoleY + 5);
                    footerDesign();
                    doc.save("PO.pdf");
                    that.closeBusyDialog();
                    document.body.removeChild(container);
                }
            });

            function footerDesign() {
                doc.setFillColor(128, 128, 128);
                doc.rect(0, bottomLimit + 6, pageWidth, pageHeight - (bottomLimit + 6), 'F');
                doc.setFont("times", "normal").setFontSize(11);
                doc.setTextColor(255, 255, 255);
                doc.text(`SUBJECT TO ${oCompanyModel.city} JURISDICTION`, pageMiddle, bottomLimit + 11, { maxWidth: 100, align: "center" });
                let addressLines = doc.splitTextToSize(oCompanyModel.longAddress, 120);
                let addressY = bottomLimit + 17;
                addressLines.forEach((line) => {
                    doc.text(line, 8, addressY);
                    addressY += 5;
                });

                let gstinNo = `GSTIN: ${oCompanyModel.gstin}`;
                let gstinWidth = doc.getTextWidth(gstinNo);
                let gstinX = pageWidth - gstinWidth - 8;
                doc.text(gstinNo, gstinX, bottomLimit + 17);

                let lutNo = `LUT No.: ${oCompanyModel.lutno}`;
                let lutWidth = doc.getTextWidth(lutNo);
                let lutX = pageWidth - lutWidth - 8;
                doc.text(lutNo, lutX, bottomLimit + 22);
                doc.setTextColor(0, 0, 0);
            }

            function findHtmlEndYmm(doc, pageNumber = 1) {
                const pageCommands = doc.internal.pages[2];    
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