import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Package, Clock, RefreshCw, Minus } from 'lucide-react';

const GlassNotificationPanel = forwardRef(({ teamName = "glass" }, ref) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef(null);

  // Create audio element for notifications
  useEffect(() => {
    const createBeep = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 650;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      } catch (error) {
        console.log('Audio not supported');
      }
    };

    audioRef.current = { play: createBeep };
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      if (audioRef.current && audioRef.current.play) {
        audioRef.current.play();
      }
    } catch (error) {
      console.log('Audio playback error:', error);
    }
  }, []);

  const createNotification = useCallback((eventType, data) => {
    console.log('🔔 Creating notification:', eventType, data);
    const id = Date.now() + Math.random();
    const timestamp = new Date();

    switch (eventType) {
      case 'glassProductionUpdated':
        return {
          id,
          type: 'production',
          priority: 'medium',
          icon: <Package className="w-4 h-4" />,
          title: 'Production Updated',
          message: `Order ${data.order_number} - Component status changed`,
          timestamp,
          read: false,
          actionRequired: true,
          data: { order_number: data.order_number, component_id: data.component_id }
        };

      case 'glassStockAdjusted':
        return {
          id,
          type: 'stock',
          priority: 'high',
          icon: <RefreshCw className="w-4 h-4" />,
          title: 'Stock Adjusted',
          message: `${data.dataCode} - New stock: ${data.newStock}`,
          timestamp,
          read: false,
          actionRequired: false,
          data: { dataCode: data.dataCode, newStock: data.newStock }
        };

      case 'glassNegativeAdjustmentUpdated':
        return {
          id,
          type: 'adjustment',
          priority: 'high',
          icon: <Minus className="w-4 h-4" />,
          title: 'Negative Adjustment',
          message: `Order ${data.order_number} - Stock reduced`,
          timestamp,
          read: false,
          actionRequired: true,
          data: { order_number: data.order_number, summary: data.adjustmentSummary }
        };

      case 'glassDispatchUpdated':
        return {
          id,
          type: 'dispatch',
          priority: 'medium',
          icon: <CheckCircle className="w-4 h-4" />,
          title: 'Component Dispatched',
          message: `Order ${data.order_number} - Ready for next stage`,
          timestamp,
          read: false,
          actionRequired: false,
          data: { order_number: data.order_number, component_id: data.component_id }
        };

      case 'glassRollbackUpdated':
        return {
          id,
          type: 'rollback',
          priority: 'high',
          icon: <AlertTriangle className="w-4 h-4" />,
          title: 'Status Rollback',
          message: `Order ${data.order_number} - Component status reverted`,
          timestamp,
          read: false,
          actionRequired: true,
          data: { order_number: data.order_number, component_id: data.component_id }
        };

      case 'glassAdded':
        return {
          id,
          type: 'master',
          priority: 'low',
          icon: <Package className="w-4 h-4" />,
          title: 'New Glass Added',
          message: `${data.data_code || 'New product'} added to master`,
          timestamp,
          read: false,
          actionRequired: false,
          data: { product: data }
        };

      case 'glassUpdated':
        return {
          id,
          type: 'master',
          priority: 'low',
          icon: <RefreshCw className="w-4 h-4" />,
          title: 'Glass Updated',
          message: `${data.data_code || 'Product'} details updated`,
          timestamp,
          read: false,
          actionRequired: false,
          data: { product: data }
        };

      case 'glassDeleted':
        return {
          id,
          type: 'master',
          priority: 'medium',
          icon: <X className="w-4 h-4" />,
          title: 'Glass Removed',
          message: 'Product removed from master',
          timestamp,
          read: false,
          actionRequired: false,
          data: { productId: data.productId }
        };

      default:
        console.warn('Unknown notification event type:', eventType);
        return null;
    }
  }, []);

  const addNotificationMethod = useCallback((eventType, data) => {
    console.log('🔔 AddNotification called:', eventType, data);
    
    const notification = createNotification(eventType, data);
    if (notification) {
      console.log('✅ Notification created:', notification);
      setNotifications(prev => {
        const newNotifications = [notification, ...prev.slice(0, 49)]; // Keep max 50
        console.log('📊 Updated notifications list:', newNotifications.length, 'total');
        return newNotifications;
      });
      setUnreadCount(prev => {
        const newCount = prev + 1;
        console.log('📈 Updated unread count:', newCount);
        return newCount;
      });
      playNotificationSound();
      console.log('🔔 Notification added successfully');
    } else {
      console.warn('⚠️ Failed to create notification for:', eventType, data);
    }
  }, [createNotification, playNotificationSound]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addNotification: addNotificationMethod,
    // Expose additional methods for debugging
    getNotificationCount: () => notifications.length,
    getUnreadCount: () => unreadCount
  }), [addNotificationMethod, notifications.length, unreadCount]);

  // Debug log when ref is attached
  useEffect(() => {
    console.log('🔗 GlassNotificationPanel ref attached, methods available:', {
      hasAddNotification: typeof addNotificationMethod === 'function',
      notificationCount: notifications.length,
      unreadCount: unreadCount
    });
  }, [addNotificationMethod, notifications.length, unreadCount]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  const getPriorityStyles = (priority, read) => {
    if (read) return 'bg-gray-50 border-gray-200 text-gray-600';
    
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800 shadow-sm';
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = (type, read) => {
    if (read) return 'text-gray-400';
    
    switch (type) {
      case 'production':
        return 'text-blue-600';
      case 'stock':
        return 'text-green-600';
      case 'adjustment':
        return 'text-red-600';
      case 'dispatch':
        return 'text-green-600';
      case 'rollback':
        return 'text-orange-600';
      case 'master':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const unreadNotifications = notifications.filter(notif => !notif.read);
  const readNotifications = notifications.filter(notif => notif.read).slice(0, 8);

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-3 py-2 shadow-md transition-all duration-200 flex items-center gap-2"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-800">Glass Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-blue-600">{unreadCount} unread</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {unreadNotifications.length === 0 && readNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">Glass updates will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {/* Unread Notifications */}
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${getPriorityStyles(notification.priority, false)}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`${getIconColor(notification.type, false)} mt-0.5 flex-shrink-0`}>
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <p className="text-sm opacity-90 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs opacity-70">
                            {formatTime(notification.timestamp)}
                          </p>
                          {notification.actionRequired && (
                            <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                              Action needed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Recent Read Notifications */}
                {readNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border opacity-60 ${getPriorityStyles(notification.priority, true)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`${getIconColor(notification.type, true)} mt-0.5 flex-shrink-0`}>
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <p className="text-sm mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs mt-1 opacity-70">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {(unreadNotifications.length > 0 || readNotifications.length > 0) && (
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <button
                onClick={clearAllNotifications}
                className="w-full text-sm text-gray-600 hover:text-gray-800 text-center py-1 hover:bg-gray-100 rounded transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

GlassNotificationPanel.displayName = 'GlassNotificationPanel';

export default GlassNotificationPanel;