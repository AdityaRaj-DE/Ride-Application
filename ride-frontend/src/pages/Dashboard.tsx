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
// near other imports
import useRideCall from "../hooks/useRideCall";
import CallModal from "../components/CallModal";

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

  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    if (!user?._id) return;
    const s = getSocket(user._id);
    setSocket(s);

    s.on("connect", () => {
      s.emit("join", { type: "rider", id: user._id });
    });
  }, [user?._id]);

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
  const [tempCenter, setTempCenter] = useState<any>(null);


  useEffect(() => {
    if (!user?._id || !socket) return;

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
      console.log("RIDE_ACCEPTED_PAYLOAD_RIDER", payload);
    });

    socket.on("ride_started", () => dispatch(rideStarted()));

    socket.on("ride_completed", (payload) => {
      console.log("SOCKET ride_completed RECEIVED", payload);
      dispatch(rideCompleted());

      setFeedbackRideId(payload?.rideId || payload?._id || null);
      setShowFeedbackModal(true);
      setRoute([]); // immediately clear route
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
  }, [user?._id, socket]);

  const {
    pickup,
    destination,
    status: rideStatus,
    currentRide,
    driver,
    otp,
  } = useSelector((state: RootState) => state.ride);

  const rideReady = pickup && destination;

  const rideId = currentRide?.rideId ?? null; // unified id
  const {
    startCall,
    hangup,
    acceptIncoming,
    rejectIncoming,
    toggleMute,
    state: callState,
    timer,
  } = useRideCall(socket, rideId);

  // ===== CALLING STATE (RIDER) =====

  const [callModalOpen, setCallModalOpen] = useState(false);

  useEffect(() => {
    if (
      callState.incoming ||
      callState.ringing ||
      callState.inCall ||
      callState.connecting
    ) {
      setCallModalOpen(true);
    } else {
      setCallModalOpen(false);
    }
  }, [
    callState.incoming,
    callState.ringing,
    callState.inCall,
    callState.connecting,
  ]);

  const handleCallIconClick = async () => {
    if (!rideId) return;

    // If there is already some call state, just bring the modal up
    if (
      callState.inCall ||
      callState.ringing ||
      callState.connecting ||
      callState.incoming
    ) {
      setCallModalOpen(true);
      return;
    }

    try {
      await startCall({
        callerId: user._id,
        callerName: user.fullname.firstname,
      });
      // modal will open automatically via callState effect
    } catch (err) {
      console.error(err);
      alert("Could not start call. Check microphone permission.");
    }
  };

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
    const rideId = currentRide?.rideId;
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

  const confirmPickup = () => {
    if (!tempCenter) return;
    dispatch(setPickup(tempCenter));
    setMapMode(null);
  };
  
  const confirmDestination = () => {
    if (!tempCenter) return;
    dispatch(setDestination(tempCenter));
    setMapMode(null);
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
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
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
  // ACTIVE RIDE UI (Accepted / Started / Requested)
  // ============================================================
  if (
    currentRide &&
    ["ACCEPTED", "STARTED", "REQUESTED", "COMPLETED"].includes(rideStatus)
  ) {
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
            onCenter={(c)=>setTempCenter(c)}
            mapMode={mapMode}
            onPickupConfirm={(loc) => {
              dispatch(setPickup(loc));
              setMapMode(null);
            }}
            onDestinationConfirm={(loc) => {
              dispatch(setDestination(loc));
              setMapMode(null);
            }}
          />
        </div>

        {/* TOP BAR */}
        <div className="absolute top-4 left-0 right-0 px-4 flex items-center justify-between z-20">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-full bg-black/70 border border-white/15 px-3 py-2 text-xs font-medium flex items-center gap-2 backdrop-blur"
          >
            <span className="inline-block w-4 h-[1.5px] bg-white" />
            <span className="inline-block w-4 h-[1.5px] bg-white/80" />
            <span className="inline-block w-3 h-[1.5px] bg-white/60" />
          </button>


        </div>

        {/* OTP + STATUS */}


        {/* INLINE STATUS */}
        <div className="absolute top-16 left-0 right-0 px-4 z-10">


          {/* {isDriverNear && (
            <p className="text-[11px] mt-2 bg-emerald-900/20 border border-emerald-600/40 px-3 py-2 rounded-xl">
              Your driver is arriving. Keep OTP ready.
            </p>
          )} */}
        </div>

        {/* BOTTOM PANEL */}
        <motion.div
          initial={{ y: 150 }}
          animate={{ y: 0 }}
          className="absolute bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 rounded-t-3xl p-5 shadow-xl"
        >
          <div className="bg-black/70 border border-white/10 rounded-full px-3 py-2 flex justify-between items-center">
            <span className="text-[12px]">
              {rideStatus === "REQUESTED" && "Looking for driver..."}
              {rideStatus === "ACCEPTED" && "Driver assigned"}
              {rideStatus === "STARTED" && "On the way"}
              {rideStatus === "COMPLETED" && "Ride completed"}
            </span>

            {etaMin && (
              <span className="text-[12px] text-neutral-300">
                ~{etaMin} min • {(distanceKm || 0).toFixed(1)} km
              </span>
            )}
          </div>
          {driver && (
            <div className="mb-4 bg-black/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-sm font-semibold">
                  {driver.name?.[0]?.toUpperCase() || "D"}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold">
                      {driver.name || "Driver"}
                    </p>
                    <div className="px-3 py-1 bg-white/5 rounded-xl border border-white/10 text-[10px] whitespace-nowrap">
                      {driver.vehicle.plate || "DL1234"}
                    </div>
                    {driver.rating && (
                      <div className="flex items-center gap-1 text-[11px] text-yellow-400">
                        <span>★</span>
                        <span>{driver.rating.toFixed(1)}</span>
                      </div>
                    )}

                  </div>

                  {/* {driver.phone && (
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {driver.phone}
                    </p>
                  )} */}

                </div>




              </div>


              <p className="text-xs text-neutral-400">
                {driver.vehicle.model || "Car"}
                {` • ${driver.vehicle.color || "Black"}`
                }
              </p>


              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-neutral-400 flex-1">
                  Contact your driver for pickup coordination if needed.
                </p>
                <button
                  onClick={handleCallIconClick}
                  className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-md active:scale-95 transition"
                  aria-label="Call driver"
                >
                  {/* simple phone icon (no external deps) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.37 1.77.72 2.6a2 2 0 0 1-.45 2.11L8.1 9.67a16 16 0 0 0 6 6l1.24-1.23a2 2 0 0 1 2.11-.45c.83.35 1.7.6 2.6.72A2 2 0 0 1 22 16.92Z" />
                  </svg>
                </button>
              </div>

              {/* OTP in bottom card */}
              {rideStatus === "ACCEPTED" && otp && (
                <div className="mt-4 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-center shadow-inner">
                  <p className="text-[10px] text-neutral-400">OTP</p>
                  <p className="text-2xl font-mono tracking-[0.25em]">
                    {otp}
                  </p>
                </div>
              )}
            </div>
          )}


          {["REQUESTED", "ACCEPTED", "STARTED"].includes(rideStatus) && (
            <button
              onClick={handleCancelRide}
              className="w-full py-3 bg-neutral-900 border border-white/10 rounded-2xl text-sm"
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

        {/* CALL MODAL */}
        <CallModal
          open={callModalOpen}
          state={callState}
          timerSec={timer.timerSec}
          roleLabel="Driver"
          onAccept={async () => {
            try {
              await acceptIncoming();
            } catch (err) {
              console.error(err);
              alert("Failed to accept call");
            }
          }}
          onReject={() => {
            rejectIncoming();
          }}
          onHangup={() => {
            hangup();
          }}
          onToggleMute={() => {
            toggleMute();
          }}
        />
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
      isRideOptionsOpen={isRideOptionsOpen}
      setIsRideOptionsOpen={setIsRideOptionsOpen}
      handleRequestRide={handleRequestRide}
      user={user}
      dispatch={dispatch}
      navigate={navigate}
      mapMode={mapMode}
      rideStatus={rideStatus}
      confirmPickup={confirmPickup}
    confirmDestination={confirmDestination}
    setTempCenter={setTempCenter} 
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
  isRideOptionsOpen,
  setIsRideOptionsOpen,
  handleEstimate,
  handleRequestRide,
  setPickup,
  setDestination,
  mapMode,
  dispatch,
  rideStatus,
  estimating,
  confirmDestination,
  confirmPickup,
  setTempCenter, 
}) {
  const askLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => alert("Failed to get location")
    );
  };

  const hasBothLocations = !!pickup && !!destination;

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
          onCenter={(c)=>setTempCenter(c)}
          onPickupConfirm={(loc) => {
            dispatch(setPickup(loc));
            setMapMode(null);
          }}
          onDestinationConfirm={(loc) => {
            dispatch(setDestination(loc));
            setMapMode(null);
          }}
        />
      </div>

      {/* HEADER */}
      <div className="absolute top-4 left-0 right-0 px-4 pb-2 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-full bg-black/70 border border-white/15 px-3 py-2 text-xs font-medium flex items-center gap-2 backdrop-blur"
          >
            <span className="inline-block w-4 h-[1.5px] bg-white" />
            <span className="inline-block w-4 h-[1.5px] bg-white/80" />
            <span className="inline-block w-3 h-[1.5px] bg-white/60" />
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
                  ? `${destination.lat.toFixed(3)}, ${destination.lng.toFixed(
                    3
                  )}`
                  : "Tap on map to select"}
              </p>
            </div>
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

      {/* Estimate pill above bottom */}
      {estimate && (
        <div className="absolute left-0 right-0 bottom-28 px-4 z-10">
          <div className="bg-black/80 border border-white/10 rounded-xl p-3 flex justify-between text-xs">
            <div>
              <p className="text-neutral-400">Distance</p>
              <p>{estimate.distanceKm.toFixed(1)} km</p>
              <p className="text-neutral-400 mt-1">ETA</p>
              <p>{estimate.durationMin} mins</p>
            </div>
            <div className="text-right">
              <p className="text-neutral-400">Fare</p>
              <p className="text-lg font-semibold">₹{estimate.fare}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom primary action (always present, like Uber) */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 px-4 py-4">
      {!pickup && mapMode !== "pickup" && (
          <button
            onClick={() => setMapMode("pickup")}
            className="w-full py-3 bg-neutral-900 border border-white/10 rounded-full text-sm"
          >
            Select Pickup
          </button>
        )}

{mapMode === "pickup" && (
    <button className="w-full py-3 bg-neutral-900 border border-white/10 rounded-full text-sm" onClick={confirmPickup}>Confirm Pickup</button>
  )}

        {pickup && !destination && mapMode !== "destination" &&  (
          <button
            onClick={() => setMapMode("destination")}
            className="w-full py-3 bg-neutral-900 border border-white/10 rounded-full text-sm"
          >
            Select Destination
          </button>
        )}

{mapMode === "destination" && (
    <button className="w-full py-3 bg-neutral-900 border border-white/10 rounded-full text-sm" onClick={confirmDestination}>Confirm Destination</button>
  )}

        {pickup && destination && (
          <button
            onClick={() => {
              if (!estimate) {
                handleEstimate();
              }
              setIsRideOptionsOpen(true);
            }}
            disabled={estimating}
            className="w-full py-3 bg-neutral-900 border border-white/10 rounded-full text-sm disabled:opacity-60"
          >
            {estimating ? "Calculating fare..." : "Book Ride"}
          </button>
        )}
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        close={() => setIsSidebarOpen(false)}
        user={user}
        navigate={navigate}
        dispatch={dispatch}
      />

      {/* Ride options */}
      {isRideOptionsOpen && hasBothLocations && (
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
              Standard Ride — ₹{estimate?.fare ?? "—"}
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
      <div className="w-64 h-full bg-black/95 border-r border-white/10 backdrop-blur-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-neutral-500">Rider</p>
            <p className="font-semibold text-sm">
              {user.fullname.firstname}
            </p>
          </div>
          <button className="text-xs text-neutral-400" onClick={close}>
            ✕
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <button
            onClick={() => {
              close();
              navigate("/profile");
            }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5"
          >
            Profile
          </button>
          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5">
            Ride History
          </button>
          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5">
            Settings
          </button>
          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5">
            Help &amp; Support
          </button>
        </div>

        <div className="mt-auto pt-4 border-t border-white/10">
          <button
            onClick={() => dispatch(logout())}
            className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg.white/10 text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 h-full bg-black/40" onClick={close} />
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
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur">
      <div className="bg-black/90 border border-white/10 rounded-2xl p-4 w-full max-w-sm space-y-3 shadow-[0_18px_40px_rgba(0,0,0,0.95)]">
        <h2 className="text-lg font-semibold">Rate your Driver</h2>
        <p className="text-xs text-neutral-400">
          Your feedback keeps the platform safe. You can skip, we'll auto rate
          4★.
        </p>

        {/* STAR + EMOJI */}
        <div className="flex flex-col items-center gap-2">

          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                className={`text-2xl ${rating >= s ? "text-yellow-400" : "text-gray-600"}`}
              >
                ★
              </button>
            ))}
          </div>

          {/* Emoji meaning */}
          {rating && (
            <p className="text-xl mt-1">
              {{
                1: "😡 Terrible",
                2: "☹️ Poor",
                3: "😐 Okay",
                4: "🙂 Good",
                5: "🤩 Excellent!"
              }[rating]}
            </p>
          )}

        </div>


        <textarea
          className="w-full border border-white/15 bg-black/70 rounded-xl p-2 text-sm text-white placeholder:text-neutral-500"
          rows={3}
          placeholder="Optional feedback"
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => submit(4, "")}
            className="text-sm px-3 py-1 rounded-xl border border-white/20 text-neutral-200 hover:bg-white/5"
          >
            Skip (auto 4★)
          </button>
          <button
            onClick={() => submit(rating || 4, review)}
            disabled={loading}
            className="text-sm px-3 py-1 rounded-xl bg-neutral-900 text-white border border-white/10 hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
