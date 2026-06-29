const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({
      access_token: data.session.access_token,
      user: data.user,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me - Validate token & get current user
router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
