export async function fetchUrls() {
  const res = await fetch('http://localhost:8081/urls', {
    headers: {
      Authorization: 'Bearer your-secret-token',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch URLs');
  return res.json();
}

export async function mutateUrl({ url }: { url: string }) {
  const res = await fetch('http://localhost:8081/crawl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer your-secret-token',
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error('Failed to submit URL');
  return res.json();
}
