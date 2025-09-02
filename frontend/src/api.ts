const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "your-secret-token";

function authHeaders(extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    ...extra,
  };
}

export async function fetchUrls() {
  const res = await fetch(`${API_BASE_URL}/urls`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch URLs: ${res.status}`);
  return res.json();
}

export async function mutateUrl({ url }: { url: string }) {
  const res = await fetch(`${API_BASE_URL}/crawl`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Failed to submit URL: ${res.status}`);
  return res.json();
}
