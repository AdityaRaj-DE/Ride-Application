const Payment = require("../models/paymentModel");
const axios = require("axios");

// 🔹 Dummy API for complete flow
exports.createPayment = async (req, res) => {
  try {
    const { rideId, userId, driverId, amount, paymentMethod } = req.body;

    if (!rideId || !userId || !driverId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const payment = await Payment.create({
      rideId,
      userId,
      driverId,
      amount,
      paymentMethod,
      status: "PENDING",
      transactionId: `TXN-${Date.now()}`,
    });

    // 🔗 TODO: integrate with Razorpay/Stripe API here later
    console.log("🔸 Simulating payment processing...");

    setTimeout(async () => {
      payment.status = "SUCCESS";
      await payment.save();

      // Sync with Auth Service → update user wallet
      try {
        await axios.patch(
          "http://localhost:3001/users/wallet",
          { amount, action: "deduct" },
          { headers: { Authorization: req.headers.authorization } }
        );
      } catch (err) {
        console.warn("⚠️ Wallet sync failed:", err.message);
      }

      // Sync with Driver Service → add earnings
      try {
        await axios.patch(`http://localhost:3003/driver/${driverId}/earnings`, { amount });
      } catch (err) {
        console.warn("⚠️ Driver payout sync failed:", err.message);
      }
    }, 2000);

    res.status(201).json({
      message: "Payment initiated (dummy)",
      payment,
    });
  } catch (err) {
    console.error("createPayment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  } catch (err) {
    console.error("getPaymentStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.status !== "SUCCESS")
      return res.status(400).json({ message: "Cannot refund non-successful payment" });

    payment.status = "REFUNDED";
    await payment.save();

    // Sync with wallet (refund to user)
    try {
      await axios.patch(
        "http://localhost:3001/users/wallet",
        { amount: payment.amount, action: "add" },
        { headers: { Authorization: req.headers.authorization } }
      );
    } catch (err) {
      console.warn("⚠️ Wallet refund failed:", err.message);
    }

    res.json({ message: "Payment refunded successfully", payment });
  } catch (err) {
    console.error("refundPayment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
