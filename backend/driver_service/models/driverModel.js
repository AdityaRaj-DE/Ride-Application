const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    rideId: { type: String },
    userId: { type: String }, // rider/user who rated
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const driverSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // Auth Service driver _id
    fullname: {
      firstname: { type: String, required: true, minlength: 3 },
      lastname: { type: String, minlength: 3 },
    },
    mobileNumber: { type: String, required: true, unique: true },
    vehicleInfo: {
      model: { type: String },
      plateNumber: { type: String },
      color: { type: String },
    },
    licenseNumber: { type: String, required: true },

    // Ratings
    rating: { type: Number, default: 5 },
    totalRatings: { type: Number, default: 0 },

    totalRides: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },

    isAvailable: { type: Boolean, default: true },
    location: {
      lat: Number,
      lng: Number,
    },

    // 💰 Wallet
    walletBalance: { type: Number, default: 0 },

    // 📅 Subscription
    subscription: {
      isActive: { type: Boolean, default: false },
      plan: {
        name: { type: String },
        durationDays: { type: Number },
        price: { type: Number },
      },
      startedAt: { type: Date },
      expiresAt: { type: Date },
    },

    // optional reviews list
    reviews: { type: [reviewSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);
