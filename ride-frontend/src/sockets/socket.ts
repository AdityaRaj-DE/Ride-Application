import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (riderId: string) => {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3004";
    socket = io(socketUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("🔌 Rider socket connected:", socket?.id);
      socket.emit("join", { type: "rider", id: riderId });
    });

    socket.on("disconnect", () => {
      console.log("❌ Rider socket disconnected");
    });
  }

  return socket;
};
