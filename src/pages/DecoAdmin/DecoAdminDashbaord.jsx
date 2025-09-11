import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Menu, ChevronLeft } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime';
import DecorationDashboard from '../DecorationTeam/DecorationDashbaord';
import { TEAM_CONFIGS } from '../../utils/constants.js';
import { getSocket } from '../../context/SocketContext.jsx';
import { getLocalStorageData, getStorageKey, updateOrderInLocalStorage } from '../../utils/orderStorage.jsx';

const DecoAdminDashboard = () => {
  const [activeMenuItem, setActiveMenuItem] = useState('printing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();
  const socket = getSocket();

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

  // ========= ORDER UPDATE HELPER =========
  const handleOrderUpdate = useCallback((orderNumber, itemId, componentId, updatedComponent, newStatus, itemChanges = {}, orderChanges = {}, teamName) => {
    if (!teamName) return;
    
    const STORAGE_KEY = getStorageKey(teamName);
    if(!localStorage.getItem(STORAGE_KEY)) return
    let allOrders = getLocalStorageData(STORAGE_KEY) || [];

    const orderIndex = allOrders.findIndex(order => order.order_number === orderNumber);
    if (orderIndex === -1) return;

    const newOrders = [...allOrders];
    newOrders[orderIndex] = {
      ...newOrders[orderIndex],
      status: orderChanges?.new_status || newOrders[orderIndex].status,
      items: newOrders[orderIndex].items.map(item =>
        item.item_id === itemId
          ? {
            ...item,
            status: itemChanges?.new_status || item.status,
            components: item.components.map(c =>
              c.component_id === componentId
                ? { ...c, ...updatedComponent, last_updated: new Date().toISOString() }
                : c
            )
          }
          : item
      )
    };

    updateOrderInLocalStorage(teamName, newOrders[orderIndex]);
    
    // Trigger refresh for embedded dashboards
    window.dispatchEvent(new CustomEvent('decoAdminUpdate', {
      detail: { team: teamName, orderNumber, updateType: 'orderUpdate', timestamp: Date.now() }
    }));
  }, []);

  // ========= SOCKET SETUP =========
  useEffect(() => {
    if (!socket) return;

    // Join production room (same as individual decoration teams)
    socket.emit("joinProduction");

    socket.on("joinedProduction", ({ message }) => {
      console.log(`✅ [DecoAdmin] Production room joined:`, message);
    });

    // Listen to the same events as individual decoration teams
    const handleDecorationProductionUpdated = ({ team, order_number, item_id, component_id, updatedComponent }) => {
      console.log(`📦 [DecoAdmin] Production updated for team ${team}:`, { order_number, component_id });
      handleOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status, {}, {}, team);
    };

    const handleDecorationComponentDispatched = ({
      team,
      order_number,
      item_id,
      component_id,
      updatedComponent,
      itemChanges,
      orderChanges,
      timestamp
    }) => {
      console.log(`🚚 [DecoAdmin] Component dispatched from team ${team}:`, { order_number, component_id });
      
      if (!updatedComponent) {
        console.log(`⚠️ [DecoAdmin] No updatedComponent in dispatch update for ${team}, ignoring`);
        return;
      }

      const enhancedUpdatedComponent = {
        ...updatedComponent,
        last_updated: timestamp || new Date().toISOString(),
        sequence_last_dispatch: {
          team: team,
          at: timestamp || new Date().toISOString()
        }
      };

      handleOrderUpdate(
        order_number,
        item_id,
        component_id,
        enhancedUpdatedComponent,
        enhancedUpdatedComponent?.status,
        itemChanges,
        orderChanges,
        team
      );
    };

    const handleTeamCanStartWork = ({
      order_number,
      item_id,
      component_id,
      team,
      deco_sequence,
      previous_team,
      timestamp
    }) => {
      console.log(`🔔 [DecoAdmin] Team ${team} can start work:`, { order_number, component_id, previous_team });
      
      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [DecoAdmin] No valid deco_sequence in team notification, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      
      // Update for the team that can start work
      const updatedComponent = {
        decorations: {
          [previous_team]: {
            status: 'DISPATCHED',
            dispatched_at: timestamp || new Date().toISOString()
          }
        },
        deco_sequence: deco_sequence,
        sequence_updated_at: timestamp || new Date().toISOString(),
        last_completed_team: previous_team,
        next_team_notified: team
      };

      handleOrderUpdate(order_number, item_id, component_id, updatedComponent, null, {}, {}, team);
    };

    const handleVehicleDetailsReceived = ({
      order_number,
      item_id,
      component_id,
      vehicle_details,
      deco_sequence,
      timestamp
    }) => {
      console.log(`🚛 [DecoAdmin] Vehicle details received:`, { order_number, component_id, vehicle_count: vehicle_details?.length });
      
      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [DecoAdmin] No valid deco_sequence, ignoring vehicle details`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      
      // Update all teams in sequence
      sequence.forEach(teamName => {
        const updatedComponent = {
          vehicle_details: vehicle_details || [],
          deco_sequence: deco_sequence,
          vehicles_received_at: timestamp || new Date().toISOString()
        };

        handleOrderUpdate(order_number, item_id, component_id, updatedComponent, null, {}, {}, teamName);
      });
    };

    const handleVehicleMarkedDelivered = ({
      order_number,
      item_id,
      component_id,
      vehicle_details,
      deco_sequence,
      marked_by,
      timestamp
    }) => {
      console.log(`✅ [DecoAdmin] Vehicle marked delivered by ${marked_by}:`, { order_number, component_id });
      
      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [DecoAdmin] No valid deco_sequence in delivery update, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      
      // Update all teams in sequence
      sequence.forEach(teamName => {
        const updatedComponent = {
          vehicle_details: vehicle_details || [],
          all_vehicles_delivered: true,
          vehicles_delivered_by: marked_by,
          vehicles_delivered_at: timestamp || new Date().toISOString(),
          deco_sequence: deco_sequence
        };

        handleOrderUpdate(order_number, item_id, component_id, updatedComponent, null, {}, {}, teamName);
      });
    };

    const handleComponentDispatchedFromGlass = ({
      order_number,
      item_id,
      component_id,
      component_data,
      deco_sequence
    }) => {
      console.log(`🔍 [DecoAdmin] Component received from glass:`, { order_number, component_id, sequence: deco_sequence });

      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [DecoAdmin] No valid deco_sequence in glass dispatch, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      
      // Update all teams in sequence
      sequence.forEach(teamName => {
        const updatedComponent = {
          ...component_data,
          received_from_glass: true,
          received_at: new Date().toISOString()
        };

        handleOrderUpdate(order_number, item_id, component_id, updatedComponent, null, {}, {}, teamName);
      });
    };

    const handleVehicleApprovalRequired = ({
      order_number,
      item_id,
      component_id,
      vehicle_details,
      deco_sequence
    }) => {
      console.log(`🔔 [DecoAdmin] Vehicle approval required:`, { order_number, component_id, vehicle_count: vehicle_details?.length });
      
      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [DecoAdmin] No valid deco_sequence in vehicle approval, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      
      // Update all teams in sequence
      sequence.forEach(teamName => {
        const updatedComponent = {
          vehicle_details: vehicle_details || [],
          deco_sequence: deco_sequence,
          vehicles_received_at: new Date().toISOString()
        };

        handleOrderUpdate(order_number, item_id, component_id, updatedComponent, null, {}, {}, teamName);
      });
    };

    socket.on("decorationProductionUpdated", handleDecorationProductionUpdated);
    socket.on("decorationComponentDispatched", handleDecorationComponentDispatched);
    socket.on("vehicleDetailsReceived", handleVehicleDetailsReceived);
    socket.on("vehicleMarkedDelivered", handleVehicleMarkedDelivered);
    socket.on("componentDispatchedFromGlass", handleComponentDispatchedFromGlass);
    socket.on("vehicleApprovalRequired", handleVehicleApprovalRequired);
    socket.on("teamCanStartWork", handleTeamCanStartWork);

    return () => {
      console.log(`🔌 [DecoAdmin] Cleaning up socket listeners`);
      socket.off("joinedProduction");
      socket.off("decorationProductionUpdated", handleDecorationProductionUpdated);
      socket.off("decorationComponentDispatched", handleDecorationComponentDispatched);
      socket.off("vehicleDetailsReceived", handleVehicleDetailsReceived);
      socket.off("vehicleMarkedDelivered", handleVehicleMarkedDelivered);
      socket.off("componentDispatchedFromGlass", handleComponentDispatchedFromGlass);
      socket.off("vehicleApprovalRequired", handleVehicleApprovalRequired);
      socket.off("teamCanStartWork", handleTeamCanStartWork);
    };
  }, [socket, handleOrderUpdate]);

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