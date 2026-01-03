require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require("cookie-parser");

const rideRoutes = require('./routes/ride.routes');
const localRoutes = require('./routes/local.routes');
const setupSocket = require('./services/socket.service');
const connectToDb = require('./db/db');

connectToDb();

const app = express();
const server = http.createServer(app);

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ["https://localhost:5173", "https://localhost:5174"];

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ["https://localhost:5173", "https://localhost:5174"],  // ✅ same here
    credentials: true,
  },
});


app.use(cookieParser());
app.use(express.json());

app.use(
  cors({
    origin: ["https://localhost:5173", "https://localhost:5174"],  // ✅ match the FRONTEND, not the gateway
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Debug: log cookies to confirm they're arriving
app.use((req, res, next) => {
  console.log("🍪 Ride Service cookies:", req.cookies);
  next();
});

app.set('io', io);
setupSocket(io);

app.use('/rides', rideRoutes);
app.use('/local', localRoutes);

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => console.log(`🚕 Ride service running on port ${PORT}`));
