import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, ChevronLeft } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import SharedHeader from '../../components/SharedHeader.jsx';
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime.jsx';
import GlassMaster from './GlassMaster.jsx';
import GlassOrders from './GlassOrders.jsx';

import { getSocket } from '../../context/SocketContext.jsx';
import { getLocalStorageData, getOrdersByStatus, getStorageKey, updateOrderInLocalStorage } from '../../utils/orderStorage.jsx';
import GlassNotificationPanel from './components/GlassNotificationPanel.jsx';

const GlassDashboard = ({ isEmbedded = false }) => {
  const [activeMenuItem, setActiveMenuItem] = useState('liveOrders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();
  const socket = getSocket();
  const notificationRef = useRef(null);

  const [globalState, setGlobalState] = useState({
    allProducts: [],
    orders: [],
    loading: false,
    error: null,
    glassMasterReady: false,
    dataVersion: 0,
    refreshOrders: 0
  });

  // Helper function to safely trigger notifications
  const triggerNotification = useCallback((eventType, data) => {
    console.log('🔔 Attempting to trigger notification:', eventType, data);
    if (notificationRef.current && notificationRef.current.addNotification) {
      try {
        notificationRef.current.addNotification(eventType, data);
        console.log('✅ Notification triggered successfully:', eventType);
      } catch (error) {
        console.error('❌ Failed to trigger notification:', error);
      }
    } else {
      console.warn('⚠️ Notification ref not available:', {
        hasRef: !!notificationRef.current,
        hasMethod: !!(notificationRef.current?.addNotification)
      });
    }
  }, []);

  const fetchGlassMaster = useCallback(async () => {
    try {
      setGlobalState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch("https://doms-k1fi.onrender.com/api/masters/glass/all");
      const result = await response.json();

      if (result.success) {
        const newProducts = result.data;
        console.log(newProducts, 'glass-master')
        localStorage.setItem("glassMaster", JSON.stringify(newProducts));
        setGlobalState(prev => ({
          ...prev,
          allProducts: newProducts,
          glassMasterReady: true,
          loading: false,
          dataVersion: prev.dataVersion + 1
        }));

        console.log('Dashboard: Glass master data loaded');
      } else {
        throw new Error("Failed to fetch glass master data");
      }
    } catch (err) {
      setGlobalState(prev => ({
        ...prev,
        error: err.message,
        loading: false
      }));
      console.error("Glass Master API Error:", err);
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      const cachedData = localStorage.getItem("glassMaster");

      if (cachedData && cachedData !== 'undefined' && cachedData !== 'null') {
        try {
          const parsedData = JSON.parse(cachedData);
          setGlobalState(prev => ({
            ...prev,
            allProducts: parsedData,
            glassMasterReady: true
          }));
          console.log('Dashboard: Using cached glass master data');
        } catch {
          console.log('Dashboard: Invalid cached data, fetching fresh');
          await fetchGlassMaster();
        }
      } else {
        console.log('Dashboard: No cached data, fetching fresh');
        await fetchGlassMaster();
      }
    };

    initializeData();
  }, [fetchGlassMaster]);

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
      
      const team = "glass";
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

  const handleStockUpdate = useCallback((updatedProducts) => {
    localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));
    setGlobalState(prev => ({
      ...prev,
      allProducts: updatedProducts,
      dataVersion: prev.dataVersion + 1
    }));

    console.log('Dashboard: Stock updated and synced');
  }, []);

  // Socket event handlers with proper notification triggering
  useEffect(() => {
    if (!socket) {
      console.warn('Socket not available');
      return;
    }

    console.log('🔌 Setting up socket listeners...');

    // Join single production room
    socket.emit("joinProduction");

    socket.on("joinedProduction", ({ message }) => {
      console.log("✅ Production room joined:", message);
    });

    // Glass-specific stock updates
    const handleGlassStockUpdated = ({ data_code, newStock }) => {
      console.log("📦 Glass stock updated:", data_code, newStock);
      
      setGlobalState(prev => {
        const currentGlass = prev.allProducts.find(g => g.data_code === data_code);
        if (!currentGlass || currentGlass.available_stock === newStock) return prev;

        const updatedProducts = prev.allProducts.map(g =>
          g.data_code === data_code ? { ...g, available_stock: newStock } : g
        );
        localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));

        return {
          ...prev,
          allProducts: updatedProducts,
          dataVersion: prev.dataVersion + 1
        };
      });
    };

    // Glass master CRUD operations with notifications
    const handleGlassAdded = (newGlass) => {
      console.log("📦 Glass added:", newGlass);
      
      setGlobalState(prev => {
        const updatedProducts = [...prev.allProducts, newGlass];
        localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));
        return {
          ...prev,
          allProducts: updatedProducts,
          dataVersion: prev.dataVersion + 1
        };
      });
      
      // Trigger notification
      setTimeout(() => {
        triggerNotification('glassAdded', newGlass);
      }, 100); // Small delay to ensure ref is available
    };

    const handleGlassUpdated = (updatedGlass) => {
      console.log("🔄 Glass updated:", updatedGlass);
      
      setGlobalState(prev => {
        const updatedProducts = prev.allProducts.map(p =>
          p.data_code === updatedGlass.data_code ? updatedGlass : p
        );
        localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));

        return {
          ...prev,
          allProducts: updatedProducts,
          dataVersion: prev.dataVersion + 1
        };
      });

      // Trigger notification
      setTimeout(() => {
        triggerNotification('glassUpdated', updatedGlass);
      }, 100);
    };

    const handleGlassDeleted = ({ productId }) => {
      console.log("🗑️ Glass deleted:", productId);
      
      setGlobalState(prev => {
        const updatedProducts = prev.allProducts.filter(g => g.data_code !== productId);
        localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));

        return {
          ...prev,
          allProducts: updatedProducts,
          dataVersion: prev.dataVersion + 1
        };
      });

      // Trigger notification
      setTimeout(() => {
        triggerNotification('glassDeleted', { productId });
      }, 100);
    };

    // Glass production updates with notifications
    const handleGlassProductionUpdated = ({ order_number, item_id, component_id, updatedComponent }) => {
      console.log("📢 Glass production update received:", { order_number, item_id, component_id, updatedComponent });
      
      handleOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
      
      // Trigger notification
      setTimeout(() => {
        triggerNotification('glassProductionUpdated', {
          order_number,
          item_id,
          component_id,
          updatedComponent
        });
      }, 100);
    };

    // Glass stock adjustments with notifications
   const handleGlassStockAdjusted = ({ dataCode, newStock }) => {
  console.log("📢 Glass stock adjustment received:", { dataCode, newStock });

  const masterData = getLocalStorageData('glassMaster') || [];
  
  // Add array check before using map
  if (!Array.isArray(masterData)) {
    console.warn('Master data is not an array:', masterData);
    return;
  }
  
  const updatedData = masterData.map((p) =>
    p.data_code === dataCode ? { ...p, available_stock: newStock } : p
  );

  handleStockUpdate(updatedData);
  localStorage.setItem("glassMaster", JSON.stringify(updatedData));

  // Trigger notification
  setTimeout(() => {
    triggerNotification('glassStockAdjusted', { dataCode, newStock });
  }, 100);
};
    // Glass negative adjustments with notifications
    const handleGlassNegativeAdjustmentUpdated = ({
      order_number,
      item_id,
      component_id,
      updatedComponent,
      adjustmentSummary,
      itemChanges,
      orderChanges
    }) => {
      console.log("📢 Glass negative adjustment update received:", {
        order_number,
        component: updatedComponent,
        summary: adjustmentSummary
      });

      handleOrderUpdate(
        order_number,
        item_id,
        component_id,
        updatedComponent,
        updatedComponent?.status,
        itemChanges,
        orderChanges
      );

      // Trigger notification
      setTimeout(() => {
        triggerNotification('glassNegativeAdjustmentUpdated', {
          order_number,
          adjustmentSummary
        });
      }, 100);
    };

    // Glass dispatch updates with notifications
    const handleGlassDispatchUpdated = ({
      order_number,
      item_id,
      component_id,
      updatedComponent,
      itemChanges,
      orderChanges
    }) => {
      console.log("📦 Glass dispatch update received:", {
        order_number,
        component_id,
        status: updatedComponent?.status
      });

      handleOrderUpdate(
        order_number,
        item_id,
        component_id,
        updatedComponent,
        updatedComponent?.status,
        itemChanges,
        orderChanges
      );

      // Trigger notification
      setTimeout(() => {
        triggerNotification('glassDispatchUpdated', {
          order_number,
          component_id
        });
      }, 100);
    };

    // Glass rollback updates with notifications
    const handleGlassRollbackUpdated = ({
      order_number,
      item_id,
      component_id,
      updatedComponent,
      itemChanges,
      orderChanges
    }) => {
      console.log("🔄 Glass rollback update received:", {
        order_number,
        component_id,
        status: updatedComponent?.status
      });

      handleOrderUpdate(
        order_number,
        item_id,
        component_id,
        updatedComponent,
        updatedComponent?.status,
        itemChanges,
        orderChanges
      );

      // Trigger notification
      setTimeout(() => {
        triggerNotification('glassRollbackUpdated', {
          order_number,
          component_id
        });
      }, 100);
    };

    // Register event listeners
    console.log('🔗 Registering socket event listeners...');
    socket.on("glassStockUpdated", handleGlassStockUpdated);
    socket.on("glassAdded", handleGlassAdded);
    socket.on("glassUpdated", handleGlassUpdated);
    socket.on("glassDeleted", handleGlassDeleted);
    socket.on("glassProductionUpdated", handleGlassProductionUpdated);
    socket.on("glassStockAdjusted", handleGlassStockAdjusted);
    socket.on("glassNegativeAdjustmentUpdated", handleGlassNegativeAdjustmentUpdated);
    socket.on("glassDispatchUpdated", handleGlassDispatchUpdated);
    socket.on("glassRollbackUpdated", handleGlassRollbackUpdated);

    return () => {
      console.log('🔌 Cleaning up socket event listeners...');
      // Clean up event listeners
      socket.off("joinedProduction");
      socket.off("glassStockUpdated", handleGlassStockUpdated);
      socket.off("glassAdded", handleGlassAdded);
      socket.off("glassUpdated", handleGlassUpdated);
      socket.off("glassDeleted", handleGlassDeleted);
      socket.off("glassProductionUpdated", handleGlassProductionUpdated);
      socket.off("glassStockAdjusted", handleGlassStockAdjusted);
      socket.off("glassNegativeAdjustmentUpdated", handleGlassNegativeAdjustmentUpdated);
      socket.off("glassDispatchUpdated", handleGlassDispatchUpdated);
      socket.off("glassRollbackUpdated", handleGlassRollbackUpdated);
    };
  }, [socket, handleOrderUpdate, handleStockUpdate, triggerNotification]); // Added dependencies

  const handleOrdersUpdate = useCallback((newOrders) => {
    setGlobalState(prev => ({
      ...prev,
      orders: newOrders,
      dataVersion: prev.dataVersion + 1
    }));
  }, []);

  const handleLogout = useCallback(() => {
    console.log('Logout clicked');
    localStorage.clear();
    setGlobalState({
      allProducts: [],
      orders: [],
      loading: false,
      error: null,
      glassMasterReady: false,
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
    { id: 'GlassMaster', label: 'Glass Master' }
  ];

  const refreshOrders = useCallback((orderType) => {
    const TEAM = "glass";
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
      onStockUpdate: handleStockUpdate,
      onOrdersUpdate: handleOrdersUpdate,
      refreshOrders,
    };

    switch (activeMenuItem) {
      case 'GlassMaster':
        return <GlassMaster {...commonProps} />;
      case 'liveOrders':
        return <GlassOrders {...commonProps} orderType="in_progress" />;
      case 'ReadyToDispatch':
        return <GlassOrders {...commonProps} orderType="ready_to_dispatch" />;
      case 'dispatched':
        return <GlassOrders {...commonProps} orderType="dispatched" />;
      default:
        return <GlassOrders {...commonProps} orderType="in_progress" />;
    }
  };

  if (globalState.loading && !globalState.glassMasterReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Glass Dashboard...</p>
        </div>
      </div>
    );
  }

  if (globalState.error && !globalState.glassMasterReady) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-red-500 mb-4">{globalState.error}</p>
          <button
            onClick={fetchGlassMaster}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const headerConfig = {
    showGradient: !isEmbedded,
    showTime: !isEmbedded,
    title: isEmbedded ? "Glass Department" : "Welcome to Glass Department !",
    mobileTitle: "Glass"
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
        additionalHeaderContent={<GlassNotificationPanel ref={notificationRef} teamName="glass" />}
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
                    ? 'text-orange-600 border-orange-500 bg-blue-50'
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

export default GlassDashboard;