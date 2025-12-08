// services/socket.ts
import { io } from "socket.io-client";

let socket: any = null;

export const connectSocket = () => {
  if (socket) return socket;

  const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3004";
  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    withCredentials:true,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
  });

  socket.on("connect_error", (err: any) => {
    console.error("Socket connection error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;
