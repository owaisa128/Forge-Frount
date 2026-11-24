const mongoose = require('mongoose');
const User = require('../models/User');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const VigorfitE = require('../models/VigorfitE');
const WaterIntake = require('../models/WaterIntake');
const TransformationPhoto = require('../models/TransformationPhoto');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');
const GpsSession = require('../models/GpsSession');
const WorkoutSession = require('../models/WorkoutSession');
const TrainerGoal = require('../models/TrainerGoal');
const TrainerClassBooking = require('../models/TrainerClassBooking');
const TrainerClass = require('../models/TrainerClass');
const TrainerMealPlan = require('../models/TrainerMealPlan');
const TrainerMessage = require('../models/TrainerMessage');
const MembershipPurchase = require('../models/MembershipPurchase');

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

const removeAccountData = async (userId) => {
  await Promise.all([
    Workout.deleteMany({ user: userId }),
    Workout.updateMany({ assignedTo: userId }, { $set: { assignedTo: null } }),
    Nutrition.deleteMany({ user: userId }),
    Progress.deleteMany({ user: userId }),
    VigorfitE.deleteMany({ user: userId }),
    WaterIntake.deleteMany({ user: userId }),
    TransformationPhoto.deleteMany({ user: userId }),
    Settings.deleteMany({ user: userId }),
    Notification.deleteMany({ user: userId }),
    Feedback.deleteMany({ user: userId }),
    GpsSession.deleteMany({ client: userId }),
    GpsSession.updateMany(
      { trainer: userId },
      { $set: { trainer: null, shareWithTrainer: false, consentedAt: null } },
    ),
    WorkoutSession.deleteMany({ client: userId }),
    WorkoutSession.updateMany(
      { trainer: userId },
      { $set: { trainer: null, shareWithTrainer: false, consentedAt: null } },
    ),
    TrainerGoal.deleteMany({ $or: [{ trainer: userId }, { client: userId }] }),
    TrainerClassBooking.deleteMany({
      $or: [{ trainer: userId }, { client: userId }],
    }),
    TrainerClass.deleteMany({ trainer: userId }),
    TrainerMealPlan.deleteMany({
      $or: [{ trainer: userId }, { client: userId }],
    }),
    TrainerMessage.deleteMany({
      $or: [{ trainer: userId }, { client: userId }],
    }),
    User.updateMany(
      { 'membership.assignedTrainer': userId },
      {
        $set: {
          'membership.assignedTrainer': null,
          'membership.trainerIncluded': false,
        },
      },
    ),
    MembershipPurchase.updateMany(
      { assignedTrainer: userId },
      { $set: { assignedTrainer: null } },
    ),
  ]);
};

const deleteExpiredAccounts = async () => {
  if (mongoose.connection.readyState !== 1) return;

  const now = new Date();
  const expiredUsers = await User.find({
    accountDeletionScheduledAt: { $lte: now },
  })
    .select('_id')
    .lean();

  for (const { _id: userId } of expiredUsers) {
    try {
      await removeAccountData(userId);
      const result = await User.deleteOne({
        _id: userId,
        accountDeletionScheduledAt: { $lte: new Date() },
      });
      if (result.deletedCount) {
        console.info(`Permanently deleted account ${userId}; membership purchase history retained.`);
      }
    } catch (error) {
      console.error(`Account deletion cleanup failed for ${userId}:`, error.message);
    }
  }
};

const startAccountDeletionCleanup = () => {
  const runCleanup = () => {
    deleteExpiredAccounts().catch((error) => {
      console.error('Scheduled account deletion cleanup failed:', error.message);
    });
  };
  runCleanup();
  const timer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  timer.unref();
};

module.exports = { deleteExpiredAccounts, startAccountDeletionCleanup };
