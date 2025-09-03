import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package } from 'lucide-react';
import OrderTable from "./components/OrderTable.jsx";
import UpdatePrintingQty from './components/UpdatePrintingQty.jsx';
import { getLocalStorageData, getStorageKey, initializeLocalStorage, getOrdersByStatus } from '../../utils/orderStorage.jsx';
import Pagination from '../../utils/Pagination.jsx';
import VehicleDetails from './components/VehicleDetails.jsx';
import {
  canTeamWork,
  hasDecorationForTeam,
  getWaitingMessage,
  getDecorationStatus,
  canTeamApproveVehicles,
  areVehiclesApproved // Add this new import
} from '../../utils/DecorationSequence.jsx';

import DispatchPrinting from './components/DispatchPrinting.jsx';

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
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedComponentForDispatch, setSelectedComponentForDispatch] = useState(null);

  const ordersPerPage = 5;
  const TEAM = 'printing';
  const STORAGE_KEY = getStorageKey(TEAM);

  const { orders, dataVersion } = globalState;
  const currentOrders = orders || [];

  const FilterPrintingOrders = useCallback((items) => {
    return items.filter(item =>
      Array.isArray(item.components) &&
      item.components.some(component =>
        component.component_type === "glass" &&
        hasDecorationForTeam(component, 'printing')
      )
    );
  }, []);

  const getPrintingStatus = (component) => {
    return getDecorationStatus(component, 'printing');
  };

  const getRemainingQty = useCallback((component) => {
    const printing = component?.decorations?.printing;
    if (!printing || !printing.qty) return 'N/A';

    if (printing.status === 'READY_TO_DISPATCH' || printing.status === 'DISPATCHED') return 0;

    const totalQuantity = printing.qty || 0;
    const completedQty = printing.completed_qty || 0;

    const remaining = totalQuantity - completedQty;
    return Math.max(0, remaining);
  }, [globalState?.dataVersion]);

const canEditOrder = useCallback((order) => {
  // Check all components in all items of the order
  for (const item of order.items || []) {
    for (const component of item.components || []) {
      if (component.component_type === "glass" &&
        hasDecorationForTeam(component, 'printing')) {

        // Check decoration sequence workflow
        const { canWork } = canTeamWork(component, 'printing');
        if (!canWork) {
          return false;
        }

        // Check if is_deco_approved is true
        if (!component.is_deco_approved) {
          return false;
        }

        // SIMPLIFIED: Only check vehicles if this team is responsible for vehicle approval
        const isResponsibleForVehicles = canTeamApproveVehicles(component, 'printing');

        if (isResponsibleForVehicles) {
          // Use the simplified vehicle approval check
          if (!areVehiclesApproved(component)) {
            return false;
          }
        }
        // If not responsible for vehicles, skip vehicle check entirely
      }
    }
  }
  return true;
}, []);

  const handleDispatchClick = useCallback((order, item, component) => {
    const printingStatus = getPrintingStatus(component);
    if (printingStatus !== 'READY_TO_DISPATCH') {
      alert('Component must be ready to dispatch');
      return;
    }

    setSelectedOrder(order);
    setSelectedItem(item);
    setSelectedComponentForDispatch(component);
    setShowDispatchModal(true);
  }, [getPrintingStatus]);

  const handleDispatchModalClose = useCallback(() => {
    setShowDispatchModal(false);
    setSelectedOrder(null);
    setSelectedItem(null);
    setSelectedComponentForDispatch(null);
  }, []);

  const hasValidPrintingComponent = useCallback((item) => {
    return item.components?.some(component =>
      hasDecorationForTeam(component, 'printing')
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
        // Use team-specific status filtering
        ordersToLoad = getOrdersByStatus(TEAM, orderType, false, allStoredOrders);
        if (orderType === "in_progress") {
          ordersToLoad = ordersToLoad.filter(order => order.order_status !== "PENDING_PI");
        }
      } else {
        const initialized = await initializeLocalStorage(TEAM, FilterPrintingOrders, false);

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
          hasDecorationForTeam(c, 'printing')
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
  if (!canEditOrder(order)) {
    let reasons = [];

    for (const component of item.components || []) {
      if (component.component_type === "glass" &&
        hasDecorationForTeam(component, 'printing')) {

        const { canWork, reason } = canTeamWork(component, 'printing');
        if (!canWork) {
          reasons.push(`${component.name}: ${reason}`);
          continue;
        }

        if (!component.is_deco_approved) {
          reasons.push(`${component.name}: Not decoration approved`);
          continue;
        }

        // SIMPLIFIED: Only check vehicles if this team is responsible
        const isResponsibleForVehicles = canTeamApproveVehicles(component, 'printing');

        if (isResponsibleForVehicles) {
          if (!areVehiclesApproved(component)) {
            const vehicleCount = component.vehicle_details?.length || 0;
            if (vehicleCount === 0) {
              reasons.push(`${component.name}: No vehicles assigned (printing team responsible)`);
            } else {
              const undelivered = component.vehicle_details.filter(v =>
                v.status !== "DELIVERED" && !v.received
              );
              reasons.push(`${component.name}: ${undelivered.length}/${vehicleCount} vehicle(s) not approved`);
            }
          }
        }
        // If not responsible for vehicles, don't add vehicle-related errors
      }
    }

    alert(`Cannot edit:\n${reasons.join('\n')}`);
    return;
  }

  setSelectedOrder(order);
  setSelectedItem(item);
  setShowModal(true);
}, [canEditOrder, TEAM]);

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

  // New function to get waiting message
  const getComponentWaitingMessage = useCallback((component) => {
    return getWaitingMessage(component, 'printing');
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
        canEditOrder={canEditOrder}
        setSelectedOrder={setSelectedOrder}
        setSelectedItem={setSelectedItem}
        orderType={orderType}
        handleVehicleModalOpen={handleVehicleModalOpen}
        getPrintingStatus={getPrintingStatus}
        getComponentWaitingMessage={getComponentWaitingMessage}
        teamName="printing"
        handleDispatchClick={handleDispatchClick}
        canDispatchComponent={(component) => getPrintingStatus(component) === 'READY_TO_DISPATCH'}
      />

      {showDispatchModal && selectedOrder && selectedItem && selectedComponentForDispatch && (
        <DispatchPrinting
          isOpen={showDispatchModal}
          onClose={handleDispatchModalClose}
          orderData={selectedOrder}
          itemData={selectedItem}
          componentData={selectedComponentForDispatch}
          onUpdate={handleLocalOrderUpdate}
        />
      )}

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