"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch } from "../lib/api";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // initial unread count
    apiFetch("/api/notifications/unread")
      .then(r => r.json())
      .then(d => setCount(d.count))
      .catch(console.error);

    const socket: Socket = io(
      process.env.NEXT_PUBLIC_API_URL as string
    );

    socket.on("notification", () => {
      setCount(c => c + 1);
    });

    // ✅ cleanup MUST return void
    return () => {
      socket.off("notification");
      socket.disconnect();
    };
  }, []);

  return (
    <button className="relative">
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
          {count}
        </span>
      )}
    </button>
  );
}

