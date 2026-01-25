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
      // A6 size in points (72 points = 1 inch)
      const doc = new PDFDocument({
        size: [297, 420], // A6 size in points
        margin: 20
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const event = ticket.eventId;
      const user = ticket.userId;

      // Colors
      const primaryColor = '#1a365d';
      const accentColor = '#2563eb';

      // Header
      doc.fillColor(primaryColor)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('UNIEVENT', { align: 'center' });

      doc.fontSize(10)
         .fillColor('#666666')
         .font('Helvetica')
         .text('University Event Pass', { align: 'center' });

      // Divider
      doc.moveTo(20, 70)
         .lineTo(277, 70)
         .strokeColor('#e5e7eb')
         .stroke();

      // Event Details
      doc.moveDown(0.5);
      doc.fillColor(primaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(event.title, { align: 'center' });

      doc.moveDown(0.5);
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica');

      // Format date
      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.text(`Date: ${dateStr}`, { align: 'center' });
      doc.text(`Time: ${event.time}`, { align: 'center' });
      doc.text(`Venue: ${event.venue}`, { align: 'center' });

      // Divider
      doc.moveTo(20, 170)
         .lineTo(277, 170)
         .stroke();

      // Attendee Details
      doc.moveDown(0.5);
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('ATTENDEE DETAILS', { align: 'center' });

      doc.moveDown(0.3);
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica')
         .text(`Name: ${user.name}`, { align: 'center' });
      
      if (user.rollNumber) {
        doc.text(`Roll No: ${user.rollNumber}`, { align: 'center' });
      }
      
      doc.text(`Department: ${user.department}`, { align: 'center' });

      // Divider
      doc.moveTo(20, 250)
         .lineTo(277, 250)
         .stroke();

      // QR Code
      const qrBuffer = await generateQRCodeBuffer(ticket.ticketId);
      doc.image(qrBuffer, 98, 260, { width: 100, height: 100 });

      // Ticket ID
      doc.fillColor(accentColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(`Ticket ID: ${ticket.ticketId}`, 20, 370, { align: 'center' });

      // Footer
      doc.fillColor('#9ca3af')
         .fontSize(7)
         .font('Helvetica')
         .text('Please present this ticket at the venue entrance', 20, 390, { align: 'center' });
      doc.text('Single use only • Non-transferable', { align: 'center' });

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
