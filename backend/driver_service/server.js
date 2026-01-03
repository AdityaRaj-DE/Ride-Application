// Suppress util._extend deprecation warning from dependencies
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (typeof warning === 'string' && warning.includes('util._extend')) {
    return; // Suppress this specific warning
  }
  return originalEmitWarning.apply(process, [warning, ...args]);
};

require('dotenv').config();
const express = require("express");
const cors = require('cors');

const cookieParser = require('cookie-parser');
const driverRoutes = require("./routes/driver.route");
const connectToDb = require("./db/db");
const app = express();
connectToDb();
app.use(cookieParser());

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ["https://localhost:5173", "https://localhost:5174", "http://localhost:3001", "http://localhost:3004"];

app.use(
  cors({
    origin: ["https://localhost:5173", "https://localhost:5174", "http://localhost:3001", "http://localhost:3004"],
    credentials: true,                // allow cookies / JWT headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.get('/',(req,res)=>{
    res.send('working');
})
app.use("/drivers", driverRoutes);

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

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`🚗 Driver Service running on port ${PORT}`));