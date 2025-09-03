import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package } from 'lucide-react';
import OrderTable from "./components/OrderTable.jsx";
import { getLocalStorageData, getStorageKey, initializeLocalStorage, getOrdersByStatus } from '../../utils/orderStorage.jsx';
import Pagination from '../../utils/Pagination.jsx';
import VehicleDetails from './components/VehicleDetails.jsx';
import {
  canTeamWork,
  hasDecorationForTeam,
  getWaitingMessage,
  getDecorationStatus,
  canTeamApproveVehicles
} from '../../utils/DecorationSequence.jsx';

import UpdateFrostingQty from './components/UpdateFrostingQty.jsx';
import DispatchFrosting from './components/DispatchFrosting.jsx';

const FrostingOrders = ({
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
  const TEAM = 'frosting';
  const STORAGE_KEY = getStorageKey(TEAM);

  const { orders } = globalState;
  const currentOrders = orders || [];

  const FilterFrostingOrders = useCallback((items) => {

    return items.filter(item => {
      const hasFrostingComponent = Array.isArray(item.components) &&
        item.components.some(component => {
          const hasFrosting = component.component_type === "glass" &&
            hasDecorationForTeam(component, 'frosting');
;
          return hasFrosting;
        });

      return hasFrostingComponent;
    });
  }, []);

  const getFrostingStatus = (component) => {
    return getDecorationStatus(component, 'frosting');
  };

  const getRemainingQty = useCallback((component) => {
    const frosting = component?.decorations?.frosting;
    if (!frosting || !frosting.qty) return 'N/A';

    if (frosting.status === 'READY_TO_DISPATCH' || frosting.status === 'DISPATCHED') return 0;

    const totalQuantity = frosting.qty || 0;
    const completedQty = frosting.completed_qty || 0;

    const remaining = totalQuantity - completedQty;
    return Math.max(0, remaining);
  }, [globalState?.dataVersion]);

   const canEditOrder = useCallback((order) => {
    // Check all components in all items of the order
    for (const item of order.items || []) {
      for (const component of item.components || []) {
        if (component.component_type === "glass" &&
          hasDecorationForTeam(component, 'frosting')) {

          // Check decoration sequence workflow
          const { canWork } = canTeamWork(component, 'frosting');
          if (!canWork) {
            return false;
          }

          // Check if is_deco_approved is true
          if (!component.is_deco_approved) {
            return false;
          }

          // NEW: Only check vehicles if this team is responsible for vehicle approval
          const isResponsibleForVehicles = canTeamApproveVehicles(component, 'frosting');
          
          if (isResponsibleForVehicles) {
            // Check if all vehicles are delivered
            if (component.vehicle_details && component.vehicle_details.length > 0) {
              const allDelivered = component.vehicle_details.every(v =>
                v.status === "DELIVERED" || v.received === true
              );
              if (!allDelivered) {
                return false;
              }
            } else {
              return false;
            }
          }
          // If not responsible for vehicles, skip vehicle check
        }
      }
    }
    return true;
  }, []);

  const handleDispatchClick = useCallback((order, item, component) => {
    const FrostingStatus = getFrostingStatus(component);
    if (FrostingStatus !== 'READY_TO_DISPATCH') {
      alert('Component must be ready to dispatch');
      return;
    }

    setSelectedOrder(order);
    setSelectedItem(item);
    setSelectedComponentForDispatch(component);
    setShowDispatchModal(true);
  }, [getFrostingStatus]);

  const handleDispatchModalClose = useCallback(() => {
    setShowDispatchModal(false);
    setSelectedOrder(null);
    setSelectedItem(null);
    setSelectedComponentForDispatch(null);
  }, []);

  // Fixed: Renamed to match frosting functionality
  const hasValidFrostingComponent = useCallback((item) => {
    return item.components?.some(component =>
      hasDecorationForTeam(component, 'frosting')
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
;
        
        if (allStoredOrders && allStoredOrders.length > 0) {
          // Fixed: Pass correct forFrosting parameter (true for frosting team)
          ordersToLoad = getOrdersByStatus(TEAM, orderType, false, allStoredOrders);
      
          
          if (orderType === "in_progress") {
            ordersToLoad = ordersToLoad.filter(order => order.order_status !== "PENDING_PI");
          }
        } else {

          const initialized = await initializeLocalStorage(TEAM, FilterFrostingOrders, false);

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
  }, [orderType, onOrdersUpdate, currentOrders, globalState?.refreshOrders, FilterFrostingOrders, STORAGE_KEY, TEAM]);

  useEffect(() => {
    refreshOrders(orderType);
  }, [refreshOrders, orderType]);

  const filteredOrders = useMemo(() => {
    
    if (!searchTerm.trim()) {
      const filtered = (Array.isArray(currentOrders) ? currentOrders : []).filter(order => {
        const hasValid = order.items?.some(item => hasValidFrostingComponent(item));
    
        return hasValid;
      });

      return filtered;
    }
    
    const searchLower = searchTerm.toLowerCase();
    let results = [];
    currentOrders?.forEach(order => {
      const hasValidFrosting = order.items?.some(item => hasValidFrostingComponent(item));
      if (!hasValidFrosting) return;

      if (
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.customer_name?.toLowerCase().includes(searchLower) ||
        order.manager_name?.toLowerCase().includes(searchLower)
      ) {
        results.push(order);
        return;
      }

      order.items?.forEach(item => {
        if (!hasValidFrostingComponent(item)) return;

        if (item.item_name?.toLowerCase().includes(searchLower)) {
          results.push({ ...order, items: [item] });
          return;
        }

        const matchedComponents = item.components?.filter(c =>
          c.name?.toLowerCase().includes(searchLower) &&
          hasDecorationForTeam(c, 'frosting')
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
  }, [currentOrders, searchTerm, hasValidFrostingComponent]);

const handleEditClick = useCallback((order, item) => {
    if (!canEditOrder(order)) {
      let reasons = [];

      for (const component of item.components || []) {
        if (component.component_type === "glass" &&
          hasDecorationForTeam(component, 'frosting')) {

          const { canWork, reason } = canTeamWork(component, 'frosting');
          if (!canWork) {
            reasons.push(`${component.name}: ${reason}`);
            continue;
          }

          if (!component.is_deco_approved) {
            reasons.push(`${component.name}: Not decoration approved`);
            continue;
          }

          // NEW: Only check vehicles if this team is responsible
          const isResponsibleForVehicles = canTeamApproveVehicles(component, 'frosting');
          
          if (isResponsibleForVehicles) {
            if (!component.vehicle_details || component.vehicle_details.length === 0) {
              reasons.push(`${component.name}: No vehicle details (${TEAM} team responsible)`);
            } else {
              const undelivered = component.vehicle_details.filter(v =>
                v.status !== "DELIVERED" && !v.received
              );
              if (undelivered.length > 0) {
                reasons.push(`${component.name}: ${undelivered.length} vehicle(s) not delivered (${TEAM} team responsible)`);
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
    const FrostingStatus = getFrostingStatus(component);
    if (!FrostingStatus) return 'text-gray-500';

    const normalizedStatus = FrostingStatus.toString().toUpperCase();
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
    const FrostingStatus = getFrostingStatus(component);
    if (!FrostingStatus) return 'N/A';

    return FrostingStatus
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  const getComponentWaitingMessage = useCallback((component) => {
    return getWaitingMessage(component, 'frosting');
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
        getFrostingStatus={getFrostingStatus}
        getComponentWaitingMessage={getComponentWaitingMessage}
        teamName="frosting"
        handleDispatchClick={handleDispatchClick}
        canDispatchComponent={(component) => getFrostingStatus(component) === 'READY_TO_DISPATCH'}
      />

      {showDispatchModal && selectedOrder && selectedItem && selectedComponentForDispatch && (
        <DispatchFrosting
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
        <UpdateFrostingQty
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

export default FrostingOrders;