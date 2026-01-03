// controllers/ride.controller.js
const axios = require("axios");
const Ride = require("../models/ride");
const { getRoute, calculateFare } = require("../services/fare.service");

const DRIVER_SERVICE_URL =
  process.env.DRIVER_SERVICE_URL || "http://localhost:3003";
const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:3005";
// Create ride request (HTTP)
exports.rideRequest = async (req, res) => {
  try {
    const riderId = req.user.id;

    if (!riderId) return res.status(401).json({ error: "Unauthorized rider" });

    const { pickup, destination } = req.body;
    if (!riderId || !pickup || !destination)
      return res.status(400).json({ error: "Missing required fields" });

    // route + fare
    const { distanceKm, durationMin } = await getRoute(pickup, destination);
    const fare = calculateFare(distanceKm, durationMin);

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const ride = await Ride.create({
      riderId,
      pickup: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
      destination: {
        type: "Point",
        coordinates: [destination.lng, destination.lat],
      },
      distanceKm,
      durationMin,
      fare,
      otp,
      status: "REQUESTED",
    });

    // Try get nearby drivers (best effort)
    let nearbyDrivers = [];
    try {
      const { data } = await axios.get(
        `${DRIVER_SERVICE_URL}/drivers/nearby?lat=${pickup.lat}&lng=${pickup.lng}`
      );
      nearbyDrivers = data;
    } catch (err) {
      console.warn("Nearby driver lookup failed:", err.message);
    }

    // broadcast to drivers via socket
    const io = req.app.get("io");
    if (io) {
      io.to("drivers").emit("ride_broadcast", {
        rideId: ride._id,
        pickup,
        destination,
        distanceKm,
        durationMin,
        fare,
        nearbyDrivers,
      });
    }

    res.status(201).json({
      rideId: ride._id,
      distanceKm,
      durationMin,
      fare,
      otp,
      message: "Ride broadcasted to nearby drivers",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Driver accepts via HTTP
exports.rideAccept = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { rideId } = req.params;

    if (!driverId) return res.status(400).json({ error: "driverId required" });

    // Rider is stored in same DB → populate rider only
    const ride = await Ride.findById(rideId)
      .populate("riderId", "fullname phone");

    if (!ride) return res.status(404).json({ error: "Ride not found" });

    if (ride.status !== "REQUESTED") {
      return res.status(400).json({
        error: "Ride already taken or not requestable",
      });
    }

    // subscription check
    try {
      const { data } = await axios.get(
        `${DRIVER_SERVICE_URL}/drivers/subscription-status/${driverId}`
      );

      if (!data.isActive) {
        return res.status(403).json({
          error: "Driver subscription inactive. Cannot accept rides.",
        });
      }
    } catch (err) {
      console.warn("Subscription status check failed:", err.message);
      return res
        .status(500)
        .json({ error: "Failed to verify subscription status" });
    }

    // update ride
    ride.driverId = driverId;
    ride.status = "ACCEPTED";
    await ride.save();

    // mark driver busy
    try {
      await axios.patch(
        `${DRIVER_SERVICE_URL}/drivers/${driverId}/status`,
        { isAvailable: false },
        { headers: { Authorization: req.headers.authorization } }
      );
    } catch (err) {
      console.warn("Could not mark driver busy:", err.message);
    }

    // fetch full driver profile from DRIVER SERVICE (this has correct fields)
    let driverProfile = null;
    try {
      const { data } = await axios.get(
        `${DRIVER_SERVICE_URL}/drivers/by-user/${driverId}`
      );
      driverProfile = data;
    } catch (err) {
      console.warn("Driver fetch failed:", err.message);
    }

    const io = req.app.get("io");

    const driverSafe = driverProfile
      ? {
          id: driverProfile._id,
          userId: driverProfile.userId,
          name: `${driverProfile.fullname?.firstname || ""} ${
            driverProfile.fullname?.lastname || ""
          }`.trim(),
          phone: driverProfile.mobileNumber,
          vehicle: {
            model: driverProfile.vehicleInfo?.model || "",
            plate: driverProfile.vehicleInfo?.plateNumber || "",
            color: driverProfile.vehicleInfo?.color || "",
          },
          rating: driverProfile.rating,
        }
      : null;

    const riderSafe = ride.riderId
      ? {
          id: ride.riderId._id,
          name: ride.riderId.fullname?.firstname,
          phone: ride.riderId.phone,
        }
      : null;

    // send to rider (they need driver)
    const riderPayload = {
      rideId: ride._id,
      pickup: ride.pickup,
      destination: ride.destination,
      fare: ride.fare,
      status: "ACCEPTED",
      driver: driverSafe,
    };

    // send to driver (they need rider)
    const driverPayload = {
      rideId: ride._id,
      pickup: ride.pickup,
      destination: ride.destination,
      fare: ride.fare,
      status: "ACCEPTED",
      rider: riderSafe,
    };

    if (io) {
      io.to(`rider_${ride.riderId.toString()}`).emit("ride_accepted", riderPayload);
      io.to(`driver_${driverId}`).emit("ride_accepted", driverPayload);
    }

    res.json({ success: true, rideId: ride._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};





// Start ride (driver confirms pickup)
exports.rideStart = async (req, res) => {
  try {
    const driverId = req.user.id; // 🔥 always from token

    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    console.log(ride.driverId, " ", driverId);
    if (ride.driverId.toString() !== driverId.toString())
      return res.status(403).json({ error: "Not driver of this ride" });
    if (ride.status !== "ACCEPTED")
      return res.status(400).json({ error: "Ride not in accepted state" });

    const driverLocation = req.body?.driverLocation;
    if (!driverLocation) {
      return res.status(400).json({ error: "Driver location required" });
    }

    // Calculate distance between driver and pickup
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371e3; // meters
    const dLat = toRad(driverLocation.lat - ride.pickup.coordinates[1]);
    const dLng = toRad(driverLocation.lng - ride.pickup.coordinates[0]);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(ride.pickup.coordinates[1])) *
        Math.cos(toRad(driverLocation.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // if (distance > 50) {
    //   return res.status(400).json({
    //     error: "Driver not at pickup location",
    //     distance,
    //   });
    // }

    const { otp } = req.body;
    if (!otp || otp !== ride.otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    ride.otpVerified = true;

    ride.status = "STARTED";
    ride.startedAt = new Date();
    await ride.save();

    const io = req.app.get("io");
    if (io) io.to(`rider_${ride.riderId}`).emit("ride_started", { rideId });

    res.json({ success: true, message: "Ride started" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Complete ride (HTTP)
exports.rideComplete = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.status !== "STARTED") {
      return res.status(400).json({ error: "Ride not in progress" });
    }
    const { distanceMeters, durationSec } = req.body || {};

    const meters = distanceMeters || ride.distanceKm * 1000 || 2000; // fallback values
    const seconds = durationSec || ride.durationMin * 60 || 600; // fallback values

    // Use dummy distance if not provided
    const distanceKm = meters / 1000;
    const durationMin = seconds / 60;

    // Calculate fare
    const fare = calculateFare(distanceKm, durationMin);
    ride.distanceKm = distanceKm;
    ride.durationMin = durationMin;
    ride.fare = fare;
    ride.status = "COMPLETED";
    ride.completedAt = new Date();
    await ride.save();

    // ✅ Mark driver as available again in Driver Service
    try {
      await axios.patch(
        `${DRIVER_SERVICE_URL}/drivers/${ride.driverId}/status`,
        {
          isAvailable: true,
        }
      );
    } catch (err) {
      console.warn("⚠️ Could not update driver availability:", err.message);
    }

    // ✅ Trigger Payment Service to simulate transaction
    try {
      const paymentResponse = await axios.post(
        `${PAYMENT_SERVICE_URL}/payments/create`,
        {
          rideId: ride._id,
          userId: ride.riderId,
          driverId: ride.driverId,
          amount: fare,
          paymentMethod: "WALLET",
        },
        {
          headers: { Authorization: req.headers.authorization || "" },
        }
      );

      console.log(
        "💳 Payment initiated:",
        paymentResponse.data.payment.transactionId
      );
    } catch (err) {
      console.warn("⚠️ Payment Service integration failed:", err.message);
    }

    // ✅ Notify client(s) via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("ride_completed", {
        rideId: ride._id,
        fare: ride.fare,
        distanceKm: ride.distanceKm,
        durationMin: ride.durationMin,
      });
    }

    res.json({
      success: true,
      message: "Ride completed and payment initiated successfully",
      data: {
        rideId: ride._id,
        distanceKm,
        durationMin,
        fare,
        status: ride.status,
      },
    });
  } catch (err) {
    console.error("❌ Ride completion error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Cancel ride (user/driver)
exports.rideCancel = async (req, res) => {
  try {
    const { by, reason } = req.body; // by: 'driver'|'rider'
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    if (ride.status === "COMPLETED" || ride.status === "CANCELLED")
      return res.status(400).json({ error: "Ride cannot be cancelled" });

    ride.status = "CANCELLED";
    ride.cancelledAt = new Date();
    ride.cancellationReason = reason || `Cancelled by ${by || "unknown"}`;
    await ride.save();

    // mark driver available if driver was assigned
    if (ride.driverId) {
      try {
        await axios.patch(
          `${DRIVER_SERVICE_URL}/drivers/${ride.driverId}/status`,
          { isAvailable: true }
        );
      } catch (err) {
        console.warn("Could not update driver availability:", err.message);
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`rider_${ride.riderId}`).emit("ride_cancelled", { rideId });
      if (ride.driverId)
        io.to(`driver_${ride.driverId}`).emit("ride_cancelled", { rideId });
    }

    res.json({ success: true, message: "Ride cancelled" });
  } catch (err) {
    console.error("rideCancel error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Fetch ride data
exports.rideData = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId).lean();
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    // attach driver info if present
    if (ride.driverId) {
      try {
        const { data } = await axios.get(
          `${DRIVER_SERVICE_URL}/drivers/${ride.driverId}`
        );
        ride.driver = data;
      } catch {
        ride.driver = { id: ride.driverId, name: "Driver unavailable" };
      }
    }

    const safeRide = { ...ride };
    delete safeRide.otp; // do not expose OTP to driver

    if (req.user.role === "user") {
      safeRide.otp = ride.otp; // only rider receives it
    }

    res.json(safeRide);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Ride history - user
exports.rideHistoryUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const rides = await Ride.find({ riderId: userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Ride history - driver
exports.rideHistoryDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const rides = await Ride.find({ driverId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Fare estimate endpoint (client may call before creating ride)
exports.estimateFare = (req, res) => {
  try {
    const { pickup, destination } = req.body;
    if (!pickup || !destination) {
      return res.status(400).json({ error: "pickup and destination required" });
    }

    // Simulated route + distance
    const { distanceKm, durationMin, route } = getDummyRoute(
      pickup,
      destination
    );

    const fare = calculateFare(distanceKm, durationMin);

    res.json({
      distanceKm,
      durationMin,
      fare,
      route, // 🚀 REQUIRED for map polyline
    });
  } catch (err) {
    console.error("Estimate error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get active ride for the logged-in rider
exports.activeRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role; // "user" or "driver"

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const query = {
      status: { $in: ["REQUESTED", "ACCEPTED", "STARTED"] }
    };

    if (role === "user") {
      query.riderId = userId;
    } else if (role === "driver") {
      query.driverId = userId;
    }

    const ride = await Ride.findOne(query).lean();

    return res.json(ride || null);
  } catch (err) {
    console.error("activeRide error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};


// Fetch active ride for logged in rider
// exports.getActiveRide = async (req, res) => {
//   try {
//     const riderId = req.user.id;

//     const ride = await Ride.findOne({
//       riderId,
//       status: { $in: ["REQUESTED", "ACCEPTED", "STARTED"] },
//     }).lean();

//     if (!ride) return res.json(null);

//     // attach driver info if assigned
//     if (ride.driverId) {
//       try {
//         const { data } = await axios.get(
//           `${DRIVER_SERVICE_URL}/drivers/${ride.driverId}`
//         );
//         ride.driver = data;
//       } catch {
//         ride.driver = { id: ride.driverId, unavailable: true };
//       }
//     }

//     // 👇 Only Rider should get OTP!
//     if (req.user.role !== "user") delete ride.otp;

//     return res.json(ride);
//   } catch (err) {
//     console.error("getActiveRide error:", err.message);
//     res.status(500).json({ error: "Server error" });
//   }
// };

exports.rateDriver = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, feedback } = req.body; // feedback = review text
    const riderId = req.user.id;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    if (ride.riderId.toString() !== riderId.toString())
      return res.status(403).json({ error: "Not allowed" });

    if (ride.status !== "COMPLETED")
      return res.status(400).json({ error: "Ride not completed yet" });

    if (ride.driverRating && ride.driverRating.rating)
      return res.status(400).json({ error: "Already rated" });

    // ✅ Store structured rating
    ride.driverRating = {
      rating,
      review: feedback || "",
    };
    await ride.save();

    // ✅ Update driver's aggregate rating in Driver Service (using auth userId)
    try {
      await axios.patch(
        `${DRIVER_SERVICE_URL}/drivers/${ride.driverId}/rating`,
        { rating } // 👈 body field is rating
      );
    } catch (err) {
      console.warn("Driver rating update failed", err.message);
    }

    res.json({ success: true, message: "Driver rated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.rateRider = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, feedback } = req.body;
    const driverId = req.user.id;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    if (ride.driverId?.toString() !== driverId.toString())
      return res.status(403).json({ error: "Not allowed" });

    if (ride.status !== "COMPLETED")
      return res.status(400).json({ error: "Ride not completed yet" });

    if (ride.riderRating && ride.riderRating.rating)
      return res.status(400).json({ error: "Already rated" });

    // ✅ Store structured rating
    ride.riderRating = {
      rating,
      review: feedback || "",
    };
    await ride.save();

    // ✅ Update rider's aggregate rating in Auth Service
    try {
      await axios.patch(
        `${process.env.AUTH_SERVICE_URL || "http://localhost:3001"}/users/${
          ride.riderId
        }/rating`,
        { rating }
      );
    } catch (err) {
      console.warn("User rating update failed", err.message);
    }

    res.json({ success: true, message: "Rider rated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
