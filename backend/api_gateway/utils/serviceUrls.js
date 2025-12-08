require('dotenv').config();

module.exports = {
  auth: 'http://localhost:3001',
  rider: process.env.RIDER_SERVICE_URL || 'http://localhost:3002',
  driver: process.env.DRIVER_SERVICE_URL || 'http://localhost:3003',
  ride: process.env.RIDE_SERVICE_URL || 'http://localhost:3004',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007'
};