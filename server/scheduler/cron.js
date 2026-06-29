const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { getTodayStr, addDays, sendSMS, formatMessage } = require('../utils/sms');

// Initialize the cron scheduler
const initScheduler = () => {
  console.log('[SCHEDULER] Daily 8:00 AM SMS notification cron job initialized.');

  // Run daily at 8:00 AM: '0 8 * * *'
  cron.schedule('0 8 * * *', async () => {
    console.log('[SCHEDULER] Running daily SMS checks...');
    try {
      const todayStr = getTodayStr();
      
      // 1. Fetch gym settings
      const { data: settingsList, error: settingsError } = await supabase
        .from('gym_settings')
        .select('*');

      if (settingsError) throw settingsError;

      const settings = (settingsList && settingsList.length > 0) ? settingsList[0] : {
        gym_name: 'Our Gym',
        phone: '9876543210'
      };

      // 2. Fetch active message templates
      const { data: templates, error: templatesError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('is_active', true);

      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) {
        console.log('[SCHEDULER] No active message templates found. Exiting job.');
        return;
      }

      let totalSent = 0;
      let totalFailed = 0;

      // 3. For each active template, find qualifying memberships
      for (const template of templates) {
        const trigger = template.trigger_type;
        let memberships = [];

        if (trigger === 'expiry_3day') {
          const targetDate = addDays(todayStr, 3);
          const { data, error } = await supabase
            .from('memberships')
            .select('*, members(*)')
            .eq('end_date', targetDate)
            .eq('status', 'active');
          
          if (!error && data) memberships = data;
        } 
        else if (trigger === 'expiry_1day') {
          const targetDate = addDays(todayStr, 1);
          const { data, error } = await supabase
            .from('memberships')
            .select('*, members(*)')
            .eq('end_date', targetDate)
            .eq('status', 'active');
          
          if (!error && data) memberships = data;
        } 
        else if (trigger === 'expired') {
          const targetDate = addDays(todayStr, -1); // yesterday
          const { data, error } = await supabase
            .from('memberships')
            .select('*, members(*)')
            .eq('end_date', targetDate)
            .eq('status', 'active');
          
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

        // 4. Send messages to qualifying members
        for (const membership of memberships) {
          const member = membership.members;
          if (!member) continue;

          const formattedMessage = formatMessage(template.template_body, {
            name: member.full_name,
            expiryDate: membership.end_date,
            gymName: settings.gym_name,
            ownerPhone: settings.phone
          });

          // Send SMS
          const sendResult = await sendSMS(member.phone, formattedMessage);

          // Insert row into message_logs
          const { error: logError } = await supabase
            .from('message_logs')
            .insert({
              member_id: member.id,
              membership_id: membership.id,
              trigger_type: trigger,
              message_sent: formattedMessage,
              status: sendResult.success ? 'sent' : 'failed'
            });

          if (logError) {
            console.error('[SCHEDULER] Failed logging SMS event to message_logs:', logError.message);
          }

          if (sendResult.success) {
            totalSent++;
          } else {
            totalFailed++;
          }
        }
      }

      console.log(`Cron done: ${totalSent} sent, ${totalFailed} failed`);
    } catch (err) {
      console.error('[SCHEDULER ERROR] Fail during cron job check:', err.message);
    }
  });
};

module.exports = { initScheduler };
