const PDFDocument = require('pdfkit');

/**
 * Generates a PDF receipt and returns it as a Base64 string.
 * @param {Object} details - The receipt details
 * @param {string} details.gymName
 * @param {string} details.memberName
 * @param {number} details.amountPaid
 * @param {string} details.paymentMode
 * @param {string} details.expiryDate
 * @returns {Promise<string>} Base64 string of the PDF
 */
function generateReceiptPDF(details) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      const { gymName, memberName, amountPaid, paymentMode, expiryDate } = details;

      // === Header Section ===
      doc.rect(0, 0, doc.page.width, 100).fill('#1E293B'); // Slate-900 background
      
      doc.fillColor('#FFFFFF')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text(gymName.toUpperCase(), 50, 35, { align: 'center', characterSpacing: 2 });
         
      // === Title Section ===
      doc.moveDown(3);
      doc.fillColor('#0F172A')
         .fontSize(22)
         .text('PAYMENT RECEIPT', { align: 'center' });
         
      doc.moveDown(1);
      doc.fillColor('#64748B')
         .fontSize(12)
         .font('Helvetica')
         .text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
         
      doc.moveDown(2);

      // === Details Section (Grid/Table style) ===
      const startY = doc.y + 20;
      const col1X = 100;
      const col2X = 300;

      // Draw bounding box for details
      doc.rect(50, startY - 20, doc.page.width - 100, 180)
         .lineWidth(1)
         .strokeColor('#E2E8F0')
         .stroke();

      // Row 1: Member Name
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(12).text('MEMBER NAME:', col1X, startY);
      doc.fillColor('#0F172A').font('Helvetica').text(memberName, col2X, startY);
      doc.moveTo(50, startY + 25).lineTo(doc.page.width - 50, startY + 25).strokeColor('#E2E8F0').stroke();

      // Row 2: Amount Paid
      const row2Y = startY + 45;
      doc.fillColor('#475569').font('Helvetica-Bold').text('AMOUNT PAID:', col1X, row2Y);
      doc.fillColor('#10B981').font('Helvetica-Bold').fontSize(14).text(`Rs. ${amountPaid}`, col2X, row2Y - 2);
      doc.moveTo(50, row2Y + 25).lineTo(doc.page.width - 50, row2Y + 25).strokeColor('#E2E8F0').stroke();

      // Row 3: Payment Method
      const row3Y = row2Y + 45;
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(12).text('PAYMENT MODE:', col1X, row3Y);
      doc.fillColor('#0F172A').font('Helvetica').text(paymentMode.toUpperCase(), col2X, row3Y);
      doc.moveTo(50, row3Y + 25).lineTo(doc.page.width - 50, row3Y + 25).strokeColor('#E2E8F0').stroke();

      // Row 4: New Expiry
      const row4Y = row3Y + 45;
      doc.fillColor('#475569').font('Helvetica-Bold').text('MEMBERSHIP VALID UNTIL:', col1X, row4Y);
      doc.fillColor('#EF4444').font('Helvetica-Bold').text(expiryDate, col2X, row4Y);

      // === Footer Section ===
      doc.moveDown(6);
      doc.fillColor('#64748B')
         .fontSize(10)
         .font('Helvetica-Oblique')
         .text(`Thank you for choosing ${gymName}.`, { align: 'center' });
      doc.text('Keep pushing your limits!', { align: 'center' });

      // Finalize PDF file
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateReceiptPDF };
