const { getDistanceKm, estimateETA } = require("./geo.util");
const locations = require("./kanpurLocations.json");
const { calculateFare } = require("../services/fare.service");

// Find location object by name
function findLocationByName(name) {
  return locations.find(
    (loc) => loc.name.toLowerCase() === name.toLowerCase()
  );
}

// Simulate route between pickup and destination
function simulateRoute(pickup, destination) {
  const distanceKm = getDistanceKm(
    pickup.lat,
    pickup.lng,
    destination.lat,
    destination.lng
  );

  const durationMin = estimateETA(distanceKm);
  const fare = calculateFare(distanceKm, durationMin);

  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    durationMin,
    fare,
    pickup,
    destination
  };
}

module.exports = {
  simulateRoute,
  findLocationByName,
  locations
};
