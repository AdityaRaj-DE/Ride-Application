// models/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  fullname: {
    firstname: { type: String, required: true, minlength: 3 },
    lastname: { type: String, minlength: 3 },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  socketId: { type: String },

  // 🔹 NEW FIELDS
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  walletBalance: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  totalRatings: { type: Number, default: 0 },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { id: this._id.toString(), email: this.email },
    process.env.JWT_SECRET || "goodkeymustchange",
    { expiresIn: "24h" }
  );
  return token;
};

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.statics.hashPassword = async function (password) {
  return await bcrypt.hash(password, 10);
};

module.exports = mongoose.model("user", userSchema);
