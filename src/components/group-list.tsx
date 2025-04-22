"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupMembersDialog } from "@/components/group-members-dialog";
import { useWebSocket } from "@/components/WebSocketContext";

interface Group {
  id: string;
  chatName: string;
  allowedUser: string[];
}

interface User {
  uid: string;
  name: string;
}

interface GroupListProps {
  currentUserId: string;
  onSelectGroup: (group: Group) => void;
  selectedGroupId: string | null;
}

export function GroupList({
  currentUserId,
  onSelectGroup,
  selectedGroupId,
}: GroupListProps) {
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [unjoinedGroups, setUnjoinedGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<
    string[] | null
  >(null);

  const { groupChatSocket } = useWebSocket();

  // Helper function to truncate group name
  const truncateGroupName = (name: string, maxLength: number = 10) => {
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }

    const fetchGroups = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/group`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.ok) {
          const allGroups: Group[] = await res.json();
          const userJoinedGroups = allGroups.filter((group) =>
            group.allowedUser.includes(currentUserId)
          );
          const userUnjoinedGroups = allGroups.filter(
            (group) => !group.allowedUser.includes(currentUserId)
          );
          setJoinedGroups(userJoinedGroups);
          setUnjoinedGroups(userUnjoinedGroups);
          console.log("Joined groups:", userJoinedGroups);
          console.log("Unjoined groups:", userUnjoinedGroups);
        } else {
          console.error(
            "Failed to fetch groups:",
            res.status,
            await res.text()
          );
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const userData: User[] = await res.json();
          setUsers(userData);
          console.log("Users fetched successfully:", userData);
        } else {
          console.error("Failed to fetch users:", res.status, await res.text());
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchGroups();
    fetchUsers();

    const interval = setInterval(() => {
      fetchGroups();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUserId]);

  useEffect(() => {
    if (!groupChatSocket) return;

    const handleNewGroup = (event: MessageEvent) => {
      try {
        const newGroup: Group = JSON.parse(event.data);
        if (newGroup.allowedUser.includes(currentUserId)) {
          setJoinedGroups((prev) => [...prev, newGroup]);
        } else {
          setUnjoinedGroups((prev) => [...prev, newGroup]);
        }
      } catch (err) {
        console.error("Error parsing new group:", err);
      }
    };

    groupChatSocket.addEventListener("message", handleNewGroup);

    return () => {
      groupChatSocket.removeEventListener("message", handleNewGroup);
    };
  }, [groupChatSocket, currentUserId]);

  const handleJoinGroup = async (groupId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/group/join/${groupId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.ok) {
        const allGroupsRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/group`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (allGroupsRes.ok) {
          const allGroups: Group[] = await allGroupsRes.json();
          setJoinedGroups(
            allGroups.filter((group) =>
              group.allowedUser.includes(currentUserId)
            )
          );
          setUnjoinedGroups(
            allGroups.filter(
              (group) => !group.allowedUser.includes(currentUserId)
            )
          );
          console.log(`Successfully joined group ${groupId}`);
        }
      } else {
        console.error("Failed to join group:", res.status, await res.text());
      }
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  const getMemberCount = (members: string[]) => {
    return members.length;
  };

  const handleShowMembers = (memberIds: string[]) => {
    setSelectedGroupMembers(memberIds);
  };

  return (
    <div className="py-2 w-[320px]">
      {/* Joined Groups Section */}
      <div className="px-4 py-2 text-sm font-medium text-gray-500">
        Your Groups ({joinedGroups.length})
      </div>

      {joinedGroups.length === 0 ? (
        <div className="flex flex-col px-4 py-8 items-center text-gray-500">
          <p>No groups joined.</p>
          <p>Join or create one to get started!</p>
        </div>
      ) : (
        <ul>
          {joinedGroups.map((group) => (
            <li
              key={group.id}
              className={`px-4 py-3 flex items-center space-x-3 cursor-pointer hover:bg-gray-100 transition-colors ${
                selectedGroupId === group.id ? "bg-gray-100" : ""
              }`}
              onClick={() => onSelectGroup(group)}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {truncateGroupName(group.chatName)}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-xs cursor-pointer"
                onClick={() => handleShowMembers(group.allowedUser)}
              >
                {getMemberCount(group.allowedUser)} members
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {/* Unjoined Groups Section */}
      <div className="px-4 py-2 mt-4 text-sm font-medium text-gray-500">
        Available Groups ({unjoinedGroups.length})
      </div>

      {unjoinedGroups.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500">
          No available groups to join.
        </div>
      ) : (
        <ul>
          {unjoinedGroups.map((group) => (
            <li
              key={group.id}
              className="px-4 py-3 flex flex-col gap-[10px] hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-[10px]">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {truncateGroupName(group.chatName)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer"
                  onClick={() => handleShowMembers(group.allowedUser)}
                >
                  {getMemberCount(group.allowedUser)} members
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleJoinGroup(group.id)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Join
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedGroupMembers && (
        <GroupMembersDialog
          open={!!selectedGroupMembers}
          onOpenChange={() => setSelectedGroupMembers(null)}
          memberIds={selectedGroupMembers}
          users={users}
        />
      )}
    </div>
  );
}
