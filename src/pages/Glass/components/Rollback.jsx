import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Plus, Minus, Truck } from 'lucide-react';
import { getSocket } from '../../../context/SocketContext';

const Rollback = ({ isOpen, onClose, orderData, itemData, onUpdate }) => {

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
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              hellooo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rollback;