import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  },
  coating: {
    name: 'Coating',
    color: 'orange',
    title: 'Coating Department',
    mobileTitle: 'Coating',
  },
  frosting: {
    name: 'Frosting',
    color: 'orange',
    title: 'Frosting Department',
    mobileTitle: 'Frosting',
  },
  foiling: {
    name: 'Foiling',
    color: 'orange',
    title: 'Foiling Department',
    mobileTitle: 'Foiling',
  }
};

const DecorationDashbaord = ({ isEmbedded = false }) => {
  const location = useLocation();
  const [activeMenuItem, setActiveMenuItem] = useState('liveOrders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();
  const socket = getSocket();
  const notificationPanelRef = useRef();

  // ADD: Helper to add notifications from socket events
  const addNotification = useCallback((type, data) => {
    if (notificationPanelRef.current?.addNotification) {
      notificationPanelRef.current.addNotification(type, data);
    }
  }, []);

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



  const handleOrderUpdate = useCallback((orderNumber, itemId, componentId, updatedComponent, newStatus, itemChanges = {}, orderChanges = {}) => {
    // Batch all updates into a single state change
    setGlobalState(prev => {
      const orderIndex = prev.orders.findIndex(order => order.order_number === orderNumber);
      if (orderIndex === -1) return prev;

      const newOrders = [...prev.orders];
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

      // Update localStorage once
      updateOrderInLocalStorage(teamName, newOrders[orderIndex]);

      return {
        ...prev,
        orders: newOrders,
        dataVersion: prev.dataVersion + 1,
        refreshOrders: prev.refreshOrders + 1
      };
    });
  }, [teamName]);

  const handleOrdersUpdate = useCallback((newOrders) => {
    setGlobalState(prev => ({
      ...prev,
      orders: newOrders,
      dataVersion: prev.dataVersion + 1
    }));
  }, []);
  // DecorationDashboard.jsx - Key fixes only, showing critical changes

  useEffect(() => {
    if (!socket || !teamConfig) return;

    socket.emit("joinProduction");

    socket.on("joinedProduction", ({ message }) => {
      console.log(`✅ [${teamName}] Production room joined:`, message);
    });


    const handleDecorationProductionUpdated = ({ team, order_number, item_id, component_id, updatedComponent }) => {
      if (team !== teamName) return;

      console.log(`📢 [${teamName}] Production update received:`, { order_number, item_id, component_id });
      handleOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
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

      if (!updatedComponent) {
        console.log(`⚠️ [${teamName}] No updatedComponent in dispatch update, ignoring`);
        return;
      }

      const decoSequence = updatedComponent.deco_sequence;
      if (!decoSequence || typeof decoSequence !== 'string') {
        console.warn(`⚠️ [${teamName}] No valid deco_sequence in dispatch update:`, {
          deco_sequence: decoSequence,
          type: typeof decoSequence,
          component_id,
          dispatched_team: team
        });

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
          orderChanges
        );
        return;
      }

      // Parse sequence
      const sequence = decoSequence.split('_').filter(Boolean);
      const isInSequence = sequence.includes(teamName);

      if (!isInSequence) {
        console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}], ignoring dispatch update from ${team}`);
        return;
      }

      console.log(`✅ [${teamName}] Processing dispatch update - ${team} completed in sequence [${sequence.join(' → ')}]`);

      // Get current component from localStorage to merge data
      const STORAGE_KEY = getStorageKey(teamName);
      let allOrders = getLocalStorageData(STORAGE_KEY) || [];

      const currentOrder = allOrders.find(order => order.order_number === order_number);
      if (!currentOrder) {
        console.warn(`⚠️ [${teamName}] Order not found for dispatch update:`, order_number);
        return;
      }

      const currentItem = currentOrder.items?.find(item => item.item_id === item_id);
      if (!currentItem) {
        console.warn(`⚠️ [${teamName}] Item not found for dispatch update:`, item_id);
        return;
      }

      const currentComponent = currentItem.components?.find(c => c.component_id === component_id);
      if (!currentComponent) {
        console.warn(`⚠️ [${teamName}] Component not found for dispatch update:`, component_id);
        return;
      }

      // IMPROVED: Better merging of server data with local data
      const enhancedUpdatedComponent = {
        ...currentComponent, // Preserve all existing component data
        ...updatedComponent, // Apply server updates
        decorations: {
          ...currentComponent.decorations, // Keep existing team decorations
          ...(updatedComponent.decorations || {}), // Apply server decoration updates
        },
        deco_sequence: decoSequence, // Ensure sequence is preserved
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
        orderChanges
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
      console.log(`🚀 [${teamName}] Team notification received:`, {
        order_number,
        component_id,
        notified_team: team,
        previous_team_completed: previous_team,
        current_team: teamName,
        sequence: deco_sequence
      });

      // Parse and validate sequence
      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [${teamName}] No valid deco_sequence in team notification, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      const isInSequence = sequence.includes(teamName);

      if (!isInSequence) {
        console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}] for team notification, ignoring`);
        return;
      }

      // FIXED: Only process if this notification is for the current team
      if (team !== teamName) {
        console.log(`ℹ️ [${teamName}] Team notification is for ${team}, not ${teamName}, but updating previous team status`);
      }

      console.log(`✅ [${teamName}] Processing team notification - ${previous_team} completed, affecting sequence [${sequence.join(' → ')}]`);

      // Get current component to preserve decoration data
      const STORAGE_KEY = getStorageKey(teamName);
      let allOrders = getLocalStorageData(STORAGE_KEY) || [];

      const currentOrder = allOrders.find(order => order.order_number === order_number);
      if (!currentOrder) {
        console.warn(`⚠️ [${teamName}] Order not found for team notification:`, order_number);
        return;
      }

      const currentItem = currentOrder.items?.find(item => item.item_id === item_id);
      if (!currentItem) {
        console.warn(`⚠️ [${teamName}] Item not found for team notification:`, item_id);
        return;
      }

      const currentComponent = currentItem.components?.find(c => c.component_id === component_id);
      if (!currentComponent) {
        console.warn(`⚠️ [${teamName}] Component not found for team notification:`, component_id);
        return;
      }

      // Update component with team notification info
      const updatedComponent = {
        ...currentComponent,
        decorations: {
          ...currentComponent.decorations,
          // Ensure previous team is marked as DISPATCHED
          [previous_team]: {
            ...currentComponent.decorations?.[previous_team],
            status: 'DISPATCHED',
            dispatched_at: timestamp || new Date().toISOString()
          }
        },
        deco_sequence: deco_sequence,
        sequence_updated_at: timestamp || new Date().toISOString(),
        last_completed_team: previous_team,
        next_team_notified: team
      };

      handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    };

    const handleVehicleDetailsReceived = ({
      order_number,
      item_id,
      component_id,
      vehicle_details,
      deco_sequence,
      timestamp
    }) => {
      console.log(`🚛 [${teamName}] Vehicle details received:`, {
        order_number,
        component_id,
        vehicle_count: vehicle_details?.length || 0,
        deco_sequence
      });

      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [${teamName}] No valid deco_sequence, ignoring vehicle details`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      const isInSequence = sequence.includes(teamName);

      if (!isInSequence) {
        console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}], ignoring vehicle details`);
        return;
      }

    
      const updatedComponent = {
        vehicle_details: vehicle_details || [],
        deco_sequence: deco_sequence,
        vehicles_received_at: timestamp || new Date().toISOString()
      };

      handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
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
      console.log(`✅ [${teamName}] Vehicle delivery update received:`, {
        order_number,
        component_id,
        marked_by,
        deco_sequence
      });

      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [${teamName}] No valid deco_sequence in delivery update, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      const isInSequence = sequence.includes(teamName);

      if (!isInSequence) {
        console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}] for delivery update, ignoring`);
        return;
      }


      const updatedComponent = {
        vehicle_details: vehicle_details || [],
        all_vehicles_delivered: true,
        vehicles_delivered_by: marked_by,
        vehicles_delivered_at: timestamp || new Date().toISOString(),
        deco_sequence: deco_sequence
      };

      // CRITICAL: Call handleOrderUpdate to trigger UI refresh
      handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    };

    const handleComponentDispatchedFromGlass = ({
      order_number,
      item_id,
      component_id,
      component_data,
      deco_sequence
    }) => {
      console.log(`🏭 [${teamName}] Component dispatched from glass:`, {
        order_number,
        component_id,
        deco_sequence,
        has_vehicles: component_data?.vehicle_details?.length > 0
      });

      // Parse and validate sequence
      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [${teamName}] No valid deco_sequence in glass dispatch, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      const isInSequence = sequence.includes(teamName);

      if (!isInSequence) {
        console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}] for glass dispatch, ignoring`);
        return;
      }

      console.log(`✅ [${teamName}] Processing glass dispatch for sequence [${sequence.join(' → ')}]`);

      // Update component with data from glass
      const updatedComponent = {
        ...component_data,
        received_from_glass: true,
        received_at: new Date().toISOString()
      };

      handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    };

    // FIXED: Add missing vehicle approval handler
    const handleVehicleApprovalRequired = ({
      order_number,
      item_id,
      component_id,
      vehicle_details,
      deco_sequence
    }) => {
      console.log(`🚛 [${teamName}] Vehicle approval required:`, {
        order_number,
        component_id,
        vehicle_count: vehicle_details?.length || 0,
        deco_sequence
      });

      // Parse and validate sequence
      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [${teamName}] No valid deco_sequence in vehicle approval, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      const isInSequence = sequence.includes(teamName);

      if (!isInSequence) {
        console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}] for vehicle approval, ignoring`);
        return;
      }

      console.log(`✅ [${teamName}] Processing vehicle approval for sequence [${sequence.join(' → ')}]`);

      // Update component with vehicle details
      const updatedComponent = {
        vehicle_details: vehicle_details || [],
        deco_sequence: deco_sequence,
        vehicles_received_at: new Date().toISOString()
      };

      handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    };

    // Register socket listeners
    socket.on("decorationProductionUpdated", handleDecorationProductionUpdated);
    socket.on("decorationComponentDispatched", handleDecorationComponentDispatched);
    socket.on("vehicleDetailsReceived", handleVehicleDetailsReceived);
    socket.on("vehicleMarkedDelivered", handleVehicleMarkedDelivered);
    socket.on("componentDispatchedFromGlass", handleComponentDispatchedFromGlass);
    socket.on("vehicleApprovalRequired", handleVehicleApprovalRequired);
    socket.on("teamCanStartWork", handleTeamCanStartWork);

    // Cleanup
    return () => {
      console.log(`🔌 [${teamName}] Cleaning up socket listeners`);
      socket.off("joinedProduction");
      socket.off("decorationProductionUpdated", handleDecorationProductionUpdated);
      socket.off("decorationComponentDispatched", handleDecorationComponentDispatched);
      socket.off("vehicleDetailsReceived", handleVehicleDetailsReceived);
      socket.off("vehicleMarkedDelivered", handleVehicleMarkedDelivered);
      socket.off("componentDispatchedFromGlass", handleComponentDispatchedFromGlass);
      socket.off("vehicleApprovalRequired", handleVehicleApprovalRequired);
      socket.off("teamCanStartWork", handleTeamCanStartWork);
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
    { id: 'dispatched', label: 'Dispatched' }
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
        return <DecorationTeamOrders {...commonProps} orderType="in_progress" />;
      case 'ReadyToDispatch':
        return <DecorationTeamOrders {...commonProps} orderType="ready_to_dispatch" />;
      case 'dispatched':
        return <DecorationTeamOrders {...commonProps} orderType="dispatched" />;
      default:
        return <DecorationTeamOrders {...commonProps} orderType="in_progress" />;
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