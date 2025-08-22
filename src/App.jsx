import React from 'react'
import Dashboard from './pages/Admin/Dashboard.jsx'


import GlassDashboard from './pages/Glass/GlassDashboard.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
// import FoilingDashboard from './pages/Foiling/FoilingDashboard.jsx'


const App = () => {
  return (
    <SocketProvider>
      {/* <Dashboard /> */}
      <GlassDashboard />
    </SocketProvider>




  )
}

export default App