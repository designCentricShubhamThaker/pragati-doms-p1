import React, { useState, useEffect, useCallback, useRef } from 'react';
import {  useLocation } from 'react-router-dom';
import {  ChevronLeft } from 'lucide-react';;
import SharedHeader from '../../components/SharedHeader.jsx';
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime.jsx';
import { getSocket } from '../../context/SocketContext.jsx';
import { getLocalStorageData, getOrdersByStatus, getStorageKey, updateOrderInLocalStorage } from '../../utils/orderStorage.jsx';
import DecorationTeamOrders from './DecorationTeamOrders.jsx';
import { TEAM_CONFIGS } from '../../utils/constants.js';


const DecorationDashboard = ({ isEmbedded = false, embeddedTeam = null, embeddedTeamConfig = null }) => {
  const location = useLocation();
  const [activeMenuItem, setActiveMenuItem] = useState('liveOrders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();
  const socket = getSocket();
  const notificationPanelRef = useRef(null);
  const addNotification = useCallback((type, data) => {
    if (notificationPanelRef.current?.addNotification) {
      notificationPanelRef.current.addNotification(type, data);
    }
  }, []);

  // Use embedded team info if provided, otherwise get from URL
  // const teamName = isEmbedded && embeddedTeam ? embeddedTeam : location.pathname.substring(1);
  // const teamConfig = isEmbedded && embeddedTeamConfig ? embeddedTeamConfig : TEAM_CONFIGS[teamName];

  // ✅ Always prefer embeddedTeam if passed
const teamName = embeddedTeam || location.pathname.substring(1);
const teamConfig = TEAM_CONFIGS[teamName];


  const [globalState, setGlobalState] = useState({
    orders: [],
    loading: false,
    error: null,
    dataVersion: 0,
    refreshOrders: 0
  });

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

  useEffect(() => {
    if (!socket || !teamConfig) return;

    socket.emit("joinProduction");

    socket.on("joinedProduction", ({ message }) => {
      console.log(`✅ [${teamName}] Production room joined:`, message);
    });

    const handleDecorationProductionUpdated = ({ team, order_number, item_id, component_id, updatedComponent }) => {
      if (team !== teamName) return;
      addNotification('production_updated', {
        message: `Production Updated for Order ${order_number}`,
        details: `Component ${component_id} status updated`,
        order_number,
        component_id,
        action_required: false
      });

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
  console.log("📨 [Dispatch Event Received]", {
    team,
    order_number,
    item_id,
    component_id,
    updatedComponent,
    itemChanges,
    orderChanges,
    timestamp
  });

  if (!updatedComponent) {
    console.log(`⚠️ [${teamName}] No updatedComponent in dispatch update, ignoring`);
    return;
  }

  const decoSequence = updatedComponent.deco_sequence;
  console.log("🔎 Extracted deco_sequence:", decoSequence);

  if (!decoSequence || typeof decoSequence !== 'string') {
    console.warn(`⚠️ [${teamName}] No valid deco_sequence in dispatch update`, {
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
    console.log("✅ Built enhancedUpdatedComponent (no sequence):", enhancedUpdatedComponent);

    addNotification('component_dispatched', {
      message: `Component Dispatched from ${team}`,
      details: `Order ${order_number}, Component ${component_id}`,
      order_number,
      component_id,
      from_team: team,
      action_required: false
    });
    console.log("🔔 Notification dispatched (no sequence)");

    handleOrderUpdate(
      order_number,
      item_id,
      component_id,
      enhancedUpdatedComponent,
      enhancedUpdatedComponent?.status,
      itemChanges,
      orderChanges
    );
    console.log("📦 Order updated (no sequence)");
    return;
  }

  const sequence = decoSequence.split('_').filter(Boolean);
  console.log("📜 Parsed sequence:", sequence);

  const isInSequence = sequence.includes(teamName);
  console.log(`[${teamName}] in sequence?`, isInSequence);

  if (!isInSequence) {
    console.log(`❌ [${teamName}] Not in sequence [${sequence.join(' → ')}], ignoring dispatch update from ${team}`);
    return;
  }

  addNotification('component_dispatched', {
    message: `Component Dispatched from ${team}`,
    details: `Order ${order_number}, Component ${component_id} - Sequence: ${sequence.join(' → ')}`,
    order_number,
    component_id,
    from_team: team,
    sequence: sequence.join(' → '),
    action_required: false
  });
  console.log("🔔 Notification dispatched with sequence:", sequence.join(" → "));

  const STORAGE_KEY = getStorageKey(teamName);
  console.log("🗝️ Storage key resolved:", STORAGE_KEY);

  let allOrders = getLocalStorageData(STORAGE_KEY) || [];
  console.log("📂 Orders loaded from localStorage:", allOrders);

  const currentOrder = allOrders.find(order => order.order_number === order_number);
  if (!currentOrder) {
    console.warn(`⚠️ [${teamName}] Order not found for dispatch update:`, order_number);
    return;
  }
  console.log("📌 Current order found:", currentOrder);

  const currentItem = currentOrder.items?.find(item => item.item_id === item_id);
  if (!currentItem) {
    console.warn(`⚠️ [${teamName}] Item not found for dispatch update:`, item_id);
    return;
  }
  console.log("📌 Current item found:", currentItem);

  const currentComponent = currentItem.components?.find(c => c.component_id === component_id);
  if (!currentComponent) {
    console.warn(`⚠️ [${teamName}] Component not found for dispatch update:`, component_id);
    return;
  }
  console.log("📌 Current component found:", currentComponent);

  const enhancedUpdatedComponent = {
    ...currentComponent,
    ...updatedComponent,
    decorations: {
      ...currentComponent.decorations,
      ...(updatedComponent.decorations || {}),
    },
    deco_sequence: decoSequence,
    last_updated: timestamp || new Date().toISOString(),
    sequence_last_dispatch: {
      team: team,
      at: timestamp || new Date().toISOString()
    }
  };
  console.log("✅ Final enhancedUpdatedComponent ready:", enhancedUpdatedComponent);

  handleOrderUpdate(
    order_number,
    item_id,
    component_id,
    enhancedUpdatedComponent,
    enhancedUpdatedComponent?.status,
    itemChanges,
    orderChanges
  );
  console.log("📦 Order updated with enhanced component");
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

      if (team === teamName) {
        addNotification('team_can_start', {
          message: `Your Team Can Start Work!`,
          details: `Order ${order_number}, Component ${component_id} - ${previous_team} has completed their work`,
          order_number,
          component_id,
          previous_team,
          sequence: sequence.join(' → '),
          action_required: true
        });
      }

  
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

      const updatedComponent = {
        ...currentComponent,
        decorations: {
          ...currentComponent.decorations,
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

      addNotification('vehicle_received', {
        message: `Vehicle Details Received`,
        details: `Order ${order_number}, Component ${component_id} - ${vehicle_details?.length || 0} vehicles`,
        order_number,
        component_id,
        vehicle_count: vehicle_details?.length || 0,
        action_required: true
      });

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

      addNotification('vehicle_delivered', {
        message: `All Vehicles Delivered`,
        details: `Order ${order_number}, Component ${component_id} - Marked by ${marked_by}`,
        order_number,
        component_id,
        marked_by,
        action_required: false
      });

      const updatedComponent = {
        vehicle_details: vehicle_details || [],
        all_vehicles_delivered: true,
        vehicles_delivered_by: marked_by,
        vehicles_delivered_at: timestamp || new Date().toISOString(),
        deco_sequence: deco_sequence
      };

      handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    };

    const handleComponentDispatchedFromGlass = ({
      order_number,
      item_id,
      component_id,
      component_data,
      deco_sequence
    }) => {

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

      addNotification('glass_dispatch', {
        message: `Component Received from Glass`,
        details: `Order ${order_number}, Component ${component_id} - ${component_data?.vehicle_details?.length || 0} vehicles`,
        order_number,
        component_id,
        vehicle_count: component_data?.vehicle_details?.length || 0,
        sequence: sequence.join(' → '),
        action_required: true
      });

      const updatedComponent = {
        ...component_data,
        received_from_glass: true,
        received_at: new Date().toISOString()
      };

      handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    };

    const handleVehicleApprovalRequired = ({
      order_number,
      item_id,
      component_id,
      vehicle_details,
      deco_sequence
    }) => {
      
      if (!deco_sequence || typeof deco_sequence !== 'string') {
        console.log(`⚠️ [${teamName}] No valid deco_sequence in vehicle approval, ignoring`);
        return;
      }

      const sequence = deco_sequence.split('_').filter(Boolean);
      const isInSequence = sequence.includes(teamName);
      if (!isInSequence) {
        return;
      }

      addNotification('approval_required', {
        message: `Vehicle Approval Required`,
        details: `Order ${order_number}, Component ${component_id} - ${vehicle_details?.length || 0} vehicles need approval`,
        order_number,
        component_id,
        vehicle_count: vehicle_details?.length || 0,
        action_required: true
      });

      const updatedComponent = {
        vehicle_details: vehicle_details || [],
        deco_sequence: deco_sequence,
        vehicles_received_at: new Date().toISOString()
      };

      handleOrderUpdate(order_number, item_id, component_id, updatedComponent);
    };

    socket.on("decorationProductionUpdated", handleDecorationProductionUpdated);
    socket.on("decorationComponentDispatched", handleDecorationComponentDispatched);
    socket.on("vehicleDetailsReceived", handleVehicleDetailsReceived);
    socket.on("vehicleMarkedDelivered", handleVehicleMarkedDelivered);
    socket.on("componentDispatchedFromGlass", handleComponentDispatchedFromGlass);
    socket.on("vehicleApprovalRequired", handleVehicleApprovalRequired);
    socket.on("teamCanStartWork", handleTeamCanStartWork);


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
  }, [socket, handleOrderUpdate, teamName, teamConfig, addNotification]);

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


  const getColorClasses = () => {
    return {
      gradient: 'from-orange-800 via-orange-600 to-orange-400',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      hover: 'hover:text-orange-600 hover:bg-orange-50/50',
      active: 'text-orange-600 bg-orange-50 border-orange-500',
      button: 'bg-orange-600 hover:bg-orange-700'
    };
  };

  const colorClasses = getColorClasses();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {!isEmbedded && (
        <SharedHeader
          {...headerConfig}
          currentDateTime={currentDateTime}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          handleLogout={handleLogout}
          formatTime={formatTime}
          formatTimeMobile={formatTimeMobile}
          notificationPanelRef={notificationPanelRef}   
          teamName={teamName}                         
          teamConfig={teamConfig} 
        />
      )}

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
            </div>
          </div>
        </div>
      )}

      {/* {!isEmbedded && ( */}
        <nav className="hidden sm:block bg-white shadow-md border-b border-gray-200 relative z-0">
          <div className="px-8">
            <div className="flex items-center justify-between">
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
          </div>
        </nav>
      {/* )} */}

      <main>
        {renderActiveComponent()}
      </main>
    </div>
  );
};

export default DecorationDashboard;