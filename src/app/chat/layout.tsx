import { ReactNode } from "react";
import { WebSocketProvider } from "@/components/WebSocketContext";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <WebSocketProvider>{children}</WebSocketProvider>;
}
