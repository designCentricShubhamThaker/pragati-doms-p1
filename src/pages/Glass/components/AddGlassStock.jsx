import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Package, X, Check } from 'lucide-react';

const AddGlassStock = ({ initialSearchTerm = "", glassDetails, onClose }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [glassMasterData, setGlassMasterData] = useState([]);
  const [filteredGlasses, setFilteredGlasses] = useState([]);
  const [updateLoading, setUpdateLoading] = useState({});
  const [stockUpdates, setStockUpdates] = useState({});
  const [successMessages, setSuccessMessages] = useState({});

  useEffect(() => {
    const loadGlassMasterData = () => {
      try {
        const data = JSON.parse(localStorage.getItem("glassMaster")) || [];
        setGlassMasterData(data);
        console.log('Glass master data loaded:', data);
      } catch (error) {
        console.error('Error loading glass master data:', error);
        setGlassMasterData([]);
      }
    };

    loadGlassMasterData();
  }, []);

  useEffect(() => {
    if (glassMasterData.length === 0) {
      setFilteredGlasses([]);
      return;
    }

    let filtered = [];

    if (glassDetails) {
      filtered = glassMasterData.filter((g) => {
        const nameMatch = g.name?.trim().toLowerCase() === glassDetails.name?.trim().toLowerCase();
        const capacityMatch = Number(g.capacity) === Number(glassDetails.capacity);
        const weightMatch = Number(g.weight) === Number(glassDetails.weight);
        const neckDiameterMatch = Number(g.neck_diameter) === Number(glassDetails.neck_diameter);

        return nameMatch && capacityMatch && weightMatch && neckDiameterMatch;
      });
    } else if (searchTerm.trim()) {
      const searchLower = searchTerm.trim().toLowerCase();
      filtered = glassMasterData.filter((g) => {
        const glassName = g.name || '';
        const dataCode = g.data_code || '';

        return glassName.toLowerCase().includes(searchLower) ||
          dataCode.toLowerCase().includes(searchLower);
      });
    }

    setFilteredGlasses(filtered);
  }, [glassDetails, glassMasterData, searchTerm]);

  const handleStockChange = (dataCode, value) => {
    const cleanValue = value.replace(/[^+\-0-9]/g, '');
    setStockUpdates(prev => ({
      ...prev,
      [dataCode]: cleanValue
    }));
  };

  // Calculate new stock value for frontend display and localStorage update
  const calculateNewStock = (currentStock, updateValue) => {
    if (!updateValue || updateValue === '') {
      return currentStock || 0;
    }

    const cleanValue = updateValue.toString().trim();
    const currentStockNum = Number(currentStock) || 0;
    
    // Handle absolute values (no + or - prefix)
    if (!cleanValue.startsWith('+') && !cleanValue.startsWith('-')) {
      const parsed = parseInt(cleanValue, 10);
      return isNaN(parsed) ? currentStockNum : parsed;
    }
    
    // Handle adjustments (+ or - prefix)
    if (cleanValue.startsWith('+')) {
      const adjustment = parseInt(cleanValue.substring(1), 10);
      if (isNaN(adjustment)) return currentStockNum;
      return Math.max(0, currentStockNum + adjustment);
    }
    
    if (cleanValue.startsWith('-')) {
      const adjustment = parseInt(cleanValue.substring(1), 10);
      if (isNaN(adjustment)) return currentStockNum;
      return Math.max(0, currentStockNum - adjustment);
    }
    
    return currentStockNum;
  };


  const calculateAdjustment = (currentStock, updateValue) => {
    if (!updateValue || updateValue === '') {
      return 0;
    }

    const cleanValue = updateValue.toString().trim();
    const currentStockNum = Number(currentStock) || 0;
    
    if (!cleanValue.startsWith('+') && !cleanValue.startsWith('-')) {
      const parsed = parseInt(cleanValue, 10);
      if (isNaN(parsed)) return 0;
      return parsed - currentStockNum; 
    }
    
    if (cleanValue.startsWith('+')) {
      const adjustment = parseInt(cleanValue.substring(1), 10);
      return isNaN(adjustment) ? 0 : adjustment;
    }
    
    if (cleanValue.startsWith('-')) {
      const adjustment = parseInt(cleanValue.substring(1), 10);
      return isNaN(adjustment) ? 0 : -adjustment;
    }
    
    return 0;
  };

  const updateStock = async (glass) => {
    const updateValue = stockUpdates[glass.data_code];
    if (!updateValue || updateValue === '' || updateValue === '+' || updateValue === '-') {
      return;
    }

    const currentStock = glass.available_stock || 0;
    const adjustment = calculateAdjustment(currentStock, updateValue);
    const newStock = calculateNewStock(currentStock, updateValue);

    setUpdateLoading(prev => ({ ...prev, [glass.data_code]: true }));

    try {
      const response = await fetch(`https://doms-k1fi.onrender.com/api/masters/glass/stock/adjust/${glass.data_code}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adjustment: adjustment 
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update stock: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API response:', result);

      const updatedData = glassMasterData.map(g =>
        g.data_code === glass.data_code
          ? { ...g, available_stock: newStock }
          : g
      );
      
      setGlassMasterData(updatedData);
      localStorage.setItem("glassMaster", JSON.stringify(updatedData));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'glassMaster',
        oldValue: JSON.stringify(glassMasterData),
        newValue: JSON.stringify(updatedData),
        storageArea: localStorage
      }));
      
      window.dispatchEvent(new CustomEvent('glassMasterUpdated', {
        detail: { updatedData, dataCode: glass.data_code, newStock }
      }));
      
      console.log('AddGlassStock: Updated localStorage and dispatched events for', glass.data_code);

      setStockUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[glass.data_code];
        return newUpdates;
      });

      setSuccessMessages(prev => ({
        ...prev,
        [glass.data_code]: `Stock updated to ${newStock}`
      }));

      setTimeout(() => {
        setSuccessMessages(prev => {
          const newMessages = { ...prev };
          delete newMessages[glass.data_code];
          return newMessages;
        });
      }, 3000);

    } catch (error) {
      console.error('Error updating stock:', error);
      alert(`Error updating stock: ${error.message}`);
    } finally {
      setUpdateLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[glass.data_code];
        return newLoading;
      });
    }
  };

  // Preview calculation for display
  const getPreviewStock = (glass) => {
    const updateValue = stockUpdates[glass.data_code];
    if (!updateValue || updateValue === '' || updateValue === '+' || updateValue === '-') {
      return glass.available_stock || 0;
    }
    return calculateNewStock(glass.available_stock, updateValue);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Update Glass Stock</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {!glassDetails && (
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search glass by name or data code..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p><strong>Usage:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code>+50</code> - Add 50 to current stock</li>
                <li><code>-20</code> - Subtract 20 from current stock</li>
                <li><code>100</code> - Set stock to exactly 100</li>
              </ul>
            </div>
          </div>
        )}

        {glassDetails && (
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Glass Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium">{glassDetails.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Capacity:</span>
                <p className="font-medium">{glassDetails.capacity}</p>
              </div>
              <div>
                <span className="text-gray-500">Weight:</span>
                <p className="font-medium">{glassDetails.weight}</p>
              </div>
              <div>
                <span className="text-gray-500">Neck Diameter:</span>
                <p className="font-medium">{glassDetails.neck_diameter}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {!glassDetails && !searchTerm.trim() ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Enter a glass name or data code to search</p>
            </div>
          ) : filteredGlasses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No glasses found matching the criteria</p>
              {glassDetails && (
                <div className="mt-4 text-sm text-red-600">
                  <p>Looking for: {glassDetails.name}</p>
                  <p>Capacity: {glassDetails.capacity}, Weight: {glassDetails.weight}, Neck Diameter: {glassDetails.neck_diameter}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredGlasses.map((glass) => (
                <div
                  key={glass.data_code}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Glass Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {glass.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">Code: {glass.data_code}</p>
                        </div>
                        {successMessages[glass.data_code] && (
                          <div className="flex items-center gap-1 text-green-600 text-sm bg-green-50 px-2 py-1 rounded">
                            <Check className="w-4 h-4" />
                            {successMessages[glass.data_code]}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Capacity:</span>
                          <p className="font-medium">{glass.capacity || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Weight:</span>
                          <p className="font-medium">{glass.weight || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Neck Diameter:</span>
                          <p className="font-medium">{glass.neck_diameter || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Current Stock:</span>
                          <p className="font-medium text-blue-600">{glass.available_stock || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stock Update */}
                    <div className="flex items-center gap-3 lg:min-w-0 lg:w-80">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={stockUpdates[glass.data_code] || ''}
                          onChange={(e) => handleStockChange(glass.data_code, e.target.value)}
                          placeholder="e.g. +50, -20, or 100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                          disabled={updateLoading[glass.data_code]}
                        />
                        {stockUpdates[glass.data_code] && (
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            New stock: {getPreviewStock(glass)}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => updateStock(glass)}
                        disabled={
                          updateLoading[glass.data_code] ||
                          !stockUpdates[glass.data_code] ||
                          stockUpdates[glass.data_code] === '' ||
                          stockUpdates[glass.data_code] === '+' ||
                          stockUpdates[glass.data_code] === '-'
                        }
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                      >
                        {updateLoading[glass.data_code] ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Update
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredGlasses.length} glass(es) found
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

 export default AddGlassStock;



