import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui';
import {
  BellIcon,
  ChartLineIcon,
  CreditCardIcon,
  Dumbbell01Icon,
  DropletsIcon,
  HugeiconsIcon,
  MessageSquareIcon,
  UsersIcon,
  UtensilsIcon,
} from './ui/hugeicons';

const illustrationIcons = {
  workouts: Dumbbell01Icon,
  meals: UtensilsIcon,
  clients: UsersIcon,
  messages: MessageSquareIcon,
  membership: CreditCardIcon,
  notifications: BellIcon,
  water: DropletsIcon,
  progress: ChartLineIcon,
};

export function EmptyStateIllustration({ type = 'workouts', className = '' }) {
  const icon = illustrationIcons[type] || illustrationIcons.workouts;
  return <HugeiconsIcon icon={icon} className={`vf-empty-illustration ${className}`.trim()} aria-hidden="true" />;
}
export default function EmptyState({
  type = 'workouts',
  sentence,
  actionLabel,
  to,
  onAction,
  className = '',
}) {
  const humanSentence = typeof sentence === 'string' ? sentence.trim() : '';
  const hasRoute = typeof to === 'string' && to.length > 0;
  const hasHandler = typeof onAction === 'function';
  if (
    !humanSentence ||
    typeof actionLabel !== 'string' ||
    !actionLabel.trim() ||
    hasRoute === hasHandler
  ) {
    throw new Error(
      'EmptyState requires one sentence, one action label, and exactly one action target.'
    );
  }
  const action = hasRoute ? (
    <Button as={Link} to={to} variant="primary">
      {' '}
      {actionLabel}{' '}
    </Button>
  ) : (
    <Button type="button" variant="primary" onClick={onAction}>
      {' '}
      {actionLabel}{' '}
    </Button>
  );
  return (
    <section className={`vf-empty ${className}`.trim()}>
      {' '}
      <EmptyStateIllustration type={type} />{' '}
      <p className="vf-empty-sentence">{humanSentence}</p> {action}{' '}
    </section>
  );
}
