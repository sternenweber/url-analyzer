import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUrls, mutateUrl } from '../api';
import { useState } from 'react';
import type { UrlEntry } from '../types/url';

export default function UrlDashboard() {
  const queryClient = useQueryClient();
  const [inputUrl, setInputUrl] = useState('');

  const { data, error, isLoading } = useQuery({
    queryKey: ['urls'],
    queryFn: fetchUrls,
  });

  const mutation = useMutation({
    mutationFn: mutateUrl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      setInputUrl('');
    },
  });

  const handleSubmit = () => {
    if (!inputUrl) return;
    mutation.mutate({ url: inputUrl });
  };

  return (
    <div>
      <h1>URL Analyzer Dashboard</h1>
      <input
        type="text"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
        placeholder="Enter website URL"
      />
      <button onClick={handleSubmit} disabled={mutation.isPending}>
        Analyze
      </button>

      {isLoading && <p>Loading...</p>}
      {error && <p>Error loading URLs</p>}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>URL</th>
            <th>Title</th>
            <th>HTML Version</th>
            <th>Login</th>
            <th>Internal Links</th>
            <th>External Links</th>
            <th>Status</th>
            <th>Last Crawled</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((entry: UrlEntry) => (
            <tr key={entry.id}>
              <td>{entry.id}</td>
              <td>{entry.url}</td>
              <td>{entry.title}</td>
              <td>{entry.html_version}</td>
              <td>{entry.has_login ? 'Yes' : 'No'}</td>
              <td>{entry.internal_links}</td>
              <td>{entry.external_links}</td>
              <td>{entry.status}</td>
              <td>{entry.last_crawled ? new Date(entry.last_crawled).toLocaleString() : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
