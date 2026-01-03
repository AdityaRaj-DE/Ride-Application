// src/components/CallModal.tsx
import React from "react";

type CallModalProps = {
  open: boolean;
  onClose?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onHangup?: () => void;
  onToggleMute?: () => void;
  state: {
    incoming: boolean;
    ringing: boolean;
    inCall: boolean;
    connecting: boolean;
    muted: boolean;
    caller: { id?: string; name?: string } | null;
  };
  timerSec: number;
  roleLabel?: string; // "Driver" / "Rider"
};

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CallModal({
  open,
  onAccept,
  onReject,
  onHangup,
  onToggleMute,
  state,
  timerSec,
  roleLabel = "Call",
}: CallModalProps) {
  if (!open) return null;

  const { incoming, ringing, inCall, connecting, muted, caller } = state;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={() => onReject?.()} />
      <div className="relative z-50 w-[92%] max-w-md bg-black/95 rounded-2xl border border-white/10 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-xl font-semibold">
            {caller?.name ? caller.name[0] : "C"}
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-400">
              {incoming ? `${caller?.name || "Incoming call"}` : roleLabel}
            </p>
            <p className="text-lg font-semibold">
              {incoming ? (caller?.name || "Caller") : (inCall ? "In call" : "Calling")}
            </p>
          </div>
          <div className="text-sm text-neutral-400">
            {inCall ? fmtTime(timerSec) : connecting ? "Connecting..." : ringing ? "Ringing" : ""}
          </div>
        </div>

        <div className="mt-6">
          {incoming && !inCall && (
            <div className="flex gap-3">
              <button
                onClick={() => onAccept?.()}
                className="flex-1 py-3 rounded-xl bg-emerald-600 font-semibold"
              >
                Accept
              </button>
              <button
                onClick={() => onReject?.()}
                className="flex-1 py-3 rounded-xl bg-red-700 font-semibold"
              >
                Reject
              </button>
            </div>
          )}

          {!incoming && !inCall && (ringing || connecting) && (
            <div className="text-center text-sm text-neutral-400">
              {connecting ? "Connecting…" : "Ringing…"}
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  onClick={() => onHangup?.()}
                  className="px-4 py-2 rounded-xl bg-red-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {inCall && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => onToggleMute?.()}
                  className={`px-4 py-3 rounded-xl border ${muted ? "bg-yellow-600" : "bg-white/5"}`}
                >
                  {muted ? "Unmute" : "Mute"}
                </button>

                <button
                  onClick={() => onHangup?.()}
                  className="px-4 py-3 rounded-xl bg-red-700 text-white"
                >
                  End Call
                </button>
              </div>
              <p className="text-xs text-neutral-400 text-center">Audio between rider & driver is private and encrypted.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
