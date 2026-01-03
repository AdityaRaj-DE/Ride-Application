// pages/driver/Login.tsx
import { useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { axiosInstance } from "../services/axiosInstance";
import {
  driverLoginSuccess,
  fetchDriverProfile,
} from "../store/slices/driverAuthSlice";
import type { AppDispatch } from "../store";

export default function Login() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMsg("Email and password required");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const res = await axiosInstance.post("/auth/drivers/login", {
        email,
        password,
      });

      const token: string = res.data.token;
      const driver = res.data.driver;

      dispatch(driverLoginSuccess({ token, driver }));
      dispatch(fetchDriverProfile());
      navigate("/driver/dashboard");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Main content */}
      <div className="flex-1 flex flex-col px-5 pt-12 pb-4">
        <header className="mb-10">
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-neutral-500">
            Driver
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-neutral-400 max-w-md">
            Log in to start receiving ride requests and track your earnings.
          </p>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_18px_45px_rgba(0,0,0,0.85)] p-6 md:p-8 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Driver Login</h2>
                <p className="text-xs text-neutral-400">
                  Use your registered driver credentials.
                </p>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-700/40 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10 transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10 transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-full bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.9)] hover:bg-neutral-800 active:bg-neutral-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <p className="text-[0.7rem] text-neutral-500">
                Make sure you&apos;re using your driver account credentials.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom switch bar */}
      <div className="border-t border-white/10 bg-black/95 backdrop-blur px-5 py-3">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            className="flex-1 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-300"
            disabled
          >
            Login
          </button>
          <Link
            to="/driver/register"
            className="flex-1 rounded-full border border-white/30 bg-transparent px-4 py-2 text-xs font-semibold text-white text-center hover:bg-white/10 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
