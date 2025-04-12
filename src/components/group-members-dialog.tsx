"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  uid: string;
  name: string;
}

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberIds: string[];
  users: User[];
}

export function GroupMembersDialog({
  open,
  onOpenChange,
  memberIds,
  users,
}: GroupMembersDialogProps) {
  // Map member IDs to user objects, filter out any missing users
  const members = memberIds
    .map((id) => users.find((user) => user.uid === id))
    .filter((user): user is User => !!user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group Members</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-60">
          {members.length === 0 ? (
            <div className="py-4 text-center text-gray-500">
              No members found
            </div>
          ) : (
            <ul className="space-y-2 p-4">
              {members.map((member) => (
                <li
                  key={member.uid}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span>{member.name}</span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
