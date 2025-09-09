// context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

const SocketContext = createContext(null);

export const getSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      reconnection: true,            // enable auto-reconnect
      reconnectionAttempts: Infinity, // retry forever
      reconnectionDelay: 2000,       // 2s start
      reconnectionDelayMax: 10000,   // cap at 10s
      timeout: 20000,                // connection timeout
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    // Lifecycle logs (optional but useful for debugging)
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
    });

    newSocket.io.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Reconnecting attempt ${attempt}...`);
    });

    newSocket.io.on("reconnect", (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
    });

    newSocket.io.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed. Still retrying...");
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
