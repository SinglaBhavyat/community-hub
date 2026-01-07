
"use client";
import Link from "next/link";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  return (
    <nav className="flex gap-4 border-b p-4">
      <Link href="/">Feed</Link>
      <Link href="/chat">Chat</Link>
      <Link href="/notifications">Notifications</Link>
      <Link href="/admin">Admin</Link>
      <NotificationBell />
    </nav>
  );
}
