import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, fetchProfile } from "../store/authSlice";
import type { RootState } from "../store";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { token, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginUser(form));
  };

  useEffect(() => {
    if (token) {
      dispatch(fetchProfile()).then(() => {
        navigate("/dashboard");
      });
    }
  }, [token, dispatch, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Content */}
      <div className="flex-1 flex flex-col px-5 pt-10 pb-4">
        {/* Brand / Heading */}
        <header className="mb-10">
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-neutral-500">
            Rider
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-neutral-400 max-w-md">
            Sign in to continue booking rides and track your trips in real time.
          </p>
        </header>

        {/* Form Card */}
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_18px_45px_rgba(0,0,0,0.85)] p-6 md:p-8 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Log in</h2>
                <p className="text-xs text-neutral-400">
                  Use the email and password you registered with.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10 transition"
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
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
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-700/40 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  className="mt-2 w-full rounded-full bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.9)] hover:bg-neutral-800 active:bg-neutral-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <p className="text-[0.7rem] text-neutral-500">
                By continuing, you agree to our Terms &amp; Privacy Policy.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom auth switch bar */}
      <div className="border-t border-white/10 bg-black/95 backdrop-blur px-5 py-3">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            className="flex-1 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-200"
            disabled
          >
            Login
          </button>
          <Link
            to="/register"
            className="flex-1 rounded-full border border-white/30 bg-transparent px-4 py-2 text-xs font-semibold text-white text-center hover:bg-white/10 transition"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
