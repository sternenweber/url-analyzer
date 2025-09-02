import React, { useEffect, useState } from 'react';

const UrlList = () => {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    const fetchUrls = async () => {
      const res = await fetch("http://localhost:8080/urls", {
        headers: {
          "Authorization": "Bearer your-secret-token"
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUrls(data);
      } else {
        console.error("Failed to fetch URLs:", res.statusText);
      }
    };

    fetchUrls();
  }, []);

  return (
    <div>
      <h2>Scanned URLs</h2>
      <ul>
        {urls.map(url => (
          <li key={url.id}>{url.url} — {url.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default UrlList;
