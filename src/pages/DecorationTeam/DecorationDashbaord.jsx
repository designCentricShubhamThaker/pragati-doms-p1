import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Menu, ChevronLeft } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import SharedHeader from '../../components/SharedHeader.jsx';
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime.jsx';
import { getSocket } from '../../context/SocketContext.jsx';
import { getLocalStorageData, getOrdersByStatus, getStorageKey, updateOrderInLocalStorage } from '../../utils/orderStorage.jsx';

import DecorationTeamOrders from './DecorationTeamOrders.jsx';

// Team configurations
const TEAM_CONFIGS = {
  printing: {
    name: 'Printing',
    color: 'orange',
    title: 'Printing Department',
    mobileTitle: 'Printing',
    socketRoom: 'printing',
    socketEvents: {
      production: 'printingProductionUpdated',
      dispatch: 'printingDispatchUpdated',
      productionError: 'printingProductionError',
      dispatchError: 'printingDispatchError'
    }
  },
  coating: {
    name: 'Coating',
    color: 'orange',
    title: 'Coating Department',
    mobileTitle: 'Coating',
    socketRoom: 'coating',
    socketEvents: {
      production: 'coatingProductionUpdated',
      dispatch: 'coatingDispatchUpdated',
      productionError: 'coatingProductionError',
      dispatchError: 'coatingDispatchError'
    }
  },
  frosting: {
    name: 'Frosting',
    color: 'orange',
    title: 'Frosting Department',
    mobileTitle: 'Frosting',
    socketRoom: 'frosting',
    socketEvents: {
      production: 'frostingProductionUpdated',
      dispatch: 'frostingDispatchUpdated',
      productionError: 'frostingProductionError',
      dispatchError: 'frostingDispatchError'
    }
  },
  foiling: {
    name: 'Foiling',
    color: 'orange',
    title: 'Foiling Department',
    mobileTitle: 'Foiling',
    socketRoom: 'foiling',
    socketEvents: {
      production: 'foilingProductionUpdated',
      dispatch: 'foilingDispatchUpdated',
      productionError: 'foilingProductionError',
      dispatchError: 'foilingDispatchError'
    }
  }
};

const DecorationDashbaord = ({ isEmbedded = false }) => {
  const location = useLocation();
  const [activeMenuItem, setActiveMenuItem] = useState('liveOrders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();
  const socket = getSocket();

  // Extract team from URL path
  const teamName = location.pathname.substring(1); // Remove leading slash
  const teamConfig = TEAM_CONFIGS[teamName];

  const [globalState, setGlobalState] = useState({
    orders: [],
    loading: false,
    error: null,
    dataVersion: 0,
    refreshOrders: 0
  });

  // If team not found, show error
  if (!teamConfig) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Team Not Found</h1>
          <p className="text-red-500">The team "{teamName}" is not configured.</p>
        </div>
      </div>
    );
  }

  const handleOrderUpdate = useCallback(
  (
    orderNumber,
    itemId,
    componentId,
    updatedComponent,
    newStatus,
    itemChanges = {},
    orderChanges = {}
  ) => {
    console.log(`🔄 ${teamName} order update received:`, {
      orderNumber,
      itemId,
      componentId,
      updatedComponent,
      newStatus,
      itemChanges,
      orderChanges,
    });

    const STORAGE_KEY = getStorageKey(teamName);
    let allOrders = getLocalStorageData(STORAGE_KEY) || [];

    const orderIndex = allOrders.findIndex(order => order.order_number === orderNumber);
    if (orderIndex === -1) {
      console.warn(`⚠️ Order not found in ${teamName} storage:`, orderNumber);
      return;
    }

    const currentOrder = allOrders[orderIndex];

    const updatedOrder = {
      ...currentOrder,
      status: orderChanges?.new_status || currentOrder.status,
      items: currentOrder.items.map(item =>
        item.item_id === itemId
          ? {
              ...item,
              status: itemChanges?.new_status || item.status,
              components: item.components.map(c =>
                c.component_id === componentId
                  ? { 
                      ...c, 
                      ...updatedComponent,
                      // IMPORTANT: Preserve vehicle_details properly
                      vehicle_details: updatedComponent.vehicle_details || c.vehicle_details
                    }
                  : c
              ),
            }
          : item
      ),
    };

    updateOrderInLocalStorage(teamName, updatedOrder);
    
    // Force refresh with new data
    setGlobalState(prev => ({
      ...prev,
      refreshOrders: prev.refreshOrders + 1,
      dataVersion: prev.dataVersion + 1 // Add version increment
    }));

    console.log(`✅ ${teamName} order updated in storage and refresh triggered`);
  },
  [teamName]
);

  const handleOrdersUpdate = useCallback((newOrders) => {
    setGlobalState(prev => ({
      ...prev,
      orders: newOrders,
      dataVersion: prev.dataVersion + 1
    }));
  }, []);


useEffect(() => {
  if (!socket || !teamConfig) return;

  console.log(`🔌 [${teamName}] Setting up socket listeners`);
  // socket.emit("joinDecoration", { team: teamName });
  socket.emit("joinRoom","decoration")

  const handleProductionUpdate = ({ order_number, item_id, component_id, updatedComponent }) => {
    console.log(`📢 [${teamName}] Production update received:`, { order_number, item_id, component_id });
    handleOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
  };

  const handleDispatchUpdate = ({ order_number, item_id, component_id, updatedComponent, itemChanges, orderChanges }) => {
    console.log(`📦 [${teamName}] Dispatch update received:`, { order_number, item_id, component_id });
    handleOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status, itemChanges, orderChanges);
  };

  // IMPROVED: Component dispatched from glass with detailed filtering logic
  const handleComponentFromGlass = ({
    order_number,
    item_id,
    component_id,
    component_name,
    component_data,
    deco_sequence,
    timestamp
  }) => {
    console.log(`🎨 [${teamName}] Received glass dispatch notification:`, {
      component_name,
      deco_sequence,
      timestamp: timestamp || 'no timestamp'
    });

    // Parse and validate sequence
    if (!deco_sequence || typeof deco_sequence !== 'string') {
      console.log(`⚠️ [${teamName}] No valid deco_sequence found, ignoring component ${component_name}`);
      return;
    }

    const sequence = deco_sequence.split('_').filter(Boolean);
    const isInSequence = sequence.includes(teamName);

    console.log(`🔍 [${teamName}] Sequence analysis:`, {
      raw_sequence: deco_sequence,
      parsed_sequence: sequence,
      team_in_sequence: isInSequence,
      team_position: sequence.indexOf(teamName)
    });

    if (!isInSequence) {
      console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}] for component ${component_name}, ignoring`);
      return;
    }

    console.log(`✅ [${teamName}] Processing component from glass: ${component_name}`);
    console.log(`🚛 [${teamName}] Vehicle details received:`, component_data.vehicle_details?.length || 0, 'vehicles');

    const updatedComponent = {
      ...component_data,
      vehicle_details: component_data.vehicle_details || [],
      received_from_glass: true,
      received_at: timestamp || new Date().toISOString(),
      deco_sequence: deco_sequence
    };

    handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    
    setGlobalState(prev => ({
      ...prev,
      refreshOrders: prev.refreshOrders + 1,
    }));
  };

  // IMPROVED: Vehicle details updated with better filtering
  const handleVehicleDetailsUpdated = ({ 
    order_number, 
    item_id, 
    component_id, 
    updatedComponent,
    updated_by,
    deco_sequence,
    timestamp
  }) => {
    console.log(`🚛 [${teamName}] Received vehicle update notification:`, {
      updated_by,
      deco_sequence,
      vehicle_count: updatedComponent.vehicle_details?.length || 0,
      timestamp: timestamp || 'no timestamp'
    });

    // Parse and validate sequence
    if (!deco_sequence || typeof deco_sequence !== 'string') {
      console.log(`⚠️ [${teamName}] No valid deco_sequence in vehicle update, ignoring`);
      return;
    }

    const sequence = deco_sequence.split('_').filter(Boolean);
    const isInSequence = sequence.includes(teamName);

    console.log(`🔍 [${teamName}] Vehicle update sequence check:`, {
      raw_sequence: deco_sequence,
      parsed_sequence: sequence,
      team_in_sequence: isInSequence
    });

    if (!isInSequence) {
      console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}] for vehicle update, ignoring`);
      return;
    }

    console.log(`✅ [${teamName}] Processing vehicle update from ${updated_by}`);
    
    const enhancedComponent = {
      ...updatedComponent,
      vehicle_details: updatedComponent.vehicle_details || [],
      last_vehicle_update: timestamp || new Date().toISOString(),
      updated_by: updated_by
    };
    
    handleOrderUpdate(order_number, item_id, component_id, enhancedComponent, enhancedComponent?.status);
    
    setGlobalState(prev => ({
      ...prev,
      refreshOrders: prev.refreshOrders + 1,
    }));
  };

  // IMPROVED: Vehicle approval required with filtering
  const handleVehicleApprovalRequired = ({ 
    order_number,
    item_id,
    component_id,
    component_name,
    vehicle_details,
    deco_sequence,
    timestamp
  }) => {
    console.log(`🔔 [${teamName}] Received vehicle approval notification:`, {
      component_name,
      deco_sequence,
      vehicle_count: vehicle_details?.length || 0,
      timestamp: timestamp || 'no timestamp'
    });

    // Parse and validate sequence
    if (!deco_sequence || typeof deco_sequence !== 'string') {
      console.log(`⚠️ [${teamName}] No valid deco_sequence in approval notification, ignoring`);
      return;
    }

    const sequence = deco_sequence.split('_').filter(Boolean);
    const isInSequence = sequence.includes(teamName);

    console.log(`🔍 [${teamName}] Approval notification sequence check:`, {
      raw_sequence: deco_sequence,
      parsed_sequence: sequence,
      team_in_sequence: isInSequence,
      is_first_team: sequence[0] === teamName
    });

    if (!isInSequence) {
      console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}] for approval notification, ignoring`);
      return;
    }

    // Check if this team is first (responsible for approval)
    const isResponsibleTeam = sequence.length > 0 && sequence[0] === teamName;
    
    if (isResponsibleTeam) {
      console.log(`🛑 [${teamName}] IS RESPONSIBLE for vehicle approval`);
    } else {
      console.log(`ℹ️ [${teamName}] NOT RESPONSIBLE for approval, just updating data`);
    }

    // Update component with vehicle details regardless of responsibility
    const updatedComponent = { 
      vehicle_details: vehicle_details || [],
      needs_vehicle_approval: !isResponsibleTeam, // Only non-responsible teams wait
      approval_required_at: timestamp || new Date().toISOString(),
      deco_sequence: deco_sequence
    };
    
    handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    
    setGlobalState(prev => ({
      ...prev,
      refreshOrders: prev.refreshOrders + 1,
    }));
  };

  // IMPROVED: Vehicle approval completed with filtering
  const handleVehicleApprovalCompleted = ({ 
    order_number, 
    item_id, 
    component_id, 
    updatedComponent,
    approved_by,
    deco_sequence,
    timestamp
  }) => {
    console.log(`✅ [${teamName}] Received approval completion notification:`, {
      approved_by,
      deco_sequence,
      timestamp: timestamp || 'no timestamp'
    });

    // Parse and validate sequence
    if (!deco_sequence || typeof deco_sequence !== 'string') {
      console.log(`⚠️ [${teamName}] No valid deco_sequence in approval completion, ignoring`);
      return;
    }

    const sequence = deco_sequence.split('_').filter(Boolean);
    const isInSequence = sequence.includes(teamName);

    console.log(`🔍 [${teamName}] Approval completion sequence check:`, {
      raw_sequence: deco_sequence,
      parsed_sequence: sequence,
      team_in_sequence: isInSequence
    });

    if (!isInSequence) {
      console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}] for approval completion, ignoring`);
      return;
    }

    console.log(`✅ [${teamName}] Processing approval completion from ${approved_by}`);
    
    const enhancedComponent = {
      ...updatedComponent,
      vehicles_approved: true,
      approved_by: approved_by,
      approved_at: timestamp || new Date().toISOString(),
      needs_vehicle_approval: false,
      deco_sequence: deco_sequence
    };
    
    handleOrderUpdate(order_number, item_id, component_id, enhancedComponent);
    
    setGlobalState(prev => ({
      ...prev,
      refreshOrders: prev.refreshOrders + 1,
    }));
  };

  // Register all socket listeners
  socket.on(teamConfig.socketEvents.production, handleProductionUpdate);
  socket.on(teamConfig.socketEvents.dispatch, handleDispatchUpdate);
  socket.on("componentDispatchedFromGlass", handleComponentFromGlass);
  socket.on("vehicleDetailsUpdated", handleVehicleDetailsUpdated);
  socket.on("vehicleApprovalRequired", handleVehicleApprovalRequired);
  socket.on("vehicleApprovalCompleted", handleVehicleApprovalCompleted);

  // Cleanup
  return () => {
    console.log(`🔌 [${teamName}] Cleaning up socket listeners`);
    socket.off(teamConfig.socketEvents.production, handleProductionUpdate);
    socket.off(teamConfig.socketEvents.dispatch, handleDispatchUpdate);
    socket.off("componentDispatchedFromGlass", handleComponentFromGlass);
    socket.off("vehicleDetailsUpdated", handleVehicleDetailsUpdated);
    socket.off("vehicleAprovalRequired", handleVehicleApprovalRequired);
    socket.off("vehicleApprovalCompleted", handleVehicleApprovalCompleted);
  };
}, [socket, handleOrderUpdate, teamName, teamConfig]);

  const handleLogout = useCallback(() => {
    console.log('Logout clicked');
    localStorage.clear();
    setGlobalState({
      orders: [],
      loading: false,
      error: null,
      dataVersion: 0
    });
  }, []);

  const handleMenuClick = useCallback((itemId) => {
    setActiveMenuItem(itemId);
    setMobileMenuOpen(false);
  }, []);

  const mainMenuItems = [
    { id: 'liveOrders', label: 'Live Orders' },
    { id: 'ReadyToDispatch', label: 'Ready to Dispatch' },
    { id: 'dispatched', label: 'Dispatched' },
  ];

  const refreshOrders = useCallback((orderType) => {
    const ordersToLoad = getOrdersByStatus(teamName, orderType);

    if (orderType === "in_progress") {
      const filteredOrders = ordersToLoad.filter(
        order => order.order_status !== "PENDING_PI"
      );
      handleOrdersUpdate(filteredOrders);
    } else {
      handleOrdersUpdate(ordersToLoad);
    }
  }, [handleOrdersUpdate, teamName]);

  const renderActiveComponent = () => {
    const commonProps = {
      globalState,
      onOrderUpdate: handleOrderUpdate,
      onOrdersUpdate: handleOrdersUpdate,
      refreshOrders,
      teamName,
      teamConfig
    };

    switch (activeMenuItem) {
      case 'liveOrders':
        return <DecorationTeamOrders orderType='in_progress' {...commonProps} />;
      case 'ReadyToDispatch':
        return <DecorationTeamOrders orderType='ready_to_dispatch' {...commonProps} />;
      case 'dispatched':
        return <DecorationTeamOrders orderType='dispatched' {...commonProps} />;
      default:
        return (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-2">
              {mainMenuItems.find(item => item.id === activeMenuItem)?.label || 'Page Not Found'}
            </h2>
            <p className="text-gray-600">
              This section is under development. Content for "{activeMenuItem}" will be added soon.
            </p>
          </div>
        );
    }
  };

  const headerConfig = {
    showGradient: !isEmbedded,
    showTime: !isEmbedded,
    title: isEmbedded ? teamConfig.title : `Welcome to ${teamConfig.title}!`,
    mobileTitle: teamConfig.mobileTitle
  };

  // Dynamic color classes based on team
  const getColorClasses = () => {
    const colorMap = {
      orange: {
        gradient: 'from-orange-800 via-orange-600 to-orange-400',
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        hover: 'hover:text-orange-600 hover:bg-orange-50/50',
        active: 'text-orange-600 bg-orange-50 border-orange-500',
        button: 'bg-orange-600 hover:bg-orange-700'
      },
      blue: {
        gradient: 'from-blue-800 via-blue-600 to-blue-400',
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        hover: 'hover:text-blue-600 hover:bg-blue-50/50',
        active: 'text-blue-600 bg-blue-50 border-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      purple: {
        gradient: 'from-purple-800 via-purple-600 to-purple-400',
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        hover: 'hover:text-purple-600 hover:bg-purple-50/50',
        active: 'text-purple-600 bg-purple-50 border-purple-500',
        button: 'bg-purple-600 hover:bg-purple-700'
      },
      yellow: {
        gradient: 'from-yellow-800 via-yellow-600 to-yellow-400',
        bg: 'bg-yellow-50',
        text: 'text-yellow-600',
        hover: 'hover:text-yellow-600 hover:bg-yellow-50/50',
        active: 'text-yellow-600 bg-yellow-50 border-yellow-500',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      }
    };
    return colorMap[teamConfig.color] || colorMap.orange;
  };

  const colorClasses = getColorClasses();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <SharedHeader
        {...headerConfig}
        currentDateTime={currentDateTime}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        handleLogout={handleLogout}
        formatTime={formatTime}
        formatTimeMobile={formatTimeMobile}
      />

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
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeMenuItem === item.id
                        ? colorClasses.active
                        : `text-gray-600 ${colorClasses.hover}`
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

      <nav className="hidden sm:block bg-white shadow-md border-b border-gray-200 relative z-0">
        <div className="px-8">
          <div className="flex items-center">
            {mainMenuItems.map((item) => (
              <div key={item.id} className="relative">
                <button
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 z-0 ${activeMenuItem === item.id
                      ? colorClasses.active
                      : `text-gray-600 border-transparent ${colorClasses.hover}`
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

export default DecorationDashbaord;