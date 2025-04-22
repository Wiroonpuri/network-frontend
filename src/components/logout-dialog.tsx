"use client";

import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWebSocket } from "./WebSocketContext";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

export function LogoutDialog({
  open,
  onOpenChange,
  currentUserId,
}: LogoutDialogProps) {
  const router = useRouter();
  const { disconnect } = useWebSocket();

  const handleLogout = () => {
    // Update user status to offline
    console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxx");
    disconnect();

    // Clear token from localStorage
    localStorage.removeItem("token");

    // Update user status in localStorage
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const updatedUsers = users.map((u: any) =>
      u.id === currentUserId ? { ...u, status: "offline" } : u
    );
    localStorage.setItem("users", JSON.stringify(updatedUsers));

    // Clear user cookie
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // Redirect to login page
    router.push("/login");
    router.refresh();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out of your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
