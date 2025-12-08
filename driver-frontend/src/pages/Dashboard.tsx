// pages/driver/Dashboard.tsx
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import {
  requestReceived,
  rideAccepted,
  rideStarted,
  rideCompleted,
} from "../store/slices/driverRideSlice";

import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import {
  driverLogout,
  fetchDriverProfile,
  driverLoginSuccess,
} from "../store/slices/driverAuthSlice";

import { connectSocket } from "../services/socket";
import { axiosInstance } from "../services/axiosInstance";
import { updateDriverLocation } from "../store/slices/driverLocationSlice";
import RideMap from "../components/RideMap";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { fetchWallet } from "../store/slices/driverWalletSlice";

import { fetchActiveDriverRide } from "../store/slices/driverRideSlice";


export default function Dashboard() {

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { driver } = useSelector((state: RootState) => state.driverAuth);
  const { lat, lng } = useSelector((state: RootState) => state.driverLocation);
  const driverLocation = lat && lng ? { lat, lng } : null;

  const { activeRide, pendingRequests, status } = useSelector(
    (state: RootState) => state.driverRide
  );

  const { subscription } = useSelector(
    (state: RootState) => state.driverWallet
  );
  const isSubscriptionActive = !!subscription?.isActive;

  const [enteredOTP, setEnteredOTP] = useState("");
  const [feedbackRideId, setFeedbackRideId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [isNearPickup, setIsNearPickup] = useState(false);
  const [route, setRoute] = useState<any[]>([]);

  const [locationUpdating, setLocationUpdating] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [steps, setSteps] = useState<any[]>([]);
  const [nextStepIndex, setNextStepIndex] = useState(0);
  const [nextInstruction, setNextInstruction] = useState<string | null>(null);

  // THIS ref is now the master socket
  const socketRef = useRef<any>(null);
  useEffect(() => {
    // dispatch(fetchDriverProfile());
    dispatch(fetchWallet());   // <--- add this
    dispatch(fetchActiveDriverRide());
  }, [driver?._id]);
  // --- 1: create socket once ---
  useEffect(() => {
    if (!driver?._id) return;

    const socket = connectSocket(driver._id);
    socketRef.current = socket;

    const onConnect = () => {
      console.log("connected, emitting join…");
      socket.emit("join", { type: "driver", id: driver.userId });
    };

    socket.on("connect", onConnect);

  }, [driver?._id]);




  // --- 2: join driver room after auth loaded ---


  // --- 3: GPS streaming only if online ---
  useEffect(() => {
    if (!driver?.isAvailable || !socketRef.current) return;

    setLocationUpdating(true);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        dispatch(updateDriverLocation({ lat: latitude, lng: longitude }));

        socketRef.current.emit("driver_location_update", {
          rideId: activeRide?.rideId,
          driverId: driver.userId,
          lat: latitude,
          lng: longitude,
        });
      },
      console.error,
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setLocationUpdating(false);
    };
  }, [driver?.isAvailable, activeRide?.rideId]);

  // --- 4: accept ride with room join ---
  const acceptRide = async (rideId: string) => {
    await axiosInstance.post(`/ride/rides/accept/${rideId}`);

    // always join ride room first
    socketRef.current?.emit("join", {
      type: "driver-ride",
      rideId,
    });

    // then notify backend of accept
    socketRef.current?.emit("driver_accept_ride", {
      driverId: driver.userId,
      rideId,
    });
  };


  // --- 5: subscribe to socket events once driver exists ---
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;

    socket.on("ride_broadcast", (ride) => {
      dispatch(requestReceived({
        rideId: ride.rideId,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        status: "REQUESTED",
      }));
    });

    socket.on("ride_accepted", (ride) => {
      dispatch(rideAccepted({
        rideId: ride.rideId,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        status: "ACCEPTED",
      }));
    });

    socket.on("ride_started", () => dispatch(rideStarted()));

    socket.on("ride_completed", (payload) => {
      dispatch(rideCompleted());
      
      setRoute([]);           // <--- clear polyline
      setDistanceKm(null);    // optional
      setEtaMin(null);
      if (payload?.rideId) {
        setFeedbackRideId(payload.rideId);
        setShowFeedbackModal(true);
      }
    });

    return () => {
      socket.off("ride_broadcast");
      socket.off("ride_accepted");
      socket.off("ride_started");
      socket.off("ride_completed");
    };
  }, []);

  useEffect(() => {
    if (!steps.length || !driverLocation) return;
    const idx = nextStepIndex;
    if (idx >= steps.length) return;
    const step = steps[idx];
    const maneuver = step.maneuver;
    const maneuverPos = { lat: maneuver.location[1], lng: maneuver.location[0], };
    const dKm = calcDistanceKm(driverLocation, maneuverPos);
    const dMeters = dKm * 1000;
    setNextInstruction(maneuver.instruction || "Continue straight");
    if (dMeters < 30) { setNextStepIndex(idx + 1); }
  }, [driverLocation, steps, nextStepIndex]);

  const updateRouteAndEta = async () => {
    if (!driverLocation || !activeRide) return;

    let target: { lat: number; lng: number } | null = null;

    if (status === "ACCEPTED" && activeRide.pickup?.coordinates) {
      target = {
        lat: activeRide.pickup.coordinates[1],
        lng: activeRide.pickup.coordinates[0],
      };
    } else if (status === "STARTED" && activeRide.destination?.coordinates) {
      target = {
        lat: activeRide.destination.coordinates[1],
        lng: activeRide.destination.coordinates[0],
      };
    }

    if (!target) return;

    try {
      const res = await axiosInstance.post("/ride/local/estimate", {
        pickup: driverLocation,
        destination: target,
      });

      const { distanceKm, durationMin, route } = res.data;
      setDistanceKm(distanceKm);
      setEtaMin(durationMin);
      setRoute(route || []);
      setSteps(steps || []);

      const dMeters = distanceKm * 1000;
      setIsNearPickup(status === "ACCEPTED" && dMeters <= 50);
    } catch (err: any) {
      console.error("OSRM route fetch failed", err.message);
    }
  };

  const debouncedUpdate = _.debounce(updateRouteAndEta, 300);

  useEffect(() => {
    debouncedUpdate();
    return () => debouncedUpdate.cancel();
  }, [driverLocation, status, activeRide]);

  function calcDistanceKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ) {
    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);

    const h =
      sinDLat * sinDLat +
      Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

    const c = 2 * Math.asin(Math.sqrt(h));
    return R * c;
  }

  function calcEtaMin(distanceKm: number, avgSpeedKmph = 25) {
    if (!distanceKm || distanceKm <= 0) return null;
    const minutes = (distanceKm / avgSpeedKmph) * 60;
    return Math.max(1, Math.round(minutes));
  }

  const toggleAvailability = async () => {
    if (!driver || !isSubscriptionActive) return;
    try {
      setAvailabilityLoading(true);

      const newState = !driver.isAvailable;

      const updatedDriver = { ...driver, isAvailable: newState };
      dispatch(
        driverLoginSuccess({
          token: localStorage.getItem("driverToken"),
          driver: updatedDriver,
        })
      );

      await axiosInstance.put("/driver/drivers/availability", {
        isAvailable: newState,
      });

      dispatch(fetchDriverProfile());
    } catch (err) {
      console.error("Availability update failed:", err);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const sendLocationToServer = async (lat: number, lng: number) => {
    try {
      await axiosInstance.put("/driver/drivers/location", { lat, lng });
    } catch (err) {
      console.error("Location update failed", err);
    }
  };

  const startRide = async (otp: string) => {
    if (!activeRide) return;
    try {
      const driverLocation = { lat, lng };  // from redux

      console.log("start using", activeRide);

      await axiosInstance.post(
        `/ride/rides/start/${activeRide.rideId}`,
        {
          otp,
          driverLocation,
        }
      );

      dispatch(rideStarted());
    } catch (err: any) {
      console.error("Start ride failed:", err.response?.data || err.message);
    }
  };

  const completeRide = async () => {
    if (!activeRide) return;
    try {
      await axiosInstance.post(
        `/ride/rides/complete/${activeRide.rideId}`
      );
      dispatch(rideCompleted());
      // alert("Ride Completed!");
      setRoute([]);               // <--- clear immediately
      setDistanceKm(null);
      setEtaMin(null);
    } catch (err) {
      console.error("Complete ride failed:", err);
    }
  };


  console.log("Redux Ride State =>", {
    status,
    activeRide,
    pendingRequests,
  });

  function DriverFeedbackModal({
    rideId,
    onClose,
  }: {
    rideId: string;
    onClose: () => void;
  }) {
    const [rating, setRating] = useState<number | null>(null);
    const [review, setReview] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitRating = async (
      finalRating: number,
      finalReview: string
    ) => {
      try {
        setSubmitting(true);
        setError(null);
        await axiosInstance.post(
          `/ride/rides/${rideId}/rating/rider`,
          {
            rating: finalRating,
            feedback: finalReview,
          }
        );
        onClose();
      } catch (err: any) {
        console.error(
          "Driver feedback submit failed",
          err.response?.data || err.message
        );
        setError(
          err.response?.data?.error ||
          "Failed to submit feedback"
        );
      } finally {
        setSubmitting(false);
      }
    };

    const handleSubmit = () => {
      if (!rating) {
        setError("Please select a rating or click Skip.");
        return;
      }
      submitRating(rating, review);
    };

    const handleSkip = () => {
      submitRating(4, "");
    };

    return (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur">
        <div className="bg-black/90 border border-white/10 rounded-2xl p-4 w-full max-w-sm space-y-3 shadow-[0_18px_40px_rgba(0,0,0,0.95)]">
          <h2 className="text-lg font-semibold">Rate your rider</h2>
          <p className="text-xs text-neutral-400">
            Your feedback keeps the platform safe. You can skip, we’ll auto rate 4★.
          </p>

          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`text-2xl ${rating && rating >= star
                  ? "text-yellow-400"
                  : "text-neutral-600"
                  }`}
                onClick={() => setRating(star)}
                disabled={submitting}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            className="w-full border border-white/15 bg-black/70 rounded-xl p-2 text-sm text-white placeholder:text-neutral-500"
            rows={3}
            placeholder="Describe the rider (optional)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            disabled={submitting}
          />

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="text-sm px-3 py-1 rounded-xl border border-white/20 text-neutral-200 hover:bg-white/5"
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip (auto 4★)
            </button>
            <button
              className="text-sm px-3 py-1 rounded-xl bg-neutral-900 text-white border border-white/10 hover:bg-neutral-800"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- UI ----------

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0 z-0">
        <RideMap
          pickup={
            activeRide?.pickup?.coordinates
              ? {
                lat: activeRide.pickup.coordinates[1],
                lng: activeRide.pickup.coordinates[0],
              }
              : null
          }
          destination={
            activeRide?.destination?.coordinates
              ? {
                lat: activeRide.destination.coordinates[1],
                lng: activeRide.destination.coordinates[0],
              }
              : null
          }
          driverLocation={driverLocation}
          enableSelection={false}
          route={route}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-4 left-0 right-0 px-4 flex justify-between items-center z-20">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-full bg-black/70 border border-white/15 px-3 py-2 text-xs font-medium flex items-center gap-2 backdrop-blur"
        >
          <span className="inline-block w-4 h-[1.5px] bg-white" />
          <span className="inline-block w-4 h-[1.5px] bg-white/80" />
          <span className="inline-block w-3 h-[1.5px] bg-white/60" />
        </button>

        <div className="flex items-center gap-3">
          {locationUpdating && (
            <span className="text-[10px] text-neutral-400 bg-black/70 px-2 py-1 rounded-full border border-white/10">
              GPS on
            </span>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[11px] text-neutral-400">
              {driver?.fullname?.firstname || "Driver"}
            </span>
            <span className="text-[10px] text-neutral-500">
              {driver?.vehicle?.plate || ""}
            </span>
          </div>
        </div>
      </div>

      {/* Status & ETA chip above bottom */}
      <div className="absolute left-0 right-0 bottom-40 px-4 z-10">
        <div className="flex justify-between items-center text-[11px] text-neutral-200 bg-black/70 border border-white/10 rounded-full px-3 py-2 backdrop-blur-md">
          <span>
            {!isSubscriptionActive && "Subscription inactive"}
            {isSubscriptionActive && status === "IDLE" && "Idle"}
            {isSubscriptionActive && status === "REQUESTED" && "New request"}
            {isSubscriptionActive && status === "ACCEPTED" && "Heading to pickup"}
            {isSubscriptionActive && status === "STARTED" && "On the way to destination"}
            {isSubscriptionActive && status === "COMPLETED" && "Ride completed"}
          </span>

          {distanceKm && etaMin && (
            <span>
              ~{etaMin} min • {distanceKm.toFixed(1)} km
            </span>
          )}
        </div>

        {isNearPickup && status === "ACCEPTED" && (
          <p className="mt-2 text-[11px] text-amber-200 bg-amber-900/30 border border-amber-500/40 px-3 py-2 rounded-xl backdrop-blur-md">
            You&apos;re very close to the rider. Confirm OTP before starting the ride.
          </p>
        )}

        {nextInstruction && status !== "IDLE" && isSubscriptionActive && (
          <div className="mt-2 text-[11px] text-neutral-100 bg-white/10 border border-white/20 px-3 py-2 rounded-xl text-center backdrop-blur-md">
            {nextInstruction}
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: 220 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 70 }}
        className="absolute bottom-0 left-0 right-0 bg-black/95 rounded-t-3xl p-5 pb-7 shadow-[0_-18px_40px_rgba(0,0,0,0.95)] z-20 backdrop-blur-xl border-t border-white/10"
      >
        {/* Subscription hard gate */}
        {!isSubscriptionActive ? (
          <div className="space-y-3 text-sm">
            <h2 className="text-base font-semibold">
              Subscription required
            </h2>
            <p className="text-xs text-neutral-400">
              You need an active subscription to go online and accept ride
              requests. Recharge your wallet and activate a plan to start driving.
            </p>

            <button
              onClick={() => navigate("/driver/wallet")}
              className="w-full py-3 rounded-2xl bg-neutral-100 text-black font-semibold text-sm shadow-[0_12px_30px_rgba(0,0,0,0.9)] hover:bg-white active:bg-neutral-200 transition"
            >
              Activate Subscription
            </button>

            <p className="text-[10px] text-neutral-500 text-center">
              Once active, you&apos;ll be able to go Online and receive rides.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Online / offline toggle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-neutral-400">
                  Availability
                </span>
                <span className="text-sm font-semibold">
                  {driver?.isAvailable ? "Online" : "Offline"}
                </span>
              </div>
              <button
                onClick={toggleAvailability}
                disabled={availabilityLoading}
                className={`px-4 py-2 rounded-full text-xs font-semibold border ${driver?.isAvailable
                  ? "bg-white text-black border-white"
                  : "bg-black/70 text-white border-white/30"
                  } disabled:opacity-60`}
              >
                {availabilityLoading
                  ? "Updating..."
                  : driver?.isAvailable
                    ? "Go Offline"
                    : "Go Online"}
              </button>
            </div>

            {/* Ride state actions */}
            {activeRide && status === "ACCEPTED" && (
              <div className="space-y-3">
                <p className="text-xs text-neutral-400">
                  Enter OTP shared by rider to start the trip.
                </p>
                <input
                  type="text"
                  placeholder="OTP"
                  className="bg-black/70 text-white w-full px-4 py-3 rounded-2xl text-center text-xl tracking-[0.5em] border border-white/20 placeholder:text-neutral-500"
                  maxLength={4}
                  value={enteredOTP}
                  onChange={(e) =>
                    setEnteredOTP(
                      e.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                />
                <button
                  onClick={() => startRide(enteredOTP)}
                  disabled={enteredOTP.length !== 4}
                  className="bg-neutral-100 text-black w-full py-3 rounded-2xl font-semibold disabled:opacity-40"
                >
                  Verify &amp; Start Ride
                </button>
              </div>
            )}

            {activeRide && status === "STARTED" && (
              <button
                onClick={completeRide}
                className="bg-neutral-100 text-black w-full py-3 rounded-2xl font-semibold"
              >
                Complete Ride
              </button>
            )}

            {!activeRide && pendingRequests.length === 1 && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white/5 border border-white/15 p-3 text-sm">
                  <p className="text-xs text-neutral-400 mb-1">
                    New ride request
                  </p>
                  <p className="text-xs text-neutral-300">
                    Pickup:{" "}
                    <span className="font-mono text-[11px]">
                      {JSON.stringify(
                        pendingRequests[0].pickup
                      ).slice(0, 32)}
                      ...
                    </span>
                  </p>
                  <p className="text-xs text-neutral-300">
                    Destination:{" "}
                    <span className="font-mono text-[11px]">
                      {JSON.stringify(
                        pendingRequests[0].destination
                      ).slice(0, 32)}
                      ...
                    </span>
                  </p>
                  <p className="mt-1 text-xs">
                    Fare:{" "}
                    <span className="font-semibold">
                      ₹{pendingRequests[0].fare}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() =>
                    acceptRide(pendingRequests[0].rideId)
                  }
                  className="bg-neutral-100 text-black w-full py-3 rounded-2xl font-semibold"
                >
                  Accept Ride
                </button>
              </div>
            )}

            {!activeRide && pendingRequests.length === 0 && (
              <p className="text-center text-xs text-neutral-500">
                {driver?.isAvailable
                  ? "Online. Waiting for ride requests…"
                  : "You are offline. Go Online to receive rides."}
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-64 h-full bg-black/95 border-r border-white/10 backdrop-blur-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-400">Driver</p>
                <p className="text-lg font-semibold">
                  {driver?.fullname?.firstname || "Driver"}
                </p>
                {driver?.vehicle?.plate && (
                  <p className="text-[11px] text-neutral-500">
                    {driver.vehicle.plate}
                  </p>
                )}
              </div>
              <button
                className="text-xs text-neutral-400"
                onClick={() => setIsSidebarOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5">
                Profile
              </button>
              <button
                className="w-full text-left px-3 py-2 rounded-xl hover:bg:white/5"
                onClick={() => navigate("/driver/wallet")}
              >
                Wallet &amp; Subscription
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
                onClick={() => dispatch(driverLogout())}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
          <div
            className="flex-1 h-full bg-black/40"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && feedbackRideId && (
        <DriverFeedbackModal
          rideId={feedbackRideId}
          onClose={() => {
            setShowFeedbackModal(false);
            setFeedbackRideId(null);
          }}
        />
      )}
    </div>
  );
}
