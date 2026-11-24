const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const {
  sendTrainerEmailVerification,
  sendTrainerApprovalEmail,
  sendTrainerRejectionEmail,
} = require('../services/trainerEmailService');

const isDbConnected = () => mongoose.connection.readyState === 1;
const createActionToken = () => crypto.randomBytes(32).toString('hex');
const hashActionToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;
const createTrainerSetupToken = (id) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ id, role: 'trainer', trainerSetup: true }, jwtSecret, {
    expiresIn: '30m',
  });
};
const getPublicTrainer = (trainer) => ({
  id: trainer._id,
  name: trainer.name,
  email: trainer.email,
  role: trainer.role,
  trainerApprovalStatus: trainer.trainerApprovalStatus,
  trainerProfile: trainer.trainerProfile,
  avatarUrl: trainer.avatarUrl || '',
  createdAt: trainer.createdAt,
  updatedAt: trainer.updatedAt,
});

const createTrainerApplication = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  const { name, email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const token = createActionToken();
  const registrationId = createActionToken();
  const expiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);
  let trainer;
  try {
    trainer = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'trainer',
      profileComplete: false,
      emailVerified: false,
      emailVerificationTokenHash: hashActionToken(token),
      emailVerificationTokenExpiresAt: expiresAt,
      registrationSessionHash: hashActionToken(registrationId),
      registrationSessionExpiresAt: expiresAt,
      trainerApprovalStatus: 'awaiting_email_review',
      trainerEmailVerificationTokenHash: hashActionToken(token),
      trainerEmailVerificationTokenExpiresAt: expiresAt,
    });

    await sendTrainerEmailVerification({
      trainerName: trainer.name,
      trainerEmail: trainer.email,
      token,
    });
  } catch (error) {
    if (trainer) {
      try {
        await User.deleteOne({ _id: trainer._id });
      } catch (cleanupError) {
        console.error('Trainer registration rollback error:', cleanupError.message);
        return res.status(500).json({
          success: false,
          message: 'The verification email could not be sent and the application could not be rolled back. Contact support before retrying.',
        });
      }
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    console.error('Trainer application email error:', error.message);
    const isDescriptiveError = error.message.includes('Configure ')
      || error.message.includes('GMAIL_USER')
      || error.message.includes('GMAIL_APP_PASSWORD')
      || error.message.includes('CLIENT_URL');
    return res.status(503).json({
      success: false,
      message: isDescriptiveError
        ? error.message
        : (process.env.NODE_ENV === 'development'
            ? `Could not send the trainer verification email: ${error.message}. Check Gmail settings in server/.env`
            : 'Could not send the trainer verification email. Check the Gmail settings and try again.'),
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Trainer account created. Check your email and confirm your address to continue your profile.',
    email: trainer.email,
    registrationId,
  });
};

const verifyTrainerEmail = async (req, res) => {
  const { token } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ success: false, message: 'A valid email verification token is required' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
      return res.status(503).json({ success: false, message: 'Trainer setup is temporarily unavailable' });
    }

    const trainer = await User.findOneAndUpdate({
      trainerEmailVerificationTokenHash: hashActionToken(token),
      trainerApprovalStatus: 'awaiting_email_review',
      trainerEmailVerificationTokenExpiresAt: { $gt: new Date() },
    }, {
      $set: {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
        trainerApprovalStatus: 'awaiting_profile',
        trainerEmailVerificationTokenHash: null,
        trainerEmailVerificationTokenExpiresAt: null,
      },
    }, { new: true, runValidators: true });
    if (!trainer) {
      return res.status(410).json({
        success: false,
        message: 'This verification link is invalid, expired, or has already been used',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email confirmed. Continue by completing your trainer profile.',
      user: {
        id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        role: trainer.role,
        profileComplete: trainer.profileComplete,
        avatarUrl: trainer.avatarUrl || '',
        trainerProfile: trainer.trainerProfile,
        trainerApprovalStatus: trainer.trainerApprovalStatus,
      },
      token: createTrainerSetupToken(trainer._id),
    });
  } catch (error) {
    console.error('Trainer email verification error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify the trainer email' });
  }
};

const isValidProfileImage = (dataUrl) => {
  if (typeof dataUrl !== 'string') return false;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;

  const image = Buffer.from(match[2], 'base64');
  if (!image.length || image.length > 2 * 1024 * 1024) return false;
  if (match[1] === 'image/png') {
    return image.length >= 8
      && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (match[1] === 'image/jpeg') {
    return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  }
  return image.length >= 12
    && image.toString('ascii', 0, 4) === 'RIFF'
    && image.toString('ascii', 8, 12) === 'WEBP';
};

const getTrainerProfileInputError = ({
  phone,
  specialization,
  experienceYears,
  certifications,
  bio,
  avatarUrl,
}) => {
  if (
    typeof phone !== 'string' || phone.trim().length < 5 || phone.trim().length > 40
    || typeof specialization !== 'string' || specialization.trim().length < 2 || specialization.trim().length > 120
    || experienceYears === '' || experienceYears === null
    || !Number.isFinite(Number(experienceYears)) || Number(experienceYears) < 0 || Number(experienceYears) > 80
    || typeof certifications !== 'string' || certifications.trim().length > 1000
    || typeof bio !== 'string' || bio.trim().length < 20 || bio.trim().length > 1000
    || !isValidProfileImage(avatarUrl)
  ) {
    return 'Provide a valid phone, specialization, experience, certifications, 20–1000 character bio, and a JPEG, PNG, or WebP profile photo up to 2 MiB.';
  }
  return null;
};

const trainerProfileUpdates = ({
  phone,
  specialization,
  experienceYears,
  certifications,
  bio,
  avatarUrl,
}) => ({
  trainerProfile: {
    phone: phone.trim(),
    specialization: specialization.trim(),
    experienceYears: Number(experienceYears),
    certifications: certifications.trim(),
    bio: bio.trim(),
  },
  bio: bio.trim(),
  avatarUrl,
  trainerApprovalStatus: 'awaiting_admin_review',
});

const completeTrainerProfile = async (req, res) => {
  if (!req.trainerSetupOnly || req.user?.role !== 'trainer') {
    return res.status(403).json({
      success: false,
      message: 'Confirm your email before completing the trainer profile.',
    });
  }
  const profileError = getTrainerProfileInputError(req.body);
  if (profileError) {
    return res.status(400).json({
      success: false,
      message: profileError,
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const trainer = await User.findOneAndUpdate({
      _id: req.user._id,
      role: 'trainer',
      trainerApprovalStatus: 'awaiting_profile',
    }, {
      $set: trainerProfileUpdates(req.body),
      $unset: {
        registrationSessionHash: 1,
        registrationSessionExpiresAt: 1,
      },
    }, { new: true, runValidators: true });

    if (!trainer) {
      return res.status(410).json({
        success: false,
        message: 'This trainer profile has already been submitted or is no longer awaiting completion.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Trainer profile submitted for final administrator approval. Sign-in will be available after the administrator approves it.',
    });
  } catch (error) {
    console.error('Complete trainer profile error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to submit the trainer profile' });
  }
};

const completeTrainerProfileWithRegistration = async (req, res) => {
  const { registrationId } = req.body;
  if (typeof registrationId !== 'string' || !/^[a-f0-9]{64}$/i.test(registrationId)) {
    return res.status(400).json({
      success: false,
      message: 'A valid registration session is required.',
    });
  }
  const profileError = getTrainerProfileInputError(req.body);
  if (profileError) {
    return res.status(400).json({ success: false, message: profileError });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const trainer = await User.findOneAndUpdate({
      role: 'trainer',
      emailVerified: true,
      trainerApprovalStatus: 'awaiting_profile',
      registrationSessionHash: hashActionToken(registrationId),
      registrationSessionExpiresAt: { $gt: new Date() },
    }, {
      $set: trainerProfileUpdates(req.body),
      $unset: {
        registrationSessionHash: 1,
        registrationSessionExpiresAt: 1,
      },
    }, { new: true, runValidators: true });

    if (!trainer) {
      return res.status(410).json({
        success: false,
        message: 'Verify your email again or start a new registration session to continue.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your trainer profile is with the administrator for final review. We will email you when a decision is made.',
    });
  } catch (error) {
    console.error('Complete trainer registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to submit the trainer profile right now.',
    });
  }
};

const getPublicTrainerDirectory = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const trainers = await User.find({
      role: 'trainer',
      trainerApprovalStatus: 'approved',
    })
      .select('name avatarUrl trainerProfile.specialization trainerProfile.experienceYears trainerProfile.certifications trainerProfile.bio')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      trainers: trainers.map((trainer) => ({
        id: trainer._id,
        name: trainer.name,
        avatarUrl: trainer.avatarUrl || '',
        specialization: trainer.trainerProfile?.specialization || '',
        experienceYears: trainer.trainerProfile?.experienceYears ?? null,
        certifications: trainer.trainerProfile?.certifications || '',
        bio: trainer.trainerProfile?.bio || '',
      })),
    });
  } catch (error) {
    console.error('Get public trainer directory error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load the trainer directory' });
  }
};

const getAdminTrainers = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }
  try {
    const trainers = await User.find({
      role: 'trainer',
    })
      .select('name email avatarUrl trainerProfile trainerApprovalStatus createdAt updatedAt')
      .sort({ updatedAt: -1 });
    return res.status(200).json({
      success: true,
      count: trainers.length,
      trainers: trainers.map(getPublicTrainer),
    });
  } catch (error) {
    console.error('Get trainer applications error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load trainer applications' });
  }
};

const decideTrainerFromPanel = async (req, res) => {
  const { decision } = req.body;
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'Decision must be approve or reject' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid trainer ID' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const currentTrainer = await User.findOne({
      _id: req.params.id,
      role: 'trainer',
    }).select('trainerApprovalStatus');
    if (!currentTrainer) {
      return res.status(404).json({
        success: false,
        message: 'Pending trainer application not found',
      });
    }

    const currentStatus = currentTrainer.trainerApprovalStatus;
    const pendingStatuses = [
      'awaiting_email_review',
      'awaiting_profile',
      'awaiting_admin_review',
    ];
    if (!pendingStatuses.includes(currentStatus)) {
      return res.status(409).json({
        success: false,
        message: 'This trainer application is no longer pending',
      });
    }

    if (decision === 'approve' && currentStatus !== 'awaiting_admin_review') {
      return res.status(409).json({
        success: false,
        message: currentStatus === 'awaiting_email_review'
          ? 'The trainer must confirm their email before continuing'
          : 'The trainer must submit their profile before final approval',
      });
    }

    const approved = decision === 'approve';
    const trainerApprovalStatus = approved ? 'approved' : 'rejected';
    const trainer = await User.findOneAndUpdate({
      _id: req.params.id,
      role: 'trainer',
      trainerApprovalStatus: currentStatus,
    }, {
      $set: {
        trainerApprovalStatus,
        trainerEmailVerificationTokenHash: null,
        trainerEmailVerificationTokenExpiresAt: null,
      },
    }, { new: true, runValidators: true });
    if (!trainer) {
      return res.status(409).json({
        success: false,
        message: 'This trainer application changed while the decision was being saved. Refresh and try again.',
      });
    }

    let decisionEmailSent = false;
    let settingsInitialized;
    if (approved) {
      try {
        await Settings.updateOne(
          { user: trainer._id },
          {
            $setOnInsert: {
              user: trainer._id,
              preferredUnit: 'metric',
              dailyStepGoal: 10000,
              dailyWaterGoal: 2500,
              dailyWorkoutGoal: 45,
              theme: 'dark',
              notificationsEnabled: true,
            },
          },
          { upsert: true }
        );
        settingsInitialized = true;
      } catch (settingsError) {
        settingsInitialized = false;
        console.error('Trainer settings initialization error:', settingsError.message);
      }

    }

    try {
      if (approved) {
        await sendTrainerApprovalEmail({
          trainerName: trainer.name,
          trainerEmail: trainer.email,
        });
      } else {
        await sendTrainerRejectionEmail({
          trainerName: trainer.name,
          trainerEmail: trainer.email,
        });
      }
      decisionEmailSent = true;
    } catch (emailError) {
      console.error(`Trainer ${decision} email error:`, emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: approved
        ? decisionEmailSent && settingsInitialized
          ? 'Trainer approved. An approval email with a sign-in link has been sent.'
          : `Trainer approved, but ${[
            !decisionEmailSent ? 'the approval email could not be sent' : '',
            !settingsInitialized ? 'default trainer settings could not be initialized' : '',
          ].filter(Boolean).join(' and ')}. Check the server logs and resolve these issues.`
        : decisionEmailSent
          ? 'Trainer application rejected. A decision email has been sent.'
          : 'Trainer application rejected, but the decision email could not be sent. Check the server logs and resolve this issue.',
      trainer: getPublicTrainer(trainer),
      ...(approved
        ? { approvalEmailSent: decisionEmailSent, settingsInitialized }
        : { rejectionEmailSent: decisionEmailSent }),
    });
  } catch (error) {
    console.error('Admin trainer decision error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update the trainer application' });
  }
};

module.exports = {
  createTrainerApplication,
  verifyTrainerEmail,
  completeTrainerProfile,
  completeTrainerProfileWithRegistration,
  getPublicTrainerDirectory,
  getAdminTrainers,
  decideTrainerFromPanel,
};
