import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketEvent {
  type: string;
  payload?: Record<string, unknown>;
}

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
  const clientRef = useRef<Client | null>(null);

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
      client.subscribe(`/topic/session/${sessionId}`, (message) => {
        const event = JSON.parse(message.body);
        setEvent(event);
      });
    };

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
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
