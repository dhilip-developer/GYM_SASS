const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

const { getTodayStr, addDays, sendSMS, formatMessage } = require('../utils/sms');

// GET /api/messages/templates (protected)
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('trigger_type', { ascending: true });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('Fetch templates error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch message templates' });
  }
});

// PUT /api/messages/templates/:id (protected)
router.put('/templates/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { template_body, is_active } = req.body;

  try {
    const updateData = { updated_at: new Date().toISOString() };
    if (template_body !== undefined) updateData.template_body = template_body;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: template, error } = await supabase
      .from('message_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ template });
  } catch (err) {
    console.error('Update template error:', err.message);
    return res.status(500).json({ error: 'Failed to update template' });
  }
});

// GET /api/messages/logs (protected)
// Query params: ?page=1&limit=50
router.get('/logs', authMiddleware, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  try {
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const { data, count, error } = await supabase
      .from('message_logs')
      .select(`
        *,
        members (
          full_name,
          phone
        )
      `, { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return res.json({
      logs: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum
    });
  } catch (err) {
    console.error('Fetch logs error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch message logs' });
  }
});

// POST /api/messages/send-manual (protected)
// Body: { member_id, trigger_type }
router.post('/send-manual', authMiddleware, async (req, res) => {
  const { member_id, trigger_type } = req.body;

  if (!member_id || !trigger_type) {
    return res.status(400).json({ error: 'Member ID and trigger type are required' });
  }

  try {
    // 1. Fetch member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', member_id)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 2. Fetch template
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('trigger_type', trigger_type)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Message template not found' });
    }

    // 3. Fetch gym settings
    const { data: settingsList, error: settingsError } = await supabase
      .from('gym_settings')
      .select('*');

    if (settingsError) throw settingsError;

    const settings = (settingsList && settingsList.length > 0) ? settingsList[0] : {
      gym_name: 'Our Gym',
      phone: '9876543210'
    };

    // 4. Fetch latest membership for ExpiryDate
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select('id, end_date')
      .eq('member_id', member_id)
      .order('end_date', { ascending: false });

    if (membershipError) throw membershipError;

    const latestMembership = (memberships && memberships.length > 0) ? memberships[0] : null;
    const expiryDate = latestMembership ? latestMembership.end_date : 'N/A';

    // 5. Replace placeholders
    const formattedMessage = formatMessage(template.template_body, {
      name: member.full_name,
      expiryDate,
      gymName: settings.gym_name,
      ownerPhone: settings.phone
    });

    // 6. Send SMS
    const sendResult = await sendSMS(member.phone, formattedMessage);

    // 7. Insert message log
    const { error: logError } = await supabase
      .from('message_logs')
      .insert({
        member_id,
        membership_id: latestMembership ? latestMembership.id : null,
        trigger_type,
        message_sent: formattedMessage,
        status: sendResult.success ? 'sent' : 'failed'
      });

    if (logError) throw logError;

    if (!sendResult.success) {
      return res.status(500).json({ error: 'Failed to send SMS message', detail: sendResult.error });
    }

    return res.json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Send manual message error:', err.message);
    return res.status(500).json({ error: 'Failed to process manual message' });
  }
});

// POST /api/messages/bulk-send (protected)
// Body: { trigger_type }
router.post('/bulk-send', authMiddleware, async (req, res) => {
  const { trigger_type } = req.body;

  if (!trigger_type) {
    return res.status(400).json({ error: 'Trigger type is required' });
  }

  try {
    // 1. Fetch template
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('trigger_type', trigger_type)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Message template not found' });
    }

    if (!template.is_active) {
      return res.status(400).json({ error: 'Message template is disabled' });
    }

    // 2. Fetch gym settings
    const { data: settingsList, error: settingsError } = await supabase
      .from('gym_settings')
      .select('*');

    if (settingsError) throw settingsError;

    const settings = (settingsList && settingsList.length > 0) ? settingsList[0] : {
      gym_name: 'Our Gym',
      phone: '9876543210'
    };

    // 3. Find qualifying members/memberships
    const todayStr = getTodayStr();
    let membershipsToNotify = [];

    if (trigger_type === 'expiry_3day') {
      const targetDate = addDays(todayStr, 3);
      const { data } = await supabase
        .from('memberships')
        .select('*, members(*)')
        .eq('end_date', targetDate)
        .eq('status', 'active');
      membershipsToNotify = data || [];
    } else if (trigger_type === 'expiry_1day') {
      const targetDate = addDays(todayStr, 1);
      const { data } = await supabase
        .from('memberships')
        .select('*, members(*)')
        .eq('end_date', targetDate)
        .eq('status', 'active');
      membershipsToNotify = data || [];
    } else if (trigger_type === 'expired') {
      // Fetch active memberships that are past end_date OR pending payment status
      const { data } = await supabase
        .from('memberships')
        .select('*, members(*)')
        .or(`end_date.lt.${todayStr},payment_status.eq.pending`);
      membershipsToNotify = data || [];
    }

    let sent = 0;
    let failed = 0;

    // Send message to each qualifying member
    for (const membership of membershipsToNotify) {
      const member = membership.members;
      if (!member) continue;

      const formattedMessage = formatMessage(template.template_body, {
        name: member.full_name,
        expiryDate: membership.end_date,
        gymName: settings.gym_name,
        ownerPhone: settings.phone
      });

      const sendResult = await sendSMS(member.phone, formattedMessage);

      // Insert log
      await supabase
        .from('message_logs')
        .insert({
          member_id: member.id,
          membership_id: membership.id,
          trigger_type,
          message_sent: formattedMessage,
          status: sendResult.success ? 'sent' : 'failed'
        });

      if (sendResult.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return res.json({ sent, failed });
  } catch (err) {
    console.error('Bulk send error:', err.message);
    return res.status(500).json({ error: 'Failed to process bulk message campaign' });
  }
});

module.exports = router;
