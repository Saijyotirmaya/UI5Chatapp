sap.ui.define([ "../model/formatter",], function (formatter) {
    "use strict";
    return {
        formatter: formatter,
        onDownloadPDF: function (oModel) {
            sap.ui.core.BusyIndicator.show(0);
            const companyName = oModel.getProperty("/CompanyCodeData/0/companyName");
            const address = oModel.getProperty("/CompanyCodeData/0/longAddress");
            const mobile = oModel.getProperty("/CompanyCodeData/0/mobileNo");
            const email = oModel.getProperty("/CompanyCodeData/0/carrerEmail");
            const website = oModel.getProperty("/CompanyCodeData/0/website");
            const gstin = oModel.getProperty("/CompanyCodeData/0/gstin");
            const quotationIssuedBy = oModel.getProperty("/QuotationFormData/QuotationIssuedBy");
            const employeeMobile = oModel.getProperty("/QuotationFormData/EmployeeMobile");
            const quotationNumber = oModel.getProperty("/QuotationFormData/QuotationNumber");
            const quotationDate = formatter.formatDate(oModel.getProperty("/QuotationFormData/QuotationDate"))
            const customerName = oModel.getProperty("/QuotationFormData/CustomerName");
            const custAddress = oModel.getProperty("/QuotationFormData/CustAddress");
            const custPanNumber = oModel.getProperty("/QuotationFormData/CustPanNumber");
            const custMobile = oModel.getProperty("/QuotationFormData/CustMobile");
            const custGSTNo = oModel.getProperty("/QuotationFormData/CustGSTNo");
            const custEmail = oModel.getProperty("/QuotationFormData/CustEmail");
            const custPinCode = oModel.getProperty("/QuotationFormData/CustPinCode");
            const custAadhar = oModel.getProperty("/QuotationFormData/CustAadhar");
            const model = oModel.getProperty("/QuotationFormData/Model");
            const variant = oModel.getProperty("/QuotationFormData/Variant");
            const transmission = oModel.getProperty("/QuotationFormData/Transmission");
            const fuel = oModel.getProperty("/QuotationFormData/Fuel");
            const colour = oModel.getProperty("/QuotationFormData/Color");
            const make = oModel.getProperty("/QuotationFormData/Make");
            const emission = oModel.getProperty("/QuotationFormData/Emission");
            const exShowroom = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/EXShowroom"));
            const tcs1 = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/TCS1Perc"));
            const roadTax = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/ROADTAX"));
            const addOnInsurance = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/AddOnInsurance"));
            const regnHyp = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/RegHypCharge"));
            const shieldOfTrust = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/ShieldOfTrust4YR45K"));
            const stdFitment = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/STDFittings"));
            const fastTag = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/FastTag"));
            const rsa = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/RSA"));
            const vas = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/VAS"));
            const discountOffers = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/DiscountOffers"));
            const consumerScheme = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/ConsumerScheme"));
            const exShowroomAfterScheme = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/EXShowroomAfterScheme"));
            const onRoad = formatter.fromatNumber(oModel.getProperty("/QuotationFormData/TotalOnRoad"));
            const city = oModel.getProperty("/CompanyCodeData/0/city");
            const bankName = oModel.getProperty("/CompanyCodeData/0/BankName") || "Children's Bank of India";
            const bankAddress = oModel.getProperty("/CompanyCodeData/0/BankAddress") || "India, Asia, Earth";
            const accountNo = oModel.getProperty("/CompanyCodeData/0/AccountNo") || "1234567890";
            const ifsc = oModel.getProperty("/CompanyCodeData/0/IFSCCode") || "CBIN0001234";
            const validUpto = formatter.formatDate(oModel.getProperty("/QuotationFormData/ValidUpto"))
            const logo = oModel.getProperty("/Logo");
            const qrCode = oModel.getProperty("/QRCode");

            setTimeout(function () {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                doc.setFont("helvetica", "bold");

                doc.setLineWidth(0.8);
                doc.rect(5, 5, 200, 287);

                //(X, Y, Width, Height)
                doc.addImage(logo, "PNG", 10.5, 9, 28, 28);

                doc.setLineWidth(0.7);
                doc.line(44, 8, 44, 38);

                doc.setFontSize(16);
                doc.text(companyName, 48, 14);

                doc.setFontSize(9.4);
                const wrappedText2 = doc.splitTextToSize(`${address}`, 100);
                const startX2 = 48, startY2 = 23;
                const lineHeight2 = 4.8;
                wrappedText2.forEach((line, index) => {
                    doc.text(line, startX2, startY2 + index * lineHeight2);
                });
                doc.text(`Cell : ${mobile}  |  Email : ${email}`, 48, 32.5);
                doc.text(`Website : ${website}`, 48, 37);

                doc.setFontSize(11);
                doc.text(`GSTIN : ${gstin}`, 150, 10);
                doc.setFontSize(10);
                doc.text(`Date : ${quotationDate}`, 170, 38);

                doc.setLineWidth(0.55);
                doc.line(5, 40, 205, 40);

                doc.setFontSize(13);
                doc.text("QUOTATION", 90, 45);

                doc.setFontSize(10);

                doc.text("To.", 15, 52);
                doc.text(`: ${customerName}`, 27, 52);

                doc.text("Address :", 100, 64);
                const wrappedText = doc.splitTextToSize(`${custAddress}, ${custPinCode}`, 80);
                const startX = 117, startY = 64;
                const lineHeight = 6;
                wrappedText.forEach((line, index) => {
                    doc.text(line, startX, startY + index * lineHeight);
                });

                doc.text("No.", 100, 52);
                doc.text(`: ${quotationNumber}`, 115, 52);

                if (custPanNumber !== "") {
                    doc.line(144, 54.5, 144, 59);
                    doc.text("PAN", 146, 58);
                    doc.text(`: ${custPanNumber}`, 154, 58);
                }

                doc.text("GSTIN", 15, 64);
                doc.text(`: ${custGSTNo}`, 27, 64);

                doc.text("Aadhar", 100, 58);
                doc.text(`: ${custAadhar}`, 115, 58);

                doc.text("Cell", 15, 58);
                doc.text(`: ${custMobile}`, 27, 58);

                doc.text("Email", 15, 70);
                doc.text(`: ${custEmail}`, 27, 70);

                doc.line(5, 74, 205, 74);

                doc.text("Dear Sir,", 15, 79);
                doc.text("With reference to your enquiry. We are please to submit our Quotation as under :", 33, 83);

                doc.setLineWidth(0.45);
                doc.rect(15, 86, 180, 24);
                doc.line(15, 94, 195, 94);
                doc.line(15, 102, 195, 102);
                doc.line(130, 86, 130, 110);

                doc.setFontSize(10.5);
                doc.text(`Model : ${model}`, 17, 91.5);
                doc.text(`Colour : ${colour}`, 17, 107.5);
                doc.text(`Variants : ${variant}`, 17, 99.5);
                doc.text(`Make : ${make}`, 132, 107.5);
                doc.text(`Transmission : ${transmission}`, 132, 91.5);
                doc.text(`Fuel : ${fuel}, ${emission}`, 132, 99.5);

                doc.rect(15, 111, 180, 100);
                for (let i = 0; i < 13; i++) {
                    doc.line(15, 7 * i + 119, 195, 7 * i + 119);
                }

                doc.text("Ex-Showroom", 19, 116.5);
                doc.text(`${exShowroom}`, 132, 116.5);

                doc.setFontSize(10);
                doc.text("Scheme Discount", 19, 124);
                doc.text(`${consumerScheme}`, 132, 124);

                doc.text("Ex-Showroom after Discount", 19, 131);
                doc.text(`${exShowroomAfterScheme}`, 132, 131);

                doc.text("TCS 1%", 19, 138);
                doc.text(`${tcs1}`, 132, 138);

                doc.text("Insurance", 19, 145);
                doc.text(`${addOnInsurance}`, 132, 145);

                doc.text("Road Tax", 19, 152);
                doc.text(`${roadTax}`, 132, 152);

                doc.text("Regn. + Hyp.", 19, 159);
                doc.text(`${regnHyp}`, 132, 159);

                doc.text("Fast Tag", 19, 166);
                doc.text(`${fastTag}`, 132, 166);

                doc.text("Accessories", 19, 173);
                doc.text(`${stdFitment}`, 132, 173);

                doc.text("Shield", 19, 180);
                doc.text(`${shieldOfTrust}`, 132, 180);

                doc.text("VAS", 19, 187);
                doc.text(`${vas}`, 132, 187);

                doc.text("RSA", 19, 194);
                doc.text(`${rsa}`, 132, 194);

                doc.text("Discount Offers", 19, 201);
                doc.text(`${discountOffers}`, 132, 201);

                doc.setFontSize(12);
                doc.text("Total on Road Price", 19, 208.5);
                doc.text(`${onRoad}`, 132, 208.5);

                doc.line(130, 111, 130, 211);
                doc.rect(15, 212, 180, 7);

                doc.setFontSize(10);
                var ddtext = `Please issue a Demand Draft / Cheque favouring ${companyName}`;
                const textWidth = doc.getTextWidth(ddtext);
                doc.text(ddtext, 105 - textWidth / 2, 216.8);

                doc.rect(15, 220, 61, 40);

                doc.setFontSize(10.5);
                for (let i = 0; i < 2; i++) {
                    doc.text("RTGS & NEFT:", 17 + i * 0.1, 228 + i * 0.1);
                    doc.text(`${companyName}`, 17 + i * 0.1, 233 + i * 0.1);
                }

                doc.setFontSize(10);
                doc.text(`${bankName}`, 17, 239);
                doc.text(`${bankAddress}`, 17, 244);
                doc.text(`Cash Credit A/c. No. ${accountNo}`, 17, 249);
                doc.text(`IFSC Code : ${ifsc}`, 17, 254);

                doc.setFontSize(11);
                for (let i = 0; i < 2; i++) {
                    doc.text("SCAN & PAY", 84 + i * 0.1, 224 + i * 0.1);
                }

                // (X, Y, Width, Height)
                //doc.addImage(mQRCode, "JPG", 78, 226, 35, 35);

                doc.setLineWidth(0.3);
                doc.line(115, 219, 115, 261);

                doc.text("NOTE :", 116, 225);

                doc.setFontSize(9);
                doc.text("1) I have read understood &", 116, 231);
                doc.text("accepted all the terms &", 116, 235);
                doc.text("conditions as mentioned", 116, 239);
                doc.text("overleaf.", 116, 243);

                doc.text("2) Price subject to matter at", 116, 249);
                doc.text("the time of Delivery.", 116, 253);

                doc.setFontSize(9.5);
                doc.text(`Valid upto : ${validUpto}`, 116, 260);

                doc.line(160, 219, 160, 256);

                doc.setFontSize(10);
                const wrappedaddress2 = doc.splitTextToSize(`For ${companyName}`, 30);
                const addX2 = 162, addY2 = 224;
                const lineHeightadd2 = 4;
                wrappedaddress2.forEach((line, index) => {
                    doc.text(line, addX2, addY2 + index * lineHeightadd2);
                });

                doc.setFontSize(11);
                doc.text("CUSTOMER'S SIGN.", 22, 278);
                doc.text("EXECUTIVE SIGN.", 88, 278);
                doc.text("MANAGER SIGN.", 152, 278);

                doc.setLineWidth(0.5);
                doc.rect(15, 280, 180, 10);

                doc.setFontSize(11);
                doc.text(`Issued by : ${quotationIssuedBy}`, 22, 286.5);
                doc.text(`Cell : ${employeeMobile}`, 140, 286.5);

                doc.addPage();
                doc.setLineWidth(0.6);
                doc.rect(20, 25, 170, 215);

                const text1 = `Detailed Noticed Condition on the`;
                const text2 = `Quotation Issued by ${companyName}`;

                const text1Width = doc.getTextWidth(text1);
                const text2Width = doc.getTextWidth(text2);

                const xPosition1 = (205 - text1Width) / 2;
                const xPosition2 = (205 - text2Width) / 2;
                doc.setFontSize(12);
                doc.text(text1, xPosition1, 32);
                doc.text(text2, xPosition2, 37);

                doc.setFontSize(10.5);
                doc.text("1.", 26, 50);
                doc.text( "Performa Invoice contains price of particular type of Vehicle on a particular date and", 32, 50);
                doc.text("does not in any way indicate the availability of the vehicle.",32,
                    55
                );

                doc.text("2.", 26, 65);
                doc.text(
                    "Enquires regarding availability of the vehicle should be made before taking out draft",
                    32,
                    65
                );
                doc.text("for payment from Bank/Financial Institutions.", 32, 70);

                doc.text("3.", 26, 80);
                doc.text("Terms of delivery cash / demand draft only", 32, 80);

                doc.text("4.", 26, 90);
                doc.text(
                    "Price is subject to change at any time without prior notice and such the actual price to",
                    32,
                    90
                );
                doc.text(
                    "be charged in the bill will be that prevailing on the date os delivery of the vehicle ",
                    32,
                    95
                );
                doc.text(
                    "irrespective of when the payment is made or accepted by us.",
                    32,
                    100
                );

                doc.text("5.", 26, 110);
                doc.text(
                    "Delivery subject to availability and delivery period is within engagement and subject",
                    32,
                    110
                );
                doc.text(
                    "to change without notice. Delivery schedule shall be subject to delay due to strike,",
                    32,
                    115
                );
                doc.text(
                    "lockout, Act of God, war epidemic and or any other unforeseen circumstance which",
                    32,
                    120
                );
                doc.text("are beyond our control.", 32, 125);

                doc.text("6.", 26, 135);
                doc.text(
                    "In case of cancellation no interest will be payable",
                    32,
                    135
                );

                doc.text("7.", 26, 145);
                doc.text("Cancellation of Booking Charge Rs. 2100/-", 32, 145);

                doc.text("8.", 26, 155);
                doc.text(
                    "Any verbal/oral commitment made by any Employee will not be Entertained / Accepted",
                    32,
                    155
                );

                doc.text("9.", 26, 165);
                doc.text(
                    `All disputes are subject to ${city} jurisdiction only.`,
                    32,
                    165
                );

                doc.text("10.", 26, 175);
                doc.text("ID & Address Proof: PAN & Aadhar", 32, 175);
                doc.text(
                    "Companies: Co. GST certificate/Agreement Papers.",
                    32,
                    180
                );

                doc.text("11.", 26, 190);
                doc.text(
                    "PAN & AADHAR Linkage is mandatory by Income Tax Act & If non Linkage of same will",
                    32,
                    190
                );
                
                doc.text("affect upto 5% as TCS in place of 1%", 32, 195);

                doc.text("Customer Signature", 135, 230);
                doc.save(`Quotation by ${quotationIssuedBy}.pdf`);

                sap.ui.core.BusyIndicator.hide();
            }, 1000);
        },
    };
});