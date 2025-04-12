"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserList } from "@/components/user-list";
import { ChatWindow } from "@/components/chat-window";
import { GroupList } from "@/components/group-list";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { LogoutDialog } from "@/components/logout-dialog";
import { Users, User, MessageSquare, LogOut, Plus } from "lucide-react";

interface User {
  uid: string;
  name: string;
  avatar?: string;
}

interface Group {
  id: string;
  chatName: string; // Changed from 'name' to match backend
  allowedUser: string[]; // Changed from 'members' to match backend
  createdBy?: string; // Optional, as not guaranteed in response
  createdAt?: string; // Optional, as not guaranteed in response
}

interface Chat {
  id: string;
  name: string; // Kept as 'name' for UI consistency
  avatar?: string;
  members?: string[]; // Kept as 'members' for UI consistency
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");
      const uid = localStorage.getItem("uid");

      if (!token || !uid) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const users: User[] = await res.json();
          const user = users.find((u) => u.uid === uid);
          if (user) {
            setCurrentUser(user);
          } else {
            console.error("User not found in backend response");
            router.push("/login");
          }
        } else {
          console.error("Failed to fetch users:", res.status);
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        router.push("/login");
      }
    };

    fetchCurrentUser();
  }, [router]);

  const handleSelectUser = (user: User) => {
    setSelectedChat({
      id: user.uid,
      name: user.name,
      avatar: user.avatar,
    });
    setIsGroupChat(false);
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedChat({
      id: group.id,
      name: group.chatName, // Map 'chatName' to 'name'
      members: group.allowedUser, // Map 'allowedUser' to 'members'
    });
    setIsGroupChat(true);
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">ChatApp</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCreateGroupOpen(true)}
              title="Create Group"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLogoutDialogOpen(true)}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-2 mx-4 mt-2">
            <TabsTrigger value="users" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>Groups</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="flex-1 p-0 m-0">
            <ScrollArea className="h-full">
              <UserList
                currentUserId={currentUser.uid}
                onSelectUser={handleSelectUser}
                selectedUserId={!isGroupChat ? selectedChat?.id ?? null : null}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="groups" className="flex-1 p-0 m-0">
            <ScrollArea className="h-full">
              <GroupList
                currentUserId={currentUser.uid}
                onSelectGroup={handleSelectGroup}
                selectedGroupId={isGroupChat ? selectedChat?.id ?? null : null}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator />
        <div className="p-4 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{currentUser.name}</p>
            <p className="text-xs text-green-500">Online</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatWindow
            currentUser={currentUser}
            chat={selectedChat}
            isGroupChat={isGroupChat}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="h-16 w-16 mb-4" />
            <h2 className="text-xl font-medium mb-2">Welcome to ChatApp</h2>
            <p>Select a user or group to start chatting</p>
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        currentUserId={currentUser.uid}
      />

      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        currentUserId={currentUser.uid}
      />
    </div>
  );
}
