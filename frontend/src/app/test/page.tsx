'use client';
import WebSocketSessionTest from '@/components/WebSocketSessionTest';
import WebSocketTest from '@/components/WebSocketTest';

export default function TestPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>WebSocket Session Test</h1>
      <WebSocketSessionTest />
      <section>
        <WebSocketTest />
      </section>
    </main>
  );
} 