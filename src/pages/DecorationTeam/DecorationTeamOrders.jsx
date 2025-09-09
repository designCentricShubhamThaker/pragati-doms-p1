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
  const [vehicleData, setVehicleData] = useState(null);   // { order, item, componentId }

  const ordersPerPage = 5;
  const STORAGE_KEY = getStorageKey(teamName);

  const { orders } = globalState;
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

  const getTeamStatus = (component) => {
    return getDecorationStatus(component, teamName);
  };

  const getRemainingQty = useCallback((component) => {
    const teamDecoration = component?.decorations?.[teamName];
    if (!teamDecoration || !teamDecoration.qty) return 'N/A';

    if (teamDecoration.status === 'READY_TO_DISPATCH' || teamDecoration.status === 'DISPATCHED') return 0;

    const totalQuantity = teamDecoration.qty || 0;
    const completedQty = teamDecoration.completed_qty || 0;

    return Math.max(0, totalQuantity - completedQty);
  }, [teamName, globalState?.dataVersion]);

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
    globalState?.dataVersion,
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
    const { canEdit, reason } = canItemBeEdited(item, teamName);
    if (!canEdit) {
      alert(`Cannot edit this item: ${reason}`);
      return;
    }
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
      {/* Search & Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search orders, customers, glass names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Orders</option>
              <option value="high_priority">High Priority</option>
              <option value="approved">Approved</option>
              <option value="pending_approval">Pending Approval</option>
            </select>
          </div>
        </div>
      </div>

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
