import React, { useState, useEffect } from 'react';
import { X, Truck, Eye } from 'lucide-react';
import { getSocket } from '../../../context/SocketContext';
import { canTeamMarkVehiclesDelivered } from '../../../utils/DecorationSequence';

const VehicleDetails = ({ isOpen, onClose, orderData, itemData, componentId, onUpdate, teamName }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localItemData, setLocalItemData] = useState(null);
  const socket = getSocket();

  const canEditVehicles = canTeamMarkVehiclesDelivered(
    localItemData?.components?.find(c => c.component_id === componentId),
    teamName
  );

  useEffect(() => {
    if (itemData) {
      setLocalItemData(itemData);
      console.log(`${teamName} VehicleDetails initialized with data:`, itemData);
    }
  }, [itemData, teamName]);

  // In VehicleDetails.jsx - Replace the existing handleVehicleMarkedDelivered useEffect

useEffect(() => {
  if (!socket) return;

  const handleVehicleMarkedDelivered = ({
    order_number,
    item_id,
    component_id,
    vehicle_details,
    deco_sequence,
    marked_by,
    all_marked,
    timestamp
  }) => {
    console.log(`${teamName} received vehicle delivery update:`, {
      component_id,
      deco_sequence,
      marked_by,
      all_marked,
      vehicle_count: vehicle_details?.length,
      current_order: orderData?.order_number,
      current_item: localItemData?.item_id,
      current_component: componentId
    });

    // CRITICAL: Always update local state for matching component
    if (localItemData &&
      order_number === orderData?.order_number &&
      item_id === localItemData.item_id &&
      component_id === componentId) {

      const updatedLocalItemData = {
        ...localItemData,
        components: localItemData.components.map(comp =>
          comp.component_id === component_id
            ? {
              ...comp,
              vehicle_details: vehicle_details || comp.vehicle_details,
              all_vehicles_delivered: true,
              vehicles_delivered_by: marked_by,
              vehicles_delivered_at: timestamp || new Date().toISOString()
            }
            : comp
        )
      };

      console.log(`${teamName} updating local modal state`);
      setLocalItemData(updatedLocalItemData);
    }

    // CRITICAL: Always call onUpdate regardless of modal state
    if (onUpdate) {
      const updatedComponent = {
        vehicle_details: vehicle_details,
        all_vehicles_delivered: true,
        vehicles_delivered_by: marked_by,
        vehicles_delivered_at: timestamp || new Date().toISOString()
      };
      
      console.log(`${teamName} propagating update to parent component`);
      onUpdate(order_number, item_id, component_id, updatedComponent);
    }

    setIsUpdating(false);
  };

  socket.on("vehicleMarkedDelivered", handleVehicleMarkedDelivered);

  return () => {
    socket.off("vehicleMarkedDelivered", handleVehicleMarkedDelivered);
  };
}, [socket, localItemData, orderData, onUpdate, teamName, componentId]);



  if (!isOpen || !orderData || !localItemData) return null;


  const handleVehicleReceived = async (componentId, vehicleIndex) => {
    if (isUpdating || !canEditVehicles) return;
    setIsUpdating(true);

    const component = localItemData.components.find(comp => comp.component_id === componentId);
    const vehicle = component?.vehicle_details?.[vehicleIndex];

    if (!vehicle) {
      setIsUpdating(false);
      return;
    }

    try {
      const updatedVehicleDetails = component.vehicle_details.map((v, index) => {
        if (index === vehicleIndex) {
          return {
            ...v,
            status: 'DELIVERED',
            received: true,
            delivered_at: new Date().toISOString()
          };
        }
        return v;
      });

      const payload = {
        team: teamName,
        order_number: orderData.order_number,
        item_id: localItemData.item_id,
        component_id: componentId,
        updateData: {
          vehicle_details: updatedVehicleDetails
        },
        deco_sequence: component.deco_sequence
      };

      console.log(`${teamName} marking single vehicle as delivered:`, payload);
      socket.emit("markVehicleDelivered", payload);

    } catch (error) {
      console.error(`Error updating ${teamName} vehicle status:`, error);
      alert('Error updating vehicle status. Please try again.');
      setIsUpdating(false);
    }
  };

  // FIXED: Mark all vehicles as delivered
  const handleMarkAllAsDelivered = async (componentId) => {
    if (isUpdating || !canEditVehicles) return;
    setIsUpdating(true);

    const component = localItemData.components.find(comp => comp.component_id === componentId);

    if (!component || !component.vehicle_details) {
      setIsUpdating(false);
      return;
    }

    try {
      const updatedVehicleDetails = component.vehicle_details.map(vehicle => ({
        ...vehicle,
        status: 'DELIVERED',
        received: true,
        delivered_at: new Date().toISOString()
      }));

      const payload = {
        team: teamName,
        order_number: orderData.order_number,
        item_id: localItemData.item_id,
        component_id: componentId,
        updateData: {
          vehicle_details: updatedVehicleDetails
        },
        deco_sequence: component.deco_sequence,
        mark_all: true // Flag to indicate all vehicles being marked
      };

      console.log(`${teamName} marking all vehicles as delivered:`, payload);
      socket.emit("markAllVehiclesDelivered", payload);

    } catch (error) {
      console.error('Error marking all vehicles as delivered:', error);
      alert('Error marking all vehicles as delivered. Please try again.');
      setIsUpdating(false);
    }
  };
  const componentsWithVehicles = componentId
    ? localItemData.components?.filter(
      comp => comp.component_id === componentId &&
        Array.isArray(comp.vehicle_details) &&
        comp.vehicle_details.length > 0
    ) || []
    : localItemData.components?.filter(
      comp => Array.isArray(comp.vehicle_details) &&
        comp.vehicle_details.length > 0
    ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Vehicle Details - {localItemData.item_name} ({teamName})
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
                  <span className="ml-2 font-medium">{localItemData.item_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Item Status:</span>
                  <span className="ml-2 font-medium">{localItemData.item_status}</span>
                </div>
                <div>
                  <span className="text-gray-500">Item Price:</span>
                  <span className="ml-2 font-medium">₹{localItemData.item_price?.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Order Number:</span>
                  <span className="ml-2 font-medium">{orderData.order_number}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {componentsWithVehicles.map((component, componentIndex) => {
              if (!component.vehicle_details || !Array.isArray(component.vehicle_details) || component.vehicle_details.length === 0) {
                return null;
              }

              const allDelivered = component.vehicle_details.every(v => v.received || v.status === 'DELIVERED');

              return (
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
                        <span className={`ml-2 font-medium ${component.status === 'DISPATCHED' ? 'text-green-600' :
                          component.status === 'IN_PROGRESS' ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                          {component.status}
                        </span>
                      </div>
                      {component.is_deco_approved !== undefined && (
                        <div>
                          <span className="text-gray-500">Deco Approved:</span>
                          <span className={`ml-2 font-medium ${component.is_deco_approved ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {component.is_deco_approved ? 'YES' : 'NO'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {canEditVehicles ? (
                      <button
                        onClick={() => handleMarkAllAsDelivered(component.component_id)}
                        disabled={allDelivered || isUpdating}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${allDelivered
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                          }`}
                      >
                        {isUpdating ? 'Updating...' : allDelivered ? 'All Delivered' : 'Mark All as Delivered'}
                      </button>
                    ) : (
                      <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                        <Eye className="inline w-4 h-4 mr-2" />
                        View Only - Only the first team can mark vehicles as delivered
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Vehicles for this Component ({component.vehicle_details.length} vehicles)
                  </h4>

                  <div className="space-y-3">
                    {component.vehicle_details.map((vehicle, vehicleIndex) => (
                      <div key={vehicleIndex} className="border border-gray-100 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{vehicle.vehicle_plate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${vehicle.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                              vehicle.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                              {vehicle.status}
                            </span>
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
                              disabled={!canEditVehicles || vehicle.status === 'DELIVERED' || isUpdating}
                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                              onChange={(e) => {
                                if (e.target.checked && canEditVehicles) {
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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