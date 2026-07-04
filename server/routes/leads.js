const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/leads
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('gym_id', req.gymId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ leads });
  } catch (err) {
    console.error('Leads fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// POST /api/leads
router.post('/', authMiddleware, async (req, res) => {
  const { name, phone, interested_in, notes, followup_status } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone are required' });
  }
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name,
        phone,
        interested_in: interested_in || '',
        notes: notes || '',
        followup_status: followup_status || 'none',
        gym_id: req.gymId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ lead: data });
  } catch (err) {
    console.error('Create lead error:', err.message);
    return res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PATCH /api/leads/:id
router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, phone, interested_in, notes, followup_status } = req.body;
  try {
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (interested_in !== undefined) updateData.interested_in = interested_in;
    if (notes !== undefined) updateData.notes = notes;
    if (followup_status !== undefined) updateData.followup_status = followup_status;

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('gym_id', req.gymId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ lead: data });
  } catch (err) {
    console.error('Update lead error:', err.message);
    return res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('gym_id', req.gymId);

    if (error) throw error;
    return res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Delete lead error:', err.message);
    return res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;
