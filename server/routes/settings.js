const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('gym_settings')
      .select('*')
      .eq('gym_id', req.gymId);

    if (error) throw error;

    if (data && data.length > 0) {
      return res.json(data[0]);
    } else {
      return res.json({});
    }
  } catch (err) {
    console.error('Fetch settings error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings (UPSERT single settings row)
router.post('/', authMiddleware, async (req, res) => {
  const { gym_name, owner_name, phone, whatsapp_number, email, address, whatsapp_mode, whatsapp_schedule_time } = req.body;

  if (!gym_name || !owner_name || !phone) {
    return res.status(400).json({ error: 'Gym name, owner name, and phone number are required' });
  }

  try {
    // Check if a row already exists
    const { data: existing, error: fetchError } = await supabase
      .from('gym_settings')
      .select('id')
      .eq('gym_id', req.gymId);

    if (fetchError) throw fetchError;

    let result = null;

    if (existing && existing.length > 0) {
      // Update the existing row
      const { data: updated, error: updateError } = await supabase
        .from('gym_settings')
        .update({
          gym_name,
          owner_name,
          phone,
          whatsapp_number: whatsapp_number || null,
          whatsapp_mode: whatsapp_mode || 'redirect',
          whatsapp_schedule_time: whatsapp_schedule_time || '08:00',
          email: email || null,
          address: address || null
        })
        .eq('id', existing[0].id)
        .eq('gym_id', req.gymId)
        .select()
        .single();

      if (updateError) throw updateError;
      result = updated;
    } else {
      // Insert a new row
      const { data: inserted, error: insertError } = await supabase
        .from('gym_settings')
        .insert({
          gym_name,
          owner_name,
          phone,
          whatsapp_number: whatsapp_number || null,
          whatsapp_mode: whatsapp_mode || 'redirect',
          whatsapp_schedule_time: whatsapp_schedule_time || '08:00',
          email: email || null,
          address: address || null,
          gym_id: req.gymId
        })
        .select()
        .single();

      if (insertError) throw insertError;
      result = inserted;
    }

    return res.json(result);
  } catch (err) {
    console.error('Save settings error:', err.message);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// GET /api/settings/plans
router.get('/plans', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('gym_id', req.gymId)
      .order('price', { ascending: true });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('Fetch plans error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch membership plans' });
  }
});

// POST /api/settings/plans
router.post('/plans', authMiddleware, async (req, res) => {
  const { name, duration_days, price, description } = req.body;

  if (!name || !duration_days || price === undefined) {
    return res.status(400).json({ error: 'Plan name, duration (days), and price are required' });
  }

  try {
    const { data: plan, error } = await supabase
      .from('plans')
      .insert({
        name,
        duration_days: parseInt(duration_days),
        price: parseFloat(price),
        description: description || null,
        is_active: true,
        gym_id: req.gymId
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(plan);
  } catch (err) {
    console.error('Create plan error:', err.message);
    return res.status(500).json({ error: 'Failed to create membership plan' });
  }
});

// PUT /api/settings/plans/:id
router.put('/plans/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, duration_days, price, description, is_active } = req.body;

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (duration_days !== undefined) updateData.duration_days = parseInt(duration_days);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: plan, error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', id)
      .eq('gym_id', req.gymId)
      .select()
      .single();

    if (error) throw error;

    return res.json(plan);
  } catch (err) {
    console.error('Update plan error:', err.message);
    return res.status(500).json({ error: 'Failed to update membership plan' });
  }
});

module.exports = router;
