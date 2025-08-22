import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Save, CloudHail } from 'lucide-react';


const UpdateBottleQty = ({ isOpen, onClose, orderData, itemData, stockQuantities = {}, onUpdate, onStockUpdate }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen && itemData?.components) {
      const bottleAssignments = itemData.components
        .filter(component => component.component_type === "glass")
        .map(bottle => {
          const stockQty = parseInt(stockQuantities[bottle.component_id]) || 0;
          return {
            ...bottle,
            todayQty: stockQty,
            notes: stockQty > 0 ? 'Used from existing stock' : ''
          };
        });

      setAssignments(bottleAssignments);
      setError(null);
      setSuccessMessage('');
    }
  }, [isOpen, itemData, stockQuantities]);

  const handleQuantityChange = (assignmentIndex, value) => {
    const newAssignments = [...assignments];
    const stockUsed = parseInt(stockQuantities[newAssignments[assignmentIndex].component_id]) || 0;
    if (value === '') {
      newAssignments[assignmentIndex].todayQty = stockUsed;
    } else {
      const parsed = parseInt(value, 10);
      newAssignments[assignmentIndex].todayQty = isNaN(parsed) ? stockUsed : Math.max(stockUsed, parsed);
    }
    setAssignments(newAssignments);
  };

  

  const handleNotesChange = (assignmentIndex, value) => {
    const newAssignments = [...assignments];
    newAssignments[assignmentIndex].notes = value;
    setAssignments(newAssignments);
  };

  const calculateProgress = (bottle) => {
    const completed = bottle.completed_qty || 0;
    const total = bottle.qty || 0;
    return total > 0 ? Math.min((completed / total) * 100, 100) : 0;
  };

  const calculateNewProgress = (bottle, todayQty) => {
    const currentCompleted = bottle.completed_qty || 0;
    const newCompleted = currentCompleted + (todayQty || 0);
    const total = bottle.qty || 0; // Changed from quantity to qty
    return total > 0 ? Math.min((newCompleted / total) * 100, 100) : 0;
  };

  const ProgressBar = ({ assignment, todayQty }) => {
    const currentProgress = calculateProgress(assignment);
    const newProgress = calculateNewProgress(assignment, todayQty);
    const addedProgress = newProgress - currentProgress;

    return (
      <div className="w-full flex items-center space-x-2">
        <div className="flex-1 p-[1px] rounded-full bg-gradient-to-r from-orange-800 via-orange-600 to-orange-500">
          <div className="bg-white rounded-full h-3 sm:h-4 px-1 flex items-center overflow-hidden">
            <div
              className="bg-orange-600 h-1.5 sm:h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            />
            {addedProgress > 0 && (
              <div
                className="bg-green-500 h-1.5 sm:h-2.5 rounded-full transition-all duration-300 -ml-1"
                style={{ width: `${addedProgress}%` }}
              />
            )}
          </div>
        </div>
        <span className="text-xs sm:text-sm font-semibold text-orange-800 whitespace-nowrap">
          {newProgress.toFixed(0)}%
        </span>
      </div>
    );
  };

  const getRemainingQty = (bottle) => {
    const completed = bottle.completed_qty || 0;
    const total = bottle.qty || 0;
    return Math.max(total - completed, 0);
  };

  const updateLocalStorageGlassMaster = (dataCode, stockAdjustment) => {
    try {
      const glassMasterData = JSON.parse(localStorage.getItem("glassMaster")) || [];
      const updatedData = glassMasterData.map(glass => {
        if (glass.data_code === dataCode) {
          const currentStock = glass.available_stock || 0;
          const newStock = Math.max(0, currentStock + stockAdjustment);
          return { ...glass, available_stock: newStock };
        }
        return glass;
      });

      localStorage.setItem("glassMaster", JSON.stringify(updatedData));

      window.dispatchEvent(new StorageEvent('storage', {
        key: 'glassMaster',
        oldValue: JSON.stringify(glassMasterData),
        newValue: JSON.stringify(updatedData),
        storageArea: localStorage
      }));

      window.dispatchEvent(new CustomEvent('glassMasterUpdated', {
        detail: {
          updatedData,
          dataCode,
          newStock: updatedData.find(g => g.data_code === dataCode)?.available_stock
        }
      }));

    } catch (error) {
      console.error('Error updating localStorage glass master:', error);
    }
  };





   const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const updates = assignments
        .filter(assignment => assignment.todayQty > 0)
        .map(assignment => {
          const currentCompleted = assignment.completed_qty || 0;
          const stockUsed = stockQuantities[assignment.component_id] || 0;
          const newProduction = Math.max(0, assignment.todayQty - stockUsed);
          const newCompleted = currentCompleted + assignment.todayQty;

          return {
            component_data_code: assignment.data_code,
            component_id: assignment.component_id,
            quantity_produced: newProduction,
            stock_used: stockUsed,
            total_completed: newCompleted,
            notes: assignment.notes || '',
            date: new Date().toISOString()
          };
        });

      if (updates.length === 0) {
        setError('Please enter quantity for at least one Glass');
        setLoading(false);
        return;
      }

      for (let assignment of assignments) {
        const remaining = getRemainingQty(assignment);
        if (assignment.todayQty > remaining) {
          setError(`Quantity for ${assignment.name} exceeds remaining amount (${remaining})`);
          setLoading(false);
          return;
        }
      }

      // Create updated order data with new tracking information
      const updatedOrder = { ...orderData };
      const updatedItems = updatedOrder.items.map(item => {
        if (item.item_id === itemData.item_id) {
          return {
            ...item,
            components: item.components.map(component => {
              const update = updates.find(u => u.component_id === component.component_id);
              if (update) {
                // Create new tracking entry
                const newTrackingEntry = {
                  date: update.date,
                  username: "bottle_team",
                  quantity_produced: update.quantity_produced,
                  stock_used: update.stock_used,
                  total_completed: update.total_completed,
                  notes: update.notes
                };

                // Append to existing tracking array
                const updatedTracking = [...(component.tracking || []), newTrackingEntry];

                // Update component with new values
                return {
                  ...component,
                  completed_qty: update.total_completed,
                  status: update.total_completed >= component.qty ? 'COMPLETED' : 'IN_PROGRESS',
                  tracking: updatedTracking
                };
              }
              return component;
            })
          };
        }
        return item;
      });

      updatedOrder.items = updatedItems;

      // Process API calls
      for (let update of updates) {
        console.log('Making API call with data_code:', update.component_data_code);

        const glassResult = await fetch(
          `https://doms-k1fi.onrender.com/api/masters/glass/production/${encodeURIComponent(orderData.order_number)}/${itemData?.item_id}/${update.component_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: update.date || new Date().toISOString(),
              quantity_produced: update.quantity_produced,
              stock_used: update.stock_used,
              total_completed: update.total_completed,
              notes: update.notes,
              username: "bottle_team"
            }),
          }
        );

        if (!glassResult.ok) {
          throw new Error(`HTTP error! status: ${glassResult.status}`);
        }

        const glassResponse = await glassResult.json();
        if (!glassResponse.success) {
          throw new Error(glassResponse.message || 'Glass update failed');
        }

        if (update.stock_used > 0) {
          const adjustmentValue = -(update.stock_used);

          console.log('Stock adjustment API call for data_code:', update.component_data_code);

          const stockAdjustResult = await fetch(
            `https://doms-k1fi.onrender.com/api/masters/glass/stock/adjust/${update.component_data_code}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ adjustment: Number(adjustmentValue) }),
            }
          );

          if (!stockAdjustResult.ok) {
            throw new Error(`Stock adjust failed: ${stockAdjustResult.status}`);
          }

          const stockAdjustResponse = await stockAdjustResult.json();
          if (!stockAdjustResponse.success) {
            throw new Error(stockAdjustResponse.message || 'Stock adjustment failed');
          }
          updateLocalStorageGlassMaster(update.component_data_code, adjustmentValue);
        }
      }

      setSuccessMessage('Glass quantities updated successfully!');

      setTimeout(() => {
        // Update glass master data
        try {
          const updatedGlassData = JSON.parse(localStorage.getItem("glassMaster") || "[]");
          onStockUpdate?.(updatedGlassData); 
        } catch (error) {
          console.error('Error reading updated glass master data:', error);
          onStockUpdate?.([]); 
        }
        
        // Update order data with new tracking information
        onUpdate(updatedOrder);
        
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error updating glass quantities:', err);
      setError(err.message || 'Failed to update glass quantities');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <DialogPanel className="w-full max-w-sm sm:max-w-4xl lg:max-w-7xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">

            {/* Header */}
            <div className="bg-orange-600 text-white px-3 sm:px-4 py-3 flex justify-between items-start gap-4 rounded-t-lg">
              <div className="min-w-0 flex-1">
                <DialogTitle as="h2" className="text-lg sm:text-xl font-bold">
                  Update Bottle Production
                </DialogTitle>
                <p className="text-orange-100 text-xs sm:text-sm mt-1 truncate">
                  Order #{orderData?.order_number} - {itemData?.item_name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 sm:p-2 rounded-full transition-colors flex-shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            {(error || successMessage) && (
              <div className="px-3 sm:px-6 py-2 sm:py-4 border-b">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    {successMessage}
                  </div>
                )}
              </div>
            )}

            <div className="hidden lg:block bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 px-4 py-3 mt-4 mx-4 rounded-md">
              <div className="grid gap-4 text-white font-semibold text-sm items-center"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 2fr 1.5fr'
                }}>
                <div className="text-left">Bottle Name</div>
                <div className="text-center">Neck Size</div>
                <div className="text-center">Capacity</div>
                <div className="text-center">Total Qty</div>
                <div className="text-center">Remaining</div>
                <div className="text-center">Stock Used</div>
                <div className="text-center">Progress</div>
                <div className="text-center">Today's Input</div>
              </div>
            </div>

            <div className="max-h-[50vh] sm:max-h-96 overflow-y-auto p-3 sm:p-6">
              {assignments.map((assignment, index) => {
                const remaining = getRemainingQty(assignment);
                const isCompleted = remaining === 0;
                const stockUsed = stockQuantities[assignment.component_id] || 0;
                const colorClasses = ['bg-orange-50', 'bg-orange-100', 'bg-yellow-50', 'bg-yellow-100'];
                const bgColor = colorClasses[index % colorClasses.length];

                return (
                  <div key={assignment.component_id} className="mb-4 last:mb-0">
                    {/* Debug info - remove in production */}
                    <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-100 rounded">
                      Debug: data_code = {assignment.data_code}, component_id = {assignment.component_id}
                    </div>

                    <div className={`hidden lg:block border-b border-orange-100 px-6 py-4 ${bgColor} -mx-6`}>
                      <div className="grid gap-4 text-sm items-center"
                        style={{
                          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 2fr 1.5fr'
                        }}>

                        <div className="text-left">
                          <div className="font-medium text-orange-900">{assignment.name}</div>
                          <div className="text-xs text-gray-600">
                            ID: {assignment.component_id}
                          </div>
                        </div>

                        <div className="text-center text-orange-900">
                          {assignment.neck_size || 'N/A'}mm
                        </div>

                        <div className="text-center text-orange-900">
                          {assignment.capacity || 'N/A'}
                        </div>

                        <div className="text-center text-orange-900 font-medium">
                          {assignment.qty}
                        </div>

                        <div className="text-center">
                          <span className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-orange-700'}`}>
                            {remaining}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="font-semibold text-blue-600">
                            {stockUsed}
                          </span>
                        </div>

                        <div className="px-2">
                          <ProgressBar
                            assignment={assignment}
                            todayQty={assignment.todayQty || 0}
                          />
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            {assignment.completed_qty || 0} / {assignment.qty}
                          </div>
                        </div>

                        <div className="px-2">
                          {!isCompleted ? (
                            <div className="space-y-2">
                              <input
                                type="number"
                                min={stockUsed}
                                max={remaining + stockUsed}
                                value={assignment.todayQty === null ? stockUsed : assignment.todayQty}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Total Qty"
                              />
                              <input
                                type="text"
                                value={assignment.notes}
                                onChange={(e) => handleNotesChange(index, e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Notes (optional)"
                              />
                              {stockUsed > 0 && (
                                <div className="text-xs text-blue-600">
                                  Stock: {stockUsed} | Production: {(assignment.todayQty || 0) - stockUsed}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Completed
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`lg:hidden ${bgColor} rounded-lg p-3 sm:p-4`}>
                      <div className="space-y-3">
                        <div className="border-b border-gray-200 pb-3">
                          <h4 className="font-medium text-orange-900 text-sm sm:text-base">{assignment.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">ID: {assignment.component_id}</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                          <div>
                            <span className="text-gray-600">Size:</span>
                            <div className="font-medium text-orange-900">{assignment.neck_size || 'N/A'}mm</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Capacity:</span>
                            <div className="font-medium text-orange-900">{assignment.capacity || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Total:</span>
                            <div className="font-medium text-orange-900">{assignment.qty}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Remaining:</span>
                            <div className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-orange-700'}`}>
                              {remaining}
                            </div>
                          </div>
                        </div>
                        {stockUsed > 0 && (
                          <div className="bg-blue-50 rounded-md p-2">
                            <span className="text-xs text-gray-600">Stock Used:</span>
                            <div className="font-semibold text-blue-600">{stockUsed}</div>
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-600">Progress:</span>
                            <span className="text-xs text-gray-500">
                              {assignment.completed_qty || 0} / {assignment.qty}
                            </span>
                          </div>
                          <ProgressBar
                            assignment={assignment}
                            todayQty={assignment.todayQty || 0}
                          />
                        </div>
                        {!isCompleted ? (
                          <div className="space-y-3 pt-2 border-t border-gray-200">
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Today's Total Quantity:</label>
                              <input
                                type="number"
                                min={stockUsed}
                                max={remaining + stockUsed}
                                value={assignment.todayQty === null ? stockUsed : assignment.todayQty}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Enter quantity"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Notes (optional):</label>
                              <input
                                type="text"
                                value={assignment.notes}
                                onChange={(e) => handleNotesChange(index, e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Add notes..."
                              />
                            </div>
                            {stockUsed > 0 && (
                              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                Stock: {stockUsed} | Production: {(assignment.todayQty || 0) - stockUsed}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-gray-200 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Completed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 border-t">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Save Progress
                  </>
                )}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default UpdateBottleQty;