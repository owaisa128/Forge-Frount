const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const GpsSession = require('../models/GpsSession');

test('new user documents do not invent profile goals or measurements', () => {
  const user = new User({ name: 'Test User', email: 'test@example.com', password: 'password' });

  assert.equal(user.fitnessGoal, undefined);
  assert.equal(user.trainingExperience, undefined);
  assert.equal(user.height, undefined);
  assert.equal(user.weight, undefined);
  assert.equal(user.targetWeight, undefined);
  assert.equal(user.targetCalories, undefined);
  assert.equal(user.trainerProfile.experienceYears, undefined);
});

test('new settings do not invent a calorie target', () => {
  const settings = new Settings({ user: new mongoose.Types.ObjectId() });

  assert.equal(settings.dailyCalorieTarget, undefined);
});

test('a GPS session has no calorie estimate until a usable weight is recorded', () => {
  const session = new GpsSession({
    client: new mongoose.Types.ObjectId(),
    activityType: 'running',
    startedAt: new Date(),
  });

  assert.equal(session.estimatedCalories, null);
});
