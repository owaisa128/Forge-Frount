// const http = require('http');
// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// require('dotenv').config();
// const path = require('path');
// const connectDB = require('./config/db');
// const { initLiveSocket } = require('./utils/liveSocket');
// const { startAccountDeletionCleanup } = require('./services/accountDeletionCleanupService');

// app.use('/api/feedback', feedbackRoutes);

// // Load this server's environment file regardless of the process working directory.
// dotenv.config({ path: path.join(__dirname, '.env') });

// // Import Middleware
// const {
//   securityHeaders,
//   apiLimiter,
//   authLimiter,
//   chatLimiter,
// } = require('./middleware/securityMiddleware');
// const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// // Import Route Handlers
// const healthRoutes = require('./routes/healthRoutes');
// const authRoutes = require('./routes/authRoutes');
// const trainerRoutes = require('./routes/trainerRoutes');
// const workoutRoutes = require('./routes/workoutRoutes');
// const chatRoutes = require('./routes/chatRoutes');
// const nutritionRoutes = require('./routes/nutritionRoutes');
// const waterIntakeRoutes = require('./routes/waterIntakeRoutes');
// const progressRoutes = require('./routes/progressRoutes');
// const vigorfitERoutes = require('./routes/vigorfitERoutes');
// const notificationRoutes = require('./routes/notificationRoutes');
// const dashboardRoutes = require('./routes/dashboardRoutes');
// const settingsRoutes = require('./routes/settingsRoutes');
// const exportRoutes = require('./routes/exportRoutes');
// const transformationPhotoRoutes = require('./routes/transformationPhotoRoutes');
// const feedbackRoutes = require('./routes/feedbackRoutes');
// const adminRoutes = require('./routes/adminRoutes');
// const membershipRoutes = require('./routes/membershipRoutes');
// const trainerWorkspaceRoutes = require('./routes/trainerWorkspaceRoutes');
// const gpsSessionRoutes = require('./routes/gpsSessionRoutes');
// const goalRoutes = require('./routes/goalRoutes');
// const workoutSessionRoutes = require('./routes/workoutSessionRoutes');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // 1. Security Headers via Helmet
// app.use(securityHeaders);

// // 2. CORS Configuration
// const allowedOrigins = [
//   process.env.CLIENT_URL,
//   'http://localhost:5173',
//   'http://127.0.0.1:5173',
//   'http://localhost:5174',
//   'http://127.0.0.1:5174',
//   'http://localhost:3000',
//   'http://127.0.0.1:3000',
// ].filter(Boolean);

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
//         return callback(null, true);
//       }
//       return callback(null, true);
//     },
//     credentials: true,
//   })
// );

// // 3. Body Parsing Middleware
// app.use(express.json({ limit: '15mb' }));
// app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// // // 4. General Rate Limiter for API endpoints
// // app.use('/api', apiLimiter);

// // 5. API Routes
// app.use('/api/health', healthRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/trainers', authLimiter, trainerRoutes);
// app.use('/api/workouts', workoutRoutes);
// app.use('/api/chat', chatLimiter, chatRoutes);
// app.use('/api/nutrition', nutritionRoutes);
// app.use('/api/water-intake', waterIntakeRoutes);
// app.use('/api/progress', progressRoutes);
// // Mount both /api/vigorfit-entries and /api/vigorfit for primary vigorfit_e collection
// app.use('/api/vigorfit-entries', vigorfitERoutes);
// app.use('/api/vigorfit', vigorfitERoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/export', exportRoutes);
// app.use('/api/transformation-photos', transformationPhotoRoutes);
// app.use('/api/feedback', feedbackRoutes);
// app.use('/api/memberships', membershipRoutes);
// app.use('/api/trainer-workspace', trainerWorkspaceRoutes);
// app.use('/api/gps-sessions', gpsSessionRoutes);
// app.use('/api/goals', goalRoutes);
// app.use('/api/workout-sessions', workoutSessionRoutes);
// app.use('/api/admin', adminRoutes);

// // Root route API catalog
// app.get('/', (req, res) => {
//   res.json({
//     application: 'FORMA API Server',
//     version: '1.0.0',
//     database: {
//       name: 'vfit',
//       primaryCollection: 'vigorfit_e',
//     },
//     status: 'Operational',
//     endpoints: {
//       health: 'GET /api/health',
//       auth: {
//         register: 'POST /api/auth/register',
//         verifyEmail: 'POST /api/auth/email-verification/verify',
//         resendEmailVerification: 'POST /api/auth/email-verification/resend',
//         registrationStatus: 'GET /api/auth/registration-status/:registrationId',
//         completeRegistration: 'POST /api/auth/registration/complete',
//         login: 'POST /api/auth/login',
//         profile: 'GET /api/auth/profile',
//         updateProfile: 'PUT /api/auth/profile',
//         requestPasswordResetByEmail: 'POST /api/auth/password-reset/request',
//         requestPasswordReset: 'POST /api/auth/profile/password-reset/request',
//         completePasswordReset: 'POST /api/auth/password-reset/complete',
//         requestAccountDeletion: 'POST /api/auth/profile/deletion/request',
//         confirmAccountDeletion: 'POST /api/auth/profile/deletion/confirm',
//         cancelAccountDeletion: 'POST /api/auth/profile/deletion/cancel',
//       },
//       trainers: {
//         directory: 'GET /api/trainers/directory',
//         register: 'POST /api/trainers/register',
//         verifyEmail: 'POST /api/trainers/verify-email',
//         completeRegistration: 'POST /api/trainers/registration/complete',
//         completeProfile: 'POST /api/trainers/complete-profile',
//         trainerDirectoryAndApplications: 'GET /api/admin/trainers',
//         panelDecision: 'PATCH /api/admin/trainers/:id/decision',
//       },
//       memberships: {
//         plans: 'GET /api/memberships/plans',
//         current: 'GET /api/memberships/current',
//         availableTrainers: 'GET /api/memberships/available-trainers',
//         simulatedPurchase: 'POST /api/memberships/purchase',
//         assignedTrainerClients: 'GET /api/memberships/assigned-clients',
//       },
//       trainerWorkspace: {
//         mealPlans: 'GET /api/trainer-workspace/meal-plans',
//         addMealPlan: 'POST /api/trainer-workspace/meal-plans',
//         removeMealPlan: 'DELETE /api/trainer-workspace/meal-plans/:id',
//       },
//       vigorfitPrimary: {
//         collection: 'vigorfit_e',
//         list: 'GET /api/vigorfit-entries',
//         create: 'POST /api/vigorfit-entries',
//         getById: 'GET /api/vigorfit-entries/:id',
//         update: 'PUT /api/vigorfit-entries/:id',
//         delete: 'DELETE /api/vigorfit-entries/:id',
//         stats: 'GET /api/vigorfit-entries/stats',
//         seed: 'POST /api/vigorfit-entries/seed',
//       },
//       workouts: {
//         list: 'GET /api/workouts',
//         create: 'POST /api/workouts',
//         getById: 'GET /api/workouts/:id',
//         update: 'PUT /api/workouts/:id',
//         delete: 'DELETE /api/workouts/:id',
//       },
//       workoutSessions: {
//         start: 'POST /api/workout-sessions',
//         current: 'GET /api/workout-sessions/current',
//         updateStatus: 'PATCH /api/workout-sessions/:id/status',
//         toggleExercise: 'PATCH /api/workout-sessions/:id/exercise',
//         trainerLive: 'GET /api/workout-sessions/trainer/live',
//         trainerWeeklySummary: 'GET /api/workout-sessions/trainer/summary',
//       },
//       goals: {
//         trainerAssign: 'POST /api/goals',
//         trainerList: 'GET /api/goals/trainer',
//         trainerRemove: 'DELETE /api/goals/:id',
//         clientCurrent: 'GET /api/goals/mine',
//       },
//       gpsSessions: {
//         start: 'POST /api/gps-sessions',
//         clientHistory: 'GET /api/gps-sessions/mine',
//         addRoutePoints: 'POST /api/gps-sessions/:id/points',
//         updateStatus: 'PATCH /api/gps-sessions/:id/status',
//         changeSharingConsent: 'PATCH /api/gps-sessions/:id/sharing',
//         sessionDetails: 'GET /api/gps-sessions/:id',
//         trainerLiveSessions: 'GET /api/gps-sessions/trainer/live',
//         trainerSummary: 'GET /api/gps-sessions/trainer/summary',
//         trainerHistory: 'GET /api/gps-sessions/trainer',
//       },
//       nutrition: {
//         list: 'GET /api/nutrition',
//         create: 'POST /api/nutrition',
//         dailySummary: 'GET /api/nutrition/daily-summary?date=YYYY-MM-DD',
//         update: 'PUT /api/nutrition/:id',
//         delete: 'DELETE /api/nutrition/:id',
//       },
//       waterIntake: {
//         dailySummary: 'GET /api/water-intake?date=YYYY-MM-DD',
//         add: 'POST /api/water-intake',
//         delete: 'DELETE /api/water-intake/:id',
//       },
//       progress: {
//         list: 'GET /api/progress',
//         create: 'POST /api/progress',
//         summary: 'GET /api/progress/summary',
//         getById: 'GET /api/progress/:id',
//         update: 'PUT /api/progress/:id',
//         delete: 'DELETE /api/progress/:id',
//       },
//       dashboard: {
//         analytics: 'GET /api/dashboard',
//         stats: 'GET /api/dashboard/stats',
//       },
//       notifications: {
//         list: 'GET /api/notifications',
//         create: 'POST /api/notifications',
//         markAsRead: 'PUT /api/notifications/:id/read',
//         markAllAsRead: 'PUT /api/notifications/mark-all-read',
//         delete: 'DELETE /api/notifications/:id',
//       },
//       settings: {
//         get: 'GET /api/settings',
//         update: 'PUT /api/settings',
//       },
//       export: {
//         csv: 'GET /api/export/csv?type=workouts|nutrition|progress|vigorfit',
//         json: 'GET /api/export/json',
//       },
//       chat: {
//         send: 'POST /api/chat',
//         status: 'GET /api/chat/status',
//       },
//       feedback: {
//         submit: 'POST /api/feedback',
//         myFeedback: 'GET /api/feedback/my-feedback',
//       },
//       admin: {
//         stats: 'GET /api/admin/stats',
//         users: 'GET /api/admin/users',
//         userById: 'GET /api/admin/users/:id',
//         workouts: 'GET /api/admin/workouts',
//         nutrition: 'GET /api/admin/nutrition',
//         progress: 'GET /api/admin/progress',
//         supportTickets: 'GET /api/admin/support',
//         updateSupportTicket: 'PUT /api/admin/support/:id',
//         notifications: 'GET /api/admin/notifications',
//       },
//     },
//   });
// });

// // 6. 404 Handler for undefined routes
// app.use(notFound);

// // 7. Central Error Handling Middleware
// app.use(errorHandler);

// // Start server if run directly
// if (require.main === module) {
//   connectDB().then(() => {
//     startAccountDeletionCleanup();
//     // HTTP server shared by Express and the free Socket.io live-tracking layer.
//     const server = http.createServer(app);
//     initLiveSocket(server, { corsOrigin: true });
//     server.listen(PORT, () => {
//       console.log(`🚀 FORMA server running on port ${PORT}`);
//       console.log(`🔗 Health check available at: http://localhost:${PORT}/api/health`);
//       console.log(`🗄️  Target MongoDB database: vfit (Primary Collection: vigorfit_e)`);
//       console.log(`🔐 Auth routes mounted at: http://localhost:${PORT}/api/auth`);
//       console.log(`💪 Workout routes mounted at: http://localhost:${PORT}/api/workouts`);
//       console.log(`📡 Live tracking (Socket.io) ready on the same port`);
//       console.log(`🤖 AI Chat routes mounted at: http://localhost:${PORT}/api/chat`);
//     });
//   });

//   const nodemailer = require('nodemailer');

//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   app.post('/feedback/contact', async (req, res) => {
//     try {
//       const { name, email, subject, message } = req.body;

//       if (!name || !email || !subject || !message) {
//         return res.status(400).json({
//           success: false,
//           message: 'All fields are required.',
//         });
//       }

//       await transporter.sendMail({
//         from: process.env.EMAIL_USER,
//         to: process.env.CONTACT_RECEIVER,
//         replyTo: email,
//         subject: `FORGE Contact: ${subject}`,
//         text: `
// New FORGE Contact Message

// Name: ${name}
// Email: ${email}
// Subject: ${subject}

// Message:
// ${message}
//       `,
//       });

//       return res.status(200).json({
//         success: true,
//         message: 'Your message has been sent successfully!',
//       });

//     } catch (error) {
//       console.error('Contact email error:', error);

//       return res.status(500).json({
//         success: false,
//         message: 'Unable to send your message. Please try again.',
//       });
//     }
//   });
// }

// module.exports = app;


const http = require('http');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { initLiveSocket } = require('./utils/liveSocket');
const { startAccountDeletionCleanup } = require('./services/accountDeletionCleanupService');


// Load this server's environment file regardless of the process working directory.
dotenv.config({ path: path.join(__dirname, '.env') });

// Import Middleware
const {
  securityHeaders,
  apiLimiter,
  authLimiter,
  chatLimiter,
} = require('./middleware/securityMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Import Route Handlers
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const chatRoutes = require('./routes/chatRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const waterIntakeRoutes = require('./routes/waterIntakeRoutes');
const progressRoutes = require('./routes/progressRoutes');
const vigorfitERoutes = require('./routes/vigorfitERoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const exportRoutes = require('./routes/exportRoutes');
const transformationPhotoRoutes = require('./routes/transformationPhotoRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const trainerWorkspaceRoutes = require('./routes/trainerWorkspaceRoutes');
const gpsSessionRoutes = require('./routes/gpsSessionRoutes');
const goalRoutes = require('./routes/goalRoutes');
const workoutSessionRoutes = require('./routes/workoutSessionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Headers via Helmet
app.use(securityHeaders);

// 2. CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// 3. Body Parsing Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Contact form email delivery. This route is intentionally registered before
// /api/feedback so it cannot be swallowed by the feedback router.
const contactMailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

app.post('/api/feedback/contact', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (name.length > 100 || email.length > 254 || subject.length > 150 || message.length > 5000) {
      return res.status(400).json({ success: false, message: 'One or more fields exceed the allowed length.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const sender = process.env.GMAIL_USER;
    const appPassword = process.env.GMAIL_APP_PASSWORD;
    const recipient = process.env.ADMIN_EMAIL;
    if (!sender || !appPassword || !recipient) {
      console.error('Contact email is not configured. Set GMAIL_USER, GMAIL_APP_PASSWORD, and ADMIN_EMAIL in the server .env file.');
      return res.status(503).json({ success: false, message: 'Contact email is not configured on the server. Please try again later.' });
    }

    await contactMailer.sendMail({
      from: `FORGE Contact <${sender}>`,
      to: recipient,
      replyTo: email,
      subject: `FORGE Contact: ${subject}`,
      text: [
        'New FORGE contact message',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${subject}`,
        '',
        'Message:',
        message,
      ].join('\n'),
    });

    return res.status(200).json({ success: true, message: 'Your message has been emailed to the FORGE team.' });
  } catch (error) {
    console.error('FORGE contact email failed:', error);
    return res.status(500).json({ success: false, message: 'The message could not be emailed. Please try again later.' });
  }
});

// // 4. General Rate Limiter for API endpoints
// app.use('/api', apiLimiter);

// 5. API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/trainers', authLimiter, trainerRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/water-intake', waterIntakeRoutes);
app.use('/api/progress', progressRoutes);
// Mount both /api/vigorfit-entries and /api/vigorfit for primary vigorfit_e collection
app.use('/api/vigorfit-entries', vigorfitERoutes);
app.use('/api/vigorfit', vigorfitERoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/transformation-photos', transformationPhotoRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/trainer-workspace', trainerWorkspaceRoutes);
app.use('/api/gps-sessions', gpsSessionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/workout-sessions', workoutSessionRoutes);
app.use('/api/admin', adminRoutes);

// Root route API catalog
app.get('/', (req, res) => {
  res.json({
    application: 'FORMA API Server',
    version: '1.0.0',
    database: {
      name: 'vfit',
      primaryCollection: 'vigorfit_e',
    },
    status: 'Operational',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        verifyEmail: 'POST /api/auth/email-verification/verify',
        resendEmailVerification: 'POST /api/auth/email-verification/resend',
        registrationStatus: 'GET /api/auth/registration-status/:registrationId',
        completeRegistration: 'POST /api/auth/registration/complete',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        requestPasswordResetByEmail: 'POST /api/auth/password-reset/request',
        requestPasswordReset: 'POST /api/auth/profile/password-reset/request',
        completePasswordReset: 'POST /api/auth/password-reset/complete',
        requestAccountDeletion: 'POST /api/auth/profile/deletion/request',
        confirmAccountDeletion: 'POST /api/auth/profile/deletion/confirm',
        cancelAccountDeletion: 'POST /api/auth/profile/deletion/cancel',
      },
      trainers: {
        directory: 'GET /api/trainers/directory',
        register: 'POST /api/trainers/register',
        verifyEmail: 'POST /api/trainers/verify-email',
        completeRegistration: 'POST /api/trainers/registration/complete',
        completeProfile: 'POST /api/trainers/complete-profile',
        trainerDirectoryAndApplications: 'GET /api/admin/trainers',
        panelDecision: 'PATCH /api/admin/trainers/:id/decision',
      },
      memberships: {
        plans: 'GET /api/memberships/plans',
        current: 'GET /api/memberships/current',
        availableTrainers: 'GET /api/memberships/available-trainers',
        simulatedPurchase: 'POST /api/memberships/purchase',
        assignedTrainerClients: 'GET /api/memberships/assigned-clients',
      },
      trainerWorkspace: {
        mealPlans: 'GET /api/trainer-workspace/meal-plans',
        addMealPlan: 'POST /api/trainer-workspace/meal-plans',
        removeMealPlan: 'DELETE /api/trainer-workspace/meal-plans/:id',
      },
      vigorfitPrimary: {
        collection: 'vigorfit_e',
        list: 'GET /api/vigorfit-entries',
        create: 'POST /api/vigorfit-entries',
        getById: 'GET /api/vigorfit-entries/:id',
        update: 'PUT /api/vigorfit-entries/:id',
        delete: 'DELETE /api/vigorfit-entries/:id',
        stats: 'GET /api/vigorfit-entries/stats',
        seed: 'POST /api/vigorfit-entries/seed',
      },
      workouts: {
        list: 'GET /api/workouts',
        create: 'POST /api/workouts',
        getById: 'GET /api/workouts/:id',
        update: 'PUT /api/workouts/:id',
        delete: 'DELETE /api/workouts/:id',
      },
      workoutSessions: {
        start: 'POST /api/workout-sessions',
        current: 'GET /api/workout-sessions/current',
        updateStatus: 'PATCH /api/workout-sessions/:id/status',
        toggleExercise: 'PATCH /api/workout-sessions/:id/exercise',
        trainerLive: 'GET /api/workout-sessions/trainer/live',
        trainerWeeklySummary: 'GET /api/workout-sessions/trainer/summary',
      },
      goals: {
        trainerAssign: 'POST /api/goals',
        trainerList: 'GET /api/goals/trainer',
        trainerRemove: 'DELETE /api/goals/:id',
        clientCurrent: 'GET /api/goals/mine',
      },
      gpsSessions: {
        start: 'POST /api/gps-sessions',
        clientHistory: 'GET /api/gps-sessions/mine',
        addRoutePoints: 'POST /api/gps-sessions/:id/points',
        updateStatus: 'PATCH /api/gps-sessions/:id/status',
        changeSharingConsent: 'PATCH /api/gps-sessions/:id/sharing',
        sessionDetails: 'GET /api/gps-sessions/:id',
        trainerLiveSessions: 'GET /api/gps-sessions/trainer/live',
        trainerSummary: 'GET /api/gps-sessions/trainer/summary',
        trainerHistory: 'GET /api/gps-sessions/trainer',
      },
      nutrition: {
        list: 'GET /api/nutrition',
        create: 'POST /api/nutrition',
        dailySummary: 'GET /api/nutrition/daily-summary?date=YYYY-MM-DD',
        update: 'PUT /api/nutrition/:id',
        delete: 'DELETE /api/nutrition/:id',
      },
      waterIntake: {
        dailySummary: 'GET /api/water-intake?date=YYYY-MM-DD',
        add: 'POST /api/water-intake',
        delete: 'DELETE /api/water-intake/:id',
      },
      progress: {
        list: 'GET /api/progress',
        create: 'POST /api/progress',
        summary: 'GET /api/progress/summary',
        getById: 'GET /api/progress/:id',
        update: 'PUT /api/progress/:id',
        delete: 'DELETE /api/progress/:id',
      },
      dashboard: {
        analytics: 'GET /api/dashboard',
        stats: 'GET /api/dashboard/stats',
      },
      notifications: {
        list: 'GET /api/notifications',
        create: 'POST /api/notifications',
        markAsRead: 'PUT /api/notifications/:id/read',
        markAllAsRead: 'PUT /api/notifications/mark-all-read',
        delete: 'DELETE /api/notifications/:id',
      },
      settings: {
        get: 'GET /api/settings',
        update: 'PUT /api/settings',
      },
      export: {
        csv: 'GET /api/export/csv?type=workouts|nutrition|progress|vigorfit',
        json: 'GET /api/export/json',
      },
      chat: {
        send: 'POST /api/chat',
        status: 'GET /api/chat/status',
      },
      feedback: {
        contact: 'POST /api/feedback/contact',
        submit: 'POST /api/feedback',
        myFeedback: 'GET /api/feedback/my-feedback',
      },
      admin: {
        stats: 'GET /api/admin/stats',
        users: 'GET /api/admin/users',
        userById: 'GET /api/admin/users/:id',
        workouts: 'GET /api/admin/workouts',
        nutrition: 'GET /api/admin/nutrition',
        progress: 'GET /api/admin/progress',
        supportTickets: 'GET /api/admin/support',
        updateSupportTicket: 'PUT /api/admin/support/:id',
        notifications: 'GET /api/admin/notifications',
      },
    },
  });
});

// 6. 404 Handler for undefined routes
app.use(notFound);

// 7. Central Error Handling Middleware
app.use(errorHandler);

// Start server if run directly
if (require.main === module) {
  connectDB().then(() => {
    startAccountDeletionCleanup();
    // HTTP server shared by Express and the free Socket.io live-tracking layer.
    const server = http.createServer(app);
    initLiveSocket(server, { corsOrigin: true });
    server.listen(PORT, () => {
      console.log(`🚀 FORMA server running on port ${PORT}`);
      console.log(`🔗 Health check available at: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  Target MongoDB database: vfit (Primary Collection: vigorfit_e)`);
      console.log(`🔐 Auth routes mounted at: http://localhost:${PORT}/api/auth`);
      console.log(`💪 Workout routes mounted at: http://localhost:${PORT}/api/workouts`);
      console.log(`📡 Live tracking (Socket.io) ready on the same port`);
      console.log(`🤖 AI Chat routes mounted at: http://localhost:${PORT}/api/chat`);
    });
  });

}

module.exports = app;
