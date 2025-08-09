import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketEvent {
  type: string;
  payload?: Record<string, unknown>;
}

// Fallback polling interval for when WebSocket fails
const POLLING_INTERVAL = 5000; // Reduced frequency
const MAX_CONSECUTIVE_ERRORS = 3;
const BACKOFF_MULTIPLIER = 2;

// Get WebSocket URL based on environment
function getWebSocketURL(useNative: boolean): string {
  if (typeof window === 'undefined') return '';
  
  const host = window.location.host;
  
  // In production, connect through the backend directly
  if (host.includes('vercel.app') || host.includes('foodsy-frontend')) {
    // Fix: Add trailing slash for WebSocket endpoints
    return useNative ? 'wss://apifoodsy-backend.com/ws/' : 'wss://apifoodsy-backend.com/ws-sockjs/';
  }
  
  // Local development - also add trailing slash for consistency
  return useNative ? 'ws://localhost:8080/ws/' : 'ws://localhost:8080/ws-sockjs/';
}

// Check if we should use native WebSocket instead of SockJS for HTTPS
function shouldUseNativeWebSocket(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:';
}

export function useSessionWebSocket(sessionId: number) {
  const [event, setEvent] = useState<WebSocketEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingActiveRef = useRef(false);
  const errorCountRef = useRef(0);
  const currentIntervalRef = useRef(POLLING_INTERVAL);

  // Polling fallback for when WebSocket fails
  const startPolling = () => {
    if (pollingActiveRef.current) return; // Prevent multiple polling instances
    
    console.log('Starting polling fallback for session:', sessionId);
    pollingActiveRef.current = true;
    errorCountRef.current = 0; // Reset error count
    currentIntervalRef.current = POLLING_INTERVAL; // Reset interval
    
    const poll = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const response = await fetch(`/api/sessions/${sessionId}/status`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          errorCountRef.current = 0; // Reset error count on success
          currentIntervalRef.current = POLLING_INTERVAL; // Reset interval
          
          if (data.lastUpdate) {
            setEvent({
              type: 'session_update',
              payload: data
            });
          }
        } else {
          // Handle HTTP errors (including 500s)
          errorCountRef.current++;
          console.warn(`Polling response not ok: ${response.status} (error count: ${errorCountRef.current})`);
          
          // Circuit breaker: stop polling after too many errors
          if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
            console.error('Too many consecutive polling errors, stopping polling');
            stopPolling();
            return;
          }
          
          // Exponential backoff
          currentIntervalRef.current = Math.min(
            currentIntervalRef.current * BACKOFF_MULTIPLIER, 
            30000 // Max 30 seconds
          );
        }
      } catch (error) {
        errorCountRef.current++;
        console.error(`Polling error: ${error} (error count: ${errorCountRef.current})`);
        
        // Circuit breaker: stop polling after too many errors
        if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
          console.error('Too many consecutive polling errors, stopping polling');
          stopPolling();
          return;
        }
        
        // Exponential backoff
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * BACKOFF_MULTIPLIER, 
          30000 // Max 30 seconds
        );
      }
    };
    
    // Poll immediately, then schedule next poll with current interval
    poll();
    
    const scheduleNextPoll = () => {
      pollingRef.current = setTimeout(() => {
        // If polling was stopped, do not continue
        if (!pollingActiveRef.current) return;
        poll();
        scheduleNextPoll();
      }, currentIntervalRef.current);
    };
    
    scheduleNextPoll();
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current); // Changed from clearInterval to clearTimeout
      pollingRef.current = null;
    }
    pollingActiveRef.current = false;
    errorCountRef.current = 0; // Reset error count when stopping
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
      
      try {
        client.subscribe(`/topic/session/${sessionId}`, (message) => {
          try {
            const event = JSON.parse(message.body);
            setEvent(event);
          } catch (parseError) {
            console.error('Error parsing WebSocket message:', parseError, message.body);
          }
        });
      } catch (subscribeError) {
        console.error('Error subscribing to WebSocket topic:', subscribeError);
        setIsConnected(false);
        startPolling();
      }
    };

    client.onDisconnect = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      console.error('WebSocket STOMP error:', frame);
      setIsConnected(false);
      // Immediately start polling fallback after WebSocket fails
      if (!pollingActiveRef.current) {
        console.log('STOMP error - immediately falling back to polling');
        startPolling();
      }
    };

    client.onWebSocketError = (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      // Immediately start polling fallback after WebSocket fails
      if (!pollingActiveRef.current) {
        console.log('WebSocket error - immediately falling back to polling');
        startPolling();
      }
    };

    // Try to connect
    try {
      client.activate();
      clientRef.current = client;
      
      // Fallback: if not connected after 3 seconds, start polling (reduced timeout)
      setTimeout(() => {
        if (!isConnected && !pollingActiveRef.current) {
          console.warn('WebSocket connection timeout, falling back to polling');
          startPolling();
        }
      }, 3000);
      
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
  }, [sessionId]);

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
