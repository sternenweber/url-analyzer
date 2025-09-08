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
    onMutate: async ({ url }) => {
      // cancel any outgoing fetches
      await queryClient.cancelQueries({ queryKey: ['urls'] });

      // snapshot previous value
      const prev = queryClient.getQueryData<UrlEntry[]>(['urls']);

      // optimistic row
      const optimistic: UrlEntry = {
        id: Date.now(), // temporary client-only id
        url,
        title: '',
        html_version: '',
        has_login: false,
        internal_links: 0,
        external_links: 0,
        status: 'queued',
        created_at: new Date().toISOString(),
        last_crawled: null, // make sure UrlEntry allows null
      };

      queryClient.setQueryData<UrlEntry[]>(['urls'], (old) =>
        old ? [optimistic, ...old] : [optimistic]
      );

      setInputUrl('');
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['urls'], ctx.prev); // rollback
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['urls'] });
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
        {mutation.isPending ? 'Analyzing...' : 'Analyze'}
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
              <td>
                {entry.last_crawled
                  ? new Date(entry.last_crawled).toLocaleString()
                  : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
