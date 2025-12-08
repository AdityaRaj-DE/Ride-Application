// Profile.tsx
import { useNavigate } from "react-router-dom";

import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { motion } from "framer-motion";

export default function Profile() {
    const navigate = useNavigate();

    const { user, loading } = useSelector((state: RootState) => state.auth);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <p className="text-sm text-neutral-400">Loading profile…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-md mx-auto mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-neutral-300 text-sm hover:text-white transition"
                >
                    <span className="text-lg leading-none">&larr;</span>
                    <span>Back</span>
                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 60 }}
                className="max-w-md mx-auto bg-black/80 border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.95)]"
            >
                {/* Avatar + name */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold uppercase border border-white/20">
                        {user.fullname.firstname[0]}
                    </div>

                    <div>
                        <p className="text-xl font-semibold">
                            {user.fullname.firstname} {user.fullname.lastname}
                        </p>
                        <p className="text-xs text-neutral-400">Rider</p>
                    </div>
                </div>

                {/* Cards */}
                <div className="space-y-3 text-sm">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-neutral-400 text-xs">Name</p>
                        <p>{user.fullname.firstname} {user.fullname.lastname || ""}</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-neutral-400 text-xs">Email</p>
                        <p>{user.email}</p>
                    </div>
                </div>

                <button
                    disabled
                    className="w-full mt-6 py-3 bg-neutral-900 border border-white/10 rounded-xl text-sm text-neutral-300 cursor-not-allowed"
                >
                    Edit Profile (coming soon)
                </button>
            </motion.div>
        </div>
    );
}
