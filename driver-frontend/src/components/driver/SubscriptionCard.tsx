// components/driver/SubscriptionCard.tsx
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { subscribePlan } from "../../store/slices/driverWalletSlice";

export default function SubscriptionCard() {
  const dispatch = useDispatch<AppDispatch>();
  const { subscription } = useSelector(
    (state: RootState) => state.driverWallet
  );
  const isActive = subscription?.isActive;

  const plans = [
    { name: "Weekly", price: 199, durationDays: 7 },
    { name: "Monthly", price: 499, durationDays: 30 },
  ];

  const handleSubscribe = (planName: string) => {
    if (isActive) return;
    dispatch(subscribePlan(planName));
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_16px_40px_rgba(0,0,0,0.9)] space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Subscription</h2>
        {isActive ? (
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Active
          </span>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/40">
            Inactive
          </span>
        )}
      </div>

      {isActive && subscription?.plan && (
        <p className="text-xs text-emerald-300">
          Active plan:{" "}
          <span className="font-semibold">
            {subscription.plan.name}
          </span>{" "}
          until{" "}
          <span className="font-mono">
            {new Date(subscription.expiresAt).toLocaleDateString()}
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {plans.map((plan) => (
          <button
            key={plan.name}
            disabled={isActive}
            onClick={() => handleSubscribe(plan.name)}
            className={`p-3 rounded-2xl text-left text-xs border ${
              isActive
                ? "bg-white/5 border-white/15 text-neutral-500"
                : "bg-neutral-100 text-black border-neutral-100 hover:bg-white"
            }`}
          >
            <p className="font-semibold">{plan.name}</p>
            <p className="mt-1 text-[11px] opacity-80">
              ₹{plan.price} • {plan.durationDays} days
            </p>
          </button>
        ))}
      </div>

      {!isActive && (
        <p className="text-[11px] text-red-300">
          Subscription required to go Online or accept rides.
        </p>
      )}
    </div>
  );
}
