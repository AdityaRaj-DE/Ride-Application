import { createSlice } from "@reduxjs/toolkit";
import type{ PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../services/axiosInstance";

export const fetchActiveDriverRide = createAsyncThunk(
  "driverRide/fetchActiveDriverRide",
  async () => {
    const res = await axiosInstance.get("/ride/rides/active");
    return res.data;
  }
);

interface Ride {
  rideId: string;
  pickup: any;
  destination: any;
  fare: number;
  status: "REQUESTED" | "ACCEPTED" | "STARTED" | "COMPLETED" | "CANCELLED";
  rider?: any;   // <-- add this
}


interface DriverRideState {
  pendingRequests: Ride[];
  activeRide: Ride | null;
  status: "IDLE" | "REQUESTED" | "ACCEPTED" | "STARTED" | "COMPLETED";
  rider: any | null;  // <-- ADD THIS
}


const initialState: DriverRideState = {
  pendingRequests: [],
  activeRide: null,
  status: "IDLE",
  rider: null,       // <-- ADD THIS
};


const driverRideSlice = createSlice({
  name: "driverRide",
  initialState,
  reducers: {
    requestReceived(state, action: PayloadAction<Ride>) {
      if (!state.activeRide) {
        state.pendingRequests.push(action.payload);
        state.status = "REQUESTED";
      }
    },

    rideAccepted(state, action: PayloadAction<Ride>) {
        state.activeRide = {
            rideId: action.payload.rideId,
            pickup: action.payload.pickup,
            destination: action.payload.destination,
            fare: action.payload.fare,
            status: "ACCEPTED"
          };
          if (action.payload.rider) {
            state.rider = action.payload.rider;
          }
      state.pendingRequests = [];
      state.status = "ACCEPTED";
    },

    rideStarted(state) {
      if (!state.activeRide) return;
      state.activeRide.status = "STARTED";
      state.status = "STARTED";
    },

    rideCompleted(state) {
      state.activeRide = null;
      state.status = "COMPLETED";
    },

    clearRequests(state) {
      state.pendingRequests = [];
    },
    setRiderDetails(state, action: PayloadAction<any>) {
      state.rider = action.payload;
    }
    
  },
  extraReducers: (builder) => {
    builder.addCase(fetchActiveDriverRide.fulfilled, (state, action) => {
      if (!action.payload) {
        // no active ride
        state.activeRide = null;
        state.status = "IDLE";
        return;
      }
  
      state.activeRide = {
        rideId: action.payload._id || action.payload.rideId,
        pickup: action.payload.pickup,
        destination: action.payload.destination,
        status: action.payload.status,
        fare: action.payload.estimatedFare || action.payload.fare,
      };
  
      state.status = action.payload.status || "IDLE";
    });
  },
  
});

export const {
  requestReceived,
  rideAccepted,
  rideStarted,
  rideCompleted,
  clearRequests,
  setRiderDetails,       // <-- add here
} = driverRideSlice.actions;


export default driverRideSlice.reducer;
