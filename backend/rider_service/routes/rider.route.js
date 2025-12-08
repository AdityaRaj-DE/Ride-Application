const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  createOrUpdateRider,
  getRiderProfile,
} = require("../controllers/rider.controller");

const router = express.Router();

router.post("/profile", protect, createOrUpdateRider);
router.get("/profile", protect, getRiderProfile);

module.exports = router;