import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package } from 'lucide-react';
import OrderTable from "./components/OrderTable.jsx";
import UpdatePrintingQty from './components/UpdatePrintingQty.jsx';
import { getLocalStorageData, getStorageKey, initializeLocalStorage, getOrdersByStatus } from '../../utils/orderStorage.jsx';
import Pagination from '../../utils/Pagination.jsx';
import VehicleDetails from './components/VehicleDetails.jsx';

const PrintingOrders = ({
  orderType = 'in_progress',
  globalState,
  onOrderUpdate,
  onOrdersUpdate,
  refreshOrders
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedComponentId, setSelectedComponentId] = useState(false)
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  const ordersPerPage = 5;
  const TEAM = 'glass'; // Keep glass as storage key but filter for printing
  const STORAGE_KEY = getStorageKey(TEAM);

  const { orders } = globalState;
  const currentOrders = orders || [];

  const FilterPrintingOrders = useCallback((items) => {
    return items.filter(item =>
      Array.isArray(item.components) &&
      item.components.some(component =>
        component.component_type === "glass" &&
        component.decorations &&
        component.decorations.printing
      )
    );
  }, []);

  const getPrintingStatus = (component) => {
    return component?.decorations?.printing?.status ?? 'N/A';
  };
const getRemainingQty = useCallback((component) => {
  const printing = component?.decorations?.printing;
  if (!printing || !printing.qty) return 'N/A';

  if (printing.status === 'ready_to_dispatch') return 0;

  const totalQuantity = printing.qty || 0;
  const completedQty = printing.completed_qty || 0;
  const remaining = totalQuantity - completedQty;

  return Math.max(0, remaining);
}, []);

  const hasValidPrintingComponent = useCallback((item) => {
    return item.components?.some(component =>
      component.decorations?.printing &&
      component.deco_sequence?.includes('printing')
    );
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setSelectedOrder(null);
    setSelectedItem(null);
  }, []);

  const handleCopyGlassName = useCallback((componentName) => {
    setSearchTerm(componentName);
    setCurrentPage(1);
  }, []);

  const handleVehicleModalOpen = useCallback((order, item, component = null) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setSelectedComponentId(component);
    setShowVehicleModal(true);
  }, []);

  const handleVehicleModalClose = useCallback(() => {
    setShowVehicleModal(false);
    setSelectedOrder(null);
    setSelectedItem(null);
  }, []);

  const handleLocalOrderUpdate = useCallback((orderNumber, item_id, component_id, updatedComponent, newStatus, itemChanges = {}, orderChanges = {}) => {
    onOrderUpdate(orderNumber, item_id, component_id, updatedComponent, newStatus, itemChanges, orderChanges);
    handleClose();
  }, [onOrderUpdate, handleClose]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        let ordersToLoad = [];

        const allStoredOrders = getLocalStorageData(STORAGE_KEY);

        if (allStoredOrders && allStoredOrders.length > 0) {
          // Use modified function with printing flag
          ordersToLoad = getOrdersByStatus(TEAM, orderType, true);
          if (orderType === "in_progress") {
            ordersToLoad = ordersToLoad.filter(order => order.order_status !== "PENDING_PI");
          }
        } else {
          // Initialize with printing flag
          const initialized = await initializeLocalStorage(TEAM, FilterPrintingOrders, true);

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

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) {
      return (Array.isArray(currentOrders) ? currentOrders : []).filter(order =>
        order.items?.some(item => hasValidPrintingComponent(item))
      );
    }

    const searchLower = searchTerm.toLowerCase();
    let results = [];

    currentOrders?.forEach(order => {
      // Only process orders that have printing components
      const hasValidPrinting = order.items?.some(item => hasValidPrintingComponent(item));
      if (!hasValidPrinting) return;

      if (
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.customer_name?.toLowerCase().includes(searchLower) ||
        order.manager_name?.toLowerCase().includes(searchLower)
      ) {
        results.push(order);
        return;
      }

      order.items?.forEach(item => {
        if (!hasValidPrintingComponent(item)) return;

        if (item.item_name?.toLowerCase().includes(searchLower)) {
          results.push({ ...order, items: [item] });
          return;
        }

        const matchedComponents = item.components?.filter(c =>
          c.name?.toLowerCase().includes(searchLower) &&
          c.decorations?.printing
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
  }, [currentOrders, searchTerm, hasValidPrintingComponent]);


  const handleEditClick = useCallback((order, item) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setShowModal(true)

  }, []);


  const paginatedOrders = useMemo(() => {
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  }, [filteredOrders, currentPage, ordersPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const getStatusStyle = useCallback((component) => {
    const printingStatus = getPrintingStatus(component);
    if (!printingStatus) return 'text-gray-500';

    const normalizedStatus = printingStatus.toString().toUpperCase();
    switch (normalizedStatus) {
      case 'COMPLETED':
      case 'READY_TO_DISPATCH':
      case 'DISPATCHED':
        return 'text-green-900 font-semibold';
      case 'IN_PROGRESS':
        return 'text-orange-600 font-semibold';
      case 'PENDING':
        return 'text-gray-600 font-semibold';
      default:
        return 'text-gray-500';
    }
  }, []);

  const formatStatusLabel = useCallback((component) => {
    const printingStatus = getPrintingStatus(component);
    if (!printingStatus) return 'N/A';

    return printingStatus
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  if (loading && currentOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading orders: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-full overflow-hidden">
      <OrderTable
        currentOrders={paginatedOrders}
        expandedRows={expandedRows}
        setExpandedRows={setExpandedRows}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleCopyGlassName={handleCopyGlassName}
        handleEditClick={handleEditClick}
        getRemainingQty={getRemainingQty}
        getStatusStyle={getStatusStyle}
        formatStatusLabel={formatStatusLabel}
        setShowModal={setShowModal}
        setSelectedOrder={setSelectedOrder}
        setSelectedItem={setSelectedItem}
        orderType={orderType}
        handleVehicleModalOpen={handleVehicleModalOpen}
        getPrintingStatus={getPrintingStatus}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {showModal && selectedOrder && selectedItem && (
        <UpdatePrintingQty
          isOpen={showModal}
          onClose={handleClose}
          orderData={selectedOrder}
          itemData={selectedItem}
          onUpdate={handleLocalOrderUpdate}
        />
      )}

      {showVehicleModal && selectedOrder && selectedItem && (
        <VehicleDetails
          isOpen={showVehicleModal}
          onClose={handleVehicleModalClose}
          orderData={selectedOrder}
          itemData={selectedItem}
          componentId={selectedComponentId}
          onUpdate={handleLocalOrderUpdate}

        />
      )}
    </div>
  );
};

export default PrintingOrders;