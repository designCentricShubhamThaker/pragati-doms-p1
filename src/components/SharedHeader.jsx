import React from 'react';
import { Menu, ChevronLeft } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import NotificationPanel from '../pages/DecorationTeam/components/NotificationPanel';

const SharedHeader = ({ 
  showGradient = true, 
  showTime = true, 
  title = "Welcome, Admin!", 
  mobileTitle = "Admin",
  currentDateTime,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleLogout,
  formatTime,
  formatTimeMobile,
  notificationPanelRef,  // new
  teamName,              // new
  teamConfig ,
  additionalHeaderContent   
}) => {
  
  const headerClasses = showGradient 
    ? "bg-gradient-to-r from-[#d94d00] via-[#ff7c08] to-[#ff9908] shadow-lg"
    : "bg-white shadow-lg border-b border-gray-200";
    
  const textColor = showGradient ? "text-white" : "text-orange-700";
  const buttonBgColor = showGradient ? "bg-red-700 hover:bg-red-800" : "bg-orange-600 hover:bg-orange-700";

  return (
    <header className={headerClasses}>
      <div className="px-3 sm:px-4 py-2 h-10 sm:h-12">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-2 sm:space-x-3 ml-4">
            {showGradient && <img src="./p_logo.png" alt="logo" className="h-6 sm:h-7" />}
            <h1 className={`${textColor} font-semibold text-sm sm:text-lg hidden sm:block`}>
              {title}
            </h1>
            <h1 className={`${textColor} font-semibold text-sm sm:hidden`}>
              {mobileTitle}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-5">
            {showTime && (
              <>
                <div className={`hidden sm:flex items-center ${textColor} text-sm font-medium space-x-1`}>
                  <span>{formatTime(currentDateTime)}</span>
                </div>
                <div className={`sm:hidden flex items-center ${textColor} text-xs font-medium space-x-1`}>
                  <span>{formatTimeMobile(currentDateTime)}</span>
                </div>
              </>
            )}
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`sm:hidden ${buttonBgColor} text-white rounded-sm p-2`}
            >
              <Menu size={16} />
            </button>
            
            <div className={`hidden sm:flex items-center ${buttonBgColor} text-white rounded-sm px-3 py-2 gap-2 shadow-md`}>
              <button onClick={handleLogout} className="font-medium cursor-pointer">
                <FaPowerOff />
              </button>
            </div>

            {teamName && teamConfig && (
            <NotificationPanel
              ref={notificationPanelRef}
              teamName={teamName}
              teamConfig={teamConfig}
            />
          )}

           {additionalHeaderContent && additionalHeaderContent}
          </div>
        </div>
      </div>
    </header>
  );
};

export default SharedHeader;