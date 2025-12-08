const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driver.controller");
const { protect } = require("../middlewares/authMiddleware");
const Driver = require("../models/driverModel");

// 🔐 Driver routes
router.post("/register", protect, driverController.createOrUpdateDriver);
router.get("/profile", protect, driverController.getDriverProfile);
router.put("/availability", protect, driverController.updateAvailability);
router.put("/location", protect, driverController.updateLocation);

// 💰 Wallet & Subscription
router.get("/wallet", protect, driverController.getWallet);
router.post("/wallet/add-funds", protect, driverController.addFunds);
router.post("/subscription/subscribe", protect, driverController.subscribePlan);
router.get("/subscription/status", protect, driverController.getOwnSubscriptionStatus);
router.get(
    "/subscription-status/:userId",
    driverController.getSubscriptionStatusForService
  );
  

// 📊 Driver Stats
router.get("/earnings/:driverId", protect, driverController.getEarnings);
router.get("/history/:driverId", protect, driverController.getRideHistory);
router.get("/trip-summary", protect, driverController.getTripSummary);

// 🧭 Nearby – used by Ride Service
router.get("/nearby", driverController.getNearbyDrivers);

// 🆔 Internal lookup using auth userId
router.get("/by-user/:userId", driverController.getDriverByUserId);
router.patch("/:userId/status", driverController.updateDriverStatusByUserId);

// ⭐ Rating
router.patch("/:id/rating", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    driver.rating =
      (driver.rating * driver.totalRatings + rating) /
      (driver.totalRatings + 1);

    driver.totalRatings++;
    await driver.save();

    res.json({
      success: true,
      rating: driver.rating,
      totalRatings: driver.totalRatings,
    });
  } catch (err) {
    console.error("Driver rating update:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
