import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Search, Plus, Minus, Package, X, Check, TrendingUp, Calculator } from 'lucide-react';
import { getSocket } from '../../../context/SocketContext';

const AddGlassStock = ({ isOpen, onClose, initialSearchTerm = "", glassDetails, onStockUpdate }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [glassMasterData, setGlassMasterData] = useState([]);
  const [filteredGlasses, setFilteredGlasses] = useState([]);
  const [updateLoading, setUpdateLoading] = useState({});
  const [stockUpdates, setStockUpdates] = useState({});
  const [successMessages, setSuccessMessages] = useState({});
  const [error, setError] = useState(null);
  const socket = getSocket();

  useEffect(() => {
    const loadGlassMasterData = () => {
      try {
        const data = JSON.parse(localStorage.getItem("glassMaster")) || [];
        setGlassMasterData(data);
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

  const SearchSection = () => (
    !glassDetails && (
      <div className="p-6 bg-gradient-to-br from-orange-50 to-white border-b border-orange-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by glass name or data code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 placeholder-orange-400"
          />
        </div>
      </div>
    )
  );


  const handleStockChange = (dataCode, value) => {
    const cleanValue = value.replace(/[^-0-9]/g, '');
    setStockUpdates(prev => ({
      ...prev,
      [dataCode]: cleanValue
    }));

    if (error) setError(null);
  };

  const calculateNewStock = (currentStock, updateValue) => {
    if (!updateValue || updateValue === "") return currentStock || 0;
    const currentStockNum = Number(currentStock) || 0;
    const adjustment = parseInt(updateValue, 10);

    if (isNaN(adjustment)) return currentStockNum;
    if (adjustment < 0) {
      return Math.max(0, currentStockNum + adjustment);
    }
    return currentStockNum + adjustment;
  };

  const getAdjustmentDisplay = (glass) => {
    const updateValue = stockUpdates[glass.data_code];
    if (!updateValue || updateValue === "-") return null;

    const adjustment = parseInt(updateValue, 10);
    if (isNaN(adjustment)) return null;

    return {
      adjustment,
      isAbsolute: false,
      color: adjustment > 0 ? 'text-green-600' : adjustment < 0 ? 'text-red-600' : 'text-gray-600'
    };
  };

  // const updateStock = async (glass) => {
  //   const updateValue = stockUpdates[glass.data_code];
  //   if (!updateValue || updateValue === '' || updateValue === '-') {
  //     return;
  //   }

  //   const adjustment = parseInt(updateValue, 10);
  //   if (isNaN(adjustment)) return;

  //   const currentStock = glass.available_stock || 0;
  //   const newStock = calculateNewStock(currentStock, updateValue);

  //   setUpdateLoading(prev => ({ ...prev, [glass.data_code]: true }));

  //   try {
  //     const response = await fetch(`http://13.204.44.250/api/masters/glass/stock/adjust/${glass.data_code}`, {
  //       method: 'PATCH',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         adjustment: adjustment
  //       })
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Failed to update stock: ${response.statusText}`);
  //     }

  //     const result = await response.json();
  //     console.log('API response:', result);

  //     const updatedData = glassMasterData.map(g =>
  //       g.data_code === glass.data_code
  //         ? { ...g, available_stock: newStock }
  //         : g
  //     );

  //     setGlassMasterData(updatedData);

  //     localStorage.setItem("glassMaster", JSON.stringify(updatedData));

  //     if (onStockUpdate) {
  //       console.log('AddGlassStock: Calling onStockUpdate with updated data');
  //       onStockUpdate(updatedData);
  //     }

  //     setStockUpdates(prev => {
  //       const newUpdates = { ...prev };
  //       delete newUpdates[glass.data_code];
  //       return newUpdates;
  //     });

  //     setSuccessMessages(prev => ({
  //       ...prev,
  //       [glass.data_code]: `Stock updated to ${newStock}`
  //     }));

  //     setTimeout(() => {
  //       setSuccessMessages(prev => {
  //         const newMessages = { ...prev };
  //         delete newMessages[glass.data_code];
  //         return newMessages;
  //       });
  //     }, 3000);

  //   } catch (error) {
  //     console.error('Error updating stock:', error);
  //     alert(`Error updating stock: ${error.message}`);
  //   } finally {
  //     setUpdateLoading(prev => {
  //       const newLoading = { ...prev };
  //       delete newLoading[glass.data_code];
  //       return newLoading;
  //     });
  //   }
  // };
  const calculateAdjustment = (currentStock, updateValue) => {
    if (!updateValue || updateValue === "") return 0;

    const cleanValue = updateValue.toString().trim();
    const parsed = parseInt(cleanValue, 10);

    if (isNaN(parsed)) return 0;

    return parsed;
  };


  const updateStock = (glass) => {
    const updateValue = stockUpdates[glass.data_code];
    if (!updateValue || updateValue === "+" || updateValue === "-") {
      setError("Please enter a valid stock update value");
      return;
    }
    const currentStock = glass.available_stock || 0;
    const adjustment = calculateAdjustment(currentStock, updateValue);
    const newStock = calculateNewStock(currentStock, updateValue);

    if (newStock < 0) {
      setError("Stock cannot be negative");
      return;
    }

    setUpdateLoading((prev) => ({ ...prev, [glass.data_code]: true }));
    setError("");

    try {
      socket.emit("updateGlassStock", { data_code: glass.data_code, adjustment });
      socket.off("glassStockUpdatedSelf");
      socket.off("errorMessage");

      socket.on("glassStockUpdatedSelf", ({ data_code, newStock }) => {
        console.log("Glass stock updated:", data_code, newStock);
        setUpdateLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[data_code];
          return newLoading;
        });

        const updatedData = glassMasterData.map((g) =>
          g.data_code === data_code ? { ...g, available_stock: newStock } : g
        );

        setGlassMasterData(updatedData);
        localStorage.setItem("glassMaster", JSON.stringify(updatedData));

        if (onStockUpdate) {
          onStockUpdate(updatedData);
        }

        window.dispatchEvent(
          new CustomEvent("glassMasterUpdated", {
            detail: { updatedData, dataCode: data_code, newStock },
          })
        );

        setStockUpdates((prev) => {
          const newUpdates = { ...prev };
          delete newUpdates[data_code];
          return newUpdates;
        });

        setSuccessMessages((prev) => ({
          ...prev,
          [data_code]: `Stock updated to ${newStock}`,
        }));

        setTimeout(() => {
          setSuccessMessages((prev) => {
            const newMessages = { ...prev };
            delete newMessages[data_code];
            return newMessages;
          });

          if (glassDetails && filteredGlasses.length === 1) {
            onClose?.();
          }
        }, 2000);

        socket.off("glassStockUpdatedSelf");
        socket.off("errorMessage");
      });

      socket.on("errorMessage", ({ message }) => {
        setError(`Error updating stock: ${message}`);
        setUpdateLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[glass.data_code];
          return newLoading;
        });

        socket.off("glassStockUpdatedSelf");
        socket.off("errorMessage");
      });
    } catch (error) {
      console.error("Error updating stock:", error);
      setError(`Error updating stock: ${error.message}`);
      setUpdateLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[glass.data_code];
        return newLoading;
      });
    }
  };

  const ProgressBar = ({ current, preview, total = 1000 }) => {
    const currentProgress = Math.min((current / total) * 100, 100);
    const previewProgress = Math.min((preview / total) * 100, 100);
    const addedProgress = Math.max(0, previewProgress - currentProgress);

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
          {previewProgress.toFixed(0)}%
        </span>
      </div>
    );
  };

  const getPreviewStock = (glass) => {
    const updateValue = stockUpdates[glass.data_code];
    if (!updateValue || updateValue === '' || updateValue === '+' || updateValue === '-') {
      return glass.available_stock || 0;
    }
    return calculateNewStock(glass.available_stock, updateValue);
  };


  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <DialogPanel className="w-full max-w-sm sm:max-w-4xl lg:max-w-7xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">

            {/* Header */}
            <div className="bg-orange-600 text-white px-3 sm:px-4 py-3 flex justify-between items-start gap-4 rounded-t-lg">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <DialogTitle as="h2" className="text-lg sm:text-xl font-bold">
                      Stock Management
                    </DialogTitle>
                    {glassDetails && (
                      <p className="text-orange-100 text-xs sm:text-sm mt-1 truncate">
                        {glassDetails.name} • {glassDetails.capacity}ml
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 sm:p-2 rounded-full transition-colors flex-shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Search Section */}
            <SearchSection />

            {/* Glass Details Section */}
            {glassDetails && (
              <div className="p-3 sm:p-6 bg-gradient-to-br from-orange-50 to-white border-b border-orange-100">
                <div className="bg-white rounded-xl p-3 sm:p-5 border border-orange-200 shadow-sm">
                  <h3 className="text-sm sm:text-lg font-bold text-orange-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                    Product Specifications
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { label: 'Name', value: glassDetails.name },
                      { label: 'Capacity', value: `${glassDetails.capacity}ml` },
                      { label: 'Weight', value: `${glassDetails.weight}g` },
                      { label: 'Neck Diameter', value: `${glassDetails.neck_diameter}mm` }
                    ].map(({ label, value }) => (
                      <div key={label} className="p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">{label}</span>
                        <p className="font-semibold text-orange-900 mt-1 text-sm sm:text-base">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {(error || Object.keys(successMessages).length > 0) && (
              <div className="px-3 sm:px-6 py-2 sm:py-4 border-b">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    {error}
                  </div>
                )}
                {Object.entries(successMessages).map(([dataCode, message]) => (
                  <div key={dataCode} className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm mb-2 last:mb-0">
                    {message}
                  </div>
                ))}
              </div>
            )}

            {/* Desktop Table Header */}
            <div className="hidden lg:block bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 px-4 py-3 mt-4 mx-4 rounded-md">
              <div className="grid gap-4 text-white font-semibold text-sm items-center"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 1.5fr'
                }}>
                <div className="text-left">Glass Details</div>
                <div className="text-center">Capacity</div>
                <div className="text-center">Weight</div>
                <div className="text-center">Neck Ø</div>
                <div className="text-center">Current Stock</div>
                <div className="text-center">Stock Progress</div>
                <div className="text-center">Update Stock</div>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] sm:max-h-96 overflow-y-auto p-3 sm:p-6">
              {!glassDetails && !searchTerm.trim() ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-6 bg-orange-100 rounded-full mb-6">
                    <Package className="w-16 h-16 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Start Your Search</h3>
                  <p className="text-gray-500">Enter a glass name or data code to begin managing stock</p>
                </div>
              ) : filteredGlasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-6 bg-gray-100 rounded-full mb-6">
                    <Package className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Results Found</h3>
                  <p className="text-gray-500 mb-4">No glasses match your search criteria</p>
                  {glassDetails && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-left">
                      <p className="text-sm text-red-700 font-medium">Searching for:</p>
                      <p className="text-red-600">
                        {glassDetails.name} • {glassDetails.capacity}ml • {glassDetails.weight}g • {glassDetails.neck_diameter}mm
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGlasses.map((glass, index) => {
                    const adjustmentInfo = getAdjustmentDisplay(glass);
                    const previewStock = getPreviewStock(glass);
                    const currentStock = glass.available_stock || 0;
                    const colorClasses = ['bg-orange-50', 'bg-orange-100', 'bg-yellow-50', 'bg-yellow-100'];
                    const bgColor = colorClasses[index % colorClasses.length];

                    return (
                      <div key={glass.data_code} className="mb-4 last:mb-0">
                        {/* Desktop Layout */}
                        <div className={`hidden lg:block border-b border-orange-100 px-6 py-4 ${bgColor} -mx-6`}>
                          <div className="grid gap-4 text-sm items-center"
                            style={{
                              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 1.5fr'
                            }}>

                            {/* Glass Details */}
                            <div className="text-left">
                              <div className="font-semibold text-orange-900 text-lg">{glass.name}</div>
                              <div className="text-xs text-orange-600 font-medium">#{glass.data_code}</div>
                              {successMessages[glass.data_code] && (
                                <div className="flex items-center gap-2 mt-2 text-emerald-600 text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                  <Check className="w-4 h-4" />
                                  Updated
                                </div>
                              )}
                            </div>

                            {/* Specifications */}
                            <div className="text-center text-orange-900">
                              {glass.capacity || 'N/A'}ml
                            </div>
                            <div className="text-center text-orange-900">
                              {glass.weight || 'N/A'}g
                            </div>
                            <div className="text-center text-orange-900">
                              {glass.neck_diameter || 'N/A'}mm
                            </div>

                            {/* Current Stock */}
                            <div className="text-center">
                              <span className="font-bold text-orange-900 text-lg">{currentStock}</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="px-2">
                              <ProgressBar
                                current={currentStock}
                                preview={previewStock}
                                total={1000}
                              />
                              <div className="text-xs text-gray-500 mt-1 text-center">
                                Current: {currentStock} | Preview: {previewStock}
                              </div>
                              {adjustmentInfo && (
                                <div className="text-xs mt-1 text-center">
                                  <span className={`font-medium ${adjustmentInfo.color}`}>
                                    {adjustmentInfo.isAbsolute ? 'Set to' : 'Adjust'}:
                                    {adjustmentInfo.isAbsolute ? ` ${Math.abs(adjustmentInfo.adjustment)}` :
                                      ` ${adjustmentInfo.adjustment > 0 ? '+' : ''}${adjustmentInfo.adjustment}`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Update Controls */}
                            <div className="px-2">
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={stockUpdates[glass.data_code] || ''}
                                  onChange={(e) => handleStockChange(glass.data_code, e.target.value)}
                                  placeholder="±50 or 100"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center font-mono"
                                  disabled={updateLoading[glass.data_code]}
                                />
                                <button
                                  onClick={() => updateStock(glass)}
                                  disabled={
                                    updateLoading[glass.data_code] ||
                                    !stockUpdates[glass.data_code] ||
                                    stockUpdates[glass.data_code] === '' ||
                                    stockUpdates[glass.data_code] === '-' ||
                                    isNaN(parseInt(stockUpdates[glass.data_code], 10))
                                  }
                                  className="w-full inline-flex items-center justify-center px-3 py-1 text-sm font-medium text-white bg-orange-600 border border-transparent rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {updateLoading[glass.data_code] ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-1" />
                                      Update
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className={`lg:hidden ${bgColor} rounded-lg p-3 sm:p-4`}>
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="border-b border-gray-200 pb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-orange-900 text-sm sm:text-base">{glass.name}</h4>
                                  <p className="text-xs text-orange-600 font-medium mt-1">#{glass.data_code}</p>
                                </div>
                                {successMessages[glass.data_code] && (
                                  <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                    <Check className="w-4 h-4" />
                                    Updated
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Specifications */}
                            <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xs text-gray-500 font-medium uppercase">Capacity</div>
                                <div className="text-sm font-semibold text-gray-900 mt-1">{glass.capacity || 'N/A'}ml</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xs text-gray-500 font-medium uppercase">Weight</div>
                                <div className="text-sm font-semibold text-gray-900 mt-1">{glass.weight || 'N/A'}g</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xs text-gray-500 font-medium uppercase">Neck Ø</div>
                                <div className="text-sm font-semibold text-gray-900 mt-1">{glass.neck_diameter || 'N/A'}mm</div>
                              </div>
                            </div>

                            {/* Stock Information */}
                            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-orange-700">Current Stock</span>
                                <span className="text-xl font-bold text-orange-900">{currentStock}</span>
                              </div>

                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs text-gray-600">Stock Progress:</span>
                                  <span className="text-xs text-gray-500">
                                    Current: {currentStock} | Preview: {previewStock}
                                  </span>
                                </div>
                                <ProgressBar
                                  current={currentStock}
                                  preview={previewStock}
                                  total={1000}
                                />
                              </div>

                              {adjustmentInfo && (
                                <div className="mt-3 pt-3 border-t border-orange-300">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">
                                      {adjustmentInfo.isAbsolute ? 'Setting to' : 'Adjustment'}
                                    </span>
                                    <span className={`text-sm font-bold ${adjustmentInfo.color}`}>
                                      {adjustmentInfo.isAbsolute ? Math.abs(adjustmentInfo.adjustment) :
                                        `${adjustmentInfo.adjustment > 0 ? '+' : ''}${adjustmentInfo.adjustment}`}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Update Controls */}
                            <div className="space-y-3 pt-2 border-t border-gray-200">
                              <div>
                                <label className="block text-xs text-gray-700 mb-1">Stock Update:</label>
                                <input
                                  type="text"
                                  value={stockUpdates[glass.data_code] || ''}
                                  onChange={(e) => handleStockChange(glass.data_code, e.target.value)}
                                  placeholder="Enter: +50, -20, or 100"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center font-mono"
                                  disabled={updateLoading[glass.data_code]}
                                />
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
                                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg hover:from-orange-700 hover:to-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                              >
                                {updateLoading[glass.data_code] ? (
                                  <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-5 h-5" />
                                    Update Stock
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center border-t space-y-2 sm:space-y-0">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Package className="w-4 h-4" />
                <span className="font-medium">{filteredGlasses.length} item{filteredGlasses.length !== 1 ? 's' : ''} found</span>
              </div>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default AddGlassStock;