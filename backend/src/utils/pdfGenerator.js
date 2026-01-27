/**
 * PDF Generator Utility
 * 
 * Generates movie-ticket style PDFs for event tickets
 * and professional certificates for workshops.
 */

const PDFDocument = require('pdfkit');
const { generateQRCodeBuffer } = require('./qrGenerator');

/**
 * Generate a movie-ticket style PDF for event tickets
 * A6 size (105mm x 148mm) = approximately 297 x 420 points
 * 
 * @param {Object} ticket - Populated ticket document
 * @returns {Promise<Buffer>} PDF buffer
 * 
 * Ticket Layout:
 * ┌─────────────────────────────┐
 * │     UNIEVENT TICKET         │
 * │  ─────────────────────────  │
 * │  Event: [Event Name]        │
 * │  Date: [Date] Time: [Time]  │
 * │  Venue: [Venue]             │
 * │  ─────────────────────────  │
 * │  Attendee: [Name]           │
 * │  Roll No: [Roll Number]     │
 * │  ─────────────────────────  │
 * │        [QR CODE]            │
 * │  Ticket ID: [ID]            │
 * └─────────────────────────────┘
 */
const generateTicketPDF = async (ticket) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Compact ticket size - fits on single page guaranteed
      // Width: 280pt (~99mm), Height: 400pt (~141mm)
      const doc = new PDFDocument({
        size: [280, 400],
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
      const width = 280;

      // Colors - modern neutral palette
      const headerBg = '#1f2937';
      const textPrimary = '#111827';
      const textSecondary = '#6b7280';
      const dividerColor = '#e5e7eb';
      const accentColor = '#374151';

      // === HEADER SECTION (dark background) ===
      doc.rect(0, 0, width, 70)
         .fill(headerBg);

      // UniEvent Logo/Brand
      doc.fillColor('#9ca3af')
         .fontSize(9)
         .font('Helvetica')
         .text('UNIEVENT', 0, 15, { width, align: 'center' });

      // Event Title
      doc.fillColor('#ffffff')
         .fontSize(13)
         .font('Helvetica-Bold')
         .text(event.title, 15, 32, { 
           width: width - 30, 
           align: 'center',
           lineGap: 2,
           height: 32,
           ellipsis: true
         });

      // === EVENT DETAILS SECTION ===
      let yPos = 80;

      // Format date compactly
      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Date & Time row
      doc.fillColor(textSecondary)
         .fontSize(7)
         .font('Helvetica')
         .text('DATE', 20, yPos);
      doc.text('TIME', width / 2 + 10, yPos);

      doc.fillColor(textPrimary)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(dateStr, 20, yPos + 10, { width: width / 2 - 30 });
      doc.text(event.time, width / 2 + 10, yPos + 10);

      yPos += 32;

      // Venue
      doc.fillColor(textSecondary)
         .fontSize(7)
         .font('Helvetica')
         .text('VENUE', 20, yPos);

      doc.fillColor(textPrimary)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(event.venue, 20, yPos + 10, { width: width - 40 });

      yPos += 35;

      // === DIVIDER (dashed line with notches) ===
      // Draw notches
      doc.circle(-5, yPos, 8).fill('#f7f7f8');
      doc.circle(width + 5, yPos, 8).fill('#f7f7f8');
      
      // Dashed line
      doc.strokeColor(dividerColor)
         .lineWidth(1)
         .dash(4, { space: 3 })
         .moveTo(15, yPos)
         .lineTo(width - 15, yPos)
         .stroke()
         .undash();

      yPos += 15;

      // === ATTENDEE SECTION ===
      doc.fillColor(textSecondary)
         .fontSize(7)
         .font('Helvetica')
         .text('ATTENDEE', 20, yPos);

      doc.fillColor(textPrimary)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(user.name, 20, yPos + 10);

      yPos += 28;

      // Roll Number & Department on same line
      if (user.rollNumber) {
        doc.fillColor(textSecondary)
           .fontSize(8)
           .font('Helvetica')
           .text(`${user.rollNumber}  •  ${user.department}`, 20, yPos);
      } else {
        doc.fillColor(textSecondary)
           .fontSize(8)
           .font('Helvetica')
           .text(user.department, 20, yPos);
      }

      yPos += 20;

      // === QR CODE SECTION ===
      const qrSize = 110;
      const qrX = (width - qrSize) / 2;
      const qrY = yPos + 5;

      // QR background box
      doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 8)
         .fillColor('#ffffff')
         .strokeColor(dividerColor)
         .fillAndStroke();

      // QR Code
      const qrBuffer = await generateQRCodeBuffer(ticket.ticketId);
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      yPos = qrY + qrSize + 20;

      // Ticket ID
      doc.fillColor(accentColor)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(ticket.ticketId, 0, yPos, { width, align: 'center' });

      // Footer note
      doc.fillColor(textSecondary)
         .fontSize(7)
         .font('Helvetica')
         .text('Show this ticket at entry', 0, yPos + 15, { width, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate a professional certificate PDF
 * A4 Landscape size
 * 
 * @param {Object} certificate - Populated certificate document
 * @returns {Promise<Buffer>} PDF buffer
 * 
 * Certificate Layout:
 * ┌─────────────────────────────────────────────────┐
 * │              CERTIFICATE OF PARTICIPATION       │
 * │                                                 │
 * │              This is to certify that            │
 * │                   [Name]                        │
 * │        has successfully participated in         │
 * │                 [Event Name]                    │
 * │           held on [Date] at [Venue]             │
 * │                                                 │
 * │  Issued by: [Organizer]    Certificate ID: [ID]│
 * └─────────────────────────────────────────────────┘
 */
const generateCertificatePDF = async (certificate) => {
  return new Promise(async (resolve, reject) => {
    try {
      // A4 Landscape
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const event = certificate.eventId;
      const user = certificate.userId;
      const issuer = certificate.issuedBy;

      // Colors
      const primaryColor = '#1a365d';
      const goldColor = '#b8860b';
      const borderColor = '#d4af37';

      // Decorative border
      doc.rect(30, 30, 782, 535)
         .lineWidth(3)
         .strokeColor(borderColor)
         .stroke();

      doc.rect(40, 40, 762, 515)
         .lineWidth(1)
         .strokeColor(borderColor)
         .stroke();

      // Header decoration
      doc.fillColor(goldColor)
         .fontSize(14)
         .font('Helvetica')
         .text('★ ★ ★', { align: 'center' });

      // Title
      doc.moveDown(1);
      doc.fillColor(primaryColor)
         .fontSize(36)
         .font('Helvetica-Bold')
         .text('CERTIFICATE', { align: 'center' });

      doc.fillColor(goldColor)
         .fontSize(18)
         .text('OF PARTICIPATION', { align: 'center' });

      // Body text
      doc.moveDown(2);
      doc.fillColor('#374151')
         .fontSize(14)
         .font('Helvetica')
         .text('This is to certify that', { align: 'center' });

      // Recipient name
      doc.moveDown(0.5);
      doc.fillColor(primaryColor)
         .fontSize(28)
         .font('Helvetica-Bold')
         .text(user.name, { align: 'center' });

      // Roll number if exists
      if (user.rollNumber) {
        doc.fillColor('#666666')
           .fontSize(12)
           .font('Helvetica')
           .text(`(${user.rollNumber} - ${user.department})`, { align: 'center' });
      }

      // Event details
      doc.moveDown(1);
      doc.fillColor('#374151')
         .fontSize(14)
         .font('Helvetica')
         .text('has successfully participated in', { align: 'center' });

      doc.moveDown(0.5);
      doc.fillColor(primaryColor)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(event.title, { align: 'center' });

      // Date and venue
      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.moveDown(0.5);
      doc.fillColor('#374151')
         .fontSize(12)
         .font('Helvetica')
         .text(`held on ${dateStr}`, { align: 'center' });

      // Footer with signature area
      doc.moveDown(3);
      
      // Left side - Issuer
      doc.fillColor('#374151')
         .fontSize(10)
         .text('_______________________', 100, 450);
      doc.text(`${issuer.name}`, 100, 465);
      doc.text('Event Organizer', 100, 478);

      // Right side - Certificate ID
      doc.text('_______________________', 550, 450);
      doc.fillColor(goldColor)
         .fontSize(9)
         .text(`Certificate ID: ${certificate.certificateId}`, 550, 465);
      
      const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.fillColor('#374151')
         .text(`Issued: ${issuedDate}`, 550, 478);

      // UniEvent branding
      doc.fillColor('#9ca3af')
         .fontSize(8)
         .text('Powered by UniEvent - University Event Management System', 0, 520, {
           align: 'center',
           width: 842
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
