// server.js
const express = require("express");
const cors = require("cors");
const connectToDb = require("./db/db");
const paymentRoutes = require("./routes/payment.routes");
const cookieParser = require('cookie-parser');

connectToDb();

const app = express();
app.use(cors());
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
app.use(express.json());

app.get("/", (req, res) => res.send("💳 Payment Service running (dummy mode)"));
app.use("/payments", paymentRoutes);

app.listen(3005, () => console.log("💳 Payment Service running on port 3005"));
