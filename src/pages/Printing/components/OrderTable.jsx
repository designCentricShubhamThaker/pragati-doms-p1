import React from 'react';
import { Package, Edit, Eye, EyeOff } from 'lucide-react';

const OrderTable = ({
  currentOrders,
  orderType,
  getRemainingQty,
  handleEditClick,
  handleCopyPrintingName,
  handleSearchCustomer,
  handleSearchManager,
  expandedRows,
  toggleRowExpansion,
  getStatusStyle,
  handlePartiallyReceivedChange,
  handleCompletelyReceivedChange,
}) => {
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
            ? 'When you receive new orders, they will appear here for easy management and tracking.'
            : 'Completed orders will appear here once all printing in an order is finished.'}
        </p>
      </div>
    );
  }

  const colorClasses = ['bg-orange-50', 'bg-orange-100', 'bg-yellow-50', 'bg-yellow-100'];

  const isEditEnabled = (printing) => {
    if (!printing) return false;
    return printing.is_partially_received &&
      printing.is_completely_received &&
      printing.is_deco_no_approved;
  };

  return (
    <div className="space-y-4">
      <div className="hidden xl:block">
        <div className="bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 rounded-lg shadow-md py-3 px-4 mb-3">
          <div className="grid grid-cols-21 gap-1 text-white font-semibold text-xs items-center">
            <div className="text-left">Order #</div>
            <div className="text-left">Manager</div>
            <div className="text-left col-span-2">Customer</div>
            <div className="text-center">Progress</div>
            <div className="text-left col-span-1">Item</div>
            <div className="text-left col-span-3">Bottle Name</div>
            <div className="text-center">Quantity</div>
            <div className="text-center">Remaining</div>
            <div className="text-left flex justify-center">Priority</div>
            <div className="text-left flex justify-center col-span-1">Status</div>
            <div className="text-left flex justify-center">Inv Avl</div>
            <div className="text-left flex justify-center">Inv Used</div>
            <div className="text-center">Partly</div>
            <div className="text-center">Fully </div>
            <div className="text-center">Deco No </div>
            <div className="text-center col-span-2">Deco No Approval</div>

            <div className="text-center">Edit</div>
          </div>
        </div>

        {currentOrders.map((order, orderIndex) => {
          let totalOrderRows = 0;
          order.items?.forEach(item => {
            const printings = item.printing || [];
            totalOrderRows += Math.max(1, printings.length);
          });

          let currentRowInOrder = 0;

          return (
            <div key={`order-${order.order_number}`} className="bg-white rounded-lg shadow-sm border border-orange-200 mb-3 overflow-hidden">
              {order.items?.map((item, itemIndex) => {
                const printings = item.printing || [];
                const printingsToShow = printings.length === 0 ? [null] : printings;
                const bgColor = colorClasses[itemIndex % colorClasses.length];

                return printingsToShow.map((printing, printingIndex) => {
                  const isFirstRowOfOrder = currentRowInOrder === 0;
                  const isFirstRowOfItem = printingIndex === 0;
                  const isLastRowOfOrder = currentRowInOrder === totalOrderRows - 1;
                  currentRowInOrder++;

                  const remainingQty = printing ? getRemainingQty(printing) : 'N/A';
                  const status = printing ? printing.status : 'N/A';

                  return (
                    <div
                      key={`${order.order_number}-${item.item_name}-${printing?.printing_id || 'empty'}-${printingIndex}`}
                      className={`grid grid-cols-21 gap-1 items-center py-2 px-3 text-xs ${bgColor} ${!isLastRowOfOrder ? 'border-b border-orange-100' : ''}`}
                    >
                      <div className="text-left">
                        {isFirstRowOfOrder ? (
                          <span className="font-bold text-orange-800">{order.order_number}</span>
                        ) : (
                          <span className="text-transparent">{order.order_number}</span>
                        )}
                      </div>
                      <div className="text-left">
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
                            {order.customer_name}
                          </button>
                        ) : (
                          <span className="text-transparent">{order.customer_name}</span>
                        )}
                      </div>
                      <div className="text-center">
                        {isFirstRowOfOrder ? (
                          <span className="font-bold text-orange-800">25%</span>
                        ) : (
                          <span className="text-transparent">25%</span>
                        )}
                      </div>

                      <div className="text-left col-span-1">
                        {isFirstRowOfItem ? (
                          <span className="text-orange-800 font-medium">{item.item_name || 'N/A'}</span>
                        ) : (
                          <span className="text-transparent">{item.item_name || 'N/A'}</span>
                        )}
                      </div>

                      <div className="text-left text-orange-900 col-span-3">
                        <div className="flex items-center gap-1">
                          <span>{printing ? (printing.bottle_name || 'N/A') : 'N/A'}</span>
                          {printing && printing.bottle_name && (
                            <button
                              onClick={() => handleCopyPrintingName(printing.bottle_name)}
                              className="p-0.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                              title="Copy printing type to search"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-center text-orange-900">
                        {printing ? (printing.quantity || 'N/A') : 'N/A'}
                      </div>

                      <div className="text-center">
                        <span className={`font-semibold ${remainingQty === 0 ? 'text-green-900' : 'text-orange-700'}`}>
                          {remainingQty}
                        </span>
                      </div>

                      <div className="text-left flex justify-center">
                        <span className="font-bold text-red-800 animate-pulse">
                          High
                        </span>
                      </div>

                      <div className="text-left flex justify-center col-span-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
                          {status}
                        </span>
                      </div>

                      <div className="text-left text-red-900 font-semibold flex justify-center">
                        {printing ? (printing.available_stock || 0) : 'N/A'}
                      </div>
                      <div className="text-left text-red-900 font-semibold flex justify-center">
                        {printing ? (printing.inventory_used || 0) : 'N/A'}
                      </div>

                      {/* New columns */}
                      <div className="text-center">
                        {printing ? (
                          <input
                            type="checkbox"
                            checked={printing.is_partially_received || false}
                            onChange={(e) => handlePartiallyReceivedChange(printing.printing_id, e.target.checked)}
                            className="w-4 h-4 text-orange-600 appearance-auto accent-orange-700 bg-gray-100 border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>

                      <div className="text-center">
                        {printing ? (
                          <input
                            type="checkbox"
                            checked={printing.is_completely_received || false}
                            onChange={(e) => handleCompletelyReceivedChange(printing.printing_id, e.target.checked)}
                            className="w-4 h-4 text-orange-600 accent-orange-700 bg-gray-100 border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>

                      <div className="text-center text-orange-900">
                        {printing ? (printing.deco_no || 'N/A') : 'N/A'}
                      </div>



                      <div className="text-center col-span-2">
                        {printing ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${printing.is_deco_no_approved
                            ? 'text-green-800'
                            : 'text-orange-800'
                            }`}>
                            {printing.is_deco_no_approved ? 'Approved' : 'Awaiting '}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>

                      <div className="text-center">
                        {isFirstRowOfItem && orderType === 'pending' ? (
                          <button
                            onClick={() => handleEditClick(order, item)}
                            disabled={!isEditEnabled(printing)}
                            className={`inline-flex items-center justify-center p-1.5 rounded text-white transition-colors duration-200 shadow-sm ${isEditEnabled(printing)
                              ? 'bg-orange-600 hover:bg-orange-500 cursor-pointer'
                              : 'bg-gray-400 cursor-not-allowed'
                              }`}
                            title={isEditEnabled(printing) ? "Edit quantities" : "Complete all requirements to enable editing"}
                          >
                            <Edit size={14} />
                          </button>
                        ) : (
                          <div className="p-1.5">
                            <Edit size={12} className="text-transparent" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          );
        })}
      </div>

      <div className="xl:hidden space-y-4">
        {currentOrders.map((order, orderIndex) => (
          <div key={`mobile-order-${order.order_number}`} className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden">
            {/* Order Header */}
            <div className="bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-sm">{order.order_number}</h3>
                  <p className="text-orange-100 text-xs">{order.customer_name}</p>
                </div>
                <div className="text-orange-100 text-xs">
                  {order.items?.length || 0} items
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-100">
              {order.items?.map((item, itemIndex) => {
                const printings = item.printing || [];
                const bgColor = colorClasses[itemIndex % colorClasses.length];
                return (
                  <div key={`mobile-item-${item.item_name}`} className={bgColor}>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-orange-800 text-sm">{item.item_name}</h4>
                        {orderType === 'pending' && (
                          <button
                            onClick={() => handleEditClick(order, item)}
                            disabled={printings.length > 0 && !isEditEnabled(printings[0])}
                            className={`p-2 rounded text-white transition-colors ${printings.length === 0 || isEditEnabled(printings[0])
                              ? 'bg-orange-600 hover:bg-orange-500'
                              : 'bg-gray-400 cursor-not-allowed'
                              }`}
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </div>

                      {printings.length > 0 ? (
                        <div className="space-y-3">
                          {printings.map((printing, printingIndex) => {
                            const remainingQty = getRemainingQty(printing);
                            const status = printing.status;
                            const rowId = `${order.order_number}-${item.item_name}-${printing.printing_id}`;
                            const isExpanded = expandedRows.has(rowId);

                            return (
                              <div key={printing.printing_id} className="bg-white rounded-lg p-3 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <p className="font-medium text-gray-900 text-sm truncate">
                                        {printing.bottle_name}
                                      </p>
                                      <button
                                        onClick={() => handleCopyPrintingName(printing.printing_type || printing.bottle_name, printing.color || '')}
                                        className="p-0.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors flex-shrink-0"
                                        title="Copy printing info to search"
                                      >
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1">
                                      <span className="text-xs text-gray-600">
                                        Qty: <span className="font-medium text-orange-900">{printing.quantity}</span>
                                      </span>
                                      <span className="text-xs text-gray-600">
                                        Remaining: <span className={`font-medium ${remainingQty === 0 ? 'text-green-600' : 'text-orange-700'}`}>{remainingQty}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
                                      {status}
                                    </span>
                                    <button
                                      onClick={() => toggleRowExpansion(rowId)}
                                      className="p-1 text-gray-400 hover:text-gray-600"
                                    >
                                      {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  </div>
                                </div>

                                {/* Mobile checkbox controls */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-1">
                                      <input
                                        type="checkbox"
                                        checked={printing.is_partially_received || false}
                                        onChange={(e) => handlePartiallyReceivedChange(printing.printing_id, e.target.checked)}
                                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                                      />
                                      <span className="text-xs text-gray-700">Partially</span>
                                    </label>
                                    <label className="flex items-center space-x-1">
                                      <input
                                        type="checkbox"
                                        checked={printing.is_completely_received || false}
                                        onChange={(e) => handleCompletelyReceivedChange(printing.printing_id, e.target.checked)}
                                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                                      />
                                      <span className="text-xs text-gray-700">Complete</span>
                                    </label>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${printing.is_deco_no_approved
                                    ? 'text-green-800 bg-green-100'
                                    : 'text-orange-800 bg-orange-100'
                                    }`}>
                                    {printing.is_deco_no_approved ? 'Approved' : 'Waiting'}
                                  </span>
                                </div>

                                {isExpanded && (
                                  <div className="pt-2 border-t border-gray-100 mt-3">
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <span className="text-gray-500">Design:</span>
                                        <p className="font-medium text-gray-900">{printing.design_name || 'No Design'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Color:</span>
                                        <p className="font-medium text-gray-900">{printing.color || 'No Color'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Print ID:</span>
                                        <p className="font-medium text-gray-900">{printing.printing_id || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Rate:</span>
                                        <p className="font-medium text-gray-900">₹{printing.rate || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Available Stock:</span>
                                        <p className="font-medium text-gray-900">{printing.available_stock || 0}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Completed:</span>
                                        <p className="font-medium text-gray-900">{printing.completed_qty || 0}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-3 text-center text-gray-500 text-sm">
                          No printing assigned
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTable;