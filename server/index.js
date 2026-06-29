const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const membershipsRoutes = require('./routes/memberships');
const messagesRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
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
