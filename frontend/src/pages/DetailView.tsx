import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Container, Typography, CircularProgress, List, ListItem, ListItemText
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const API_BASE = 'http://localhost:8080';

const COLORS = ['#0088FE', '#FF8042', '#FFBB28'];

const DetailView = () => {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['urlDetail', id],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/urls/${id}`);
      return res.data;
    },
  });

  if (isLoading) return <CircularProgress />;
  if (isError || !data) return <Typography color="error">Failed to load detail.</Typography>;

  const chartData = [
    { name: 'Internal Links', value: data.internal_links },
    { name: 'External Links', value: data.external_links },
    { name: 'Broken Links', value: data.broken_links?.length ?? 0 },
  ];

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>URL Details</Typography>
      <Typography variant="h6">Title: {data.title}</Typography>
      <Typography variant="subtitle1">HTML Version: {data.html_version}</Typography>

      <PieChart width={400} height={300}>
        <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={100}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      <Typography variant="h6" mt={4}>Broken Links</Typography>
      <List>
        {(data.broken_links || []).map((link: any, index: number) => (
          <ListItem key={index}>
            <ListItemText primary={link.url} secondary={`Status: ${link.status}`} />
          </ListItem>
        ))}
      </List>
    </Container>
  );
};

export default DetailView;
