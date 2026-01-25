/**
 * QR Code Generator Utility
 * 
 * Generates QR codes for tickets.
 * SECURITY: QR code contains ONLY the ticket ID, no personal data.
 */

const QRCode = require('qrcode');

/**
 * Generate a QR code as base64 data URL
 * @param {string} ticketId - The ticket ID to encode
 * @returns {Promise<string>} Base64 encoded QR code image
 * 
 * @example
 * const qrCode = await generateQRCode('TKT-ABC12345');
 * // Returns: 'data:image/png;base64,...'
 */
const generateQRCode = async (ticketId) => {
  try {
    // Generate QR code with only ticket ID (security best practice)
    const qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
      errorCorrectionLevel: 'H', // High error correction for better scanning
      type: 'image/png',
      quality: 0.92,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as buffer (for PDF embedding)
 * @param {string} ticketId - The ticket ID to encode
 * @returns {Promise<Buffer>} QR code image buffer
 */
const generateQRCodeBuffer = async (ticketId) => {
  try {
    const buffer = await QRCode.toBuffer(ticketId, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 0.92,
      margin: 2,
      width: 200
    });

    return buffer;
  } catch (error) {
    console.error('QR Code buffer generation error:', error);
    throw new Error('Failed to generate QR code buffer');
  }
};

module.exports = {
  generateQRCode,
  generateQRCodeBuffer
};
