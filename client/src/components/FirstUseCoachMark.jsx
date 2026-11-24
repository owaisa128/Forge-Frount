import React from 'react';
import { HugeiconsIcon, LineChart, X } from "./ui/icons";
import useGuidanceDismissal from '../hooks/useGuidanceDismissal';
export default function FirstUseCoachMark({ userId, guidanceId, title, children }) {
  const { isVisible, dismiss } = useGuidanceDismissal(userId, guidanceId);
  if (!isVisible) return null;
  return (
    <aside className="forma-coachmark" aria-label={title}>
      {' '}
      <div className="forma-coachmark__heading">
        {' '}
        <HugeiconsIcon icon={LineChart} aria-hidden="true" /> <strong>{title}</strong>{' '}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this tip"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-1"
        >
          {' '}
          <HugeiconsIcon icon={X} aria-hidden="true" />{' '}
        </button>{' '}
      </div>{' '}
      <p>{children}</p>{' '}
      <button type="button" className="forma-coachmark__dismiss min-h-[44px] px-3 py-2" onClick={dismiss}>
        Dismiss
      </button>{' '}
    </aside>
  );
}
