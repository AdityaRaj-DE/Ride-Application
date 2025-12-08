const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  createRideRequest,
  getMyRides,
} = require("../controllers/rideRequest.controller");

const router = express.Router();

router.post("/request", protect, createRideRequest);
router.get("/myrides", protect, getMyRides);

module.exports = router;