import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Truck, Package, Clock } from 'lucide-react';

const NotificationPanel = forwardRef(({ teamName, teamConfig }, ref) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef(null);

  // Create audio element for notifications
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3'); // You'll need to add this sound file
    audioRef.current.volume = 0.3; // Adjust volume as needed
    
    // Fallback: create a simple beep using Web Audio API if sound file doesn't exist
    const createBeep = () => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };

    // Test if audio file exists, fallback to beep
    audioRef.current.addEventListener('error', () => {
      audioRef.current = { play: createBeep };
    });

    return () => {
      if (audioRef.current && audioRef.current.pause) {
        audioRef.current.pause();
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      if (audioRef.current && audioRef.current.play) {
        audioRef.current.play().catch(e => {
          console.log('Could not play notification sound:', e);
        });
      }
    } catch (error) {
      console.log('Audio playback error:', error);
    }
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addNotification: (type, data) => {
      const notification = createNotification(type, data);
      if (notification) {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        playNotificationSound();
      }
    }
  }));

  const createNotification = useCallback((type, data) => {
    const id = Date.now() + Math.random();
    const timestamp = new Date();

    switch (type) {
      case 'team_can_start':
        return {
          id,
          type: 'start_work',
          priority: 'high',
          icon: <Clock className="w-5 h-5" />,
          title: 'Ready to Start Work!',
          message: `Order ${data.order_number} - ${data.previous_team} completed`,
          timestamp,
          read: false,
          actionRequired: true
        };

      case 'glass_dispatch':
        return {
          id,
          type: 'incoming',
          priority: 'high',
          icon: <Package className="w-5 h-5" />,
          title: 'New Work from Glass',
          message: `Order ${data.order_number} - ${data.vehicle_count} vehicles`,
          timestamp,
          read: false,
          actionRequired: true
        };

      case 'component_dispatched':
        // Only show if it's from the previous team in sequence
        if (data.from_team && data.sequence) {
          const sequence = data.sequence.split(' → ');
          const currentIndex = sequence.indexOf(teamName);
          const previousTeam = currentIndex > 0 ? sequence[currentIndex - 1] : null;
          
          if (data.from_team === previousTeam) {
            return {
              id,
              type: 'ready',
              priority: 'medium',
              icon: <CheckCircle className="w-5 h-5" />,
              title: 'Work Available',
              message: `Order ${data.order_number} from ${data.from_team}`,
              timestamp,
              read: false,
              actionRequired: true
            };
          }
        }
        return null;

      case 'vehicle_received':
        return {
          id,
          type: 'vehicles',
          priority: 'high',
          icon: <Truck className="w-5 h-5" />,
          title: 'Vehicles Received',
          message: `Order ${data.order_number} - ${data.vehicle_count} vehicles`,
          timestamp,
          read: false,
          actionRequired: true
        };

      case 'approval_required':
        return {
          id,
          type: 'approval',
          priority: 'high',
          icon: <AlertTriangle className="w-5 h-5" />,
          title: 'Approval Needed',
          message: `Order ${data.order_number} - ${data.vehicle_count} vehicles`,
          timestamp,
          read: false,
          actionRequired: true
        };

      case 'vehicle_delivered':
        return {
          id,
          type: 'completed',
          priority: 'low',
          icon: <CheckCircle className="w-5 h-5" />,
          title: 'Transport Delivered',
          message: `Order ${data.order_number} by ${data.marked_by}`,
          timestamp,
          read: false,
          actionRequired: false
        };

      case 'production_updated':
        // Low priority, don't show unless it's important
        return null;

      default:
        return null;
    }
  }, [teamName, playNotificationSound]);

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

  const getPriorityColor = (priority, read) => {
    if (read) return 'bg-gray-50 border-gray-200';
    
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200 shadow-md';
      case 'medium':
        return 'bg-orange-50 border-orange-200';
      case 'low':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getIconColor = (type, read) => {
    if (read) return 'text-gray-400';
    
    switch (type) {
      case 'start_work':
        return 'text-green-600';
      case 'incoming':
        return 'text-blue-600';
      case 'ready':
        return 'text-orange-600';
      case 'vehicles':
        return 'text-purple-600';
      case 'approval':
        return 'text-red-600';
      case 'completed':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Filter to show only unread notifications, or show read ones with lower opacity
  const displayNotifications = notifications.filter(notif => !notif.read).slice(0, 20);
  const readNotifications = notifications.filter(notif => notif.read).slice(0, 10);

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-orange-600 transition-colors duration-200"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-sm text-orange-600">({unreadCount} new)</span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-orange-600 hover:text-orange-700"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {displayNotifications.length === 0 && readNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {/* Unread Notifications */}
                {displayNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${getPriorityColor(notification.priority, false)}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`${getIconColor(notification.type, false)} mt-0.5`}>
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Recent Read Notifications (last 5, with lower opacity) */}
                {readNotifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border opacity-50 ${getPriorityColor(notification.priority, true)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`${getIconColor(notification.type, true)} mt-0.5`}>
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-600 text-sm">
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
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
          {(displayNotifications.length > 0 || readNotifications.length > 0) && (
            <div className="border-t border-gray-200 p-3">
              <button
                onClick={clearAllNotifications}
                className="w-full text-sm text-gray-500 hover:text-gray-700 text-center"
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

NotificationPanel.displayName = 'NotificationPanel';

export default NotificationPanel;