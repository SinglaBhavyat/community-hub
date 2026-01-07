
export async function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(process.env.NEXT_PUBLIC_API_URL + path, {
    credentials: "include",
    ...options
  });
}
