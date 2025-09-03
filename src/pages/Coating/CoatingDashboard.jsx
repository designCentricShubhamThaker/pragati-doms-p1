import React, { useState, useEffect, useCallback } from 'react';
import { Menu, ChevronLeft } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import SharedHeader from '../../components/SharedHeader.jsx';
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime.jsx';


import { getSocket } from '../../context/SocketContext.jsx';
import { getLocalStorageData, getOrdersByStatus, getStorageKey, updateOrderInLocalStorage } from '../../utils/orderStorage.jsx';
import CoatingOrders from './CoatingOrders.jsx';

const CoatingDashbaord = ({ isEmbedded = false }) => {
  const [activeMenuItem, setActiveMenuItem] = useState('liveOrders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();
  const socket = getSocket()

  const [globalState, setGlobalState] = useState({
    orders: [],
    loading: false,
    error: null,
    dataVersion: 0,
    refreshOrders: 0
  });

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
      console.log("🔄 Order update received:", {
        orderNumber,
        itemId,
        componentId,
        updatedComponent,
        newStatus,
        itemChanges,
        orderChanges,
      });

      const team = "coating";
      const STORAGE_KEY = getStorageKey(team);
      let allOrders = getLocalStorageData(STORAGE_KEY) || [];

      const orderIndex = allOrders.findIndex(order => order.order_number === orderNumber);
      if (orderIndex === -1) {
        console.warn("⚠️ Order not found in storage:", orderNumber);
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
                  ? { ...c, ...updatedComponent }
                  : c
              ),
            }
            : item
        ),
      };
      updateOrderInLocalStorage(team, updatedOrder);
      setGlobalState(prev => ({
        ...prev,
        refreshOrders: prev.refreshOrders + 1,
      }));

      console.log("✅ Order updated in storage and refresh triggered");
    },
    []
  );


  const handleOrdersUpdate = useCallback((newOrders) => {

    setGlobalState(prev => ({
      ...prev,
      orders: newOrders,
      dataVersion: prev.dataVersion + 1
    }));
  }, []);



useEffect(() => {
  if (!socket) return;

  socket.emit("joinRoom", "coating");

  const handlePrintingProductionUpdated = ({ order_number, item_id, component_id, updatedComponent }) => {
    console.log("📢 Printing production update received:", order_number, item_id, component_id, updatedComponent);
    handleOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
  };

  const handlePrintingDispatchUpdated = ({ order_number, item_id, component_id, updatedComponent, itemChanges, orderChanges }) => {
    console.log("📦 Printing dispatch update received:", { order_number, item_id, component_id, updatedComponent, itemChanges, orderChanges });
    handleOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status, itemChanges, orderChanges);
  };

  // Handle notifications from other teams
  const handleDecorationTeamNotification = ({ type, message, order_number, item_id, component_id, component_name, previous_team, current_team }) => {
    if (current_team === 'coating' && type === 'READY_FOR_WORK') {
      console.log(`🔔 Notification: ${message}`);
      // Refresh orders to show newly available work
      setGlobalState(prev => ({
        ...prev,
        refreshOrders: prev.refreshOrders + 1,
      }));
      
      // Optional: Show toast notification
      // toast.success(`New work available: ${component_name} from ${previous_team}`);
    }
  };

  socket.on("coatingProductionUpdated", handlePrintingProductionUpdated);
  socket.on("coatingDispatchUpdated", handlePrintingDispatchUpdated);
  socket.on("decorationTeamNotification", handleDecorationTeamNotification);

  return () => {
    socket.off("printingProductionUpdated", handlePrintingProductionUpdated);
    socket.off("printingDispatchUpdated", handlePrintingDispatchUpdated);
    socket.off("decorationTeamNotification", handleDecorationTeamNotification);
  };
}, [socket, handleOrderUpdate]);


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
    const TEAM = "coating";
    const ordersToLoad = getOrdersByStatus(TEAM, orderType);

    if (orderType === "in_progress") {
      const filteredOrders = ordersToLoad.filter(
        order => order.order_status !== "PENDING_PI"
      );
      handleOrdersUpdate(filteredOrders);
    } else {
      handleOrdersUpdate(ordersToLoad);
    }
  }, [handleOrdersUpdate]);

  const renderActiveComponent = () => {
    const commonProps = {
      globalState,
      onOrderUpdate: handleOrderUpdate,
      onOrdersUpdate: handleOrdersUpdate,
      refreshOrders
    };

    switch (activeMenuItem) {
      case 'liveOrders':
        return <CoatingOrders orderType='in_progress' {...commonProps} />;
      case 'ReadyToDispatch':
        return <CoatingOrders orderType='ready_to_dispatch' {...commonProps} />;
      case 'dispatched':
        return <CoatingOrders orderType='dispatched' {...commonProps} />;

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
    title: isEmbedded ? "Coating Department" : "Welcome to Coating Department !",
    mobileTitle: "Coating"
  };

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
                      ? 'text-orange-600 bg-orange-50'
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

      <nav className="hidden sm:block bg-white shadow-md border-b border-gray-200 relative z-0">
        <div className="px-8">
          <div className="flex items-center">
            {mainMenuItems.map((item) => (
              <div key={item.id} className="relative">
                <button
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 z-0 ${activeMenuItem === item.id
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

export default CoatingDashbaord;