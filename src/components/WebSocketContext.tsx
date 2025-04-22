"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";

interface WebSocketContextType {
  onlineUserIds: Set<string>;
  chatSocket: WebSocket | null;
  groupChatSocket: WebSocket | null;
  groupChatSocketData: any;
  isChatConnected: boolean;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  onlineUserIds: new Set(),
  chatSocket: null,
  groupChatSocket: null,
  groupChatSocketData: null,
  isChatConnected: false,
  disconnect: () => {},
});

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [chatSocket, setChatSocket] = useState<WebSocket | null>(null);
  const [groupChatSocket, setGroupChatSocket] = useState<WebSocket | null>(
    null
  );
  const [groupChatSocketData, setGroupChatSocketData] = useState<any>(null);
  const [statusSocket, setStatusSocket] = useState<WebSocket | null>(null);
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [shouldReconnect, setShouldReconnect] = useState(true);
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );

  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const disconnect = () => {
    console.log("🔌 Disconnecting WebSockets");
    setShouldReconnect(false);
    setToken(null);
    if (statusSocket) {
      statusSocket.close();
      setStatusSocket(null);
    }

    if (chatSocket) {
      chatSocket.close();
      setChatSocket(null);
    }

    if (groupChatSocket) {
      groupChatSocket.close();
      setGroupChatSocket(null);
    }

    setIsChatConnected(false);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedToken = localStorage.getItem("token");
      console.log("📦 Storage changed, token:", updatedToken);
      setToken(updatedToken);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout | null = null;
    const connectWebSockets = () => {
      console.log(`------------------------${shouldReconnect}`);
      if (!tokenRef.current || !shouldReconnect) {
        console.log(
          "🚫 Skipping WebSocket connection - token:",
          token,
          "shouldReconnect:",
          shouldReconnect
        );
        return;
      }

      console.log("🔗 Attempting WebSocket connections with token:", token);
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
        if (shouldReconnect && token) {
          console.log("🔄 Scheduling reconnect for status WebSocket");
          reconnectTimeout = setTimeout(connectWebSockets, 3000);
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
        if (shouldReconnect && token) {
          console.log("🔄 Scheduling reconnect for chat WebSocket");
          reconnectTimeout = setTimeout(connectWebSockets, 3000);
        }
      };

      // --- Group Chat WebSocket ---
      const groupChatWs = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/chat/groupCreate${queryToken}`
      );
      setGroupChatSocket(groupChatWs);

      groupChatWs.onopen = () => {
        console.log("✅ Group chat WebSocket connected");
      };

      groupChatWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📩 Parsed group chat message:", data);
          setGroupChatSocketData(data);
        } catch (err) {
          console.error("❌ Failed to parse group chat message:", err);
        }
      };

      groupChatWs.onerror = (error) => {
        console.error("❌ Group chat WebSocket error:", error);
      };

      groupChatWs.onclose = () => {
        console.warn("⚠️ Group chat WebSocket closed");
        if (shouldReconnect && token) {
          console.log("🔄 Scheduling reconnect for group chat WebSocket");
          reconnectTimeout = setTimeout(connectWebSockets, 3000);
        }
      };
    };

    if (token && shouldReconnect) {
      console.log("🟢 Starting WebSocket connections");
      connectWebSockets();
    } else {
      console.log(
        "🔴 WebSocket connections not started - token:",
        token,
        "shouldReconnect:",
        shouldReconnect
      );
    }

    return () => {
      console.log("🧹 Cleaning up WebSocket connections");
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      disconnect();
    };
  }, [token, shouldReconnect]);

  return (
    <WebSocketContext.Provider
      value={{
        onlineUserIds,
        chatSocket,
        groupChatSocket,
        groupChatSocketData,
        isChatConnected,
        disconnect,
      }}
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
