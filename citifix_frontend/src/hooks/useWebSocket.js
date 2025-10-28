import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

export const useWebSocket = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [realtimeData, setRealtimeData] = useState({
    reports: [],
    stats: null
  });
  const ws = useRef(null);
  
  useEffect(() => {
    if (!user) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/dashboard/`;
    
    try {
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected successfully');
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);
  
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'new_report':
        setRealtimeData(prev => ({
          ...prev,
          reports: [data.data, ...prev.reports]
        }));
        setNotifications(prev => [...prev, {
          type: 'info',
          message: `New report: ${data.data.title}`,
          timestamp: new Date().toISOString()
        }]);
        break;
        
      case 'report_update':
        setRealtimeData(prev => ({
          ...prev,
          reports: prev.reports.map(report =>
            report.id === data.data.id ? data.data : report
          )
        }));
        break;
        
      case 'stats_update':
        setRealtimeData(prev => ({
          ...prev,
          stats: data.data
        }));
        break;
        
      case 'notification':
        setNotifications(prev => [...prev, data.data]);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };
  
  const clearNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };
  
  return {
    notifications,
    realtimeData,
    clearNotification,
    isConnected: ws.current?.readyState === WebSocket.OPEN
  };
};