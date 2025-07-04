import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function useSessionWebSocket(sessionId: number) {
  const [event, setEvent] = useState<any>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
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
  const send = (destination: string, body: any) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination,
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });
    }
  };

  return { event, send };
}
