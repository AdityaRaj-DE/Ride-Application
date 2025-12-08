const Ride = require("../models/ride");
const axios = require("axios");
const { getRoute, calculateFare } = require("./fare.service");

const DRIVER_SERVICE_URL =
  process.env.DRIVER_SERVICE_URL || "http://localhost:3003";

function setupSockets(io) {
  const rideRooms = new Map(); // rideId -> { riderId, driverId }

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    // 🔹 Join global or user-specific rooms
    socket.on("join", (data = {}) => {
      console.log("JOIN RECEIVED:", data);
    
      if (!data.type) return;
    
      if (data.type === "driver") {
        socket.join("drivers");
        socket.join(`driver_${data.id}`);
        console.log(`🚗 Driver ${data.id} joined`);
      }
      else if (data.type === "rider") {
        socket.join(`rider_${data.id}`);
        console.log(`🧍 Rider ${data.id} joined`);
      }
      else if (data.type === "driver-ride" && data.rideId) {
        socket.join(`ride_${data.rideId}`);
        console.log("🚕 driver joined ride room:", data.rideId);
      }
    });
    

    // 🔹 Rider creates ride request
    socket.on("rider_request_ride", async (payload) => {
      try {
        
        const { riderId, pickup, destination } = payload;
        if (!riderId || !pickup || !destination)
          return socket.emit("error", { message: "Invalid payload" });

        const { distanceKm, durationMin } = await getRoute(pickup, destination);

        const fare = calculateFare(distanceKm, durationMin);

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
          status: "REQUESTED",
        });

        let nearbyDrivers = [];
        try {
          const { data } = await axios.get(
            `${DRIVER_SERVICE_URL}/drivers/nearby?lat=${pickup.lat}&lng=${pickup.lng}`
          );
          nearbyDrivers = data;
        } catch (err) {
          console.warn("Nearby driver lookup failed:", err.message);
        }

        io.to("drivers").emit("ride_broadcast", {
          rideId: ride._id,
          riderId,
          pickup,
          destination,
          distanceKm,
          durationMin,
          fare,
          nearbyDrivers,
        });

        socket.emit("ride_created", {
          rideId: ride._id,
          fare,
          distanceKm,
          durationMin,
        });
      } catch (err) {
        console.error("rider_request_ride error:", err);
        socket.emit("error", { message: "Could not create ride" });
      }
    });

    // 🔹 Driver accepts ride
    // 🔹 Driver accepts ride
// 🔹 Driver accepts ride
socket.on("driver_accept_ride", async ({ driverId, rideId }) => {
  try {
    console.log("DRIVER_SERVICE_URL =", DRIVER_SERVICE_URL);
    console.log("Requesting profile for driverId", driverId);
    const ride = await Ride.findById(rideId);
    console.log("ride.status:", ride?.status);

    if (!ride || ride.status !== "REQUESTED") {
      console.log("i am here");
      return socket.emit("error", { message: "Ride unavailable" });
    }
    

    ride.driverId = driverId;
    ride.status = "ACCEPTED";
    await ride.save();

    // attach mapping for this ride
    rideRooms.set(rideId, {
      riderId: ride.riderId.toString(),
      driverId: driverId.toString(),
    });
    socket.join(`ride_${rideId}`);
    // 🔹 fetch full driver profile from DRIVER SERVICE
    let driverProfile = null;
    console.log(driverProfile);
    try {
      const { data } = await axios.get(
        `${DRIVER_SERVICE_URL}/drivers/by-user/${driverId}`
      );
      
      driverProfile = data;
     
    } catch (e) {
      console.warn("Driver profile fetch failed:", e.message);
    }
    console.log(driverProfile);
    // 🔹 mark driver unavailable in driver service
    try {
      if (driverProfile?.userId) {
        await axios.patch(
          `${DRIVER_SERVICE_URL}/drivers/${driverProfile.userId}/status`,
          { isAvailable: false }
        );
      }
    } catch (err) {
      console.warn("Driver status update failed:", err.message);
    }

    const driverSafe = driverProfile
      ? {
          id: driverProfile._id,
          userId: driverProfile.userId,
          name: `${driverProfile.fullname?.firstname || ""} ${
            driverProfile.fullname?.lastname || ""
          }`.trim(),
          mobileNumber: driverProfile.mobileNumber,
          vehicle: {
            model: driverProfile.vehicleInfo?.model || "",
            plate: driverProfile.vehicleInfo?.plateNumber || "",
            color: driverProfile.vehicleInfo?.color || "",
          },
          rating: driverProfile.rating,
        }
      : null;

    const payload = {
      rideId: ride._id,
      status: ride.status,
      driverId,
      driver: driverSafe,
      pickup: ride.pickup,
      destination: ride.destination,
      fare: ride.fare,
      distanceKm: ride.distanceKm,
      durationMin: ride.durationMin,
    };

    console.log(
      "Emitting ride_accepted to rider_",
      ride.riderId.toString(),
      payload
    );

    // 🔹 Rider gets driver profile + ride data
    io.to(`rider_${ride.riderId.toString()}`).emit("ride_accepted", payload);

    // 🔹 Driver also gets the SAME event name and data
    socket.emit("ride_accepted", payload);   // ✅ FIX: matches driver frontend
  } catch (err) {
    console.error("driver_accept_ride:", err);
    socket.emit("error", { message: "Accept failed" });
  }
});


    
    

    // 🔹 Real-time driver location updates
    socket.on("driver_location_update", ({ rideId, driverId, lat, lng }) => {
      if (!rideId) return;

      // broadcast to rider in this ride
      io.to(`ride_${rideId}`).emit("driver_location_update", {
        driverId,
        lat,
        lng,
      });
    });

    // 🔹 Simulate movement (for testing)
    socket.on("simulate_driver_movement", ({ rideId, path }) => {
      console.log(`🧭 Simulating movement for ride ${rideId}`);
      let index = 0;
      const interval = setInterval(() => {
        if (index >= path.length) {
          clearInterval(interval);
          io.to(`ride_${rideId}`).emit("driver_reached_destination", {
            rideId,
          });
          return;
        }
        const loc = path[index++];
        io.to(`ride_${rideId}`).emit("driver_location_update", loc);
      }, 2000);
    });

    // 🔹 Ride started
    socket.on("ride_start", async ({ rideId, driverId }) => {
      const ride = await Ride.findById(rideId);
      if (!ride) return socket.emit("error", { message: "Ride not found" });
      ride.status = "STARTED";
      await ride.save();
      io.to(`ride_${rideId}`).emit("ride_started", { rideId });
    });

    // 🔹 Ride completed
    socket.on(
      "ride_complete",
      async ({ rideId, driverId, distanceMeters, durationSec }) => {
        try {
          const ride = await Ride.findById(rideId);
          if (!ride) return socket.emit("error", { message: "Ride not found" });

          const distanceKm = distanceMeters
            ? distanceMeters / 1000
            : ride.distanceKm;
          const durationMin = durationSec ? durationSec / 60 : ride.durationMin;

          const fare = calculateFare(distanceKm, durationMin);

          ride.distanceKm = distanceKm;
          ride.durationMin = durationMin;
          ride.fare = fare;
          ride.status = "COMPLETED";
          ride.completedAt = new Date();
          await ride.save();

          await axios.patch(
            `${DRIVER_SERVICE_URL}/drivers/${driverId}/status`,
            { isAvailable: true }
          );

          io.to(`ride_${rideId}`).emit("ride_completed", {
            rideId,
            fare,
            distanceKm,
            durationMin,
          });
        } catch (err) {
          console.error("ride_complete socket error:", err);
          socket.emit("error", { message: "Could not complete ride" });
        }
      }
    );

    socket.on("disconnect", () =>
      console.log("❌ Socket disconnected:", socket.id)
    );
  });

  return io;
}

module.exports = setupSockets;
