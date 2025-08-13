import React, { useState, useEffect } from 'react';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalStorageData, getStorageKeys, initializeLocalStorage, moveOrderInStorage, updateOrderInStorage } from '../../utils/orderStorage.jsx';
import TeamSearchAggregation from '../../utils/TeamSearchAggregation.jsx';
import UpdatePrintingQty from './components/UpdatePrintingQty.jsx';
import StockAvailabilityDialog from './components/StockAvailabilityDialog.jsx';
import OrderTable from './components/OrderTable.jsx';

const PrintingOrders = ({ orderType = 'pending' }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aggregatedPrintings, setAggregatedPrintings] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockQuantities, setStockQuantities] = useState({});
  const ordersPerPage = 5;
  const TEAM = 'printing';
  const STORAGE_KEYS = getStorageKeys(TEAM);

  const isOrderCompleted = (order) => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.every(item => {
      const printings = item.printing || [];
      if (printings.length === 0) return true;
      return printings.every(printing => printing.status === 'Completed');
    });
  };

  const filterPrintingOrders = (items) => {
    return items.filter(item => item.printing && item.printing.length > 0);
  };

  const initializePrintingStorage = async () => {
    try {
      console.log('Initializing localStorage with fresh API data...');
      return await initializeLocalStorage(TEAM, isOrderCompleted, filterPrintingOrders);
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
          const initialized = await initializePrintingStorage();
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
    const calculateAggregatedPrintings = () => {
      const printingMap = {};
      orders.forEach(order => {
        order.items?.forEach(item => {
          const printings = item.printing || [];
          printings.forEach(printing => {
            const key = `${printing.bottle_name}`.toLowerCase().trim();
            if (key) {
              if (!printingMap[key]) {
                printingMap[key] = {
                  printing: printing.bottle_name,

                  total_quantity: 0,
                  total_remaining: 0,
                  available_stock: printing.available_stock || 0,
                  orders: []
                };
              }

              const remaining = getRemainingQty(printing);
              printingMap[key].total_quantity += printing.quantity || 0;
              printingMap[key].total_remaining += remaining;
              printingMap[key].orders.push({
                order_number: order.order_number,
                item_name: item.item_name,
                quantity: printing.quantity,
                remaining: remaining,
                printing_id: printing.printing_id,
                status: printing.status
              });
            }
          });
        });
      });
      console.log(printingMap)

      setAggregatedPrintings(printingMap);
    };

    calculateAggregatedPrintings();
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
      return item.printing?.some(printing =>
        printing.bottle_name?.toLowerCase().includes(searchLower)

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
        const filteredPrintings = item.printing?.filter(printing =>
          printing.bottle_name?.toLowerCase().includes(searchLower)

        ) || [];
        if (filteredPrintings.length > 0) {
          return {
            ...item,
            printing: filteredPrintings
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

  const getRemainingQty = (printing) => {
    if (!printing || !printing.quantity) return 'N/A';
    if (printing.status === 'Completed') return 0;
    const totalQuantity = printing.quantity || 0;
    const completedQty = printing.completed_qty || 0;
    const remaining = totalQuantity - completedQty;

    return Math.max(0, remaining);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed':
        return 'text-green-900 font-semibold';
      case 'In Progress':
        return 'text-orange-600 font-semibold';
      case 'Pending':
        return 'text-gray-600 font-semibold';
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
    console.log(item)
    setSelectedOrder(order);
    setSelectedItem(item);
    setShowStockDialog(true);
  };

  const handleStockQuantityChange = (printingId, value) => {
    setStockQuantities(prev => ({
      ...prev,
      [printingId]: value
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

  const handleCopyPrintingName = (bottleName) => {
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
        moveOrderInStorage(TEAM, updatedOrder.order_number, 'pending', 'completed');
        updateOrderInStorage(TEAM, updatedOrder, 'completed');
        if (orderType === 'pending') {
          const filteredOrders = orders.filter(order =>
            order.order_number !== updatedOrder.order_number
          );
          setOrders(filteredOrders);
        }
      } else {
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

  const handlePartiallyReceivedChange = (printingId, checked) => {
  setOrders(prevOrders => {
    const updatedOrders = prevOrders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        printing: item.printing.map(print =>
          print.printing_id === printingId
            ? { ...print, is_partially_received: checked }
            : print
        )
      }))
    }));

    // Find the updated order to persist to localStorage
    const updatedOrder = updatedOrders.find(order =>
      order.items.some(item =>
        item.printing.some(print => print.printing_id === printingId)
      )
    );

    if (updatedOrder) {
      // Determine current status and update localStorage
      const currentStatus = isOrderCompleted(updatedOrder) ? 'completed' : 'pending';
      updateOrderInStorage(TEAM, updatedOrder, currentStatus);
    }

    return updatedOrders;
  });
};

const handleCompletelyReceivedChange = (printingId, checked) => {
  setOrders(prevOrders => {
    const updatedOrders = prevOrders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        printing: item.printing.map(print =>
          print.printing_id === printingId
            ? { ...print, is_completely_received: checked }
            : print
        )
      }))
    }));

    const updatedOrder = updatedOrders.find(order =>
      order.items.some(item =>
        item.printing.some(print => print.printing_id === printingId)
      )
    );

    if (updatedOrder) {
      const currentStatus = isOrderCompleted(updatedOrder) ? 'completed' : 'pending';
      updateOrderInStorage(TEAM, updatedOrder, currentStatus);
    }

    return updatedOrders;
  });
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
        teamType="printing"
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        aggregatedItems={aggregatedPrintings}
        setCurrentPage={setCurrentPage}
      />

      <OrderTable
        currentOrders={currentOrders}
        orderType={orderType}
        getRemainingQty={getRemainingQty}
        handleEditClick={handleEditClick}
        handleSearchCustomer={handleSearchCustomer}
        handleSearchManager={handleSearchManager}
        handleCopyPrintingName={handleCopyPrintingName}
        expandedRows={expandedRows}
        toggleRowExpansion={toggleRowExpansion}
        getStatusStyle={getStatusStyle}
        handlePartiallyReceivedChange={handlePartiallyReceivedChange}
        handleCompletelyReceivedChange={handleCompletelyReceivedChange}
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
        aggregatedPrintings={aggregatedPrintings}
        searchTerm={searchTerm}
      />
      {showModal && selectedOrder && selectedItem && (
        <UpdatePrintingQty
          isOpen={showModal}
          onClose={handleClose}
          orderData={selectedOrder}
          itemData={selectedItem}
          stockQuantities={stockQuantities}
          onUpdate={handleLocalOrderUpdate}
          aggregatedPrintings={aggregatedPrintings}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
};

export default PrintingOrders;