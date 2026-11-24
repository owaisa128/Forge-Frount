const nodemailer = require('nodemailer');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const sendAccountDeletionVerificationEmail = async ({
  email,
  name,
  verificationToken,
  cancellationToken,
}) => {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('Configure GMAIL_USER and GMAIL_APP_PASSWORD in server/.env');
  }

  let clientUrl;
  try {
    clientUrl = new URL(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch {
    throw new Error('CLIENT_URL must be a valid URL before account deletion emails can be sent');
  }

  const verificationUrl = new URL('/account-deletion', clientUrl);
  verificationUrl.searchParams.set('action', 'confirm');
  verificationUrl.searchParams.set('token', verificationToken);

  const cancellationUrl = new URL('/account-deletion', clientUrl);
  cancellationUrl.searchParams.set('action', 'cancel');
  cancellationUrl.searchParams.set('token', cancellationToken);

  const safeName = escapeHtml(name);
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s/g, '') },
  });

  await transport.sendMail({
    from: GMAIL_USER,
    to: email,
    subject: 'Confirm your FORMA account deletion request',
    text: [
      `Hello ${name},`,
      '',
      'Confirm your request to delete your FORMA account:',
      verificationUrl.toString(),
      '',
      'After confirmation, access is disabled and the account is scheduled for permanent deletion in 90 days. Membership purchase history is retained.',
      'To cancel during the 90-day period, use this cancellation link after confirming the deletion request:',
      cancellationUrl.toString(),
      '',
      'If you did not request account deletion, ignore this email.',
    ].join('\n'),
    html: `<p>Hello ${safeName},</p><p>Confirm your request to delete your FORMA account:</p><p><a href="${verificationUrl}">Verify account deletion</a></p><p>After confirmation, access is disabled and the account is scheduled for permanent deletion in 90 days. Membership purchase history is retained.</p><p>To cancel during the 90-day period, use this link after confirming the deletion request:</p><p><a href="${cancellationUrl}">Cancel scheduled deletion</a></p><p>If you did not request account deletion, ignore this email.</p>`,
  });
};

module.exports = { sendAccountDeletionVerificationEmail };
