import React from 'react';
import { Skeleton } from './ui/skeleton';

export default function PageLoadingState({ message = 'Loading page', compact = false }) {
  return (
    <div
      className={`forma-route-loading${compact ? ' is-compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{message}</span>
      <div className="forma-route-loading__content" aria-hidden="true">
        <Skeleton className="h-8 w-2/5 rounded-md" />
        <Skeleton className="h-4 w-3/5 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
    </div>
  );
}
