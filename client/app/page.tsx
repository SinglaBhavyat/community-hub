"use client";

import { useEffect, useState } from "react";
import PostCard from "../components/PostCard";
import { apiFetch } from "../lib/api";

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/posts")
      .then(r => r.json())
      .then(setPosts)
      .catch(console.error);
  }, []);

  return (
    <main>
      {posts.map(p => (
        <PostCard key={p._id} post={p} />
      ))}
    </main>
  );
}
