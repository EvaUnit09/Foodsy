import { useState, useEffect } from "react";

/**
 * Returns the userId that was saved in localStorage by the Join page.
 * While the value is still loading (first render), it returns undefined.
 */
export function useUserId(): string | undefined {
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    // Runs only on the client
    const stored = localStorage.getItem("userId"); // ← change key if you use another one
    if (stored) setUserId(stored.trim().toLowerCase());
  }, []);

  return userId;
}
