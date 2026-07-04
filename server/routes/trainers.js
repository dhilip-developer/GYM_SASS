const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/trainers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: trainers, error } = await supabase
      .from('trainers')
      .select('*, branches(*)')
      .eq('gym_id', req.gymId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(trainers);
  } catch (err) {
    console.error('Fetch trainers error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

// POST /api/trainers
router.post('/', authMiddleware, async (req, res) => {
  const { name, phone, branch_id, role } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const { data, error } = await supabase
      .from('trainers')
      .insert({
        name,
        phone,
        branch_id: branch_id || null,
        role: role || 'trainer',
        gym_id: req.gymId,
        created_at: new Date().toISOString()
      })
      .select('*, branches(*)')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('Create trainer error:', err.message);
    return res.status(500).json({ error: 'Failed to create trainer' });
  }
});

module.exports = router;
