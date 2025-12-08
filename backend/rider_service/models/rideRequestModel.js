const mongoose = require("mongoose");

const rideRequestSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", required: true },
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "cancelled"],
      default: "pending",
    },
    fareEstimate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const RideRequest = mongoose.model("RideRequest", rideRequestSchema);
module.exports = RideRequest;