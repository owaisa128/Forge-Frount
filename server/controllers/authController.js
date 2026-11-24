const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const { sendRegistrationEmailVerification } = require('../services/trainerEmailService');

// Helper to generate JWT Token
const generateToken = (id, role = 'user') => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ id, role }, jwtSecret, {
    expiresIn: '30d',
  });
};

// Check if MongoDB connection is ready
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

const createToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Input Validation
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Keep this defensive check linear-time; express-validator applies stricter validation at the route.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Check database connection
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const verificationToken = createToken();
    const registrationId = createToken();
    const expiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);
    let user;

    try {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: 'user',
        profileComplete: false,
        emailVerified: false,
        emailVerificationTokenHash: hashToken(verificationToken),
        emailVerificationTokenExpiresAt: expiresAt,
        registrationSessionHash: hashToken(registrationId),
        registrationSessionExpiresAt: expiresAt,
      });

      await sendRegistrationEmailVerification({
        name: user.name,
        email: user.email,
        token: verificationToken,
      });
    } catch (error) {
      if (user) {
        try {
          await User.deleteOne({ _id: user._id });
        } catch (cleanupError) {
          console.error('Registration rollback error:', cleanupError.message);
          return res.status(500).json({
            success: false,
            message: 'The verification email could not be sent and the account could not be rolled back. Contact support before retrying.',
          });
        }
      }
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
      }
      console.error('Registration email error:', error.message);
      const isConfigurationError = error.message.includes('Configure ')
        || error.message.includes('GMAIL_USER')
        || error.message.includes('GMAIL_APP_PASSWORD')
        || error.message.includes('CLIENT_URL');
      return res.status(503).json({
        success: false,
        message: isConfigurationError
          ? error.message
          : 'Could not send the verification email. Check the email settings and try again.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'We sent a verification link to your email address. Confirm it to continue.',
      email: user.email,
      registrationId,
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to start registration right now. Please try again later.',
    });
  }
};

const verifyEmailAddress = async (req, res) => {
  const { token } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({
      success: false,
      message: 'A valid email verification token is required',
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  const tokenHash = hashToken(token);
  const now = new Date();
  try {
    const member = await User.findOneAndUpdate({
      role: 'user',
      emailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: { $gt: now },
    }, {
      $set: {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
      },
    }, { new: true, runValidators: true });

    if (member) {
      return res.status(200).json({
        success: true,
        message: 'Email confirmed. Return to your registration tab to continue.',
      });
    }

    const trainer = await User.findOneAndUpdate({
      role: 'trainer',
      emailVerified: false,
      trainerApprovalStatus: 'awaiting_email_review',
      $or: [
        {
          emailVerificationTokenHash: tokenHash,
          emailVerificationTokenExpiresAt: { $gt: now },
        },
        {
          trainerEmailVerificationTokenHash: tokenHash,
          trainerEmailVerificationTokenExpiresAt: { $gt: now },
        },
      ],
    }, {
      $set: {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
        trainerEmailVerificationTokenHash: null,
        trainerEmailVerificationTokenExpiresAt: null,
        trainerApprovalStatus: 'awaiting_profile',
      },
    }, { new: true, runValidators: true });

    if (!trainer) {
      return res.status(410).json({
        success: false,
        message: 'This verification link is invalid, expired, or has already been used.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email confirmed. Return to your registration tab to continue your trainer profile.',
    });
  } catch (error) {
    console.error('Email verification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify this email address right now.',
    });
  }
};

const getRegistrationStatus = async (req, res) => {
  const { registrationId } = req.params;
  if (typeof registrationId !== 'string' || !/^[a-f0-9]{64}$/i.test(registrationId)) {
    return res.status(400).json({
      success: false,
      message: 'A valid registration session is required',
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  try {
    const user = await User.findOne({
      registrationSessionHash: hashToken(registrationId),
      registrationSessionExpiresAt: { $gt: new Date() },
    }).select('emailVerified role trainerApprovalStatus');
    if (!user) {
      return res.status(410).json({
        success: false,
        message: 'This registration session has expired. Start a new registration to continue.',
      });
    }

    return res.status(200).json({
      success: true,
      emailVerified: user.emailVerified === true,
      role: user.role,
    });
  } catch (error) {
    console.error('Registration status error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to check email verification right now.',
    });
  }
};

const completeUserRegistration = async (req, res) => {
  const {
    registrationId,
    fitnessGoal,
    fitnessRequirements,
    trainingExperience,
    height,
    weight,
    targetWeight,
    preferredUnit,
    bio,
  } = req.body;

  if (typeof registrationId !== 'string' || !/^[a-f0-9]{64}$/i.test(registrationId)) {
    return res.status(400).json({
      success: false,
      message: 'A valid registration session is required',
    });
  }
  if (
    typeof fitnessRequirements !== 'string'
    || fitnessRequirements.trim().length < 10
    || fitnessRequirements.trim().length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message: 'Describe your fitness requirements in 10 to 1,000 characters.',
    });
  }
  if (fitnessGoal !== undefined && (
    typeof fitnessGoal !== 'string' || fitnessGoal.trim().length > 80
  )) {
    return res.status(400).json({
      success: false,
      message: 'Choose a valid fitness goal.',
    });
  }
  if (
    trainingExperience !== undefined
    && !['', 'beginner', 'intermediate', 'advanced'].includes(trainingExperience)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Choose a valid training experience level.',
    });
  }
  if (preferredUnit !== undefined && !['metric', 'imperial'].includes(preferredUnit)) {
    return res.status(400).json({
      success: false,
      message: 'Choose metric or imperial units.',
    });
  }
  if (bio !== undefined && (
    typeof bio !== 'string' || bio.trim().length > 500
  )) {
    return res.status(400).json({
      success: false,
      message: 'About you cannot exceed 500 characters.',
    });
  }

  const measurements = [
    ['height', height, 50, 300],
    ['weight', weight, 20, 500],
    ['targetWeight', targetWeight, 20, 500],
  ];
  for (const [label, value, min, max] of measurements) {
    if (
      value !== undefined
      && value !== ''
      && (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)
    ) {
      return res.status(400).json({
        success: false,
        message: `${label} must be between ${min} and ${max}.`,
      });
    }
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  try {
    const updates = {
      fitnessRequirements: fitnessRequirements.trim(),
      bio: typeof bio === 'string' ? bio.trim() : '',
      preferredUnit: preferredUnit || 'metric',
      profileComplete: true,
    };
    if (typeof fitnessGoal === 'string' && fitnessGoal.trim()) {
      updates.fitnessGoal = fitnessGoal.trim();
    }
    if (trainingExperience) updates.trainingExperience = trainingExperience;
    for (const [field, value] of measurements) {
      if (value !== undefined && value !== '') updates[field] = Number(value);
    }

    const user = await User.findOneAndUpdate({
      role: 'user',
      emailVerified: true,
      registrationSessionHash: hashToken(registrationId),
      registrationSessionExpiresAt: { $gt: new Date() },
    }, {
      $set: updates,
      $unset: {
        registrationSessionHash: 1,
        registrationSessionExpiresAt: 1,
      },
    }, { new: true, runValidators: true });

    if (!user) {
      return res.status(410).json({
        success: false,
        message: 'Verify your email again or start a new registration session to continue.',
      });
    }

    try {
      await Settings.updateOne(
        { user: user._id },
        {
          $setOnInsert: {
            user: user._id,
            preferredUnit: user.preferredUnit || 'metric',
            dailyStepGoal: 10000,
            dailyWaterGoal: 2500,
            dailyWorkoutGoal: 45,
            theme: 'dark',
            notificationsEnabled: true,
          },
        },
        { upsert: true }
      );
    } catch (settingsError) {
      console.warn('Note: settings init on registration:', settingsError.message);
    }

    try {
      await Notification.create({
        user: user._id,
        title: 'Welcome to FORGE',
        message: `Welcome, ${user.name}! Your account is ready. Track workouts, nutrition, and progress here.`,
        type: 'system',
        unread: true,
      });
    } catch (notificationError) {
      console.warn('Note: welcome notification on registration:', notificationError.message);
    }

    const token = generateToken(user._id, 'user');
    return res.status(200).json({
      success: true,
      message: 'Your account is ready.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileComplete: user.profileComplete,
        fitnessGoal: user.fitnessGoal,
        fitnessRequirements: user.fitnessRequirements,
        trainingExperience: user.trainingExperience,
        height: user.height,
        weight: user.weight,
        targetWeight: user.targetWeight,
        bio: user.bio,
        avatarUrl: user.avatarUrl || '',
        membership: user.membership,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Complete member registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to save your fitness details right now.',
    });
  }
};

const resendEmailVerification = async (req, res) => {
  const normalizedEmail = typeof req.body.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : '';
  if (!normalizedEmail) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.emailVerified !== false
      || (user.role === 'trainer' && user.trainerApprovalStatus !== 'awaiting_email_review')) {
      return res.status(200).json({
        success: true,
        message: 'If this address has an unverified registration, a new link will be sent.',
      });
    }

    const verificationToken = createToken();
    const expiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);
    user.emailVerificationTokenHash = hashToken(verificationToken);
    user.emailVerificationTokenExpiresAt = expiresAt;
    user.registrationSessionExpiresAt = expiresAt;
    if (user.role === 'trainer') {
      user.trainerEmailVerificationTokenHash = hashToken(verificationToken);
      user.trainerEmailVerificationTokenExpiresAt = expiresAt;
    }
    await user.save();

    try {
      await sendRegistrationEmailVerification({
        name: user.name,
        email: user.email,
        token: verificationToken,
        role: user.role,
      });
    } catch (emailError) {
      console.error('Resend verification email error:', emailError.message);
      return res.status(503).json({
        success: false,
        message: 'The verification email could not be sent. Check the email settings and try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A new verification link has been sent.',
    });
  } catch (error) {
    console.error('Resend verification email error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to resend the verification email right now.',
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  let diagnosticStage = 'input_validation';

  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Input Validation
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    diagnosticStage = 'database_check';

    // Check database connection
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    // Check for user
    diagnosticStage = 'user_lookup';
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.info('[login-diagnostic] stage=user_lookup userFound=false status=401');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Match password
    diagnosticStage = 'password_comparison';
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.info('[login-diagnostic] stage=password_comparison userFound=true passwordMatch=false status=401');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        success: false,
        message: 'Confirm your email using the link we sent before signing in.',
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended. Contact support for assistance.',
      });
    }

    if (user.accountDeletionScheduledAt) {
      return res.status(403).json({
        success: false,
        message: 'This account is scheduled for deletion. Use the cancellation link sent to your email to restore it.',
      });
    }

    const isTrainerProfileSetup = user.role === 'trainer'
      && user.trainerApprovalStatus === 'awaiting_profile';
    if (user.role === 'trainer' && user.trainerApprovalStatus !== 'approved' && !isTrainerProfileSetup) {
      const statusMessages = {
        awaiting_email_review: 'Confirm your email using the link we sent before continuing your trainer application.',
        awaiting_admin_review: 'Your trainer profile is waiting for final administrator approval.',
        rejected: 'Your trainer application was not approved.',
      };
      return res.status(403).json({
        success: false,
        message: statusMessages[user.trainerApprovalStatus] || 'Your trainer account is not approved yet.',
      });
    }

    diagnosticStage = 'token_generation';
    const token = isTrainerProfileSetup
      ? jwt.sign(
        { id: user._id, role: 'trainer', trainerSetup: true },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      )
      : generateToken(user._id, user.role || 'user');

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        profileComplete: user.profileComplete,
        fitnessGoal: user.fitnessGoal,
        fitnessRequirements: user.fitnessRequirements,
        trainingExperience: user.trainingExperience,
        height: user.height,
        weight: user.weight,
        targetWeight: user.targetWeight,
        bio: user.bio,
        avatarUrl: user.avatarUrl || '',
        trainerProfile: user.role === 'trainer' ? user.trainerProfile : undefined,
        trainerApprovalStatus: user.role === 'trainer' ? user.trainerApprovalStatus : undefined,
        membership: user.membership,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`[login-diagnostic] stage=${diagnosticStage} errorName=${errorName}`);
    return res.status(500).json({
      success: false,
      message: 'Unable to sign in right now. Please try again later.',
    });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId)
      .select('-password')
      .populate('membership.assignedTrainer', 'name email avatarUrl trainerProfile.specialization');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        profileComplete: user.profileComplete,
        bio: user.bio || '',
        fitnessGoal: user.fitnessGoal,
        fitnessRequirements: user.fitnessRequirements || '',
        trainingExperience: user.trainingExperience,
        height: user.height,
        weight: user.weight,
        targetWeight: user.targetWeight,
        targetCalories: user.targetCalories,
        preferredUnit: user.preferredUnit || 'metric',
        avatarUrl: user.avatarUrl || '',
        trainerProfile: user.role === 'trainer' ? user.trainerProfile : undefined,
        trainerApprovalStatus: user.role === 'trainer' ? user.trainerApprovalStatus : undefined,
        membership: user.membership,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user profile',
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const {
      name,
      bio,
      fitnessGoal,
      fitnessRequirements,
      trainingExperience,
      height,
      weight,
      targetWeight,
      targetCalories,
      preferredUnit,
      avatarUrl,
      profileComplete,
      password,
    } = req.body;

    if (name && name.trim()) user.name = name.trim();
    if (bio !== undefined) user.bio = bio;
    if (fitnessGoal !== undefined) user.fitnessGoal = fitnessGoal;
    if (fitnessRequirements !== undefined) user.fitnessRequirements = fitnessRequirements;
    if (trainingExperience !== undefined) user.trainingExperience = trainingExperience;
    if (height !== undefined) user.height = Number(height);
    if (weight !== undefined) user.weight = Number(weight);
    if (targetWeight !== undefined) user.targetWeight = Number(targetWeight);
    if (targetCalories !== undefined) user.targetCalories = Number(targetCalories);
    if (preferredUnit !== undefined) user.preferredUnit = preferredUnit;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (profileComplete === true) user.profileComplete = true;
    if (password && password.length >= 6) {
      user.password = password;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role || 'user',
        profileComplete: updatedUser.profileComplete,
        bio: updatedUser.bio,
        fitnessGoal: updatedUser.fitnessGoal,
        fitnessRequirements: updatedUser.fitnessRequirements,
        trainingExperience: updatedUser.trainingExperience,
        height: updatedUser.height,
        weight: updatedUser.weight,
        targetWeight: updatedUser.targetWeight,
        targetCalories: updatedUser.targetCalories,
        preferredUnit: updatedUser.preferredUnit,
        avatarUrl: updatedUser.avatarUrl,
        membership: updatedUser.membership,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile',
    });
  }
};

/**
 * @desc    Logout user / clear session
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logoutUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

module.exports = {
  registerUser,
  verifyEmailAddress,
  getRegistrationStatus,
  completeUserRegistration,
  resendEmailVerification,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
};
