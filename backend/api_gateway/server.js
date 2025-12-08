require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
const urls = require("./utils/serviceUrls");
const cors = require("cors")
/* ✅ Suppress harmless util._extend deprecation warning */
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  if (typeof warning === "string" && warning.includes("util._extend")) return;
  return originalEmitWarning.call(process, warning, ...args);
};

const app = express();

// Basic logging
app.use(morgan("dev"));
// app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174"
    ],  // your React dev server
    credentials: true,                // required for cookies/JWT
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"],
  })
);
// Health check route
app.get("/", (req, res) => res.send("✅ API Gateway is running!"));

// ============================
// 🔹 AUTH SERVICE (Users + Captains)
// ============================
// ============================
// 🔹 AUTH SERVICE (Users + Captains)
// ============================

app.use(
  "/auth",
  createProxyMiddleware({
    target: urls.auth,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path, req) => {
      console.log("🧩 Incoming path before rewrite:", path);

      // Handle User routes
      if (path.startsWith("/auth/users")) {
        return path.replace("/auth/users", "/users");
      }
      
      // Handle User routes (singular for backward compatibility)
      if (path.startsWith("/auth/user")) {
        return path.replace("/auth/user", "/users");
      }

      // Handle Driver routes
      if (path.startsWith("/auth/drivers")) {
        return path.replace("/auth/drivers", "/drivers");
      }
      
      // Handle Captain routes (for backward compatibility)
      if (path.startsWith("/auth/captain")) {
        return path.replace("/auth/captain", "/drivers");
      }

      // Default fallback (no change)
      return path;
    },
    onProxyReq: (proxyReq, req) => {
      console.log(`🔁 [Auth] ${req.method} ${req.originalUrl} → ${proxyReq.path}`);
      if (req.headers.authorization) {
        proxyReq.setHeader("authorization", req.headers.authorization);
      }
    },
    onProxyRes: function (proxyRes, req, res) {   // 🔥 REQUIRED FIX
      const cookies = proxyRes.headers['set-cookie'];
      if (cookies) {
        proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
          cookie
            .replace(/; Secure/gi, '') // remove Secure for HTTP dev
            .replace(/SameSite=Lax/gi, 'SameSite=None') // ensures cross-site cookie
        );
      }
    },
    onError: (err, req, res) => {
      console.error("❌ [Auth Proxy Error]:", err.message);
      res.status(500).json({ message: "Proxy error", error: err.message });
    },
  })
);



// ============================
// 🔹 RIDER SERVICE
// ============================
app.use(
  "/rider",
  createProxyMiddleware({
    target: urls.rider,
    changeOrigin: true,
    logLevel: "debug",
    onProxyReq: (proxyReq, req) => {
      console.log(`🔁 [Rider] ${req.method} ${req.originalUrl} → ${proxyReq.path}`);
      if (req.headers.authorization) {
        proxyReq.setHeader("authorization", req.headers.authorization);
      }
    },
    onError: (err, req, res) => {
      console.error("❌ [Rider Proxy Error]:", err.message);
      res.status(500).json({ message: "Rider proxy error", error: err.message });
    }
  })
);

// ============================
// 🔹 DRIVER SERVICE
// ============================
app.use(
  "/driver",
  createProxyMiddleware({
    target: urls.driver,
    changeOrigin: true,
    logLevel: "debug",
    onProxyReq: (proxyReq, req) => {
      console.log(`🔁 [Driver] ${req.method} ${req.originalUrl} → ${proxyReq.path}`);
      if (req.headers.authorization) {
        proxyReq.setHeader("authorization", req.headers.authorization);
      }
    },
    onError: (err, req, res) => {
      console.error("❌ [Driver Proxy Error]:", err.message);
      res.status(500).json({ message: "Driver proxy error", error: err.message });
    }
  })
);

// ============================
// 🔹 RIDE SERVICE
// ============================
app.use(
  "/ride",
  createProxyMiddleware({
    target: urls.ride,
    changeOrigin: true,
    logLevel: "debug",
    ws: true,
    // pathRewrite: { "^/ride": "" }, // ✅ remove /ride prefix
    onProxyReq: (proxyReq, req) => {
      console.log(`🔁 [Ride] ${req.method} ${req.originalUrl} → ${proxyReq.path}`);
      if (req.headers.authorization) {
        proxyReq.setHeader("authorization", req.headers.authorization);
      }
    },
    onError: (err, req, res) => {
      console.error("❌ [Ride Proxy Error]:", err.message);
      res.status(500).json({ message: "Ride proxy error", error: err.message });
    }
  })
);


// ============================
// 🔹 PAYMENT SERVICE
// ============================
app.use(
  "/payment",
  createProxyMiddleware({
    target: urls.payment,
    changeOrigin: true,
    logLevel: "debug",
    onProxyReq: (proxyReq, req) => {
      console.log(`🔁 [Payment] ${req.method} ${req.originalUrl} → ${proxyReq.path}`);
      if (req.headers.cookie) {
        proxyReq.setHeader("cookie", req.headers.cookie);
      }
    },
    onError: (err, req, res) => {
      console.error("❌ [Payment Proxy Error]:", err.message);
      res.status(500).json({ message: "Payment proxy error", error: err.message });
    }
  })
);

// ============================
// 🔹 NOTIFICATION SERVICE
// ============================
app.use(
  "/notification",
  createProxyMiddleware({
    target: urls.notification,
    changeOrigin: true,
    logLevel: "debug",
    onProxyReq: (proxyReq, req) => {
      console.log(`🔁 [Notification] ${req.method} ${req.originalUrl} → ${proxyReq.path}`);
      if (req.headers.cookie) {
        proxyReq.setHeader("cookie", req.headers.cookie);
      }
    },
    onError: (err, req, res) => {
      console.error("❌ [Notification Proxy Error]:", err.message);
      res.status(500).json({ message: "Notification proxy error", error: err.message });
    }
  })
);

// Start Gateway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚪 API Gateway running on port ${PORT}`));
