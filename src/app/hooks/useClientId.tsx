import { useRef, useEffect } from 'react';

/**
 * Generate a unique client ID for this browser session
 * This persists across component remounts but resets on page refresh
 */
export function useClientId() {
  const clientIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!clientIdRef.current) {
      // Generate unique ID: timestamp + random string
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 9);
      clientIdRef.current = `client_${timestamp}_${random}`;

      console.log('🆔 Client ID generated:', clientIdRef.current);
    }
  }, []);

  return clientIdRef.current;
}
