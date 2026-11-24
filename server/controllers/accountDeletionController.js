const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const { sendAccountDeletionVerificationEmail } = require('../services/accountDeletionEmailService');

const GRACE_PERIOD_DAYS = 90;
const VERIFICATION_WINDOW_MINUTES = 60;
const isDbConnected = () => mongoose.connection.readyState === 1;
const createToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const requestAccountDeletion = async (req, res) => {
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
    if (user.accountDeletionScheduledAt) {
      return res.status(409).json({
        success: false,
        message: 'This account already has a deletion request in progress.',
      });
    }

    const verificationToken = createToken();
    const cancellationToken = createToken();
    const expiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MINUTES * 60 * 1000);
    user.accountDeletionVerificationTokenHash = hashToken(verificationToken);
    user.accountDeletionVerificationExpiresAt = expiresAt;
    user.accountDeletionCancellationTokenHash = hashToken(cancellationToken);
    await user.save();

    try {
      await sendAccountDeletionVerificationEmail({
        email: user.email,
        name: user.name,
        verificationToken,
        cancellationToken,
      });
    } catch (emailError) {
      await User.updateOne(
        { _id: user._id, accountDeletionVerificationTokenHash: hashToken(verificationToken) },
        {
          $set: {
            accountDeletionVerificationTokenHash: null,
            accountDeletionVerificationExpiresAt: null,
            accountDeletionCancellationTokenHash: null,
          },
        },
      );
      console.error('Account deletion verification email error:', emailError.message);
      return res.status(503).json({
        success: false,
        message: 'Unable to send the verification email. Check the email service configuration and try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `A verification link was sent to ${user.email}. The account will not be scheduled for deletion until you verify it.`,
    });
  } catch (error) {
    console.error('Account deletion request error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to request account deletion',
    });
  }
};

const confirmAccountDeletion = async (req, res) => {
  const { token } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({
      success: false,
      message: 'A valid account deletion verification token is required',
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  try {
    const now = new Date();
    const deletionScheduledAt = new Date(
      now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    const user = await User.findOneAndUpdate(
      {
        accountDeletionVerificationTokenHash: hashToken(token),
        accountDeletionVerificationExpiresAt: { $gt: now },
        accountDeletionScheduledAt: null,
      },
      {
        $set: {
          accountDeletionRequestedAt: now,
          accountDeletionScheduledAt: deletionScheduledAt,
          accountDeletionVerificationTokenHash: null,
          accountDeletionVerificationExpiresAt: null,
        },
      },
      { new: true },
    );

    if (!user) {
      return res.status(410).json({
        success: false,
        message: 'This verification link is invalid, expired, or has already been used.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your account is scheduled for deletion in 90 days. Access is disabled. Use the cancellation link from your email to restore it during this period.',
    });
  } catch (error) {
    console.error('Account deletion confirmation error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to confirm account deletion',
    });
  }
};

const cancelAccountDeletion = async (req, res) => {
  const { token } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({
      success: false,
      message: 'A valid account restoration token is required',
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  try {
    const user = await User.findOneAndUpdate(
      {
        accountDeletionCancellationTokenHash: hashToken(token),
        accountDeletionScheduledAt: { $gt: new Date() },
      },
      {
        $set: {
          accountDeletionRequestedAt: null,
          accountDeletionScheduledAt: null,
          accountDeletionVerificationTokenHash: null,
          accountDeletionVerificationExpiresAt: null,
          accountDeletionCancellationTokenHash: null,
        },
      },
      { new: true },
    );

    if (!user) {
      return res.status(410).json({
        success: false,
        message: 'This restoration link is invalid, expired, or the account has already been deleted.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Account deletion was cancelled. Your account has been restored; sign in to continue.',
    });
  } catch (error) {
    console.error('Account deletion cancellation error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to restore the account',
    });
  }
};

module.exports = {
  requestAccountDeletion,
  confirmAccountDeletion,
  cancelAccountDeletion,
};
