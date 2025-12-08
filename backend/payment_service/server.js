// server.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const connectToDb = require("./db/db");
const paymentRoutes = require("./routes/payment.routes");
const cookieParser = require('cookie-parser');

connectToDb();

const app = express();

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: corsOrigins,
  credentials: true,                // allow cookies / JWT headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => res.send("💳 Payment Service running (dummy mode)"));
app.use("/payments", paymentRoutes);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`💳 Payment Service running on port ${PORT}`));
