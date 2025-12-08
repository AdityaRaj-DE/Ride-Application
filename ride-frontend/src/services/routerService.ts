import axios from "axios";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export async function getRoute(start: any, end: any) {
  if (!start || !end) return null;

  const url = `${OSRM_BASE}/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full`;

  const res = await axios.get(url);
  const route = res.data.routes[0];

  return {
    geometry: route.geometry.coordinates.map((c: any) => [c[1], c[0]]), // [lat,lng]
    durationMin: Math.round(route.duration / 60),
    distanceKm: (route.distance / 1000).toFixed(2),
  };
}
