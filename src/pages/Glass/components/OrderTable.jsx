import React from 'react';
import { Package, Edit, Eye, EyeOff } from 'lucide-react'
import { FaTruckRampBox } from "react-icons/fa6";
import { BsFillCartCheckFill } from "react-icons/bs"
import { AiOutlineRollback } from "react-icons/ai";


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
  handleVehicleDetails,
  handleDispatch,
  handleRollback,
  formatStatusLabel,
  getAvailableStock,
}) => {

  function sumTrackingKey(tracking, key) {
    return tracking.reduce((total, entry) => {
      return total + (Number(entry[key]) || 0);
    }, 0);
  }
  if (currentOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-orange-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No {orderType} glass orders found
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          {orderType === 'pending'
            ? 'When you receive new orders, they will appear here for easy management and tracking.'
            : 'Completed orders will appear here once all glass components in an order are finished.'}
        </p>
      </div>
    );
  }

  const colorClasses = ['bg-orange-50', 'bg-orange-100', 'bg-yellow-50', 'bg-yellow-100'];

  return (
    <div className="space-y-4">
      <div className="hidden xl:block">
        <div className="bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 rounded-lg shadow-md py-3 px-4 mb-3">
          <div className={`grid ${orderType === 'ready_to_dispatch' ? 'grid-cols-25' : 'grid-cols-22'} gap-1 text-white font-semibold text-xs items-center`}>
            <div className="text-left col-span-2">Order #</div>
            <div className="text-left col-span-2">Manager</div>
            <div className="text-left col-span-2">Customer</div>
            <div className="text-center">Progress</div>
            <div className="text-left col-span-1">Item</div>
            <div className="text-left col-span-2">Glass Name</div>
            <div className="text-left flex justify-center">Weight</div>
            <div className="text-left flex justify-center">Capacity</div>
            <div className="text-left flex justify-center">Neck Size</div>
            <div className="text-left">Quantity</div>
            <div className="text-left">Remaining</div>
            <div className="text-left flex justify-center">Priority</div>
            <div className="text-left flex justify-center col-span-2">Status</div>
            <div className="text-center">Inv Avl</div>
            <div className="text-center">Inv Used</div>
            <div className="text-center">Produced</div>
            <div className="text-center">Edit</div>
            {orderType === 'ready_to_dispatch' && (
              <div className="text-center">Veh Info</div>
            )}
            {orderType === 'ready_to_dispatch' && (
              <div className="text-center">Rollback</div>
            )}
            {orderType === 'ready_to_dispatch' && (
              <div className="text-center">Dispatch</div>
            )}

          </div>
        </div>

        {currentOrders.map((order) => {
          let totalRows = 0;
          order.items?.forEach((item) => {
            const glasses = item.components?.filter(c => c.component_type === "glass") || [];
            totalRows += Math.max(1, glasses.length);
          });

          let currentRow = 0;

          return (
            <div
              key={`${order.order_number}`}

              className="bg-white rounded-lg shadow-sm border border-orange-200 mb-3 overflow-hidden"
            >
              {order.items?.map((item, itemIndex) => {
                const glasses = item.components?.filter(c => c.component_type === "glass") || [];
                const glassesToShow = glasses.length === 0 ? [null] : glasses;
                const bgColor = colorClasses[itemIndex % colorClasses.length];

                return glassesToShow.map((glass, glassIndex) => {
                  const isFirstRowOfOrder = currentRow === 0;
                  currentRow++;
                  const isFirstRowOfItem = glassIndex === 0;

                  const remainingQty = glass ? getRemainingQty(glass) : "N/A";
                  const status = glass ? glass.status : "N/A";



                  return (
                    <div
                      key={`${order.order_number}-${item.item_name}-${glass?.component_id || `empty-${glassIndex}`}`}
                      className={`grid ${orderType === 'ready_to_dispatch' ? 'grid-cols-25' : 'grid-cols-22'} gap-1 items-center py-2 px-3 text-xs ${bgColor}`}
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
                          <span>{glass ? (glass.name || 'N/A') : 'N/A'}</span>
                          {glass && glass.name && (
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
                        {glass ? (glass.weight || 'N/A') : 'N/A'}
                      </div>

                      <div className="text-left text-red-900 font-semibold flex justify-center">
                        {glass ? (glass.capacity || 'N/A') : 'N/A'}
                      </div>

                      <div className="text-left text-red-900 font-semibold flex justify-center">
                        {glass ? (glass.neck_diameter || 'N/A') : 'N/A'}
                      </div>

                      <div className="text-left text-orange-900">
                        {glass ? (glass.qty || 'N/A') : 'N/A'}
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
                          {formatStatusLabel(status)}
                        </span>
                      </div>

                      <div className="text-center text-gray-800">
                        {glass ? getAvailableStock(glass) : 0}
                      </div>

                      <div className="text-center text-red-900 font-semibold">
                        {sumTrackingKey(glass?.tracking, "stock_used")}
                      </div>
                      <div className="text-center text-red-900 font-semibold">
                        {sumTrackingKey(glass?.tracking, "quantity_produced")}
                      </div>


                      <div className="text-center">
                        {isFirstRowOfItem && glass ? (
                          <button
                            onClick={() => handleEditClick(order, item)}
                            className="p-1.5 bg-orange-600 rounded text-white hover:bg-orange-500"
                          >
                            <Edit size={14} />
                          </button>
                        ) : (
                          <Edit size={12} className="text-transparent" />
                        )}
                      </div>

                      {orderType === 'ready_to_dispatch' && isFirstRowOfItem && (
                        <div className="text-center">
                          <button
                            onClick={() => handleVehicleDetails(order, item, glass)}
                            className="p-1.5 bg-orange-600 rounded text-white hover:bg-orange-500"
                          >
                            <FaTruckRampBox size={14} />
                          </button >
                        </div>
                      )}
                      {orderType === 'ready_to_dispatch' && isFirstRowOfItem && (
                        <div className="text-center">
                          <button
                            onClick={() => handleRollback(order, item, glass)}
                            className="p-1.5 bg-orange-600 rounded text-white hover:bg-orange-500"
                          >
                            <AiOutlineRollback size={14} />
                          </button >
                        </div>
                      )}
                      {orderType === 'ready_to_dispatch' && isFirstRowOfItem && (
                        <div className="text-center">
                          <button
                            onClick={() => handleDispatch(order, item, glass)}
                            className="p-1.5 bg-orange-600 rounded text-white hover:bg-orange-500"
                          >
                            <BsFillCartCheckFill size={14} />
                          </button >
                        </div>
                      )}

                    </div>
                  );
                });
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
              const bgColor = colorClasses[itemIndex % colorClasses.length];

              return (
                <div key={item._id} className={bgColor}>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-orange-800 text-sm">{item.item_name}</h4>
                      <button
                        onClick={() => handleEditClick(order, item)}
                        className="p-2 bg-orange-600 rounded text-white hover:bg-orange-500 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                    </div>

                    {glasses.length > 0 ? (
                      glasses.map((glass) => {
                        const remainingQty = getRemainingQty(glass);
                        const status = glass.status;
                        const rowId = `${order.order_number}-${item.item_name}-${glass.name}`;
                        const isExpanded = expandedRows.has(rowId);


                        return (
                          <div
                            key={glass.component_id}
                            className="bg-white rounded-lg p-3 shadow-sm mt-2"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className="font-medium text-gray-900 text-sm">
                                    {glass.name || 'N/A'}
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
                                  Qty:{" "}
                                  <span className="font-medium text-orange-900">
                                    {glass.qty ?? 'N/A'}
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
                                  <span className="text-gray-500">Weight:</span>{" "}
                                  {glass.weight ?? "N/A"}g
                                </div>
                                <div>
                                  <span className="text-gray-500">Capacity:</span>{" "}
                                  {glass.capacity ?? "N/A"}
                                </div>
                                <div>
                                  <span className="text-gray-500">Neck Diameter:</span>{" "}
                                  {glass.neck_diameter ?? "N/A"}mm
                                </div>
                                <div>
                                  <span className="text-gray-500">Available Stock:</span>{" "}
                                  {glass ? getAvailableStock(glass) : 0}
                                </div>
                                {/* Updated with calculated value */}
                                <div>
                                  <span className="text-gray-500">Inventory Used:</span>{" "}
                                  <span className="font-semibold text-blue-600">
                                    {sumTrackingKey(glass?.tracking, "stock_used")}
                                  </span>
                                </div>
                                {/* Updated with calculated value */}
                                <div>
                                  <span className="text-gray-500">Quantity Produced:</span>{" "}
                                  <span className="font-semibold text-green-600">
                                    {sumTrackingKey(glass?.tracking, "quantity_produced")}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Data Code:</span>{" "}
                                  {glass.data_code ?? "N/A"}
                                </div>
                                <div>
                                  <span className="text-gray-500">Component Price:</span>{" "}
                                  ₹{glass.component_price ?? "N/A"}
                                </div>
                                {glass.is_deco && (
                                  <>
                                    <div>
                                      <span className="text-gray-500">Deco Sequence:</span>{" "}
                                      {glass.deco_sequence ?? "N/A"}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Deco Approved:</span>{" "}
                                      <span className={glass.is_deco_approved ? "text-green-600" : "text-red-600"}>
                                        {glass.is_deco_approved ? "Yes" : "No"}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-white rounded-lg p-3 text-center text-gray-500 text-sm">
                        No glass components assigned
                      </div>
                    )}
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