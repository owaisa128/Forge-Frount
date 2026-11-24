import React, { useCallback, useEffect, useState } from 'react';
import {
  HugeiconsIcon,
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  Clock3,
  Dumbbell,
  LocateFixed,
  MapPin,
  RefreshCw,
  Route,
  ShieldCheck,
  Users,
  Activity,
  Zap,
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
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import api from '../api/axios';
import RunMap from '../components/RunMap';
import EmptyState from '../components/EmptyState';
import useLiveSocket from '../hooks/useLiveSocket';
import { activeSecondsAt } from './WorkoutTracker';

const duration = (seconds = 0) => {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor((value % 3600) / 60), value % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

const displayName = (client) => (typeof client === 'object' ? client?.name || 'Client' : 'Client');

const signalStatus = (session) => {
  const latest = session.route?.[session.route.length - 1];
  if (!latest || Date.now() - new Date(latest.recordedAt).getTime() > 30000) return 'Unavailable';
  return latest.accuracy <= 25 ? 'Active' : 'Weak';
};

const currentSpeed = (session) => {
  const points = session.route || [];
  if (points.length < 2) return 0;
  const previous = points[points.length - 2];
  const latest = points[points.length - 1];
  const seconds = (new Date(latest.recordedAt) - new Date(previous.recordedAt)) / 1000;
  if (
    previous.segment !== latest.segment ||
    seconds <= 0 ||
    Date.now() - new Date(latest.recordedAt).getTime() > 15000
  )
    return 0;

  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latest.latitude - previous.latitude);
  const longitudeDelta = radians(latest.longitude - previous.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(previous.latitude)) *
      Math.cos(radians(latest.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const meters = 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  return (meters / seconds) * 3.6;
};

export default function TrainerTracking() {
  const [liveSessions, setLiveSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({
    activeSessions: 0,
    clientTotals: [],
    recentSessions: [],
  });
  const [assignedClients, setAssignedClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [clientId, setClientId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [liveWorkouts, setLiveWorkouts] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [summaryFrom, setSummaryFrom] = useState('');
  const [summaryTo, setSummaryTo] = useState('');
  const [tick, setTick] = useState(Date.now());
  const [liveNotice, setLiveNotice] = useState('');

  const loadWorkoutLive = useCallback(async () => {
    try {
      const { data } = await api.get('/workout-sessions/trainer/live');
      setLiveWorkouts(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to refresh live client workouts.');
    }
  }, []);

  const loadLive = useCallback(async () => {
    try {
      const { data } = await api.get('/gps-sessions/trainer/live');
      const nextSessions = Array.isArray(data.sessions) ? data.sessions : [];
      setLiveSessions(nextSessions);
      setSelected((current) => {
        if (!current || !['active', 'paused'].includes(current.status)) return current;
        const latest = nextSessions.find((item) => item._id === current._id);
        return latest ? { ...current, ...latest, route: current.route } : current;
      });
      setSummary((current) => ({ ...current, activeSessions: nextSessions.length }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to refresh live client tracking.');
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/gps-sessions/trainer', {
        params: {
          ...(clientId ? { clientId } : {}),
          page,
          ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
          ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
        },
      });
      if (!Array.isArray(data.sessions)) throw new Error('GPS session history was not returned.');
      setSessions(data.sessions);
      setPages(data.pages || 1);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load GPS sessions.'
      );
    } finally {
      setLoading(false);
    }
  }, [clientId, from, to, page]);

  const liveFields = (payload) => ({
    status: payload.status,
    durationSeconds: payload.durationSeconds,
    movingSeconds: payload.movingSeconds,
    distanceKm: payload.distanceKm,
    averageSpeedKmh: payload.averageSpeedKmh,
    averagePaceMinutesPerKm: payload.averagePaceMinutesPerKm,
    estimatedCalories: payload.estimatedCalories,
    updatedAt: payload.updatedAt,
  });

  const applyLive = useCallback((payload) => {
    const newPoints = Array.isArray(payload.newPoints) ? payload.newPoints : [];
    setLiveSessions((current) =>
      current.map((item) =>
        item._id === payload.sessionId
          ? {
              ...item,
              ...liveFields(payload),
              route: [...(item.route || []), ...newPoints].slice(-2),
            }
          : item
      )
    );
    setSelected((current) =>
      current && current._id === payload.sessionId
        ? { ...current, ...liveFields(payload), route: [...(current.route || []), ...newPoints] }
        : current
    );
  }, []);

  const connected = useLiveSocket({
    'gps:started': (payload) => {
      setLiveNotice(`${payload.clientName} started a ${payload.activityType} workout.`);
      loadLive();
    },
    'gps:update': applyLive,
    'gps:status': applyLive,
    'gps:ended': async (payload) => {
      const goal = payload.goalProgress;
      setLiveNotice(
        payload.status === 'cancelled'
          ? `${payload.clientName} cancelled the workout.`
          : `${payload.clientName} finished: ${Number(payload.distanceKm || 0).toFixed(2)} km in ${Math.round((payload.movingSeconds || 0) / 60)} min.${goal ? (goal.met ? ' Daily goal completed.' : ` Daily goal: ${goal.percent}%.`) : ''}`
      );
      setLiveSessions((current) => current.filter((item) => item._id !== payload.sessionId));
      try {
        const { data } = await api.get(`/gps-sessions/${payload.sessionId}`);
        setSelected((current) => (current?._id === payload.sessionId ? data.session : current));
      } catch {
        // Ignored
      }
      loadSessions();
    },
  });

  useEffect(() => {
    let active = true;
    api
      .get('/memberships/assigned-clients')
      .then(({ data }) => {
        if (active && Array.isArray(data.clients)) setAssignedClients(data.clients);
      })
      .catch(() => {});

    api
      .get('/gps-sessions/trainer/summary')
      .then(({ data }) => {
        if (active && data.success) {
          setSummary({
            activeSessions: data.activeSessions || 0,
            clientTotals: Array.isArray(data.clientTotals) ? data.clientTotals : [],
            recentSessions: Array.isArray(data.recentSessions) ? data.recentSessions : [],
          });
        }
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'Unable to load GPS workout summary.'
          );
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadLive();
    const interval = window.setInterval(loadLive, connected ? 30000 : 10000);
    return () => window.clearInterval(interval);
  }, [loadLive, connected]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadWorkoutLive();
    const interval = window.setInterval(loadWorkoutLive, 10000);
    return () => window.clearInterval(interval);
  }, [loadWorkoutLive]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    if (summaryFrom && summaryTo && summaryFrom > summaryTo) {
      setError('The "From" date must be before the "To" date.');
      return undefined;
    }
    api
      .get('/workout-sessions/trainer/summary', {
        params: {
          ...(summaryFrom ? { from: new Date(`${summaryFrom}T00:00:00`).toISOString() } : {}),
          ...(summaryTo ? { to: new Date(`${summaryTo}T23:59:59`).toISOString() } : {}),
        },
      })
      .then(({ data }) => {
        if (active && Array.isArray(data.clients)) setWeekly(data.clients);
      })
      .catch((requestError) => {
        if (active)
          setError(requestError.response?.data?.message || 'Unable to load the client summary.');
      });
    return () => {
      active = false;
    };
  }, [summaryFrom, summaryTo]);

  const toInputDate = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setError('');
    setSummaryFrom(toInputDate(start));
    setSummaryTo(toInputDate(end));
  };

  const resetSummaryRange = () => {
    setError('');
    setSummaryFrom('');
    setSummaryTo('');
  };

  useEffect(() => {
    if (!selected || !['active', 'paused'].includes(selected.status)) return undefined;
    let active = true;
    const pollSelected = async () => {
      try {
        const { data } = await api.get(`/gps-sessions/${selected._id}`);
        if (active) setSelected(data.session);
      } catch (requestError) {
        if (active && requestError.response?.status === 403) {
          setSelected(null);
          setError('Location sharing was stopped or this client is no longer assigned to you.');
        } else if (active) {
          setError(requestError.response?.data?.message || 'Unable to refresh this live route.');
        }
      }
    };
    const interval = window.setInterval(pollSelected, connected ? 30000 : 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selected?._id, selected?.status, connected]);

  const openSession = async (id) => {
    try {
      const { data } = await api.get(`/gps-sessions/${id}`);
      setSelected(data.session);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load this GPS route.');
    }
  };

  const clients = assignedClients.length
    ? assignedClients.map((client) => ({ id: client._id, name: client.name }))
    : Array.from(
        new Map(
          sessions.map((item) => [
            typeof item.client === 'object' ? item.client._id : item.client,
            {
              id: typeof item.client === 'object' ? item.client._id : item.client,
              name: displayName(item.client),
            },
          ])
        ).values()
      );

  const displayedSessions = selected
    ? [selected]
    : sessions.filter((item) => item.status === 'completed' || item.status === 'cancelled');

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-forma-brand-teal/30 bg-forma-brand-teal/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-teal"
            >
              <HugeiconsIcon aria-hidden="true" icon={Route} className="mr-1.5 h-3 w-3" />
              LIVE TELEMETRY
            </Badge>

            <Badge
              variant="outline"
              className={
                connected
                  ? 'border-forma-status-success/30 bg-forma-status-success/10 font-mono text-[10px] text-forma-status-success'
                  : 'border-forma-status-warning/30 bg-forma-status-warning/10 font-mono text-[10px] text-forma-status-warning'
              }
            >
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${connected ? 'bg-forma-status-success animate-pulse' : 'bg-forma-status-warning'}`} />
              {connected ? 'WS CONNECTED' : 'POLLING MODE'}
            </Badge>
          </div>

          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            ATHLETE GPS &amp; LIVE TRACKER
          </h1>
          <p className="text-sm text-forma-text-secondary">
            Stream real-time athlete runs, gym workouts, kinematic velocities, and map routes as they occur.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              loadLive();
              loadWorkoutLive();
            }}
            className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised"
          >
            <HugeiconsIcon icon={RefreshCw} className="mr-1.5 h-3.5 w-3.5" />
            Sync Feeds
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {liveNotice && (
        <Alert
          onClick={() => setLiveNotice('')}
          className="cursor-pointer border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success"
        >
          <Zap className="h-4 w-4" />
          <AlertDescription>{liveNotice} (Click to dismiss)</AlertDescription>
        </Alert>
      )}

      {/* KPI Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
              ATHLETES IN LIVE WORKOUT
            </span>
            <Badge variant="secondary" className="bg-forma-bg-surface-raised font-mono text-[10px] text-forma-brand-teal">
              ACTIVE
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="font-display text-4xl font-normal text-forma-text-primary">
                {liveSessions.length + liveWorkouts.length}
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forma-bg-surface-raised text-forma-brand-teal">
                <HugeiconsIcon icon={LocateFixed} className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-1 font-mono text-[11px] text-forma-text-muted">
              {liveSessions.length} GPS runs · {liveWorkouts.length} gym workouts
            </p>
          </CardContent>
        </Card>

        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
              COMPLETED WORKOUTS
            </span>
            <Badge variant="secondary" className="bg-forma-bg-surface-raised font-mono text-[10px] text-forma-text-muted">
              TOTAL
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="font-display text-4xl font-normal text-forma-text-primary">
                {summary.clientTotals.reduce((count, item) => count + item.completedSessions, 0)}
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forma-bg-surface-raised text-forma-brand-ember">
                <HugeiconsIcon icon={CheckCircle2} className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-1 font-mono text-[11px] text-forma-text-muted">
              Across all assigned athletes
            </p>
          </CardContent>
        </Card>

        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
              TOTAL DISTANCE RECORDED
            </span>
            <Badge variant="secondary" className="bg-forma-bg-surface-raised font-mono text-[10px] text-forma-brand-ember">
              GPS
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="font-display text-4xl font-normal text-forma-text-primary">
                {summary.clientTotals
                  .reduce((total, item) => total + item.totalDistanceKm, 0)
                  .toFixed(1)} <span className="text-xl text-forma-text-secondary">KM</span>
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forma-bg-surface-raised text-forma-brand-ember">
                <HugeiconsIcon icon={Route} className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-1 font-mono text-[11px] text-forma-text-muted">
              GPS tracked running and walking
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Live GPS Sessions Grid */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-forma-text-primary">
              <HugeiconsIcon aria-hidden="true" icon={MapPin} className="h-4 w-4 text-forma-status-success" />
              Live GPS Sessions ({liveSessions.length})
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary">
              Click any active session to stream its live map route below.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadLive}
            className="h-8 text-xs text-forma-text-secondary hover:text-forma-text-primary"
          >
            <HugeiconsIcon icon={RefreshCw} className="mr-1.5 h-3.5 w-3.5" />
            Refresh GPS
          </Button>
        </CardHeader>

        <CardContent>
          {!liveSessions.length ? (
            <EmptyState
              type="clients"
              sentence="No assigned athletes are sharing a live GPS session at this time."
              actionLabel="Refresh live feeds"
              onAction={loadLive}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {liveSessions.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => openSession(item._id)}
                  className="rounded-xl border border-forma-status-success/30 bg-forma-status-success/5 p-4 text-left transition hover:border-forma-status-success"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-forma-text-primary">
                        {displayName(item.client)}
                      </p>
                      <p className="font-mono text-xs capitalize text-forma-text-secondary">
                        {item.activityType} · {item.status}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-forma-status-success/40 bg-forma-status-success/10 font-mono text-[10px] text-forma-status-success"
                    >
                      Sharing
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
                    <div className="rounded bg-forma-bg-surface-raised/50 p-1.5">
                      <span className="block font-bold text-forma-text-primary">
                        {Number(item.distanceKm || 0).toFixed(2)} km
                      </span>
                      <span className="text-[10px] text-forma-text-muted">Distance</span>
                    </div>

                    <div className="rounded bg-forma-bg-surface-raised/50 p-1.5">
                      <span className="block font-bold text-forma-text-primary">
                        {duration(item.durationSeconds)}
                      </span>
                      <span className="text-[10px] text-forma-text-muted">Duration</span>
                    </div>

                    <div className="rounded bg-forma-bg-surface-raised/50 p-1.5">
                      <span className="block font-bold text-forma-text-primary">
                        {currentSpeed(item).toFixed(1)} km/h
                      </span>
                      <span className="text-[10px] text-forma-text-muted">Speed</span>
                    </div>

                    <div className="rounded bg-forma-bg-surface-raised/50 p-1.5">
                      <span className="block font-bold text-forma-text-primary">
                        {Number(item.averageSpeedKmh || 0).toFixed(1)} km/h
                      </span>
                      <span className="text-[10px] text-forma-text-muted">Avg Speed</span>
                    </div>
                  </div>

                  <p className="mt-2.5 font-mono text-[11px] text-forma-text-muted">
                    Signal: {signalStatus(item)} · Last ping: {new Date(item.updatedAt).toLocaleTimeString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Gym Workouts Grid */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-forma-text-primary">
              <HugeiconsIcon aria-hidden="true" icon={Dumbbell} className="h-4 w-4 text-forma-brand-ember" />
              Live Strength &amp; Gym Workouts ({liveWorkouts.length})
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary">
              Real-time exercise completion checklist and timer.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadWorkoutLive}
            className="h-8 text-xs text-forma-text-secondary hover:text-forma-text-primary"
          >
            <HugeiconsIcon icon={RefreshCw} className="mr-1.5 h-3.5 w-3.5" />
            Refresh Gym
          </Button>
        </CardHeader>

        <CardContent>
          {!liveWorkouts.length ? (
            <EmptyState
              type="workouts"
              sentence="No assigned clients are actively performing a strength workout right now."
              actionLabel="Refresh workouts"
              onAction={loadWorkoutLive}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {liveWorkouts.map((item) => {
                const total = item.exercises?.length || 0;
                const done = item.exercises?.filter((exercise) => exercise.completed).length || 0;
                return (
                  <Card key={item._id} className="border-forma-brand-ember/30 bg-forma-bg-surface-raised/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-forma-text-primary">
                          {displayName(item.client)}
                        </p>
                        <p className="text-xs text-forma-text-secondary">{item.title}</p>
                      </div>

                      <Badge
                        variant="outline"
                        className={`font-mono text-xs uppercase ${
                          item.status === 'paused'
                            ? 'border-forma-status-warning/40 bg-forma-status-warning/10 text-forma-status-warning'
                            : 'border-forma-status-success/40 bg-forma-status-success/10 text-forma-status-success'
                        }`}
                      >
                        {item.status === 'paused' ? 'Paused' : 'Working Out'}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                      <div className="rounded bg-forma-bg-surface p-2">
                        <span className="block text-base font-bold text-forma-text-primary">
                          {duration(activeSecondsAt(item, tick))}
                        </span>
                        <span className="text-[10px] text-forma-text-muted">Active Time</span>
                      </div>

                      <div className="rounded bg-forma-bg-surface p-2">
                        <span className="block text-base font-bold text-forma-brand-ember">
                          {done}/{total}
                        </span>
                        <span className="text-[10px] text-forma-text-muted">Exercises Logged</span>
                      </div>
                    </div>

                    {total > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-forma-border-subtle pt-2">
                        {item.exercises.map((exercise, index) => (
                          <li key={`${exercise.name}-${index}`} className="flex items-center gap-2 text-xs">
                            {exercise.completed ? (
                              <HugeiconsIcon icon={CheckCircle2} className="h-3.5 w-3.5 text-forma-status-success" />
                            ) : (
                              <HugeiconsIcon icon={Circle} className="h-3.5 w-3.5 text-forma-text-muted" />
                            )}
                            <span
                              className={
                                exercise.completed
                                  ? 'text-forma-text-muted line-through'
                                  : 'text-forma-text-primary'
                              }
                            >
                              {exercise.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Range Client Activity Summary Table */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-forma-text-primary">
              {summaryFrom || summaryTo ? 'Client Activity Summary' : 'Last 7 Days by Athlete'}
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary">
              Aggregated workouts and cardio sessions shared with your coaching account.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(7)}
              className="h-8 border-forma-border-subtle text-xs text-forma-text-secondary hover:text-forma-text-primary"
            >
              7 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(30)}
              className="h-8 border-forma-border-subtle text-xs text-forma-text-secondary hover:text-forma-text-primary"
            >
              30 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(90)}
              className="h-8 border-forma-border-subtle text-xs text-forma-text-secondary hover:text-forma-text-primary"
            >
              90 Days
            </Button>
            {(summaryFrom || summaryTo) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetSummaryRange}
                className="h-8 text-xs text-forma-status-warning"
              >
                Reset
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!weekly.length ? (
            <EmptyState
              type="clients"
              sentence="Athlete activity aggregates will display here once recorded."
              actionLabel="View roster"
              to="/trainer/clients"
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-forma-border-subtle">
              <Table>
                <TableHeader className="bg-forma-bg-surface-raised/50">
                  <TableRow className="border-forma-border-subtle hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Athlete</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Gym Sessions</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Workout Time</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Walking</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Running/Jogging</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekly.map((row) => (
                    <TableRow key={row.clientId} className="border-forma-border-subtle hover:bg-forma-bg-surface-raised/40">
                      <TableCell className="font-bold text-forma-text-primary">
                        {row.clientName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-forma-text-secondary">{row.workouts}</TableCell>
                      <TableCell className="font-mono text-xs text-forma-text-secondary">{duration(row.workoutSeconds)}</TableCell>
                      <TableCell className="font-mono text-xs text-forma-text-secondary">
                        {Number(row.walkingKm || 0).toFixed(2)} km
                        <span className="text-forma-text-muted"> · {duration(row.walkingSeconds)}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-forma-text-secondary">
                        {Number(row.runningKm || 0).toFixed(2)} km
                        <span className="text-forma-text-muted"> · {duration(row.runningSeconds)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History & Map Split Section */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: History Filters & List (5 cols) */}
        <div id="trainer-workout-history" className="space-y-4 lg:col-span-5">
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-forma-text-primary">
                <HugeiconsIcon icon={Users} className="h-4 w-4 text-forma-brand-ember" />
                Completed Session Archive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                  Filter by Athlete
                </label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setPage(1);
                    setSelected(null);
                  }}
                  className="flex h-9 w-full rounded-md border border-forma-border-subtle bg-forma-bg-surface-raised px-3 text-xs text-forma-text-primary outline-none focus:border-forma-brand-ember"
                >
                  <option value="">All assigned athletes</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                    From
                  </label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                      setSelected(null);
                    }}
                    className="h-9 border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                    To
                  </label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                      setSelected(null);
                    }}
                    className="h-9 border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                  />
                </div>
              </div>

              {/* Session List */}
              <div className="max-h-[460px] space-y-2 overflow-y-auto pt-2">
                {loading ? (
                  <p className="py-6 text-center text-xs text-forma-text-secondary">
                    Loading session archive…
                  </p>
                ) : !displayedSessions.length ? (
                  <EmptyState
                    type="workouts"
                    sentence="No sessions match your history filters."
                    actionLabel="Reset filters"
                    onAction={() => {
                      setClientId('');
                      setFrom('');
                      setTo('');
                      setPage(1);
                      setSelected(null);
                    }}
                  />
                ) : (
                  displayedSessions.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => openSession(item._id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selected?._id === item._id
                          ? 'border-forma-brand-ember bg-forma-brand-ember/10'
                          : 'border-forma-border-subtle bg-forma-bg-surface-raised/40 hover:bg-forma-bg-surface-raised'
                      }`}
                    >
                      <p className="font-semibold capitalize text-forma-text-primary">
                        {displayName(item.client)} · {item.activityType}
                      </p>
                      <p className="font-mono text-[11px] text-forma-text-muted">
                        {new Date(item.startedAt).toLocaleDateString()} ·{' '}
                        {Number(item.distanceKm || 0).toFixed(2)} km · {item.status}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between border-t border-forma-border-subtle pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((v) => v - 1)}
                    className="h-8 border-forma-border-subtle text-xs"
                  >
                    Previous
                  </Button>
                  <span className="font-mono text-xs text-forma-text-muted">
                    Page {page} of {pages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= pages}
                    onClick={() => setPage((v) => v + 1)}
                    className="h-8 border-forma-border-subtle text-xs"
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: RunMap & Kinematic Telemetry (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-forma-text-primary">
                Route Visualization &amp; Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forma-border-subtle pb-3">
                    <div>
                      <h3 className="text-lg font-bold capitalize text-forma-text-primary">
                        {displayName(selected.client)} · {selected.activityType}
                      </h3>
                      <p className="font-mono text-xs text-forma-text-muted">
                        {new Date(selected.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs capitalize text-forma-brand-teal">
                      {selected.status}
                    </Badge>
                  </div>

                  <RunMap
                    points={selected.route || []}
                    height="min(50vh, 420px)"
                    sentence="This workout session has no saved GPS coordinates."
                    actionLabel="Return to session list"
                    onAction={() => setSelected(null)}
                  />

                  {/* Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['Distance', `${Number(selected.distanceKm || 0).toFixed(2)} km`],
                      ['Total Time', duration(selected.durationSeconds)],
                      ['Moving Time', duration(selected.movingSeconds)],
                      ['Avg Speed', `${Number(selected.averageSpeedKmh || 0).toFixed(1)} km/h`],
                      ['Max Speed', `${Number(selected.maximumSpeedKmh || 0).toFixed(1)} km/h`],
                      ['Pace', `${Number(selected.averagePaceMinutesPerKm || 0).toFixed(1)} min/km`],
                      ['Calories', `${selected.estimatedCalories || 0} kcal`],
                      ['GPS Coordinates', selected.route?.length || 0],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-forma-border-subtle bg-forma-bg-surface-raised/40 p-2.5 text-xs"
                      >
                        <span className="font-mono text-[10px] uppercase text-forma-text-muted">
                          {label}
                        </span>
                        <p className="mt-0.5 font-bold text-forma-text-primary">{value}</p>
                      </div>
                    ))}
                  </div>

                  <p className="flex items-center gap-1.5 font-mono text-xs text-forma-status-success">
                    <HugeiconsIcon icon={ShieldCheck} className="h-4 w-4" />
                    Athlete granted explicit telemetry and location sharing consent.
                  </p>
                </div>
              ) : (
                <EmptyState
                  type="workouts"
                  sentence="Select a shared live session or completed run from the archive to inspect its GPS telemetry."
                  actionLabel="Browse archive"
                  onAction={() =>
                    document
                      .getElementById('trainer-workout-history')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                  className="min-h-80"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
