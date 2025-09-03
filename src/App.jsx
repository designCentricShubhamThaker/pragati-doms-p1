import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext.jsx'

// Admin
import Dashboard from './pages/Admin/Dashboard.jsx'

// Teams
import GlassDashboard from './pages/Glass/GlassDashboard.jsx'
import PrintingDashboard from './pages/Printing/PrintingDashbaord.jsx'
import CoatingDashboard from './pages/Coating/CoatingDashboard.jsx'
import FrostingDashboard from './pages/Frosting/FrostingDashbaord.jsx'
// import FoilingDashboard from './pages/Foiling/FoilingDashboard.jsx'

const App = () => {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          {/* Admin */}
          <Route path="/" element={<Dashboard />} />

          {/* Teams */}
          <Route path="/glass" element={<Dashboard />} />
          <Route path="/printing" element={<PrintingDashboard />} />
          <Route path="/coating" element={<CoatingDashboard />} />
          <Route path="/frosting" element={<FrostingDashboard />} />
          {/* <Route path="/foiling" element={<FoilingDashboard />} /> */}
        </Routes>
      </Router>
    </SocketProvider>
  )
}

export default App
