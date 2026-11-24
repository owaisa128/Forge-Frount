const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../services/passwordResetEmailService');

const RESET_WINDOW_MINUTES = 60;
const isDbConnected = () => mongoose.connection.readyState === 1;
const createToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const issuePasswordReset = async (user) => {
  const token = createToken();
  const tokenHash = hashToken(token);
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = new Date(
    Date.now() + RESET_WINDOW_MINUTES * 60 * 1000,
  );
  await user.save();

  try {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token,
    });
    return true;
  } catch (emailError) {
    await User.updateOne(
      { _id: user._id, passwordResetTokenHash: tokenHash },
      { $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null } },
    );
    console.error('Password reset email error:', emailError.message);
    return false;
  }
};

const requestPasswordReset = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!(await issuePasswordReset(user))) {
      return res.status(503).json({
        success: false,
        message: 'Unable to send the password reset email. Check the email service configuration and try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `A one-time reset link was sent to ${user.email}. It expires in 60 minutes.`,
    });
  } catch (error) {
    console.error('Password reset request error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to request a password reset',
    });
  }
};

const requestPasswordResetByEmail = async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: 'A valid email address is required',
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user && !(await issuePasswordReset(user))) {
      return res.status(503).json({
        success: false,
        message: 'Unable to send a password reset email right now. Try again later.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists for that email, a reset link is on its way.',
    });
  } catch (error) {
    console.error('Public password reset request error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to request a password reset',
    });
  }
};

const completePasswordReset = async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({
      success: false,
      message: 'A valid password reset token is required',
    });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long',
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          password: passwordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      },
      { runValidators: true },
    );

    if (!user) {
      return res.status(410).json({
        success: false,
        message: 'This password reset link is invalid, expired, or has already been used.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset. Sign in with your new password.',
    });
  } catch (error) {
    console.error('Password reset completion error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to reset the password',
    });
  }
};

module.exports = {
  requestPasswordReset,
  requestPasswordResetByEmail,
  completePasswordReset,
};
