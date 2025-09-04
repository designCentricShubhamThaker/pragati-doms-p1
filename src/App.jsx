import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import GlassDashboard from './pages/glass/GlassDashboard';

import DecorationDashbaord from './pages/DecorationTeam/DecorationDashbaord';

const App = () => {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          {/* Admin */}
          {/* <Route path="/" element={<Dashboard />} /> */}
          
          {/* Glass Team (separate component) */}
          <Route path="/glass" element={<GlassDashboard />} />
          
          {/* All Decoration Teams use the same generic dashboard */}
          <Route path="/printing" element={<DecorationDashbaord />} />
          <Route path="/coating" element={<DecorationDashbaord />} />
          <Route path="/frosting" element={<DecorationDashbaord />} />
          <Route path="/foiling" element={<DecorationDashbaord />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
};

export default App;