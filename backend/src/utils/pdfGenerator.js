const PDFDocument = require('pdfkit');

const { CERTIFICATE_LAYOUT_VARIABLES } = require('../config/certificateLayout');
const { generateQRCodeBuffer } = require('./qrGenerator');

const drawRoundedRect = (doc, x, y, w, h, r) => {
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

const formatHumanDate = (value, options) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('en-US', options);
};

const generateTicketPDF = async (ticket) =>
  new Promise(async (resolve, reject) => {
    try {
      const width = 420;
      const height = 720;
      const padding = 24;

      const doc = new PDFDocument({ size: [width, height], margin: 0 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const event = ticket?.eventId || {};
      const user = ticket?.userId || {};
      const ticketId = ticket?.ticketId || ticket?.code || 'TKT-UNAVAILABLE';

      const colors = {
        shell: '#f4f6fb',
        card: '#ffffff',
        dark: '#0f172a',
        darkSoft: '#111827',
        accent: '#22c55e',
        accentSoft: '#dcfce7',
        slate: '#64748b',
        line: '#d7dce5',
      };

      doc.rect(0, 0, width, height).fill(colors.shell);

      drawRoundedRect(doc, 22, 18, width - 44, height - 36, 26).fillColor(colors.card).fill();
      drawRoundedRect(doc, 22, 18, width - 44, height - 36, 26).lineWidth(1).strokeColor('#dbe2ec').stroke();

      drawRoundedRect(doc, 22, 18, width - 44, 190, 26).fillColor(colors.dark).fill();
      doc.save();
      doc.circle(86, 74, 120).fillOpacity(0.11).fill('#38bdf8');
      doc.circle(width - 72, 170, 120).fillOpacity(0.1).fill('#22c55e');
      doc.restore();

      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('UNIEVENT CINEMA PASS', padding + 18, 42, { characterSpacing: 1.6 });
      doc
        .fillColor('#cbd5e1')
        .font('Helvetica')
        .fontSize(10)
        .text('Admit one attendee', padding + 18, 60);

      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(26)
        .text(event?.title || 'Campus Event', padding + 18, 96, {
          width: width - padding * 2 - 36,
          lineGap: 4,
        });

      const infoTop = 154;
      const infoColumns = [
        { label: 'DATE', value: formatHumanDate(event?.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
        { label: 'TIME', value: event?.time || '-' },
        { label: 'VENUE', value: event?.venue || '-' },
      ];

      infoColumns.forEach((item, index) => {
        const x = padding + 18 + index * 118;
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(item.label, x, infoTop);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text(item.value, x, infoTop + 12, {
          width: 102,
        });
      });

      const tearY = 230;
      doc.circle(22, tearY, 14).fill(colors.shell);
      doc.circle(width - 22, tearY, 14).fill(colors.shell);
      doc.strokeColor(colors.line).dash(5, { space: 4 }).moveTo(40, tearY).lineTo(width - 40, tearY).stroke().undash();

      const qrValue = process.env.TICKET_VERIFICATION_URL_BASE
        ? `${process.env.TICKET_VERIFICATION_URL_BASE}?ticketId=${encodeURIComponent(ticketId)}`
        : ticketId;

      const qrBuffer = await generateQRCodeBuffer(qrValue);
      drawRoundedRect(doc, padding + 18, 264, 136, 136, 18).fillColor('#ffffff').fill();
      drawRoundedRect(doc, padding + 18, 264, 136, 136, 18).lineWidth(1).strokeColor('#e2e8f0').stroke();
      doc.image(qrBuffer, padding + 34, 280, { width: 104, height: 104 });

      drawRoundedRect(doc, 180, 264, 196, 136, 18).fillColor('#f8fafc').fill();
      drawRoundedRect(doc, 180, 264, 196, 136, 18).lineWidth(1).strokeColor('#e2e8f0').stroke();
      doc.fillColor(colors.slate).font('Helvetica').fontSize(9).text('ATTENDEE', 198, 284);
      doc.fillColor(colors.dark).font('Helvetica-Bold').fontSize(18).text(user?.name || 'Participant', 198, 300, {
        width: 160,
      });
      doc.fillColor(colors.slate).font('Helvetica').fontSize(10).text(user?.rollNumber || 'Roll number unavailable', 198, 336);
      doc.fillColor(colors.slate).font('Helvetica').fontSize(10).text(user?.department || 'Department unavailable', 198, 354);

      drawRoundedRect(doc, padding + 18, 424, width - padding * 2 - 36, 88, 20).fillColor('#f8fafc').fill();
      drawRoundedRect(doc, padding + 18, 424, width - padding * 2 - 36, 88, 20).lineWidth(1).strokeColor('#e2e8f0').stroke();
      doc.fillColor(colors.slate).font('Helvetica').fontSize(9).text('TICKET ID', padding + 36, 448);
      doc.fillColor(colors.dark).font('Helvetica-Bold').fontSize(18).text(ticketId, padding + 36, 466, {
        characterSpacing: 1.1,
      });
      doc.fillColor(colors.slate).font('Helvetica').fontSize(10).text('Present this code at the entry desk for fast QR verification.', padding + 36, 492);

      doc.fillColor(colors.darkSoft);
      let barX = padding + 34;
      const barY = 552;
      const barEnd = width - padding - 34;
      let hash = 0;
      for (const character of ticketId) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
      }

      const nextBit = () => {
        hash ^= hash << 13;
        hash >>>= 0;
        hash ^= hash >> 17;
        hash >>>= 0;
        hash ^= hash << 5;
        hash >>>= 0;
        return hash;
      };

      while (barX < barEnd) {
        const value = nextBit();
        const barWidth = 1 + (value % 3);
        if (value % 2 === 0) {
          doc.rect(barX, barY, barWidth, 52).fill();
        }
        barX += barWidth + 1;
      }

      drawRoundedRect(doc, padding + 18, 622, width - padding * 2 - 36, 50, 16).fillColor(colors.accentSoft).fill();
      doc.fillColor('#166534').font('Helvetica-Bold').fontSize(10).text('ENTRY READY', padding + 36, 640, { characterSpacing: 1.2 });
      doc.fillColor('#166534').font('Helvetica').fontSize(10).text('One attendee. Non-transferable. Verified through UniEvent.', padding + 132, 640);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

const generateCertificatePDF = async (certificate) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const event = certificate.eventId || {};
      const user = certificate.userId || {};
      const issuer = certificate.issuedBy || {};

      const pageWidth = 842;
      const pageHeight = 595;
      const centerX = pageWidth / 2;

      const colors = {
        paper: '#fcfaf5',
        frame: '#d4af37',
        frameSoft: '#efe1b0',
        dark: '#0f172a',
        navy: '#1e3a5f',
        slate: '#5b6472',
        muted: '#8a94a3',
        seal: '#ca8a04',
      };

      const issuedDate = formatHumanDate(certificate.issuedAt, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const eventDate = formatHumanDate(event.date, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc.rect(0, 0, pageWidth, pageHeight).fill(colors.paper);
      doc.rect(18, 18, pageWidth - 36, pageHeight - 36).lineWidth(2.5).strokeColor(colors.frame).stroke();
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60).lineWidth(0.8).strokeColor(colors.frameSoft).stroke();

      doc.save();
      doc.circle(110, 96, 120).fillOpacity(0.05).fill('#2563eb');
      doc.circle(pageWidth - 110, pageHeight - 92, 130).fillOpacity(0.06).fill('#f59e0b');
      doc.restore();

      doc.fillColor(colors.navy).font('Helvetica-Bold').fontSize(18).text('UNIEVENT', 0, 64, {
        width: pageWidth,
        align: 'center',
        characterSpacing: 3,
      });
      doc.fillColor(colors.frame).font('Helvetica-Bold').fontSize(40).text('CERTIFICATE', 0, 96, {
        width: pageWidth,
        align: 'center',
        characterSpacing: 7,
      });
      doc.fillColor(colors.frame).font('Helvetica').fontSize(16).text('OF PARTICIPATION', 0, 140, {
        width: pageWidth,
        align: 'center',
        characterSpacing: 4,
      });

      doc.strokeColor(colors.frame).lineWidth(0.8).moveTo(centerX - 150, 180).lineTo(centerX + 150, 180).stroke();

      doc.fillColor(colors.slate).font('Helvetica-Oblique').fontSize(15).text('This is proudly presented to', 0, 206, {
        width: pageWidth,
        align: 'center',
      });

      doc.fillColor(colors.dark).font('Helvetica-Bold').fontSize(34).text(user.name || 'Participant', 0, 242, {
        width: pageWidth,
        align: 'center',
      });

      const nameWidth = doc.widthOfString(user.name || 'Participant');
      doc.strokeColor(colors.frame).lineWidth(1).moveTo(centerX - nameWidth / 2 - 18, 286).lineTo(centerX + nameWidth / 2 + 18, 286).stroke();

      const metaLine = [user.rollNumber, user.department].filter(Boolean).join('  ·  ');
      if (metaLine) {
        doc.fillColor(colors.muted).font('Helvetica').fontSize(11).text(metaLine, 0, 296, {
          width: pageWidth,
          align: 'center',
        });
      }

      doc.fillColor(colors.slate).font('Helvetica').fontSize(15).text('for successful participation in', 0, 334, {
        width: pageWidth,
        align: 'center',
      });

      doc.fillColor(colors.navy).font('Helvetica-Bold').fontSize(24).text(event.title || 'Campus Event', 0, 366, {
        width: pageWidth,
        align: 'center',
      });

      doc.fillColor(colors.muted).font('Helvetica').fontSize(12).text(`Held on ${eventDate}`, 0, 404, {
        width: pageWidth,
        align: 'center',
      });

      if (event.venue) {
        doc.text(`Venue: ${event.venue}`, 0, 422, { width: pageWidth, align: 'center' });
      }

      doc.strokeColor('#e2e8f0').lineWidth(0.8).moveTo(96, 470).lineTo(pageWidth - 96, 470).stroke();

      const signatureBlockX = 120;
      const signatureLineY = 500;
      const signatureBlockWidth = 170;
      const issueBlockWidth = 170;
      const issueBlockX = pageWidth - signatureBlockX - issueBlockWidth;

      doc.strokeColor(colors.slate).lineWidth(0.6).moveTo(signatureBlockX, signatureLineY).lineTo(signatureBlockX + signatureBlockWidth, signatureLineY).stroke();
      doc.fillColor(colors.dark).font('Helvetica-Bold').fontSize(11).text(issuer.name || CERTIFICATE_LAYOUT_VARIABLES.signature.label, signatureBlockX, signatureLineY + 8, {
        width: signatureBlockWidth,
        align: 'center',
      });
      doc.fillColor(colors.muted).font('Helvetica').fontSize(9).text(CERTIFICATE_LAYOUT_VARIABLES.signature.subtitle, signatureBlockX, signatureLineY + 24, {
        width: signatureBlockWidth,
        align: 'center',
      });
      if (CERTIFICATE_LAYOUT_VARIABLES.signature.imageUrl) {
        doc.fillColor(colors.muted).font('Helvetica-Oblique').fontSize(8).text('[e-sign asset configured]', signatureBlockX, signatureLineY - 18, {
          width: signatureBlockWidth,
          align: 'center',
        });
      }

      doc.circle(centerX, 505, 38).lineWidth(2).strokeColor(colors.seal).stroke();
      doc.circle(centerX, 505, 31).lineWidth(1).strokeColor(colors.frameSoft).stroke();
      doc.fillColor(colors.seal).font('Helvetica-Bold').fontSize(8).text('UNIEVENT', centerX - 24, 495, { width: 48, align: 'center' });
      doc.fontSize(6).text('VERIFIED', centerX - 24, 507, { width: 48, align: 'center' });
      if (CERTIFICATE_LAYOUT_VARIABLES.stamp.imageUrl) {
        doc.fillColor(colors.muted).font('Helvetica-Oblique').fontSize(7).text('[stamp asset configured]', centerX - 40, 545, { width: 80, align: 'center' });
      }

      doc.strokeColor(colors.slate).lineWidth(0.6).moveTo(issueBlockX, signatureLineY).lineTo(issueBlockX + issueBlockWidth, signatureLineY).stroke();
      doc.fillColor(colors.dark).font('Helvetica-Bold').fontSize(11).text(issuedDate, issueBlockX, signatureLineY + 8, {
        width: issueBlockWidth,
        align: 'center',
      });
      doc.fillColor(colors.muted).font('Helvetica').fontSize(9).text(CERTIFICATE_LAYOUT_VARIABLES.issueDate.label, issueBlockX, signatureLineY + 24, {
        width: issueBlockWidth,
        align: 'center',
      });

      doc.fillColor(colors.frame).font('Helvetica').fontSize(9).text(`Certificate ID: ${certificate.certificateId}`, 0, pageHeight - 48, {
        width: pageWidth,
        align: 'center',
      });
      doc.fillColor(colors.muted).font('Helvetica').fontSize(7).text('Powered by UniEvent - University Event Management System', 0, pageHeight - 34, {
        width: pageWidth,
        align: 'center',
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

module.exports = {
  generateTicketPDF,
  generateCertificatePDF,
};
