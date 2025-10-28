import React from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

const NotificationCenter = () => {
  const { notifications, clearNotification } = useWebSocket();
  
  if (notifications.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg shadow-lg border-l-4 ${
            notification.type === 'error' 
              ? 'bg-red-50 border-red-500 text-red-700'
              : notification.type === 'warning'
              ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
              : 'bg-blue-50 border-blue-500 text-blue-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{notification.message}</p>
              {notification.timestamp && (
                <p className="text-xs opacity-75 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={() => clearNotification(index)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;