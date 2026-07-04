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

// Helper to add days to a date string and return YYYY-MM-DD
const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET /api/members/birthdays/today (protected)
router.get('/birthdays/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const todayMM = String(today.getMonth() + 1).padStart(2, '0');
    const todayDD = String(today.getDate()).padStart(2, '0');

    const { data: allMembers, error } = await supabase
      .from('members')
      .select('id, full_name, phone, dob')
      .eq('gym_id', req.gymId);

    if (error) throw error;

    const birthdays = (allMembers || []).filter(m => {
      if (!m.dob) return false;
      const parts = m.dob.split('-'); // YYYY-MM-DD
      return parts[1] === todayMM && parts[2] === todayDD;
    });

    return res.json({ birthdays });
  } catch (err) {
    console.error('Birthday fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

// GET /api/members (all protected)
// Query params: ?status=active|expired|expiring|unpaid&search=text&page=1&limit=20
router.get('/', authMiddleware, async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  try {
    // Fetch all members with their memberships and plan details
    const { data: dbMembers, error } = await supabase
      .from('members')
      .select(`
        *,
        memberships (
          id,
          plan_id,
          start_date,
          end_date,
          payment_status,
          amount_paid,
          payment_mode,
          status,
          plans (
            id,
            name,
            duration_days,
            price,
            description
          )
        )
      `)
      .eq('gym_id', req.gymId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const todayStr = getTodayStr();
    const today = new Date(todayStr);

    // Process each member to find their latest membership and status
    let processedMembers = dbMembers.map(member => {
      // Find latest membership by end_date or created_at
      let latestMembership = null;
      if (member.memberships && member.memberships.length > 0) {
        // Sort descending by end_date
        const sorted = [...member.memberships].sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
        latestMembership = sorted[0];
      }

      // Compute status
      let memberStatus = 'expired'; // default if no membership
      if (latestMembership) {
        const endDateObj = new Date(latestMembership.end_date);
        
        if (latestMembership.payment_status === 'pending') {
          memberStatus = 'unpaid';
        } else if (endDateObj < today) {
          memberStatus = 'expired';
        } else {
          // Check if expiring soon (within 3 days)
          const diffTime = endDateObj - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 3) {
            memberStatus = 'expiring';
          } else {
            memberStatus = 'active';
          }
        }
      }

      return {
        ...member,
        latest_membership: latestMembership,
        computed_status: memberStatus
      };
    });

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      processedMembers = processedMembers.filter(m => 
        (m.full_name && m.full_name.toLowerCase().includes(searchLower)) ||
        (m.phone && m.phone.includes(searchLower)) ||
        (m.email && m.email.toLowerCase().includes(searchLower))
      );
    }

    if (status) {
      processedMembers = processedMembers.filter(m => m.computed_status === status);
    }

    // Paginate
    const total = processedMembers.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedMembers = processedMembers.slice(startIndex, endIndex);

    return res.json({
      members: paginatedMembers,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (err) {
    console.error('Fetch members error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// GET /api/members/:id (protected)
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: member, error } = await supabase
      .from('members')
      .select(`
        *,
        memberships (
          id,
          plan_id,
          start_date,
          end_date,
          payment_status,
          amount_paid,
          payment_mode,
          status,
          plans (
            id,
            name,
            duration_days,
            price,
            description
          )
        )
      `)
      .eq('id', id)
      .eq('gym_id', req.gymId)
      .single();

    if (error || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Attach latest membership
    let latestMembership = null;
    if (member.memberships && member.memberships.length > 0) {
      const sorted = [...member.memberships].sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
      latestMembership = sorted[0];
    }

    const todayStr = getTodayStr();
    const today = new Date(todayStr);
    let memberStatus = 'expired';
    if (latestMembership) {
      const endDateObj = new Date(latestMembership.end_date);
      if (latestMembership.payment_status === 'pending') {
        memberStatus = 'unpaid';
      } else if (endDateObj < today) {
        memberStatus = 'expired';
      } else {
        const diffTime = endDateObj - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          memberStatus = 'expiring';
        } else {
          memberStatus = 'active';
        }
      }
    }

    return res.json({
      ...member,
      latest_membership: latestMembership,
      computed_status: memberStatus
    });
  } catch (err) {
    console.error('Fetch member error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch member details' });
  }
});

// POST /api/members (protected)
router.post('/', authMiddleware, async (req, res) => {
  const {
    full_name,
    phone,
    email,
    dob,
    gender,
    address,
    plan_id,
    start_date,
    payment_status = 'pending',
    amount_paid = 0,
    payment_mode = 'cash'
  } = req.body;

  // Validation
  if (!full_name || !phone || !plan_id || !start_date) {
    return res.status(400).json({ error: 'Full name, phone, plan, and start date are required' });
  }

  try {
    // 1. Check phone uniqueness
    const { data: existingPhone, error: phoneCheckError } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .eq('gym_id', req.gymId)
      .maybeSingle();

    if (phoneCheckError) throw phoneCheckError;
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // 2. Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('gym_id', req.gymId)
      .single();

    if (planError || !plan) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // 3. Calculate end_date = start_date + duration_days
    const endDate = addDays(start_date, plan.duration_days);

    // 4. Insert into members table
    const { data: member, error: memberInsertError } = await supabase
      .from('members')
      .insert({
        full_name,
        phone,
        email: email || null,
        dob: dob || null,
        gender: gender || null,
        address: address || null,
        gym_id: req.gymId
      })
      .select()
      .single();

    if (memberInsertError) throw memberInsertError;

    // 5. Insert into memberships table
    const todayStr = getTodayStr();
    const endDateObj = new Date(endDate);
    const todayObj = new Date(todayStr);

    let calculatedStatus = 'active';
    if (endDateObj < todayObj) {
      calculatedStatus = 'expired';
    }

    const { data: membership, error: membershipInsertError } = await supabase
      .from('memberships')
      .insert({
        member_id: member.id,
        plan_id: plan.id,
        start_date,
        end_date: endDate,
        payment_status,
        amount_paid: payment_status === 'paid' ? (amount_paid || plan.price) : 0,
        payment_mode: payment_status === 'paid' ? payment_mode : null,
        status: calculatedStatus,
        gym_id: req.gymId
      })
      .select(`
        *,
        plans (
          id,
          name,
          duration_days,
          price,
          description
        )
      `)
      .single();

    if (membershipInsertError) throw membershipInsertError;

    return res.status(201).json({ member, membership });
  } catch (err) {
    console.error('Create member error:', err.message);
    return res.status(500).json({ error: 'Failed to register member' });
  }
});

// PUT /api/members/:id (protected)
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    full_name,
    phone,
    email,
    dob,
    gender,
    address,
    plan_id,
    start_date,
    payment_status,
    amount_paid,
    payment_mode,
    status
  } = req.body;

  try {
    // 1. Update members table
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) {
      // Check phone uniqueness if changed
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('members')
        .select('id')
        .eq('phone', phone)
        .eq('gym_id', req.gymId)
        .neq('id', id)
        .maybeSingle();

      if (phoneCheckError) throw phoneCheckError;
      if (existingPhone) {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
      updateData.phone = phone;
    }
    if (email !== undefined) updateData.email = email || null;
    if (dob !== undefined) updateData.dob = dob || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (address !== undefined) updateData.address = address || null;
    updateData.updated_at = new Date().toISOString();

    const { data: member, error: memberUpdateError } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .eq('gym_id', req.gymId)
      .select()
      .single();

    if (memberUpdateError) throw memberUpdateError;

    // 2. Handle membership update if plan/dates/payment changed
    let membership = null;
    
    // Fetch latest membership to know what to update
    const { data: memberships, error: membershipFetchError } = await supabase
      .from('memberships')
      .select('*')
      .eq('member_id', id)
      .order('end_date', { ascending: false });

    if (membershipFetchError) throw membershipFetchError;

    if (memberships && memberships.length > 0) {
      const latestMembership = memberships[0];
      const mUpdateData = {};

      let recalculateDates = false;
      let targetPlanId = plan_id || latestMembership.plan_id;
      let targetStartDate = start_date || latestMembership.start_date;

      if (plan_id && plan_id !== latestMembership.plan_id) {
        mUpdateData.plan_id = plan_id;
        recalculateDates = true;
      }
      if (start_date && start_date !== latestMembership.start_date) {
        mUpdateData.start_date = start_date;
        recalculateDates = true;
      }

      if (recalculateDates) {
        // Fetch plan details to get duration
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('duration_days')
          .eq('id', targetPlanId)
          .single();

        if (planError) throw planError;
        mUpdateData.end_date = addDays(targetStartDate, plan.duration_days);
      }

      if (payment_status !== undefined) mUpdateData.payment_status = payment_status;
      if (amount_paid !== undefined) mUpdateData.amount_paid = amount_paid;
      if (payment_mode !== undefined) mUpdateData.payment_mode = payment_mode;
      if (status !== undefined) mUpdateData.status = status;

      if (Object.keys(mUpdateData).length > 0) {
        const { data: updatedMembership, error: membershipUpdateError } = await supabase
          .from('memberships')
          .update(mUpdateData)
          .eq('id', latestMembership.id)
          .select(`
            *,
            plans (
              id,
              name,
              duration_days,
              price,
              description
            )
          `)
          .single();

        if (membershipUpdateError) throw membershipUpdateError;
        membership = updatedMembership;
      } else {
        // Fetch it with joined plan anyway for response
        const { data: existingWithPlan, error: fetchErr } = await supabase
          .from('memberships')
          .select(`
            *,
            plans (
              id,
              name,
              duration_days,
              price,
              description
            )
          `)
          .eq('id', latestMembership.id)
          .single();
        if (!fetchErr) membership = existingWithPlan;
      }
    }

    return res.json({ member, membership });
  } catch (err) {
    console.error('Update member error:', err.message);
    return res.status(500).json({ error: 'Failed to update member' });
  }
});

// PATCH /api/members/:id/followup (protected) — update follow-up call status
router.patch('/:id/followup', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { followup_status, followup_note } = req.body;

  const VALID_STATUSES = ['none', 'spoke', 'didnt_pick', 'call_back', 'not_interested', 'interested', 'rejoined'];
  if (followup_status && !VALID_STATUSES.includes(followup_status)) {
    return res.status(400).json({ error: 'Invalid followup_status value' });
  }

  try {
    const updateData = { updated_at: new Date().toISOString() };
    if (followup_status !== undefined) updateData.followup_status = followup_status;
    if (followup_note !== undefined) updateData.followup_note = followup_note || null;

    const { data: member, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .eq('gym_id', req.gymId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ member });
  } catch (err) {
    console.error('Update followup error:', err.message);
    return res.status(500).json({ error: 'Failed to update follow-up status' });
  }
});

// DELETE /api/members/:id (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
      .eq('gym_id', req.gymId);

    if (error) throw error;

    return res.json({ message: 'Member deleted' });
  } catch (err) {
    console.error('Delete member error:', err.message);
    return res.status(500).json({ error: 'Failed to delete member' });
  }
});

module.exports = router;
