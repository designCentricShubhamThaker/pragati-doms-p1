import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Save } from 'lucide-react';
import { getSocket } from '../../../context/SocketContext';

const UpdatePrintingQty = ({ isOpen, onClose, orderData, itemData, onUpdate }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const socket = getSocket();

  useEffect(() => {
    if (isOpen && itemData?.components) {
      const bottleAssignments = itemData.components
        .filter(component => component.component_type === "glass")
        .map(bottle => ({
          ...bottle,
          todayQty: "",
          notes: ''
        }));

      setAssignments(bottleAssignments);
      setError(null);
      setSuccessMessage('');
    }
  }, [isOpen, itemData]);

  const handleQuantityChange = (assignmentIndex, value) => {
    const newAssignments = [...assignments];
    const inputQty = value === "" ? 0 : parseInt(value, 10) || 0;

    newAssignments[assignmentIndex].todayQty = inputQty;
    setAssignments(newAssignments);
    setError(null);
  };

  const handleNotesChange = (assignmentIndex, value) => {
    const newAssignments = [...assignments];
    newAssignments[assignmentIndex].notes = value;
    setAssignments(newAssignments);
  };

  const calculateProgress = (bottle) => {
    const completed = (bottle.completed_qty || 0) + (bottle.todayQty || 0);
    const total = bottle.qty || 0;
    return total > 0 ? Math.min((completed / total) * 100, 100) : 0;
  };

  const ProgressBar = ({ assignment }) => {
    const progress = calculateProgress(assignment);

    return (
      <div className="w-full flex items-center space-x-2">
        <div className="flex-1 p-[1px] rounded-full bg-gradient-to-r from-orange-800 via-orange-600 to-orange-500">
          <div className="bg-white rounded-full h-3 sm:h-4 px-1 flex items-center overflow-hidden">
            <div
              className="bg-orange-600 h-1.5 sm:h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs sm:text-sm font-semibold text-orange-800 whitespace-nowrap">
          {progress.toFixed(0)}%
        </span>
      </div>
    );
  };

const handleSave = async () => {
  try {
    setLoading(true);
    setError(null);

    const updates = assignments
      .filter(assignment => assignment.todayQty > 0)
      .map(assignment => ({
        component_id: assignment.component_id,
        quantity_produced: assignment.todayQty,
        username: 'printing_admin',
        notes: assignment.notes || 'qty produced',
        date: new Date().toISOString()
      }));

    if (updates.length === 0) {
      setError('Please enter quantity for at least one bottle');
      setLoading(false);
      return;
    }

    // Emit updates with individual listeners (like glass code)
    for (let update of updates) {
      const payload = {
        team: "printing",
        order_number: orderData.order_number,
        item_id: itemData?.item_id,
        component_id: update.component_id,
        updateData: {
          date: update.date,
          username: "printing_admin", 
          quantity_produced: update.quantity_produced,
          notes: update.notes
        }
      };

      socket.emit("updatePrintingProduction", payload);

      // Individual listeners for each update (same pattern as glass)
      socket.once("printingProductionUpdatedSelf", ({ order_number, item_id, component_id, updatedComponent }) => {
        console.log("✅ Production updated:", order_number, item_id, component_id, updatedComponent);
        onUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
      });

      socket.once("printingProductionError", (error) => {
        console.error("❌ Printing update failed:", error);
        setError(error || "Printing update failed");
      });
    }

    setSuccessMessage("Quantities updated successfully!");
    setTimeout(() => {
      onClose();
    }, 1500);

  } catch (err) {
    console.error("Error updating quantities:", err);
    setError(err.message || "Failed to update quantities");
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

            {/* Desktop Header */}
            <div className="hidden lg:block bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 px-4 py-3 mt-4 mx-4 rounded-md">
              <div className="grid gap-4 text-white font-semibold text-sm items-center"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr 1.5fr'
                }}>
                <div className="text-left">Bottle Name</div>
                <div className="text-center">Neck Size</div>
                <div className="text-center">Capacity</div>
                <div className="text-center">Total Qty</div>
                <div className="text-center">Progress</div>
                <div className="text-center">Update Quantity</div>
              </div>
            </div>

            <div className="max-h-[50vh] sm:max-h-96 overflow-y-auto p-3 sm:p-6">
              {assignments.map((assignment, index) => {
                const colorClasses = ['bg-orange-50', 'bg-orange-100', 'bg-yellow-50', 'bg-yellow-100'];
                const bgColor = colorClasses[index % colorClasses.length];

                return (
                  <div key={assignment.component_id} className="mb-4 last:mb-0">

                    {/* Desktop Layout */}
                    <div className={`hidden lg:block border-b border-orange-100 px-6 py-4 ${bgColor} -mx-6`}>
                      <div className="grid gap-4 text-sm items-center"
                        style={{
                          gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr 1.5fr'
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

                        <div className="px-2">
                          <ProgressBar assignment={assignment} />
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            {(assignment.completed_qty || 0) + (assignment.todayQty || 0)} / {assignment.qty}
                          </div>
                        </div>

                        <div className="px-2">
                          <div className="space-y-2">
                            <input
                              type="number"
                              min={0}
                              value={assignment.todayQty || ''}
                              onChange={(e) => handleQuantityChange(index, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="Quantity"
                            />
                            <input
                              type="text"
                              value={assignment.notes}
                              onChange={(e) => handleNotesChange(index, e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="Notes (optional)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className={`lg:hidden ${bgColor} rounded-lg p-3 sm:p-4`}>
                      <div className="space-y-3">
                        <div className="border-b border-gray-200 pb-3">
                          <h4 className="font-medium text-orange-900 text-sm sm:text-base">{assignment.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">ID: {assignment.component_id}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
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
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-600">Progress:</span>
                            <span className="text-xs text-gray-500">
                              {(assignment.completed_qty || 0) + (assignment.todayQty || 0)} / {assignment.qty}
                            </span>
                          </div>
                          <ProgressBar assignment={assignment} />
                        </div>

                        <div className="space-y-3 pt-2 border-t border-gray-200">
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Quantity:</label>
                            <input
                              type="number"
                              min={0}
                              value={assignment.todayQty || ''}
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
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
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
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Update
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

export default UpdatePrintingQty;