const userModel = require('../models/user');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blacklistToken');
const axios = require('axios'); // 👈 add this

module.exports.registerUser = async (req, res, next) => {
  console.log("i am here");
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

  const { fullname, email, password } = req.body;

  try {
    const isUserAlready = await userModel.findOne({ email });
    if (isUserAlready) {
      return res.status(400).json({ message: 'User already exist' });
    }

    // Hash password
    const hashedPassword = await userModel.hashPassword(password);

    // Create user
    const user = await userService.createUser({
      firstname: fullname.firstname,
      lastname: fullname.lastname,
      email,
      password: hashedPassword
    });

    // Generate token
    const token = user.generateAuthToken();

    // 🔗 Step 3: Sync user with Rider Service
   // In your Auth Controller after successful registration/login

try {
  await axios.post(
    "http://localhost:3002/rider/profile",
    {}, // ✅ no body needed
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
} catch (err) {
  console.warn("⚠️ Failed to sync with Rider Service:", err.message);
}

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('❌ Error in registerUser:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};


module.exports.loginUser = async (req, res, next) => {
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

    const user = await userModel.findOne({ email }).select('+password');

    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = user.generateAuthToken();

    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: false,        // 🔥 must be true for SameSite=None
    //   sameSite: "None",    // 🔥 must be None for cross-origin
    //   path: "/", 
    //   maxAge: 24 * 60 * 60 * 1000,
    // });
    
    

    res.status(200).json({ token, user });
}

module.exports.getUserProfile = async (req, res, next) => {

    res.status(200).json(req.user);

}

module.exports.logoutUser = async (req, res, next) => {
    res.clearCookie('token');
    
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

    res.status(200).json({ message: 'Logged out' });

}