const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to ensure super_admin
const superAdminOnly = (req, res, next) => {
  if (req.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
  }
  next();
};

// GET /api/superadmin/gyms
router.get('/gyms', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { data: gyms, error } = await supabase
      .from('gyms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Also fetch owners for these gyms
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'gym_admin');

    if (userError) throw userError;

    // Attach owner details
    const enrichedGyms = gyms.map(gym => {
      const owner = users.find(u => u.gym_id === gym.id);
      return {
        ...gym,
        owner_name: owner ? owner.full_name : 'Unknown',
        owner_email: owner ? owner.email : 'Unknown'
      };
    });

    return res.json(enrichedGyms);
  } catch (err) {
    console.error('Fetch gyms error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

// POST /api/superadmin/gyms
router.post('/gyms', authMiddleware, superAdminOnly, async (req, res) => {
  const { name, owner_name, email, password, billing_date } = req.body;

  if (!name || !owner_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Check if user email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 2. Create the Gym
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .insert({
        name,
        subscription_status: 'active',
        billing_date: billing_date || null
      })
      .select()
      .single();

    if (gymError) throw gymError;

    // 3. Create the User (owner)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        full_name: owner_name,
        role: 'gym_admin',
        gym_id: gym.id
        // We aren't doing real hashed passwords in this mock DB yet, 
        // but normally we'd create this through supabase.auth.signUp()
      })
      .select()
      .single();

    if (userError) throw userError;

    // 4. Update gym owner_id
    await supabase.from('gyms').update({ owner_id: user.id }).eq('id', gym.id);

    return res.status(201).json({ gym, user });
  } catch (err) {
    console.error('Create gym error:', err.message);
    return res.status(500).json({ error: 'Failed to create gym' });
  }
});

// POST /api/superadmin/invoice/:gymId
router.post('/invoice/:gymId', authMiddleware, superAdminOnly, async (req, res) => {
  const { gymId } = req.params;
  const whatsappManager = require('../utils/whatsapp');

  try {
    const { data: gym } = await supabase.from('gyms').select('*').eq('id', gymId).single();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const { data: owner } = await supabase.from('users').select('*').eq('id', gym.owner_id).single();
    if (!owner) return res.status(404).json({ error: 'Gym owner not found' });

    const { data: settings } = await supabase.from('gym_settings').select('*').eq('gym_id', gym.id).single();
    const phone = settings ? settings.phone : null;
    
    if (!phone) return res.status(400).json({ error: 'Gym owner phone number not found in settings' });

    const message = `*GymOS Invoice*\n\nHello ${owner.full_name},\nThis is a reminder that your GymOS subscription for *${gym.name}* is due on *${gym.billing_date}*.\n\nPlease complete your payment to continue enjoying uninterrupted services.\n\nThank you for choosing GymOS!`;

    const session = whatsappManager.getSession('super_admin');
    
    if (session.getStatus().status !== 'connected') {
      return res.status(400).json({ error: 'Super Admin WhatsApp session is not connected' });
    }

    await session.sendMessage(phone, message);

    return res.json({ message: 'Invoice sent successfully' });
  } catch (err) {
    console.error('Send invoice error:', err.message);
    return res.status(500).json({ error: 'Failed to send invoice' });
  }
});

module.exports = router;
