import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Menu, ChevronLeft, } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import PendingOrders from './PendingOrders';
import LiveOrders from './LiveOrders';
import CompletedOrders from './CompletedOrders';
import Analytics from './Analytics';
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime';
import PrintingDashboard from '../Printing/PrintingDashbaord';
import GlassDashboard from '../Glass/GlassDashboard';


const Dashboard = () => {
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [departmentsExpanded, setDepartmentsExpanded] = useState(false);
  const [masterExpanded, setMasterExpanded] = useState(false);
  const [decorationExpanded, setDecorationExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const mainMenuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pendingOrders', label: 'Pending Orders' },
    { id: 'liveOrders', label: 'Live Orders' },
    { id: 'completedOrders', label: 'Completed Orders' },
    { id: 'MasterInv', label: 'Master', hasSubmenu: true },
    { id: 'departments', label: 'Departments', hasSubmenu: true }
  ];

  const masterItems = [
    { id: 'masterBottle', label: 'Bottle' },
    { id: 'masterAluminiumCap', label: 'Aluminium Cap' },
    { id: 'masterPlasticCap', label: 'Plastic Cap' },
    { id: 'masterPumps', label: 'Pumps' },
    { id: 'masterAccessories', label: 'Accessories' },
    { id: 'masterDecoPrint', label: 'Print' },
    { id: 'masterDecoCoat', label: 'Coat' },
    { id: 'masterDecoFoil', label: 'Foil' },
    { id: 'masterDecoFrost', label: 'Frost' },
    { id: 'masterDecoMetallised', label: 'Metallised' }
  ];

  const departmentItems = [
    { id: 'bottle', label: 'Bottle' },
    { id: 'aluminiumCap', label: 'Aluminium Cap' },
    { id: 'plasticCap', label: 'Plastic Cap' },
    { id: 'pumps', label: 'Pumps' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'decoration', label: 'Decoration', hasSubmenu: true }
  ];

  const decorationSubItems = [
    { id: 'printing', label: 'Print' },
    { id: 'coating', label: 'Coat' },
    { id: 'foiling', label: 'Foil' },
    { id: 'frosting', label: 'Frost' },
    { id: 'netalized', label: 'Metallised' }
  ];

  const handleMenuClick = (itemId) => {
    if (itemId === 'departments') {
      setDepartmentsExpanded(!departmentsExpanded);
      setMasterExpanded(false);
      setDecorationExpanded(false);
    } else if (itemId === 'MasterInv') {
      setMasterExpanded(!masterExpanded);
      setDepartmentsExpanded(false);
      setDecorationExpanded(false);
    } else {
      setActiveMenuItem(itemId);
      setDepartmentsExpanded(false);
      setMasterExpanded(false);
      setDecorationExpanded(false);
    }
    setMobileMenuOpen(false);
  };

  const handleDepartmentClick = (itemId) => {
    if (itemId === 'decoration') {
      setDecorationExpanded(!decorationExpanded);
      setActiveMenuItem(itemId);
    } else {
      setActiveMenuItem(itemId);
      setDepartmentsExpanded(false);
    }
  };

  const handleMasterClick = (itemId) => {
    setActiveMenuItem(itemId);
    setMasterExpanded(false);
  };

  const handleDecorationSubClick = (itemId) => {
    setActiveMenuItem(itemId);
    setDepartmentsExpanded(false);
    setDecorationExpanded(false);
  };

  const isDecorationSubActive = decorationSubItems.some(item => item.id === activeMenuItem);
  const isMasterItemActive = masterItems.some(item => item.id === activeMenuItem);

  const renderActiveComponent = () => {
    switch (activeMenuItem) {
      case 'dashboard':
        return <Analytics />;
      case 'pendingOrders':
        return <PendingOrders />;
      case 'liveOrders':
        return <LiveOrders />;
      case 'completedOrders':
        return <CompletedOrders />;
      case 'bottle':
        return (
          <div className='mt-2'>
            <GlassDashboard isEmbedded={true} />
          </div>
        );
      case 'printing':
        return (
          <div className='mt-2'>
            <PrintingDashboard isEmbedded={true} />
          </div>
        );
      default:
        return (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">
              {mainMenuItems.find(item => item.id === activeMenuItem)?.label ||
                departmentItems.find(item => item.id === activeMenuItem)?.label ||
                masterItems.find(item => item.id === activeMenuItem)?.label ||
                decorationSubItems.find(item => item.id === activeMenuItem)?.label ||
                'Page Not Found'}
            </h2>
            <p className="text-gray-600">
              This section is under development. Content for "{activeMenuItem}" will be added soon.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-[#d94d00] via-[#ff7c08] to-[#ff9908] shadow-lg">
        <div className="px-3 sm:px-4 py-2 h-12 sm:h-12">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-2 sm:space-x-3 ml-4">
              <img src="./p_logo.png" alt="logo" className="h-6 sm:h-7" />
              <h1 className="text-white font-semibold text-sm sm:text-lg hidden sm:block">Welcome , Admin !</h1>
              <h1 className="text-white font-semibold text-sm sm:hidden">Admin</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-5">
              <div className="hidden sm:flex items-center text-white text-sm font-medium space-x-1">
                <span>{formatTime(currentDateTime)}</span>
              </div>

              <div className="sm:hidden flex items-center text-white text-xs font-medium space-x-1">
                <span>{formatTimeMobile(currentDateTime)}</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden bg-red-700 text-white rounded-sm p-2 hover:bg-red-800"
              >
                <Menu size={16} />
              </button>
              <div className="hidden sm:flex items-center bg-red-700 text-white rounded-sm px-3 py-2 gap-2 hover:bg-red-800 shadow-md">
                <button onClick={handleLogout} className="font-medium cursor-pointer">
                  <FaPowerOff />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white w-64 h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Menu</h2>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <ChevronLeft size={20} />
                </button>
              </div>
            </div>

            <div className="p-4">
              {mainMenuItems.map((item) => (
                <div key={item.id} className="mb-2">
                  <button
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeMenuItem === item.id ||
                      (item.id === 'departments' && (departmentItems.some(dept => dept.id === activeMenuItem) || isDecorationSubActive)) ||
                      (item.id === 'MasterInv' && isMasterItemActive)
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/50'
                      }`}
                  >
                    {item.label}
                    {item.hasSubmenu && (
                      <div className="transition-transform duration-200">
                        {(item.id === 'departments' && departmentsExpanded) || (item.id === 'MasterInv' && masterExpanded) ?
                          <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    )}
                  </button>

                  {/* Master submenu */}
                  {item.id === 'MasterInv' && masterExpanded && (
                    <div className="ml-4 mt-2 space-y-1">
                      {masterItems.map((master) => (
                        <button
                          key={master.id}
                          onClick={() => handleMasterClick(master.id)}
                          className={`w-full text-left px-2 py-1.5 text-xs font-medium rounded transition-all duration-200 ${activeMenuItem === master.id
                            ? 'text-orange-700 bg-orange-100'
                            : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                            }`}
                        >
                          {master.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Departments submenu */}
                  {item.id === 'departments' && departmentsExpanded && (
                    <div className="ml-4 mt-2 space-y-1">
                      {departmentItems.map((dept) => (
                        <div key={dept.id}>
                          <button
                            onClick={() => handleDepartmentClick(dept.id)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 z-1 text-xs font-medium rounded transition-all duration-200 ${activeMenuItem === dept.id || (dept.id === 'decoration' && isDecorationSubActive)
                              ? 'text-orange-700 bg-orange-100'
                              : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                              }`}
                          >
                            {dept.label}
                            {dept.hasSubmenu && <ChevronRight className="w-3 h-3" />}
                          </button>

                          {dept.id === 'decoration' && decorationExpanded && (
                            <div className="ml-4 mt-1 space-y-1">
                              {decorationSubItems.map((subItem) => (
                                <button
                                  key={subItem.id}
                                  onClick={() => handleDecorationSubClick(subItem.id)}
                                  className={`w-full text-left px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${activeMenuItem === subItem.id
                                    ? 'text-orange-700 bg-orange-100'
                                    : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                                    }`}
                                >
                                  {subItem.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FaPowerOff size={14} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <nav className="hidden sm:block bg-white shadow-md border-b border-gray-200 relative z-40">
        <div className="px-5">
          <div className="flex items-center">
            {mainMenuItems.map((item) => (
              <div key={item.id} className="relative">
                <button
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${activeMenuItem === item.id ||
                    (item.id === 'departments' && (departmentItems.some(dept => dept.id === activeMenuItem) || isDecorationSubActive)) ||
                    (item.id === 'MasterInv' && isMasterItemActive)
                    ? 'text-orange-600 border-orange-500 bg-orange-50'
                    : 'text-gray-600 border-transparent hover:text-orange-600 hover:bg-orange-50/50'
                    }`}
                >
                  {item.label}
                  {item.hasSubmenu && (
                    <div className="ml-2 transition-transform duration-200">
                      {(item.id === 'departments' && departmentsExpanded) || (item.id === 'MasterInv' && masterExpanded) ?
                        <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Master dropdown */}
          {masterExpanded && (
            <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 shadow-lg z-50">
              <div className="flex items-center space-x-7 px-5 py-2">
                {masterItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMasterClick(item.id)}
                    className={`flex items-center px-3 py-2 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 ${activeMenuItem === item.id
                      ? 'text-orange-700 bg-orange-100 border border-orange-200'
                      : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Departments dropdown */}
          {departmentsExpanded && (
            <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 shadow-lg z-50">
              <div className="flex items-center space-x-7 px-5 py-2">
                {departmentItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleDepartmentClick(item.id)}
                    className={`flex items-center px-3 py-2 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 ${activeMenuItem === item.id || (item.id === 'decoration' && isDecorationSubActive)
                      ? 'text-orange-700 bg-orange-100 border border-orange-200'
                      : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                  >
                    {item.label}
                    {item.hasSubmenu && <ChevronRight className="w-3 h-3 ml-1.5" />}
                  </button>
                ))}

                {decorationExpanded && (
                  <>
                    <div className="w-px h-6 bg-gray-300 mx-2"></div>
                    {decorationSubItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleDecorationSubClick(subItem.id)}
                        className={`flex items-center px-3 py-2 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 ${activeMenuItem === subItem.id
                          ? 'text-orange-700 bg-orange-100 border border-orange-200'
                          : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                          }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <main>
        {renderActiveComponent()}
      </main>
    </div>
  );
};

export default Dashboard;