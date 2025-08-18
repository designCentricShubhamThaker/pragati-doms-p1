import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import StockAvailabilityDialog from './components/StockAvailabilityDialog.jsx';
import OrderTable from "./components/OrderTable.jsx"
import UpdateBottleQty from './components/UpdateBottleQty.jsx'
import TeamSearchAggregation from '../../utils/TeamSearchAggregation.jsx';
import { getLocalStorageData, getStorageKeys, initializeLocalStorage } from '../../utils/orderStorage.jsx';
import AddGlassStock from './components/AddGlassStock.jsx';
import Pagination from '../../utils/Pagination.jsx';

const GlassOrders = ({ orderType = 'in_progress', glassMasterReady = false }) => {
  // Core state
  const [orders, setOrders] = useState([]);
  const [glassMasterData, setGlassMasterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockQuantities, setStockQuantities] = useState({});
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockGlassDetails, setAddStockGlassDetails] = useState(null);

  const ordersPerPage = 5;
  const TEAM = 'glass';
  const STORAGE_KEYS = getStorageKeys(TEAM);

  // Check if both glass master data and orders are ready to render
  const isDataReady = glassMasterReady && glassMasterData.length > 0 && ordersLoaded;

  const isOrderCompleted = useCallback((order) => {
    if (!order?.items?.length) return false;
    return order.items.every(item => {
      const glasss = item.glasss || [];
      if (glasss.length === 0) return true;
      return glasss.every(glass => glass.status === "Completed");
    });
  }, []);

  const FilterGlassOrders = useCallback((items) => {
    return items.filter(item =>
      Array.isArray(item.components) &&
      item.components.some(component => component.component_type === "glass")
    );
  }, []);

  const getRemainingQty = useCallback((component) => {
    if (!component || !component.qty) return 'N/A';
    if (component.status === 'ready_to_dispatch') return 0;

    const totalQuantity = component.qty || 0;
    const completedQty = component.completed_qty || 0;
    const remaining = totalQuantity - completedQty;

    return Math.max(0, remaining);
  }, []);

  // Load glass master data from localStorage (populated by dashboard)
  const loadGlassMasterData = useCallback(() => {
    try {
      console.log('GlassOrders: loadGlassMasterData called, glassMasterReady:', glassMasterReady);

      if (!glassMasterReady) {
        console.log('GlassOrders: Glass master not ready yet');
        return [];
      }

      const glassMasterStr = localStorage.getItem("glassMaster");

      if (glassMasterStr && glassMasterStr !== 'undefined' && glassMasterStr !== 'null') {
        const glassMaster = JSON.parse(glassMasterStr);
        console.log('GlassOrders: loadGlassMasterData - loaded', glassMaster.length, 'items');

        setGlassMasterData(glassMaster);
        return glassMaster;
      }

      console.log('GlassOrders: No valid glassMaster data found in localStorage');
      setGlassMasterData([]);
      return [];
    } catch (error) {
      console.error('Error loading glass master data:', error);
      setGlassMasterData([]);
      return [];
    }
  }, [glassMasterReady]);

  // Create lookup map only when glass master data is available
  const glassLookupMap = useMemo(() => {
    if (!glassMasterReady || glassMasterData.length === 0) {
      console.log('GlassOrders: glassMasterData not ready yet, returning empty map');
      return new Map();
    }

    console.log('GlassOrders: Creating glassLookupMap with', glassMasterData.length, 'items');
    const map = new Map();

    glassMasterData.forEach(glass => {
      const key = `${glass.name?.toLowerCase()}_${glass.capacity}_${glass.weight}_${glass.neck_diameter}`;
      const stock = glass.available_stock ?? 0;
      map.set(key, stock);
      console.log(`GlassOrders: Added to lookup map - ${key}: ${stock}`);
    });

    return map;
  }, [glassMasterData, glassMasterReady]);

  const getAvailableStock = useCallback((glassComponent) => {
    if (!glassComponent || !glassMasterReady || glassMasterData.length === 0) return 0;

    const key = `${glassComponent.name?.toLowerCase()}_${glassComponent.capacity}_${glassComponent.weight}_${glassComponent.neck_diameter}`;
    const stock = glassLookupMap.get(key) ?? 0;

    return stock;
  }, [glassLookupMap, glassMasterReady, glassMasterData.length]);

  // Initialize orders data only after glass master is loaded
  const initializeOrderData = useCallback(async () => {
    try {
      console.log('GlassOrders: initializeOrderData called');
      setOrdersLoaded(false);

      let currentOrders = [];
      const inProgressData = getLocalStorageData(STORAGE_KEYS.IN_PROGRESS);
      const readyToDispatchData = getLocalStorageData(STORAGE_KEYS.READY_TO_DISPATCH);
      const dispatchedData = getLocalStorageData(STORAGE_KEYS.DISPATCHED);

      if (inProgressData && readyToDispatchData && dispatchedData) {
        // Use cached data
        if (orderType === "in_progress") {
          currentOrders = inProgressData;
        } else if (orderType === "ready_to_dispatch") {
          currentOrders = readyToDispatchData;
        } else if (orderType === "dispatched") {
          currentOrders = dispatchedData;
        }
      } else {
        // Initialize from API
        const initialized = await initializeLocalStorage(TEAM, FilterGlassOrders);

        if (orderType === "in_progress") {
          currentOrders = initialized.inProgressOrders || [];
        } else if (orderType === "ready_to_dispatch") {
          currentOrders = initialized.readyToDispatchOrders || [];
        } else if (orderType === "dispatched") {
          currentOrders = initialized.dispatchedOrders || [];
        }
      }

      console.log('GlassOrders: Setting orders with', currentOrders.length, 'items');
      setOrders(currentOrders);
      setOrdersLoaded(true);
    } catch (err) {
      setError(err.message);
      console.error("Error in order initialization:", err);
      setOrdersLoaded(true);
    }
  }, [orderType, STORAGE_KEYS, TEAM, FilterGlassOrders]);

  // Only compute aggregation when both data sources are ready
  const aggregatedglasss = useMemo(() => {
    if (!isDataReady || orders.length === 0) {
      console.log('GlassOrders: Data not ready yet, returning empty aggregation');
      return {};
    }

    console.log('GlassOrders: Computing aggregatedglasss with', orders.length, 'orders and glassMaster loaded');
    const glassMap = {};

    orders.forEach(order => {
      order.items?.forEach(item => {
        const glasses = item.components?.filter(c => c.component_type === "glass") || [];

        glasses.forEach(glass => {
          const key = glass.name?.toLowerCase().trim();
          if (key) {
            if (!glassMap[key]) {
              const availableStock = getAvailableStock(glass);
              console.log(`GlassOrders: Creating aggregation for ${key} with stock ${availableStock}`);

              glassMap[key] = {
                glass_name: glass.name,
                total_quantity: 0,
                total_remaining: 0,
                available_stock: availableStock,
                capacity: glass.capacity,
                weight: glass.weight,
                neck_diameter: glass.neck_diameter,
                orders: []
              };
            }

            const remaining = getRemainingQty(glass);
            glassMap[key].total_quantity += glass.qty || 0;
            glassMap[key].total_remaining += remaining;
            glassMap[key].orders.push({
              order_number: order.order_number,
              item_name: item.item_name,
              quantity: glass.qty,
              remaining: remaining,
              status: glass.status,
              customer_name: order.customer_name,
              manager_name: order.manager_name
            });
          }
        });
      });
    });

    return glassMap;
  }, [orders, getAvailableStock, getRemainingQty, isDataReady]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;

    const searchLower = searchTerm.toLowerCase();

    return orders
      .map(order => {
        // Check if order-level fields match
        if (
          order.order_number?.toLowerCase().includes(searchLower) ||
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.manager_name?.toLowerCase().includes(searchLower)
        ) {
          return order;
        }

        // Filter items and components
        const filteredItems = order.items
          ?.map(item => {
            if (item.item_name?.toLowerCase().includes(searchLower)) {
              return item;
            }

            const filteredComponents = item.components?.filter(component =>
              component.name?.toLowerCase().includes(searchLower)
            ) || [];

            if (filteredComponents.length > 0) {
              return { ...item, components: filteredComponents };
            }

            return null;
          })
          .filter(Boolean) || [];

        return filteredItems.length > 0 ? { ...order, items: filteredItems } : null;
      })
      .filter(Boolean);
  }, [orders, searchTerm]);

  const currentOrders = useMemo(() => {
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  }, [filteredOrders, currentPage, ordersPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // Helper functions
  const getStatusStyle = useCallback((status) => {
    if (!status) return 'text-gray-500';

    const normalizedStatus = status.toString().toUpperCase();

    switch (normalizedStatus) {
      case 'COMPLETED':
        return 'text-green-900 font-semibold';
      case 'IN_PROGRESS':
      case 'PENDING':
        return 'text-orange-600 font-semibold';
      case 'PENDING_PI':
        return 'text-gray-600 font-semibold';
      default:
        return 'text-gray-500';
    }
  }, []);

  const formatStatusLabel = useCallback((status) => {
    if (!status) return 'N/A';
    return status
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  // Initialize data when glass master becomes ready
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      console.log('GlassOrders: useEffect triggered - glassMasterReady:', glassMasterReady, 'ordersLoaded:', ordersLoaded);

      if (glassMasterReady && isMounted && !ordersLoaded) {
        try {
          console.log('GlassOrders: Glass master ready, starting initialization');
          setLoading(true);
          setError(null);

          // Load glass master data
          const glassMaster = loadGlassMasterData();

          // Only proceed if we have glass master data
          if (glassMaster.length > 0) {
            // Load orders
            await initializeOrderData();
          } else {
            console.log('GlassOrders: No glass master data available');
            setOrdersLoaded(true);
          }
        } catch (error) {
          if (isMounted) {
            console.error('GlassOrders: Error during initialization:', error);
            setError(error.message);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else if (!glassMasterReady && isMounted) {
        console.log('GlassOrders: Glass master not ready, resetting states');
        setLoading(true);
        setOrdersLoaded(false);
        setGlassMasterData([]);
        setOrders([]);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [glassMasterReady, ordersLoaded]);

  // Reset orders loaded state when orderType changes
  useEffect(() => {
    if (glassMasterReady && ordersLoaded) {
      console.log('GlassOrders: Order type changed, resetting ordersLoaded');
      setOrdersLoaded(false);
      setOrders([]);
    }
  }, [orderType]);

  // Storage monitoring effect
  useEffect(() => {
    const checkForUpdates = () => {
      try {
        if (!searchTerm || !searchTerm.trim() || !glassMasterReady) {
          return;
        }

        const stored = localStorage.getItem("glassMaster");
        if (stored && stored !== 'undefined' && stored !== 'null') {
          const currentData = JSON.parse(stored);
          const searchLower = searchTerm.toLowerCase().trim();

          const currentItem = glassMasterData.find(item =>
            item?.name?.toLowerCase().includes(searchLower) ||
            item?.data_code?.toLowerCase().includes(searchLower)
          );

          const newItem = currentData.find(item =>
            item?.name?.toLowerCase().includes(searchLower) ||
            item?.data_code?.toLowerCase().includes(searchLower)
          );

          if (currentItem && newItem &&
            currentItem.data_code === newItem.data_code &&
            currentItem.available_stock !== newItem.available_stock) {

            console.log('GlassOrders: Stock change detected for searched item:',
              newItem.name || newItem.data_code,
              'from', currentItem.available_stock,
              'to', newItem.available_stock
            );

            setGlassMasterData(currentData);
          }
        }
      } catch (error) {
        console.error('Error checking for targeted glassMaster updates:', error);
      }
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'glassMaster' && glassMasterReady) {
        console.log('GlassOrders: Storage event received, checking for updates');
        setTimeout(() => {
          loadGlassMasterData();
        }, 100);
      }
    };

    const handleGlassMasterUpdate = (e) => {
      if (glassMasterReady && e.detail?.data) {
        console.log('GlassOrders: Custom glassMasterUpdated event received');
        setGlassMasterData(e.detail.data);
      }
    };

    if (isDataReady) {
      window.addEventListener('storage', handleStorageEvent);
      window.addEventListener('glassMasterUpdated', handleGlassMasterUpdate);
      const interval = setInterval(checkForUpdates, 3000);

      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener('glassMasterUpdated', handleGlassMasterUpdate);
      };
    }
  }, [isDataReady, glassMasterData, searchTerm, loadGlassMasterData, glassMasterReady]);

  const handleAddStock = useCallback((glassDetails) => {
    setSearchTerm(glassDetails.name);
    setCurrentPage(1);
    setAddStockGlassDetails(glassDetails);
    setShowAddStockModal(true);
  }, []);

  const handleCloseAddStock = useCallback(async () => {
    setShowAddStockModal(false);

    setTimeout(() => {
      try {
        loadGlassMasterData();
        console.log('GlassOrders: handleCloseAddStock - refreshed glassMaster data');
      } catch (error) {
        console.error('Error refreshing glass master data:', error);
      }
    }, 500);
  }, [loadGlassMasterData]);

  const toggleRowExpansion = useCallback((rowId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleEditClick = useCallback((order, item) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setShowStockDialog(true);
  }, []);

  const handleStockQuantityChange = useCallback((componentId, value) => {
    setStockQuantities(prev => ({
      ...prev,
      [componentId]: value
    }));
  }, []);

  const handleStockYes = useCallback(() => {
    setShowStockDialog(false);
    setShowModal(true);
  }, []);

  const handleStockNo = useCallback(() => {
    setStockQuantities({});
    setShowStockDialog(false);
    setShowModal(true);
  }, []);

  const handleStockDialogClose = useCallback(() => {
    setShowStockDialog(false);
    setStockQuantities({});
    setSelectedOrder(null);
    setSelectedItem(null);
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setStockQuantities({});
    setSelectedOrder(null);
    setSelectedItem(null);
  }, []);

  const handleCopyGlassName = useCallback((componentName) => {
    setSearchTerm(componentName);
    setCurrentPage(1);
  }, []);

  const handleSearchCustomer = useCallback((customerName) => {
    setSearchTerm(customerName);
    setCurrentPage(1);
  }, []);

  const handleSearchManager = useCallback((managerName) => {
    setSearchTerm(managerName);
    setCurrentPage(1);
  }, []);

  const handleLocalOrderUpdate = useCallback((updatedOrder) => {
    const wasCompleted = isOrderCompleted(
      orders.find(o => o.order_number === updatedOrder.order_number)
    );
    const isNowCompleted = isOrderCompleted(updatedOrder);

    if (wasCompleted !== isNowCompleted) {
      if (isNowCompleted) {
        console.log(`Order ${updatedOrder.order_number} completed - moving to completed storage`);
        moveOrderInStorage(TEAM, updatedOrder.order_number, 'pending', 'completed');
        updateOrderInStorage(TEAM, updatedOrder, 'completed');
        if (orderType === 'pending') {
          setOrders(prev => prev.filter(order =>
            order.order_number !== updatedOrder.order_number
          ));
        }
      } else {
        console.log(`Order ${updatedOrder.order_number} moved back to pending`);
        moveOrderInStorage(TEAM, updatedOrder.order_number, 'completed', 'pending');
        updateOrderInStorage(TEAM, updatedOrder, 'pending');
        if (orderType === 'completed') {
          setOrders(prev => prev.filter(order =>
            order.order_number !== updatedOrder.order_number
          ));
        }
      }
    } else {
      const currentStatus = isNowCompleted ? 'completed' : 'pending';
      updateOrderInStorage(TEAM, updatedOrder, currentStatus);
      setOrders(prev =>
        prev.map(order =>
          order.order_number === updatedOrder.order_number ? updatedOrder : order
        )
      );
    }
    handleClose();
  }, [orders, isOrderCompleted, TEAM, orderType, handleClose]);

  const handleDispatch = useCallback((order, item, component) => {
    console.log(order, item, component, TEAM);
  }, [TEAM]);

  // Show loading state while waiting for glass master or loading data
  if (!glassMasterReady) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        <div className="ml-4 text-gray-600">
          Waiting for glass master data...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        <div className="ml-4 text-gray-600">
          {ordersLoaded ? 'Preparing data...' : 'Loading orders...'}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading orders</h3>
        <p className="text-sm text-red-500 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-full overflow-hidden">
      <TeamSearchAggregation
        teamType="glass"
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        aggregatedItems={aggregatedglasss}
        setCurrentPage={setCurrentPage}
        onAddStock={handleAddStock}
      />

      <OrderTable
        currentOrders={currentOrders}
        orderType={orderType}
        getRemainingQty={getRemainingQty}
        handleEditClick={handleEditClick}
        aggregatedglasss={aggregatedglasss}
        handleSearchCustomer={handleSearchCustomer}
        handleSearchManager={handleSearchManager}
        handleCopyGlassName={handleCopyGlassName}
        expandedRows={expandedRows}
        toggleRowExpansion={toggleRowExpansion}
        getStatusStyle={getStatusStyle}
        formatStatusLabel={formatStatusLabel}
        handleDispatch={handleDispatch}
        getAvailableStock={getAvailableStock}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        ordersPerPage={ordersPerPage}
        filteredOrders={filteredOrders}
        orders={orders}
        searchTerm={searchTerm}
        handlePageChange={handlePageChange}
      />

      <StockAvailabilityDialog
        showStockDialog={showStockDialog}
        selectedItem={selectedItem}
        selectedOrder={selectedOrder}
        stockQuantities={stockQuantities}
        handleStockQuantityChange={handleStockQuantityChange}
        handleStockDialogClose={handleStockDialogClose}
        handleStockNo={handleStockNo}
        handleStockYes={handleStockYes}
        getRemainingQty={getRemainingQty}
        setStockQuantities={setStockQuantities}
        getAvailableStock={getAvailableStock} 
      />

      {showModal && selectedOrder && selectedItem && (
        <UpdateBottleQty
          isOpen={showModal}
          onClose={handleClose}
          orderData={selectedOrder}
          itemData={selectedItem}
          stockQuantities={stockQuantities}
          onUpdate={handleLocalOrderUpdate}
          aggregatedBottles={aggregatedglasss}
          searchTerm={searchTerm}
          getAvailableStock={getAvailableStock}
        />
      )}

      {showAddStockModal && (
        <AddGlassStock
          initialGlassDetails={addStockGlassDetails}
          onClose={handleCloseAddStock}
          glassDetails={addStockGlassDetails}
        />
      )}
    </div>
  );
};

export default GlassOrders;