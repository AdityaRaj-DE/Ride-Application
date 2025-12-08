const axios = require('axios');

const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || 'http://localhost:5006';

exports.sendPush = async (userId, message) => {
  try {
    console.log(`📱 Push notification to ${userId}: ${message}`);
    // Optional: send to realtime socket service
    await axios.post(`${REALTIME_SERVICE_URL}/notify`, { userId, message });
  } catch (error) {
    console.error("❌ Push error:", error.message);
  }
};