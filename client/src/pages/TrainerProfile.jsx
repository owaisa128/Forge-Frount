import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  HugeiconsIcon,
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  UserRound,
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
import { useMembershipDialog } from '../components/MembershipDialogProvider';
import { hasFeature } from '../utils/membershipAccess';
import {
  getTrainerProfileText,
  getTrainerSpecialization,
  isDirectoryTrainer,
} from '../utils/trainerProfile';

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));

const formatTime = (value) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export default function TrainerProfile() {
  const { trainerId } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const openMembershipDialog = useMembershipDialog();
  const [trainer, setTrainer] = useState(null);
  const [membership, setMembership] = useState(user?.membership || null);
  const [loading, setLoading] = useState(true);
  const [busyClass, setBusyClass] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/memberships/available-trainers'),
      api.get('/memberships/current'),
    ])
      .then(([trainerResponse, membershipResponse]) => {
        const selected = trainerResponse.data?.trainers?.find(
          (item) => String(item.id) === trainerId && isDirectoryTrainer(item)
        );
        if (!selected) {
          throw new Error('This trainer profile is no longer available.');
        }
        if (active) {
          setTrainer(selected);
          setMembership(membershipResponse.data?.membership || null);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'Unable to load this trainer profile.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trainerId]);

  const assignedId =
    membership?.assignedTrainer?._id ||
    membership?.assignedTrainer?.id ||
    membership?.assignedTrainer ||
    '';
  const isAssigned = String(assignedId) === String(trainerId);
  const hasOtherAssignedTrainer = Boolean(assignedId) && !isAssigned;
  const canBookClasses = hasFeature(membership, 'zoomClasses');
  const specialization = getTrainerSpecialization(trainer);
  const bio = getTrainerProfileText(trainer?.bio);

  const bookSession = async (item) => {
    const classId = item.id || item._id;
    setError('');
    setBusyClass(classId);
    try {
      if (!isAssigned) {
        const { data } = await api.post('/memberships/select-trainer', {
          trainerId,
        });
        if (!data?.success || !data.membership) {
          throw new Error(data?.message || 'Unable to choose this trainer.');
        }
        setMembership(data.membership);
        updateUser((current) => ({ ...current, membership: data.membership }));
      }
      navigate(`/classes?classId=${encodeURIComponent(classId)}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to continue to booking.'
      );
    } finally {
      setBusyClass('');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center p-8 text-sm text-forma-text-secondary">
        <HugeiconsIcon icon={Loader2} aria-hidden="true" className="mr-2 h-5 w-5 animate-spin text-forma-brand-ember" />
        Loading trainer profile…
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-8">
        <Button asChild variant="ghost">
          <Link to="/my-trainer">
            <HugeiconsIcon icon={ArrowLeft} className="mr-2 h-4 w-4" />
            Trainer Directory
          </Link>
        </Button>
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'This trainer profile could not be found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <Button asChild variant="ghost" className="text-forma-text-secondary hover:text-forma-text-primary">
        <Link to="/my-trainer">
          <HugeiconsIcon icon={ArrowLeft} className="mr-2 h-4 w-4" />
          All Trainers
        </Link>
      </Button>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Trainer Profile Card */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
          {trainer.avatarUrl ? (
            <img
              src={trainer.avatarUrl}
              alt={`${trainer.name} profile`}
              className="h-28 w-28 shrink-0 rounded-2xl border border-forma-border-subtle object-cover sm:h-36 sm:w-36"
            />
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-forma-border-subtle bg-forma-bg-surface-raised text-forma-text-secondary sm:h-36 sm:w-36">
              <HugeiconsIcon aria-hidden="true" icon={UserRound} className="h-12 w-12" />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  trainer.remainingSlots > 0
                    ? 'border-forma-status-success/30 bg-forma-status-success/10 font-mono text-xs text-forma-status-success'
                    : isAssigned
                      ? 'border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-xs text-forma-brand-ember'
                      : 'border-forma-border-subtle bg-forma-bg-surface-raised font-mono text-xs text-forma-text-muted'
                }
              >
                {trainer.remainingSlots > 0
                  ? 'Accepting Clients'
                  : isAssigned
                    ? 'Your Assigned Coach'
                    : 'At Capacity'}
              </Badge>

              {isAssigned && (
                <Badge
                  variant="outline"
                  className="border-forma-brand-teal/30 bg-forma-brand-teal/10 font-mono text-xs text-forma-brand-teal"
                >
                  <HugeiconsIcon icon={BadgeCheck} className="mr-1 h-3 w-3" />
                  Active Pair
                </Badge>
              )}
            </div>

            <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
              {trainer.name}
            </h1>

            {specialization && (
              <div className="flex flex-wrap gap-1.5">
                {specialization
                  .split(/[,;|]/)
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-forma-bg-surface-raised font-mono text-xs text-forma-text-secondary"
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            )}

            {bio && (
              <p className="pt-1 text-sm leading-relaxed text-forma-text-secondary">
                {bio}
              </p>
            )}

            <div className="flex items-center gap-2 pt-2 font-mono text-xs text-forma-text-muted">
              <HugeiconsIcon icon={MapPin} className="h-4 w-4 text-forma-brand-ember" />
              <span>
                {trainer.remainingSlots} of {trainer.clientCapacity} coaching places available
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Sessions Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-normal tracking-wide text-forma-text-primary">
              UPCOMING SESSIONS
            </h2>
            <p className="text-xs text-forma-text-secondary">
              Live group training and interactive clinics scheduled by this coach.
            </p>
          </div>

          {isAssigned && canBookClasses && (
            <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised">
              <Link to="/classes">
                <HugeiconsIcon icon={CalendarDays} className="mr-1.5 h-3.5 w-3.5" />
                View Full Calendar
              </Link>
            </Button>
          )}
        </div>

        {!trainer.upcomingClasses?.length ? (
          <EmptyState
            type="workouts"
            sentence="This trainer has no upcoming sessions scheduled at the moment."
            actionLabel={canBookClasses ? 'Message your trainer' : 'View live-session plans'}
            {...(canBookClasses
              ? { to: '/messages' }
              : { onAction: openMembershipDialog })}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trainer.upcomingClasses.map((item) => {
              const classId = item.id || item._id;
              return (
                <Card
                  key={`${item.title}-${item.startsAt}`}
                  className="flex flex-col justify-between border-forma-border-subtle bg-forma-bg-surface"
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="bg-forma-bg-surface-raised font-mono text-[10px] text-forma-text-secondary">
                        {item.category || 'General Fitness'}
                      </Badge>
                      <span className="flex items-center gap-1 font-mono text-xs text-forma-text-muted">
                        <HugeiconsIcon icon={Clock} className="h-3.5 w-3.5" />
                        {item.durationMinutes} min
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-forma-text-primary">
                      {item.title}
                    </CardTitle>
                    <p className="flex items-center gap-1.5 font-mono text-xs text-forma-brand-teal">
                      <HugeiconsIcon icon={CalendarDays} className="h-3.5 w-3.5" />
                      {formatDate(item.startsAt)} · {formatTime(item.startsAt)}
                    </p>
                  </CardHeader>

                  <CardFooter className="border-t border-forma-border-subtle pt-4">
                    {canBookClasses && !hasOtherAssignedTrainer ? (
                      <Button
                        type="button"
                        disabled={busyClass === classId || (trainer.remainingSlots === 0 && !isAssigned)}
                        onClick={() => bookSession(item)}
                        className="w-full bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                      >
                        {busyClass === classId ? (
                          <>
                            <HugeiconsIcon icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                            Reserving…
                          </>
                        ) : (
                          <>
                            <HugeiconsIcon icon={ExternalLink} className="mr-2 h-4 w-4" />
                            Book Session
                          </>
                        )}
                      </Button>
                    ) : canBookClasses ? (
                      <p className="text-xs text-forma-text-muted">
                        Sessions can only be booked with your currently assigned trainer.
                      </p>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised"
                        onClick={openMembershipDialog}
                      >
                        View Live Plans
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {(!canBookClasses || hasOtherAssignedTrainer) && trainer.upcomingClasses?.length > 0 && (
          <div className="rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised/30 p-4">
            <p className="font-mono text-xs text-forma-text-secondary">
              {hasOtherAssignedTrainer
                ? 'To book these sessions, switch your assigned trainer in your Membership settings.'
                : 'Live session booking is unlocked on Elite and Premium membership plans.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
