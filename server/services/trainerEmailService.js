const nodemailer = require('nodemailer');

const getMailConfiguration = () => {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('Configure GMAIL_USER and GMAIL_APP_PASSWORD in server/.env');
  }

  let clientUrl;
  try {
    clientUrl = new URL(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch {
    throw new Error('CLIENT_URL must be a valid URL before FORGE emails can be sent');
  }

  return { gmailUser: GMAIL_USER, appPassword: GMAIL_APP_PASSWORD, clientUrl };
};

const getTransport = ({ gmailUser, appPassword }) => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: gmailUser, pass: appPassword.replace(/\s/g, '') },
});

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const sendRegistrationEmailVerification = async ({
  name,
  email,
  token,
  role = 'user',
}) => {
  const config = getMailConfiguration();
  const transport = getTransport(config);
  const verificationUrl = new URL('/verify-email', config.clientUrl);
  verificationUrl.searchParams.set('token', token);
  const safeName = escapeHtml(name);
  const isTrainer = role === 'trainer';
  const purpose = isTrainer
    ? 'Confirm your email address to continue your trainer application.'
    : 'Confirm your email address to continue creating your account.';
  const subject = isTrainer
    ? 'Confirm your FORGE trainer email'
    : 'Confirm your FORGE email';

  await transport.sendMail({
    from: config.gmailUser,
    to: email,
    subject,
    text: `Hi ${name},\n\n${purpose}\n\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${safeName},</p><p>${purpose}</p><p><a href="${verificationUrl}">Confirm email and continue</a></p><p>This link expires in 24 hours.</p>`,
  });
};

const sendTrainerEmailVerification = async ({ trainerName, trainerEmail, token }) =>
  sendRegistrationEmailVerification({
    name: trainerName,
    email: trainerEmail,
    token,
    role: 'trainer',
  });

const sendTrainerApprovalEmail = async ({ trainerName, trainerEmail }) => {
  const config = getMailConfiguration();
  const transport = getTransport(config);
  const dashboardUrl = new URL('/trainer/dashboard', config.clientUrl);
  const safeName = escapeHtml(trainerName);

  await transport.sendMail({
    from: config.gmailUser,
    to: trainerEmail,
    subject: 'Your FORGE trainer application is approved',
    text: `Hi ${trainerName},\n\nYour trainer application has been approved. Sign in to open your trainer dashboard: ${dashboardUrl}`,
    html: `<p>Hi ${safeName},</p><p>Your trainer application has been approved.</p><p><a href="${dashboardUrl}">Sign in and open your trainer dashboard</a></p>`,
  });
};

const sendTrainerRejectionEmail = async ({ trainerName, trainerEmail }) => {
  const config = getMailConfiguration();
  const transport = getTransport(config);
  const contactUrl = new URL('/contact', config.clientUrl);
  const safeName = escapeHtml(trainerName);

  await transport.sendMail({
    from: config.gmailUser,
    to: trainerEmail,
    subject: 'Your FORGE trainer application update',
    text: `Hi ${trainerName},\n\nYour trainer application was not approved. If you have questions, contact FORGE: ${contactUrl}`,
    html: `<p>Hi ${safeName},</p><p>Your trainer application was not approved.</p><p>If you have questions, <a href="${contactUrl}">contact FORGE</a>.</p>`,
  });
};

module.exports = {
  sendRegistrationEmailVerification,
  sendTrainerEmailVerification,
  sendTrainerApprovalEmail,
  sendTrainerRejectionEmail,
};
