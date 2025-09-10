import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import GlassDashboard from './pages/Glass/GlassDashboard';
import DecorationDashbaord from './pages/DecorationTeam/DecorationDashbaord';
import DecoAdminDashboard from './pages/DecoAdmin/DecoAdminDashbaord';
import Dashboard from './pages/Admin/Dashboard';



const App = () => {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          {/* Admin */}
          <Route path="/glass" element={<GlassDashboard />} />
          <Route path="/printing" element={<DecorationDashbaord />} />
          <Route path="/coating" element={<DecorationDashbaord />} />
          <Route path="/frosting" element={<DecorationDashbaord />} />
          <Route path="/foiling" element={<DecorationDashbaord />} />
          <Route path="/deco-admin" element={<DecoAdminDashboard />} />
          <Route path="/admin" element={<Dashboard />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
};

export default App;