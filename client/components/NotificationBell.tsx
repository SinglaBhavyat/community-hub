
"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { apiFetch } from "@/lib/api";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    apiFetch("/api/notifications/unread")
      .then(r => r.json())
      .then(d => setCount(d.count));

    const socket = io(process.env.NEXT_PUBLIC_API_URL!, { withCredentials: true });
    socket.on("notification", () => setCount(c => c + 1));
    return () => socket.disconnect();
  }, []);

  return <span>🔔 {count}</span>;
}
