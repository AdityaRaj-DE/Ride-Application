import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store";
import { logout, fetchProfile } from "../store/authSlice";

import {
  fetchActiveRide,
  setPickup,
  setDestination,
  rideRequested,
  rideAccepted,
  rideStarted,
  rideCompleted,
  rideCancelled,
  clearRide,
} from "../store/rideSlice";

import { useEffect, useState } from "react";
import api from "../api/axios";
import type { LocationOption, RideEstimate } from "../utils/types";
import { getSocket } from "../sockets/socket";
import RideMap from "../components/RideMap";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ------------------------------------------------------------
// CLEAN, FINAL, FIXED DASHBOARD
// ------------------------------------------------------------

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();

  const { user, token, loading: profileLoading } = useSelector(
    (state: RootState) => state.auth
  );

  const {
    pickup,
    destination,
    status: rideStatus,
    currentRide,
    driver,
    otp,
  } = useSelector((state: RootState) => state.ride);

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [estimate, setEstimate] = useState<RideEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [rideRequestLoading, setRideRequestLoading] = useState(false);

  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [driverLocation, setDriverLocation] = useState<any>(null);

  const [feedbackRideId, setFeedbackRideId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [route, setRoute] = useState<any[]>([]);
  const [mapMode, setMapMode] = useState<null | "pickup" | "destination">(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRideOptionsOpen, setIsRideOptionsOpen] = useState(false);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [isDriverNear, setIsDriverNear] = useState(false);

  const rideReady = pickup && destination;

  // RESET BOOKING UI
  const resetBooking = () => {
    dispatch(clearRide());
    setEstimate(null);
    setStatusMsg("");
    setErrorMsg("");
    setDriverLocation(null);
    setRoute([]);
    setShowFeedbackModal(false);
    setFeedbackRideId(null);
  };

  // ------------------------------------------------------------
  // Initial data load
  // ------------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    dispatch(fetchProfile()).then(() => dispatch(fetchActiveRide()));
  }, [token]);

  // Fetch saved ride if page refreshed
  useEffect(() => {
    if (token && !user) dispatch(fetchProfile());
  }, [token, user]);

  // ------------------------------------------------------------
  // Load saved locations list
  // ------------------------------------------------------------
  useEffect(() => {
    api
      .get("/ride/local/locations")
      .then((res) => {
        setLocations(Array.isArray(res.data) ? res.data : res.data.data || []);
      })
      .catch(() => setLocations([]));
  }, []);

  // ------------------------------------------------------------
  // Socket handling — final cleaned version
  // ------------------------------------------------------------
  useEffect(() => {
    if (!user?._id) return;

    const socket = getSocket(user._id);

    socket.on("ride_accepted", (payload) => {
      dispatch(rideAccepted(payload));

      // pre-fill pickup/destination from payload
      if (payload.pickup?.coordinates) {
        dispatch(
          setPickup({
            lat: payload.pickup.coordinates[1],
            lng: payload.pickup.coordinates[0],
          })
        );
      }

      if (payload.destination?.coordinates) {
        dispatch(
          setDestination({
            lat: payload.destination.coordinates[1],
            lng: payload.destination.coordinates[0],
          })
        );
      }

      socket.emit("join", {
        type: "driver-ride",
        rideId: payload.rideId,
      });
    });

    socket.on("ride_started", () => dispatch(rideStarted()));

    socket.on("ride_completed", (payload) => {
      console.log("SOCKET ride_completed RECEIVED", payload);
      dispatch(rideCompleted());
      console.log("rideStatus after complete:", rideStatus);
      console.log("currentRide after complete:", currentRide);
      console.log("showFeedbackModal:", showFeedbackModal);
      console.log("feedbackRideId:", feedbackRideId);

      setFeedbackRideId(payload?.rideId || payload?._id || null);
      setShowFeedbackModal(true);
      setRoute([]);            // immediately clear route
      setDriverLocation(null); // remove driver marker
    });

    socket.on("ride_cancelled", () => {
      dispatch(rideCancelled());
      resetBooking();
    });

    socket.on("driver_location_update", (location) => {
      setDriverLocation(location);
    });

    return () => {
      socket.off("ride_accepted");
      socket.off("ride_started");
      socket.off("ride_completed");
      socket.off("ride_cancelled");
      socket.off("driver_location_update");
    };
  }, [user?._id]);

  // ------------------------------------------------------------
  // Driver distance + ETA update
  // ------------------------------------------------------------
  useEffect(() => {
    if (!driverLocation || !currentRide) return;

    const target =
      rideStatus === "ACCEPTED"
        ? pickup
        : rideStatus === "STARTED" && destination
          ? destination
          : null;

    if (!target) return;

    const dKm = calcDistance(
      driverLocation.lat,
      driverLocation.lng,
      target.lat,
      target.lng
    );

    setDistanceKm(dKm);
    setEtaMin(Math.max(1, Math.round((dKm / 25) * 60)));
    setIsDriverNear(dKm * 1000 <= 50 && rideStatus === "ACCEPTED");
  }, [driverLocation, currentRide, pickup, destination, rideStatus]);

  // ------------------------------------------------------------
  // Routing updates (driver moving)
  // ------------------------------------------------------------
  useEffect(() => {
    const getRoute = async () => {
      if (!pickup || !destination) return;

      // driver moving
      let start = pickup;
      let end = destination;

      if (rideStatus === "ACCEPTED" && driverLocation) {
        start = driverLocation;
        end = pickup;
      }

      if (rideStatus === "STARTED" && driverLocation) {
        start = driverLocation;
        end = destination;
      }

      const res = await api.post("/ride/local/estimate", {
        pickup: start,
        destination: end,
      });

      setRoute(res.data.route || []);
    };

    getRoute();
  }, [pickup, destination, driverLocation, rideStatus]);

  // ------------------------------------------------------------
  // Booking logic
  // ------------------------------------------------------------
  const handleEstimate = async () => {
    if (!pickup) return setErrorMsg("Please set pickup first.");
    if (!destination) return setErrorMsg("Please set destination.");

    setEstimating(true);
    try {
      const res = await api.post("/ride/local/estimate", {
        pickup,
        destination,
      });

      setEstimate({
        distanceKm: res.data.distanceKm ?? res.data.distance,
        durationMin: res.data.durationMin ?? res.data.etaMin,
        fare: res.data.fare ?? res.data.estimatedFare,
      });
    } catch {
      setErrorMsg("Failed to calculate estimate.");
    }
    setEstimating(false);
  };

  const handleRequestRide = async () => {
    if (!estimate || !pickup || !destination) return;

    setRideRequestLoading(true);
    try {
      const res = await api.post("/ride/rides/request", {
        riderId: user._id,
        pickup,
        destination,
        estimatedFare: estimate.fare,
      });

      dispatch(rideRequested(res.data));
      setStatusMsg("Ride requested. Waiting for driver...");
    } catch {
      setErrorMsg("Failed to request ride.");
    }
    setRideRequestLoading(false);
  };

  const handleCancelRide = async () => {
    const rideId = currentRide?._id;
    if (!rideId) return; // prevent undefined error

    try {
      await api.post(`/ride/rides/cancel/${rideId}`, {
        by: "rider",
        reason: "Rider cancelled the request",
      });

      dispatch(rideCancelled());
      resetBooking();
    } catch (err: any) {
      console.error("Cancel ride error:", err.response?.data || err.message);
    }
  };


  // ------------------------------------------------------------
  // Utility
  // ------------------------------------------------------------
  function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;

    return R * (2 * Math.asin(Math.sqrt(a)));
  }

  // ------------------------------------------------------------
  // Early loading screen
  // ------------------------------------------------------------
  if (profileLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm text-neutral-400">Loading profile...</p>
      </div>
    );
  }

  // ============================================================
  // ACTIVE RIDE UI (Accepted / Started)
  // ============================================================
  if (currentRide && ["ACCEPTED", "STARTED", "REQUESTED", "COMPLETED"].includes(rideStatus)) {
    return (
      <div className="relative w-full h-screen bg-black text-white overflow-hidden">

        {/* MAP */}
        <div className="absolute inset-0 z-0">
          <RideMap
            status={rideStatus}
            pickup={pickup}
            destination={destination}
            driverLocation={driverLocation}
            route={route}
            mapMode={mapMode}
            onPickupConfirm={(loc) => {
              dispatch(setPickup(loc))
              setMapMode(null)
            }}
            onDestinationConfirm={(loc) => {
              dispatch(setDestination(loc))
              setMapMode(null)
            }}
          />
        </div>

        {/* TOP BAR */}
        <div className="absolute top-4 left-0 right-0 px-4 flex items-center justify-between z-20">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-full bg-black/70 border border-white/15 px-3 py-2 text-xs backdrop-blur"
          >
            ☰
          </button>

          <button
            onClick={() => dispatch(logout())}
            className="px-3 py-1 text-xs bg-black/70 border border-white/20 rounded-full"
          >
            Logout
          </button>
        </div>

        {/* OTP + STATUS */}
        {rideStatus === "ACCEPTED" && otp && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-black/80 px-6 py-4 rounded-2xl border border-white/10 shadow-xl">
            <p className="text-xs text-neutral-400">OTP</p>
            <p className="text-3xl font-mono tracking-[0.3em]">{otp}</p>
          </div>
        )}

        {/* INLINE STATUS */}
        <div className="absolute bottom-40 left-0 right-0 px-4 z-10">
          <div className="bg-black/70 border border-white/10 rounded-full px-3 py-2 flex justify-between">
            <span className="text-[12px]">
              {rideStatus === "REQUESTED" && "Looking for driver..."}
              {rideStatus === "ACCEPTED" && "Driver assigned"}
              {rideStatus === "STARTED" && "On the way"}
            </span>

            {etaMin && (
              <span className="text-[12px] text-neutral-300">
                ~{etaMin} min • {(distanceKm || 0).toFixed(1)} km
              </span>
            )}
          </div>

          {isDriverNear && (
            <p className="text-[11px] mt-2 bg-emerald-900/20 border border-emerald-600/40 px-3 py-2 rounded-xl">
              Your driver is arriving. Keep OTP ready.
            </p>
          )}
        </div>

        {/* BOTTOM PANEL */}
        <motion.div
          initial={{ y: 150 }}
          animate={{ y: 0 }}
          className="absolute bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 rounded-t-3xl p-5 shadow-xl"
        >
          {driver && (
            <div className="mb-4 text-sm">
              <p className="font-semibold">{driver.name}</p>
              <p>{driver.phone}</p>
              <p className="text-neutral-400">{driver.vehicle?.plate}</p>
            </div>
          )}

          {["REQUESTED", "ACCEPTED", "STARTED"].includes(rideStatus) && (
            <button
              onClick={handleCancelRide}
              className="w-full py-3 bg-neutral-900 border border-white/10 rounded-2xl"
            >
              Cancel Ride
            </button>
          )}
        </motion.div>

        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          close={() => setIsSidebarOpen(false)}
          user={user}
          navigate={navigate}
          dispatch={dispatch}
        />

        {showFeedbackModal && feedbackRideId && (
          <FeedbackModal
            rideId={feedbackRideId}
            onClose={() => {
              setShowFeedbackModal(false);
              setFeedbackRideId(null);
              // After modal removed, THEN reset
              setTimeout(() => resetBooking(), 200);
            }}
          />
        )}
      </div>
    );
  }

  // ============================================================
  // BOOKING UI (No Active Ride)
  // ============================================================
  return (
    <BookingScreen
      pickup={pickup}
      destination={destination}
      estimate={estimate}
      setMapMode={setMapMode}
      setEstimate={setEstimate}
      errorMsg={errorMsg}
      statusMsg={statusMsg}
      driverLocation={driverLocation}
      route={route}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      handleEstimate={handleEstimate}
      setPickup={(loc) => dispatch(setPickup(loc))}
      setDestination={(loc) => dispatch(setDestination(loc))}
      rideReady={rideReady}
      isRideOptionsOpen={isRideOptionsOpen}
      setIsRideOptionsOpen={setIsRideOptionsOpen}
      handleRequestRide={handleRequestRide}
      user={user}
      dispatch={dispatch}
      navigate={navigate}
      mapMode={mapMode}
    />
  );
}

// ------------------------------------------------------------
// BOOKING SCREEN COMPONENT
// ------------------------------------------------------------
function BookingScreen({
  pickup,
  destination,
  estimate,
  setMapMode,
  setEstimate,
  errorMsg,
  statusMsg,
  setIsSidebarOpen,
  isSidebarOpen,
  driverLocation,
  route,
  user,
  navigate,
  rideReady,
  isRideOptionsOpen,
  setIsRideOptionsOpen,
  handleEstimate,
  handleRequestRide,
  setPickup,
  setDestination,
  mapMode,
  dispatch,
  rideStatus,
}) {
  const askLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => alert("Failed to get location")
    );
  };

  return (
    <div className="relative h-screen w-full bg-black text-white">

      {/* MAP */}
      <div className="absolute inset-0 z-0">
        <RideMap
          status={rideStatus}
          pickup={pickup}
          destination={destination}
          driverLocation={driverLocation}
          route={route}
          mapMode={mapMode}
          onPickupConfirm={(loc) => {
            dispatch(setPickup(loc))
            setMapMode(null)
          }}
          onDestinationConfirm={(loc) => {
            dispatch(setDestination(loc))
            setMapMode(null)
          }}

        />
      </div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-5 pb-2 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-full bg-black/70 border border-white/10 px-3 py-2 text-xs"
          >
            ☰
          </button>
          <div className="text-right">
            <p className="text-[10px] text-neutral-400">Hi</p>
            <p className="text-sm font-semibold">{user.fullname.firstname}</p>
          </div>
        </div>

        {/* INPUT CARD */}
        <div className="mt-4 bg-black/80 border border-white/10 rounded-2xl p-3 backdrop-blur-xl shadow-xl space-y-2">

          {/* Pickup */}
          <button
            onClick={askLocation}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl"
          >
            <span>📍</span>
            <div className="text-left flex-1">
              <p className="text-[11px] text-neutral-400">Pickup</p>
              <p className="text-xs">
                {pickup
                  ? `${pickup.lat.toFixed(3)}, ${pickup.lng.toFixed(3)}`
                  : "Use current location"}
              </p>
            </div>
          </button>

          <div className="h-[1px] bg-white/10" />

          {/* Destination */}
          <div
            className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl"
            onClick={() => setMapMode("destination")}
          >
            <span>🎯</span>
            <div className="text-left flex-1">
              <p className="text-[11px] text-neutral-400">Destination</p>
              <p className="text-xs">
                {destination
                  ? `${destination.lat.toFixed(3)}, ${destination.lng.toFixed(3)}`
                  : "Tap on map to select"}
              </p>
            </div>
          </div>

          {/* Buttons under card */}
          <div className="flex justify-between text-[11px] text-neutral-400 pt-1">
            <button onClick={() => setMapMode("pickup")}>
              Set pickup on map
            </button>
            <button onClick={() => setMapMode("destination")}>
              Set destination on map
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-[11px] text-red-400 bg-red-900/30 px-3 py-2 rounded-xl mt-2">
            {errorMsg}
          </p>
        )}

        {statusMsg && (
          <p className="text-[11px] text-neutral-300 bg-black/40 px-3 py-2 rounded-xl mt-1">
            {statusMsg}
          </p>
        )}
      </div>

      {/* Estimate */}
      {estimate && (
        <div className="absolute left-0 right-0 bottom-28 px-4 z-10">
          <div className="bg-black/80 border border-white/10 rounded-xl p-3 flex justify-between text-xs">
            <div>
              <p className="text-neutral-400">Distance</p>
              <p>{estimate.distanceKm.toFixed(1)} km</p>
              <p className="text-neutral-400">ETA</p>
              <p>{estimate.durationMin} mins</p>
            </div>
            <div className="text-right">
              <p className="text-neutral-400">Fare</p>
              <p className="text-lg font-semibold">₹{estimate.fare}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom */}
      {rideReady && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 px-4 py-4">
          {pickup && destination ? (
            <button
              onClick={() => {
                if (!estimate) handleEstimate();
                setIsRideOptionsOpen(true);
              }}
              className="w-full py-3 bg-neutral-900 border border-white/10 rounded-full text-sm"
            >
              Book Ride
            </button>
          ) : (
            <>
              {!pickup && (
                <button onClick={() => setMapMode("pickup")} className="w-full py-3 bg-neutral-900 border border-white/10 rounded-full text-sm">
                  Select Pickup
                </button>
              )}
              {pickup && !destination && (
                <button onClick={() => setMapMode("destination")} className="w-full py-3 bg-neutral-900 border border-white/10 rounded-full text-sm">
                  Select Destination
                </button>
              )}
            </>
          )}
        </div>
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        close={() => setIsSidebarOpen(false)}
        user={user}
        navigate={navigate}
      />

      {/* Ride options */}
      {isRideOptionsOpen && (
        <div className="fixed inset-0 flex flex-col justify-end z-40">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setIsRideOptionsOpen(false)}
          />

          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            className="bg-black/95 border-t border-white/10 rounded-t-3xl p-4"
          >
            <h3 className="text-sm font-semibold mb-3">Choose ride type</h3>

            <button
              onClick={handleRequestRide}
              className="w-full text-left px-3 py-3 rounded-xl bg-white/5 border border-white/10"
            >
              Standard Ride — ₹{estimate?.fare}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Sidebar Component
// ------------------------------------------------------------
function Sidebar({ isOpen, close, user, navigate, dispatch }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="w-64 bg-black/95 border-r border-white/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold">{user.fullname.firstname}</p>
          <button onClick={close}>✕</button>
        </div>

        <div className="space-y-2 text-sm">
          <button
            onClick={() => {
              close();
              navigate("/profile");
            }}
            className="w-full text-left px-3 py-2 bg-white/5 rounded-xl"
          >
            Profile
          </button>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => dispatch(logout())}
            className="w-full text-left px-3 py-2 bg-white/5 rounded-xl"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 bg-black/40" onClick={close} />
    </div>
  );
}

// ------------------------------------------------------------
// Feedback Modal Component
// ------------------------------------------------------------
function FeedbackModal({ rideId, onClose }) {
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (r, rev) => {
    try {
      setLoading(true);
      await api.post(`/ride/rides/${rideId}/rating/driver`, {
        rating: r,
        feedback: rev,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
      <div className="bg-black/90 border border-white/10 p-4 rounded-2xl w-full max-w-sm">
        <h2 className="text-lg font-semibold">Rate your Driver</h2>

        <div className="flex gap-1 my-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              className={`text-2xl ${rating >= s ? "text-yellow-400" : "text-gray-500"
                }`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          className="w-full bg-black/50 border border-white/20 rounded-xl p-2 text-sm"
          rows={3}
          placeholder="Optional feedback"
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => submit(4, "")} className="text-xs">
            Skip
          </button>
          <button
            onClick={() => submit(rating || 4, review)}
            disabled={loading}
            className="px-3 py-1 bg-neutral-900 border border-white/20 rounded-xl"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
