"use client";

import { Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
interface Message {
  id: string;
  ownerId: string;
  chatId: string;
  content: string;
  timestamp: string;
  name?: string;

  replyTo?: string;
}

export function PinnedMessagePanel({
  pinnedMessages,
}: {
  pinnedMessages: Message[];
}) {
  if (pinnedMessages.length === 0) return null;

  return (
    <div className="bg-[#1e1f22] rounded-md shadow-md p-4 w-[320px]">
      <div className="flex items-center space-x-2 mb-3">
        <Pin className="h-5 w-5 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-200">Pinned Messages</h2>
      </div>

      {pinnedMessages.map((msg) => (
        <div
          key={msg.id}
          className="bg-[#2b2d31] border border-[#36393f] rounded-md p-3 mb-3"
        >
          <div className="flex items-center space-x-2 mb-1">
            <Avatar className="h-8 w-8 mr-2 text-black">
              <AvatarImage src={msg.avatar} alt={msg.name} />
              <AvatarFallback>
                {msg.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-white">{msg.name}</span>
            <span className="text-xs text-gray-400">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="text-sm text-gray-300">{msg.content}</p>
        </div>
      ))}
    </div>
  );
}
