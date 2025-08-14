import React from 'react'
import Dashboard from './pages/Admin/Dashboard.jsx'
import PrintingDashboard from './pages/Printing/PrintingDashbaord.jsx'
import CoatingDashbaord from './pages/Coating/CoatingDashbaord.jsx'
import GlassDashboard from './pages/Glass/GlassDashboard.jsx'
// import FoilingDashboard from './pages/Foiling/FoilingDashboard.jsx'


const App = () => {
  return (
    <div className='text-red-200'>
      {/* <Dashboard /> */}
      <GlassDashboard />
      {/* <PrintingDashboard /> */}
      {/* <CoatingDashbaord /> */}
      {/* <FoilingDashboard /> */}
    </div>
  )
}

export default App