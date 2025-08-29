import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle } from 'lucide-react';
import { getSocket } from '../../../context/SocketContext';

const VehicleDetails = ({ isOpen, onClose, orderData, itemData, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    const handleVehicleUpdated = ({ order_number, item_id, component_id, updatedComponent }) => {
      console.log("✅ Vehicle status updated:", {
        order_number,
        item_id,
        component_id,
        updatedComponent
      });

       if (onUpdate) {
        console.log("🔄 Calling onUpdate with:", { order_number, item_id, component_id, updatedComponent });
        onUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
      }

      // Handle the update through parent component's onUpdate if available
      // // Or you can add your own state management here
      // if (onVehicleReceived) {
      //   // Trigger parent component update
      //   window.location.reload(); // Simple refresh for now, or implement proper state update
      // }
    };

    const handleVehicleError = (error) => {
      console.error("❌ Vehicle update failed:", error);
      alert(`Vehicle update failed: ${error}`);
      setIsUpdating(false);
    };

    socket.on("glassVehicleUpdatedSelf", handleVehicleUpdated);
    socket.on("glassVehicleError", handleVehicleError);

    return () => {
      socket.off("glassVehicleUpdatedSelf", handleVehicleUpdated);
      socket.off("glassVehicleError", handleVehicleError);
    };
  }, [socket]);

  if (!isOpen || !orderData || !itemData) return null;

  const handleVehicleReceived = async (componentId, vehicleIndex) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    // Find the component and vehicle
    const component = itemData.components.find(comp => comp.component_id === componentId);
    const vehicle = component?.vehicle_details?.[vehicleIndex];
    
    if (!vehicle) {
      setIsUpdating(false);
      return;
    }

    try {
      // Create updated vehicle details array with the specific vehicle marked as DELIVERED
      const updatedVehicleDetails = component.vehicle_details.map((v, index) => {
        if (index === vehicleIndex) {
          return {
            ...v,
            status: 'DELIVERED',
            received: true
          };
        }
        return v;
      });

      const payload = {
        order_number: orderData.order_number,
        item_id: itemData.item_id,
        component_id: componentId,
        updateData: {
          vehicle_details: updatedVehicleDetails
        }
      };

      console.log('Emitting updateGlassVehicle for delivery:', payload);
      socket.emit("updateGlassVehicle", payload);

    } catch (error) {
      console.error('Error updating vehicle status:', error);
      alert('Error updating vehicle status. Please try again.');
      setIsUpdating(false);
    }
  };

  const handleVehicleApproved = async (componentId, vehicleIndex) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    // Find the component and vehicle
    const component = itemData.components.find(comp => comp.component_id === componentId);
    const vehicle = component?.vehicle_details?.[vehicleIndex];
    
    if (!vehicle || !vehicle.received) {
      setIsUpdating(false);
      return;
    }

    try {
      // Create updated vehicle details array with the specific vehicle marked as approved
      const updatedVehicleDetails = component.vehicle_details.map((v, index) => {
        if (index === vehicleIndex) {
          return {
            ...v,
            approved: true
          };
        }
        return v;
      });

      const payload = {
        order_number: orderData.order_number,
        item_id: itemData.item_id,
        component_id: componentId,
        updateData: {
          vehicle_details: updatedVehicleDetails
        }
      };

      console.log('Emitting updateGlassVehicle for approval:', payload);
      socket.emit("updateGlassVehicle", payload);

    } catch (error) {
      console.error('Error approving vehicle:', error);
      alert('Error approving vehicle. Please try again.');
      setIsUpdating(false);
    }
  };

  // Get all components with vehicle details from the item
  const componentsWithVehicles = itemData.components?.filter(
    component => component.vehicle_details && component.vehicle_details.length > 0
  ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Vehicle Details - {itemData.item_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Item Information</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Item Name:</span>
                  <span className="ml-2 font-medium">{itemData.item_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Item Status:</span>
                  <span className="ml-2 font-medium">{itemData.item_status}</span>
                </div>
                <div>
                  <span className="text-gray-500">Item Price:</span>
                  <span className="ml-2 font-medium">₹{itemData.item_price?.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Order Number:</span>
                  <span className="ml-2 font-medium">{orderData.order_number}</span>
                </div>
              </div>
            </div>
          </div>

          {componentsWithVehicles.length > 0 ? (
            <div className="space-y-6">
              {componentsWithVehicles.map((component, componentIndex) => (
                <div key={component.component_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="text-md font-semibold text-gray-800 mb-2">
                      {component.name} ({component.data_code})
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 rounded p-3">
                      <div>
                        <span className="text-gray-500">Component Type:</span>
                        <span className="ml-2 font-medium capitalize">{component.component_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 font-medium ${
                          component.status === 'DISPATCHED' 
                            ? 'text-green-600' 
                            : component.status === 'IN_PROGRESS'
                            ? 'text-orange-600'
                            : 'text-gray-600'
                        }`}>
                          {component.status}
                        </span>
                      </div>
                      {component.is_deco_approved !== undefined && (
                        <div>
                          <span className="text-gray-500">Deco Approved:</span>
                          <span className={`ml-2 font-medium ${
                            component.is_deco_approved ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {component.is_deco_approved ? 'YES' : 'NO'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm font-medium text-gray-700 mb-3">Vehicles for this Component</h4>
                  <div className="space-y-3">
                    {component.vehicle_details.map((vehicle, vehicleIndex) => (
                      <div key={vehicleIndex} className="border border-gray-100 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{vehicle.vehicle_plate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              vehicle.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-800'
                                : vehicle.status === 'IN_TRANSIT'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {vehicle.status}
                            </span>
                            {vehicle.approved && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Destination:</span>
                            <div className="font-medium">{vehicle.destination}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Departure Time:</span>
                            <div className="font-medium">
                              {new Date(vehicle.departure_time).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`vehicle-received-${component.component_id}-${vehicleIndex}`}
                              checked={vehicle.received || vehicle.status === 'DELIVERED'}
                              disabled={vehicle.status === 'DELIVERED' || isUpdating}
                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleVehicleReceived(component.component_id, vehicleIndex);
                                }
                              }}
                            />
                            <label 
                              htmlFor={`vehicle-received-${component.component_id}-${vehicleIndex}`} 
                              className="text-sm text-gray-600 cursor-pointer"
                            >
                              {vehicle.status === 'DELIVERED' ? 'Delivered' : 'Mark as Received'}
                            </label>
                          </div>
                          
                          <button
                            onClick={() => handleVehicleApproved(component.component_id, vehicleIndex)}
                            disabled={vehicle.approved || (!vehicle.received && vehicle.status !== 'DELIVERED') || isUpdating}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                              vehicle.approved
                                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                : (vehicle.received || vehicle.status === 'DELIVERED')
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isUpdating ? 'Updating...' : vehicle.approved ? 'Approved' : 'Mark as Approved'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No vehicle details available for this item</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;