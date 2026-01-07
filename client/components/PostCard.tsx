type PostProps = {
  post: {
    _id: string;
    content?: string;
    image?: string;
    tags?: string[];
  };
};

export default function PostCard({ post }: PostProps) {
  return (
    <div className="border p-4 rounded bg-white">
      <p>{post.content}</p>

      {post.image && (
        <img
          src={post.image}
          alt="post"
          className="mt-2 max-h-64 rounded"
        />
      )}

      {post.tags && (
        <div className="mt-2 text-blue-600">
          {post.tags.map(tag => `#${tag} `)}
        </div>
      )}
    </div>
  );
}

