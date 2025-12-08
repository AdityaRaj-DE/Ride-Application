const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");

// 🔐 Payment Flow
router.post("/create", paymentController.createPayment);
router.get("/status/:paymentId", paymentController.getPaymentStatus);
router.patch("/refund/:paymentId", paymentController.refundPayment);

module.exports = router;
