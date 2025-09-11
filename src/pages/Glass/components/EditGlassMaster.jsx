import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Save } from 'lucide-react';
import { getSocket } from '../../../context/SocketContext';

const EditGlassMaster = ({ isOpen, onClose, product, onProductUpdated }) => {
  const [formData, setFormData] = useState({
    data_code: '',
    name: '',
    category: '',
    shape: '',
    type: '',
    capacity: '',
    neck_diameter: '',
    weight: '',
    available_stock: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const socket = getSocket();


  useEffect(() => {
    if (product) {
      setFormData({
        data_code: product.data_code || '',
        name: product.name || '',
        category: product.category || '',
        shape: product.shape || '',
        type: product.type || '',
        capacity: product.capacity || '',
        neck_diameter: product.neck_diameter || '',
        weight: product.weight || '',
        available_stock: product.available_stock || ''
      });
    }
    setError('');
    setSuccessMessage('');
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updateData = { ...formData };

      socket.emit("updateGlass", { updateData });

      socket.once("glassUpdatedSelf", (updatedGlass) => {
        setSuccessMessage("Product updated successfully!");
        setTimeout(() => {
          onProductUpdated?.(updatedGlass);
          onClose();
        }, 1500);
      });

      socket.once("glassUpdateError", (error) => {
        console.error("Update glass error via socket:", error);
        setError(error || "Failed to update product");
      });

    } catch (err) {
      setError("Error connecting to server");
      console.error("Update error:", err);
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <DialogPanel className="w-full max-w-sm sm:max-w-2xl lg:max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">

            {/* Header */}
            <div className="bg-orange-600 text-white px-3 sm:px-4 py-3 flex justify-between items-start gap-4 rounded-t-lg">
              <div className="min-w-0 flex-1">
                <DialogTitle as="h2" className="text-lg sm:text-xl font-bold">
                  Edit Glass Product
                </DialogTitle>
                <p className="text-orange-100 text-xs sm:text-sm mt-1 truncate">
                  Update product details - {product?.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 sm:p-2 rounded-full transition-colors flex-shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Error/Success Messages */}
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

            {/* Form Content */}
            <div className="max-h-[60vh] overflow-y-auto p-3 sm:p-6">
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
                        name="data_code"
                        value={formData.data_code}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shape <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="shape"
                        value={formData.shape}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Specifications Section */}
                <div className="bg-yellow-50 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">Technical Specifications</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Capacity (ml) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Neck Diameter (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="neck_diameter"
                        value={formData.neck_diameter}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (g) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="weight"
                        value={formData.weight}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Stock <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="available_stock"
                        value={formData.available_stock}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="bg-orange-100 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">Product Summary</h3>
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
                      <span className="text-gray-600">Stock:</span>
                      <div className="font-medium text-orange-900">{formData.available_stock || '0'} units</div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 ">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Update Product
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

export default EditGlassMaster;