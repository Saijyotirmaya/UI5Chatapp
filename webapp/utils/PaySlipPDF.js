sap.ui.define(["../model/formatter",], function (formatter) {
    "use strict";
    return {
        formatter: formatter,
        _GeneratePDF: function (that, oModel, oCompanyModel) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const backImgX = (pageWidth - 100) / 2; // Center horizontally
            const backImgY = (pageHeight - 100) / 2; // Center vertically
            const month = getMonthName(oModel.YearMonth.split("-")[1]);
            const year = oModel.YearMonth.split("-")[0];
            const earningData = oModel.EarningData || [];
            const deductionData = oModel.DeductionData || [];
            const maxRows = Math.max(earningData.length, deductionData.length);
            while (deductionData.length < maxRows) {
                deductionData.push({ Description: "", Amount: "", YearlyAmount: "" });
            }
            while (earningData.length < maxRows) {
                earningData.push({ Description: "", Amount: "", YearlyAmount: "" });
            }

            const margin = 15;

            // Vertical Lines (Dynamic Adjustment)
            doc.setLineWidth(0.5).setDrawColor(0, 0, 0);
            let yPosition = 25; // Starting Y position for content

            // Horizontal Line
            doc.line(margin, 18, pageWidth - margin, 18);
            doc.line(margin + 35, 18, margin + 35, 43);
            doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", margin + 7, 20, 21, 21);

            // Header Section
            doc.setFontSize(16).setFont("times", "bold");
            doc.text(oCompanyModel.companyName, margin + 40, yPosition);
            yPosition += 8;

            // Address Section
            const addressLines = doc.splitTextToSize(oCompanyModel.longAddress, 180);
            doc.setFontSize(12).setFont("times", "normal");
            addressLines.forEach((line) => {
                doc.text(line, margin + 40, yPosition);
                yPosition += 6;
            });
            yPosition += 3;
            // Horizontal Line before Title
            doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);

            // Title Section
            yPosition += 2;
            doc.setFont("times", "bold").setFontSize(14).text(`Pay Slip for ${month}-${year}`, pageWidth / 2, yPosition, { align: "center" });

            // Horizontal Line after Title
            yPosition += 4;
            doc.line(margin, yPosition, pageWidth - margin, yPosition);

            // Employee Information Section
            yPosition += 8;
            doc.setFontSize(12).setFont("times", "normal");
            const employeeInfo = [
                { label: "Employee No.", value: oModel.EmployeeID },
                { label: "Payable Days", value: oModel.PayableDays },
                { label: "Employee Name", value: oModel.EmployeeName },
                { label: "PAN", value: oModel.PAN },
                { label: "Location", value: oModel.BaseLocation },
                { label: "Department", value: oModel.Department },
                { label: "Bank Name", value: oModel.BankName },
                { label: "Role", value: oModel.Role },
                { label: "Bank A/C No.", value: oModel.BankAccountNo },
                { label: "Date of Joining", value: formatter.formatDate(oModel.JoiningDate) },
            ];
            employeeInfo.forEach((info, index) => {
                const xPosition = index % 2 === 0 ? margin + 2 : pageWidth / 2 + 6;
                if (index % 2 === 0 && index > 0) yPosition += 6;
                doc.text(`${info.label}: ${info.value}`, xPosition, yPosition);
            });

            const customSort = (a, b) => {
                const descA = a.Description ? a.Description.toUpperCase() : "";
                const descB = b.Description ? b.Description.toUpperCase() : "";
                if (!descA && descB) return 1;
                if (!descB && descA) return -1;
                if (!descA && !descB) return 0;

                return descA > descB ? 1 : -1;
            };

            earningData.sort(customSort);
            deductionData.sort(customSort);

            // Table Section
            yPosition += 6;
            doc.autoTable({
                startY: yPosition,
                head: [["Earnings", "Current Month", "YTD Earnings", "Deductions", "Current Month", "YTD Deductions"]],
                body: earningData.map((item, index) => [
                    item.Description || "",
                    formatter.fromatNumber(item.Amount ?? 0),
                    formatter.fromatNumber(item.YearlyAmount ?? 0),
                    deductionData[index]?.Description || "",
                    formatter.fromatNumber(deductionData[index]?.Amount ?? 0),
                    formatter.fromatNumber(deductionData[index]?.YearlyAmount !== undefined ? deductionData[index].YearlyAmount : " ")
                ]).concat([
                    [
                        { content: "Total", styles: { fontStyle: "bold" } },
                        { content: formatter.fromatNumber(oModel.EarningsTotalMonthly), styles: { fontStyle: "bold" } },
                        { content: formatter.fromatNumber(oModel.EarningsTotalYearly), styles: { fontStyle: "bold" } },
                        { content: "Total", styles: { fontStyle: "bold" } },
                        { content: formatter.fromatNumber(oModel.DeductionsTotalMonthly), styles: { fontStyle: "bold" } },
                        { content: formatter.fromatNumber(oModel.DeductionsTotalYearly), styles: { fontStyle: "bold" } },
                    ]
                ]),
                margin: { left: margin, right: margin },
                styles: { lineColor: [0, 0, 0], lineWidth: 0.3 },
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], halign: "center", fontStyle: "bold" }, // Header row styles
                bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], halign: "left" }, // Body row styles (white background)
                columnStyles: {
                    0: { cellWidth: 35, overflow: 'linebreak' }, // Earnings
                    1: { halign: "right", cellWidth: 'wrap', overflow: 'linebreak' }, // Earnings - Current Month
                    2: { halign: "right", cellWidth: 'wrap', overflow: 'linebreak' }, // YTD Earnings - decreased
                    3: { cellWidth: 35, overflow: 'linebreak' }, // Deductions
                    4: { halign: "right", cellWidth: 'wrap', overflow: 'linebreak' }, // Deductions - Current Month
                    5: { halign: "right", cellWidth: 'wrap', overflow: 'linebreak' }, // YTD Deductions - decreased
                },
                theme: "grid",
                pageBreak: "auto",
            });
            doc.setGState(new doc.GState({ opacity: 0.1 }));
            doc.addImage(oCompanyModel.backgroundLogoBase64, "PNG", backImgX, backImgY, 100, 100);
            doc.setGState(new doc.GState({ opacity: 1 }));

            // Store the final Y position from the table (last row position)
            yPosition = doc.lastAutoTable.finalY + 6;

            // Draw Net Pay Section
            doc.setFontSize(12).setFont("times", "bold");
            doc.text(`Net Pay: Rs. ${formatter.fromatNumber(oModel.NetPay)}`, margin + 2, yPosition);
            doc.text(`(${oModel.NetPayText})`, margin + 2, yPosition + 6);
            yPosition += 10;

            // Horizontal Line
            doc.setLineWidth(0.5).setDrawColor(0, 0, 0);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);

            // Footer Note
            doc.setFontSize(12).setFont("times", "normal");
            yPosition += 20;
            doc.text("This is a computer-generated payslip. Hence no signature is required.", margin + 2, yPosition);

            // Final Horizontal Line
            yPosition += 4;
            doc.setLineWidth(0.5).setDrawColor(0, 0, 0);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);

            // Adjust Vertical Lines
            const footerEndY = yPosition;
            doc.line(margin, 18, margin, footerEndY); // Left vertical line
            doc.line(pageWidth - margin, 18, pageWidth - margin, footerEndY); // Right vertical line

            doc.save(`${oModel.EmployeeName} ${month}-${year} Pay Slip.pdf`);
            that.closeBusyDialog();

            function getMonthName(monthNumber) {
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const index = parseInt(monthNumber, 10) - 1;
                return monthNames[index];
            }
        }
    };
});