const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// Helper to get today's date string in YYYY-MM-DD
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET /api/attendance
// Optional ?date=YYYY-MM-DD
router.get('/', authMiddleware, async (req, res) => {
  const dateStr = req.query.date || getTodayStr();
  
  try {
    const { data: attendance, error } = await supabase
      .from('attendance')
      .select('*, members(*), trainers(*)')
      .eq('gym_id', req.gymId)
      .eq('date', dateStr)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return res.json(attendance);
  } catch (err) {
    console.error('Fetch attendance error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// POST /api/attendance
// Body: { entity_type, entity_id }
router.post('/', authMiddleware, async (req, res) => {
  const { entity_type, entity_id } = req.body;
  const dateStr = getTodayStr();

  if (!entity_type || !entity_id) {
    return res.status(400).json({ error: 'entity_type (member/trainer) and entity_id are required' });
  }

  try {
    // Check if already checked in today
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('gym_id', req.gymId)
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .eq('date', dateStr)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        entity_type,
        entity_id,
        gym_id: req.gymId,
        date: dateStr,
        timestamp: new Date().toISOString()
      })
      .select('*, members(*), trainers(*)')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('Check in error:', err.message);
    return res.status(500).json({ error: 'Failed to record attendance' });
  }
});

module.exports = router;
