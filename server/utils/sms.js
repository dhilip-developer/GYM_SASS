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
  formatMessage
};
