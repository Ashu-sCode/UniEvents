const nodemailer = require('nodemailer');

function isSmtpConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

async function getTransporter() {
  const port = Number(process.env.SMTP_PORT);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // common TLS port
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  // In dev/test environments, avoid hard failures if SMTP isn't set.
  if (!isSmtpConfigured()) {
    console.log('[EmailService] SMTP not configured. Password reset URL:', resetUrl);
    return;
  }

  const transporter = await getTransporter();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = 'Reset your UniEvent password';

  const text = `Hello${name ? ` ${name}` : ''},\n\n` +
    `We received a request to reset your password.\n` +
    `Use the link below to set a new password (valid for a short time):\n\n` +
    `${resetUrl}\n\n` +
    `If you didn't request this, you can ignore this email.\n`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
}

module.exports = {
  sendPasswordResetEmail,
};
