import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
} from '@mui/material';
import { PieChart, Pie, Cell, Legend } from 'recharts';

const API_BASE = 'http://localhost:8081';
const COLORS = ['#FF8042', '#0088FE'];

const Detail: React.FC = () => {
  const { id } = useParams();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    enabled: !!id,
    queryKey: ['urlDetail', id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      try {
        const res = await axios.get(`${API_BASE}/urls/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        return res.data;
      } catch (err: any) {
        if (axios.isAxiosError(err)) {
          throw new Error(
            err.response?.data?.error || `Request failed with status ${err.response?.status}`
          );
        }
        throw new Error('Failed to fetch data');
      }
    },
  });

  if (!id) {
    return (
      <Box p={4}>
        <Alert severity="error">No ID provided in the route.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Failed to load details: {(error as Error)?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  const pieData = [
    { name: 'External Links', value: data.external_links || 0 },
    { name: 'Internal Links', value: data.internal_links || 0 },
  ];

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        URL Detail View
      </Typography>

      {/* Headings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Headings</Typography>
          {data.headings && Object.keys(data.headings).length > 0 ? (
            Object.entries(data.headings).map(([tag, count]) => (
              <Typography key={tag}>
                {tag.toUpperCase()}: {String(count)}
              </Typography>
            ))
          ) : (
            <Typography>No headings found.</Typography>
          )}
        </CardContent>
      </Card>

      {/* Link Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Link Chart
          </Typography>
          <PieChart width={300} height={250}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              label
              outerRadius={80}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  name={entry.name}
                />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </CardContent>
      </Card>

      {/* Broken Links */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Broken Links
          </Typography>
          {data.broken_links && data.broken_links.length > 0 ? (
            <List>
              {data.broken_links.map((link: any, index: number) => (
                <ListItem key={index}>
                  <Typography>
                    {link.url} – Status: {link.status != null ? link.status : 'unknown'}
                  </Typography>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No broken links found.</Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Detail;
