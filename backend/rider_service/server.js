// Suppress util._extend deprecation warning from dependencies
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (typeof warning === 'string' && warning.includes('util._extend')) {
    return; // Suppress this specific warning
  }
  return originalEmitWarning.apply(process, [warning, ...args]);
};

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectToDb = require('./db/db');
const riderRoutes = require('./routes/rider.route')
const rideRequestRoutes = require('./routes/rideRequest.route')

const app = express();

connectToDb();
app.use(cookieParser());

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,                // allow cookies / JWT headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.get('/',(req,res)=>{
    res.send('working');
})

app.use('/rider', riderRoutes);
app.use('/ride', rideRequestRoutes);

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

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`👤 Rider Service running on port ${PORT}`);
});