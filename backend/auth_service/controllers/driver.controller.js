const driverModel = require("../models/driverModel");
const driverService = require("../services/driver.service");
const blackListTokenModel = require("../models/blacklistToken");
const { validationResult } = require("express-validator");
const axios = require("axios"); // 👈 add this
const jwt = require("jsonwebtoken");

module.exports.registerCaptain = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param || err.path,
      message: err.msg || err.message || 'Validation error'
    }));
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errorMessages 
    });
  }

  const { fullname, email, password, mobileNumber,licenseNumber, vehicle } = req.body;

  const isCaptainAlreadyExist = await driverModel.findOne({ email });

  if (isCaptainAlreadyExist) {
    return res.status(400).json({ message: "Captain already exist" });
  }

  const hashedPassword = await driverModel.hashPassword(password);

  const captain = await driverService.createCaptain({
    firstname: fullname.firstname,
    lastname: fullname.lastname,
    email,
    password: hashedPassword,
    mobileNumber,
    licenseNumber,
    color: vehicle.color,
    plate: vehicle.plate,
    capacity: vehicle.capacity,
    vehicleType: vehicle.vehicleType,
  });

  const token = jwt.sign(
    {
      driverId: captain._id,
      userId: captain._id,
      role: "driver",
    },
    process.env.JWT_SECRET || "goodkeymustchange",
    { expiresIn: "24h" }
  );
  
  
try{
  await axios.post("http://localhost:3003/drivers/register", {
    _id: captain._id,
    firstname: captain.fullname.firstname,
    lastname: captain.fullname.lastname,
    mobileNumber: captain.mobileNumber,
    licenseNumber: captain.licenseNumber,
    model: captain.vehicle.vehicleType,
    color: captain.vehicle.color,
    plateNumber: captain.vehicle.plate
  },
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
} catch (err) {
console.warn("⚠️ Failed to sync with Rider Service:", err);
}

  res.status(201).json({ token, captain });
};

module.exports.loginCaptain = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param || err.path,
      message: err.msg || err.message || 'Validation error'
    }));
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errorMessages 
    });
  }

  const { email, password } = req.body;

  const captain = await driverModel.findOne({ email }).select("+password");

  if (!captain) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await captain.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign(
    {
      driverId: captain._id,      // DriverService document ID
      userId: captain._id,        // same for now since same db
      role: "driver",
    },
    process.env.JWT_SECRET || "goodkeymustchange",
    { expiresIn: "24h" }
  );

  res.cookie("token", token, {
    httpOnly: true,        // prevents JS access (security best practice)
    secure: false,         // set to true if using HTTPS
    sameSite: "lax",       // "none" if you ever deploy frontend and backend on different domains
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });
  

  res.status(200).json({ token, driver: captain });
};

module.exports.getCaptainProfile = async (req, res, next) => {
  res.status(200).json({ driver: req.captain });
};

module.exports.logoutCaptain = async (req, res, next) => {
  let token = req.cookies.token;
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (token) {
    await blackListTokenModel.create({ token });
  }

  res.clearCookie("token");

  res.status(200).json({ message: "Logout successfully" });
};
