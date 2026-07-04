const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/announcements
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('gym_id', req.gymId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ announcements });
  } catch (err) {
    console.error('Announcements fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements
router.post('/', authMiddleware, async (req, res) => {
  const { message, audience, sent_count } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        message,
        audience: audience || 'all',
        sent_count: sent_count || 0,
        gym_id: req.gymId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ announcement: data });
  } catch (err) {
    console.error('Create announcement error:', err.message);
    return res.status(500).json({ error: 'Failed to record announcement' });
  }
});

module.exports = router;
