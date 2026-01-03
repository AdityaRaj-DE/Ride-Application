require('dotenv').config();

// Suppress util._extend deprecation warning from dependencies
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (typeof warning === 'string' && warning.includes('util._extend')) {
    return; // Suppress this specific warning
  }
  return originalEmitWarning.apply(process, [warning, ...args]);
};
const cookieParser = require('cookie-parser')
const express = require('express');
const connectToDb = require('./db/db');
const cors = require('cors');
const notificationRoutes = require('./routes/notification.routes');
connectToDb();
const app = express();

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ["https://localhost:5173", "https://localhost:5174"];

app.use(cors({
  origin: ["https://localhost:5173", "https://localhost:5174"],
  credentials: true,                // allow cookies / JWT headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(cookieParser());
app.use(express.json());


app.use('/notification', notificationRoutes);

// Error handling middleware - suppress "request aborted" errors
app.use((err, req, res, next) => {
  // Suppress "request aborted" errors - these are harmless when clients disconnect
  if (err.message && (err.message.includes('request aborted') || err.message.includes('aborted'))) {
    return; // Don't log or respond to aborted requests
  }
  
  console.error('Error:', err.message || err);
  
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error'
    });
  }
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => console.log(`🔔 Notification Service running on port ${PORT}`));