const jwt = require("jsonwebtoken");

function protect(req, res, next) {
  try {
    let token = null;

    // 1️⃣ Check cookies first (browser-based auth)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2️⃣ Fallback: check Authorization header (mobile/postman)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    // 3️⃣ No token found
    if (!token) {
      console.error("❌ No token found in cookie or header");
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    // 4️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "goodkeymustchange");
    req.user = decoded;

    console.log("✅ Driver verified:", decoded);
    next();
  } catch (err) {
    console.error("❌ JWT error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

module.exports = { protect };
