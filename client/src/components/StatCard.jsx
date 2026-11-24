import React from 'react';
import { HugeiconsIcon } from './ui/icons';
export default function StatCard({ label, value, unit, icon, detail }) {
  return (
    <article className="vf-stat-card">
      {' '}
      <div className="vf-stat-card-heading">
        {' '}
        <HugeiconsIcon icon={icon} aria-hidden="true" /> <h3>{label}</h3>{' '}
      </div>{' '}
      <p className="vf-stat-card-value">
        {' '}
        {value} {unit && <span>{unit}</span>}{' '}
      </p>{' '}
      {detail && <p className="vf-secondary">{detail}</p>}{' '}
    </article>
  );
}
