import { useCallback, useEffect, useState } from 'react';

export default function useGuidanceDismissal(userId, guidanceId) {
  const storageKey = userId ? `forma:guidance:v1:${userId}:${guidanceId}` : null;
  const [dismissedKey, setDismissedKey] = useState(null);

  useEffect(() => {
    if (!storageKey) {
      setDismissedKey(null);
      return;
    }

    setDismissedKey(localStorage.getItem(storageKey) === 'dismissed' ? storageKey : '');
  }, [storageKey]);

  const dismiss = useCallback(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, 'dismissed');
    setDismissedKey(storageKey);
  }, [storageKey]);

  return {
    isVisible: Boolean(storageKey && dismissedKey !== null && dismissedKey !== storageKey),
    dismiss,
  };
}
