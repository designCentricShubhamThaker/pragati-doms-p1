
import React, { useState, useEffect, useCallback } from 'react';
import { Menu, ChevronLeft } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import SharedHeader from '../../components/SharedHeader.jsx';
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime.jsx';
import GlassMaster from './GlassMaster.jsx';
import GlassOrders from './GlassOrders.jsx';
import { getSocket } from '../../context/SocketContext.jsx';
import { getLocalStorageData, getOrdersByStatus, getStorageKey, updateOrderInLocalStorage } from '../../utils/orderStorage.jsx';

const GlassDashboard = ({ isEmbedded = false }) => {
  const [activeMenuItem, setActiveMenuItem] = useState('liveOrders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();
  const socket = getSocket()

  const [globalState, setGlobalState] = useState({
    allProducts: [],
    orders: [],
    loading: false,
    error: null,
    glassMasterReady: false,
    dataVersion: 0,
    refreshOrders: 0
  });

  const fetchGlassMaster = useCallback(async () => {
    try {
      setGlobalState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch("https://doms-k1fi.onrender.com/api/masters/glass/all");
      const result = await response.json();

      if (result.success) {
        const newProducts = result.data;
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

  useEffect(() => {
    if (!socket) return;
    socket.emit("joinGlass");

    socket.on("joinedGlass", ({ message }) => {
      console.log("✅ Glass room joined:", message);
    });

    const handleGlassBroadcast = ({ data_code, newStock }) => {
      setGlobalState(prev => {
        const currentGlass = prev.allProducts.find(g => g.data_code === data_code);
        if (!currentGlass || currentGlass.available_stock === newStock) return prev;

        const updatedProducts = prev.allProducts.map(g =>
          g.data_code === data_code ? { ...g, available_stock: newStock } : g
        );
        localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));

        return {
          ...prev,
          orders: updatedProducts,
          dataVersion: prev.dataVersion + 1
        };
      });
    };

    const handleGlassDeletedBroadcast = (deletedProductId) => {
      setGlobalState(prev => {
        const updatedProducts = prev.allProducts.filter(g => g._id !== deletedProductId?.productId);
        localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));

        return {
          ...prev,
          orders: updatedProducts,
          dataVersion: prev.dataVersion + 1
        };
      });
    };

    const handleGlassAddedBroadcast = (newGlass) => {
      setGlobalState(prev => {
        const updatedProducts = [...prev.allProducts, newGlass];
        localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));
        return {
          ...prev,
          orders: updatedProducts,
          dataVersion: prev.dataVersion + 1
        };
      });
    };

    const handleGlassUpdatedBroadcast = (updatedPump) => {
      setGlobalState(prev => {
        const updatedProducts = prev.allProducts.map(p =>
          p._id === updatedPump._id ? updatedPump : p
        );
        localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));

        return {
          ...prev,
          allProducts: updatedProducts,
          dataVersion: prev.dataVersion + 1
        };
      });
    };

    const handleGlassProductionUpdated = ({ order_number, item_id, component_id, updatedComponent }) => {
      console.log("📢 Glass production update received:", order_number, item_id, component_id, updatedComponent);
      handleOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
    };

    const handleGlassStockAdjusted = ({ dataCode, newStock }) => {
      console.log("📢 Broadcasted stock adjustment received:", dataCode, newStock);

      const team = "glass";
      const key = `${team}Master`;
      const masterData = getLocalStorageData(key) || [];

      const updatedData = masterData.map((p) =>
        p.data_code === dataCode ? { ...p, available_stock: newStock } : p
      );

      handleStockUpdate(updatedData);
      localStorage.setItem("glassMaster", JSON.stringify(updatedData));
    }

    const handleNegativeAdjustment = ({
      order_number,
      item_id,
      component_id,
      updatedComponent,
      adjustmentSummary,
      itemChanges,
      orderChanges
    }) => {
      console.log("📢 Received negative adjustment update from another user:", {
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
    }

    const handleVehicleDetailsReceived = ({
      order_number,
      item_id,
      component_id,
      component_name,
      vehicle_details,
      deco_sequence,
      from_team,
      can_approve,
      approval_team,
      team_position,
      total_teams
    }) => {
      console.log("🚛 Vehicle details received from glass:", {
        order_number,
        item_id,
        component_id,
        component_name,
        can_approve,
        approval_team
      });

      // Update the component with vehicle details in local storage
      handleOrderUpdate(
        order_number,
        item_id,
        component_id,
        { vehicle_details, can_approve_vehicles: can_approve },
        null 
      );
    };

    // NEW: Handle vehicle approval updates
    const handleVehicleApprovalUpdated = ({
      order_number,
      item_id,
      component_id,
      updatedComponent,
      approved_by
    }) => {
      console.log("✅ Vehicle approval update received:", {
        order_number,
        component_id,
        approved_by
      });

      handleOrderUpdate(
        order_number,
        item_id,
        component_id,
        updatedComponent,
        null // Don't change status
      );
    };

    // NEW: Handle dispatch updates
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
    };

    // NEW: Handle rollback updates
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
    };

    // NEW: Handle vehicle updates
    const handleGlassVehicleUpdated = ({
      order_number,
      item_id,
      component_id,
      updatedComponent
    }) => {
      console.log("🚛 Glass vehicle update received:", {
        order_number,
        component_id,
        vehicle_details: updatedComponent?.vehicle_details
      });

      handleOrderUpdate(
        order_number,
        item_id,
        component_id,
        updatedComponent,
        null 
      );
    };

    socket.on("joinedGlass", ({ message }) => {
      console.log("✅ Glass room joined:", message);
    });
    
    socket.on("glassStockUpdated", handleGlassBroadcast);
    socket.on("glassDeleted", handleGlassDeletedBroadcast);
    socket.on("glassAdded", handleGlassAddedBroadcast);
    socket.on("glassUpdated", handleGlassUpdatedBroadcast);
    socket.on("glassProductionUpdated", handleGlassProductionUpdated);
    socket.on("glassStockAdjusted", handleGlassStockAdjusted);
    socket.on("glassNegativeAdjustmentUpdated", handleNegativeAdjustment);
    
    // NEW: Register new event listeners for unified workflow
    socket.on("vehicleDetailsReceived", handleVehicleDetailsReceived);
    socket.on("vehicleApprovalUpdated", handleVehicleApprovalUpdated);
    socket.on("glassDispatchUpdated", handleGlassDispatchUpdated);
    socket.on("glassRollbackUpdated", handleGlassRollbackUpdated);
    socket.on("glassVehicleUpdated", handleGlassVehicleUpdated);

    return () => {
      // Clean up all event listeners
      socket.off("joinedGlass");
      socket.off("glassStockUpdated", handleGlassBroadcast);
      socket.off("glassDeleted", handleGlassDeletedBroadcast);
      socket.off("glassAdded", handleGlassAddedBroadcast);
      socket.off("glassUpdated", handleGlassUpdatedBroadcast);
      socket.off("glassProductionUpdated", handleGlassProductionUpdated);
      socket.off("glassStockAdjusted", handleGlassStockAdjusted);
      socket.off("glassNegativeAdjustmentUpdated", handleNegativeAdjustment);
      
      // NEW: Clean up new event listeners
      socket.off("vehicleDetailsReceived", handleVehicleDetailsReceived);
      socket.off("vehicleApprovalUpdated", handleVehicleApprovalUpdated);
      socket.off("glassDispatchUpdated", handleGlassDispatchUpdated);
      socket.off("glassRollbackUpdated", handleGlassRollbackUpdated);
      socket.off("glassVehicleUpdated", handleGlassVehicleUpdated);
    };
  }, [socket]);

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
      refreshOrders
    };



    switch (activeMenuItem) {
      case 'liveOrders':
        return <GlassOrders orderType='in_progress' {...commonProps} />;
      case 'ReadyToDispatch':
        return <GlassOrders orderType='ready_to_dispatch' {...commonProps} />;
      case 'dispatched':
        return <GlassOrders orderType='dispatched' {...commonProps} />;
      case 'GlassMaster':
        return (
          <GlassMaster
            allProducts={globalState.allProducts}
            setAllProducts={(products) => handleStockUpdate(products)}
            loading={globalState.loading}
            error={globalState.error}
            setFilterLoading={(loading) =>
              setGlobalState(prev => ({ ...prev, loading }))
            }
            filterLoading={globalState.loading}
            setGlassMasterReady={(ready) =>
              setGlobalState(prev => ({ ...prev, glassMasterReady: ready }))
            }
          />
        );
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
    title: isEmbedded ? "Bottle Department" : "Welcome to Bottle Department !",
    mobileTitle: "Bottle"
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

export default GlassDashboard;