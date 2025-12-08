// models/paymentModel.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    rideId: { type: String, required: true },
    userId: { type: String, required: true },
    driverId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      enum: ["WALLET", "RAZORPAY", "CASH", "STRIPE"],
      default: "WALLET",
    },
    transactionId: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
