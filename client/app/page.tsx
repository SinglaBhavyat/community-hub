"use client";

import { useEffect, useState } from "react";
import PostCard from "../components/PostCard";
import { apiFetch } from "../lib/api";

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/posts")
      .then(r => r.json())
      .then(setPosts)
      .catch(() => setError("Failed to load feed"));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Community Feed</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {posts.length === 0 && !error && <p>No posts yet 👀</p>}

      {posts.map((post: any) => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
}
