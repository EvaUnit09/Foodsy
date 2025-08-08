import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketEvent {
  type: string;
  payload?: Record<string, unknown>;
}

// Get WebSocket URL based on environment
function getWebSocketURL(): string {
  if (typeof window === 'undefined') return '';
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // In production, connect through the backend directly
  if (host.includes('vercel.app') || host.includes('foodsy-frontend')) {
    return 'wss://apifoodsy-backend.com/ws';
  }
  
  // Local development
  return 'ws://localhost:8080/ws';
}

export function useSessionWebSocket(sessionId: number) {
  const [event, setEvent] = useState<WebSocketEvent | null>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    
    const wsUrl = getWebSocketURL();
    console.log('Connecting to WebSocket:', wsUrl);
    
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
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
