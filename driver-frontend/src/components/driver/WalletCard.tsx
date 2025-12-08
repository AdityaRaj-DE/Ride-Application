// components/driver/WalletCard.tsx
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { addFunds } from "../../store/slices/driverWalletSlice";
import { useState, type ChangeEvent } from "react";

export default function WalletCard() {
  const dispatch = useDispatch<AppDispatch>();
  const { walletBalance } = useSelector(
    (state: RootState) => state.driverWallet
  );
  const [amount, setAmount] = useState<number>(0);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value));
  };

  const handleAdd = () => {
    if (!amount) return;
    dispatch(addFunds(amount));
    setAmount(0);
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_16px_40px_rgba(0,0,0,0.9)] space-y-3">
      <h2 className="text-sm font-semibold">Wallet Balance</h2>
      <p className="text-3xl font-mono tracking-tight">
        ₹{walletBalance || 0}
      </p>
      <p className="text-[11px] text-neutral-400">
        Use this balance for subscription fees and other driver charges.
      </p>

      <div className="flex gap-2">
        <input
          type="number"
          className="flex-1 bg-black/70 border border-white/15 rounded-xl px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10"
          placeholder="Enter amount"
          value={amount || ""}
          onChange={handleAmountChange}
        />
        <button
          className="px-4 py-2 rounded-xl bg-neutral-100 text-black text-sm font-semibold disabled:opacity-50"
          onClick={handleAdd}
          disabled={!amount}
        >
          Add
        </button>
      </div>
    </div>
  );
}
