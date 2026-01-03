import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { useMapEvents } from "react-leaflet";

function CenterWatcher({ onCenter }) {
  useMapEvents({
    move: (e) => {
      const m = e.target;
      const c = m.getCenter();
      onCenter && onCenter({ lat: c.lat, lng: c.lng });
    }
  });
  return null;
}

const driverIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/147/147144.png",
  iconSize: [45, 45],
});

const pickupIcon = L.icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [40, 40],
});

const destinationIcon = L.icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [40, 40],
});


function Recenter({ target }: any) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.setView([target.lat, target.lng], 16, { animate: true });
    }
  }, [target]);
  return null;
}

function CenterPin({ mode, onConfirm, mapMode }: any) {
  const map = useMap();

  if (!mode) return null;

  const handleConfirm = () => {
    const c = map.getCenter();
    onConfirm({ lat: c.lat, lng: c.lng });
  };

  return (
    <>
      {/* Center pin (not draggable) */}
      <div
        className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-full text-3xl"
        style={{ pointerEvents: "none" }}
      >
        <img src={mapMode === "pickup"
       ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
       : "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }
    width={40}
  />
      </div>

      {/* Confirm button */}
      {/* <button
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000] bg-black text-white px-4 py-2 rounded-full shadow-xl border border-white/20"
        onClick={handleConfirm}
      >
        {mode === "pickup" ? "Select Pickup" : "Select Destination"}
      </button> */}
    </>
  );
}

export default function RideMap({
  pickup,
  destination,
  driverLocation,
  route,
  mapMode,
  onCenter,              // "pickup" | "destination" | null
  onPickupConfirm,
  onDestinationConfirm,
  
}: any) {
  const fallback = pickup || driverLocation || { lat: 26.9, lng: 75.8 };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[fallback.lat, fallback.lng]}
        zoom={15}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" />

        <Recenter target={pickup} />
        <CenterWatcher onCenter={onCenter} />

        {/* Center Pin for selection */}
        <CenterPin
          mode={mapMode}
          onConfirm={(loc: any) => {
            if (mapMode === "pickup") onPickupConfirm(loc);
            if (mapMode === "destination") onDestinationConfirm(loc);
          }}
        />

        {pickup && status !== "COMPLETED" && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        )}

        {destination && status !== "COMPLETED" && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
        )}

        {driverLocation && status !== "COMPLETED" && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon} />
        )}

        {route?.length > 0 && status !== "COMPLETED" && (
          <Polyline
            positions={route.map((p: any) => [p.lat, p.lng])}
            weight={5}
            opacity={0.9}
          />
        )}
      </MapContainer>
    </div>
  );
}
