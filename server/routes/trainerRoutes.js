const express = require('express');
const {
  createTrainerApplication,
  verifyTrainerEmail,
  completeTrainerProfile,
  completeTrainerProfileWithRegistration,
  getPublicTrainerDirectory,
} = require('../controllers/trainerController');
const { validateRegister } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/directory', getPublicTrainerDirectory);
router.post('/register', validateRegister, createTrainerApplication);
router.post('/verify-email', verifyTrainerEmail);
router.post('/registration/complete', completeTrainerProfileWithRegistration);
router.post('/complete-profile', protect, completeTrainerProfile);

module.exports = router;
