const nodemailer = require('nodemailer');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const sendPasswordResetEmail = async ({ email, name, token }) => {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('Configure GMAIL_USER and GMAIL_APP_PASSWORD in server/.env');
  }

  let clientUrl;
  try {
    clientUrl = new URL(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch {
    throw new Error('CLIENT_URL must be a valid URL before password reset emails can be sent');
  }

  const resetUrl = new URL('/reset-password', clientUrl);
  resetUrl.hash = token;
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl.toString());
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s/g, '') },
  });

  await transport.sendMail({
    from: GMAIL_USER,
    to: email,
    subject: 'Reset your FORMA password',
    text: [
      `Hello ${name},`,
      '',
      'Use this one-time link to choose a new password within 60 minutes:',
      resetUrl.toString(),
      '',
      'If you did not request a password reset, you can ignore this email.',
    ].join('\n'),
    html: `<p>Hello ${safeName},</p><p>Use this one-time link to choose a new password within 60 minutes:</p><p><a href="${safeResetUrl}">Reset your password</a></p><p>If you did not request a password reset, you can ignore this email.</p>`,
  });
};

module.exports = { sendPasswordResetEmail };
