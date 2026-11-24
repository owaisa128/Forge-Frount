import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HugeiconsIcon,
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Loader2,
  MessageCircle,
  UserRound,
  Users,
} from '../components/ui/icons';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  getTrainerProfileText,
  getTrainerSpecialization,
  isDirectoryTrainer,
} from '../utils/trainerProfile';

function TrainerPortrait({ trainer, large = false }) {
  const sizeClass = large ? 'h-20 w-20' : 'h-16 w-16';

  return trainer.avatarUrl ? (
    <img
      className={`${sizeClass} rounded-xl border border-forma-border-subtle object-cover`}
      src={trainer.avatarUrl}
      alt={`${trainer.name}, trainer profile`}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised text-forma-text-secondary`}
      aria-hidden="true"
    >
      <HugeiconsIcon aria-hidden="true" icon={UserRound} className={large ? 'h-8 w-8' : 'h-6 w-6'} />
    </div>
  );
}

export default function TrainerDirectory() {
  const { user } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [assignedTrainer, setAssignedTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([api.get('/memberships/available-trainers'), api.get('/memberships/current')])
      .then(([trainerResponse, membershipResponse]) => {
        if (!Array.isArray(trainerResponse.data?.trainers)) {
          throw new Error('Trainer profiles could not be loaded.');
        }
        if (active) {
          setTrainers(trainerResponse.data.trainers.filter(isDirectoryTrainer));
          setAssignedTrainer(
            membershipResponse.data?.membership?.assignedTrainer ||
              user?.membership?.assignedTrainer ||
              null
          );
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'Unable to load trainer profiles.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const assignedId = assignedTrainer?._id || assignedTrainer?.id || '';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember"
          >
            <HugeiconsIcon aria-hidden="true" icon={Users} className="mr-1.5 h-3 w-3" />
            FORGE COACHING ROSTER
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            FIND YOUR COACH
          </h1>
          <p className="text-sm text-forma-text-secondary">
            Browse verified personal trainers, inspect upcoming live Zoom clinics, and pair with an expert suited to your targets.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised"
        >
          <Link to="/messages">
            <HugeiconsIcon icon={MessageCircle} className="mr-2 h-4 w-4 text-forma-brand-teal" />
            Coach Messages
            <HugeiconsIcon icon={ArrowRight} className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Assigned Coach Spotlight */}
      {assignedTrainer && (
        <Card className="border-forma-brand-ember/30 bg-forma-bg-surface">
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <TrainerPortrait trainer={assignedTrainer} large />
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  className="border-forma-status-success/40 bg-forma-status-success/10 font-mono text-xs text-forma-status-success"
                >
                  <HugeiconsIcon icon={BadgeCheck} className="mr-1.5 h-3.5 w-3.5" />
                  Your Assigned Coach
                </Badge>
                <h2 className="text-xl font-bold text-forma-text-primary sm:text-2xl">
                  {assignedTrainer.name}
                </h2>
                <p className="font-mono text-xs text-forma-text-secondary">
                  {getTrainerSpecialization(assignedTrainer) || 'FORGE Master Trainer'}
                </p>
              </div>
            </div>

            <Button
              asChild
              className="bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
            >
              <Link to={`/my-trainer/${assignedId}`}>
                View Profile &amp; Sessions
                <HugeiconsIcon icon={ArrowRight} className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Directory Grid */}
      <section aria-label="Available trainers" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-normal tracking-wide text-forma-text-primary">
            APPROVED TRAINERS
          </h2>
          <span className="font-mono text-xs text-forma-text-muted">
            {trainers.length} {trainers.length === 1 ? 'coach' : 'coaches'} listed
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-forma-text-secondary">
            <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-5 w-5 animate-spin text-forma-brand-ember" />
            Loading approved trainers…
          </div>
        ) : !trainers.length && !error ? (
          <EmptyState
            type="clients"
            sentence="There aren't any complete trainer profiles available at this time. Contact support for coaching inquiries."
            actionLabel="Contact FORGE"
            to="/support"
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => {
              const isAssigned = String(assignedId) === String(trainer.id);
              const hasAvailability = trainer.remainingSlots > 0;
              const specialization = getTrainerSpecialization(trainer);
              const bio = getTrainerProfileText(trainer.bio);

              return (
                <Card
                  key={trainer.id}
                  className="flex flex-col justify-between border-forma-border-subtle bg-forma-bg-surface transition-all hover:border-forma-border-subtle/80"
                >
                  <CardHeader className="space-y-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <TrainerPortrait trainer={trainer} />
                      <Badge
                        variant="outline"
                        className={
                          hasAvailability
                            ? 'border-forma-status-success/30 bg-forma-status-success/10 font-mono text-[10px] uppercase text-forma-status-success'
                            : 'border-forma-border-subtle bg-forma-bg-surface-raised font-mono text-[10px] uppercase text-forma-text-muted'
                        }
                      >
                        {hasAvailability ? 'Available' : 'At Capacity'}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold text-forma-text-primary">
                        {trainer.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {specialization ? (
                          specialization
                            .split(/[,;|]/)
                            .map((tag) => tag.trim())
                            .filter(Boolean)
                            .map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="bg-forma-bg-surface-raised font-mono text-[10px] text-forma-text-secondary"
                              >
                                {tag}
                              </Badge>
                            ))
                        ) : (
                          <Badge variant="secondary" className="bg-forma-bg-surface-raised font-mono text-[10px] text-forma-text-muted">
                            Specialty not listed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4">
                    {bio && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-forma-text-secondary">
                        {bio}
                      </p>
                    )}

                    {trainer.upcomingClasses?.length > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-forma-bg-surface-raised/50 px-3 py-2 text-xs text-forma-brand-teal">
                        <HugeiconsIcon icon={CalendarDays} className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          Next session:{' '}
                          {new Intl.DateTimeFormat(undefined, {
                            month: 'short',
                            day: 'numeric',
                          }).format(new Date(trainer.upcomingClasses[0].startsAt))}
                        </span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-forma-border-subtle pt-4">
                    <Button
                      asChild
                      variant={isAssigned ? 'default' : 'outline'}
                      disabled={!hasAvailability && !isAssigned}
                      className={
                        isAssigned
                          ? 'w-full bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover'
                          : 'w-full border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised'
                      }
                    >
                      <Link to={`/my-trainer/${trainer.id}`}>
                        {isAssigned ? 'Book with your Coach' : 'View Profile & Book'}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {user?.fitnessGoal && (
        <div className="rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised/30 p-4">
          <p className="font-mono text-xs text-forma-text-secondary">
            Your current fitness focus: <span className="font-semibold text-forma-text-primary">{user.fitnessGoal}</span>
          </p>
        </div>
      )}
    </div>
  );
}
