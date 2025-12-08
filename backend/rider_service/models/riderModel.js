const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // from Auth Service
    rating: { type: Number, default: 5.0 },
    totalRides: { type: Number, default: 0 },
    preferredPayment: { type: String, default: "cash" },
    savedLocations: [
      {
        name: String,
        coordinates: {
          lat: Number,
          lng: Number,
        },
      },
    ],
  },
  { timestamps: true }
);

const Rider = mongoose.model("Rider", riderSchema);
module.exports = Rider;