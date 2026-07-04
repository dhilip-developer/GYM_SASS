const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/branches
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .eq('gym_id', req.gymId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(branches);
  } catch (err) {
    console.error('Fetch branches error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// POST /api/branches
router.post('/', authMiddleware, async (req, res) => {
  const { name, location } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Branch name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('branches')
      .insert({
        name,
        location: location || null,
        gym_id: req.gymId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('Create branch error:', err.message);
    return res.status(500).json({ error: 'Failed to create branch' });
  }
});

module.exports = router;
