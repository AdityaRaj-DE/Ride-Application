// routes/user.route.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const userExtra = require('../controllers/user.extra.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const User = require("../models/user");

// Existing routes...
router.post('/register', [
  body('email').isEmail().withMessage('Invalid Email'),
  body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], userController.registerUser);

router.post('/login', [
  body('email').isEmail().withMessage('Invalid Email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], userController.loginUser);

router.get('/profile', authMiddleware.authUser, userController.getUserProfile);
router.get('/logout', authMiddleware.authUser, userController.logoutUser);

// 🔹 NEW ROUTES
router.patch('/update-profile', authMiddleware.authUser, userExtra.updateProfile);
router.delete('/delete', authMiddleware.authUser, userExtra.deleteUser);

// Email/OTP verification
router.post('/verify/request', authMiddleware.authUser, userExtra.requestVerification);
router.post('/verify', authMiddleware.authUser, userExtra.verifyUser);

// Wallet routes
router.get('/wallet', authMiddleware.authUser, userExtra.wallet);
router.patch('/wallet', authMiddleware.authUser, userExtra.wallet);

// Ratings

router.patch("/:id/rating", async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.rating =
    (user.rating * user.totalRatings + rating) /
    (user.totalRatings + 1);
  
  user.totalRatings++;
  await user.save();

  res.json({
    success: true,
    rating: user.rating,
    totalRatings: user.totalRatings
  });
});



module.exports = router;
