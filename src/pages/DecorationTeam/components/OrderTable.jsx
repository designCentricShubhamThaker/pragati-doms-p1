import React from 'react';
import { Package, Edit, Eye, EyeOff } from 'lucide-react'
import { FcApproval } from "react-icons/fc";
import { FcCancel } from "react-icons/fc";
import {
  hasDecorationForTeam,
  canTeamWork,
  canTeamApproveVehicles,
  getVehicleApprovalStatus,
  parseDecorationSequence
} from '../../../utils/DecorationSequence.jsx';

const OrderTable = ({
  currentOrders,
  orderType,
  getRemainingQty,
  handleEditClick,
  handleCopyGlassName,
  handleSearchCustomer,
  handleSearchManager,
  expandedRows,
  setExpandedRows,
  getStatusStyle,
  formatStatusLabel,
  handleVehicleModalOpen,
  canEditOrder,
  handleDispatchClick,
  canDispatchComponent,
  teamName,
  teamConfig,
  getComponentWaitingMessage
}) => {

  const toggleRowExpansion = (rowId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  function sumTrackingKey(tracking, key) {
    return tracking?.reduce((total, entry) => {
      return total + (Number(entry[key]) || 0);
    }, 0) || 0;
  }



 const renderVehicleApproval = (glass, order, item) => {
  const vehicleStatus = getVehicleApprovalStatus(glass, teamName);
  const canApprove = canTeamApproveVehicles(glass, teamName);
  const vehicleCount = glass.vehicle_details?.length || 0;

  const getDisplayInfo = () => {
    switch (vehicleStatus) {
      case 'NO_VEHICLES':
        return {
          text: 'No vehicles assigned',
          icon: <FcCancel size={16} />,
          color: 'text-gray-500',
          clickable: canApprove
        };
      case 'PENDING':
        return {
          text: `${vehicleCount} vehicles pending`,
          icon: <FcCancel size={16} />,
          color: 'text-red-600',
          clickable: true
        };
      case 'APPROVED':
        return {
          text: `${vehicleCount} vehicles approved`,
          icon: <FcApproval size={16} />,
          color: 'text-green-600',
          clickable: canApprove
        };
      case 'WAITING_FOR_FIRST_TEAM':
        const sequence = parseDecorationSequence(glass.deco_sequence);
        const firstTeam = sequence[0];
        return {
          text: `Awaiting ${firstTeam}`,
          icon: <FcCancel size={16} />,
          color: 'text-orange-500',
          clickable: false
        };
      case 'NOT_RESPONSIBLE':
        return {
          text: vehicleCount > 0 ? 'Other team manages' : 'N/A',
          icon: <span className="text-gray-400">•</span>,
          color: 'text-gray-400',
          clickable: false
        };
      default:
        return {
          text: 'Unknown status',
          icon: <FcCancel size={16} />,
          color: 'text-gray-400',
          clickable: false
        };
    }
  };

  const { text, icon, color, clickable } = getDisplayInfo();

  const handleClick = () => {
    if (clickable && canApprove) {
      handleVehicleModalOpen(order, item, glass.component_id);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`flex items-center gap-1 ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={handleClick}
        title={clickable ? 'Click to manage vehicles' : text}
      >
        {icon}
      </div>
      <span className={`text-xs ${color} mt-1 text-center max-w-20`}>
        {text}
      </span>
    </div>
  );
};

  // Get team-specific colors
  const getTeamColors = () => {
    const colorMap = {
      orange: {
        header: 'from-orange-800 via-orange-600 to-orange-400',
        text: 'text-orange-800',
        textLight: 'text-orange-600',
        textDark: 'text-orange-900',
        button: 'bg-orange-600 hover:bg-orange-500',
        border: 'border-orange-200',
        bg: 'bg-orange-50'
      },
      blue: {
        header: 'from-blue-800 via-blue-600 to-blue-400',
        text: 'text-blue-800',
        textLight: 'text-blue-600',
        textDark: 'text-blue-900',
        button: 'bg-blue-600 hover:bg-blue-500',
        border: 'border-blue-200',
        bg: 'bg-blue-50'
      },
      purple: {
        header: 'from-purple-800 via-purple-600 to-purple-400',
        text: 'text-purple-800',
        textLight: 'text-purple-600',
        textDark: 'text-purple-900',
        button: 'bg-purple-600 hover:bg-purple-500',
        border: 'border-purple-200',
        bg: 'bg-purple-50'
      },
      yellow: {
        header: 'from-yellow-800 via-yellow-600 to-yellow-400',
        text: 'text-yellow-800',
        textLight: 'text-yellow-600',
        textDark: 'text-yellow-900',
        button: 'bg-yellow-600 hover:bg-yellow-500',
        border: 'border-yellow-200',
        bg: 'bg-yellow-50'
      }
    };
    return colorMap[teamConfig?.color || 'orange'];
  };

  const colors = getTeamColors();
  const teamDisplayName = teamConfig?.name || teamName.charAt(0).toUpperCase() + teamName.slice(1);

  if (currentOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className={`w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center mb-4`}>
          <Package className={`w-8 h-8 ${colors.textLight}`} />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No {orderType} {teamDisplayName} orders found
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          {orderType === 'pending'
            ? `When you receive new ${teamDisplayName} orders, they will appear here for easy management and tracking.`
            : `Completed ${teamDisplayName} orders will appear here once all ${teamDisplayName} components in an order are finished.`}
        </p>
      </div>
    );
  }

  const colorClasses = [
    `${colors.bg}`,
    `bg-${teamConfig?.color || 'orange'}-100`,
    'bg-yellow-50',
    'bg-yellow-100'
  ];

  return (
    <div className="space-y-4">
      {/* Desktop view */}
      <div className="hidden xl:block">
        <div className={`bg-gradient-to-r ${colors.header} rounded-lg shadow-md py-3 px-4 mb-3`}>
          <div className={`grid ${orderType === 'ready_to_dispatch' ? 'grid-cols-24' : 'grid-cols-24'} gap-1 text-white font-semibold text-xs items-center`}>
            <div className="text-left col-span-2">Order #</div>
            <div className="text-left col-span-2">Manager</div>
            <div className="text-left col-span-2">Customer</div>
            <div className="text-center">Progress</div>
            <div className="text-left col-span-1">Item</div>
            <div className="text-left col-span-2">Glass Name</div>
            <div className="text-left flex justify-center">Weight</div>
            <div className="text-left flex justify-center">Capacity</div>
            <div className="text-left flex justify-center">Neck Size</div>
            <div className="text-left">{teamDisplayName} Qty</div>
            <div className="text-left">Remaining</div>
            <div className="text-left flex justify-center">Priority</div>
            <div className="text-left flex justify-center col-span-2">Status</div>
            <div className="text-left flex justify-center">Approval</div>
            <div className="text-left flex justify-center col-span-2">Veh Approval</div>

            {orderType === "ready_to_dispatch" && (
              <div className='text-left flex justify-center '>Dispatch</div>
            )}
            {orderType === "in_progress" && (
              <div className='text-left flex justify-center col-span-2'>Team Check</div>
            )}

            <div className='text-left flex justify-center ' >Edit</div>
          </div>
        </div>

        {currentOrders.map((order) => {
          let totalRows = 0;
          order.items?.forEach((item) => {
            const glasses = item.components?.filter(c => c.component_type === "glass") || [];
            glasses.forEach(glass => {
              if (glass.is_deco && hasDecorationForTeam(glass, teamName)) {
                totalRows += 1;
              }
            });
          });

          let currentRow = 0;

          return (
            <div
              key={`${order.order_number}`}
              className={`bg-white rounded-lg shadow-sm border ${colors.border} mb-3 overflow-hidden`}
            >
              {order.items?.map((item, itemIndex) => {
                const glasses = item.components?.filter(c => c.component_type === "glass") || [];
                const bgColor = colorClasses[itemIndex % colorClasses.length];

                return glasses.map((glass, glassIndex) => {
                  if (!glass.is_deco || !hasDecorationForTeam(glass, teamName)) {
                    return null;
                  }

                  const teamDecoration = glass.decorations?.[teamName];
                  const isFirstRowOfOrder = currentRow === 0;
                  const isFirstRowOfItem = glassIndex === 0;
                  currentRow++;

                  const remainingQty = getRemainingQty(glass);
                  const { canWork } = canTeamWork(glass, teamName);

                  return (
                    <div
                      key={`${order.order_number}-${item.item_name}-${glass.component_id}-${teamName}`}
                      className={`grid ${orderType === 'ready_to_dispatch' ? 'grid-cols-24' : 'grid-cols-24'} gap-1 items-center py-2 px-3 text-xs ${bgColor}`}
                    >
                      <div className="text-left col-span-2">
                        {isFirstRowOfOrder ? (
                          <span className={`font-bold ${colors.text}`}>
                            {order.order_number}
                          </span>
                        ) : (
                          <span className="text-transparent">{order.order_number}</span>
                        )}
                      </div>

                      <div className="text-left col-span-2">
                        {isFirstRowOfOrder ? (
                          <button
                            onClick={() => handleSearchManager?.(order.manager_name)}
                            className={`font-bold ${colors.text} hover:${colors.textLight} hover:underline transition-colors cursor-pointer`}
                            title="Search by manager name"
                          >
                            {order.manager_name}
                          </button>
                        ) : (
                          <span className="text-transparent">{order.manager_name}</span>
                        )}
                      </div>

                      <div className="text-left col-span-2">
                        {isFirstRowOfOrder ? (
                          <button
                            onClick={() => handleSearchCustomer?.(order.customer_name)}
                            className={`font-bold ${colors.text} hover:${colors.textLight} hover:underline transition-colors cursor-pointer`}
                            title="Search by customer name"
                          >
                            {order.customer_name || 'N/A'}
                          </button>
                        ) : (
                          <span className="text-transparent">{order.customer_name || 'N/A'}</span>
                        )}
                      </div>

                      <div className="text-center">
                        {isFirstRowOfOrder ? (
                          <span className={`font-bold ${colors.text}`}>{order.order_totals?.completion_percentage || 0}%</span>
                        ) : (
                          <span className="text-transparent">{order.order_totals?.completion_percentage || 0}%</span>
                        )}
                      </div>

                      <div className="text-left col-span-1">
                        {isFirstRowOfItem ? (
                          <span className={`${colors.text} font-medium`}>{item.item_name || 'N/A'}</span>
                        ) : (
                          <span className="text-transparent">{item.item_name || 'N/A'}</span>
                        )}
                      </div>

                      <div className={`text-left ${colors.textDark} col-span-2`}>
                        <div className="flex items-center gap-1">
                          <span>{glass.name || 'N/A'} ({teamDisplayName})</span>
                          {glass.name && (
                            <button
                              onClick={() => handleCopyGlassName(glass.name)}
                              className={`p-0.5 ${colors.textLight} hover:${colors.text} hover:${colors.bg} rounded transition-colors`}
                              title="Copy glass name to search"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-left text-red-900 font-semibold flex justify-center">
                        {glass.weight || 'N/A'}
                      </div>

                      <div className="text-left text-red-900 font-semibold flex justify-center">
                        {glass.capacity || 'N/A'}
                      </div>

                      <div className="text-left text-red-900 font-semibold flex justify-center">
                        {glass.neck_diameter || 'N/A'}
                      </div>

                      <div className={`text-left ${colors.textDark}`}>
                        {teamDecoration?.qty || 'N/A'}
                      </div>

                      <div className="text-left">
                        <span className={`font-semibold ${remainingQty === 0 ? 'text-green-900' : 'text-orange-700'}`}>
                          {remainingQty}
                        </span>
                      </div>

                      <div className="text-left flex justify-center">
                        <span className="font-bold text-red-800 animate-pulse">
                          High
                        </span>
                      </div>

                      <div className="text-left flex justify-center col-span-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(glass)}`}>
                          {formatStatusLabel(glass)}
                        </span>
                      </div>

                      <div className="text-left flex justify-center col-span-1">
                        <span className={`px-2 py-1 rounded text-xs font-bold cursor-pointer hover:opacity-80 ${glass.is_deco_approved ? 'text-green-800' : 'text-red-800'}`}>
                          {glass.is_deco_approved ? 'Approved' : 'Awaiting'}
                        </span>
                      </div>

                      <div className='text-left flex justify-center col-span-2'>
                        {renderVehicleApproval(glass, order, item)}
                      </div>

                      {orderType === 'ready_to_dispatch' && isFirstRowOfItem && (
                        <div className="text-center">
                          {canDispatchComponent(glass) && (
                            <button
                              onClick={() => handleDispatchClick(order, item, glass)}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Dispatch
                            </button>
                          )}
                        </div>
                      )}

                      {orderType === "in_progress" && (
                        <div className='text-center col-span-2'>
                          {!canWork && getComponentWaitingMessage && (
                            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1">
                              {getComponentWaitingMessage(glass)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-center">
                        {isFirstRowOfItem && glass && hasDecorationForTeam(glass, teamName) && (
                          <button
                            onClick={() => handleEditClick(order, item)}
                            disabled={!canEditOrder(order)}
                            className={`p-1.5 rounded text-white transition-all ${canEditOrder(order)
                              ? `${colors.button} cursor-pointer`
                              : 'bg-gray-400 cursor-not-allowed opacity-50'
                              }`}
                            title={!canEditOrder(order)
                              ? 'All components must be decoration approved and have vehicles delivered'
                              : 'Edit order'
                            }
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }).filter(Boolean);
              })}
            </div>
          );
        })}
      </div>

      {/* Mobile view */}
      <div className="xl:hidden space-y-4">
        {currentOrders.map((order) => (
          <div
            key={`mobile-order-${order.order_number}`}
            className={`bg-white rounded-lg shadow-sm border ${colors.border} overflow-hidden`}
          >
            <div className={`bg-gradient-to-r ${colors.header} px-4 py-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-sm">{order.order_number}</h3>
                  <p className="text-white text-opacity-80 text-xs">{order.customer_name}</p>
                </div>
                <div className="text-white text-opacity-80 text-xs">
                  {order.order_totals?.completion_percentage ?? 0}%
                </div>
              </div>
            </div>

            {order.items?.map((item, itemIndex) => {
              const glasses = item.components?.filter(c => c.component_type === "glass") || [];
              const teamGlasses = glasses.filter(g => g.is_deco && hasDecorationForTeam(g, teamName));
              const bgColor = colorClasses[itemIndex % colorClasses.length];

              if (teamGlasses.length === 0) return null;

              return (
                <div key={item._id} className={bgColor}>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-medium ${colors.text} text-sm`}>{item.item_name}</h4>
                      <div className="flex gap-2">
                        {canDispatchComponent(teamGlasses[0], teamName) && (
                          <button
                            onClick={() => handleDispatchClick(order, item, teamGlasses[0])}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Dispatch
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClick(order, item)}
                          disabled={!canEditOrder(order)}
                          className={`p-2 rounded text-white transition-colors ${canEditOrder(order)
                            ? colors.button
                            : 'bg-gray-400 cursor-not-allowed opacity-50'
                            }`}
                          title={!canEditOrder(order)
                            ? 'All components must be decoration approved and have vehicles delivered'
                            : 'Edit order'
                          }
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    </div>

                    {teamGlasses.map((glass) => {
                      const teamDecoration = glass.decorations?.[teamName];
                      const remainingQty = getRemainingQty(glass);
                      const status = teamDecoration?.status;
                      const rowId = `${order.order_number}-${item.item_name}-${glass.name}-${teamName}`;
                      const isExpanded = expandedRows.has(rowId);
                      const { canWork } = canTeamWork(glass, teamName);

                      return (
                        <div
                          key={`${glass.component_id}-${teamName}`}
                          className="bg-white rounded-lg p-3 shadow-sm mt-2"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-gray-900 text-sm">
                                  {glass.name || 'N/A'} ({teamDisplayName})
                                </p>
                                {glass.name && (
                                  <button
                                    onClick={() => handleCopyGlassName(glass.name)}
                                    className={`p-0.5 ${colors.textLight} hover:${colors.text} hover:${colors.bg} rounded transition-colors`}
                                    title="Copy glass name to search"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {teamDisplayName} Qty:{" "}
                                <span className={`font-medium ${colors.textDark}`}>
                                  {teamDecoration?.qty ?? 'N/A'}
                                </span>{" "}
                                | Remaining:{" "}
                                <span className={`font-medium ${remainingQty === 0 ? "text-green-600" : "text-orange-700"}`}>
                                  {remainingQty}
                                </span>
                              </div>
                              {!canWork && getComponentWaitingMessage && (
                                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1">
                                  {getComponentWaitingMessage(glass)}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(glass)}`}>
                                  {formatStatusLabel(glass)}
                                </span>
                              </div>

                              <button
                                onClick={() => toggleRowExpansion(rowId)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="pt-2 border-t border-gray-100 text-xs space-y-1">
                              <div>
                                <span className="text-gray-500">Glass Weight:</span>{" "}
                                {glass.weight ?? "N/A"}g
                              </div>
                              <div>
                                <span className="text-gray-500">Glass Capacity:</span>{" "}
                                {glass.capacity ?? "N/A"}
                              </div>
                              <div>
                                <span className="text-gray-500">Neck Diameter:</span>{" "}
                                {glass.neck_diameter ?? "N/A"}mm
                              </div>
                              <div>
                                <span className="text-gray-500">{teamDisplayName} Inventory Used:</span>{" "}
                                <span className="font-semibold text-blue-600">
                                  {sumTrackingKey(teamDecoration?.tracking, "stock_used")}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">{teamDisplayName} Quantity Produced:</span>{" "}
                                <span className="font-semibold text-green-600">
                                  {sumTrackingKey(teamDecoration?.tracking, "quantity_produced")}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Data Code:</span>{" "}
                                {glass.data_code ?? "N/A"}
                              </div>
                              <div>
                                <span className="text-gray-500">Deco Number:</span>{" "}
                                {glass.deco_number ?? "N/A"}
                              </div>
                              <div>
                                <span className="text-gray-500">Deco Sequence:</span>{" "}
                                {glass.deco_sequence ?? "N/A"}
                              </div>
                              <div>
                                <span className="text-gray-500">Deco Approved:</span>{" "}
                                <span className={glass.is_deco_approved ? "text-green-800" : "text-red-800"}>
                                  {glass.is_deco_approved ? "Approved" : "Awaiting"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTable;