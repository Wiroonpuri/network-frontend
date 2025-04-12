"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  currentUserId,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");

  const handleCreateGroup = async () => {
    // Validate form
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found");
        return;
      }

      // Create group via backend
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL
        }/chat/group?chatName=${encodeURIComponent(groupName.trim())}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        // Close dialog on success
        onOpenChange(false);
      } else {
        const errorText = await res.text();
        setError(`Failed to create group: ${errorText}`);
      }
    } catch (err) {
      setError("Error creating group");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a group chat open to all users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setError(""); // Clear error on input change
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateGroup}>Create Group</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
