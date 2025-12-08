//compnents/driver/ProtectedDriverROute.tsx

import { useEffect } from "react";
import type{ ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { fetchDriverProfile } from "../../store/slices/driverAuthSlice";

interface Props {
  children: ReactNode;
}

export default function ProtectedDriverRoute({ children }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { token, driver, loading } = useSelector(
    (state: RootState) => state.driverAuth
  );

  useEffect(() => {
    if (token && !driver && !loading) {
      dispatch(fetchDriverProfile());
    }
  }, [dispatch, token, driver, loading]);

  if (!token) {
    return <Navigate to="/driver/login" replace />;
  }

  if (loading || (!driver && token)) {
    return <div className="p-4">Loading driver profile...</div>;
  }

  if (!driver) {
    // token exists but profile failed
    return <Navigate to="/driver/login" replace />;
  }

  return <>{children}</>;
}
