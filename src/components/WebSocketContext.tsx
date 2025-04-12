"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

// Define the shape of the context value
interface WebSocketContextType {
  onlineUserIds: Set<string>;
  chatSocket: WebSocket | null;
  isChatConnected: boolean;
}

// Create the context with a default value
const WebSocketContext = createContext<WebSocketContextType>({
  onlineUserIds: new Set(),
  chatSocket: null,
  isChatConnected: false,
});

// Provider component
interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [chatSocket, setChatSocket] = useState<WebSocket | null>(null);
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  useEffect(() => {
    // Listen for token changes in localStorage
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let statusWs: WebSocket | null = null;
    let chatWs: WebSocket | null = null;

    const connectWebSockets = () => {
      if (!token) {
        console.log("No token available, skipping WebSocket connections");
        return;
      }

      const queryToken = `?${token}`;

      // Online Status WebSocket
      statusWs = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/chat/onlineStatus${queryToken}`
      );

      statusWs.onopen = () => {
        console.log("✅ Online status WebSocket connected");
      };

      statusWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setOnlineUserIds(new Set(data.onlineUsersId));
        } catch (err) {
          console.error("Error parsing status WebSocket message:", err);
        }
      };

      statusWs.onerror = (error) => {
        console.error("❌ Status WebSocket error:", error);
      };

      statusWs.onclose = () => {
        console.warn("⚠️ Status WebSocket closed");
        setTimeout(connectWebSockets, 3000); // Reconnect after 3 seconds
      };

      // Chat WebSocket
      chatWs = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/chat${queryToken}`
      );

      chatWs.onopen = () => {
        console.log("✅ Chat WebSocket connected");
        setIsChatConnected(true);
      };

      chatWs.onmessage = (event) => {
        console.log("📩 Chat message received:", event.data);
        // You can add additional logic here if needed
      };

      chatWs.onerror = (error) => {
        console.error("❌ Chat WebSocket error:", error);
        setIsChatConnected(false);
      };

      chatWs.onclose = () => {
        console.warn("⚠️ Chat WebSocket closed");
        setIsChatConnected(false);
        setTimeout(connectWebSockets, 3000); // Reconnect after 3 seconds
      };

      setChatSocket(chatWs);
    };

    if (token) {
      connectWebSockets();
    }

    return () => {
      if (statusWs) {
        statusWs.close();
      }
      if (chatWs) {
        chatWs.close();
        setIsChatConnected(false);
      }
      setChatSocket(null);
    };
  }, [token]);

  return (
    <WebSocketContext.Provider
      value={{ onlineUserIds, chatSocket, isChatConnected }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use the context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
