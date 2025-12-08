const RideRequest = require("../models/rideRequestModel");
const Rider = require("../models/riderModel");

// Create ride request
exports.createRideRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pickup, drop, fareEstimate } = req.body;

    const rider = await Rider.findOne({ userId });
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    const rideRequest = await RideRequest.create({
      riderId: rider._id,
      pickup,
      drop,
      fareEstimate,
    });

    res.status(201).json(rideRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all rides for a rider
exports.getMyRides = async (req, res) => {
  try {
    const userId = req.user.id;
    const rider = await Rider.findOne({ userId });

    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    const rides = await RideRequest.find({ riderId: rider._id });
    res.json(rides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};