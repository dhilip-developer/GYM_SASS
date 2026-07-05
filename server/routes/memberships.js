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

// GET /api/memberships/stats (protected)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Fetch all members with their memberships
    const { data: members, error } = await supabase
      .from('members')
      .select('id, memberships(end_date, payment_status, status, amount_paid, start_date)')
      .eq('gym_id', req.gymId);

    // Also fetch all memberships to calculate this month's revenue
    const { data: allMemberships, error: memError } = await supabase
      .from('memberships')
      .select('amount_paid, payment_status, updated_at')
      .eq('gym_id', req.gymId);

    if (error || memError) throw error || memError;

    const todayStr = getTodayStr();
    const today = new Date(todayStr);

    let total = members.length;
    let active = 0;
    let expired = 0;
    let expiring_soon = 0;
    let unpaid = 0;

    members.forEach(member => {
      let latestMembership = null;
      if (member.memberships && member.memberships.length > 0) {
        const sorted = [...member.memberships].sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
        latestMembership = sorted[0];
      }

      if (!latestMembership) {
        expired++; // defaults to expired if no membership
      } else {
        const endDateObj = new Date(latestMembership.end_date);

        if (latestMembership.payment_status === 'pending') {
          unpaid++;
        }

        // Active check
        if (latestMembership.payment_status === 'paid' && endDateObj >= today) {
          active++;
        }

        // Expired check (any status where end_date < today)
        if (endDateObj < today) {
          expired++;
        }

        // Expiring soon check: end_date between today and today+3 days
        const diffTime = endDateObj - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3 && latestMembership.payment_status === 'paid') {
          expiring_soon++;
        }
      }
    });

    let revenue_this_month = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Setup array for last 6 months of revenue
    const revenue_trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      revenue_trend.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        revenue: 0
      });
    }

    if (allMemberships) {
      allMemberships.forEach(m => {
        if (m.payment_status === 'paid' && m.amount_paid) {
          // If updated_at exists, use it, else fallback to today
          const d = m.updated_at ? new Date(m.updated_at) : new Date();
          
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            revenue_this_month += (m.amount_paid || 0);
          }

          // Add to revenue trend if it falls within the last 6 months
          const trendItem = revenue_trend.find(t => t.monthIndex === d.getMonth() && t.year === d.getFullYear());
          if (trendItem) {
            trendItem.revenue += (m.amount_paid || 0);
          }
        }
      });
    }

    return res.json({
      total,
      active,
      expired,
      expiring_soon,
      unpaid,
      revenue_this_month,
      revenue_trend
    });
  } catch (err) {
    console.error('Membership stats error:', err.message);
    return res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

// PUT /api/memberships/:id/mark-paid (protected)
// Body: { amount_paid, payment_mode }
router.put('/:id/mark-paid', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { amount_paid, payment_mode } = req.body;

  if (!payment_mode) {
    return res.status(400).json({ error: 'Payment mode is required' });
  }

  try {
    // 1. Fetch membership + plan to get duration_days
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('*, plans(duration_days, price)')
      .eq('id', id)
      .single();

    if (membershipError || !membership) {
      return res.status(404).json({ error: 'Membership record not found' });
    }

    const durationDays = membership.plans.duration_days;
    const planPrice = membership.plans.price;
    const finalAmount = amount_paid !== undefined ? amount_paid : planPrice;

    // Calculate end_date = today + duration_days
    const todayStr = getTodayStr();
    const newEndDate = addDays(todayStr, durationDays);

    // 2. Update memberships
    const { data: updatedMembership, error: updateError } = await supabase
      .from('memberships')
      .update({
        payment_status: 'paid',
        amount_paid: finalAmount,
        payment_mode,
        status: 'active',
        end_date: newEndDate
      })
      .eq('id', id)
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

    if (updateError) throw updateError;

    return res.json({ membership: updatedMembership });
  } catch (err) {
    console.error('Mark paid error:', err.message);
    return res.status(500).json({ error: 'Failed to record payment' });
  }
});

module.exports = router;
