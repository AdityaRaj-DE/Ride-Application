import { configureStore } from "@reduxjs/toolkit";
import driverAuthReducer from "./slices/driverAuthSlice";
import driverRideReducer from "./slices/driverRideSlice";
import driverLocationReducer from "./slices/driverLocationSlice";
import walletReducer from "./slices/driverWalletSlice";
export const store = configureStore({
  reducer: {
    driverAuth: driverAuthReducer,
    driverRide: driverRideReducer,
    driverLocation: driverLocationReducer,
    driverWallet: walletReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
