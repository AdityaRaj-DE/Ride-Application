// models/ride.js
const mongoose = require("mongoose");

// ✅ Define GeoPoint as a sub-schema
const GeoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number], // [lng, lat]
      index: "2dsphere",
      required: true,
    },
  },
  { _id: false } // prevents creation of _id for sub-documents
);

// ✅ Main Ride Schema
const RideSchema = new mongoose.Schema(
  {
    riderId: { type: String, required: true },
    driverId: { type: String, default: null },
    driverServiceId: { type: String, default: null },
    pickup: { type: GeoPointSchema, required: true },
    destination: { type: GeoPointSchema, required: true },
    distanceKm: { type: Number, default: 0 },
    durationMin: { type: Number, default: 0 },
    fare: { type: Number, default: 0 },
    fareBreakdown: { type: Object, default: {} },
    status: {
      type: String,
      enum: ["REQUESTED", "ACCEPTED", "STARTED", "COMPLETED", "CANCELLED"],
      default: "REQUESTED",
    },
    otp: { type: String },
    otpVerified: { type: Boolean, default: false },

    driverRating: {
      rating: Number,
      review: String
    },
    riderRating: {
      rating: Number,
      review: String
    },
    
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "REFUNDED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", RideSchema);
