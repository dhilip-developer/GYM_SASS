const express = require('express');
const router = express.Router();
const whatsappManager = require('../utils/whatsapp');
const authMiddleware = require('../middleware/authMiddleware');

// Helper to determine session ID (gymId or 'super_admin')
const getSessionId = (req) => {
  return req.role === 'super_admin' ? 'super_admin' : req.gymId;
};

// GET /api/whatsapp/status (protected)
router.get('/status', authMiddleware, (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const session = whatsappManager.getSession(sessionId);
    return res.json(session.getStatus());
  } catch (err) {
    console.error(`[WHATSAPP ROUTE ${getSessionId(req)}] Get status error:`, err.message);
    return res.status(500).json({ error: 'Failed to retrieve WhatsApp status' });
  }
});

// POST /api/whatsapp/start (protected)
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const session = whatsappManager.getSession(sessionId);
    session.startSession().catch(err => {
      console.error(`[WHATSAPP ROUTE ${sessionId}] startSession background error:`, err);
    });
    return res.json({ message: 'WhatsApp session initialization started' });
  } catch (err) {
    console.error(`[WHATSAPP ROUTE ${getSessionId(req)}] Start session error:`, err.message);
    return res.status(500).json({ error: 'Failed to start WhatsApp session' });
  }
});

// POST /api/whatsapp/stop (protected)
router.post('/stop', authMiddleware, async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const session = whatsappManager.getSession(sessionId);
    await session.stopSession();
    return res.json({ message: 'WhatsApp session stopped and logged out successfully' });
  } catch (err) {
    console.error(`[WHATSAPP ROUTE ${getSessionId(req)}] Stop session error:`, err.message);
    return res.status(500).json({ error: 'Failed to stop WhatsApp session' });
  }
});

module.exports = router;
