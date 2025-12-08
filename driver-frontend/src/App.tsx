import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedDriverRoute from "./components/driver/ProtectedDriverRoute";
import WalletPage from "./pages/WalletPage";
import DriverProfile from "./pages/DriverProfile";

export default function App() {
  return (
    <Routes>
      <Route path="/driver/login" element={<Login />} />
      <Route path="/driver/register" element={<Register />} />

      <Route
        path="/driver/dashboard"
        element={
          <ProtectedDriverRoute>
            <Dashboard />
          </ProtectedDriverRoute>
        }
      />
      <Route path="/driver/wallet" element={<WalletPage />} />
      <Route
        path="/driver/profile"
        element={
          <ProtectedDriverRoute>
            <DriverProfile />
          </ProtectedDriverRoute>
        }
      />
      {/* fallback */}
      <Route path="*" element={<Navigate to="/driver/login" />} />
    </Routes>
  );
}
