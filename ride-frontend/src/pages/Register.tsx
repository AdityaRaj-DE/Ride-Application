import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../store/authSlice";
import type { RootState } from "../store";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullname: {
        firstname: form.firstname,
        lastname: form.lastname,
      },
      email: form.email,
      password: form.password,
    };

    const result = await dispatch(registerUser(payload));
    if (registerUser.fulfilled.match(result)) {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Content */}
      <div className="flex-1 flex flex-col px-5 pt-10 pb-4">
        {/* Brand / Heading */}
        <header className="mb-10">
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-neutral-500">
            Rider
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Create your account</h1>
          <p className="mt-2 text-sm text-neutral-400 max-w-md">
            Sign up in seconds and start requesting rides instantly.
          </p>
        </header>

        {/* Form Card */}
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_18px_45px_rgba(0,0,0,0.85)] p-6 md:p-8 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Rider Registration</h2>
                <p className="text-xs text-neutral-400">
                  Tell us a bit about yourself to get started.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-300">
                      First name
                    </label>
                    <input
                      type="text"
                      placeholder="Aditya"
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10 transition"
                      onChange={(e) =>
                        setForm({ ...form, firstname: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-300">
                      Last name{" "}
                      <span className="text-neutral-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Raj"
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10 transition"
                      onChange={(e) =>
                        setForm({ ...form, lastname: e.target.value })
                      }
                    />
                  </div>
                </div>

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
                    placeholder="Create a strong password"
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10 transition"
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <p className="text-[0.7rem] text-neutral-500">
                    Use at least 8 characters, including a number &amp; symbol.
                  </p>
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
                  {loading ? "Creating account..." : "Register"}
                </button>
              </form>

              <p className="text-[0.7rem] text-neutral-500">
                By creating an account, you agree to our Terms &amp; Privacy
                Policy.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom auth switch bar */}
      <div className="border-t border-white/10 bg-black/95 backdrop-blur px-5 py-3">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Link
            to="/login"
            className="flex-1 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-200 text-center hover:bg-white/10 transition"
          >
            Already have an account?
          </Link>
          <button
            type="button"
            className="flex-1 rounded-full border border-white/30 bg-transparent px-4 py-2 text-xs font-semibold text-white text-center"
            disabled
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
