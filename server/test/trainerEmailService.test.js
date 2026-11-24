const test = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const {
  sendRegistrationEmailVerification,
  sendTrainerEmailVerification,
  sendTrainerApprovalEmail,
  sendTrainerRejectionEmail,
} = require('../services/trainerEmailService');

test('registration verification and trainer decision emails link to the right steps', async () => {
  const originalCreateTransport = nodemailer.createTransport;
  const originalEnvironment = {
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    CLIENT_URL: process.env.CLIENT_URL,
  };
  const sentEmails = [];

  nodemailer.createTransport = () => ({
    sendMail: async (message) => sentEmails.push(message),
  });
  process.env.GMAIL_USER = 'mailer@example.test';
  process.env.GMAIL_APP_PASSWORD = 'test-password';
  process.env.CLIENT_URL = 'https://vigorfit.example';

  try {
    await sendRegistrationEmailVerification({
      name: 'Taylor Member',
      email: 'member@example.test',
      token: 'b'.repeat(64),
    });
    await sendTrainerEmailVerification({
      trainerName: 'Taylor Trainer',
      trainerEmail: 'taylor@example.test',
      token: 'a'.repeat(64),
    });
    await sendTrainerApprovalEmail({
      trainerName: 'Taylor Trainer',
      trainerEmail: 'taylor@example.test',
    });
    await sendTrainerRejectionEmail({
      trainerName: 'Taylor Trainer',
      trainerEmail: 'taylor@example.test',
    });
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  assert.equal(sentEmails.length, 4);
  assert.equal(sentEmails[0].to, 'member@example.test');
  assert.match(sentEmails[0].text, /\/verify-email\?token=/);
  assert.match(sentEmails[0].text, /expires in 24 hours/i);
  assert.equal(sentEmails[1].to, 'taylor@example.test');
  assert.match(sentEmails[1].text, /\/verify-email\?token=/);
  assert.equal(sentEmails[2].to, 'taylor@example.test');
  assert.match(sentEmails[2].text, /\/trainer\/dashboard/);
  assert.equal(sentEmails[3].to, 'taylor@example.test');
  assert.match(sentEmails[3].text, /\/contact/);
  assert.match(sentEmails[3].text, /not approved/i);
});
