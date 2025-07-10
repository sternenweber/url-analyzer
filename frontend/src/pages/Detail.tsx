import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const API_BASE = 'http://localhost:8081';
const COLORS = ['#0088FE', '#FF8042'];

const Detail = () => {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['url', id],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/urls/${id}`, {
        headers: { Authorization: 'Bearer your-secret-token' },
      });
      return res.data;
    }
  });

  if (isLoading || !data) return <CircularProgress />;

  const chartData = [
    { name: 'Internal Links', value: data.internal || 0 },
    { name: 'External Links', value: data.external || 0 }
  ];

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        URL Detail View
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Headings</Typography>
        <List>
          {Object.entries(data.headings || {}).map(([level, count]) => (
            <ListItem key={level}>
              <ListItemText primary={`${level.toUpperCase()}: ${count}`} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Link Chart</Typography>
        <PieChart width={300} height={200}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            fill="#8884d8"
            label
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Broken Links</Typography>
        <List>
          {data.broken_links?.map((bl: any, idx: number) => (
            <ListItem key={idx}>
              <ListItemText
                primary={bl.link}
                secondary={`Status: ${bl.status}`}
              />
            </ListItem>
          )) || <Typography>No broken links found.</Typography>}
        </List>
      </Paper>
    </Container>
  );
};

export default Detail;