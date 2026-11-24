const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyEmailAddress,
  getRegistrationStatus,
  completeUserRegistration,
  resendEmailVerification,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/securityMiddleware');
const {
  requestAccountDeletion,
  confirmAccountDeletion,
  cancelAccountDeletion,
} = require('../controllers/accountDeletionController');
const {
  requestPasswordReset,
  requestPasswordResetByEmail,
  completePasswordReset,
} = require('../controllers/passwordResetController');
const {
  validateRegister,
  validateLogin,
  validatePasswordResetRequest,
  validateProfileUpdate,
} = require('../middleware/validationMiddleware');

router.post('/register', authLimiter, validateRegister, registerUser);
router.post('/email-verification/verify', authLimiter, verifyEmailAddress);
router.post('/email-verification/resend', authLimiter, validatePasswordResetRequest, resendEmailVerification);
router.get('/registration-status/:registrationId', getRegistrationStatus);
router.post('/registration/complete', authLimiter, completeUserRegistration);
router.post('/login', validateLogin, loginUser);
router.post('/logout', logoutUser);
router.post(
  '/password-reset/request',
  authLimiter,
  validatePasswordResetRequest,
  requestPasswordResetByEmail,
);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, validateProfileUpdate, updateUserProfile);
router.post('/profile/password-reset/request', authLimiter, protect, requestPasswordReset);
router.post('/password-reset/complete', authLimiter, completePasswordReset);
router.post('/profile/deletion/request', protect, requestAccountDeletion);
router.post('/profile/deletion/confirm', confirmAccountDeletion);
router.post('/profile/deletion/cancel', cancelAccountDeletion);

module.exports = router;
