import React, { useState } from 'react';
import { getSocket } from '../../../context/SocketContext.jsx';

const DispatchCoating = ({ isOpen, onClose, orderData, itemData, componentData, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const socket = getSocket();

  const handleDispatch = async () => {
    if (!orderData || !itemData || !componentData) return;

    setLoading(true);
    try {
      const payload = {
        team: 'coating',
        order_number: orderData.order_number,
        item_id: itemData.item_id,
        component_id: componentData.component_id,
        updateData: {
          dispatched_by: 'coating_admin', // Get from context/auth
          dispatch_date: new Date().toISOString()
        }
      };

      socket.emit("dispatchDecorationComponent", payload);
      onClose();
    } catch (error) {
      console.error("Dispatch error:", error);
      alert("Failed to dispatch component");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Dispatch Component</h2>
        <p className="mb-4">
          Are you sure you want to dispatch <strong>{componentData?.name}</strong>?
        </p>
        <p className="text-sm text-gray-600 mb-6">
          This will mark the component as dispatched and notify the next team in sequence.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDispatch}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Dispatching...' : 'Dispatch'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchCoating;