import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/components/WebSocketContext";

interface User {
  uid: string;
  name: string;
}

interface UserListProps {
  currentUserId: string;
  selectedUserId: string | null;
  onSelectUser: (user: User) => void;
}

export function UserList({
  currentUserId,
  selectedUserId,
  onSelectUser,
}: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const { onlineUserIds } = useWebSocket();
  const router = useRouter();

  // Helper function to truncate user name
  const truncateUserName = (name: string, maxLength: number = 10) => {
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user`);
        const allUsers: User[] = await res.json();
        const filtered = allUsers.filter((user) => user.uid !== currentUserId);
        setUsers(filtered);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);

    return () => clearInterval(interval);
  }, [currentUserId]);

  return (
    <div className="py-2">
      <div className="px-4 py-2 text-sm font-medium text-gray-500">
        All Users ({users.length})
      </div>
      {users.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500">
          No other users found
        </div>
      ) : (
        <ul>
          {users.map((user) => {
            const isOnline = onlineUserIds.has(user.uid);
            return (
              <li
                key={user.uid}
                className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors ${
                  selectedUserId === user.uid ? "bg-gray-100" : ""
                }`}
                onClick={() => onSelectUser(user)}
              >
                <div>
                  <p className="font-medium">{truncateUserName(user.name)}</p>
                  <p className="text-xs text-gray-500">
                    {isOnline ? "Online" : "Offline"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      isOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                  ></span>
                  <Badge variant="outline" className="text-xs">
                    Direct Message
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
