import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCcw, Filter, X } from 'lucide-react';

import { getLocalStorageData, getStorageKey, initializeLocalStorage, getOrdersByStatus } from '../../utils/orderStorage.jsx';
import {
  hasDecorationForTeam,
  getDecorationStatus,
  canTeamMarkVehiclesDelivered,
  canItemBeEdited,
  canGlassBeEdited
} from '../../utils/DecorationSequence.jsx';
import Pagination from '../../utils/Pagination.jsx';

import VehicleDetails from './components/VehicleDetails.jsx';
import OrderTable from './components/OrderTable.jsx';
import UpdateTeamQty from './components/UpdateTeamQty.jsx';
import DispatchTeam from './components/DispatchTeam.jsx';
import TeamSearchAggregation from '../../utils/TeamSearchAggregation.jsx';

const DecorationTeamOrders = ({
  orderType,
  globalState,
  onOrderUpdate,
  onOrdersUpdate,
  refreshOrders,
  teamName,
  teamConfig
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // ✅ Separate modal state
  const [editData, setEditData] = useState(null);       // { order, item }
  const [dispatchData, setDispatchData] = useState(null); // { order, item, component }
  const [vehicleData, setVehicleData] = useState(null); 

  const ordersPerPage = 5;
  const STORAGE_KEY = getStorageKey(teamName);

  // Extract orders and dataVersion from globalState
  const { orders, dataVersion } = globalState;
  const currentOrders = orders || [];

  // Team-specific order filtering
  const FilterTeamOrders = useCallback((items) => {
    return items.filter(item =>
      Array.isArray(item.components) &&
      item.components.some(component =>
        component.component_type === "glass" &&
        hasDecorationForTeam(component, teamName)
      )
    );
  }, [teamName]);

 
  const getRemainingQty = useCallback((component) => {
    const teamDecoration = component?.decorations?.[teamName];
    if (!teamDecoration || !teamDecoration.qty) return 'N/A';

    if (teamDecoration.status === 'READY_TO_DISPATCH' || teamDecoration.status === 'DISPATCHED') return 0;

    const totalQuantity = teamDecoration.qty || 0;
    const completedQty = teamDecoration.completed_qty || 0;

    return Math.max(0, totalQuantity - completedQty);
  }, [teamName, dataVersion]);

  const aggregatedItems = useMemo(() => {
    if (currentOrders.length === 0) {
      return {};
    }
    const itemMap = {};
    currentOrders.forEach(order => {
      order.items?.forEach(item => {

        const teamComponents = item.components?.filter(c => 
          c.component_type === "glass" && hasDecorationForTeam(c, teamName)
        ) || [];

        teamComponents.forEach(component => {
          const key = component.name?.toLowerCase().trim();
          if (key) {
            if (!itemMap[key]) {
              itemMap[key] = {
                glass_name: component.name, 
                total_quantity: 0,
                total_remaining: 0,
                available_stock: 'N/A',
                capacity: component.capacity,
                weight: component.weight,
                neck_diameter: component.neck_diameter,
                orders: []
              };
            }

            const teamDecoration = component.decorations?.[teamName];
            const remaining = getRemainingQty(component);
            const quantity = teamDecoration?.qty || 0;
            
            itemMap[key].total_quantity += quantity;
            itemMap[key].total_remaining += remaining;
            itemMap[key].orders.push({
              order_number: order.order_number,
              item_name: item.item_name,
              quantity: quantity,
              remaining: remaining,
              status: teamDecoration?.status,
              customer_name: order.customer_name,
              manager_name: order.manager_name,
              completed_qty: teamDecoration?.completed_qty || 0,
              item_id: item.item_id,
              component_id: component.component_id
            });
          }
        });
      });
    });

    return itemMap;
  }, [
    currentOrders,
    getRemainingQty,
    teamName,
    dataVersion,
    expandedRows.size
  ]);

  const getTeamStatus = (component) => {
    return getDecorationStatus(component, teamName);
  };

  const getGlassEditStatus = useCallback((component) => {
    return canGlassBeEdited(component, teamName);
  }, [teamName]);

  const hasValidTeamComponent = useCallback((item) => {
    return item.components?.some(component =>
      hasDecorationForTeam(component, teamName)
    );
  }, [teamName]);

  // Load orders
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        let ordersToLoad = [];
        const allStoredOrders = getLocalStorageData(STORAGE_KEY);

        if (allStoredOrders && allStoredOrders.length > 0) {
          ordersToLoad = getOrdersByStatus(teamName, orderType, false, allStoredOrders);
          if (orderType === "in_progress") {
            ordersToLoad = ordersToLoad.filter(order => order.order_status !== "PENDING_PI");
          }
        } else {
          const initialized = await initializeLocalStorage(teamName, FilterTeamOrders, false);
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
  }, [
    orderType,
    onOrdersUpdate,
    currentOrders,
    globalState?.refreshOrders,
    dataVersion,
    teamName,
    STORAGE_KEY,
    FilterTeamOrders
  ]);

  useEffect(() => {
    refreshOrders(orderType);
  }, [refreshOrders, orderType]);

  // Filters & search
  const filteredOrders = useMemo(() => {
    let filtered = [...currentOrders];
    filtered = filtered.filter(order =>
      order.items?.some(item => hasValidTeamComponent(item))
    );

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      let results = [];

      filtered.forEach(order => {
        const hasValidTeam = order.items?.some(item => hasValidTeamComponent(item));
        if (!hasValidTeam) return;

        if (
          order.order_number?.toLowerCase().includes(searchLower) ||
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.manager_name?.toLowerCase().includes(searchLower)
        ) {
          results.push(order);
          return;
        }

        order.items?.forEach(item => {
          if (!hasValidTeamComponent(item)) return;

          if (item.item_name?.toLowerCase().includes(searchLower)) {
            results.push({ ...order, items: [item] });
            return;
          }

          const matchedComponents = item.components?.filter(c =>
            c.name?.toLowerCase().includes(searchLower) &&
            hasDecorationForTeam(c, teamName)
          ) || [];

          if (matchedComponents.length > 0) {
            results.push({
              ...order,
              items: [{ ...item, components: matchedComponents }]
            });
          }
        });
      });

      filtered = results;
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(order => {
        switch (filterType) {
          case 'high_priority':
            return order.priority === 'HIGH';
          case 'approved':
            return order.items?.some(item =>
              item.components?.some(comp => comp.is_deco_approved)
            );
          case 'pending_approval':
            return order.items?.some(item =>
              item.components?.some(comp => !comp.is_deco_approved)
            );
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [currentOrders, searchTerm, filterType, hasValidTeamComponent, teamName]);

  const paginatedOrders = useMemo(() => {
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  }, [filteredOrders, currentPage, ordersPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // Handlers
  const handleEditClick = useCallback((order, item) => {
    setEditData({ order, item });
  }, [teamName]);

  const canEditOrder = useCallback((order) => {
    return order.items?.some(item => {
      const { canEdit } = canItemBeEdited(item, teamName);
      return canEdit;
    });
  }, [teamName]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleDispatchClick = useCallback((order, item, component) => {
    const teamStatus = getTeamStatus(component);
    if (teamStatus !== 'READY_TO_DISPATCH') {
      alert('Component must be ready to dispatch');
      return;
    }
    setDispatchData({ order, item, component });
  }, [getTeamStatus]);

  const handleVehicleModalOpen = useCallback((order, item, componentId) => {
    setVehicleData({ order, item, componentId });
  }, []);

  const handleCopyGlassName = useCallback((glassName) => {
    setSearchTerm(glassName);
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

  // ✅ FIXED: Added missing handleAddStock function
  const handleAddStock = useCallback((itemDetails) => {
    // Decoration teams don't add stock, but we can use this to filter by item name
    setSearchTerm(itemDetails.glass_name || itemDetails.name);
    setCurrentPage(1);
  }, []);

  const canDispatchComponent = useCallback((component) => {
    const teamDecoration = component?.decorations?.[teamName];
    return teamDecoration?.status === 'READY_TO_DISPATCH';
  }, [teamName]);

  const getStatusStyle = useCallback((component) => {
    const teamDecoration = component?.decorations?.[teamName];
    const status = teamDecoration?.status;
    switch (status) {
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
  }, [teamName]);

  const formatStatusLabel = useCallback((component) => {
    const teamStatus = getTeamStatus(component);
    if (!teamStatus) return 'N/A';
    return teamStatus
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [getTeamStatus]);

  const handleLocalOrderUpdate = useCallback((orderNumber, item_id, component_id, updatedComponent, newStatus, itemChanges = {}, orderChanges = {}) => {
    onOrderUpdate(orderNumber, item_id, component_id, updatedComponent, newStatus, itemChanges, orderChanges);
    setEditData(null);
    setDispatchData(null);
    setVehicleData(null);
  }, [onOrderUpdate]);

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
     

      {/* ✅ FIXED: Added TeamSearchAggregation component */}
      <TeamSearchAggregation
        teamType="glass" // Use teamName instead of hardcoded "glass"
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        aggregatedItems={aggregatedItems} // Use corrected variable name
        setCurrentPage={setCurrentPage}
        onAddStock={handleAddStock}
      />

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <OrderTable
          currentOrders={paginatedOrders}
          orderType={orderType}
          getRemainingQty={getRemainingQty}
          handleEditClick={handleEditClick}
          handleCopyGlassName={handleCopyGlassName}
          handleSearchCustomer={handleSearchCustomer}
          handleSearchManager={handleSearchManager}
          expandedRows={expandedRows}
          setExpandedRows={setExpandedRows}
          getStatusStyle={getStatusStyle}
          formatStatusLabel={formatStatusLabel}
          handleVehicleModalOpen={handleVehicleModalOpen}
          canEditOrder={canEditOrder}
          handleDispatchClick={handleDispatchClick}
          canDispatchComponent={canDispatchComponent}
          teamName={teamName}
          teamConfig={teamConfig}
          canTeamMarkVehiclesDelivered={canTeamMarkVehiclesDelivered}
        />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        ordersPerPage={ordersPerPage}
        filteredOrders={filteredOrders}
        orders={currentOrders}
        searchTerm={searchTerm}
        handlePageChange={handlePageChange}
      />

      {/* Modals */}
      <UpdateTeamQty
        isOpen={!!editData}
        onClose={() => setEditData(null)}
        orderData={editData?.order}
        itemData={editData?.item}
        onUpdate={handleLocalOrderUpdate}
        teamName={teamName}
        teamConfig={teamConfig}
      />

      <DispatchTeam
        isOpen={!!dispatchData}
        onClose={() => setDispatchData(null)}
        orderData={dispatchData?.order}
        itemData={dispatchData?.item}
        componentData={dispatchData?.component}
        onUpdate={handleLocalOrderUpdate}
        teamName={teamName}
        teamConfig={teamConfig}
      />

      <VehicleDetails
        isOpen={!!vehicleData}
        onClose={() => setVehicleData(null)}
        orderData={vehicleData?.order}
        itemData={vehicleData?.item}
        componentId={vehicleData?.componentId}
        onUpdate={handleLocalOrderUpdate}
        teamName={teamName}
        teamConfig={teamConfig}
      />
    </div>
  );
};

export default DecorationTeamOrders;