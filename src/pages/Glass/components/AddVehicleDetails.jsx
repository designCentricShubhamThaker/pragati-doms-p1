import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Plus, Minus, Truck } from 'lucide-react';
import { getSocket } from '../../../context/SocketContext';

const AddVehicleDetails = ({ isOpen, onClose, orderData, itemData, onUpdate }) => {
  const [vehicleDetails, setVehicleDetails] = useState([]);
  const [errors, setErrors] = useState({});
  const [numberOfVehicles, setNumberOfVehicles] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const socket = getSocket();

  const component = itemData?.components?.[0] || {};
  const componentId = component.component_id;
  const orderNumber = orderData?.order_number;

  useEffect(() => {
    if (!socket) return;

    const handleVehicleUpdated = ({ order_number, item_id, component_id, updatedComponent }) => {
      console.log("✅ Vehicles updated:", {
        order_number,
        item_id,
        component_id,
        updatedComponent,
        hasVehicleDetails: !!updatedComponent?.vehicle_details,
        vehicleDetailsLength: updatedComponent?.vehicle_details?.length
      });

      const isCurrentItem = order_number === orderNumber &&
        item_id === itemData?.item_id &&
        component_id === componentId;

      if (!isCurrentItem) {
        console.log("Update not for current item, ignoring");
        return;
      }

      if (updatedComponent?.vehicle_details && Array.isArray(updatedComponent.vehicle_details)) {
        const updatedVehicleDetails = updatedComponent.vehicle_details.map(vehicle => ({
          vehicle_plate: vehicle.vehicle_plate || '',
          status: vehicle.status || 'IN_TRANSIT',
          departure_time: vehicle.departure_time ? new Date(vehicle.departure_time).toISOString().slice(0, 16) : '',
          destination: vehicle.destination || ''
        }));

        console.log("Setting updated vehicle details:", updatedVehicleDetails);
        setVehicleDetails(updatedVehicleDetails);
        setNumberOfVehicles(updatedVehicleDetails.length);
      } else {
        console.warn("No valid vehicle_details found in response");
      }

      if (onUpdate) {
        console.log("🔄 Calling onUpdate with:", { order_number, item_id, component_id, updatedComponent });
        onUpdate(order_number, item_id, component_id, updatedComponent, updatedComponent?.status);
      }
      
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 300);
    };

    const handleVehicleError = (error) => {
      console.error("❌ Vehicle update failed:", error);
      alert(`Vehicle update failed: ${error}`);
      setIsSubmitting(false);
    };

    socket.on("glassVehicleUpdatedSelf", handleVehicleUpdated);
    socket.on("glassVehicleError", handleVehicleError);

    return () => {
      socket.off("glassVehicleUpdatedSelf", handleVehicleUpdated);
      socket.off("glassVehicleError", handleVehicleError);
    };
  }, [socket, onUpdate, onClose, orderNumber, componentId, itemData?.item_id]);

  useEffect(() => {
    if (isOpen && itemData) {
      const existingVehicleDetails = itemData.components[0].vehicle_details;

      if (existingVehicleDetails && existingVehicleDetails.length > 0) {
        const formattedDetails = existingVehicleDetails.map(vehicle => ({
          vehicle_plate: vehicle.vehicle_plate || '',
          status: vehicle.status || 'IN_TRANSIT',
          departure_time: vehicle.departure_time ? new Date(vehicle.departure_time).toISOString().slice(0, 16) : '',
          destination: vehicle.destination || ''
        }));

        setVehicleDetails(formattedDetails);
        setNumberOfVehicles(formattedDetails.length);
      } else {
        setVehicleDetails([{
          vehicle_plate: '',
          status: 'IN_TRANSIT',
          departure_time: '',
          destination: ''
        }]);
        setNumberOfVehicles(1);
      }

      setErrors({});
    }
  }, [isOpen, itemData]);

  const updateVehicleCount = (count) => {
    const newCount = Math.max(1, Math.min(10, count));
    setNumberOfVehicles(newCount);

    const newDetails = [];
    for (let i = 0; i < newCount; i++) {
      const existingVehicle = vehicleDetails[i] || {
        vehicle_plate: '',
        status: 'IN_TRANSIT',
        departure_time: '',
        destination: ''
      };
      newDetails.push(existingVehicle);
    }

    setVehicleDetails(newDetails);
  };

  const updateVehicle = (index, field, value) => {
    const newDetails = [...vehicleDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setVehicleDetails(newDetails);

    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      if (Object.keys(newErrors[index]).length === 0) {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    vehicleDetails.forEach((vehicle, index) => {
      const vehicleErrors = {};

      if (!vehicle.vehicle_plate.trim()) {
        vehicleErrors.vehicle_plate = 'Vehicle plate is required';
        isValid = false;
      }

      if (!vehicle.destination.trim()) {
        vehicleErrors.destination = 'Destination is required';
        isValid = false;
      }

      if (!vehicle.departure_time) {
        vehicleErrors.departure_time = 'Departure time is required';
        isValid = false;
      }

      if (Object.keys(vehicleErrors).length > 0) {
        newErrors[index] = vehicleErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (isSubmitting) {
      return; // Prevent double submission
    }

    setIsSubmitting(true);

    try {

      const formattedVehicles = vehicleDetails.map(vehicle => ({
        vehicle_plate: vehicle.vehicle_plate.trim(),
        status: vehicle.status,
        departure_time: new Date(vehicle.departure_time).toISOString(),
        destination: vehicle.destination.trim()
      }));

      const payload = {
        order_number: orderNumber,
        item_id: itemData?.item_id,
        component_id: componentId,
        updateData: {
          vehicle_details: formattedVehicles
        }
      };

      console.log('Emitting updateGlassVehicle with payload:', payload);

      // Emit the update - listeners are already set up in useEffect
      socket.emit("updateGlassVehicle", payload);

    } catch (error) {
      console.error('Error saving vehicle details:', error);
      alert('Error saving vehicle details. Please try again.');
      setIsSubmitting(false);
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
          <div className="relative w-full max-w-4xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">

            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Truck size={20} />
                    </div>
                    Add Vehicle Details
                  </h2>
                  <div className="mt-2">
                    <p className="text-orange-100 text-sm">
                      Order #{orderNumber} - {itemData?.item_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-all duration-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">

              {/* Vehicle Count Control */}
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Number of Vehicles
                </label>
                <div className="flex items-center bg-white rounded-lg p-1 border border-gray-300 w-fit">
                  <button
                    onClick={() => updateVehicleCount(numberOfVehicles - 1)}
                    disabled={numberOfVehicles <= 1}
                    className="flex items-center justify-center px-3 py-2 text-gray-600 hover:text-orange-600 hover:bg-gray-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="px-4 py-2">
                    <span className="text-lg font-bold text-gray-800">{numberOfVehicles}</span>
                  </div>
                  <button
                    onClick={() => updateVehicleCount(numberOfVehicles + 1)}
                    disabled={numberOfVehicles >= 10}
                    className="flex items-center justify-center px-3 py-2 text-gray-600 hover:text-orange-600 hover:bg-gray-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="space-y-4">
                {vehicleDetails.map((vehicle, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Truck size={18} className="text-orange-600" />
                        Vehicle {index + 1}
                      </h3>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Vehicle Plate */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vehicle Plate Number *
                          </label>
                          <input
                            type="text"
                            value={vehicle.vehicle_plate}
                            onChange={(e) => updateVehicle(index, 'vehicle_plate', e.target.value.toUpperCase())}
                            placeholder="e.g., MH12AB1234"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ${errors[index]?.vehicle_plate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                          />
                          {errors[index]?.vehicle_plate && (
                            <p className="text-red-600 text-sm mt-1">{errors[index].vehicle_plate}</p>
                          )}
                        </div>

                        {/* Status */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status *
                          </label>
                          <select
                            value={vehicle.status}
                            onChange={(e) => updateVehicle(index, 'status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                          >
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="DELIVERED">Delivered</option>
                          </select>
                        </div>

                        {/* Departure Time */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Departure Time *
                          </label>
                          <input
                            type="datetime-local"
                            value={vehicle.departure_time}
                            onChange={(e) => updateVehicle(index, 'departure_time', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ${errors[index]?.departure_time ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                          />
                          {errors[index]?.departure_time && (
                            <p className="text-red-600 text-sm mt-1">{errors[index].departure_time}</p>
                          )}
                        </div>

                        {/* Destination */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Destination *
                          </label>
                          <input
                            type="text"
                            value={vehicle.destination}
                            onChange={(e) => updateVehicle(index, 'destination', e.target.value)}
                            placeholder="Enter destination address"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ${errors[index]?.destination ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                          />
                          {errors[index]?.destination && (
                            <p className="text-red-600 text-sm mt-1">{errors[index].destination}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  * Required fields
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-medium shadow-sm disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSubmitting ? 'Saving...' : 'Save Vehicle Details'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AddVehicleDetails;