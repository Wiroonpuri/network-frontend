"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface WebSocketContextType {
  onlineUserIds: Set<string>;
  chatSocket: WebSocket | null;
  isChatConnected: boolean;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  onlineUserIds: new Set(),
  chatSocket: null,
  isChatConnected: false,
  disconnect: () => {},
});

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [chatSocket, setChatSocket] = useState<WebSocket | null>(null);
  const [statusSocket, setStatusSocket] = useState<WebSocket | null>(null);
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [shouldReconnect, setShouldReconnect] = useState(true);
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );

  const disconnect = () => {
    console.log("🔌 Disconnecting WebSockets");
    setShouldReconnect(false);

    if (statusSocket) {
      statusSocket.close();
      setStatusSocket(null);
    }

    if (chatSocket) {
      chatSocket.close();
      setChatSocket(null);
    }

    setIsChatConnected(false);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedToken = localStorage.getItem("token");
      setToken(updatedToken);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const connectWebSockets = () => {
      if (!token) {
        console.log("No token found, skipping WebSocket connection");
        return;
      }

      setShouldReconnect(true);
      const queryToken = `?${token}`;

      // --- Status WebSocket ---
      const statusWs = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/chat/onlineStatus${queryToken}`
      );
      setStatusSocket(statusWs);

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
        if (shouldReconnect) {
          setTimeout(connectWebSockets, 3000);
        }
      };

      // --- Chat WebSocket ---
      const chatWs = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/chat${queryToken}`
      );
      setChatSocket(chatWs);

      chatWs.onopen = () => {
        console.log("✅ Chat WebSocket connected");
        setIsChatConnected(true);
      };

      chatWs.onmessage = (event) => {
        console.log("📩 Chat message received:", event.data);
      };

      chatWs.onerror = (error) => {
        console.error("❌ Chat WebSocket error:", error);
        setIsChatConnected(false);
      };

      chatWs.onclose = () => {
        console.warn("⚠️ Chat WebSocket closed");
        setIsChatConnected(false);
        if (shouldReconnect) {
          setTimeout(connectWebSockets, 3000);
        }
      };
    };

    if (token) {
      connectWebSockets();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <WebSocketContext.Provider
      value={{ onlineUserIds, chatSocket, isChatConnected, disconnect }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
