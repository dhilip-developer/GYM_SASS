const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { getTodayStr, addDays, formatMessage } = require('../utils/sms');

// Initialize the cron scheduler
const initScheduler = () => {
  console.log('[SCHEDULER] Per-Gym automated WhatsApp notification cron job initialized.');

  // Run every minute: '* * * * *'
  cron.schedule('* * * * *', async () => {
    try {
      const todayStr = getTodayStr();
      
      // Get current time in HH:mm format (e.g. "08:00")
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      
      // 1. Fetch gyms that are scheduled for this exact minute
      const { data: gymsToProcess, error: gymError } = await supabase
        .from('gym_settings')
        .select('*')
        .eq('whatsapp_schedule_time', currentTimeStr);

      if (gymError) throw gymError;
      
      if (!gymsToProcess || gymsToProcess.length === 0) {
        // Most minutes will have no gyms scheduled
        return;
      }
      
      console.log(`[SCHEDULER] Found ${gymsToProcess.length} gym(s) scheduled for ${currentTimeStr}...`);

      // 1. Fetch active message templates for these gyms
      const gymIds = gymsToProcess.map(g => g.gym_id);
      const { data: templates, error: templatesError } = await supabase
        .from('message_templates')
        .select('*')
        .in('gym_id', gymIds)
        .eq('is_active', true);

      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) {
        console.log(`[SCHEDULER] No active message templates found for gyms at ${currentTimeStr}. Exiting job.`);
        return;
      }

      let totalSent = 0;
      let totalFailed = 0;

      // 2. For each active template, find qualifying memberships
      for (const template of templates) {
        const trigger = template.trigger_type;
        const gymId = template.gym_id;
        let memberships = [];

        // The settings were already fetched in step 1, so we just find it
        const settings = gymsToProcess.find(g => g.gym_id === gymId) || {
          gym_name: 'Our Gym',
          phone: '9876543210',
          whatsapp_mode: 'redirect'
        };

        if (trigger === 'expiry_3day') {
          const targetDate = addDays(todayStr, 3);
          const { data, error } = await supabase
            .from('memberships')
            .select('*, members(*)')
            .eq('end_date', targetDate)
            .eq('status', 'active')
            .eq('gym_id', gymId);
          
          if (!error && data) memberships = data;
        } 
        else if (trigger === 'expiry_1day') {
          const targetDate = addDays(todayStr, 1);
          const { data, error } = await supabase
            .from('memberships')
            .select('*, members(*)')
            .eq('end_date', targetDate)
            .eq('status', 'active')
            .eq('gym_id', gymId);
          
          if (!error && data) memberships = data;
        } 
        else if (trigger === 'expired') {
          const targetDate = addDays(todayStr, -1); // yesterday
          const { data, error } = await supabase
            .from('memberships')
            .select('*, members(*)')
            .eq('end_date', targetDate)
            .eq('status', 'active')
            .eq('gym_id', gymId);
          
          if (!error && data) memberships = data;

          // For all expired memberships, we must also update status='expired'
          for (const membership of memberships) {
            const { error: updateError } = await supabase
              .from('memberships')
              .update({ status: 'expired' })
              .eq('id', membership.id);
            
            if (updateError) {
              console.error(`[SCHEDULER] Failed updating membership ${membership.id} status to expired:`, updateError.message);
            } else {
              console.log(`[SCHEDULER] Updated membership ${membership.id} status to expired.`);
            }
          }
        }

        // 3. Queue messages to pending_messages for the Local Agent to pick up
        for (const membership of memberships) {
          const member = membership.members;
          if (!member) continue;

          const formattedMessage = formatMessage(template.template_body, {
            name: member.full_name,
            expiryDate: membership.end_date,
            gymName: settings.gym_name,
            ownerPhone: settings.phone
          });

          // Insert into pending_messages table
          const { error: insertError } = await supabase
            .from('pending_messages')
            .insert({
              gym_id: gymId,
              member_id: member.id,
              membership_id: membership.id,
              trigger_type: trigger,
              message: formattedMessage,
              phone: member.phone,
              status: 'pending'
            });

          if (insertError) {
            console.error(`[SCHEDULER] Failed to queue message for ${member.phone}:`, insertError.message);
            totalFailed++;
          } else {
            console.log(`[SCHEDULER] Queued pending message for ${member.phone} (${gymId})`);
            totalSent++;
          }
        }
      }

      console.log(`Cron done: ${totalSent} queued, ${totalFailed} failed to queue`);
    } catch (err) {
      console.error('[SCHEDULER ERROR] Fail during cron job check:', err.message);
    }
  });
};

module.exports = { initScheduler };
