const PDFDocument = require('pdfkit');

/**
 * Generates a professional PDF receipt and returns it as a Base64 string.
 * @param {Object} details - The receipt details
 * @param {string} details.gymName        - Name of the gym (from settings)
 * @param {string} details.gymAddress     - Address of the gym
 * @param {string} details.gymPhone       - Phone number of the gym
 * @param {string} details.memberName     - Member's full name
 * @param {string} details.memberPhone    - Member's phone number
 * @param {string} details.planName       - Plan name (e.g. Monthly, Quarterly)
 * @param {number} details.amountPaid     - Amount paid
 * @param {string} details.paymentMode    - Payment mode (CASH / UPI / CARD)
 * @param {string} details.startDate      - Membership start date
 * @param {string} details.expiryDate     - Membership expiry date
 * @returns {Promise<string>} Base64 string of the PDF
 */
function generateReceiptPDF(details) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      const {
        gymName = 'Fitness Center',
        gymAddress = '',
        gymPhone = '',
        memberName = 'Member',
        memberPhone = '',
        planName = 'Gym Membership',
        amountPaid = 0,
        paymentMode = 'CASH',
        startDate = '',
        expiryDate = ''
      } = details;

      const PAGE_W = doc.page.width;
      const PAGE_H = doc.page.height;
      const MARGIN = 45;
      const CONTENT_W = PAGE_W - MARGIN * 2;

      // ─── DARK HEADER BAND (top 140px) ───────────────────────────
      doc.rect(0, 0, PAGE_W, 140).fill('#111827');

      // Left side: GymOS branding (software name)
      doc.fillColor('#6EE7B7')           // emerald accent
         .font('Helvetica-Bold')
         .fontSize(10)
         .text('Powered by', MARGIN, 22, { lineBreak: false });
      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(18)
         .text('GymOS', MARGIN, 34);
      doc.fillColor('#9CA3AF')
         .font('Helvetica')
         .fontSize(8)
         .text('Gym Management Software', MARGIN, 55);

      // Center: Gym Name (large)
      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(26)
         .text(gymName.toUpperCase(), 0, 28, { align: 'center', width: PAGE_W, characterSpacing: 1.5 });

      if (gymAddress) {
        doc.fillColor('#D1D5DB')
           .font('Helvetica')
           .fontSize(9)
           .text(gymAddress, 0, 60, { align: 'center', width: PAGE_W });
      }
      if (gymPhone) {
        doc.fillColor('#9CA3AF')
           .font('Helvetica')
           .fontSize(9)
           .text(`Tel: ${gymPhone}`, 0, gymAddress ? 72 : 60, { align: 'center', width: PAGE_W });
      }

      // Right side: Invoice label
      doc.fillColor('#6EE7B7')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('PAYMENT RECEIPT', PAGE_W - MARGIN - 110, 26, { width: 110, align: 'right' });

      const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.fillColor('#9CA3AF')
         .font('Helvetica')
         .fontSize(8)
         .text(`No: ${invoiceNo}`, PAGE_W - MARGIN - 110, 42, { width: 110, align: 'right' });
      doc.text(`Date: ${today}`, PAGE_W - MARGIN - 110, 53, { width: 110, align: 'right' });

      // ─── ACCENT STRIPE ───────────────────────────────────────────
      doc.rect(0, 140, PAGE_W, 5).fill('#10B981');

      // ─── MEMBER INFO CARD ────────────────────────────────────────
      const cardTop = 165;
      doc.rect(MARGIN, cardTop, CONTENT_W, 80)
         .fill('#F9FAFB')
         .strokeColor('#E5E7EB')
         .lineWidth(1)
         .stroke();

      // Member section label
      doc.fillColor('#6B7280')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('BILLED TO', MARGIN + 18, cardTop + 12);

      doc.fillColor('#111827')
         .font('Helvetica-Bold')
         .fontSize(15)
         .text(memberName, MARGIN + 18, cardTop + 24);

      if (memberPhone) {
        doc.fillColor('#6B7280')
           .font('Helvetica')
           .fontSize(9)
           .text(`Tel: ${memberPhone}`, MARGIN + 18, cardTop + 44);
      }

      // Status badge - draw a tick manually (no emoji)
      const badgeX = PAGE_W - MARGIN - 120;
      const badgeY = cardTop + 22;
      doc.rect(badgeX, badgeY, 100, 28).fill('#D1FAE5');
      // Draw tick mark
      const tx = badgeX + 16, ty = badgeY + 14;
      doc.moveTo(tx, ty).lineTo(tx + 5, ty + 6).lineTo(tx + 12, ty - 4)
         .lineWidth(2).strokeColor('#065F46').stroke();
      doc.fillColor('#065F46')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('PAID', badgeX + 30, badgeY + 9, { width: 60, align: 'center' });

      // ─── SECTION TITLE: FEE DETAILS ──────────────────────────────
      const tableTop = cardTop + 105;
      doc.fillColor('#111827')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('FEE DETAILS', MARGIN, tableTop - 20);

      // Table Header
      doc.rect(MARGIN, tableTop, CONTENT_W, 28).fill('#111827');
      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(9);
      doc.text('DESCRIPTION', MARGIN + 14, tableTop + 9);
      doc.text('PLAN', MARGIN + 250, tableTop + 9);
      doc.text('PERIOD', MARGIN + 350, tableTop + 9);
      doc.text('AMOUNT', PAGE_W - MARGIN - 70, tableTop + 9);

      // Table Row 1 - Membership fee
      const row1Y = tableTop + 28;
      doc.rect(MARGIN, row1Y, CONTENT_W, 36).fill('#FFFFFF').strokeColor('#E5E7EB').lineWidth(0.5).stroke();
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10)
         .text('Gym Membership Fee', MARGIN + 14, row1Y + 12);
      doc.fillColor('#6B7280').font('Helvetica').fontSize(9)
         .text(planName, MARGIN + 250, row1Y + 12);

      const period = (startDate && expiryDate) ? `${startDate}\nto ${expiryDate}` : (expiryDate || '-');
      doc.fillColor('#6B7280').font('Helvetica').fontSize(8)
         .text(period, MARGIN + 350, row1Y + 8, { width: 80 });

      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12)
         .text(`Rs. ${Number(amountPaid).toLocaleString('en-IN')}`, PAGE_W - MARGIN - 75, row1Y + 11);

      // Table Row 2 - Payment method
      const row2Y = row1Y + 36;
      doc.rect(MARGIN, row2Y, CONTENT_W, 30).fill('#F9FAFB').strokeColor('#E5E7EB').lineWidth(0.5).stroke();
      doc.fillColor('#6B7280').font('Helvetica').fontSize(9)
         .text('Payment Method', MARGIN + 14, row2Y + 10);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9)
         .text(paymentMode.toUpperCase(), MARGIN + 250, row2Y + 10);

      // ─── TOTAL BOX ───────────────────────────────────────────────
      const totalTop = row2Y + 40;
      // Total label (left-aligned)
      doc.fillColor('#6B7280').font('Helvetica').fontSize(10)
         .text('SUBTOTAL', MARGIN, totalTop + 8);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10)
         .text(`Rs. ${Number(amountPaid).toLocaleString('en-IN')}`, PAGE_W - MARGIN - 100, totalTop + 8, { width: 100, align: 'right' });

      doc.moveTo(MARGIN, totalTop + 28).lineTo(PAGE_W - MARGIN, totalTop + 28).strokeColor('#E5E7EB').lineWidth(1).stroke();

      // Grand total
      doc.rect(PAGE_W - MARGIN - 200, totalTop + 35, 200, 42).fill('#111827');
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(9)
         .text('TOTAL AMOUNT PAID', PAGE_W - MARGIN - 190, totalTop + 42);
      doc.fillColor('#6EE7B7').font('Helvetica-Bold').fontSize(18)
         .text(`Rs. ${Number(amountPaid).toLocaleString('en-IN')}`, PAGE_W - MARGIN - 190, totalTop + 54, { width: 180, align: 'right' });

      // ─── VALIDITY BOX ────────────────────────────────────────────
      const validBox = totalTop + 100;
      doc.rect(MARGIN, validBox, CONTENT_W, 55).fill('#ECFDF5').strokeColor('#6EE7B7').lineWidth(1).stroke();
      doc.fillColor('#065F46').font('Helvetica-Bold').fontSize(10)
         .text('MEMBERSHIP VALIDITY', MARGIN + 18, validBox + 10);

      if (startDate) {
        doc.fillColor('#374151').font('Helvetica').fontSize(9)
           .text(`Start Date: ${startDate}`, MARGIN + 18, validBox + 26);
      }
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9)
         .text(`Valid Until: ${expiryDate || '-'}`, MARGIN + 18, validBox + (startDate ? 38 : 30));

      // ─── FOOTER ──────────────────────────────────────────────────
      const footerY = PAGE_H - 80;
      doc.rect(0, footerY, PAGE_W, 80).fill('#F3F4F6');
      doc.moveTo(0, footerY).lineTo(PAGE_W, footerY).strokeColor('#10B981').lineWidth(3).stroke();

      doc.fillColor('#6B7280').font('Helvetica-Oblique').fontSize(9)
         .text(`Thank you for being a valued member of ${gymName}!`, 0, footerY + 15, { align: 'center', width: PAGE_W });
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(8)
         .text('This is a computer-generated receipt and does not require a signature.', 0, footerY + 30, { align: 'center', width: PAGE_W });
      doc.fillColor('#D1D5DB').font('Helvetica').fontSize(7)
         .text('Generated by GymOS • Gym Management Software', 0, footerY + 50, { align: 'center', width: PAGE_W });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateReceiptPDF };
