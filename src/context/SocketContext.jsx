import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

const SocketContext = createContext(null);

export const getSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      transports: ['websocket', 'polling'],
      timeout: 45000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      allowEIO3: true
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("⚠️ Socket disconnected:", reason);
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};