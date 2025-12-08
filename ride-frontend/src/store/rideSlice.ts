import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios";

export const fetchActiveRide = createAsyncThunk(
  "ride/fetchActiveRide",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/ride/rides/active");
      return res.data;
    } catch {
      return rejectWithValue("Failed to fetch ride");
    }
  }
);

interface RideState {
  currentRide: any | null;
  otp: string | null;
  status: "IDLE" | "REQUESTED" | "ACCEPTED" | "STARTED" | "COMPLETED" | "CANCELLED";
  pickup: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  driver: any | null;
}

const initialState: RideState = {
  currentRide: null,
  otp: null,
  status: "IDLE",
  pickup: null,
  destination: null,
  driver: null,
};

const rideSlice = createSlice({
  name: "ride",
  initialState,
  reducers: {
    setPickup(state, action) {
      state.pickup = action.payload;
    },
    setDestination(state, action) {
      state.destination = action.payload;
    },

    rideRequested(state, action) {
      state.status = "REQUESTED";
      state.currentRide = action.payload;
      state.otp = action.payload?.otp;
    },

    rideAccepted(state, action) {
      state.status = "ACCEPTED";
      state.driver = action.payload.driver;
      state.currentRide = action.payload;
      state.otp = action.payload?.otp || state.otp;
    },

    rideStarted(state) {
      state.status = "STARTED";
      state.otp = null;
    },

    rideCompleted(state) {
      console.log("REDUCER rideCompleted: BEFORE", state.status, state.currentRide);
      if (state.currentRide) {
        state.currentRide.status = "COMPLETED";
      }
      state.status = "COMPLETED";
      console.log("REDUCER rideCompleted: AFTER", state.status, state.currentRide);
    },
    

    rideCancelled(state) {
      console.log("REDUCER rideCancelled CALLED");
      state.status = "CANCELLED";
    },

    clearRide(state) {
      console.log("REDUCER clearRide CALLED");
      state.currentRide = null;
      state.otp = null;
      state.status = "IDLE";
      state.pickup = null;
      state.destination = null;
      state.driver = null;
    },
  },

  extraReducers: (builder) => {
    builder.addCase(fetchActiveRide.fulfilled, (state, action) => {
      // If already completed, DO NOT overwrite anything
      console.log(
        "fetchActiveRide.fulfilled >>>",
        action.payload,
        "current status=",
        state.status
      );
      if (state.status === "COMPLETED") return;
  
      if (!action.payload) {
        state.currentRide = null;
        state.status = "IDLE";
        return;
      }
  
      state.currentRide = action.payload;
      state.status = action.payload?.status || "IDLE";
      state.driver = action.payload?.driver || null;
      state.otp = action.payload?.otp || null;
    });
  },
  
});

export const {
  setPickup,
  setDestination,
  rideRequested,
  rideAccepted,
  rideStarted,
  rideCompleted,
  rideCancelled,
  clearRide,
} = rideSlice.actions;

export default rideSlice.reducer;