// pages/driver/WalletPage.tsx
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import { fetchWallet } from "../store/slices/driverWalletSlice";
import WalletCard from "../components/driver/WalletCard";
import SubscriptionCard from "../components/driver/SubscriptionCard";
import { Link } from "react-router-dom";

export default function WalletPage() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchWallet());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-white/10">
        <Link
          to="/driver/dashboard"
          className="text-xs text-neutral-300 flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-sm font-semibold">Driver Wallet</h1>
        <div className="w-6" /> {/* spacer */}
      </header>

      <main className="flex-1 px-5 py-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        <WalletCard />
        <SubscriptionCard />
      </main>
    </div>
  );
}
