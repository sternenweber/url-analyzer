import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowSelectionModel, GridRowId } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import type { UrlEntry } from '../types/url';

const API_BASE = 'http://localhost:8081';

const Dashboard: React.FC = () => {
  const [newUrl, setNewUrl] = useState('');
  const [selectionIds, setSelectionIds] = useState<Set<GridRowId>>(new Set());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: urls, isLoading, isError } = useQuery<UrlEntry[]>({
    queryKey: ['urls'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/urls`, {
        headers: { Authorization: 'Bearer your-secret-token' },
      });
      return res.data;
    },
    refetchInterval: 5000,
  });

  const crawlMutation = useMutation({
    mutationFn: async ({ url }: { url: string }) => {
      await axios.post(
        `${API_BASE}/crawl`,
        { url },
        {
          headers: { Authorization: 'Bearer your-secret-token' },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      setNewUrl('');
    },
  });

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'url', headerName: 'URL', flex: 1 },
    { field: 'title', headerName: 'Title', flex: 1 },
    { field: 'html_version', headerName: 'HTML Version', width: 120 },
    {
      field: 'has_login',
      headerName: 'Login',
      width: 100,
      type: 'boolean',
    },
    {
      field: 'internal_links',
      headerName: 'Internal Links',
      width: 150,
      type: 'number',
    },
    {
      field: 'external_links',
      headerName: 'External Links',
      width: 150,
      type: 'number',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'done'
              ? 'success'
              : params.value === 'running'
              ? 'warning'
              : params.value === 'error'
              ? 'error'
              : params.value?.toLowerCase() === 'queued'
              ? 'info'
              : 'default'
          }
          size="small"
        />
      ),
    },
    {
      field: 'last_crawled',
      headerName: 'Last Crawled',
      flex: 1,
      valueFormatter: (params: { value: string }) =>
        params.value ? new Date(params.value).toLocaleString() : '—',
    },
  ];

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        URL Analyzer Dashboard
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          fullWidth
          label="Enter website URL"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={() => crawlMutation.mutate({ url: newUrl })}
          disabled={!newUrl || crawlMutation.isPending}
        >
          {crawlMutation.isPending ? 'Analyzing...' : 'Analyze'}
        </Button>
      </Box>

      {selectionIds.size > 0 && (
        <Box display="flex" gap={2} mb={2}>
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              await Promise.all(
                Array.from(selectionIds).map((id) =>
                  axios.post(
                    `${API_BASE}/crawl`,
                    { id },
                    {
                      headers: {
                        Authorization: 'Bearer your-secret-token',
                      },
                    }
                  )
                )
              );
              queryClient.invalidateQueries({ queryKey: ['urls'] });
            }}
          >
            Re-run Selected
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              await Promise.all(
                Array.from(selectionIds).map((id) =>
                  axios.delete(`${API_BASE}/urls/${id}`, {
                    headers: {
                      Authorization: 'Bearer your-secret-token',
                    },
                  })
                )
              );
              queryClient.invalidateQueries({ queryKey: ['urls'] });
            }}
          >
            Delete Selected
          </Button>
        </Box>
      )}

      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : isError ? (
        <Typography color="error">Failed to load URLs.</Typography>
      ) : urls?.length === 0 ? (
        <Typography>No URLs found. Submit one above!</Typography>
      ) : (
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={urls}
            columns={columns}
            getRowId={(row: UrlEntry) => row.id}
            checkboxSelection
            onRowClick={(params) => navigate(`/detail/${params.row.id}`)}
            onRowSelectionModelChange={(newModel) => {
              const model = newModel as GridRowSelectionModel;
              if ('ids' in model) {
                setSelectionIds(model.ids);
              }
            }}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 5, page: 0 },
              },
            }}
            pageSizeOptions={[5, 10, 20]}
            disableRowSelectionOnClick
            sortingOrder={['asc', 'desc']}
          />
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
