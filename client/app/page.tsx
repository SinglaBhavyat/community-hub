
import PostCard from "../components/PostCard";
import { apiFetch } from "../lib/api";

export default async function Home() {
  const posts = await apiFetch("/api/posts").then(r => r.json());
  return posts.map((p: any) => <PostCard key={p._id} post={p} />);
}
