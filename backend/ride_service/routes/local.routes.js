const express = require("express");
const router = express.Router();
const { simulateRoute, findLocationByName, locations } = require("../local/maps.service");
const { getRoute, calculateFare } = require("../services/fare.service");

// ✅ Get list of test city map locations
router.get("/locations", (req, res) => {
  res.json({
    message: "Kanpur test locations",
    data: locations
  });
});

// ✅ Estimate fare, distance, ETA between pickup & destination
router.post("/estimate", async (req, res) => {
  try {
    const { pickup, destination } = req.body;
    if (!pickup || !destination)
      return res.status(400).json({ error: "pickup and destination required" });

    const {
      distanceKm,
      durationMin,
      geometry,
      legs
    } = await getRoute(pickup, destination);

    const fare = calculateFare(distanceKm, durationMin);

    res.json({
      distanceKm,
      durationMin,
      fare,
      route: geometry, // <-- for map polyline
      steps: legs[0]?.steps || [] // <-- navigation instructions
    });

  } catch (err) {
    console.error("Estimate OSRM error:", err.message);
    res.status(500).json({ error: "Route estimation failed" });
  }
});


module.exports = router;
