// controllers/user.extra.controller.js
const userModel = require('../models/user');
const crypto = require('crypto');

/**
 * 🔹 Update Profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowed = ['fullname', 'email', 'password'];

    for (let key of Object.keys(updates)) {
      if (!allowed.includes(key)) delete updates[key];
    }

    if (updates.password) {
      updates.password = await userModel.hashPassword(updates.password);
    }

    const user = await userModel.findByIdAndUpdate(req.user._id, updates, { new: true });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * 🔹 Delete User
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await userModel.findByIdAndDelete(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * 🔹 Request OTP (for verification)
 */
exports.requestVerification = async (req, res) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 min

    await userModel.findByIdAndUpdate(req.user._id, {
      otp,
      otpExpires,
    });

    // Normally you’d send OTP via email — here we just return it for dev
    res.json({ message: 'OTP generated (mock)', otp });
  } catch (err) {
    console.error('requestVerification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * 🔹 Verify OTP
 */
exports.verifyUser = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await userModel.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.otp || !user.otpExpires) return res.status(400).json({ message: 'No OTP generated' });
    if (Date.now() > user.otpExpires) return res.status(400).json({ message: 'OTP expired' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'User verified successfully' });
  } catch (err) {
    console.error('verifyUser error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * 🔹 Wallet Balance
 */
exports.wallet = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.method === 'GET') {
      return res.json({ walletBalance: user.walletBalance });
    }

    if (req.method === 'PATCH') {
      const { amount, action } = req.body; // action = 'add' or 'deduct'
      if (typeof amount !== 'number' || amount <= 0)
        return res.status(400).json({ message: 'Invalid amount' });

      if (action === 'add') user.walletBalance += amount;
      else if (action === 'deduct') {
        if (user.walletBalance < amount)
          return res.status(400).json({ message: 'Insufficient balance' });
        user.walletBalance -= amount;
      } else {
        return res.status(400).json({ message: 'Invalid action' });
      }

      await user.save();
      res.json({ walletBalance: user.walletBalance });
    }
  } catch (err) {
    console.error('wallet error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * 🔹 Rate Driver After Ride
 */
exports.rateDriver = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driverId, rating, review } = req.body;

    if (!driverId || !rating) return res.status(400).json({ message: 'driverId and rating required' });
    if (rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.ratings.push({ rideId, driverId, rating, review });
    await user.save();

    res.json({ message: 'Rating saved successfully', rating: { rideId, driverId, rating, review } });
  } catch (err) {
    console.error('rateDriver error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
