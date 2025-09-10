import React, { useState } from 'react';
import { getSocket } from '../../../context/SocketContext';

const DispatchTeam = ({ 
  isOpen, 
  onClose, 
  orderData, 
  itemData, 
  componentData, 
  onUpdate, 
  teamName, 
  teamConfig 
}) => {
  const [loading, setLoading] = useState(false);
  const socket = getSocket();

  const handleDispatch = async () => {
    if (!orderData || !itemData || !componentData) return;

    setLoading(true);
    try {
      // 1. First update local state immediately for instant UI feedback
      const updatedComponent = {
        ...componentData,
        decorations: {
          ...componentData.decorations,
          [teamName]: {
            ...componentData.decorations?.[teamName],
            status: 'DISPATCHED',
            dispatch_date: new Date().toISOString(),
            dispatched_by: `${teamName}_admin`
          }
        }
      };

      // Update local state immediately
      onUpdate(
        orderData.order_number,
        itemData.item_id,
        componentData.component_id,
        updatedComponent,
        'DISPATCHED'
      );

      // 2. Then emit socket event for server update and other teams notification
      const payload = {
        team: teamName,
        order_number: orderData.order_number,
        item_id: itemData.item_id,
        component_id: componentData.component_id,
        updateData: {
          dispatched_by: `${teamName}_admin`,
          dispatch_date: new Date().toISOString()
        }
      };

      socket.emit("dispatchDecorationComponent", payload);

      // 3. Listen for server response to handle any corrections
      const handleDispatchResponse = (response) => {
        if (response.success) {
          console.log(`✅ [${teamName}] Dispatch confirmed by server`);
          // Server response will trigger socket broadcast to other teams
        } else {
          console.error(`❌ [${teamName}] Dispatch failed on server:`, response.message);
          alert(`Dispatch failed: ${response.message}`);
          // Revert local changes if server failed
          onUpdate(
            orderData.order_number,
            itemData.item_id,
            componentData.component_id,
            componentData, // Revert to original
            componentData.decorations?.[teamName]?.status || 'PENDING'
          );
        }
        socket.off("decorationDispatchUpdatedSelf", handleDispatchResponse);
      };

      // Listen for server response
      socket.on("decorationDispatchUpdatedSelf", handleDispatchResponse);

      onClose();
    } catch (error) {
      console.error("Dispatch error:", error);
      alert("Failed to dispatch component");
      
      // Revert local changes on error
      onUpdate(
        orderData.order_number,
        itemData.item_id,
        componentData.component_id,
        componentData,
        componentData.decorations?.[teamName]?.status || 'PENDING'
      );
    } finally {
      setLoading(false);
    }
  };

  const getButtonColors = () => {
    switch (teamConfig.color) {
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'purple':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'yellow':
        return 'bg-yellow-600 hover:bg-yellow-700';
      default:
        return 'bg-orange-600 hover:bg-orange-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed  inset-0 bg-gray-500/75 transition-opacity flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Dispatch Component</h2>
        <p className="mb-4">
          Are you sure you want to dispatch <strong>{componentData?.name}</strong> from {teamConfig.name}?
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
            className={`px-4 py-2 ${getButtonColors()} text-white rounded disabled:opacity-50`}
          >
            {loading ? 'Dispatching...' : 'Dispatch'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchTeam;