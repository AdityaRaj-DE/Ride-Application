// Suppress util._extend deprecation warning from dependencies
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (typeof warning === 'string' && warning.includes('util._extend')) {
    return; // Suppress this specific warning
  }
  return originalEmitWarning.apply(process, [warning, ...args]);
};

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
const connectToDb = require('./db/db');
const userRoutes = require('./routes/user.route');
const captainRoutes = require('./routes/driver.route');

connectToDb();
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174"
    ],  // your Vite frontend
    credentials: true,                // allow cookies / JWT headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use((req, res, next) => {
  console.log(`🎯 [Auth] Incoming: ${req.method} ${req.originalUrl}`);
  next();
});

// Configure body parser to handle aborted requests gracefully

app.use(express.json());


app.get('/',(req,res)=>{
    res.send('working');
})
app.use('/users', userRoutes);
app.use('/drivers', captainRoutes);

// Error handling middleware - suppress "request aborted" errors
app.use((err, req, res, next) => {
  // Suppress "request aborted" errors - these are harmless when clients disconnect
  if (err.message && (err.message.includes('request aborted') || err.message.includes('aborted'))) {
    return; // Don't log or respond to aborted requests
  }
  
  // Log other errors
  console.error('Error:', err.message || err);
  
  // Send error response if response hasn't been sent
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error'
    });
  }
});
app.use((err, req, res, next) => {
  console.error('❌ [Auth Error]', err);
  if (!res.headersSent) {
    res.status(500).json({ message: err.message || 'Server Error' });
  }
});

app.listen(3001, () => {
   console.log('server is running');
});

