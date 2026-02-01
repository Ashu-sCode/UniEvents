/**
 * PDF Generator Utility
 * 
 * Generates movie-ticket style PDFs for event tickets
 * and professional certificates for workshops.
 */

const PDFDocument = require('pdfkit');
const { generateQRCodeBuffer } = require('./qrGenerator');

/**
 * Generate a ticket PDF that matches the provided reference layout/structure,
 * using UniEvent's black/white/gray theme only.
 *
 * @param {Object} ticket - Populated ticket document
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateTicketPDF = async (ticket) => {
  return new Promise(async (resolve, reject) => {
    try {
      // === Canvas (fixed geometry) ===
      const pageWidth = 350;
      const pageHeight = 700;

      const PADDING = 24;
      const HEADER_HEIGHT = Math.round(pageHeight * 0.55); // top black section
      const FOOTER_START = HEADER_HEIGHT + 40;

      const doc = new PDFDocument({
        size: [pageWidth, pageHeight],
        margin: 0,
        bufferPages: true,
        autoFirstPage: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const event = ticket?.eventId || {};
      const user = ticket?.userId || {};

      // Only allowed colors
      const COLORS = {
        BLACK: '#111111',
        DARK: '#111111',
        WHITE: '#FFFFFF',
        GRAY: '#E5E5E5',
      };

      // Data mapping (no DB/schema changes; fall back to ticketId if needed)
      const ticketName = ticket?.ticketName || 'TICKET NAME';
      const eventName = event?.title || 'EVENT NAME';
      const attendeeName = user?.name || 'YOUR NAME';
      const code = ticket?.code || ticket?.ticketId || 'CODE';

      // QR payload: can be a verification URL if configured, otherwise a bare code
      // NOTE: scanner currently expects ticketId; keep base unset unless your scanner extracts ticketId from URL.
      const verificationBase = process.env.TICKET_VERIFICATION_URL_BASE;
      const qrValue = verificationBase
        ? `${verificationBase}${verificationBase.includes('?') ? '&' : '?'}ticketId=${encodeURIComponent(code)}`
        : code;

      const eventDate = new Date(event?.date);
      const dateStr = isNaN(eventDate.getTime())
        ? '-'
        : eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

      const descriptionRaw = String(event?.description || '')
        .replace(/\s+/g, ' ')
        .trim();
      const description = descriptionRaw
        ? descriptionRaw
        : 'Entry valid for one person. Please arrive early for a smooth check-in.';

      // === Base container ===
      const radius = 24;
      doc.roundedRect(0, 0, pageWidth, pageHeight, radius)
        .fillColor(COLORS.WHITE)
        .fill();
      doc.roundedRect(0.5, 0.5, pageWidth - 1, pageHeight - 1, radius)
        .lineWidth(1)
        .strokeColor(COLORS.GRAY)
        .stroke();

      // === Top Header Area ===
      doc.save();
      doc.roundedRect(0, 0, pageWidth, HEADER_HEIGHT, radius).clip();
      doc.rect(0, 0, pageWidth, HEADER_HEIGHT).fillColor(COLORS.DARK).fill();

      // Top-center semicircle cut-out (radius 14)
      doc.circle(pageWidth / 2, 0, 14).fillColor(COLORS.WHITE).fill();
      doc.restore();

      // 1) QR CONTAINER (white rounded square 120x120, centered)
      const qrSize = 120;
      const qrX = Math.round((pageWidth - qrSize) / 2);
      const qrY = 20; // margin-top 20

      doc.roundedRect(qrX, qrY, qrSize, qrSize, 18)
        .fillColor(COLORS.WHITE)
        .fill();

      // QR inside with padding 10
      const qrBuffer = await generateQRCodeBuffer(qrValue);
      doc.image(qrBuffer, qrX + 10, qrY + 10, { width: qrSize - 20, height: qrSize - 20 });

      // 2) Text under QR: SCAN HERE (font size 9)
      const scanY = qrY + qrSize + 10;
      doc.fillColor(COLORS.GRAY)
        .font('Helvetica')
        .fontSize(9)
        .text('SCAN HERE', 0, scanY, { width: pageWidth, align: 'center' });

      // 3) Big bold: TICKET NAME (font size 20)
      const ticketTitleY = scanY + 16;
      doc.fillColor(COLORS.WHITE)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(ticketName, PADDING, ticketTitleY, {
          width: pageWidth - PADDING * 2,
          align: 'center',
          ellipsis: true,
        });

      // 4) Smaller: EVENT NAME (font size 12)
      const eventTitleY = ticketTitleY + 26;
      doc.fillColor(COLORS.GRAY)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(eventName, PADDING, eventTitleY, {
          width: pageWidth - PADDING * 2,
          align: 'center',
          ellipsis: true,
        });

      // 5) DETAILS BOX (gray capsule, width 75% of ticket, radius 18)
      const detailBoxW = Math.round(pageWidth * 0.75);
      const detailBoxX = Math.round((pageWidth - detailBoxW) / 2);
      const detailBoxY = eventTitleY + 24;
      const detailPadX = 12;
      const detailPadY = 10;

      // Measure body height (auto), but cap to keep layout stable
      doc.font('Helvetica-Bold').fontSize(8);
      const titleH = doc.heightOfString('DETAILS INFORMATION', {
        width: detailBoxW - detailPadX * 2,
        align: 'center'
      });

      doc.font('Helvetica').fontSize(8);
      const bodyHRaw = doc.heightOfString(description, {
        width: detailBoxW - detailPadX * 2,
        align: 'center'
      });
      const bodyH = Math.min(bodyHRaw, 34);

      const detailBoxH = detailPadY + titleH + 6 + bodyH + detailPadY;

      doc.roundedRect(detailBoxX, detailBoxY, detailBoxW, detailBoxH, 18)
        .fillColor(COLORS.GRAY)
        .fill();

      doc.fillColor(COLORS.DARK)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('DETAILS INFORMATION', detailBoxX + detailPadX, detailBoxY + detailPadY, {
          width: detailBoxW - detailPadX * 2,
          align: 'center',
          ellipsis: true,
        });

      doc.fillColor(COLORS.DARK)
        .font('Helvetica')
        .fontSize(8)
        .text(description, detailBoxX + detailPadX, detailBoxY + detailPadY + titleH + 6, {
          width: detailBoxW - detailPadX * 2,
          align: 'center',
          height: bodyH,
          ellipsis: true,
        });

      // 6) Two lines: NAME <username> / CODE <ticket.code>
      const nameCodeY = detailBoxY + detailBoxH + 14;

      doc.fillColor(COLORS.WHITE)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`NAME  ${attendeeName}`, PADDING, nameCodeY, {
          width: pageWidth - PADDING * 2,
          align: 'center',
          ellipsis: true,
        });

      doc.fillColor(COLORS.WHITE)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`CODE  ${code}`, PADDING, nameCodeY + 18, {
          width: pageWidth - PADDING * 2,
          align: 'center',
          ellipsis: true,
        });

      // === Perforation line ===
      const perforationY = HEADER_HEIGHT;

      // Half-circle cut effect on both sides
      doc.circle(0, perforationY, 16).fillColor(COLORS.WHITE).fill();
      doc.circle(pageWidth, perforationY, 16).fillColor(COLORS.WHITE).fill();

      doc.strokeColor(COLORS.GRAY)
        .lineWidth(1)
        .dash(6, { space: 5 })
        .moveTo(PADDING, perforationY)
        .lineTo(pageWidth - PADDING, perforationY)
        .stroke()
        .undash();

      // === Bottom White Section (centered stack) ===
      const bottomTitleY = FOOTER_START;

      doc.fillColor(COLORS.BLACK)
        .font('Helvetica-Bold')
        .fontSize(16)
        .text(ticketName, PADDING, bottomTitleY, {
          width: pageWidth - PADDING * 2,
          align: 'center',
          ellipsis: true,
        });

      doc.fillColor(COLORS.DARK)
        .font('Helvetica')
        .fontSize(12)
        .text(eventName, PADDING, bottomTitleY + 22, {
          width: pageWidth - PADDING * 2,
          align: 'center',
          ellipsis: true,
        });

      doc.fillColor(COLORS.DARK)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(attendeeName, PADDING, bottomTitleY + 44, {
          width: pageWidth - PADDING * 2,
          align: 'center',
          ellipsis: true,
        });

      // === Barcode (centered near bottom, width 80%) ===
      const barcodeW = Math.round(pageWidth * 0.8);
      const barcodeH = 54;
      const barcodeX = Math.round((pageWidth - barcodeW) / 2);
      const barcodeY = pageHeight - 110;

      // Keep existing barcode generation logic (vector bars, deterministic)
      const drawBarcode = (value) => {
        let state = 0;
        for (const ch of String(value)) {
          state = (state * 31 + ch.charCodeAt(0)) >>> 0;
        }

        const next = () => {
          state ^= state << 13;
          state >>>= 0;
          state ^= state >>> 17;
          state >>>= 0;
          state ^= state << 5;
          state >>>= 0;
          return state;
        };

        let x = barcodeX + 10;
        const maxX = barcodeX + barcodeW - 10;

        doc.fillColor(COLORS.BLACK);
        while (x < maxX) {
          const r = next();
          const isBar = (r & 1) === 1;
          const w = 1 + (r % 3); // 1..3
          if (isBar) {
            doc.rect(x, barcodeY + 10, w, barcodeH - 20).fill();
          }
          x += w;
        }
      };

      drawBarcode(code);

      // Numeric string under barcode (deterministic)
      let hash = 0;
      for (const ch of String(code)) hash = (hash * 33 + ch.charCodeAt(0)) % 1000000;
      const numeric = String(hash).padStart(10, '0').slice(0, 10);

      doc.fillColor(COLORS.DARK)
        .font('Helvetica')
        .fontSize(8)
        .text(numeric, 0, barcodeY + barcodeH + 6, { width: pageWidth, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate a PROFESSIONAL and MESMERIZING certificate PDF
 * A4 Landscape size with elegant design
 * 
 * @param {Object} certificate - Populated certificate document
 * @returns {Promise<Buffer>} PDF buffer
 * 
 * Features:
 * - Elegant double border with corner decorations
 * - Soft gradient-like background effect
 * - Professional typography hierarchy
 * - Decorative ornaments and separators
 * - Signature placeholder with line
 * - University seal placeholder area
 */
const generateCertificatePDF = async (certificate) => {
  return new Promise(async (resolve, reject) => {
    try {
      // A4 Landscape: 842 x 595 points
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const event = certificate.eventId;
      const user = certificate.userId;
      const issuer = certificate.issuedBy;
      
      const pageWidth = 842;
      const pageHeight = 595;

      // ========== COLORS ==========
      const colors = {
        navy: '#1a365d',
        darkNavy: '#0f172a',
        gold: '#d4af37',
        lightGold: '#f5e6c8',
        cream: '#fdfbf7',
        darkGray: '#374151',
        mediumGray: '#6b7280',
        lightGray: '#e5e7eb'
      };

      // ========== BACKGROUND ==========
      // Soft cream background
      doc.rect(0, 0, pageWidth, pageHeight)
         .fill(colors.cream);

      // Subtle gradient effect with overlapping rectangles
      doc.rect(0, 0, pageWidth, 100)
         .fill('#faf8f3');
      doc.rect(0, pageHeight - 100, pageWidth, 100)
         .fill('#faf8f3');

      // ========== DECORATIVE BORDERS ==========
      // Outer border
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
         .lineWidth(3)
         .strokeColor(colors.gold)
         .stroke();

      // Inner border
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
         .lineWidth(1)
         .strokeColor(colors.gold)
         .stroke();

      // Second inner border
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80)
         .lineWidth(0.5)
         .strokeColor(colors.lightGold)
         .stroke();

      // ========== CORNER DECORATIONS ==========
      const drawCornerOrnament = (x, y, rotation) => {
        doc.save();
        doc.translate(x, y);
        doc.rotate(rotation);
        
        // Corner flourish pattern
        doc.strokeColor(colors.gold)
           .lineWidth(1.5);
        
        // Main curves
        doc.moveTo(0, 0)
           .bezierCurveTo(15, 0, 25, 10, 25, 25)
           .stroke();
        doc.moveTo(0, 0)
           .bezierCurveTo(0, 15, 10, 25, 25, 25)
           .stroke();
        
        // Decorative dots
        doc.circle(12, 12, 2).fill(colors.gold);
        doc.circle(8, 18, 1.5).fill(colors.gold);
        doc.circle(18, 8, 1.5).fill(colors.gold);
        
        doc.restore();
      };

      // Draw corner ornaments
      drawCornerOrnament(45, 45, 0);       // Top-left
      drawCornerOrnament(pageWidth - 45, 45, 90);    // Top-right
      drawCornerOrnament(pageWidth - 45, pageHeight - 45, 180);  // Bottom-right
      drawCornerOrnament(45, pageHeight - 45, 270);  // Bottom-left

      // ========== HEADER ORNAMENT ==========
      const centerX = pageWidth / 2;
      
      // Decorative line with diamond
      doc.strokeColor(colors.gold)
         .lineWidth(1);
      doc.moveTo(centerX - 150, 70)
         .lineTo(centerX - 20, 70)
         .stroke();
      doc.moveTo(centerX + 20, 70)
         .lineTo(centerX + 150, 70)
         .stroke();
      
      // Center diamond
      doc.save();
      doc.translate(centerX, 70);
      doc.rotate(45);
      doc.rect(-6, -6, 12, 12)
         .fillColor(colors.gold)
         .fill();
      doc.restore();

      // ========== TITLE SECTION ==========
      // "CERTIFICATE" text
      doc.fillColor(colors.navy)
         .fontSize(42)
         .font('Helvetica-Bold')
         .text('CERTIFICATE', 0, 90, { 
           width: pageWidth, 
           align: 'center',
           characterSpacing: 8
         });

      // "OF PARTICIPATION" text
      doc.fillColor(colors.gold)
         .fontSize(18)
         .font('Helvetica')
         .text('OF PARTICIPATION', 0, 138, { 
           width: pageWidth, 
           align: 'center',
           characterSpacing: 4
         });

      // ========== DECORATIVE SEPARATOR ==========
      const separatorY = 170;
      // Left wing
      doc.strokeColor(colors.gold).lineWidth(0.5);
      doc.moveTo(centerX - 180, separatorY)
         .lineTo(centerX - 30, separatorY)
         .stroke();
      // Right wing
      doc.moveTo(centerX + 30, separatorY)
         .lineTo(centerX + 180, separatorY)
         .stroke();
      // Center ornament (3 small diamonds)
      [-15, 0, 15].forEach(offset => {
        doc.save();
        doc.translate(centerX + offset, separatorY);
        doc.rotate(45);
        doc.rect(-3, -3, 6, 6).fill(colors.gold);
        doc.restore();
      });

      // ========== BODY TEXT ==========
      // "This is to certify that"
      doc.fillColor(colors.darkGray)
         .fontSize(14)
         .font('Helvetica-Oblique')
         .text('This is to certify that', 0, 200, { 
           width: pageWidth, 
           align: 'center' 
         });

      // RECIPIENT NAME (Large, prominent)
      doc.fillColor(colors.darkNavy)
         .fontSize(36)
         .font('Helvetica-Bold')
         .text(user.name, 0, 230, { 
           width: pageWidth, 
           align: 'center'
         });

      // Underline for name
      const nameWidth = doc.widthOfString(user.name);
      doc.strokeColor(colors.gold)
         .lineWidth(1)
         .moveTo(centerX - nameWidth/2 - 20, 272)
         .lineTo(centerX + nameWidth/2 + 20, 272)
         .stroke();

      // Roll number and department
      if (user.rollNumber) {
        doc.fillColor(colors.mediumGray)
           .fontSize(11)
           .font('Helvetica')
           .text(`${user.rollNumber}  •  ${user.department}`, 0, 282, { 
             width: pageWidth, 
             align: 'center' 
           });
      } else if (user.department) {
        doc.fillColor(colors.mediumGray)
           .fontSize(11)
           .font('Helvetica')
           .text(user.department, 0, 282, { 
             width: pageWidth, 
             align: 'center' 
           });
      }

      // "has successfully participated in"
      doc.fillColor(colors.darkGray)
         .fontSize(14)
         .font('Helvetica-Oblique')
         .text('has successfully participated in', 0, 310, { 
           width: pageWidth, 
           align: 'center' 
         });

      // EVENT NAME
      doc.fillColor(colors.navy)
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(event.title, 0, 340, { 
           width: pageWidth, 
           align: 'center'
         });

      // Event date
      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fillColor(colors.mediumGray)
         .fontSize(12)
         .font('Helvetica')
         .text(`held on ${dateStr}`, 0, 375, { 
           width: pageWidth, 
           align: 'center' 
         });

      // Venue if available
      if (event.venue) {
        doc.text(`at ${event.venue}`, 0, 392, { 
          width: pageWidth, 
          align: 'center' 
        });
      }

      // ========== FOOTER SEPARATOR ==========
      const footerSepY = 430;
      doc.strokeColor(colors.lightGold)
         .lineWidth(0.5)
         .moveTo(100, footerSepY)
         .lineTo(pageWidth - 100, footerSepY)
         .stroke();

      // ========== SIGNATURE SECTION ==========
      const sigY = 460;

      // Left signature - Organizer
      doc.strokeColor(colors.darkGray)
         .lineWidth(0.5)
         .moveTo(120, sigY + 30)
         .lineTo(280, sigY + 30)
         .stroke();
      
      doc.fillColor(colors.darkGray)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(issuer?.name || 'Event Organizer', 120, sigY + 38, { width: 160, align: 'center' });
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Event Organizer', 120, sigY + 52, { width: 160, align: 'center' });

      // Center - Seal placeholder
      doc.circle(centerX, sigY + 25, 35)
         .strokeColor(colors.gold)
         .lineWidth(2)
         .stroke();
      doc.circle(centerX, sigY + 25, 30)
         .strokeColor(colors.lightGold)
         .lineWidth(1)
         .stroke();
      
      doc.fillColor(colors.gold)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('UNIEVENT', centerX - 25, sigY + 15, { width: 50, align: 'center' });
      doc.fontSize(6)
         .text('VERIFIED', centerX - 25, sigY + 28, { width: 50, align: 'center' });

      // Right side - Certificate info
      doc.strokeColor(colors.darkGray)
         .lineWidth(0.5)
         .moveTo(pageWidth - 280, sigY + 30)
         .lineTo(pageWidth - 120, sigY + 30)
         .stroke();

      const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      doc.fillColor(colors.darkGray)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(issuedDate, pageWidth - 280, sigY + 38, { width: 160, align: 'center' });
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Date of Issue', pageWidth - 280, sigY + 52, { width: 160, align: 'center' });

      // ========== CERTIFICATE ID ==========
      doc.fillColor(colors.gold)
         .fontSize(9)
         .font('Helvetica')
         .text(`Certificate ID: ${certificate.certificateId}`, 0, pageHeight - 55, { 
           width: pageWidth, 
           align: 'center' 
         });

      // ========== FOOTER BRANDING ==========
      doc.fillColor(colors.lightGray)
         .fontSize(7)
         .text('Powered by UniEvent - University Event Management System', 0, pageHeight - 40, {
           width: pageWidth,
           align: 'center'
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateTicketPDF,
  generateCertificatePDF
};
