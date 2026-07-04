const express = require('express');
const router = express.Router();
const { getAuthUrl, handleCallback, syncDatabaseToSheets } = require('../utils/googleSheets');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to ensure super_admin
const superAdminOnly = (req, res, next) => {
  if (req.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
  }
  next();
};

// GET /api/sheets/auth
router.get('/auth', authMiddleware, superAdminOnly, (req, res) => {
  const url = getAuthUrl();
  if (!url) {
    return res.status(500).json({ error: 'OAuth client not configured. Check credentials.json.' });
  }
  res.json({ url });
});

// GET /api/sheets/callback
// Note: This is usually hit directly by Google's redirect in the browser. 
// So it doesn't use the authMiddleware (as the browser won't send the JWT header).
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing authorization code in query.');
  }

  try {
    await handleCallback(code);
    
    // Redirect back to the frontend Super Admin dashboard with a success flag
    res.redirect('http://localhost:5173/super-admin?google_sync=success');
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send('Failed to authenticate with Google: ' + error.message);
  }
});

// POST /api/sheets/force-sync
// Optional manual trigger route
router.post('/force-sync', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, '../config/db.json');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database not found' });
    }
    
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    await syncDatabaseToSheets(dbData);
    
    res.json({ success: true, message: 'Sync triggered successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync: ' + error.message });
  }
});

module.exports = router;
