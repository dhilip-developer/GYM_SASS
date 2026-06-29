const axios = require('axios');

// Get today's date string in YYYY-MM-DD local time
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Add days to a YYYY-MM-DD date string
const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Send SMS via MSG91
const sendSMS = async (phone, message) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || 'GYMOSM';

  // Clean phone number (strip non-digits)
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone; // Prefix with 91 for India
  }

  console.log(`[SMS SENDER] To: ${cleanPhone}, Message: "${message}"`);

  if (!authKey || authKey.startsWith('your_') || authKey === 'placeholder') {
    console.log('[SMS SENDER INFO] MSG91 Auth Key is placeholder or missing. Simulating success.');
    return { success: true, simulated: true };
  }

  try {
    const response = await axios.post('https://api.msg91.com/api/sendhttp.php', null, {
      params: {
        authkey: authKey,
        mobiles: cleanPhone,
        message: message,
        sender: senderId,
        route: 4
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[SMS SENDER ERROR] MSG91 API failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Interpolate placeholders
const formatMessage = (templateBody, { name, expiryDate, gymName, ownerPhone }) => {
  return templateBody
    .replace(/{Name}/g, name || '')
    .replace(/{ExpiryDate}/g, expiryDate || '')
    .replace(/{GymName}/g, gymName || '')
    .replace(/{OwnerPhone}/g, ownerPhone || '');
};

module.exports = {
  getTodayStr,
  addDays,
  sendSMS,
  formatMessage
};
