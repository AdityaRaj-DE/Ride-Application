import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../services/axiosInstance";

interface Driver {
  _id?: string;
  userId?: string;
  fullname?: {
    firstname?: string;
    lastname?: string;
  };
  email?: string;
  mobileNumber?: string;
  vehicleInfo?: {
    model?: string;
    plateNumber?: string;
    color?: string;
  };
  licenseNumber?: string;
  rating?: number;
  totalRides?: number;
  totalEarnings?: number;
  isAvailable?: boolean;
}

interface DriverAuthState {
  driver: Driver | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: DriverAuthState = {
  driver: null,
  token: localStorage.getItem("driverToken"),
  loading: false,
  error: null,
};

export const fetchDriverProfile = createAsyncThunk(
  "driver/drivers/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/driver/drivers/profile");

      // Expect data = driver object
      return data as Driver;
    } catch (err: any) {
      return rejectWithValue("Unauthorized");
    }
  }
);

const driverAuthSlice = createSlice({
  name: "driverAuth",
  initialState,
  reducers: {
    driverLoginSuccess: (
      state,
      action: PayloadAction<{ token: string; driver?: Driver }>
    ) => {
      state.token = action.payload.token;
      if (action.payload.driver) {
        state.driver = action.payload.driver;
      }
      localStorage.setItem("driverToken", action.payload.token);
      state.error = null;
    },
    driverLogout: (state) => {
      state.driver = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem("driverToken");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDriverProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDriverProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.driver = action.payload;
      })
      .addCase(fetchDriverProfile.rejected, (state, action) => {
        state.loading = false;
        state.driver = null;
        state.token = null;
        localStorage.removeItem("driverToken");
        state.error = (action.payload as string) || "Unauthorized";
      });
  },
});

export const { driverLoginSuccess, driverLogout } = driverAuthSlice.actions;
export default driverAuthSlice.reducer;
