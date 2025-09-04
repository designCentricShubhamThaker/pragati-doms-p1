import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package } from 'lucide-react';
import StockAvailabilityDialog from './components/StockAvailabilityDialog.jsx';
import OrderTable from "./components/OrderTable.jsx";
import UpdateBottleQty from './components/UpdateBottleQty.jsx';
import TeamSearchAggregation from '../../utils/TeamSearchAggregation.jsx';
import { getLocalStorageData, getStorageKey, initializeLocalStorage, getOrdersByStatus } from '../../utils/orderStorage.jsx';
import AddGlassStock from './components/AddGlassStock.jsx';
import Pagination from '../../utils/Pagination.jsx';
import AddVehicleDetails from './components/AddVehicleDetails.jsx';
import DispatchOrders from './components/DispatchOrders.jsx';
import RollbackOrderModal from './components/RollbackOrderModal.jsx';
import { getSocket } from '../../context/SocketContext.jsx';

const GlassOrders = ({
  orderType = 'in_progress',
  globalState,
  onOrderUpdate,
  onStockUpdate,
  onOrdersUpdate,
  refreshOrders
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockQuantities, setStockQuantities] = useState({});
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockGlassDetails, setAddStockGlassDetails] = useState(null);
  const [dispatchOrder, setDispatchOrder] = useState(false)
  const [rollback, setRollback] = useState(false)
    const [selectHandleNegativeValue , setSetlectHandleNegative] = useState(null);

  const ordersPerPage = 5;
  const TEAM = 'glass';
  const STORAGE_KEY = getStorageKey(TEAM);

  const { allProducts, orders, glassMasterReady, dataVersion } = globalState;
  const socket = getSocket()
  const currentOrders = orders || [];

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


  const glassLookupMap = useMemo(() => {
    if (!glassMasterReady || allProducts.length === 0) {
      return new Map();
    }
    const map = new Map();
    allProducts.forEach(glass => {
      const key = `${glass.name?.toLowerCase()}_${glass.capacity}_${glass.weight}_${glass.neck_diameter}`;
      const stock = glass.available_stock ?? 0;
      map.set(key, stock);
    });
    return map;
  }, [allProducts, glassMasterReady, dataVersion]);

  const getAvailableStock = useCallback((glassComponent) => {
    if (!glassComponent || !glassMasterReady || allProducts.length === 0) return 0;
    const key = `${glassComponent.name?.toLowerCase()}_${glassComponent.capacity}_${glassComponent.weight}_${glassComponent.neck_diameter}`;
    return glassLookupMap.get(key) ?? 0;
  }, [glassLookupMap, glassMasterReady, allProducts.length]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setShowVehicleDetails(false);
    setDispatchOrder(false)
    setStockQuantities({});
    setSelectedComponent(null)
    setRollback(false)
    setSelectedOrder(null);
    setSelectedItem(null);
    setSetlectHandleNegative(null)
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        let ordersToLoad = [];

        const allStoredOrders = getLocalStorageData(STORAGE_KEY);

        if (allStoredOrders && allStoredOrders.length > 0) {
          ordersToLoad = getOrdersByStatus(TEAM, orderType);
          if (orderType === "in_progress") {
            ordersToLoad = ordersToLoad.filter(order => order.order_status !== "PENDING_PI");
          }
        } else {
          const initialized = await initializeLocalStorage(TEAM, FilterGlassOrders);

          if (orderType === "in_progress") {
            ordersToLoad = (initialized.inProgressOrders || []).filter(
              order => order.order_status !== "PENDING_PI"
            );
          } else if (orderType === "ready_to_dispatch") {
            ordersToLoad = initialized.readyToDispatchOrders || [];
          } else if (orderType === "dispatched") {
            ordersToLoad = initialized.dispatchedOrders || [];
          }
        }

        if (JSON.stringify(ordersToLoad) !== JSON.stringify(currentOrders)) {
          onOrdersUpdate(ordersToLoad);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [orderType, onOrdersUpdate, currentOrders, globalState?.refreshOrders]);

  useEffect(() => {
    refreshOrders(orderType);
  }, [refreshOrders, orderType]);

  const handleDispatchGlass = useCallback(
    async () => {
      try {
        if (!selectedOrder || !selectedItem || !selectedComponent) {
          console.error("❌ Missing dispatch selection");
          return;
        }

        const dispatchPayload = {
          order_number: selectedOrder.order_number,
          item_id: selectedItem.item_id,
          component_id: selectedComponent.component_id,
          component: selectedComponent,
          updateData: {
            dispatched_by: "glass_admim",
            notes: "Glass component dispatched to warehouse for final assembly."
          }
        };

        socket.emit("dispatchGlassComponent", dispatchPayload);

        socket.once("glassDispatchUpdatedSelf", ({ order_number, item_id, component_id, updatedComponent, itemChanges, orderChanges }) => {
          onOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status, itemChanges, orderChanges);
        });

        socket.once("glassDispatchError", ({ message }) => {
          console.error("Dispatch error:", message);
          setError(`Error dispatching order: ${message}`);
          setLoading(false);
        });

   

      } catch (error) {
        console.error("Error in dispatch operation:", error);
        setError(`Dispatch failed: ${error.message}`);
        setLoading(false);
      }
    },
    [
      selectedOrder,
      selectedItem,
      selectedComponent,
      onOrderUpdate,
      handleClose
    ]
  );

   const handleNegativeValueModal = useCallback(() => {
    setSetlectHandleNegative("rollBack");
    setShowStockDialog(false);
    setShowModal(true);
  }, []);



  const aggregatedglasss = useMemo(() => {

    if (!glassMasterReady || currentOrders.length === 0) {
      return {};
    }

    const glassMap = {};

    currentOrders.forEach(order => {
      order.items?.forEach(item => {
        const glasses = item.components?.filter(c => c.component_type === "glass") || [];

        glasses.forEach(glass => {
          const key = glass.name?.toLowerCase().trim();
          if (key) {
            if (!glassMap[key]) {
              const availableStock = getAvailableStock(glass);
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
              manager_name: order.manager_name,
              completed_qty: glass.completed_qty || 0, // Add this to track progress
              item_id: item.item_id, // Add this for better tracking
              component_id: glass.component_id // Add this for better tracking
            });
          }
        });
      });
    });

    return glassMap;
  }, [
    currentOrders,
    getAvailableStock,
    getRemainingQty,
    glassMasterReady,
    dataVersion,
    expandedRows.size //
  ]);

  // Filtered orders based on search
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return Array.isArray(currentOrders) ? currentOrders : [];

    const searchLower = searchTerm.toLowerCase();
    let results = [];

    currentOrders?.forEach(order => {
      if (
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.customer_name?.toLowerCase().includes(searchLower) ||
        order.manager_name?.toLowerCase().includes(searchLower)
      ) {
        results.push(order);
        return;
      }

      order.items?.forEach(item => {
        if (item.item_name?.toLowerCase().includes(searchLower)) {
          results.push({ ...order, items: [item] });
          return;
        }

        const matchedComponents = item.components?.filter(c =>
          c.name?.toLowerCase().includes(searchLower)
        ) || [];

        if (matchedComponents.length > 0) {
          results.push({
            ...order,
            items: [{ ...item, components: matchedComponents }]
          });
        }
      });
    });

    return results;
  }, [currentOrders, searchTerm]);

  const paginatedOrders = useMemo(() => {
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  }, [filteredOrders, currentPage, ordersPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);


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


  const handleAddStock = useCallback((glassDetails) => {
    setSearchTerm(glassDetails.name);
    setCurrentPage(1);
    setAddStockGlassDetails(glassDetails);
    setShowAddStockModal(true);
  }, []);

  const handleCloseAddStock = useCallback(() => {
    setShowAddStockModal(false);
    setAddStockGlassDetails(null);
    setSelectedComponent(null)
  }, []);

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



 const handleLocalOrderUpdate = useCallback((orderNumber, item_id, component_id, updatedComponent, newStatus , itemChanges = {},orderChanges = {}) => {
    onOrderUpdate(orderNumber, item_id, component_id, updatedComponent, newStatus,itemChanges,orderChanges);
    handleClose();
  }, [onOrderUpdate, handleClose]);


  const handleVehicleDetails = useCallback((order, item, component) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setShowVehicleDetails(true);
  }, []);

  const handleDispatch = useCallback((order, item, component) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setSelectedComponent(component)
    setDispatchOrder(true);
  }, []);

  const handleRollback = useCallback((order, item, component) => {
    setSelectedOrder(order);
    setSelectedItem(item);
     setSelectedComponent(component);
    setRollback(true);
  }, []);

 const handleRollbackOrder = useCallback(
  async () => {
    try {
      if (!selectedOrder || !selectedItem || !selectedComponent) {
        console.error("❌ Missing rollback selection");
        return;
      }

      setLoading(true);
      setError(null);

      const rollbackPayload = {
        order_number: selectedOrder.order_number,
        item_id: selectedItem.item_id,
        component_id: selectedComponent.component_id,
        updateData: {
          quantity_to_rollback: selectedComponent.completed_qty, 
          reason: "Removing from Orders and Add into Stock",
          rollback_by: "glass_admin",
        },
        component_data_code: selectedComponent.data_code,
      };

      console.log("🔄 Starting rollback process...", rollbackPayload);

      // Listen for vehicle clearing update
      socket.once("glassVehicleUpdatedSelf", ({ order_number, item_id, component_id, updatedComponent }) => {
        console.log("🚛 Vehicle details cleared:", updatedComponent);
        onOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
      });

      // Listen for rollback completion
      socket.once("glassRollbackUpdatedSelf", ({ order_number, item_id, component_id, updatedComponent, itemChanges, orderChanges }) => {
        console.log("✅ Rollback completed:", updatedComponent);
        onOrderUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status, itemChanges, orderChanges);
        setLoading(false);
      });

      // Listen for stock adjustment
      socket.once("glassStockAdjustedSelf", ({ dataCode, newStock }) => {
        console.log("📦 Stock adjusted:", dataCode, newStock);

        const updatedProducts = allProducts.map(p =>
          p.data_code === dataCode ? { ...p, available_stock: newStock } : p
        );

        onStockUpdate(updatedProducts);
      });

      // Listen for any errors
      socket.once("glassRollbackError", ({ message }) => {
        console.error("❌ Rollback error:", message);
        setError(`Error rolling back order: ${message}`);
        setLoading(false);
      });

      // Emit the rollback request
      socket.emit("rollbackGlassProduction", rollbackPayload);

      // Auto-close modal after a delay (optional)
      setTimeout(() => {
        if (!error) {
          handleClose();
        }
      }, 2000);

    } catch (error) {
      console.error("Error in rollback operation:", error);
      setError(`Rollback failed: ${error.message}`);
      setLoading(false);
    }
  },
  [
    selectedOrder,
    selectedItem,
    selectedComponent,
    handleClose,
    allProducts,
    onStockUpdate,
    onOrderUpdate,
    error
  ]
);


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
        <div className="ml-4 text-gray-600">Loading orders...</div>
      </div>
    );
  }

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
        currentOrders={paginatedOrders}
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
        handleVehicleDetails={handleVehicleDetails}
        getAvailableStock={getAvailableStock}
        handleDispatch={handleDispatch}
        handleRollback={handleRollback}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        ordersPerPage={ordersPerPage}
        filteredOrders={filteredOrders}
        orders={currentOrders}
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
         handleNegativeValueModal={handleNegativeValueModal}
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
          onStockUpdate={onStockUpdate}
          mode = {selectHandleNegativeValue}
        />
      )}

      {showAddStockModal && (
        <AddGlassStock
          isOpen={showAddStockModal}
          initialGlassDetails={addStockGlassDetails}
          onClose={handleCloseAddStock}
          glassDetails={addStockGlassDetails}
          onStockUpdate={onStockUpdate}
        />
      )}

      {showVehicleDetails && selectedOrder && selectedItem && (
        <AddVehicleDetails
          isOpen={showVehicleDetails}
          onClose={handleClose}
          orderData={selectedOrder}
          itemData={selectedItem}
          onUpdate={handleLocalOrderUpdate}
        />
      )}
      {dispatchOrder && selectedOrder && selectedItem && (
        <DispatchOrders
          isOpen={dispatchOrder}
          onClose={handleClose}
          orderData={selectedOrder}
          itemData={selectedItem}
          onUpdate={handleLocalOrderUpdate}
          onDispatch={handleDispatchGlass}
        />
      )}
      {rollback && selectedOrder && selectedItem && (
        <RollbackOrderModal
          isOpen={rollback}
          onClose={handleClose}
          selectedComponent={selectedComponent}
          orderData={selectedOrder}
          itemData={selectedItem}
          onUpdate={handleLocalOrderUpdate}
           onConfirm={handleRollbackOrder}
        />
      )}
    </div>
  );
};

export default GlassOrders;