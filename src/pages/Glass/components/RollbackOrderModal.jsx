import React, { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';

const RollbackOrderModal = ({ isOpen, onClose, onConfirm }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!confirmed) {
      setError('Please confirm before rolling back the order');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(); 
      setConfirmed(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to rollback order');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <DialogPanel className="w-full max-w-sm sm:max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
            
            {/* Header */}
            <div className="bg-orange-600 text-white px-3 sm:px-4 py-3 flex justify-between items-start gap-4 rounded-t-lg">
              <div className="min-w-0 flex-1">
                <DialogTitle as="h2" className="text-lg sm:text-xl font-bold flex items-center">
                  <AlertTriangle size={20} className="mr-2" />
                  Rollback Order
                </DialogTitle>
                <p className="text-orange-100 text-xs sm:text-sm mt-1">
                  Confirm before rolling back — this will reset order to <strong>Pending</strong> and return items to stock.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 sm:p-2 rounded-full transition-colors flex-shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 sm:px-6 py-2 sm:py-4 border-b">
                <div className="bg-orange-50 border border-orange-400 text-orange-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                  {error}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-4 sm:p-6">
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-700">
                      <strong>Critical Action:</strong> Rolling back will <strong>reset the order to Pending</strong> 
                      and items will be returned to stock. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Single Confirmation Checkbox */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="confirmRollback"
                  checked={confirmed}
                  onChange={(e) => { setConfirmed(e.target.checked); if (error) setError(''); }}
                  className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="confirmRollback" className="ml-3 text-sm font-medium text-gray-700">
                  I understand the impact of this action and confirm rollback (reset to Pending & return to stock).
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 border-t">
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !confirmed}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rolling back...
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} className="mr-2" />
                    Confirm Rollback
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

export default RollbackOrderModal;