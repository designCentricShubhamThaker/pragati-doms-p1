import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Plus, Minus, Truck, AlertTriangle, CheckCircle, Eye, Package, Calendar, User } from 'lucide-react';


const DispatchOrders = ({ isOpen, onClose, orderData, itemData, onDispatch }) => {
  const [vehicleDetails, setVehicleDetails] = useState([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState('Item dispatched');
  const [error, setError] = useState('');




  useEffect(() => {
    if (itemData?.components?.[0]?.vehicle_details) {
      setVehicleDetails(itemData.components[0].vehicle_details);
    }
  }, [itemData]);

  const handleConfirm = async () => {
    try {
      setIsDispatching(true);
      await onDispatch();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to dispatch order');
    } finally {
      setIsDispatching(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-orange-200">

            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Dispatch Confirmation</h2>
                    <p className="text-orange-100 text-sm">
                      Order: {orderData?.order_number} | Item: {itemData?.item_id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">

              {/* Warning Alert */}
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-orange-800 mb-1">
                      Are you sure you want to dispatch this order?
                    </h3>
                    <p className="text-orange-700 text-sm">
                      Please review the vehicle details below before confirming dispatch. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Package className="h-4 w-4 mr-2 text-orange-500" />
                  Order Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Order Number:</span>
                    <span className="ml-2 font-medium">{orderData?.order_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Item ID:</span>
                    <span className="ml-2 font-medium">{itemData?.item_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Component ID:</span>
                    <span className="ml-2 font-medium">{itemData?.components?.[0]?.component_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Details Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <Truck className="h-4 w-4 mr-2 text-orange-500" />
                    Vehicle Details ({vehicleDetails.length} vehicles)
                  </h3>
                  <button
                    onClick={() => setShowVehicleDetails(!showVehicleDetails)}
                    className="flex items-center px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showVehicleDetails ? 'Hide' : 'View'} Details
                  </button>
                </div>

                {vehicleDetails.length > 0 ? (
                  <div className="space-y-3">
                    {vehicleDetails.map((vehicle, index) => (
                      <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50/50">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 block">Vehicle Number:</span>
                            <span className="font-medium text-gray-800">{vehicle.vehicle_plate || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Departure Time:</span>
                            <span className="font-medium text-gray-800"> {vehicle.departure_time
                              ? new Date(vehicle.departure_time).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                              : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Destimation:</span>
                            <span className="font-medium text-gray-800">{vehicle.destination || 'N/A'}</span>
                          </div>


                          <div>
                            <span className="text-gray-600 block">Status:</span>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${vehicle.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : vehicle.status === 'in_transit'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {vehicle.status || 'pending'}
                            </span>
                          </div>
                        </div>

                        {showVehicleDetails && vehicle.notes && (
                          <div className="mt-3 pt-3 border-t border-orange-200">
                            <span className="text-gray-600 text-sm block mb-1">Notes:</span>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                              {vehicle.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No vehicle details available</p>
                  </div>
                )}
              </div>

              {/* Dispatch Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dispatch Notes
                </label>
                <textarea
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Enter dispatch notes..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  disabled={isDispatching}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isDispatching}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isDispatching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Confirm Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatchOrders;