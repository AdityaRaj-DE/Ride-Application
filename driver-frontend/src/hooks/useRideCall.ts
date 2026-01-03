// src/hooks/useRideCall.ts
import { useEffect, useRef, useState } from "react";

/**
 * useRideCall(socket, rideId)
 * - socket: socket instance (must be connected)
 * - rideId: string id of the ride room
 *
 * Returns:
 *   startCall(), hangup(), acceptIncoming(), rejectIncoming(), toggleMute()
 *   state: { incoming, ringing, inCall, connecting, muted, caller }
 *   callMeta: { timerSec }
 *
 * IMPORTANT: pass stable socket reference (same object). If socket may be null,
 * check before calling functions.
 */
export default function useRideCall(socket: any, rideId: string | null) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [incoming, setIncoming] = useState(false);
  const [caller, setCaller] = useState<null | { id?: string; name?: string }>(
    null
  );
  const [ringing, setRinging] = useState(false); // we initiated and waiting for answer
  const [inCall, setInCall] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);

  const timerRef = useRef<number | null>(null);
  const [timerSec, setTimerSec] = useState(0);

  // helper: set up a remote audio element for playback
  const ensureRemoteAudio = () => {
    if (!remoteAudioRef.current) {
      const a = document.createElement("audio");
      a.autoplay = true;
      a.playsInline = true;
      remoteAudioRef.current = a;
      document.body.appendChild(a); // hidden audio element
      a.style.display = "none";
    }
    return remoteAudioRef.current!;
  };

  const startTimer = () => {
    stopTimer();
    setTimerSec(0);
    timerRef.current = window.setInterval(() => {
      setTimerSec((s) => s + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const createPeer = () => {
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
            urls: "turn:relay.metered.ca:443",
            username: "openai",
            credential: "openai"
          }
        // add TURN if needed for mobile/strict NAT later
      ],
    });

    pcRef.current.onicecandidate = (e) => {
      if (!e.candidate || !socket || !rideId) return;
      socket.emit("call_ice_candidate", { rideId, candidate: e.candidate });
    };

    pcRef.current.ontrack = (ev) => {
      const audio = ensureRemoteAudio();
      audio.srcObject = ev.streams[0];
      // try to play — browsers require user gesture for autoplay; this is called after a click usually
      audio.play().catch(() => {});
    };

    return pcRef.current;
  };

  // Clean up everything
  const cleanupPeer = () => {
    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    try {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.remove();
        remoteAudioRef.current = null;
      }
    } catch {}
    stopTimer();
    setIncoming(false);
    setRinging(false);
    setInCall(false);
    setConnecting(false);
    setMuted(false);
    setCaller(null);
    setTimerSec(0);
  };

  // Hangup (local) and notify peer
  const hangup = (notifyPeer = true) => {
    if (notifyPeer && socket && rideId) {
      socket.emit("call_hangup", { rideId, from: "client" });
    }
    cleanupPeer();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setMuted(!t.enabled);
    });
  };

  // Start a call (caller) — creates offer
  const startCall = async (meta?: { callerId?: string; callerName?: string }) => {
    if (!socket || !rideId) throw new Error("Socket or rideId missing");
    if (pcRef.current) hangup(false); // reset any existing

    setConnecting(true);
    setRinging(true);
    setCaller(meta || null);

    const pc = createPeer();

    // get mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    } catch (err) {
      setConnecting(false);
      setRinging(false);
      throw err;
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("call_offer", { rideId, offer, meta: meta || {} });
    setConnecting(false);
    // start local ringing UI
  };

  // Accept incoming call (receiver)
  const acceptIncoming = async () => {
    if (!socket || !rideId) throw new Error("Socket or rideId missing");
    setConnecting(true);
    setIncoming(false);

    const pc = createPeer();

    // get mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    } catch (err) {
      setConnecting(false);
      setIncoming(false);
      throw err;
    }

    // remote offer will be set by listener (handleOffer will do setRemoteDesc)
    // create answer when remote desc exists - handleOffer will do that flow.

    setConnecting(false);
  };

  const rejectIncoming = () => {
    // just notify hangup + reset UI
    if (socket && rideId) socket.emit("call_hangup", { rideId, from: "reject" });
    cleanupPeer();
  };

  // --- socket listeners registration ---
  useEffect(() => {
    if (!socket) return;

    const onOffer = async (data: any) => {
      try {
        // A remote side is calling us
        if (!data || !data.offer) return;
        // only react if rideId matches
        if (!rideId) return;

        // Save caller meta if provided
        setCaller(data.meta || null);

        // If we already in call or ringing, auto-reject (avoid overlapping)
        if (pcRef.current || inCall || ringing) {
          // notify peer
          socket.emit("call_hangup", { rideId, from: "busy" });
          return;
        }

        // create peer and set remote
        const pc = createPeer();

        // set remote offer
        await pc.setRemoteDescription(data.offer);

        // show incoming UI (do not auto getUserMedia until user accepts)
        setIncoming(true);
      } catch (err) {
        console.error("handle incoming offer failed", err);
      }
    };

    const onAnswer = async (data: any) => {
      try {
        if (!data || !data.answer) return;
        if (!pcRef.current) {
          console.warn("Received answer but no peer exist");
          return;
        }
        // set remote desc
        await pcRef.current.setRemoteDescription(data.answer);
        // now we are in call
        setRinging(false);
        setInCall(true);
        startTimer();
      } catch (err) {
        console.error("handle answer failed", err);
      }
    };

    const onCandidate = async (data: any) => {
      try {
        if (!data || !data.candidate) return;
        if (!pcRef.current) return;
        await pcRef.current.addIceCandidate(data.candidate);
      } catch (err) {
        console.warn("addIceCandidate failed", err);
      }
    };

    const onHangup = (data: any) => {
      // peer hung up or call rejected
      cleanupPeer();
    };

    socket.on("call_offer", onOffer);
    socket.on("call_answer", onAnswer);
    socket.on("call_ice_candidate", onCandidate);
    socket.on("call_hangup", onHangup);

    return () => {
      socket.off("call_offer", onOffer);
      socket.off("call_answer", onAnswer);
      socket.off("call_ice_candidate", onCandidate);
      socket.off("call_hangup", onHangup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, rideId]);

  // When user accepts an incoming call we must create answer and send it
  useEffect(() => {
    if (!incoming || !pcRef.current) return;
    // create answer flow when user triggers acceptIncoming()
    // the flow: acceptIncoming() creates local tracks and pc; the remote offer already set in onOffer
    // so here we wait: when local tracks added, createAnswer and setLocalDescription + emit
    const tryCreateAnswer = async () => {
      try {
        // localStreamRef should be set by acceptIncoming
        if (!pcRef.current || !pcRef.current.remoteDescription) return;
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        if (socket && rideId) {
          socket.emit("call_answer", { rideId, answer });
        }
        setIncoming(false);
        setInCall(true);
        startTimer();
      } catch (err) {
        console.error("createAnswer failed", err);
      }
    };

    // small delay to let acceptIncoming perform getUserMedia and tracks add
    // If user hasn't called acceptIncoming, don't auto answer.
    const t = setTimeout(() => tryCreateAnswer(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  // when pc becomes remote-connected we should flip states -- handled in onAnswer and onOffer flows

  // cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPeer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // actions
    startCall,
    hangup,
    acceptIncoming,
    rejectIncoming,
    toggleMute,
    // state
    state: {
      incoming,
      ringing,
      inCall,
      connecting,
      muted,
      caller,
    },
    timer: {
      timerSec,
    },
  };
}
