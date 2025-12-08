// routes/ride.routes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  rideRequest,
  rideAccept,
  rideData,
  rideComplete,
  rideCancel,
  rideStart,
  rideHistoryUser,
  rideHistoryDriver,
  activeRide,
  rateDriver,
  rateRider
} = require("../controllers/ride.controller");




// Authenticated routes
router.post("/request", protect, rideRequest);       // Rider
router.get("/active", protect, activeRide); 
router.post("/accept/:rideId", protect, rideAccept); // Driver
router.post("/start/:rideId", protect, rideStart);   // Driver
router.post("/complete/:rideId", protect, rideComplete); // Driver
router.post("/cancel/:rideId", protect, rideCancel); // Rider/Driver
router.get("/:rideId", protect, rideData);           // Any authenticated user
router.get("/history/user/:userId", protect, rideHistoryUser);
router.get("/history/driver/:driverId", protect, rideHistoryDriver);

router.post("/:rideId/rating/driver", protect, rateDriver);
router.post("/:rideId/rating/rider", protect, rateRider);


module.exports = router;
