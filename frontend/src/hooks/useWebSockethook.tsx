import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketEvent {
  type: string;
  payload?: Record<string, unknown>;
}

const POLLING_INTERVAL = 5000;
const MAX_CONSECUTIVE_ERRORS = 3;

// SockJS requires an HTTP(S) URL — it negotiates the transport internally.
// Never use ws:// or wss:// with SockJS.
function getSockJSUrl(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.host;
  if (host.includes('vercel.app') || host.includes('foodsy-frontend')) {
    return 'https://apifoodsy-backend.com/ws';
  }
  return 'http://localhost:8080/ws';
}

export function useSessionWebSocket(sessionId: number) {
  const [event, setEvent] = useState<WebSocketEvent | null>(null);
  const clientRef = useRef<Client | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingActiveRef = useRef(false);
  const errorCountRef = useRef(0);

  const stopPolling = () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    pollingRef.current = null;
    pollingActiveRef.current = false;
    errorCountRef.current = 0;
  };

  const startPolling = () => {
    if (pollingActiveRef.current) return;
    pollingActiveRef.current = true;
    errorCountRef.current = 0;

    const poll = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const response = await fetch(`/api/sessions/${sessionId}/status`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          errorCountRef.current = 0;
          if (data.status === 'completed') {
            stopPolling();
            return;
          }
          if (data.lastUpdate) setEvent({ type: 'session_update', payload: data });
        } else {
          if (++errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) { stopPolling(); return; }
        }
      } catch {
        if (++errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) { stopPolling(); return; }
      }
      if (pollingActiveRef.current) {
        pollingRef.current = setTimeout(poll, POLLING_INTERVAL);
      }
    };

    poll();
  };

  useEffect(() => {
    if (!sessionId) return;

    const url = getSockJSUrl();

    const client = new Client({
      // SockJS handles WebSocket + XHR-streaming + long-polling fallbacks automatically.
      // This is the recommended approach for Spring STOMP in production.
      webSocketFactory: () => new SockJS(url),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      stopPolling();
      client.subscribe(`/topic/session/${sessionId}`, (message) => {
        try {
          setEvent(JSON.parse(message.body));
        } catch (e) {
          console.error('WS parse error:', e);
        }
      });
      // Sync late-joining clients: ask the server for current round/status immediately.
      client.publish({ destination: `/app/session/${sessionId}/getRoundStatus`, body: '{}' });
    };

    client.onDisconnect = () => {
      if (!pollingActiveRef.current) startPolling();
    };

    client.onStompError = () => {
      if (!pollingActiveRef.current) startPolling();
    };

    client.onWebSocketError = () => {
      if (!pollingActiveRef.current) startPolling();
    };

    client.activate();
    clientRef.current = client;

    // Fallback: if STOMP hasn't connected within 5 s, start polling
    const connectTimeout = setTimeout(() => {
      if (!client.connected && !pollingActiveRef.current) startPolling();
    }, 5000);

    return () => {
      clearTimeout(connectTimeout);
      stopPolling();
      client.deactivate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const send = (destination: string, body: unknown) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination,
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });
    }
  };

  return { event, send };
}
