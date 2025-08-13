import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const StockAvailabilityDialog = ({
  showStockDialog,
  selectedItem,
  selectedOrder,
  stockQuantities,
  handleStockQuantityChange,
  handleStockDialogClose,
  handleStockNo,
  handleStockYes,
  getRemainingQty,
  setStockQuantities,
}) => {
  if (!showStockDialog || !selectedItem) return null;

  const coatings = selectedItem.coating || [];
  const completedCoatings = coatings.filter(coating => coating.status === 'Completed');
  const pendingCoatings = coatings.filter(coating => coating.status !== 'Completed');

  const hasStockQuantities = Object.values(stockQuantities).some(qty =>
    qty !== '' && parseInt(qty) > 0
  );

  const renderCoatingCard = (coating, index, isCompleted = false) => {
    const remaining = getRemainingQty(coating);
    const maxStock = isCompleted ? 0 : Math.min(remaining, coating.available_stock || 0);
    const colorClasses = isCompleted 
      ? ['bg-gray-50', 'bg-gray-100'] 
      : ['bg-orange-50', 'bg-orange-100', 'bg-yellow-50', 'bg-yellow-100'];
    const bgColor = colorClasses[index % colorClasses.length];

    return (
      <div 
        key={coating.coating_id} 
        className={`${bgColor} rounded-lg p-3 sm:p-5 relative ${isCompleted ? 'opacity-90' : ''}`}
      >
        {isCompleted && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <div className="flex items-center gap-1 bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium">
              <CheckCircle size={12} />
              <span className="hidden sm:inline">Completed</span>
              <span className="sm:hidden">✓</span>
            </div>
          </div>
        )}

        <div className="hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 pr-20"> 
              <h4 className={`font-medium text-base ${isCompleted ? 'text-orange-800' : 'text-orange-900'}`}>
                {coating.bottle_name}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {coating.design_name || 'No Design'} - 
                <span className="font-medium ml-1">
                  {isCompleted ? 'Completed' : `Need: ${remaining}`}
                </span>
              </p>
              {isCompleted && (
                <p className="text-sm text-red-900 mt-1 font-medium">
                  ✅ All {coating.quantity} units completed
                </p>
              )}
            </div>
            <div className="text-right ml-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Available:</span> {coating.available_stock || 0}
              </p>
              {!isCompleted && (
                <>
                  <p className="text-sm text-green-900 font-medium">
                    Max Use: {maxStock}
                  </p>
                  <button
                    onClick={() => handleStockQuantityChange(coating.coating_id, maxStock.toString())}
                    className="mt-1 text-xs text-orange-600 hover:text-orange-800 underline"
                    disabled={maxStock === 0}
                  >
                    Use All ({maxStock})
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Stock Qty to Use:
            </label>
            {isCompleted ? (
              <div className="flex-1 px-3 py-2 bg-orange-50 border border-orange-300 rounded-md text-gray-800 font-medium">
                No stock needed - Already completed
              </div>
            ) : (
              <input
                type="number"
                min="0"
                max={maxStock}
                value={stockQuantities[coating.coating_id] || ''}
                onChange={(e) => handleStockQuantityChange(coating.coating_id, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder={maxStock > 0 ? `Max: ${maxStock}` : 'No stock available'}
                disabled={maxStock === 0}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > maxStock) {
                    handleStockQuantityChange(coating.coating_id, maxStock.toString());
                  }
                }}
              />
            )}
            {!isCompleted && stockQuantities[coating.coating_id] && parseInt(stockQuantities[coating.coating_id]) > 0 && (
              <span className="text-sm text-green-900 font-medium whitespace-nowrap">
                ✓ {stockQuantities[coating.coating_id]} selected
              </span>
            )}
          </div>
        </div>

        {/* Mobile layout below remains same but with coating fields */}
        <div className="md:hidden">
          <div className="mb-3 pr-16"> 
            <h4 className={`font-medium text-sm ${isCompleted ? 'text-green-800' : 'text-orange-900'}`}>
              {coating.bottle_name}
            </h4>
            <div className="text-xs text-gray-600 mt-1 space-y-1">
              <div>{coating.design_name || 'No Design'}</div>
              {isCompleted ? (
                <div className="text-green-700 font-medium">✅ All {coating.quantity} units completed</div>
              ) : (
                <>
                  <div><span className="font-medium">Need:</span> {remaining}</div>
                  <div><span className="font-medium">Available:</span> {coating.available_stock || 0}</div>
                  <div className="text-green-900 font-medium">Max Use: {maxStock}</div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {isCompleted ? (
              <div className="w-full px-3 py-2 bg-green-50 border border-green-300 rounded-md text-green-800 font-medium text-sm text-center">
                No stock needed - Already completed
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-700 font-medium">Stock Qty to Use:</label>
                  <button
                    onClick={() => handleStockQuantityChange(coating.coating_id, maxStock.toString())}
                    className="text-xs text-orange-600 hover:text-orange-800 underline"
                    disabled={maxStock === 0}
                  >
                    Use All ({maxStock})
                  </button>
                </div>
                
                <input
                  type="number"
                  min="0"
                  max={maxStock}
                  value={stockQuantities[coating.coating_id] || ''}
                  onChange={(e) => handleStockQuantityChange(coating.coating_id, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={maxStock > 0 ? `Max: ${maxStock}` : 'No stock available'}
                  disabled={maxStock === 0}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (val > maxStock) {
                      handleStockQuantityChange(coating.coating_id, maxStock.toString());
                    }
                  }}
                />
                
                {stockQuantities[coating.coating_id] && parseInt(stockQuantities[coating.coating_id]) > 0 && (
                  <div className="text-xs text-green-900 font-medium text-center bg-green-50 py-1 rounded">
                    ✓ {stockQuantities[coating.coating_id]} selected
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-500/75 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-2xl lg:max-w-5xl max-h-[115vh] sm:max-h-[90vh] overflow-hidden">
        <div className="bg-orange-600 text-white px-3 sm:px-6 py-3 sm:py-4">
          <h3 className="text-base sm:text-lg font-semibold">Coating Stock Availability Check</h3>
          <p className="text-orange-100 text-xs sm:text-sm mt-1">
            Order #{selectedOrder?.order_number} - {selectedItem?.item_name}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs sm:text-sm">
            <p className="text-orange-200 flex-1">
              Select quantities from your existing coating inventory to fulfill this order
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 max-h-60 sm:max-h-80 overflow-y-auto">
            {pendingCoatings.map((coating, index) => renderCoatingCard(coating, index, false))}
            {completedCoatings.length > 0 && pendingCoatings.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <hr className="flex-1 border-gray-300" />
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Completed Items
                </span>
                <hr className="flex-1 border-gray-300" />
              </div>
            )}
            {completedCoatings.map((coating, index) => renderCoatingCard(coating, index, true))}
          </div>

          <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:justify-end sm:gap-3">
            <button
              onClick={handleStockDialogClose}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>

            {pendingCoatings.length > 0 && (
              <>
                <button
                  onClick={handleStockNo}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  No Stock Available
                </button>
                <button
                  onClick={() => {
                    const allMaxStock = {};
                    pendingCoatings.forEach(coating => {
                      const remaining = getRemainingQty(coating);
                      const maxStock = Math.min(remaining, coating.available_stock || 0);
                      if (maxStock > 0) {
                        allMaxStock[coating.coating_id] = maxStock.toString();
                      }
                    });
                    setStockQuantities(allMaxStock);
                    handleStockYes();
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm text-white bg-green-900 rounded-md hover:bg-green-700"
                >
                  <span className="hidden sm:inline">Use All Available Stock</span>
                  <span className="sm:hidden">Use All Stock</span>
                </button>
                <button
                  onClick={handleStockYes}
                  disabled={!hasStockQuantities}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">
                    Use Selected Stock ({Object.values(stockQuantities).filter(qty => qty !== '' && parseInt(qty) > 0).length} items)
                  </span>
                  <span className="sm:hidden">
                    Use Selected ({Object.values(stockQuantities).filter(qty => qty !== '' && parseInt(qty) > 0).length})
                  </span>
                </button>
              </>
            )}

            {pendingCoatings.length === 0 && completedCoatings.length > 0 && (
              <button
                onClick={handleStockDialogClose}
                className="cursor-pointer bg-orange-700 text-white flex items-center gap-2 px-3 py-1.5 rounded-sm shadow-md transition-colors duration-200 font-medium hover:bg-red-900 hover:text-white"
              >
                All Items Completed - Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAvailabilityDialog;
