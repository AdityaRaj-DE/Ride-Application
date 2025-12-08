import { useSelector, useDispatch } from "react-redux";
import type{ RootState, AppDispatch } from "../store";
import { fetchDriverProfile } from "../store/slices/driverAuthSlice";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function DriverProfile() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { driver, loading } = useSelector((state: RootState) => state.driverAuth);

  useEffect(() => {
    if (!driver) {
      dispatch(fetchDriverProfile());
    }
  }, [driver]);
  

  if (loading || !driver) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Driver Profile</h1>
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="text-xs text-neutral-400"
        >
          ← Back
        </button>
      </div>

      <div className="mt-6 space-y-4">

        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-neutral-400 mb-1">Full Name</p>
          <p className="text-sm font-semibold">
            {driver.fullname?.firstname} {driver.fullname?.lastname}
          </p>
        </div>

        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-neutral-400 mb-1">Email</p>
          <p className="text-sm">{driver.email}</p>
        </div>

        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-neutral-400 mb-1">Mobile</p>
          <p className="text-sm">{driver.mobileNumber}</p>
        </div>

        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-neutral-400 mb-1">Vehicle</p>
          <p className="text-sm">
            {driver.vehicleInfo?.model || "-"} •{" "}
            {driver.vehicleInfo?.plateNumber || "-"} •{" "}
            {driver.vehicleInfo?.color || "-"}
          </p>
        </div>

        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-neutral-400 mb-1">License Number</p>
          <p className="text-sm">{driver.licenseNumber}</p>
        </div>

        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-neutral-400 mb-1">Rating</p>
          <p className="text-sm">{driver.rating || "N/A"}</p>
        </div>
      </div>
    </div>
  );
}
