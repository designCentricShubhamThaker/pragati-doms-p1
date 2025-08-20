import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Minus, Truck, Calculator, Divide, User } from 'lucide-react';

const AddVehicleDetails = ({ isOpen, onClose, orderData, itemData, onUpdate }) => {
console.log(itemData)
  const [vehicleDetails, setVehicleDetails] = useState([]);
  const [errors, setErrors] = useState({});
  const [numberOfVehicles, setNumberOfVehicles] = useState(1);
  const [distributionMode, setDistributionMode] = useState('equal')
  const totalQuantity = itemData.components[0]?.qty || 0;
  console.log(totalQuantity)

  // Auto-distribute quantities based on vehicle count
  const distributeQuantity = (vehicleCount, currentDetails = []) => {
    const newDetails = [];
    
    if (distributionMode === 'equal') {
      const baseQuantity = Math.floor(totalQuantity / vehicleCount);
      const remainder = totalQuantity % vehicleCount;
      
      for (let i = 0; i < vehicleCount; i++) {
        const existingVehicle = currentDetails[i] || {
          vehicle_plate: '',
          status: 'IN_TRANSIT',
          departure_time: '',
          destination: '',
          quantity: 0
        };
        
        newDetails.push({
          ...existingVehicle,
          quantity: baseQuantity + (i < remainder ? 1 : 0)
        });
      }
    } else {
      for (let i = 0; i < vehicleCount; i++) {
        const existingVehicle = currentDetails[i] || {
          vehicle_plate: '',
          status: 'IN_TRANSIT',
          departure_time: '',
          destination: '',
          quantity: 0
        };
        newDetails.push(existingVehicle);
      }
    }
    
    return newDetails;
  };

  useEffect(() => {
    if (isOpen) {
      const initialDetails = distributeQuantity(1, []);
      setVehicleDetails(initialDetails);
      setErrors({});
      setNumberOfVehicles(1);
      setDistributionMode('equal');
    }
  }, [isOpen, totalQuantity]);

  // Update vehicle count and redistribute quantities
  const updateVehicleCount = (count) => {
    const newCount = Math.max(1, Math.min(10, count));
    setNumberOfVehicles(newCount);
    
    const newDetails = distributeQuantity(newCount, vehicleDetails);
    setVehicleDetails(newDetails);
  };

  // Toggle distribution mode
  const toggleDistributionMode = () => {
    const newMode = distributionMode === 'equal' ? 'manual' : 'equal';
    setDistributionMode(newMode);
    
    const newDetails = distributeQuantity(numberOfVehicles, vehicleDetails);
    setVehicleDetails(newDetails);
  };

  const updateVehicle = (index, field, value) => {
    const newDetails = [...vehicleDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setVehicleDetails(newDetails);
    
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
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

      if (vehicle.quantity <= 0) {
        vehicleErrors.quantity = 'Quantity must be greater than 0';
        isValid = false;
      }

      if (Object.keys(vehicleErrors).length > 0) {
        newErrors[index] = vehicleErrors;
      }
    });

    // Check if total quantity matches
    const totalAssigned = vehicleDetails.reduce((sum, vehicle) => sum + parseInt(vehicle.quantity || 0), 0);
    if (totalAssigned !== totalQuantity) {
      newErrors.total = `Total quantity assigned (${totalAssigned}) must equal item quantity (${totalQuantity})`;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (validateForm()) {
      const formattedData = vehicleDetails.map(vehicle => ({
        vehicle_plate: vehicle.vehicle_plate.trim(),
        status: vehicle.status,
        departure_time: new Date(vehicle.departure_time).toISOString(),
        destination: vehicle.destination.trim(),
        quantity: parseInt(vehicle.quantity)
      }));

      console.log('Vehicle Details to send:', formattedData);
      
      if (onUpdate) {
        onUpdate(formattedData);
      }
      
      onClose();
    }
  };

  const getTotalAssigned = () => {
    return vehicleDetails.reduce((total, vehicle) => total + parseInt(vehicle.quantity || 0), 0);
  };

  const getRemainingQuantity = () => {
    return totalQuantity - getTotalAssigned();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">

      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-sm sm:max-w-5xl lg:max-w-7xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all ">
            
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 sm:px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Truck size={24} />
                    </div>
                    Vehicle Distribution Setup
                  </h2>
                  <div className="mt-2 space-y-1">
                    <p className="text-orange-100 text-sm">
                      Order #{orderData?.order_number} - {itemData?.item_name}
                    </p>
                    
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-all duration-200 hover:scale-110"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto bg-gray-50">
              
              <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Calculator className="text-orange-600" size={20} />
                  Distribution Controls
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Number of Vehicles
                    </label>
                    <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-300">
                      <button
                        onClick={() => updateVehicleCount(numberOfVehicles - 1)}
                        disabled={numberOfVehicles <= 1}
                        className="flex items-center justify-center px-2 py-2 text-gray-600 hover:text-orange-600 hover:bg-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="flex-1 px-2 py-1 text-center">
                        <span className="text-sm font-bold text-gray-800">{numberOfVehicles}</span>
                   
                      </div>
                      <button
                        onClick={() => updateVehicleCount(numberOfVehicles + 1)}
                        disabled={numberOfVehicles >= 10}
                        className="flex items-center justify-center px-2 py-2 text-gray-600 hover:text-orange-600 hover:bg-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Distribution Mode
                    </label>
                    <button
                      onClick={toggleDistributionMode}
                      className={`w-full flex items-center justify-center gap-3 px-2 py-2 rounded-lg border-2 transition-all duration-200 ${
                        distributionMode === 'equal'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {distributionMode === 'equal' ? <Divide size={18} /> : <User size={18} />}
                      <span className="font-medium">
                        {distributionMode === 'equal' ? 'Equal Distribution' : 'Manual Distribution'}
                      </span>
                    </button>
                  </div>

                  {/* Quantity Summary */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity Summary
                    </label>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-300 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total Available:</span>
                        <span className="font-semibold text-gray-800">{totalQuantity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Assigned:</span>
                        <span className="font-semibold text-orange-900">{getTotalAssigned().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-300">
                        <span className="text-gray-600">Remaining:</span>
                        <span className={`font-bold ${getRemainingQuantity() === 0 ? 'text-green-900' : 'text-red-600'}`}>
                          {getRemainingQuantity().toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {distributionMode === 'equal' && numberOfVehicles > 1 && (
                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border">
                        <div className="flex justify-between">
                          <span>Per vehicle:</span>
                          <span className="font-medium">{Math.floor(totalQuantity / numberOfVehicles).toLocaleString()}</span>
                        </div>
                        {totalQuantity % numberOfVehicles > 0 && (
                          <div className="flex justify-between">
                            <span>Extra units:</span>
                            <span className="font-medium">+{totalQuantity % numberOfVehicles} to first {totalQuantity % numberOfVehicles} vehicle{totalQuantity % numberOfVehicles > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {errors.total && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">{errors.total}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {vehicleDetails.map((vehicle, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-2 py-2 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm px-2 py-2 text-orange-800 font-semibold flex items-center gap-2">
                          
                          Vehicle {index + 1}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-orange-100 text-orange-800  text-sm font-medium rounded-full">
                            {vehicle.quantity.toLocaleString()} units
                          </span>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                            vehicle.status === 'IN_TRANSIT' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-green-100 text-green-900'
                          }`}>
                            {vehicle.status === 'IN_TRANSIT' ? 'In Transit' : 'Delivered'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Form Content */}
                    <div className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vehicle Plate Number *
                          </label>
                          <input
                            type="text"
                            value={vehicle.vehicle_plate}
                            onChange={(e) => updateVehicle(index, 'vehicle_plate', e.target.value.toUpperCase())}
                            placeholder="e.g., MH-01-AB-1234"
                            className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ${
                              errors[index]?.vehicle_plate ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                          />
                          {errors[index]?.vehicle_plate && (
                            <p className="text-red-600 text-xs mt-1 font-medium">{errors[index].vehicle_plate}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                          </label>
                          <select
                            value={vehicle.status}
                            onChange={(e) => updateVehicle(index, 'status', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-400 transition-all duration-200"
                          >
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="DELIVERED">Delivered</option>
                          </select>
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                            {distributionMode === 'equal' && (
                              <span className="ml-1 text-xs text-orange-600">(Auto-calculated)</span>
                            )}
                          </label>
                          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-300 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateVehicle(index, 'quantity', Math.max(0, vehicle.quantity - 1))}
                              disabled={distributionMode === 'equal'}
                              className="px-3 py-2.5 text-gray-600 hover:text-orange-600 hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus size={16} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={vehicle.quantity}
                              onChange={(e) => updateVehicle(index, 'quantity', parseInt(e.target.value) || 0)}
                              disabled={distributionMode === 'equal'}
                              className={`flex-1 px-3 py-2.5 text-center border-0 bg-transparent focus:ring-0 focus:outline-none font-semibold ${
                                errors[index]?.quantity ? 'text-red-600' : 'text-gray-800'
                              } ${distributionMode === 'equal' ? 'cursor-not-allowed' : ''}`}
                            />
                            <button
                              type="button"
                              onClick={() => updateVehicle(index, 'quantity', vehicle.quantity + 1)}
                              disabled={distributionMode === 'equal'}
                              className="px-3 py-2.5 text-gray-600 hover:text-orange-600 hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          {errors[index]?.quantity && (
                            <p className="text-red-600 text-xs mt-1 font-medium">{errors[index].quantity}</p>
                          )}
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
                            className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ${
                              errors[index]?.departure_time ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                          />
                          {errors[index]?.departure_time && (
                            <p className="text-red-600 text-xs mt-1 font-medium">{errors[index].departure_time}</p>
                          )}
                        </div>

                        {/* Destination */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Destination Address *
                          </label>
                          <input
                            type="text"
                            value={vehicle.destination}
                            onChange={(e) => updateVehicle(index, 'destination', e.target.value)}
                            placeholder="Enter complete destination address"
                            className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ${
                              errors[index]?.destination ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                          />
                          {errors[index]?.destination && (
                            <p className="text-red-600 text-xs mt-1 font-medium">{errors[index].destination}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-200 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-center">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>* Required fields</span>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span>{vehicleDetails.length} vehicle{vehicleDetails.length > 1 ? 's' : ''} configured</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={getRemainingQuantity() !== 0}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    Save Vehicle Distribution
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