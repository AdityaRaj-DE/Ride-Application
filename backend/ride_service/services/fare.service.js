const axios = require("axios");

// Main routing logic using OSRM public API
async function getRoute(pickup, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&steps=true&geometries=geojson`;

  const res = await axios.get(url);

  if (!res.data.routes || res.data.routes.length === 0) {
    throw new Error("No route found");
  }

  const route = res.data.routes[0];

  return {
    distanceKm: route.distance / 1000,
    durationMin: Math.round(route.duration / 60),

    // GeoJSON → Leaflet friendly
    geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),

    // Turn steps
    legs: route.legs.map(leg => ({
      steps: leg.steps.map(step => ({
        instruction: step.maneuver.instruction,
        name: step.name,
        distance: step.distance,
        duration: step.duration,
        maneuver: step.maneuver.type,
        location: {
          lat: step.maneuver.location[1],
          lng: step.maneuver.location[0]
        }
      }))
    }))
  };
}

// Dynamic fare model
function calculateFare(distanceKm, durationMin) {
  const base = 25;
  const perKm = 7;
  const perMin = 1;
  return Math.round(base + distanceKm * perKm + durationMin * perMin);
}

module.exports = { getRoute, calculateFare };
