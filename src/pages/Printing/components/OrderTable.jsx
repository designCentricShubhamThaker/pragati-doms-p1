import React from 'react';
import { Package, Edit, Eye, EyeOff } from 'lucide-react'
import { FcApproval } from "react-icons/fc";
import { FcCancel } from "react-icons/fc";

const OrderTable = ({
  currentOrders,
  orderType,
  getRemainingQty,
  handleEditClick,
  handleCopyGlassName,
  handleSearchCustomer,
  handleSearchManager,
  expandedRows,
  toggleRowExpansion,
  getStatusStyle,
  formatStatusLabel,
  handleVehicleModalOpen,
  canEditOrder

}) => {

  function sumTrackingKey(tracking, key) {
    return tracking?.reduce((total, entry) => {
      return total + (Number(entry[key]) || 0);
    }, 0) || 0;
  }



  if (currentOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-orange-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No {orderType} printing orders found
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          {orderType === 'pending'
            ? 'When you receive new printing orders, they will appear here for easy management and tracking.'
            : 'Completed printing orders will appear here once all printing components in an order are finished.'}
        </p>
      </div>
    );
  }

  const colorClasses = ['bg-orange-50', 'bg-orange-100', 'bg-yellow-50', 'bg-yellow-100'];

  return (
    <div className="space-y-4">
      <div className="hidden xl:block">
        <div className="bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 rounded-lg shadow-md py-3 px-4 mb-3">
          <div className="grid grid-cols-22 gap-1 text-white font-semibold text-xs items-center">
            <div className="text-left col-span-2">Order #</div>
            <div className="text-left col-span-2">Manager</div>
            <div className="text-left col-span-2">Customer</div>
            <div className="text-center">Progress</div>
            <div className="text-left col-span-1">Item</div>
            <div className="text-left col-span-2">Glass Name</div>
            <div className="text-left flex justify-center">Weight</div>
            <div className="text-left flex justify-center">Capacity</div>
            <div className="text-left flex justify-center">Neck Size</div>
            <div className="text-left">Print Qty</div>
            <div className="text-left">Remaining</div>
            <div className="text-left flex justify-center">Priority</div>
            <div className="text-left flex justify-center col-span-2">Status</div>
            <div className="text-left flex justify-center">Approval</div>
            <div className="text-left flex justify-center col-span-2">Veh Approval</div>
            <div className="text-center">Edit</div>
          </div>
        </div>

        {currentOrders.map((order) => {
          let totalRows = 0;
          order.items?.forEach((item) => {
            const glasses = item.components?.filter(c => c.component_type === "glass") || [];
            glasses.forEach(glass => {
              if (glass.is_deco && glass.decorations?.printing) {
                totalRows += 1;
              }
            });
          });

          let currentRow = 0;

          return (
            <div
              key={`${order.order_number}`}
              className="bg-white rounded-lg shadow-sm border border-orange-200 mb-3 overflow-hidden"
            >
              {order.items?.map((item, itemIndex) => {
                const glasses = item.components?.filter(c => c.component_type === "glass") || [];
                const bgColor = colorClasses[itemIndex % colorClasses.length];

                return glasses.map((glass, glassIndex) => {
                  if (!glass.is_deco || !glass.decorations?.printing) {
                    return null;
                  }

                  const printing = glass.decorations.printing;
                  const isFirstRowOfOrder = currentRow === 0;
                  const isFirstRowOfItem = glassIndex === 0;
                  currentRow++;

                  const remainingQty = getRemainingQty(glass);


                  return (
                    <div
                      key={`${order.order_number}-${item.item_name}-${glass.component_id}-printing`}
                      className={`grid grid-cols-22 gap-1 items-center py-2 px-3 text-xs ${bgColor}`}
                    >
                      <div className="text-left col-span-2">
                        {isFirstRowOfOrder ? (
                          <span className="font-bold text-orange-800">
                            {order.order_number}
                          </span>
                        ) : (
                          <span className="text-transparent">{order.order_number}</span>
                        )}
                      </div>

                      <div className="text-left col-span-2">
                        {isFirstRowOfOrder ? (
                          <button
                            onClick={() => handleSearchManager(order.manager_name)}
                            className="font-bold text-orange-800 hover:text-orange-600 hover:underline transition-colors cursor-pointer"
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
                            onClick={() => handleSearchCustomer(order.customer_name)}
                            className="font-bold text-orange-800 hover:text-orange-600 hover:underline transition-colors cursor-pointer"
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
                          <span className="font-bold text-orange-800">{order.order_totals?.completion_percentage || 0}%</span>
                        ) : (
                          <span className="text-transparent">{order.order_totals?.completion_percentage || 0}%</span>
                        )}
                      </div>

                      <div className="text-left col-span-1">
                        {isFirstRowOfItem ? (
                          <span className="text-orange-800 font-medium">{item.item_name || 'N/A'}</span>
                        ) : (
                          <span className="text-transparent">{item.item_name || 'N/A'}</span>
                        )}
                      </div>

                      <div className="text-left text-orange-900 col-span-2">
                        <div className="flex items-center gap-1">
                          <span>{glass.name || 'N/A'} (Print)</span>
                          {glass.name && (
                            <button
                              onClick={() => handleCopyGlassName(glass.name)}
                              className="p-0.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
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

                      <div className="text-left text-orange-900">
                        {printing.qty || 'N/A'}
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

                      <div className="text-center col-span-2">
                        <button
                          onClick={() => handleVehicleModalOpen(order, item, glass.component_id)}
                          className="p-1.5 rounded text-white"
                        >
                          {glass.vehicle_details?.length > 0 && glass.vehicle_details.every(v => v.status === "DELIVERED") ? (
                            <FcApproval size={20} />
                          ) : (
                            <FcCancel size={20} />
                          )}
                        </button>

                      </div>


                      <div className="text-center">
                        {isFirstRowOfItem && glass ? (
                          <button
                            onClick={() => handleEditClick(order, item)}
                            disabled={!canEditOrder(order)}
                            className={`p-1.5 rounded text-white transition-all ${canEditOrder(order)
                                ? 'bg-orange-600 hover:bg-orange-500 cursor-pointer'
                                : 'bg-gray-400 cursor-not-allowed opacity-50'
                              }`}
                            title={!canEditOrder(order)
                              ? 'All components must be decoration approved and have vehicles delivered'
                              : 'Edit order'
                            }
                          >
                            <Edit size={14} />
                          </button>
                        ) : (
                          <Edit size={12} className="text-transparent" />
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

      <div className="xl:hidden space-y-4">
        {currentOrders.map((order) => (
          <div
            key={`mobile-order-${order.order_number}`}
            className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden"
          >
            {/* Order Header */}
            <div className="bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-sm">{order.order_number}</h3>
                  <p className="text-orange-100 text-xs">{order.customer_name}</p>
                </div>
                <div className="text-orange-100 text-xs">
                  {order.order_totals?.completion_percentage ?? 0}%
                </div>
              </div>
            </div>

            {/* Items */}
            {order.items?.map((item, itemIndex) => {
              const glasses = item.components?.filter(c => c.component_type === "glass") || [];
              const printingGlasses = glasses.filter(g => g.is_deco && g.decorations?.printing);
              const bgColor = colorClasses[itemIndex % colorClasses.length];

              if (printingGlasses.length === 0) return null;

              return (
                <div key={item._id} className={bgColor}>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-orange-800 text-sm">{item.item_name}</h4>
                      <button
                        onClick={() => handleEditClick(order, item)}
                        disabled={!canEditOrder(order)}
                        className={`p-2 rounded text-white transition-colors ${canEditOrder(order)
                            ? 'bg-orange-600 hover:bg-orange-500'
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

                    {printingGlasses.map((glass) => {
                      const printing = glass.decorations.printing;
                      const remainingQty = getRemainingQty(printing);
                      const status = printing.status;
                      const rowId = `${order.order_number}-${item.item_name}-${glass.name}-printing`;
                      const isExpanded = expandedRows.has(rowId);

                      return (
                        <div
                          key={`${glass.component_id}-printing`}
                          className="bg-white rounded-lg p-3 shadow-sm mt-2"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-gray-900 text-sm">
                                  {glass.name || 'N/A'} (Printing)
                                </p>
                                {glass.name && (
                                  <button
                                    onClick={() => handleCopyGlassName(glass.name)}
                                    className="p-0.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                                    title="Copy glass name to search"
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Print Qty:{" "}
                                <span className="font-medium text-orange-900">
                                  {printing.qty ?? 'N/A'}
                                </span>{" "}
                                | Remaining:{" "}
                                <span
                                  className={`font-medium ${remainingQty === 0
                                    ? "text-green-600"
                                    : "text-orange-700"
                                    }`}
                                >
                                  {remainingQty}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-center">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                                    status
                                  )}`}
                                >
                                  {formatStatusLabel(status)}
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
                                <span className="text-gray-500">Available Stock:</span>{" "}
                                {getAvailableStock ? getAvailableStock(glass) : 0}
                              </div>
                              <div>
                                <span className="text-gray-500">Print Inventory Used:</span>{" "}
                                <span className="font-semibold text-blue-600">
                                  {sumTrackingKey(printing.tracking, "stock_used")}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Print Quantity Produced:</span>{" "}
                                <span className="font-semibold text-green-600">
                                  {sumTrackingKey(printing.tracking, "quantity_produced")}
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