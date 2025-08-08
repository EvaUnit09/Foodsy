import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketEvent {
  type: string;
  payload?: Record<string, unknown>;
}

// Fallback polling interval for when WebSocket fails
const POLLING_INTERVAL = 3000;

// Get WebSocket URL based on environment
function getWebSocketURL(useNative: boolean): string {
  if (typeof window === 'undefined') return '';
  
  const host = window.location.host;
  
  // In production, connect through the backend directly
  if (host.includes('vercel.app') || host.includes('foodsy-frontend')) {
    return useNative ? 'wss://apifoodsy-backend.com/ws' : 'wss://apifoodsy-backend.com/ws-sockjs';
  }
  
  // Local development
  return useNative ? 'ws://localhost:8080/ws' : 'ws://localhost:8080/ws-sockjs';
}

// Check if we should use native WebSocket instead of SockJS for HTTPS
function shouldUseNativeWebSocket(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:';
}

export function useSessionWebSocket(sessionId: number) {
  const [event, setEvent] = useState<WebSocketEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [usePolling, setUsePolling] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Polling fallback for when WebSocket fails
  const startPolling = () => {
    console.log('Starting polling fallback for session:', sessionId);
    setUsePolling(true);
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.lastUpdate) {
            setEvent({
              type: 'session_update',
              payload: data
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    
    // Poll immediately, then every interval
    poll();
    pollingRef.current = setInterval(poll, POLLING_INTERVAL);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setUsePolling(false);
  };

  useEffect(() => {
    if (!sessionId) return;
    
    const useNative = shouldUseNativeWebSocket();
    const wsUrl = getWebSocketURL(useNative);
    console.log('Connecting to WebSocket:', wsUrl, 'Native:', useNative);
    
    const client = new Client({
      webSocketFactory: () => {
        if (useNative) {
          // Use native WebSocket for HTTPS connections
          return new WebSocket(wsUrl);
        } else {
          // Use SockJS for HTTP connections
          return new SockJS(wsUrl);
        }
      },
      reconnectDelay: 5000,
      debug: (str) => console.log('STOMP:', str),
    });

    client.onConnect = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      stopPolling(); // Stop polling if WebSocket connects
      client.subscribe(`/topic/session/${sessionId}`, (message) => {
        const event = JSON.parse(message.body);
        setEvent(event);
      });
    };

    client.onDisconnect = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      console.error('WebSocket STOMP error:', frame);
      setIsConnected(false);
      // Start polling fallback after WebSocket fails
      setTimeout(() => {
        if (!isConnected) {
          startPolling();
        }
      }, 2000);
    };

    client.onWebSocketError = (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      // Start polling fallback after WebSocket fails
      setTimeout(() => {
        if (!isConnected) {
          startPolling();
        }
      }, 2000);
    };

    // Try to connect
    try {
      client.activate();
      clientRef.current = client;
      
      // Fallback: if not connected after 10 seconds, start polling
      setTimeout(() => {
        if (!isConnected && !usePolling) {
          console.warn('WebSocket connection timeout, falling back to polling');
          startPolling();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Failed to activate WebSocket client:', error);
      startPolling();
    }

    return () => {
      stopPolling();
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [sessionId, isConnected, usePolling]);

  // Optionally, expose a send function for host actions
  const send = (destination: string, body: unknown) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination,
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });
    }
  };

  return { event, send };
}
