import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  HugeiconsIcon,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Loader2,
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

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const dayStart = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDate = (value, options = { weekday: 'long', month: 'long', day: 'numeric' }) =>
  new Intl.DateTimeFormat(undefined, options).format(new Date(value));

const formatTime = (value) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  );

export default function Classes() {
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/trainer-workspace/classes');
      if (!data?.success || !Array.isArray(data.classes)) {
        throw new Error('Scheduled sessions were not returned.');
      }
      setClasses(data.classes.filter((item) => new Date(item.startsAt) >= new Date()));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load your trainer’s schedule.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    const requestedId = searchParams.get('classId');
    const requestedClass = classes.find((item) => item._id === requestedId);
    if (!requestedClass) return;
    const date = dayStart(requestedClass.startsAt);
    setSelectedDate(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [classes, searchParams]);

  const classesByDay = useMemo(
    () =>
      classes.reduce((byDay, item) => {
        const key = dateKey(dayStart(item.startsAt));
        byDay.set(key, [...(byDay.get(key) || []), item]);
        return byDay;
      }, new Map()),
    [classes]
  );

  const calendarDays = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const selectedClasses = classesByDay.get(dateKey(selectedDate)) || [];

  const showNextSession = () => {
    const nextSession = classes
      .slice()
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];
    if (!nextSession) return;
    const date = dayStart(nextSession.startsAt);
    setSelectedDate(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const updateBooking = async (item) => {
    setBusyId(item._id);
    setError('');
    try {
      if (item.isBooked) {
        await api.delete(`/trainer-workspace/classes/${item._id}/booking`);
      } else {
        await api.post(`/trainer-workspace/classes/${item._id}/book`);
      }
      await loadClasses();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to update your reservation.'
      );
    } finally {
      setBusyId('');
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
            LIVE GROUP CLINICS
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            COACHING SCHEDULE &amp; SESSIONS
          </h1>
          <p className="text-sm text-forma-text-secondary">
            View your coach&apos;s scheduled live training rooms, book reserved spots, and launch Zoom meetings directly.
          </p>
        </div>

        <Button asChild variant="outline" className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised">
          <Link to="/my-trainer">
            <HugeiconsIcon icon={ArrowLeft} className="mr-2 h-4 w-4" />
            Your Coach Profile
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadClasses}>
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
      ) : classes.length === 0 && !error ? (
        <EmptyState
          type="workouts"
          sentence="Your assigned coach has no upcoming live sessions scheduled at this time."
          actionLabel="Message your coach"
          to="/messages"
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Calendar Picker */}
          <div className="lg:col-span-6 xl:col-span-5">
            <Card className="border-forma-border-subtle bg-forma-bg-surface">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-xl font-normal tracking-wide text-forma-text-primary">
                  {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Previous month"
                    onClick={() =>
                      setMonth((val) => new Date(val.getFullYear(), val.getMonth() - 1, 1))
                    }
                    className="h-8 w-8 text-forma-text-secondary hover:text-forma-text-primary"
                  >
                    <HugeiconsIcon icon={ArrowLeft} className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Next month"
                    onClick={() =>
                      setMonth((val) => new Date(val.getFullYear(), val.getMonth() + 1, 1))
                    }
                    className="h-8 w-8 text-forma-text-secondary hover:text-forma-text-primary"
                  >
                    <HugeiconsIcon icon={ArrowRight} className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center font-mono text-[11px] uppercase tracking-wider text-forma-text-muted">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <span key={d} className="py-1">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Class calendar">
                  {calendarDays.map((date) => {
                    const key = dateKey(date);
                    const dayClasses = classesByDay.get(key) || [];
                    const isSelected = dateKey(selectedDate) === key;
                    const isOutside = date.getMonth() !== month.getMonth();

                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setSelectedDate(date)}
                        aria-pressed={isSelected}
                        className={`relative flex h-11 flex-col items-center justify-center rounded-lg font-mono text-xs transition-colors ${
                          isSelected
                            ? 'bg-forma-brand-ember font-bold text-forma-text-on-ember'
                            : isOutside
                              ? 'text-forma-text-muted/40 hover:bg-forma-bg-surface-raised'
                              : 'text-forma-text-primary hover:bg-forma-bg-surface-raised'
                        }`}
                      >
                        <span>{date.getDate()}</span>
                        {dayClasses.length > 0 && (
                          <span
                            className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                              isSelected ? 'bg-forma-text-on-ember' : 'bg-forma-brand-teal'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 border-t border-forma-border-subtle pt-3 font-mono text-[11px] text-forma-text-secondary">
                  <span className="h-2 w-2 rounded-full bg-forma-brand-teal" />
                  <span>Scheduled session on date</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sessions on Selected Date */}
          <div className="space-y-4 lg:col-span-6 xl:col-span-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-normal tracking-wide text-forma-text-primary">
                  {formatDate(selectedDate)}
                </h2>
                <span className="font-mono text-xs text-forma-text-muted">
                  {selectedClasses.length} {selectedClasses.length === 1 ? 'session' : 'sessions'} available
                </span>
              </div>
            </div>

            {!selectedClasses.length ? (
              <EmptyState
                type="workouts"
                sentence="No live sessions scheduled for this date."
                actionLabel="Show next session"
                onAction={showNextSession}
              />
            ) : (
              <div className="space-y-4">
                {selectedClasses.map((item) => (
                  <Card
                    key={item._id}
                    className={`border transition-all ${
                      item.isBooked
                        ? 'border-forma-brand-teal/40 bg-forma-bg-surface shadow-sm'
                        : 'border-forma-border-subtle bg-forma-bg-surface hover:border-forma-border-subtle/80'
                    }`}
                  >
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-forma-bg-surface-raised font-mono text-xs text-forma-text-secondary"
                        >
                          {item.category || 'General'}
                        </Badge>
                        {item.isBooked && (
                          <Badge
                            variant="outline"
                            className="border-forma-status-success/30 bg-forma-status-success/10 font-mono text-xs text-forma-status-success"
                          >
                            <HugeiconsIcon icon={Check} className="mr-1 h-3 w-3" />
                            Spot Reserved
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-lg font-bold text-forma-text-primary">
                        {item.title}
                      </CardTitle>

                      <p className="flex items-center gap-1.5 font-mono text-xs text-forma-brand-teal">
                        <HugeiconsIcon icon={Clock} className="h-3.5 w-3.5" />
                        {formatTime(item.startsAt)} · {item.durationMinutes} min
                        <span className="text-forma-text-muted">with {item.trainer?.name || 'Assigned Coach'}</span>
                      </p>
                    </CardHeader>

                    {item.description && (
                      <CardContent className="pb-3 text-xs leading-relaxed text-forma-text-secondary">
                        {item.description}
                      </CardContent>
                    )}

                    <CardFooter className="flex flex-wrap gap-3 border-t border-forma-border-subtle pt-4">
                      {item.isBooked && item.zoomUrl && (
                        <Button
                          asChild
                          className="bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                        >
                          <a href={item.zoomUrl} target="_blank" rel="noreferrer">
                            <HugeiconsIcon icon={Video} className="mr-2 h-4 w-4" />
                            Join Session
                            <HugeiconsIcon icon={ExternalLink} className="ml-2 h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant={item.isBooked ? 'outline' : 'default'}
                        onClick={() => updateBooking(item)}
                        disabled={busyId === item._id}
                        className={
                          item.isBooked
                            ? 'border-forma-border-subtle text-forma-text-secondary hover:text-forma-status-error'
                            : 'bg-forma-brand-teal font-semibold text-forma-text-primary hover:opacity-90'
                        }
                      >
                        {busyId === item._id && (
                          <HugeiconsIcon icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {item.isBooked ? 'Cancel Reservation' : 'Book Session'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
