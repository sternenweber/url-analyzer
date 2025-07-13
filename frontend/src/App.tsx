import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Dashboard from './pages/Dashboard';
import Detail from './pages/Detail';

const queryClient = new QueryClient();

if (!sessionStorage.getItem('hasRefreshed')) {
  sessionStorage.setItem('hasRefreshed', '1');
  window.location.reload();
}

const App: React.FC = () => {
  localStorage.setItem('token', 'your-secret-token');

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
