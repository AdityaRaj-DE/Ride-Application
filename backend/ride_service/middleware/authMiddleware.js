const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  let token = null;

  // Always prioritize Authorization header
  if (req.headers.authorization) {
    const auth = req.headers.authorization;
    if (auth.startsWith("Bearer ")) {
      token = auth.slice(7);
    } else {
      token = auth;
    }
  }

  if (!token) {
    console.error("❌ No token in request");
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "goodkeymustchange"
    );

    console.log("🔐 Decoded token:", decoded);

    // Ride service only needs the *auth userId*
    // Accept both user and driver token structures
const id = decoded.id || decoded.userId || decoded.driverId;
const role = decoded.role || (decoded.driverId ? "driver" : "user");

if (!id) {
  console.error("❌ No valid ID in token:", decoded);
  return res.status(401).json({ message: "Invalid token payload" });
}

req.user = { id, role };

next();

  } catch (err) {
    console.error("❌ JWT error:", err.message);
    res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};
