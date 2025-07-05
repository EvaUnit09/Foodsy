import React, { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WEBSOCKET_URL = 'http://localhost:8080/ws';
const SESSION_ID = 1; // Replace with your actual session ID

const WebSocketSessionHandler: React.FC = () => {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WEBSOCKET_URL),
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      console.log('Connected to WebSocket for session events');

      client.subscribe(`/topic/session/${SESSION_ID}`, (message) => {
        const event = JSON.parse(message.body);
        console.log('Session event received:', event);

        switch (event.type) {
          case 'sessionStarted':
            alert(`Session started at ${event.payload.startTime}`);
            // TODO: Update UI to show voting can begin
            break;
          case 'timerUpdate':
            alert(`Timer: ${event.payload.millisLeft / 1000} seconds left`);
            // TODO: Update countdown timer in UI
            break;
          case 'roundTransition':
            alert(`Round ${event.payload.newRound} started! Top K: ${event.payload.topK.join(', ')}`);
            // TODO: Update UI for new round and show top K restaurants
            break;
          case 'sessionEnd':
            const { winner, finalRankings, totalParticipants, totalVotes } = event.payload;
            alert(`🎉 Session Ended!\nWinner: ${winner?.name || 'No winner'}\nTotal Participants: ${totalParticipants}\nTotal Votes: ${totalVotes}\nFinal Rankings: ${finalRankings?.map((r: { name: string }, i: number) => `${i+1}. ${r.name}`).join(', ') || 'No rankings'}`);
            // TODO: Navigate to results page or show results modal
            console.log('Session ended with final results:', event.payload);
            break;
          default:
            console.warn('Unknown event type:', event.type);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker error: ' + frame.headers['message']);
      console.error('Details: ' + frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  // Example: Host triggers session start
  const startSession = () => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: `/app/session/${SESSION_ID}/start`,
        body: '',
      });
      console.log('Session start event sent');
    }
  };

  // Example: Host triggers timer update
  const sendTimerUpdate = () => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: `/app/session/${SESSION_ID}/timerUpdate`,
        body: '60000', // 60 seconds left, as a string
      });
      console.log('Timer update event sent');
    }
  };

  // Example: Host triggers round transition
  const sendRoundTransition = () => {
    if (clientRef.current && clientRef.current.connected) {
      const payload = {
        newRound: 2,
        topK: ['Pizza Place', 'Sushi Spot', 'Burger Joint'],
      };
      clientRef.current.publish({
        destination: `/app/session/${SESSION_ID}/roundTransition`,
        body: JSON.stringify(payload),
      });
      console.log('Round transition event sent');
    }
  };

  // Example: Host triggers session end
  const endSession = () => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: `/app/session/${SESSION_ID}/end`,
        body: '',
      });
      console.log('Session end event sent');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-x-2">
        <button onClick={startSession} className="bg-blue-500 text-white px-4 py-2 rounded-md">Start Session (Host)</button>
        <button onClick={sendTimerUpdate} className="bg-purple-500 text-white px-4 py-2 rounded-md">Send Timer Update (Host)</button>
        <button onClick={sendRoundTransition} className="bg-green-500 text-white px-4 py-2 rounded-md">Send Round Transition (Host)</button>
        <button onClick={endSession} className="bg-red-500 text-white px-4 py-2 rounded-md">End Session (Host)</button>
      </div>
      <div>Subscribed to session events for session {SESSION_ID}.</div>
    </div>
  );
};

export default WebSocketSessionHandler;
