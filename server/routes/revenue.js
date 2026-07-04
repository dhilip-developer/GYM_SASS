const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/revenue/report
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('gym_id', req.gymId);

    if (error) throw error;

    // Calculate basic revenue stats
    let totalRevenue = 0;
    let pendingRevenue = 0;
    
    // Monthly breakdown (simple mock logic)
    const monthlyData = {};

    (memberships || []).forEach(m => {
      const month = m.start_date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { collected: 0, pending: 0 };
      }

      if (m.payment_status === 'paid') {
        const amt = parseFloat(m.amount_paid) || 0;
        totalRevenue += amt;
        monthlyData[month].collected += amt;
      } else {
        // Assume pending amount is the plan price (if we had plan price joined, 
        // but for now we just use a fixed estimate or rely on amount_paid=0)
        // In a real app we'd join plan price.
        pendingRevenue += 1000; // Mock estimate
        monthlyData[month].pending += 1000;
      }
    });

    const chartData = Object.keys(monthlyData).sort().map(month => ({
      name: month,
      collected: monthlyData[month].collected,
      pending: monthlyData[month].pending
    }));

    return res.json({
      totalRevenue,
      pendingRevenue,
      chartData
    });
  } catch (err) {
    console.error('Fetch revenue error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

module.exports = router;
