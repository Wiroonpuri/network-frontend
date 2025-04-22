"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, User, Send, ReplyAll } from "lucide-react";
import { useWebSocket } from "@/components/WebSocketContext";
import { Pin } from "lucide-react";
import { PinnedMessagePanel } from "./pinned-message-panel";

interface Message {
  id: string;
  ownerId: string;
  chatId: string;
  content: string;
  timestamp: string;
  name?: string;

  replyTo?: string;
}

interface User {
  uid: string;
  name: string;
  avatar?: string;
}

interface ChatWindowProps {
  currentUser: { uid: string; name: string; avatar?: string };
  chat: { id: string; name: string; avatar?: string; members?: string[] };
  isGroupChat: boolean;
}

export function ChatWindow({
  currentUser,
  chat,
  isGroupChat,
}: ChatWindowProps) {
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatSocket, isChatConnected, onlineUserIds } = useWebSocket();
  const [showPinned, setShowPinned] = useState(false);
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(
    null
  );
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!chat.id) return;

    console.log("Current user:", currentUser);
    console.log("Chat props:", chat);
    console.log("Is group chat:", isGroupChat);
    console.log("Token:", localStorage.getItem("token"));

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (res.ok) {
          const userData: User[] = await res.json();
          setUsers(userData);
          console.log("Users fetched:", userData);
        } else {
          console.error("Failed to fetch users:", res.status, await res.text());
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const fetchPrivateChatId = async () => {
      if (isGroupChat) {
        setChatId(chat.id);
        console.log("Group chatId set:", chat.id);
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/private/${chat.id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setChatId(data.chatId);
          console.log(
            "Private chatId fetched:",
            data.chatId,
            "Response:",
            data
          );
        } else {
          console.error(
            "Failed to fetch private chat ID:",
            res.status,
            await res.text()
          );
        }
      } catch (error) {
        console.error("Error fetching private chat ID:", error);
      }
    };

    fetchUsers();
    fetchPrivateChatId();
  }, [chat.id, isGroupChat]);

  useEffect(() => {
    if (!chatId) return;

    const fetchPinnedMessage = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found");
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/pin/${chatId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.ok) {
          const fetchedPinnedMessage = await res.json();
          setPinnedMessages(fetchedPinnedMessage);
          console.log("✅ Message fetch pinned message!");
        } else {
          console.error(
            "❌ Failed to fetch pinned message:",
            res.status,
            await res.text()
          );
        }
      } catch (err) {
        console.error("❌ Error to fetch pinned message:", err);
        setError("Error to fetch pinned message");
      }
    };
    const fetchChatHistory = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/history/${chatId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (res.ok) {
          const history = await res.json();
          const formattedMessages = history.map((msg: any, index: number) => ({
            id: msg.id || `${chatId}-${index}`,
            ownerId: msg.ownerId,
            chatId: msg.chatId || chatId,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            replyTo: msg.replyTo,
            name: msg.name,
          }));
          setMessages(formattedMessages);
          console.log("Chat history fetched:", formattedMessages);
        } else {
          console.error(
            "Failed to fetch chat history:",
            res.status,
            await res.text()
          );
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
    fetchPinnedMessage();
    // Fallback polling if WebSocket is not connected
    const interval = !isChatConnected
      ? setInterval(fetchChatHistory, 5000)
      : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [chatId, isChatConnected]);

  useEffect(() => {
    if (!chatSocket || !isChatConnected || !chatId) {
      console.log("WebSocket not ready:", {
        chatSocket: !!chatSocket,
        isChatConnected,
        chatId,
      });
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("Received WebSocket message:", msg);

        // Validate message structure
        if (!msg.content || !msg.ownerId || !msg.timestamp || !msg.chatId) {
          console.warn("Invalid message format:", msg);
          return;
        }

        // Debug all chatIds
        console.log("WebSocket chatId debug:", {
          wsChatId: msg.chatId,
          currentChatId: chatId,
        });

        // Check if message belongs to this chat
        const isRelevantMessage = msg.chatId === chatId;

        console.log("Message relevance check:", {
          receivedChatId: msg.chatId,
          currentChatId: chatId,
          isRelevant: isRelevantMessage,
          isGroupChat,
          ownerId: msg.ownerId,
          currentUserId: currentUser.uid,
          chatIdFromProps: chat.id,
        });

        if (isRelevantMessage) {
          const newMessage: Message = {
            id: msg.id || `${Date.now()}`,
            ownerId: msg.ownerId,
            chatId: msg.chatId,
            content: msg.content,
            timestamp: msg.timestamp,
            replyTo: msg.replyTo,
            name: msg.name || getUserById(msg.ownerId).name,
          };

          setMessages((prev) => {
            const alreadyExists = prev.some((m) => m.id === newMessage.id);
            if (alreadyExists) {
              console.log("Duplicate message (same ID), skip:", newMessage);
              return prev;
            }
          
            const isOptimisticMatch = prev.some(
              (m) =>
                m.content === newMessage.content &&
                m.ownerId === newMessage.ownerId &&
                Math.abs(
                  new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()
                ) < 2000
            );
          
            if (isOptimisticMatch) {
              console.log("Replacing optimistic message:", newMessage);
              return prev.map((m) =>
                m.content === newMessage.content &&
                m.ownerId === newMessage.ownerId &&
                Math.abs(
                  new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()
                ) < 2000
                  ? newMessage
                  : m
              );
            }
            console.log("Adding new message:", newMessage);
            return [...prev, newMessage];
          });
        }
      } catch (err) {
        console.error(
          "Error parsing WebSocket message:",
          err,
          "Raw data:",
          event.data
        );
      }
    };

    chatSocket.onmessage = handleMessage;

    return () => {
      chatSocket.onmessage = null;
    };
  }, [
    chatSocket,
    isChatConnected,
    chatId,
    currentUser.uid,
    chat.id,
    isGroupChat,
    users,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const createPinnedMessage = async (message: Message) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/pin/${message.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        console.log("✅ Message pinned!");
      } else {
        console.error(
          "❌ Failed to pin message:",
          res.status,
          await res.text()
        );
      }
    } catch (err) {
      console.error("❌ Error pinning message:", err);
      setError("Error to pin message");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !chatSocket || !isChatConnected || !chatId) {
      console.warn("Cannot send message:", {
        message: newMessage.trim(),
        chatSocket: !!chatSocket,
        isChatConnected,
        chatId,
      });
      return;
    }

    const message = {
      chatId,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      replyTo: replyTo?.id,
    };

    try {
      chatSocket.send(JSON.stringify(message));
      console.log("Sent message:", message);

      // Optimistically add message to UI
      const optimisticMessage: Message = {
        id: `${Date.now()}`,
        ownerId: currentUser.uid,
        chatId,
        content: newMessage.trim(),
        timestamp: message.timestamp,
        name: currentUser.name,
        replyTo: replyTo || undefined,
      };
      setReplyTo(null);
      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const getUserById = (userId: string): User => {
    return (
      users.find((user) => user.uid === userId) || {
        uid: userId,
        name: "Unknown",
        avatar: "",
      }
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const groupedMessages: { [date: string]: Message[] } = {};
  messages.forEach((message) => {
    const date = formatDate(message.timestamp);
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });

  const isChatOnline = !isGroupChat && onlineUserIds.has(chat.id);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center space-x-3 shrink-0">
        {isGroupChat ? (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-semibold">{chat.name}</h2>
          <p className="text-xs text-gray-500">
            {isGroupChat
              ? `${chat.members?.length || 0} members`
              : isChatOnline
              ? "Online"
              : "Offline"}
            {!isChatConnected && " (Disconnected)"}
          </p>
        </div>
        <div className="relative inline-block">
          <Pin
            className="h-5 w-5 text-gray-400 cursor-pointer"
            onClick={() => setShowPinned((prev) => !prev)}
          />

          {showPinned && (
            <div className="absolute right-0 mt-2 z-50 p-10">
              <PinnedMessagePanel pinnedMessages={pinnedMessages} />
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea
        className="flex-1 p-4 overscroll-contain"
        style={{ contain: "strict" }}
      >
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p className="mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="mb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                  {date}
                </div>
              </div>

              {dateMessages.map((message) => {
                const isCurrentUser = message.ownerId === currentUser.uid;
                const sender = getUserById(message.ownerId);
                const repliedMessage = message.replyTo
                  ? messages.find((m) => m.id === message.replyTo)
                  : null;

                return (
                  <div
                    key={message.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuMessage(message);
                      setContextMenuPosition({ x: e.clientX, y: e.clientY });
                    }}
                    className={`flex mb-4 ${
                      isCurrentUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isCurrentUser && (
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={sender.avatar} alt={sender.name} />
                        <AvatarFallback>
                          {sender.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`max-w-[70%] ${
                        isCurrentUser ? "order-1" : "order-2"
                      }`}
                    >
                      {isGroupChat && !isCurrentUser && (
                        <p className="text-xs text-gray-500 mb-1">
                          {sender.name}
                        </p>
                      )}

                      <div
                        className={`p-3 rounded-lg ${
                          isCurrentUser
                            ? "bg-primary text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-800 rounded-tl-none"
                        }`}
                      >
                        {message.replyTo && (
                          <div className="text-xs italic text-gray-500 mb-1 border-l-2 pl-2 border-gray-300">
                            Replying to {repliedMessage?.name || "Unknown"}: "
                            {repliedMessage?.content}"
                          </div>
                        )}

                        <p>{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isCurrentUser ? "text-primary-50" : "text-gray-500"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>

                    {isCurrentUser && (
                      <Avatar className="h-8 w-8 ml-2">
                        <AvatarImage
                          src={currentUser.avatar}
                          alt={currentUser.name}
                        />
                        <AvatarFallback>
                          {currentUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {replyTo && (
        <div className="px-4 pt-2 pb-1 bg-gray-100 border-t text-sm text-gray-700 flex justify-between items-center">
          <div>
            Replying to <strong>{replyTo.name || "Unknown"}</strong>: "
            {replyTo.content}"
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-xs text-blue-500 hover:underline ml-4"
          >
            Cancel
          </button>
        </div>
      )}
      {contextMenuMessage && contextMenuPosition && (
        <div
          className="absolute bg-white border rounded shadow-md z-50 text-sm"
          style={{
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
          }}
          onMouseLeave={() => {
            setContextMenuMessage(null);
            setContextMenuPosition(null);
          }}
        >
          <button
            className="block px-4 py-2 hover:bg-gray-100 w-full text-left"
            onClick={() => {
              setReplyTo(contextMenuMessage); // ✅ reply
              setContextMenuMessage(null);
              setContextMenuPosition(null);
            }}
          >
            Reply to message
          </button>
          <button
            className="block px-4 py-2 hover:bg-gray-100 w-full text-left"
            onClick={() => {
              if (contextMenuMessage) {
                createPinnedMessage(contextMenuMessage);
              }
              setContextMenuMessage(null);
              setContextMenuPosition(null);
            }}
          >
            Pin message
          </button>
        </div>
      )}

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t flex items-center space-x-2 shrink-0"
        onWheel={(e) => e.stopPropagation()}
      >
        <Input
          placeholder={`Message ${chat.name}...`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
          disabled={!isChatConnected}
        />
        <Button type="submit" size="icon" disabled={!isChatConnected}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
