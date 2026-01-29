/**
 * PDF Generator Utility
 * 
 * Generates movie-ticket style PDFs for event tickets
 * and professional certificates for workshops.
 */

const PDFDocument = require('pdfkit');
const { generateQRCodeBuffer } = require('./qrGenerator');

/**
 * Generate a modern, two-column ticket PDF
 * Compact mobile-friendly size with premium design
 * 
 * @param {Object} ticket - Populated ticket document
 * @returns {Promise<Buffer>} PDF buffer
 * 
 * Ticket Layout:
 * ┌─────────────────────────────────────┐
 * │  ░░░░░ GRADIENT HEADER ░░░░░        │
 * │  UniEvent • Event Ticket            │
 * │  ═══════════════════════════════    │
 * │  EVENT NAME (large)                 │
 * ├─────────────────────────────────────┤
 * │  LEFT COLUMN    │    RIGHT COLUMN   │
 * │  Date           │    ┌─────────┐    │
 * │  Time           │    │ QR CODE │    │
 * │  Venue          │    │         │    │
 * │  ─────────────  │    └─────────┘    │
 * │  Attendee Name  │                   │
 * │  Department     │                   │
 * ├─────────────────────────────────────┤
 * │  TICKET ID      Show at entry       │
 * └─────────────────────────────────────┘
 */
const generateTicketPDF = async (ticket) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Wider ticket for two-column layout
      const width = 340;
      const height = 380;
      
      const doc = new PDFDocument({
        size: [width, height],
        margin: 0,
        bufferPages: true,
        autoFirstPage: true,
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const event = ticket.eventId;
      const user = ticket.userId;

      // Colors - premium neutral palette
      const headerBg = '#171717';     // neutral-900
      const cardBg = '#ffffff';
      const textPrimary = '#171717';  // neutral-900
      const textSecondary = '#525252'; // neutral-600
      const textMuted = '#a3a3a3';    // neutral-400
      const borderColor = '#e5e5e5';  // neutral-200
      const accentBg = '#f5f5f5';     // neutral-100

      // === ROUNDED CONTAINER BORDER ===
      doc.roundedRect(0, 0, width, height, 16)
         .fillColor(cardBg)
         .fill();

      // === HEADER SECTION (dark with subtle gradient effect) ===
      doc.save();
      doc.roundedRect(0, 0, width, 85, 16)
         .clip();
      doc.rect(0, 0, width, 85).fill(headerBg);
      // Add subtle lighter strip at top for gradient effect
      doc.rect(0, 0, width, 2).fill('#262626');
      doc.restore();

      // Brand text
      doc.fillColor(textMuted)
         .fontSize(9)
         .font('Helvetica')
         .text('UNIEVENT', 0, 18, { width, align: 'center' });

      doc.fillColor('#737373')
         .fontSize(7)
         .text('Event Ticket', 0, 30, { width, align: 'center' });

      // Event Title
      doc.fillColor('#ffffff')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(event.title, 20, 48, { 
           width: width - 40, 
           align: 'center',
           lineGap: 2,
           height: 28,
           ellipsis: true
         });

      // === TWO-COLUMN CONTENT SECTION ===
      const contentY = 100;
      const leftColX = 20;
      const leftColWidth = 170;
      const rightColX = 200;
      const qrSize = 110;

      // Format date
      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      let yPos = contentY;

      // --- LEFT COLUMN: Event Details ---
      // Date
      doc.fillColor(textMuted)
         .fontSize(7)
         .font('Helvetica')
         .text('DATE', leftColX, yPos);
      doc.fillColor(textPrimary)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(dateStr, leftColX, yPos + 10);

      yPos += 32;

      // Time
      doc.fillColor(textMuted)
         .fontSize(7)
         .font('Helvetica')
         .text('TIME', leftColX, yPos);
      doc.fillColor(textPrimary)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(event.time, leftColX, yPos + 10);

      yPos += 32;

      // Venue
      doc.fillColor(textMuted)
         .fontSize(7)
         .font('Helvetica')
         .text('VENUE', leftColX, yPos);
      doc.fillColor(textPrimary)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(event.venue, leftColX, yPos + 10, { 
           width: leftColWidth,
           height: 24,
           ellipsis: true
         });

      yPos += 42;

      // Divider line
      doc.strokeColor(borderColor)
         .lineWidth(1)
         .moveTo(leftColX, yPos)
         .lineTo(leftColX + leftColWidth - 10, yPos)
         .stroke();

      yPos += 15;

      // Attendee Name
      doc.fillColor(textMuted)
         .fontSize(7)
         .font('Helvetica')
         .text('ATTENDEE', leftColX, yPos);
      doc.fillColor(textPrimary)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(user.name, leftColX, yPos + 10);

      yPos += 32;

      // Department & Roll Number
      const deptText = user.rollNumber 
        ? `${user.rollNumber} • ${user.department}`
        : user.department;
      doc.fillColor(textSecondary)
         .fontSize(8)
         .font('Helvetica')
         .text(deptText, leftColX, yPos, { width: leftColWidth });

      // --- RIGHT COLUMN: QR Code ---
      const qrY = contentY + 15;
      const qrX = rightColX;

      // QR background with rounded corners
      doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
         .fillColor(accentBg)
         .fill();

      // QR border
      doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
         .strokeColor(borderColor)
         .lineWidth(1)
         .stroke();

      // QR Code
      const qrBuffer = await generateQRCodeBuffer(ticket.ticketId);
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // === FOOTER SECTION ===
      const footerY = height - 55;

      // Tear-off dotted line with notches
      doc.circle(-6, footerY, 10).fill(accentBg);
      doc.circle(width + 6, footerY, 10).fill(accentBg);
      
      doc.strokeColor(borderColor)
         .lineWidth(1)
         .dash(5, { space: 4 })
         .moveTo(15, footerY)
         .lineTo(width - 15, footerY)
         .stroke()
         .undash();

      // Ticket ID (left)
      doc.fillColor(textPrimary)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(ticket.ticketId, 20, footerY + 18);

      // Footer note (right)
      doc.fillColor(textMuted)
         .fontSize(8)
         .font('Helvetica')
         .text('Show this ticket at entry', width - 140, footerY + 18);

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
