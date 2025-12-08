import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Icons
const driverIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/147/147144.png",
  iconSize: [45, 45],
});

const pickupIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
});

const destinationIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854894.png",
  iconSize: [40, 40],
});

// Smooth follow
const Recenter = ({ lat, lng }: any) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], map.getZoom(), { duration: 1 });
    }
  }, [lat, lng]);
  return null;
};

export default function RideMap({
  pickup,
  destination,
  driverLocation,
  route = [],
}: any) {
  const fallback = pickup || driverLocation || { lat: 26.9, lng: 75.8 };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[fallback.lat, fallback.lng]}
        zoom={15}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" />

        {/* Polyline → pure OSRM route passed from dashboard */}
        {route.length > 1 && (
          <Polyline
            positions={route.map((p: any) => [p.lat, p.lng])}
            weight={5}
            opacity={0.9}
          />
        )}

        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
        )}

        {driverLocation && (
          <>
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon} />
            <Recenter lat={driverLocation.lat} lng={driverLocation.lng} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
