import React, { useState, useCallback, useRef } from 'react';
import { Bell, X, Clock, CheckCircle, AlertCircle, Truck, Package, Users, Zap, Filter, RotateCcw } from 'lucide-react';

const NotificationPanel = ({ teamName, teamConfig, onAddNotification }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef(null);

  // Notification types and their configurations
  const notificationTypes = {
    vehicle_received: { 
      icon: Truck, 
      color: 'blue', 
      priority: 'high',
      title: 'Vehicle Details Received'
    },
    vehicle_approved: { 
      icon: CheckCircle, 
      color: 'green', 
      priority: 'high',
      title: 'Vehicle Approved'
    },
    vehicle_delivered: { 
      icon: Package, 
      color: 'green', 
      priority: 'medium',
      title: 'Vehicle Delivered'
    },
    team_can_start: { 
      icon: Users, 
      color: 'purple', 
      priority: 'high',
      title: 'Team Can Start Work'
    },
    component_dispatched: { 
      icon: Zap, 
      color: 'orange', 
      priority: 'medium',
      title: 'Component Dispatched'
    },
    production_updated: { 
      icon: RotateCcw, 
      color: 'blue', 
      priority: 'low',
      title: 'Production Updated'
    },
    glass_dispatch: { 
      icon: Package, 
      color: 'cyan', 
      priority: 'high',
      title: 'From Glass Department'
    },
    status_change: { 
      icon: AlertCircle, 
      color: 'yellow', 
      priority: 'medium',
      title: 'Status Changed'
    },
    approval_received: { 
      icon: CheckCircle, 
      color: 'green', 
      priority: 'high',
      title: 'Approval Received'
    }
  };

  // Exposed method for parent to add notifications
  const addNotification = useCallback((type, data) => {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      data,
      timestamp: new Date(),
      read: false,
      teamName
    };

    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep max 50 notifications
    setUnreadCount(prev => prev + 1);

    // Auto-scroll to top when new notification arrives
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }, 100);

    // Play notification sound for high priority notifications
    if (notificationTypes[type]?.priority === 'high') {
      playNotificationSound();
    }
  }, [teamName]);

  // Expose the addNotification method to parent
  React.useImperativeHandle(onAddNotification, () => ({
    addNotification
  }));

  // Notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Audio notification not available');
    }
  };

  // Mark notifications as read
  const markAsRead = useCallback((notificationId = null) => {
    setNotifications(prev => 
      prev.map(n => 
        notificationId ? (n.id === notificationId ? { ...n, read: true } : n)
                      : { ...n, read: true }
      )
    );
    if (!notificationId) {
      setUnreadCount(0);
    } else {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'high') return notificationTypes[n.type]?.priority === 'high';
    return n.type === filter;
  });

  // Get color classes based on team theme
  const getColorClasses = () => {
    const colorMap = {
      orange: {
        primary: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        button: 'bg-orange-600 hover:bg-orange-700',
        badge: 'bg-orange-600'
      },
      blue: {
        primary: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        button: 'bg-blue-600 hover:bg-blue-700',
        badge: 'bg-blue-600'
      },
      purple: {
        primary: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        button: 'bg-purple-600 hover:bg-purple-700',
        badge: 'bg-purple-600'
      },
      yellow: {
        primary: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        button: 'bg-yellow-600 hover:bg-yellow-700',
        badge: 'bg-yellow-600'
      }
    };
    return colorMap[teamConfig?.color] || colorMap.orange;
  };

  const colorClasses = getColorClasses();

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get notification color
  const getNotificationColor = (type) => {
    const config = notificationTypes[type];
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      orange: 'text-orange-600 bg-orange-50 border-orange-200',
      purple: 'text-purple-600 bg-purple-50 border-purple-200',
      yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      cyan: 'text-cyan-600 bg-cyan-50 border-cyan-200'
    };
    return colorMap[config?.color] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) markAsRead(); // Mark all as read when opening
        }}
        className={`relative p-2 rounded-full transition-all duration-200 ${colorClasses.button} text-white hover:scale-105 shadow-lg`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[32rem] flex flex-col">
          {/* Header */}
          <div className={`px-4 py-3 border-b border-gray-200 rounded-t-xl ${colorClasses.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className={colorClasses.primary} />
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className={`${colorClasses.badge} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white rounded-full transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1 mt-3">
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'high', label: 'Priority' },
                { id: 'vehicle_received', label: 'Vehicles' },
                { id: 'team_can_start', label: 'Actions' }
              ].map(filterOption => (
                <button
                  key={filterOption.id}
                  onClick={() => setFilter(filterOption.id)}
                  className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                    filter === filterOption.id
                      ? `${colorClasses.primary} bg-white border ${colorClasses.border} font-medium`
                      : 'text-gray-600 hover:bg-white hover:text-gray-800'
                  }`}
                >
                  {filterOption.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {filteredNotifications.length} of {notifications.length} notifications
                </span>
                <button
                  onClick={clearAll}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto max-h-80"
          >
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filter'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => {
                  const config = notificationTypes[notification.type];
                  const IconComponent = config?.icon || AlertCircle;
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'border-l-4 ' + colorClasses.border : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                          <IconComponent size={16} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium text-gray-900 ${
                                !notification.read ? 'font-semibold' : ''
                              }`}>
                                {notification.data.message}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {notification.data.details}
                              </p>
                              
                              {/* Additional info for specific types */}
                              {notification.data.action_required && (
                                <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                  <AlertCircle size={10} />
                                  Action Required
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 ml-2">
                              <span className="text-xs text-gray-500">
                                {formatTime(notification.timestamp)}
                              </span>
                              {!notification.read && (
                                <div className={`w-2 h-2 ${colorClasses.badge} rounded-full`}></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;