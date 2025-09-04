import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Save } from 'lucide-react';
import { getSocket } from '../../../context/SocketContext';

const UpdateTeamQty = ({ isOpen, onClose, orderData, itemData, onUpdate, teamName, teamConfig }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const socket = getSocket();

  useEffect(() => {
    if (isOpen && itemData?.components) {
      const bottleAssignments = itemData.components
        .filter(component => 
          component.component_type === "glass" && 
          component.decorations?.[teamName]
        )
        .map(bottle => ({
          ...bottle,
          // Use team-specific decoration data
          teamQty: bottle.decorations[teamName].qty,
          teamCompleted: bottle.decorations[teamName].completed_qty,
          teamStatus: bottle.decorations[teamName].status,
          todayQty: "",
          notes: ''
        }));

      setAssignments(bottleAssignments);
      setError(null);
      setSuccessMessage('');
    } else if (isOpen) {
      setAssignments([]);
      setError(null);
      setSuccessMessage('');
    }
  }, [isOpen, itemData, teamName]);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const updates = assignments
        .filter(assignment => assignment.todayQty > 0)
        .map(assignment => ({
          component_id: assignment.component_id,
          quantity_produced: assignment.todayQty,
          username: `${teamName}_admin`,
          notes: assignment.notes || 'qty produced',
          date: new Date().toISOString()
        }));

      if (updates.length === 0) {
        setError('Please enter quantity for at least one bottle');
        setLoading(false);
        return;
      }

      // Emit updates using generic decoration production endpoint
      for (let update of updates) {
        const payload = {
          team: teamName,
          order_number: orderData.order_number,
          item_id: itemData?.item_id,
          component_id: update.component_id,
          updateData: {
            date: update.date,
            username: `${teamName}_admin`, 
            quantity_produced: update.quantity_produced,
            notes: update.notes
          }
        };

        socket.emit("updateDecorationProduction", payload);

        // Listen for team-specific response
        socket.once(`${teamName}ProductionUpdatedSelf`, ({ order_number, item_id, component_id, updatedComponent }) => {
          console.log(`✅ ${teamName} production updated:`, order_number, item_id, component_id, updatedComponent);
          onUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.decorations?.[teamName]?.status);
        });

        socket.once(`${teamName}ProductionError`, (error) => {
          console.error(`❌ ${teamName} update failed:`, error);
          setError(error || `${teamName} update failed`);
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

  // Calculate current progress based on team's completed_qty
  const calculateProgress = (bottle) => {
    const completed = bottle.teamCompleted || 0;
    const total = bottle.teamQty || 0;
    return total > 0 ? Math.min((completed / total) * 100, 100) : 0;
  };

  // Calculate progress after adding today's quantity
  const calculateNewProgress = (bottle, todayQty) => {
    const currentCompleted = bottle.teamCompleted || 0;
    const newCompleted = currentCompleted + (todayQty || 0);
    const total = bottle.teamQty || 0;
    return total > 0 ? Math.min((newCompleted / total) * 100, 100) : 0;
  };

  // Progress bar with dynamic colors based on team
  const ProgressBar = ({ assignment, todayQty }) => {
    const currentProgress = calculateProgress(assignment);
    const newProgress = calculateNewProgress(assignment, todayQty);
    const addedProgress = newProgress - currentProgress;

    const getProgressColors = () => {
      switch (teamConfig.color) {
        case 'blue':
          return {
            gradient: 'from-blue-800 via-blue-600 to-blue-500',
            current: 'bg-blue-600',
            text: 'text-blue-800'
          };
        case 'purple':
          return {
            gradient: 'from-purple-800 via-purple-600 to-purple-500',
            current: 'bg-purple-600',
            text: 'text-purple-800'
          };
        case 'yellow':
          return {
            gradient: 'from-yellow-800 via-yellow-600 to-yellow-500',
            current: 'bg-yellow-600',
            text: 'text-yellow-800'
          };
        default:
          return {
            gradient: 'from-orange-800 via-orange-600 to-orange-500',
            current: 'bg-orange-600',
            text: 'text-orange-800'
          };
      }
    };

    const colors = getProgressColors();

    return (
      <div className="w-full flex items-center space-x-2">
        <div className={`flex-1 p-[1px] rounded-full bg-gradient-to-r ${colors.gradient}`}>
          <div className="bg-white rounded-full h-3 sm:h-4 px-1 flex items-center overflow-hidden">
            <div
              className={`${colors.current} h-1.5 sm:h-2.5 rounded-full transition-all duration-300`}
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
        <span className={`text-xs sm:text-sm font-semibold ${colors.text} whitespace-nowrap`}>
          {newProgress.toFixed(0)}%
        </span>
      </div>
    );
  };

  const getHeaderColors = () => {
    switch (teamConfig.color) {
      case 'blue':
        return 'bg-blue-600';
      case 'purple':
        return 'bg-purple-600';
      case 'yellow':
        return 'bg-yellow-600';
      default:
        return 'bg-orange-600';
    }
  };

  const getGradientColors = () => {
    switch (teamConfig.color) {
      case 'blue':
        return 'from-blue-800 via-blue-600 to-blue-400';
      case 'purple':
        return 'from-purple-800 via-purple-600 to-purple-400';
      case 'yellow':
        return 'from-yellow-800 via-yellow-600 to-yellow-400';
      default:
        return 'from-orange-800 via-orange-600 to-orange-400';
    }
  };

  const getButtonColors = () => {
    switch (teamConfig.color) {
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
      case 'purple':
        return 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500';
      case 'yellow':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      default:
        return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500';
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <DialogPanel className="w-full max-w-sm sm:max-w-4xl lg:max-w-7xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">

            {/* Header with dynamic colors */}
            <div className={`${getHeaderColors()} text-white px-3 sm:px-4 py-3 flex justify-between items-start gap-4 rounded-t-lg`}>
              <div className="min-w-0 flex-1">
                <DialogTitle as="h2" className="text-lg sm:text-xl font-bold">
                  Update {teamConfig.name} Production
                </DialogTitle>
                <p className={`${teamConfig.color === 'yellow' ? 'text-yellow-100' : 
                  teamConfig.color === 'blue' ? 'text-blue-100' : 
                  teamConfig.color === 'purple' ? 'text-purple-100' : 'text-orange-100'} text-xs sm:text-sm mt-1 truncate`}>
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

            {/* Desktop Header with dynamic colors */}
            <div className={`hidden lg:block bg-gradient-to-r ${getGradientColors()} px-4 py-3 mt-4 mx-4 rounded-md`}>
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
              {assignments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-lg mb-2">No {teamName} components found</div>
                  <div className="text-gray-400 text-sm">
                    This item doesn't have any glass components with {teamName} requirements.
                  </div>
                </div>
              ) : (
                assignments.map((assignment, index) => {
                  const colorClasses = ['bg-orange-50', 'bg-orange-100', 'bg-yellow-50', 'bg-yellow-100'];
                  const bgColor = colorClasses[index % colorClasses.length];

                  return (
                    <div key={assignment.component_id} className="mb-4 last:mb-0">

                      {/* Desktop Layout */}
                      <div className={`hidden lg:block border-b border-gray-100 px-6 py-4 ${bgColor} -mx-6`}>
                        <div className="grid gap-4 text-sm items-center"
                          style={{
                            gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr 1.5fr'
                          }}>

                          <div className="text-left">
                            <div className="font-medium text-gray-900">{assignment.name}</div>
                            <div className="text-xs text-gray-600">
                              ID: {assignment.component_id}
                            </div>
                          </div>

                          <div className="text-center text-gray-900">
                            {assignment.neck_size || 'N/A'}mm
                          </div>

                          <div className="text-center text-gray-900">
                            {assignment.capacity || 'N/A'}
                          </div>

                          <div className="text-center text-gray-900 font-medium">
                            {assignment.teamQty}
                          </div>

                          <div className="px-2">
                            <ProgressBar 
                              assignment={assignment} 
                              todayQty={assignment.todayQty || 0}
                            />
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {assignment.teamCompleted || 0} / {assignment.teamQty}
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
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base">{assignment.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">ID: {assignment.component_id}</p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                            <div>
                              <span className="text-gray-600">Size:</span>
                              <div className="font-medium text-gray-900">{assignment.neck_size || 'N/A'}mm</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Capacity:</span>
                              <div className="font-medium text-gray-900">{assignment.capacity || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Total:</span>
                              <div className="font-medium text-gray-900">{assignment.teamQty}</div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-gray-600">Progress:</span>
                              <span className="text-xs text-gray-500">
                                {assignment.teamCompleted || 0} / {assignment.teamQty}
                              </span>
                            </div>
                            <ProgressBar 
                              assignment={assignment} 
                              todayQty={assignment.todayQty || 0}
                            />
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
                })
              )}
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
                className={`w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white ${getButtonColors()} border border-transparent rounded-md disabled:opacity-50 disabled:cursor-not-allowed`}
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

export default UpdateTeamQty;