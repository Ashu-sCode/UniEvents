/**
 * PDF Generator Utility - Movie Style Ticket
 */

const PDFDocument = require('pdfkit');
const { generateQRCodeBuffer } = require('./qrGenerator');

// Rounded rectangle helper
const rrect = (doc, x, y, w, h, r) => {
  doc
    .moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y)
    .closePath();
  return doc;
};

const generateTicketPDF = async (ticket) => {
  return new Promise(async (resolve, reject) => {
    try {
      const W = 360;
      const H = 680;
      const PAD = 20;
      const R = 20;

      const doc = new PDFDocument({
        size: [W, H],
        margin: 0,
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── DATA ─────────────────────────────
      const event = ticket?.eventId || {};
      const user = ticket?.userId || {};

      const eventName = event?.title || 'EVENT NAME';
      const attendeeName = user?.name || 'YOUR NAME';
      const rollNumber = user?.rollNumber || '';
      const department = user?.department || '';
      const venue = event?.venue || '';
      const code = ticket?.code || ticket?.ticketId || 'CODE';

      const eventDate = new Date(event?.date);
      const dateStr = isNaN(eventDate.getTime())
        ? '—'
        : eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

      const timeStr = event?.time || '—';

      const verificationBase = process.env.TICKET_VERIFICATION_URL_BASE;
      const qrValue = verificationBase
        ? `${verificationBase}?ticketId=${encodeURIComponent(code)}`
        : code;

      // ── COLORS ───────────────────────────
      const BG = '#1c1c1e';
      const WHITE = '#ffffff';
      const MUTED = '#8e8e93';
      const DIVIDER = '#3a3a3c';

      // ── BACKGROUND ───────────────────────
      rrect(doc, 0, 0, W, H, R).fillColor(BG).fill();

      // ── HEADER ───────────────────────────
      doc.rect(0, 0, W, 70).fill('#111');

      doc.fillColor(WHITE)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('UNI EVENT PASS', PAD, 25);

      doc.fillColor(MUTED)
        .fontSize(10)
        .text('Admit One', PAD, 45);

      // ── EVENT TITLE ──────────────────────
      let curY = 90;

      doc.fillColor(WHITE)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(eventName, PAD, curY, {
          width: W - PAD * 2,
        });

      curY += doc.heightOfString(eventName, {
        width: W - PAD * 2,
      }) + 10;

      // ── QR + SIDE INFO ───────────────────
      const qrSize = 120;
      const qrX = W - qrSize - PAD;
      const qrY = curY;

      rrect(doc, qrX, qrY, qrSize, qrSize, 10).fillColor(WHITE).fill();

      const qrBuffer = await generateQRCodeBuffer(qrValue);
      doc.image(qrBuffer, qrX + 8, qrY + 8, {
        width: qrSize - 16,
        height: qrSize - 16,
      });

      let infoY = curY;

      const info = [
        { label: 'DATE', value: dateStr },
        { label: 'TIME', value: timeStr },
        { label: 'VENUE', value: venue || '—' },
      ];

      info.forEach((item) => {
        doc.fillColor(MUTED)
          .fontSize(8)
          .text(item.label, PAD, infoY);

        doc.fillColor(WHITE)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(item.value, PAD, infoY + 10);

        infoY += 28;
      });

      curY = qrY + qrSize + 20;

      // ── TEAR LINE ────────────────────────
      doc.circle(0, curY, 10).fill(BG);
      doc.circle(W, curY, 10).fill(BG);

      doc.strokeColor(DIVIDER)
        .dash(6, { space: 4 })
        .moveTo(PAD, curY)
        .lineTo(W - PAD, curY)
        .stroke()
        .undash();

      curY += 20;

      // ── USER INFO ────────────────────────
      doc.fillColor(MUTED)
        .fontSize(8)
        .text('ATTENDEE', PAD, curY);

      doc.fillColor(WHITE)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(attendeeName, PAD, curY + 12);

      curY += 40;

      // ── EXTRA INFO ───────────────────────
      const extras = [
        { label: 'ROLL NO', value: rollNumber },
        { label: 'DEPT', value: department },
      ].filter(e => e.value);

      extras.forEach((item, i) => {
        const x = PAD + (i * 150);

        doc.fillColor(MUTED)
          .fontSize(8)
          .text(item.label, x, curY);

        doc.fillColor(WHITE)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(item.value, x, curY + 10);
      });

      curY += 50;

      // ── BARCODE ──────────────────────────
      const bW = W - PAD * 2;
      const bH = 50;

      rrect(doc, PAD, curY, bW, bH, 8).fillColor('#111').fill();

      let state = 0;
      for (const ch of String(code)) {
        state = (state * 31 + ch.charCodeAt(0)) >>> 0;
      }

      const next = () => {
        state ^= state << 13; state >>>= 0;
        state ^= state >>> 17; state >>>= 0;
        state ^= state << 5;  state >>>= 0;
        return state;
      };

      doc.fillColor(WHITE);
      let bx = PAD + 10;

      while (bx < PAD + bW - 10) {
        const r = next();
        const bw = 1 + (r % 3);

        if (r % 2) {
          doc.rect(bx, curY + 8, bw, bH - 16).fill();
        }

        bx += bw;
      }

      curY += bH + 8;

      // ── CODE TEXT ────────────────────────
      doc.fillColor(MUTED)
        .fontSize(9)
        .text(code, 0, curY, {
          width: W,
          align: 'center',
          characterSpacing: 2,
        });

      curY += 20;

      // ── FOOTER ───────────────────────────
      doc.fillColor(DIVIDER)
        .fontSize(7)
        .text(
          'Valid for one person • Non-transferable • UniEvent',
          0,
          curY,
          { align: 'center', width: W }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};


/**
 * Generate a professional certificate PDF — A4 Landscape (unchanged)
 */
const generateCertificatePDF = async (certificate) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const event  = certificate.eventId;
      const user   = certificate.userId;
      const issuer = certificate.issuedBy;

      const pageWidth  = 842;
      const pageHeight = 595;

      const colors = {
        navy:       '#1a365d',
        darkNavy:   '#0f172a',
        gold:       '#d4af37',
        lightGold:  '#f5e6c8',
        cream:      '#fdfbf7',
        darkGray:   '#374151',
        mediumGray: '#6b7280',
        lightGray:  '#e5e7eb',
      };

      doc.rect(0, 0, pageWidth, pageHeight).fill(colors.cream);
      doc.rect(0, 0, pageWidth, 100).fill('#faf8f3');
      doc.rect(0, pageHeight - 100, pageWidth, 100).fill('#faf8f3');

      doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(3).strokeColor(colors.gold).stroke();
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60).lineWidth(1).strokeColor(colors.gold).stroke();
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80).lineWidth(0.5).strokeColor(colors.lightGold).stroke();

      const drawCornerOrnament = (x, y, rotation) => {
        doc.save();
        doc.translate(x, y).rotate(rotation);
        doc.strokeColor(colors.gold).lineWidth(1.5);
        doc.moveTo(0, 0).bezierCurveTo(15, 0, 25, 10, 25, 25).stroke();
        doc.moveTo(0, 0).bezierCurveTo(0, 15, 10, 25, 25, 25).stroke();
        doc.circle(12, 12, 2).fill(colors.gold);
        doc.circle(8,  18, 1.5).fill(colors.gold);
        doc.circle(18,  8, 1.5).fill(colors.gold);
        doc.restore();
      };

      drawCornerOrnament(45, 45, 0);
      drawCornerOrnament(pageWidth - 45, 45, 90);
      drawCornerOrnament(pageWidth - 45, pageHeight - 45, 180);
      drawCornerOrnament(45, pageHeight - 45, 270);

      const centerX = pageWidth / 2;

      doc.strokeColor(colors.gold).lineWidth(1);
      doc.moveTo(centerX - 150, 70).lineTo(centerX - 20, 70).stroke();
      doc.moveTo(centerX + 20,  70).lineTo(centerX + 150, 70).stroke();
      doc.save();
      doc.translate(centerX, 70).rotate(45);
      doc.rect(-6, -6, 12, 12).fillColor(colors.gold).fill();
      doc.restore();

      doc.fillColor(colors.navy).fontSize(42).font('Helvetica-Bold')
        .text('CERTIFICATE', 0, 90, { width: pageWidth, align: 'center', characterSpacing: 8 });
      doc.fillColor(colors.gold).fontSize(18).font('Helvetica')
        .text('OF PARTICIPATION', 0, 138, { width: pageWidth, align: 'center', characterSpacing: 4 });

      const separatorY = 170;
      doc.strokeColor(colors.gold).lineWidth(0.5);
      doc.moveTo(centerX - 180, separatorY).lineTo(centerX - 30, separatorY).stroke();
      doc.moveTo(centerX + 30,  separatorY).lineTo(centerX + 180, separatorY).stroke();
      [-15, 0, 15].forEach(offset => {
        doc.save();
        doc.translate(centerX + offset, separatorY).rotate(45);
        doc.rect(-3, -3, 6, 6).fill(colors.gold);
        doc.restore();
      });

      doc.fillColor(colors.darkGray).fontSize(14).font('Helvetica-Oblique')
        .text('This is to certify that', 0, 200, { width: pageWidth, align: 'center' });
      doc.fillColor(colors.darkNavy).fontSize(36).font('Helvetica-Bold')
        .text(user.name, 0, 230, { width: pageWidth, align: 'center' });

      const nameWidth = doc.widthOfString(user.name);
      doc.strokeColor(colors.gold).lineWidth(1)
        .moveTo(centerX - nameWidth / 2 - 20, 272)
        .lineTo(centerX + nameWidth / 2 + 20, 272).stroke();

      if (user.rollNumber) {
        doc.fillColor(colors.mediumGray).fontSize(11).font('Helvetica')
          .text(`${user.rollNumber}  •  ${user.department}`, 0, 282, { width: pageWidth, align: 'center' });
      } else if (user.department) {
        doc.fillColor(colors.mediumGray).fontSize(11).font('Helvetica')
          .text(user.department, 0, 282, { width: pageWidth, align: 'center' });
      }

      doc.fillColor(colors.darkGray).fontSize(14).font('Helvetica-Oblique')
        .text('has successfully participated in', 0, 310, { width: pageWidth, align: 'center' });
      doc.fillColor(colors.navy).fontSize(22).font('Helvetica-Bold')
        .text(event.title, 0, 340, { width: pageWidth, align: 'center' });

      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      doc.fillColor(colors.mediumGray).fontSize(12).font('Helvetica')
        .text(`held on ${dateStr}`, 0, 375, { width: pageWidth, align: 'center' });
      if (event.venue) {
        doc.text(`at ${event.venue}`, 0, 392, { width: pageWidth, align: 'center' });
      }

      doc.strokeColor(colors.lightGold).lineWidth(0.5)
        .moveTo(100, 430).lineTo(pageWidth - 100, 430).stroke();

      const sigY = 460;
      doc.strokeColor(colors.darkGray).lineWidth(0.5)
        .moveTo(120, sigY + 30).lineTo(280, sigY + 30).stroke();
      doc.fillColor(colors.darkGray).fontSize(11).font('Helvetica-Bold')
        .text(issuer?.name || 'Event Organizer', 120, sigY + 38, { width: 160, align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor(colors.mediumGray)
        .text('Event Organizer', 120, sigY + 52, { width: 160, align: 'center' });

      doc.circle(centerX, sigY + 25, 35).strokeColor(colors.gold).lineWidth(2).stroke();
      doc.circle(centerX, sigY + 25, 30).strokeColor(colors.lightGold).lineWidth(1).stroke();
      doc.fillColor(colors.gold).fontSize(8).font('Helvetica-Bold')
        .text('UNIEVENT', centerX - 25, sigY + 15, { width: 50, align: 'center' });
      doc.fontSize(6).text('VERIFIED', centerX - 25, sigY + 28, { width: 50, align: 'center' });

      doc.strokeColor(colors.darkGray).lineWidth(0.5)
        .moveTo(pageWidth - 280, sigY + 30).lineTo(pageWidth - 120, sigY + 30).stroke();

      const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      doc.fillColor(colors.darkGray).fontSize(11).font('Helvetica-Bold')
        .text(issuedDate, pageWidth - 280, sigY + 38, { width: 160, align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor(colors.mediumGray)
        .text('Date of Issue', pageWidth - 280, sigY + 52, { width: 160, align: 'center' });

      doc.fillColor(colors.gold).fontSize(9).font('Helvetica')
        .text(`Certificate ID: ${certificate.certificateId}`, 0, pageHeight - 55, {
          width: pageWidth, align: 'center',
        });
      doc.fillColor(colors.lightGray).fontSize(7)
        .text('Powered by UniEvent - University Event Management System', 0, pageHeight - 40, {
          width: pageWidth, align: 'center',
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateTicketPDF, generateCertificatePDF };