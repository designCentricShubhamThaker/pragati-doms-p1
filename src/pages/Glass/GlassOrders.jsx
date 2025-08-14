import React, { useState, useEffect } from 'react';
import { Package, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import StockAvailabilityDialog from './components/StockAvailabilityDialog.jsx';
import OrderTable from "./components/OrderTable.jsx"
import UpdateBottleQty from './components/UpdateBottleQty.jsx'
import TeamSearchAggregation from '../../utils/TeamSearchAggregation.jsx';
import { getLocalStorageData, getStorageKeys, initializeLocalStorage } from '../../utils/orderStorage.jsx';
import AddGlassStock from './components/AddGlassStock.jsx';

const GlassOrders = ({ orderType = 'in_progress' }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aggregatedglasss, setAggregatedglasss] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockQuantities, setStockQuantities] = useState({});

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  // Inside GlassOrders component
  const [addStockGlassDetails, setAddStockGlassDetails] = useState(null);


  const ordersPerPage = 5;
  const TEAM = 'glass';
  const STORAGE_KEYS = getStorageKeys(TEAM);
  const [glassMasterData, setGlassMasterData] = useState([]);

  const isOrderCompleted = (order) => {
    if (!order.items || order.items.length === 0) return false;

    return order.items.every(item => {
      const glasss = item.glasss || [];
      if (glasss.length === 0) return true;
      return glasss.every(glass => glass.status === "Completed");
    });
  };

  const FilterGlassOrders = (items) => {
    return items.filter(item =>
      Array.isArray(item.components) &&
      item.components.some(component => component.component_type === "glass")
    );
  };

  const initializeGlassStorage = async () => {
    try {
      console.log('Initializing localStorage with fresh API data...');
      return await initializeLocalStorage(TEAM, FilterGlassOrders);
    } catch (error) {
      console.error('Error initializing localStorage:', error);
      throw error;
    }
  };
  const handleAddStock = (glassDetails) => {
    setSearchTerm(glassDetails.name); // still search by name
    setCurrentPage(1);
    setAddStockGlassDetails(glassDetails); // store all details
    setShowAddStockModal(true);
  };

  const handleCloseAddStock = () => {
    console.log('Closing Add Stock modal');
    setShowAddStockModal(false);
    setAddStockSearchTerm('');

    const refreshGlassData = () => {
      try {
        const data = JSON.parse(localStorage.getItem("glassMaster")) || [];
        setGlassMasterData(data);
        console.log('Glass master data refreshed after stock update');

        // Also refresh aggregated data
        calculateAggregatedglasss();
      } catch (error) {
        console.error('Error refreshing glass master data:', error);
      }
    };

    refreshGlassData();
  };

  useEffect(() => {
    const loadGlassMasterData = () => {
      try {
        const data = JSON.parse(localStorage.getItem("glassMaster")) || [];
        setGlassMasterData(data);
       
      } catch (error) {
        console.error('Error loading glass master data:', error);
        setGlassMasterData([]);
      }
    };

    loadGlassMasterData();
  }, []);

  const getAvailableStock = (glassComponent) => {
    if (!glassComponent || !glassMasterData.length) return 0;

    const matchedGlass = glassMasterData.find(g =>
      g.name?.toLowerCase() === glassComponent.name?.toLowerCase() &&
      Number(g.capacity) === Number(glassComponent.capacity) &&
      Number(g.weight) === Number(glassComponent.weight) &&
      Number(g.neck_diameter) === Number(glassComponent.neck_diameter)
    );
    return matchedGlass?.available_stock ?? 0;
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const inProgressData = getLocalStorageData(STORAGE_KEYS.IN_PROGRESS);
        const readyToDispatchData = getLocalStorageData(STORAGE_KEYS.READY_TO_DISPATCH);
        const dispatchedData = getLocalStorageData(STORAGE_KEYS.DISPATCHED);

        let inProgressOrders, readyToDispatchOrders, dispatchedOrders;

        if (inProgressData && readyToDispatchData && dispatchedData) {
          inProgressOrders = inProgressData;
          readyToDispatchOrders = readyToDispatchData;
          dispatchedOrders = dispatchedData;
        } else {
          const initialized = await initializeGlassStorage();
          inProgressOrders = initialized.inProgressOrders || [];
          readyToDispatchOrders = initialized.readyToDispatchOrders || [];
          dispatchedOrders = initialized.dispatchedOrders || [];
        }

        let currentOrders = [];
        if (orderType === "in_progress") {
          currentOrders = inProgressOrders;
        } else if (orderType === "ready_to_dispatch") {
          currentOrders = readyToDispatchOrders;
        } else if (orderType === "dispatched") {
          currentOrders = dispatchedOrders;
        }

        setOrders(currentOrders);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [orderType]);

  useEffect(() => {
    const switchOrderType = () => {
      try {
        const key = orderType === 'pending' ? STORAGE_KEYS.PENDING : STORAGE_KEYS.COMPLETED;
        const cachedOrders = getLocalStorageData(key);

        if (cachedOrders) {
          setOrders(cachedOrders);
          console.log(`Switched to ${orderType} orders from localStorage`);
        }
      } catch (error) {
        console.error('Error switching order type:', error);
      }
    };
    if (!loading) {
      switchOrderType();
    }
  }, [orderType]);

  const calculateAggregatedglasss = () => {
    const glassMap = {};

    orders.forEach(order => {
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
              manager_name: order.manager_name
            });
          }
        });
      });
    });

    setAggregatedglasss(glassMap);
  };

  useEffect(() => {
    if (glassMasterData.length > 0) {
      calculateAggregatedglasss();
    }
  }, [orders, glassMasterData]);

  const filteredOrders = orders
    .filter(order => {
      if (!searchTerm.trim()) return true;
      const searchLower = searchTerm.toLowerCase();

      if (
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.customer_name?.toLowerCase().includes(searchLower) ||
        order.manager_name?.toLowerCase().includes(searchLower)
      ) {
        return true;
      }

      return order.items?.some(item => {
        if (item.item_name?.toLowerCase().includes(searchLower)) return true;

        return item.components?.some(component =>
          component.name?.toLowerCase().includes(searchLower)
        );
      });
    })
    .map(order => {
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        if (
          order.order_number?.toLowerCase().includes(searchLower) ||
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.manager_name?.toLowerCase().includes(searchLower)
        ) {
          return order;
        }

        const filteredItems =
          order.items
            ?.map(item => {
              if (item.item_name?.toLowerCase().includes(searchLower)) {
                return item;
              }

              const filteredComponents =
                item.components?.filter(component =>
                  component.name?.toLowerCase().includes(searchLower)
                ) || [];

              if (filteredComponents.length > 0) {
                return {
                  ...item,
                  components: filteredComponents
                };
              }

              return null;
            })
            .filter(item => item !== null) || [];

        if (filteredItems.length > 0) {
          return {
            ...order,
            items: filteredItems
          };
        }

        return null;
      }

      return order;
    })
    .filter(order => order !== null);

  const getRemainingQty = (component) => {
    if (!component || !component.qty) return 'N/A';
    if (component.status === 'ready_to_dispatch') return 0;

    const totalQuantity = component.qty || 0;
    const completedQty = component.completed_qty || 0;
    const remaining = totalQuantity - completedQty;

    return Math.max(0, remaining);
  };

  const getStatusStyle = (status) => {
    if (!status) return 'text-gray-500';

    const normalizedStatus = status.toString().toUpperCase();

    switch (normalizedStatus) {
      case 'COMPLETED':
        return 'text-green-900 font-semibold';
      case 'IN_PROGRESS':
        return 'text-orange-600 font-semibold';
      case 'PENDING':
        return 'text-orange-600 font-semibold';
      case 'PENDING_PI':
        return 'text-gray-600 font-semibold';
      default:
        return 'text-gray-500';
    }
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'N/A';
    return status
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const toggleRowExpansion = (rowId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleEditClick = (order, item) => {
    console.log(order, item, "edit");
    setSelectedOrder(order);
    setSelectedItem(item);
    setShowStockDialog(true);
  };

  const handleStockQuantityChange = (componentId, value) => {
    console.log(componentId, "ComponentId");
    setStockQuantities(prev => ({
      ...prev,
      [componentId]: value
    }));
    console.log(stockQuantities, "stock quantities");
  };

  const handleStockYes = () => {
    setShowStockDialog(false);
    setShowModal(true);
  };

  const handleStockNo = () => {
    setStockQuantities({});
    setShowStockDialog(false);
    setShowModal(true);
  };

  const handleStockDialogClose = () => {
    setShowStockDialog(false);
    setStockQuantities({});
    setSelectedOrder(null);
    setSelectedItem(null);
  };

  const handleClose = () => {
    setShowModal(false);
    setStockQuantities({});
    setSelectedOrder(null);
    setSelectedItem(null);
  };

  const handleCopyGlassName = (componentName) => {
    setSearchTerm(componentName);
    setCurrentPage(1);
  };

  // Search helpers
  const handleSearchCustomer = (customerName) => {
    setSearchTerm(customerName);
    setCurrentPage(1);
  };

  const handleSearchManager = (managerName) => {
    setSearchTerm(managerName);
    setCurrentPage(1);
  };

  const handleLocalOrderUpdate = (updatedOrder) => {
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
  };

  const handleDispatch = (order, item, component) => {
    console.log(order, item, component, TEAM);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = window.innerWidth < 640 ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
        <div className="text-sm text-gray-500 order-2 sm:order-1">
          Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length}
          {searchTerm ? ' filtered' : ''} orders
          {orders.length !== filteredOrders.length && (
            <span className="text-orange-600 ml-1">
              (from {orders.length} total)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 order-1 sm:order-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => handlePageChange(number)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${currentPage === number
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              {number}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 max-w-full overflow-hidden">
      <TeamSearchAggregation
        teamType="glass"
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        aggregatedItems={aggregatedglasss}
        setCurrentPage={setCurrentPage}
        onAddStock={handleAddStock} // Now this function is defined
      />

      <OrderTable
        currentOrders={currentOrders}
        orderType={orderType}
        getRemainingQty={getRemainingQty}
        handleEditClick={handleEditClick}
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

      {renderPagination()}

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
        aggregatedBottles={aggregatedglasss}
        searchTerm={searchTerm}
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