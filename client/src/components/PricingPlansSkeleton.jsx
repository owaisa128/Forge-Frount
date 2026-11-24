import React from 'react';
import { Skeleton } from './ui/skeleton';

const placeholderPlans = [0, 1, 2, 3];
const placeholderFeatures = [0, 1, 2, 3, 4];

export default function PricingPlansSkeleton() {
  return (
    <div
      className="forma-pricing__grid forma-pricing__grid--loading"
      role="status"
      aria-live="polite"
      aria-label="Loading membership plans"
    >
      {placeholderPlans.map((plan) => (
        <article
          className="forma-pricing__card forma-pricing__skeleton-card"
          aria-hidden="true"
          key={plan}
        >
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="mt-4 h-4 w-4/5 rounded-md" />
          <Skeleton className="mt-2 h-4 w-3/5 rounded-md" />
          <div className="mt-6 border-t border-white/10 pt-5">
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="mt-2 h-4 w-24 rounded-md" />
          </div>
          <div className="mt-6 grid gap-4">
            {placeholderFeatures.map((feature) => (
              <Skeleton className="h-4 w-full rounded-md" key={feature} />
            ))}
          </div>
          <Skeleton className="mt-6 h-11 w-full rounded-full" />
        </article>
      ))}
    </div>
  );
}
