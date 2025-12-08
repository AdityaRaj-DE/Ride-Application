import { createSlice } from "@reduxjs/toolkit";

interface LocationState {
  lat: number | null;
  lng: number | null;
}

const initialState: LocationState = {
  lat: null,
  lng: null,
};

const driverLocationSlice = createSlice({
  name: "driverLocation",
  initialState,
  reducers: {
    updateDriverLocation(state, action) {
      state.lat = action.payload.lat;
      state.lng = action.payload.lng;
    }
  },
});

export const { updateDriverLocation } = driverLocationSlice.actions;
export default driverLocationSlice.reducer;
