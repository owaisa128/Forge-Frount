import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HugeiconsIcon,
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  Clock,
  ExternalLink,
  Loader2,
  Trash2,
  Video,
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
import { useConfirm } from '../context/ConfirmDialogContext';

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(
    new Date(value)
  );

const formatTime = (value) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  );

export default function TrainerSchedule() {
  const confirm = useConfirm();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/trainer-workspace/classes');
      if (!Array.isArray(data.classes)) throw new Error('Scheduled classes were not returned.');
      setClasses(data.classes);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load your schedule.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (item) => {
    if (
      !(await confirm({
        title: `Remove "${item.title}" from your schedule?`,
        description: 'Clients will no longer see this class in your schedule.',
        confirmLabel: 'Remove class',
        destructive: true,
      }))
    )
      return;

    setDeletingId(item._id);
    setError('');
    try {
      await api.delete(`/trainer-workspace/classes/${item._id}`);
      setClasses((current) => current.filter(({ _id }) => _id !== item._id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove this class.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="border-forma-brand-teal/30 bg-forma-brand-teal/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-teal"
          >
            <HugeiconsIcon aria-hidden="true" icon={Video} className="mr-1.5 h-3 w-3" />
            SESSION MANAGEMENT
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            COACHING CLINICS &amp; SCHEDULE
          </h1>
          <p className="text-sm text-forma-text-secondary">
            Manage your scheduled Zoom classes, monitor client bookings, and launch live rooms.
          </p>
        </div>

        <Button asChild className="bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover">
          <Link to="/trainer/slots">
            <HugeiconsIcon icon={CalendarPlus} className="mr-2 h-4 w-4" />
            Create Live Session
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-forma-text-secondary">
          <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-5 w-5 animate-spin text-forma-brand-ember" />
          Loading class schedule…
        </div>
      ) : !classes.length && !error ? (
        <EmptyState
          type="workouts"
          sentence="Your schedule is completely clear. Create a live Zoom class to invite your paired athletes."
          actionLabel="Create a class"
          to="/trainer/slots"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((item) => (
            <Card
              key={item._id}
              className="flex flex-col justify-between border-forma-border-subtle bg-forma-bg-surface transition-all hover:border-forma-border-subtle/80"
            >
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="bg-forma-bg-surface-raised font-mono text-[10px] text-forma-text-secondary">
                    {item.category || 'General'}
                  </Badge>
                  <span className="flex items-center gap-1 font-mono text-xs text-forma-text-muted">
                    <HugeiconsIcon icon={Clock} className="h-3.5 w-3.5" />
                    {item.durationMinutes} min
                  </span>
                </div>

                <CardTitle className="text-lg font-bold text-forma-text-primary">
                  {item.title}
                </CardTitle>

                <p className="flex items-center gap-1.5 font-mono text-xs text-forma-brand-teal">
                  <HugeiconsIcon icon={CalendarDays} className="h-3.5 w-3.5" />
                  {formatDate(item.startsAt)} · {formatTime(item.startsAt)}
                </p>
              </CardHeader>

              {item.description && (
                <CardContent className="pb-3 text-xs leading-relaxed text-forma-text-secondary">
                  {item.description}
                </CardContent>
              )}

              <CardFooter className="flex items-center justify-between gap-2 border-t border-forma-border-subtle pt-3">
                {item.zoomUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-forma-border-subtle text-xs text-forma-text-primary hover:bg-forma-bg-surface-raised"
                  >
                    <a href={item.zoomUrl} target="_blank" rel="noreferrer">
                      <HugeiconsIcon icon={Video} className="mr-1.5 h-3.5 w-3.5 text-forma-brand-teal" />
                      Open Zoom
                      <HugeiconsIcon icon={ExternalLink} className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <span className="font-mono text-[11px] text-forma-text-muted">No link set</span>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={Boolean(deletingId)}
                  onClick={() => remove(item)}
                  aria-label={`Remove ${item.title}`}
                  className="h-8 text-xs text-forma-text-secondary hover:text-forma-status-error"
                >
                  {deletingId === item._id ? (
                    <HugeiconsIcon icon={Loader2} className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={Trash2} className="h-3.5 w-3.5" />
                  )}
                  Remove
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
