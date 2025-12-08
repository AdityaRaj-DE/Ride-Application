import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios";

interface User {
  _id: string;
  fullname: {
    firstname: string;
    lastname?: string;
  };
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("token"),
  loading: false,
  error: null,
};

// Register
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (formData: any, { rejectWithValue }) => {
    try {
      const res = await api.post("/auth/users/register", formData);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Registration failed");
    }
  }
);

// Login
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (formData: any, { rejectWithValue }) => {
    try {
      const res = await api.post("/auth/users/login", formData);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

// Profile Fetch
export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/auth/users/profile");
      console.log("PROFILE RESPONSE:", res.data);
      return res.data;
    } catch (err: any) {
      console.error("PROFILE ERROR:", err.response?.data || err.message);
      return rejectWithValue("Profile fetch failed");
    }
  }
);


const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.fulfilled, (state, action) => {
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action: any) => {
        state.error = action.payload;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        localStorage.setItem("token", action.payload.token);
        
      })
      .addCase(loginUser.rejected, (state, action: any) => {
        state.loading = false;
        state.token = null;
        state.error = action.payload;
      })
      // Profile
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      
        // Auto logout if token invalid or expired
        // localStorage.removeItem("token");
        // state.token = null;
        // state.user = null;
      })      
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
