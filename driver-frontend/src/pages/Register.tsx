// pages/driver/Register.tsx
import {
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "../services/axiosInstance";

type Step = 0 | 1 | 2;

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [step, setStep] = useState<Step>(0);

  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    mobileNumber: "",
    licenseNumber: "",
    vehicleColor: "",
    plate: "",
    capacity: 1,
    vehicleType: "car",
    password: "",
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "capacity"
          ? Number(value) || 1
          : value,
    }));
  };

  const handleColorChoose = (colorName: string) => {
    setForm((prev) => ({ ...prev, vehicleColor: colorName }));
  };

  const nextStep = () => {
    if (step === 0) {
      if (!form.firstname || !form.email || !form.mobileNumber) {
        setErrorMsg("Fill name, email & mobile to continue.");
        return;
      }
    }
    if (step === 1) {
      if (!form.licenseNumber || !form.vehicleColor || !form.plate) {
        setErrorMsg("Fill license, vehicle color & plate number.");
        return;
      }
    }
    setErrorMsg("");
    setStep((prev) => (prev + 1) as Step);
  };

  const prevStep = () => {
    setErrorMsg("");
    setStep((prev) => (prev - 1) as Step);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) {
      setErrorMsg("Password should be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      await axiosInstance.post("/auth/drivers/register", {
        fullname: {
          firstname: form.firstname,
          lastname: form.lastname,
        },
        email: form.email,
        mobileNumber: form.mobileNumber,
        password: form.password,
        licenseNumber: form.licenseNumber,
        vehicle: {
          color: form.vehicleColor,
          plate: form.plate,
          capacity: Number(form.capacity),
          vehicleType: form.vehicleType,
        },
      });

      alert("Driver registered successfully");
      navigate("/driver/login");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const colorOptions = [
    { name: "White", sample: "#f5f5f5" },
    { name: "Black", sample: "#111111" },
    { name: "Silver", sample: "#c0c0c0" },
    { name: "Blue", sample: "#1e3a8a" },
    { name: "Red", sample: "#b91c1c" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Content */}
      <div className="flex-1 flex flex-col px-5 pt-10 pb-4">
        {/* Header */}
        <header className="mb-6">
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-neutral-500">
            Driver
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Create driver account</h1>
          <p className="mt-2 text-xs text-neutral-400 max-w-md">
            Complete your details to start driving and earning.
          </p>
        </header>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5 text-[11px] text-neutral-400">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${
                step >= s ? "bg-white" : "bg-white/15"
              }`}
            />
          ))}
          <span className="ml-2">
            Step {step + 1} of 3
          </span>
        </div>

        {/* Card */}
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_18px_45px_rgba(0,0,0,0.85)] p-5 md:p-7 space-y-4"
            >
              {/* Step content */}
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">
                    Personal details
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Tell us who you are. This will show to riders.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300">
                        First name
                      </label>
                      <input
                        name="firstname"
                        placeholder="First Name"
                        onChange={handleChange}
                        className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300">
                        Last name (optional)
                      </label>
                      <input
                        name="lastname"
                        placeholder="Last Name"
                        onChange={handleChange}
                        className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="Email"
                      onChange={handleChange}
                      className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300">
                      Mobile number
                    </label>
                    <input
                      name="mobileNumber"
                      placeholder="Mobile Number"
                      onChange={handleChange}
                      className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">
                    Vehicle details
                  </h2>
                  <p className="text-xs text-neutral-400">
                    This information is shown to riders and used for compliance.
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300">
                      License number
                    </label>
                    <input
                      name="licenseNumber"
                      placeholder="License Number"
                      onChange={handleChange}
                      className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-neutral-300">
                      Vehicle color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleColorChoose(c.name)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                            form.vehicleColor === c.name
                              ? "border-white bg-white/10"
                              : "border-white/15 bg-black/60"
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/40"
                            style={{ backgroundColor: c.sample }}
                          />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                    <input
                      name="vehicleColor"
                      placeholder="Or type custom color"
                      value={form.vehicleColor}
                      onChange={handleChange}
                      className="mt-1 w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300">
                      Plate number
                    </label>
                    <input
                      name="plate"
                      placeholder="Plate Number"
                      onChange={handleChange}
                      className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300">
                        Capacity
                      </label>
                      <input
                        name="capacity"
                        type="number"
                        min={1}
                        placeholder="Capacity"
                        onChange={handleChange}
                        className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300">
                        Vehicle type
                      </label>
                      <select
                        name="vehicleType"
                        value={form.vehicleType}
                        onChange={handleChange}
                        className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                      >
                        <option value="car">Car</option>
                        <option value="motorcycle">Motorcycle</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">
                    Account security
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Set a secure password for your driver account.
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300">
                      Password
                    </label>
                    <input
                      name="password"
                      type="password"
                      placeholder="Password"
                      onChange={handleChange}
                      className="w-full border border-white/15 bg-black/60 px-3 py-2 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
                    />
                  </div>

                  <p className="text-[0.7rem] text-neutral-500">
                    Use at least 6 characters with numbers and symbols.
                  </p>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-700/40 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between pt-2">
                {step > 0 ? (
                  <button
                    type="button"
                    className="text-xs px-4 py-2 rounded-full border border-white/25 bg-black/60 hover:bg-white/5"
                    onClick={prevStep}
                  >
                    Back
                  </button>
                ) : (
                  <span className="text-[0.7rem] text-neutral-500">
                    Already registered?{" "}
                    <Link
                      to="/driver/login"
                      className="underline underline-offset-2"
                    >
                      Login
                    </Link>
                  </span>
                )}

                {step < 2 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-5 py-2 rounded-full bg-neutral-100 text-black text-xs font-semibold disabled:opacity-60"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-full bg-neutral-100 text-black text-xs font-semibold disabled:opacity-60"
                  >
                    {loading ? "Registering..." : "Complete signup"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Bottom bar */}
      <div className="border-top border-white/10 bg-black/95 backdrop-blur px-5 py-3">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Link
            to="/driver/login"
            className="flex-1 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-200 text-center hover:bg-white/10 transition"
          >
            Already have an account?
          </Link>
          <button
            type="button"
            disabled
            className="flex-1 rounded-full border border-white/30 bg-transparent px-4 py-2 text-xs font-semibold text-white text-center"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
