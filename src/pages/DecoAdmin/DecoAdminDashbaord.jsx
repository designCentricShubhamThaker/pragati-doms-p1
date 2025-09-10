import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Menu, ChevronLeft } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime';
import DecorationDashboard from '../DecorationTeam/DecorationDashbaord';
import { TEAM_CONFIGS } from '../../utils/constants.js';

const DecoAdminDashboard = () => {
  const [activeMenuItem, setActiveMenuItem] = useState('printing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();

  const handleLogout = () => {
    console.log('Logout clicked');
    localStorage.clear();
  };

  const mainMenuItems = [
    { id: 'printing', label: 'Print', teamName: 'printing' },
    { id: 'coating', label: 'Coat', teamName: 'coating' },
    { id: 'foiling', label: 'Foil', teamName: 'foiling' },
    { id: 'frosting', label: 'Frost', teamName: 'frosting' },
    { id: 'metalized', label: 'Metallised', teamName: 'metalized' }
  ];

  const handleMenuClick = (itemId) => {
    setActiveMenuItem(itemId);
    setMobileMenuOpen(false);
  };

  const renderActiveComponent = () => {
    const activeItem = mainMenuItems.find(item => item.id === activeMenuItem);

    if (activeItem) {
      const teamConfig = TEAM_CONFIGS[activeItem.teamName];
      
      if (!teamConfig) {
        return (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4 text-red-600">Team Configuration Not Found</h2>
            <p className="text-gray-600">
              The team "{activeItem.teamName}" configuration is missing from TEAM_CONFIGS.
            </p>
          </div>
        );
      }

      return (
        <div className="mt-2">
          <DecorationDashboard 
            isEmbedded={true}
            embeddedTeam={activeItem.teamName}
            embeddedTeamConfig={teamConfig}
          />
        </div>
      );
    }

    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Page Not Found</h2>
        <p className="text-gray-600">
          This section is under development. Content for "{activeMenuItem}" will be added soon.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-[#d94d00] via-[#ff7c08] to-[#ff9908] shadow-lg">
        <div className="px-3 sm:px-4 py-2 h-12 sm:h-12">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-2 sm:space-x-3 ml-4">
              <img src="./p_logo.png" alt="logo" className="h-6 sm:h-7" />
              <h1 className="text-white font-semibold text-sm sm:text-lg hidden sm:block">Welcome, Decoration Admin!</h1>
              <h1 className="text-white font-semibold text-sm sm:hidden">Deco Admin</h1>
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white w-64 h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Teams</h2>
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
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      activeMenuItem === item.id
                        ? 'text-orange-600 bg-orange-50 border border-orange-200'
                        : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/50'
                    }`}
                  >
                    {item.label}
                  </button>
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
                  className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                    activeMenuItem === item.id
                      ? 'text-orange-600 border-orange-500 bg-orange-50'
                      : 'text-gray-600 border-transparent hover:text-orange-600 hover:bg-orange-50/50'
                  }`}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      </nav>

      <main>
        {renderActiveComponent()}
      </main>
    </div>
  );
};

export default DecoAdminDashboard;