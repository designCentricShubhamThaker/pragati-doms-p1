import React, { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Plus, Package } from 'lucide-react';
import axios from 'axios';
import { getSocket } from '../../../context/SocketContext';

const AddGlassProductMaster = ({ isOpen, onClose, onProductAdded }) => {
  const [formData, setFormData] = useState({
    data_code: '',
    name: '',
    weight: '',
    capacity: '',
    shape: '',
    type: '',
    category: '',
    neck_diameter: '',
    mould_set: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
const socket= getSocket()
  const resetForm = () => {
    setFormData({
      data_code: '',
      name: '',
      weight: '',
      capacity: '',
      shape: '',
      type: '',
      category: '',
      neck_diameter: '',
      mould_set: ''
    });
    setErrors({});
    setSuccessMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'data_code', 'name', 'weight', 'capacity',
      'shape', 'type', 'category', 'neck_diameter'
    ];

    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });

    const numericFields = ['weight', 'capacity', 'neck_diameter'];
    numericFields.forEach(field => {
      if (formData[field] && isNaN(Number(formData[field]))) {
        newErrors[field] = 'Must be a valid number';
      }
    });

    if (formData.mould_set && isNaN(Number(formData.mould_set))) {
      newErrors.mould_set = 'Must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!validateForm()) return;

  //   setLoading(true);
  //   setErrors({});

  //   try {
  //     const submitData = {
  //       ...formData,
  //       weight: Number(formData.weight),
  //       capacity: Number(formData.capacity),
  //       neck_diameter: Number(formData.neck_diameter),
  //       mould_set: formData.mould_set ? Number(formData.mould_set) : 0
  //     };

  //     const { data } = await axios.post(
  //       'https://doms-k1fi.onrender.com/api/masters/glass',
  //       submitData
  //     );

  //     if (data.success) {
  //       setSuccessMessage('Product added successfully!');
  //       setTimeout(() => {
  //         onProductAdded && onProductAdded();
  //         handleClose();
  //       }, 1500);
  //     } else {
  //       setErrors({ submit: data.message || 'Failed to add product' });
  //     }
  //   } catch (error) {
  //     console.error('Error adding product:', error);
  //     setErrors({ submit: 'Network error. Please try again.' });
  //   } finally {
  //     setLoading(false);
  //   }
  // };


    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const submitData = { ...formData };

      // 🔥 Emit to socket instead of fetch
      socket.emit("addGlass", submitData);

      // ✅ Listen for confirmation (only this request)
      socket.once("GlassAddedSelf", (newGlass) => {
        setSuccessMessage("Product added successfully!");
        setTimeout(() => {
          onProductAdded?.(newGlass);  
          handleClose();
        }, 1500);
      });

      // ❌ Listen for error
      socket.once("glassAddError", (error) => {
        console.error("Add glaaa error via socket:", error);
        setErrors({ submit: error || "Failed to add product" });
      });
        setTimeout(() => {
         
          handleClose();
        }, 1500);

    } catch (error) {
      console.error("Error adding product:", error);
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };


  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4 z-999">
          <DialogPanel className="w-full max-w-sm sm:max-w-2xl lg:max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
            
            {/* Header */}
            <div className="bg-orange-600 text-white px-3 sm:px-4 py-3 flex justify-between items-start gap-4 rounded-t-lg">
              <div className="min-w-0 flex-1 flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <DialogTitle as="h2" className="text-lg sm:text-xl font-bold">
                    Add New Glass Product
                  </DialogTitle>
                  <p className="text-orange-100 text-xs sm:text-sm mt-1">
                    Fill in the details for the new glass product
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 sm:p-2 rounded-full transition-colors flex-shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Error/Success Messages */}
            {(errors.submit || successMessage) && (
              <div className="px-3 sm:px-6 py-2 sm:py-4 border-b">
                {errors.submit && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    {errors.submit}
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    {successMessage}
                  </div>
                )}
              </div>
            )}

            {/* Form Content */}
            <div className="max-h-[70vh] overflow-y-auto p-3 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                
                {/* Basic Information Section */}
                <div className="bg-orange-50 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.data_code}
                        onChange={(e) => handleInputChange('data_code', e.target.value)}
                        placeholder="e.g., GLS001"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.data_code ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {errors.data_code && <p className="text-red-500 text-xs mt-1">{errors.data_code}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g., Wine Bottle 750ml"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        placeholder="e.g., Premium, Standard"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shape <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.shape}
                        onChange={(e) => handleInputChange('shape', e.target.value)}
                        placeholder="e.g., Round, Square"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.shape ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {errors.shape && <p className="text-red-500 text-xs mt-1">{errors.shape}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        placeholder="e.g., Wine, Beer, Juice"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.type ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
                    </div>
                  </div>
                </div>

                {/* Technical Specifications Section */}
                <div className="bg-yellow-50 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">Technical Specifications</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (grams) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder="e.g., 500"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.weight ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        min="0"
                        step="0.01"
                      />
                      {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Capacity (ml) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => handleInputChange('capacity', e.target.value)}
                        placeholder="e.g., 750"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.capacity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        min="0"
                        step="0.01"
                      />
                      {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Neck Diameter (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.neck_diameter}
                        onChange={(e) => handleInputChange('neck_diameter', e.target.value)}
                        placeholder="e.g., 30"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.neck_diameter ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        min="0"
                        step="0.01"
                      />
                      {errors.neck_diameter && <p className="text-red-500 text-xs mt-1">{errors.neck_diameter}</p>}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mould Set <span className="text-xs text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="number"
                        value={formData.mould_set}
                        onChange={(e) => handleInputChange('mould_set', e.target.value)}
                        placeholder="e.g., 101"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.mould_set ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        min="0"
                      />
                      {errors.mould_set && <p className="text-red-500 text-xs mt-1">{errors.mould_set}</p>}
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="bg-orange-100 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">Product Preview</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Code:</span>
                      <div className="font-medium text-orange-900">{formData.data_code || 'Not set'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <div className="font-medium text-orange-900">{formData.category || 'Not set'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Capacity:</span>
                      <div className="font-medium text-orange-900">{formData.capacity ? `${formData.capacity} ml` : 'Not set'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Weight:</span>
                      <div className="font-medium text-orange-900">{formData.weight ? `${formData.weight} g` : 'Not set'}</div>
                    </div>
                  </div>
                  {formData.name && (
                    <div className="mt-3 p-3 bg-white rounded-lg border-2 border-dashed border-orange-200">
                      <div className="text-center">
                        <span className="text-xs text-gray-500">Product Name Preview:</span>
                        <div className="font-semibold text-orange-900 text-lg">{formData.name}</div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 ">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding Product...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Add Product
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

export default AddGlassProductMaster;