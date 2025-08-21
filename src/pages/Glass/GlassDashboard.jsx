import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu, ChevronLeft } from 'lucide-react';
import { FaPowerOff } from "react-icons/fa";
import SharedHeader from '../../components/SharedHeader.jsx';
import { useCurrentDateTime } from '../../hooks/useCurrentDateTime.jsx';
import BottleMaster from './BottleMaster.jsx';
import GlassOrders from './GlassOrders.jsx';

const GlassDashboard = ({ isEmbedded = false }) => {
  const [activeMenuItem, setActiveMenuItem] = useState('liveOrders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentDateTime, formatTime, formatTimeMobile } = useCurrentDateTime();


  const [globalState, setGlobalState] = useState({
    allProducts: [],
    orders: {
      in_progress: [],
      ready_to_dispatch: [],
      dispatched: []
    },
    loading: false,
    error: null,
    glassMasterReady: false,
    dataVersion: 0 
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


  const handleOrderUpdate = useCallback((orderNumber, updatedComponent, newStatus) => {
    setGlobalState(prev => {
      const newOrders = { ...prev.orders };

      Object.keys(newOrders).forEach(bucket => {
        const orderIndex = newOrders[bucket].findIndex(
          order => order.order_number === orderNumber
        );

        if (orderIndex !== -1) {
          const updatedOrder = {
            ...newOrders[bucket][orderIndex],
            items: newOrders[bucket][orderIndex].items.map(item => ({
              ...item,
              components: item.components.map(c =>
                c._id === updatedComponent._id ? updatedComponent : c
              )
            }))
          };

          if (newStatus && bucket !== newStatus) {
            newOrders[bucket].splice(orderIndex, 1);
            if (!newOrders[newStatus]) newOrders[newStatus] = [];
            newOrders[newStatus].push(updatedOrder);
          } else {
            newOrders[bucket][orderIndex] = updatedOrder;
          }
        }
      });

      return {
        ...prev,
        orders: newOrders,
        dataVersion: prev.dataVersion + 1
      };
    });
  }, []);

  const handleStockUpdate = useCallback((updatedProducts) => {
    localStorage.setItem("glassMaster", JSON.stringify(updatedProducts));
    setGlobalState(prev => ({
      ...prev,
      allProducts: updatedProducts,
      dataVersion: prev.dataVersion + 1
    }));

    console.log('Dashboard: Stock updated and synced');
  }, []);


  const handleOrdersUpdate = useCallback((orderType, newOrders) => {
    setGlobalState(prev => ({
      ...prev,
      orders: {
        ...prev.orders,
        [orderType]: newOrders
      },
      dataVersion: prev.dataVersion + 1
    }));
  }, []);

  const handleLogout = useCallback(() => {
    console.log('Logout clicked');
    localStorage.clear();
    setGlobalState({
      allProducts: [],
      orders: { in_progress: [], ready_to_dispatch: [], dispatched: [] },
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
    { id: 'BottleMaster', label: 'Bottle Master' },
  ];

  const renderActiveComponent = () => {
    const commonProps = {
      globalState,
      onOrderUpdate: handleOrderUpdate,
      onStockUpdate: handleStockUpdate,
      onOrdersUpdate: handleOrdersUpdate
    };

    switch (activeMenuItem) {
      case 'liveOrders':
        return <GlassOrders orderType='in_progress' {...commonProps} />;
      case 'ReadyToDispatch':
        return <GlassOrders orderType='ready_to_dispatch' {...commonProps} />;
      case 'BottleMaster':
        return (
          <BottleMaster
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