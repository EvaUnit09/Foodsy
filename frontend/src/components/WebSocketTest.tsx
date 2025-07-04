import React, { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WEBSOCKET_URL = 'http://localhost:8080/ws';

const WebSocketTest: React.FC = () => {
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WEBSOCKET_URL),
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
    });

    client.onConnect = (frame) => {
      console.log('Connected: ' + frame);

      client.subscribe('/topic/test', (message) => {
        console.log('Received:', message.body);
        alert('Received: ' + message.body);
      });

      client.publish({
        destination: '/app/test',
        body: 'Hello from frontend!',
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker error: ' + frame.headers['message']);
      console.error('Details: ' + frame.body);
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  return <div>WebSocket test running. Check your console and alerts!</div>;
};

export default WebSocketTest;
