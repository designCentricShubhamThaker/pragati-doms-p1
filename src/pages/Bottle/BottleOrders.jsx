import React, { useState, useEffect } from 'react';
import { Package, Edit, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import StockAvailabilityDialog from './components/StockAvailabilityDialog.jsx';
import OrderTable from './components/OrderTable.jsx';
import UpdateBottleQty from './components/UpdateBottleQty.jsx';
import { getLocalStorageData, getStorageKeys, initializeLocalStorage, moveOrderInStorage, updateOrderInStorage } from '../../utils/orderStorage.jsx';
import TeamSearchAggregation from '../../utils/TeamSearchAggregation.jsx';

const BottleOrders = ({ orderType = 'pending' }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aggregatedBottles, setAggregatedBottles] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockQuantities, setStockQuantities] = useState({});
  const ordersPerPage = 5;
  const TEAM = 'glass';
  const STORAGE_KEYS = getStorageKeys(TEAM);

  const isOrderCompleted = (order) => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.every(item => {
      const glassComponents = getGlassComponents(item);
      if (glassComponents.length === 0) return true;
      return glassComponents.every(component => component.status === 'COMPLETED');
    });
  };

  const getGlassComponents = (item) => {
    if (!item.components || !Array.isArray(item.components)) return [];
    return item.components.filter(component => 
      component && component.component_type === 'glass'
    );
  };

  const filterBottleOrders = (items) => {
    return items.filter(item => {
      const glassComponents = getGlassComponents(item);
      return glassComponents.length > 0;
    });
  };

  const initializeBottleStorage = async () => {
    try {
      console.log('Initializing localStorage with fresh API data...');
      return await initializeLocalStorage(TEAM, isOrderCompleted, filterBottleOrders);
    } catch (error) {
      console.error('Error initializing localStorage:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const pendingData = getLocalStorageData(STORAGE_KEYS.PENDING);
        const completedData = getLocalStorageData(STORAGE_KEYS.COMPLETED);
        let pendingOrders, completedOrders;

        if (pendingData && completedData) {
          pendingOrders = pendingData;
          completedOrders = completedData;
        } else {
          const initialized = await initializeBottleStorage();
          pendingOrders = initialized.pendingOrders;
          completedOrders = initialized.completedOrders;
        }
        const currentOrders = orderType === 'pending' ? pendingOrders : completedOrders;
        setOrders(currentOrders);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching orders:', err);
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

  useEffect(() => {
    const calculateAggregatedBottles = () => {
      const bottleMap = {};
      orders.forEach(order => {
        order.items?.forEach(item => {
          const glassComponents = getGlassComponents(item);
          glassComponents.forEach(component => {
            const key = component.name?.toLowerCase().trim();
            if (key) {
              if (!bottleMap[key]) {
                bottleMap[key] = {
                  bottle_name: component.name,
                  neck_size: component.neck_diameter,
                  capacity: component.capacity,
                  total_quantity: 0,
                  total_remaining: 0,
                  available_stock: 0, 
                  orders: []
                };
              }

              const remaining = getRemainingQty(component);
              bottleMap[key].total_quantity += component.qty || 0;
              bottleMap[key].total_remaining += remaining;
              bottleMap[key].orders.push({
                order_number: order.order_number,
                item_name: item.item_name,
                quantity: component.qty,
                remaining: remaining,
                data_code: component.data_code,
                status: component.status
              });
            }
          });
        });
      });

      setAggregatedBottles(bottleMap);
    };

    calculateAggregatedBottles();
  }, [orders]);

  const filteredOrders = orders.filter(order => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    if (order.order_number?.toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.manager_name?.toLowerCase().includes(searchLower)) {
      return true;
    }

    return order.items?.some(item => {
      if (item.item_name?.toLowerCase().includes(searchLower)) return true;
      const glassComponents = getGlassComponents(item);
      return glassComponents.some(component =>
        component.name?.toLowerCase().includes(searchLower)
      );
    });
  }).map(order => {
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      if (order.order_number?.toLowerCase().includes(searchLower) ||
        order.customer_name?.toLowerCase().includes(searchLower) ||
        order.manager_name?.toLowerCase().includes(searchLower)) {
        return order;
      }
      const filteredItems = order.items?.map(item => {
        if (item.item_name?.toLowerCase().includes(searchLower)) {
          return item;
        }
        const glassComponents = getGlassComponents(item);
        const filteredComponents = glassComponents.filter(component =>
          component.name?.toLowerCase().includes(searchLower)
        );
        if (filteredComponents.length > 0) {
          return {
            ...item,
            components: item.components.map(comp => 
              comp.component_type === 'glass' && filteredComponents.includes(comp) ? comp : comp
            )
          };
        }
        return null;
      }).filter(item => item !== null) || [];

      if (filteredItems.length > 0) {
        return {
          ...order,
          items: filteredItems
        };
      }
      return null;
    }

    return order;
  }).filter(order => order !== null);

  const getRemainingQty = (component) => {
    if (!component || !component.qty) return 'N/A';
    if (component.status === 'COMPLETED') return 0;
    const totalQuantity = component.qty || 0;
    const completedQty = component.completed_qty || 0;
    const remaining = totalQuantity - completedQty;

    return Math.max(0, remaining);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-900 font-semibold';
      case 'IN_PROGRESS':
        return 'text-orange-600 font-semibold';
      case 'PENDING':
        return 'text-orange-600 font-semibold';
      default:
        return 'text-gray-500';
    }
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
    setSelectedOrder(order);
    setSelectedItem(item);
    setShowStockDialog(true);
  };

  const handleStockQuantityChange = (componentId, value) => {
    setStockQuantities(prev => ({
      ...prev,
      [componentId]: value
    }));
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

  const handleCopyBottleName = (bottleName) => {
    setSearchTerm(bottleName);
    setCurrentPage(1);
  };

  const handleSearchCustomer = (customerName) => {
    setSearchTerm(customerName);
    setCurrentPage(1);
  };

  const handleSearchManager = (managerName) => {
    setSearchTerm(managerName);
    setCurrentPage(1);
  };

  const handleLocalOrderUpdate = (updatedOrder) => {
    const wasCompleted = isOrderCompleted(orders.find(o => o.order_number === updatedOrder.order_number));
    const isNowCompleted = isOrderCompleted(updatedOrder);

    if (wasCompleted !== isNowCompleted) {
      if (isNowCompleted) {
        console.log(`Order ${updatedOrder.order_number} completed - moving to completed storage`);
        moveOrderInStorage(TEAM, updatedOrder.order_number, 'pending', 'completed');
        updateOrderInStorage(TEAM, updatedOrder, 'completed');
        if (orderType === 'pending') {
          const filteredOrders = orders.filter(order =>
            order.order_number !== updatedOrder.order_number
          );
          setOrders(filteredOrders);
        }
      } else {
        console.log(`Order ${updatedOrder.order_number} moved back to pending`);
        moveOrderInStorage(TEAM, updatedOrder.order_number, 'completed', 'pending');
        updateOrderInStorage(TEAM, updatedOrder, 'pending');
        if (orderType === 'completed') {
          const filteredOrders = orders.filter(order =>
            order.order_number !== updatedOrder.order_number
          );
          setOrders(filteredOrders);
        }
      }
    } else {
      const currentStatus = isNowCompleted ? 'completed' : 'pending';
      updateOrderInStorage(TEAM, updatedOrder, currentStatus);
      const updatedOrders = orders.map(order =>
        order.order_number === updatedOrder.order_number ? updatedOrder : order
      );
      setOrders(updatedOrders);
    }

    handleClose();
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
      <div>
        <TeamSearchAggregation
          teamType="bottle"
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          aggregatedItems={aggregatedBottles}
          setCurrentPage={setCurrentPage}
        />
      </div>

      <OrderTable
        currentOrders={currentOrders}
        orderType={orderType}
        getRemainingQty={getRemainingQty}
        handleEditClick={handleEditClick}
        handleSearchCustomer={handleSearchCustomer}
        handleSearchManager={handleSearchManager}
        handleCopyBottleName={handleCopyBottleName}
        expandedRows={expandedRows}
        toggleRowExpansion={toggleRowExpansion}
        getStatusStyle={getStatusStyle}
        getGlassComponents={getGlassComponents}
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
        aggregatedBottles={aggregatedBottles}
        searchTerm={searchTerm}
        getGlassComponents={getGlassComponents}
      />
      {showModal && selectedOrder && selectedItem && (
        <UpdateBottleQty
          isOpen={showModal}
          onClose={handleClose}
          orderData={selectedOrder}
          itemData={selectedItem}
          stockQuantities={stockQuantities}
          onUpdate={handleLocalOrderUpdate}
          aggregatedBottles={aggregatedBottles}
          searchTerm={searchTerm}
          getGlassComponents={getGlassComponents}
        />
      )}
    </div>
  );
};

export default BottleOrders;