const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const membershipsRoutes = require('./routes/memberships');
const messagesRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const leadsRoutes = require('./routes/leads');
const announcementsRoutes = require('./routes/announcements');
const superadminRoutes = require('./routes/superadmin');
const branchesRoutes = require('./routes/branches');
const trainersRoutes = require('./routes/trainers');
const attendanceRoutes = require('./routes/attendance');
const revenueRoutes = require('./routes/revenue');
const sheetsRoutes = require('./routes/sheets');
const { initScheduler } = require('./scheduler/cron');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/sheets', sheetsRoutes);

// Base Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Initialize automated SMS scheduler
initScheduler();

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] GymOS server listening on port ${PORT}`);
});

// Clean shutdown
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('[SERVER] SIGINT received. Closing WhatsApp sockets...');
  await whatsappManager.closeAll();
  process.exit(0);
});
