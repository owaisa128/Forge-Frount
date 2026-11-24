import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  HugeiconsIcon,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Flag,
  MapPin,
  Pause,
  Play,
  Route,
  ShieldCheck,
  Square,
  Timer,
  Wind,
} from "../components/ui/icons";
import PageHeader from "../components/PageHeader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import RunMap from "../components/RunMap";
import EmptyState from "../components/EmptyState";
import useLiveSocket from "../hooks/useLiveSocket";
import { hasFeature } from "../utils/membershipAccess";
import { useConfirm } from "../context/ConfirmDialogContext";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Spinner } from "../components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const MAX_ROUTE_POINTS = 5000;

const haversineMeters = (first, second) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const summarize = (points) => {
  let meters = 0;
  let movingSeconds = 0;
  let maxSpeed = 0;
  for (let index = 1; index < points.length; index += 1) {
    const before = points[index - 1];
    const current = points[index];
    if (before.segment !== current.segment) continue;
    const seconds =
      (new Date(current.recordedAt) - new Date(before.recordedAt)) / 1000;
    if (
      seconds > 0 &&
      seconds <= 120 &&
      haversineMeters(before, current) >= 2 &&
      haversineMeters(before, current) / seconds <= 15
    ) {
      const segmentMeters = haversineMeters(before, current);
      meters += segmentMeters;
      movingSeconds += seconds;
      maxSpeed = Math.max(maxSpeed, (segmentMeters / seconds) * 3.6);
    }
  }
  const km = meters / 1000;
  return {
    meters,
    km,
    movingSeconds: Math.round(movingSeconds),
    averageSpeed: movingSeconds > 0 ? km / (movingSeconds / 3600) : 0,
    maxSpeed,
    pace: km > 0 ? movingSeconds / 60 / km : 0,
  };
};

const formatDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const formatPace = (pace) => {
  if (!Number.isFinite(pace) || pace <= 0) return "--:--";
  const seconds = Math.round(pace * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const locationError = (error) => {
  if (error.code === 1)
    return "Location permission was denied. Allow location access in your browser settings to start a GPS workout.";
  if (error.code === 2)
    return "Your location is unavailable. Check that location services are enabled and try again.";
  if (error.code === 3)
    return "GPS could not get a fix in time. Move to an area with a clearer signal and try again.";
  return error.message || "Unable to read your location.";
};

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <Card className="border-forma-border-subtle bg-forma-bg-surface-raised transition-all duration-200 hover:border-forma-brand-ember/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-forma-text-secondary">
          <span className="font-mono text-[11px] uppercase tracking-wider">{label}</span>
          <HugeiconsIcon icon={Icon} className="size-4 text-forma-brand-ember" />
        </div>
        <p className="mt-2 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
          {value}
        </p>
        {detail && <p className="mt-0.5 text-[11px] text-forma-text-secondary">{detail}</p>}
      </CardContent>
    </Card>
  );
}

export default function GpsRunTracker() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [activityType, setActivityType] = useState("running");
  const [goal, setGoal] = useState(null);
  const [session, setSession] = useState(null);
  const [points, setPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const watchId = useRef(null);
  const timerId = useRef(null);
  const trackRef = useRef({
    session: null,
    points: [],
    queue: [],
    status: null,
    pausedSeconds: 0,
    pausedAt: null,
    routeSegment: 0,
  });
  const uploadInProgress = useRef(false);
  const uploadPromise = useRef(null);

  const loadGoal = useCallback(() => {
    api
      .get("/goals/mine", { params: { tz: new Date().getTimezoneOffset() } })
      .then(({ data }) => setGoal(data.goal || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  useLiveSocket({ "goal:assigned": loadGoal });

  useEffect(() => {
    let active = true;
    api
      .get("/gps-sessions/mine", { params: { page: historyPage } })
      .then(async ({ data }) => {
        if (!active || !Array.isArray(data.sessions)) return;
        setHistory(data.sessions);
        setHistoryPages(data.pages || 1);
        const ongoing = data.sessions.find((item) =>
          ["active", "paused"].includes(item.status),
        );
        if (!ongoing) {
          setHistoryLoaded(true);
          return;
        }

        try {
          let { data: detailData } = await api.get(
            `/gps-sessions/${ongoing._id}`,
          );
          let restored = detailData.session;
          if (restored.status === "active") {
            try {
              const pausedResponse = await api.patch(
                `/gps-sessions/${restored._id}/status`,
                { status: "paused" },
              );
              restored = pausedResponse.data.session;
            } catch (pauseError) {
              if (pauseError.response?.status !== 409) throw pauseError;
              detailData = await api.get(`/gps-sessions/${restored._id}`);
              restored = detailData.data.session;
            }
          }
          if (!active) return;
          const restoredPoints = restored.route || [];
          const maxSegment = restoredPoints.reduce(
            (max, p) => Math.max(max, Number(p.segment) || 0),
            0,
          );
          trackRef.current = {
            session: restored,
            points: restoredPoints,
            queue: [],
            status: "paused",
            pausedSeconds: restored.pausedDurationSeconds || 0,
            pausedAt: Date.now(),
            routeSegment: maxSegment + 1,
          };
          setSession(restored);
          setPoints(restoredPoints);
          setNotice("Restored ongoing workout in paused state.");
        } catch (detailError) {
          setError(
            detailError.response?.data?.message ||
              "Unable to restore your active workout.",
          );
        } finally {
          if (active) setHistoryLoaded(true);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load your GPS workout history.",
          );
          setHistoryLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [historyPage]);

  const flushPoints = async () => {
    if (uploadInProgress.current) return uploadPromise.current;
    const current = trackRef.current;
    if (!current.session || !current.queue.length) return true;
    const batch = current.queue.slice(0, 30);
    uploadInProgress.current = true;
    uploadPromise.current = (async () => {
      try {
        const { data } = await api.post(
          `/gps-sessions/${current.session._id}/points`,
          { points: batch },
        );
        current.queue = current.queue.slice(batch.length);
        if (data.session) {
          current.session = {
            ...current.session,
            distanceKm: data.session.distanceKm,
            durationSeconds: data.session.durationSeconds,
            movingSeconds: data.session.movingSeconds,
            averageSpeed: data.session.averageSpeed,
            maxSpeed: data.session.maxSpeed,
            pace: data.session.pace,
          };
          setSession(current.session);
        }
        return true;
      } catch (requestError) {
        if (requestError.response?.status === 409) {
          current.queue = [];
          return false;
        }
        return false;
      } finally {
        uploadInProgress.current = false;
        uploadPromise.current = null;
      }
    })();
    return uploadPromise.current;
  };

  const onLocation = (position) => {
    setGpsAccuracy(position.coords.accuracy);
    if (position.coords.accuracy > 40) return;
    const current = trackRef.current;
    if (current.status !== "active") return;
    const point = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      speed: position.coords.speed,
      heading: position.coords.heading,
      recordedAt: new Date(position.timestamp).toISOString(),
      segment: current.routeSegment,
    };
    if (current.points.length >= MAX_ROUTE_POINTS) return;
    current.points = [...current.points, point];
    current.queue = [...current.queue, point];
    setPoints(current.points);
    if (current.queue.length >= 5) flushPoints();
  };

  const startWatching = () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    stopWatching();
    watchId.current = navigator.geolocation.watchPosition(
      onLocation,
      (geoError) => setError(locationError(geoError)),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    timerId.current = window.setInterval(() => {
      setNow(Date.now());
      flushPoints();
    }, 2000);
  };

  const stopWatching = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timerId.current !== null) {
      window.clearInterval(timerId.current);
      timerId.current = null;
    }
  };

  const startWorkout = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { data } = await api.post("/gps-sessions", { activityType });
      trackRef.current = {
        session: data.session,
        points: [],
        queue: [],
        status: "active",
        pausedSeconds: 0,
        pausedAt: null,
        routeSegment: 0,
      };
      setSession(data.session);
      setPoints([]);
      setGpsAccuracy(null);
      startWatching();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to start your GPS workout.",
      );
    } finally {
      setBusy(false);
    }
  };

  const stopWorkout = async (targetStatus) => {
    setBusy(true);
    setError("");
    stopWatching();
    try {
      await flushPoints();
      const current = trackRef.current;
      const { data } = await api.patch(
        `/gps-sessions/${current.session._id}/status`,
        { status: targetStatus },
      );
      if (["completed", "cancelled"].includes(targetStatus)) {
        setSession(null);
        setPoints([]);
        trackRef.current = {
          session: null,
          points: [],
          queue: [],
          status: null,
          pausedSeconds: 0,
          pausedAt: null,
          routeSegment: 0,
        };
        setNotice(
          targetStatus === "completed"
            ? `Workout saved: ${Number(data.session.distanceKm || 0).toFixed(2)} km in ${formatDuration(data.session.durationSeconds)}.`
            : "Workout cancelled and discarded.",
        );
        const historyResponse = await api.get("/gps-sessions/mine", {
          params: { page: 1 },
        });
        setHistory(historyResponse.data.sessions || []);
        setHistoryPages(historyResponse.data.pages || 1);
        setHistoryPage(1);
      } else {
        trackRef.current.status = targetStatus;
        trackRef.current.session = data.session;
        setSession(data.session);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update this GPS workout.",
      );
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status) => {
    if (
      status === "completed" &&
      !(await confirm({
        title: "Finish this GPS workout?",
        description: "Your route and statistics will be saved to your workout history.",
        confirmLabel: "Finish workout",
      }))
    )
      return;

    if (
      status === "cancelled" &&
      !(await confirm({
        title: "Cancel this workout?",
        description: "This active GPS workout will be deleted and will not appear in your history.",
        confirmLabel: "Discard workout",
        destructive: true,
      }))
    )
      return;

    if (status === "active" && trackRef.current.status === "paused") {
      try {
        const { data } = await api.patch(
          `/gps-sessions/${trackRef.current.session._id}/status`,
          { status },
        );
        trackRef.current.status = "active";
        trackRef.current.session = data.session;
        trackRef.current.routeSegment += 1;
        trackRef.current.pausedSeconds += Math.max(
          0,
          Math.floor((Date.now() - trackRef.current.pausedAt) / 1000),
        );
        trackRef.current.pausedAt = null;
        setSession(data.session);
        startWatching();
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to resume GPS workout.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    if (status === "paused") trackRef.current.pausedAt = Date.now();
    await stopWorkout(status);
  };

  useEffect(
    () => () => {
      stopWatching();
      if (trackRef.current.status === "active" && trackRef.current.session) {
        flushPoints()
          .then(
            (saved) =>
              saved &&
              api.patch(
                `/gps-sessions/${trackRef.current.session._id}/status`,
                { status: "paused" },
              ),
          )
          .catch((err) =>
            console.warn("Unable to pause GPS tracking upon unmount:", err),
          );
      }
    },
    [],
  );

  const openHistoryItem = async (id) => {
    try {
      const { data } = await api.get(`/gps-sessions/${id}`);
      setSelectedHistory(data.session);
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to load this GPS route.",
      );
    }
  };

  const active = session && ["active", "paused"].includes(session.status);
  const currentStatus = trackRef.current.status;
  const routeSummary = summarize(points);
  const startTime = session?.startedAt
    ? new Date(session.startedAt).getTime()
    : now;
  const currentPaused =
    currentStatus === "paused" && trackRef.current.pausedAt
      ? Math.floor((now - trackRef.current.pausedAt) / 1000)
      : 0;
  const elapsedSeconds = session
    ? Math.max(0, Math.floor((now - startTime) / 1000))
    : 0;
  const currentSpeed =
    points.length > 1 && currentStatus === "active"
      ? (() => {
          const previous = points[points.length - 2];
          const latest = points[points.length - 1];
          const seconds =
            (new Date(latest.recordedAt) - new Date(previous.recordedAt)) /
            1000;
          return previous.segment === latest.segment &&
            seconds > 0 &&
            now - new Date(latest.recordedAt).getTime() <= 15000
            ? (haversineMeters(previous, latest) / seconds) * 3.6
            : 0;
        })()
      : 0;

  const latestPointAge = points.length
    ? now - new Date(points[points.length - 1].recordedAt).getTime()
    : Infinity;

  const gpsStatus =
    latestPointAge > 30000
      ? "Unavailable"
      : gpsAccuracy === null
        ? "Waiting for fix"
        : gpsAccuracy <= 25
          ? "Strong"
          : "Weak";

  const bodyWeight = Number(user?.weight);
  const estimatedCalories =
    Number.isFinite(bodyWeight) && bodyWeight > 0
      ? Math.round(
          routeSummary.km *
            bodyWeight *
            ((session?.activityType || activityType) === "walking" ? 0.5 : 1),
        )
      : null;

  const assignedTrainer = user?.membership?.assignedTrainer;
  const assignedTrainerName =
    assignedTrainer && typeof assignedTrainer === "object"
      ? assignedTrainer.name
      : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <PageHeader
        as="header"
        className="flex flex-col gap-4 rounded-2xl border border-forma-border-subtle bg-forma-bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-forma-brand-ember">
            Outdoor Conditioning
          </span>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            GPS Run & Route Tracker
          </h1>
          <p className="mt-1 text-xs text-forma-text-secondary sm:text-sm">
            Live outdoor telemetry, pace, distance, and telemetry synchronization with your coach.
          </p>
        </div>

        <span className="flex size-10 items-center justify-center rounded-xl bg-forma-bg-surface-raised text-forma-brand-ember">
          <HugeiconsIcon icon={MapPin} className="size-5" />
        </span>
      </PageHeader>

      {/* Goal Banner */}
      {goal && (
        <Card className="border-forma-brand-teal/30 bg-forma-bg-surface">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-forma-brand-teal">
                Today&apos;s goal from Coach {goal.trainer?.name || "Trainer"}
              </span>
              <Badge
                variant="outline"
                className="border-forma-brand-teal/40 text-xs text-forma-brand-teal"
              >
                {goal.today.met ? "Goal Completed" : `${goal.today.percent}% Complete`}
              </Badge>
            </div>

            <p className="mt-2 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
              {[
                goal.targetDistanceKm > 0 && `${goal.targetDistanceKm} km`,
                goal.targetMinutes > 0 && `${goal.targetMinutes} min`,
              ]
                .filter(Boolean)
                .join(" + ")}
            </p>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-forma-bg-surface-raised">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  goal.today.met ? "bg-forma-status-success" : "bg-forma-brand-teal"
                }`}
                style={{ width: `${Math.min(100, goal.today.percent)}%` }}
              />
            </div>

            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-forma-text-secondary">
              <span>{goal.today.distanceKm} km · {goal.today.minutes} min logged today</span>
              {goal.note && <span>Note: {goal.note}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {error && (
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <AlertTitle className="font-semibold">GPS Error</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert className="border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success">
          <HugeiconsIcon icon={CheckCircle2} className="size-5 shrink-0 text-forma-status-success" />
          <AlertTitle className="font-semibold text-forma-status-success">Status</AlertTitle>
          <AlertDescription className="text-xs text-forma-status-success/90 sm:text-sm">
            {notice}
          </AlertDescription>
        </Alert>
      )}

      {/* Two Column Layout: Map & Live Controls + Live Telemetry */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: Map & Controls (7 cols) */}
        <div className="space-y-6 xl:col-span-7">
          <Card className="overflow-hidden border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6">
              <div>
                <CardTitle className="text-lg font-bold text-forma-text-primary">
                  Live route map
                </CardTitle>
                <CardDescription className="text-xs text-forma-text-secondary">
                  Real-time GPS coordinate path
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={`font-mono text-xs uppercase ${
                  active
                    ? currentStatus === "paused"
                      ? "border-forma-status-warning/40 text-forma-status-warning"
                      : "border-forma-brand-ember/40 bg-forma-brand-ember/10 text-forma-brand-ember"
                    : "border-forma-border-subtle text-forma-text-disabled"
                }`}
              >
                {active
                  ? currentStatus === "paused"
                    ? "Paused"
                    : "GPS Active"
                  : "Standby"}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="overflow-hidden rounded-xl border border-forma-border-subtle">
                <RunMap
                  points={points}
                  height="min(50vh, 420px)"
                  sentence={
                    !active
                      ? "Start an outdoor workout session to record your live route."
                      : "Acquiring GPS fix and initial coordinate point…"
                  }
                  actionLabel={
                    !active
                      ? `Start ${activityType === "walking" ? "walk" : "run"}`
                      : currentStatus === "paused"
                        ? "Resume GPS tracking"
                        : "Retry GPS fix"
                  }
                  onAction={
                    !active
                      ? startWorkout
                      : currentStatus === "paused"
                        ? () => changeStatus("active")
                        : () => startWatching()
                  }
                />
              </div>

              {!active ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-full sm:w-48">
                    <Select
                      value={activityType}
                      onValueChange={setActivityType}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm">
                        <SelectValue placeholder="Activity type" />
                      </SelectTrigger>
                      <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="jogging">Jogging</SelectItem>
                        <SelectItem value="walking">Walking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    disabled={busy || !historyLoaded}
                    onClick={startWorkout}
                    className="h-11 flex-1 bg-forma-brand-ember text-sm font-bold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                  >
                    {busy || !historyLoaded ? (
                      <Spinner className="size-4" />
                    ) : (
                      <HugeiconsIcon icon={Play} className="size-4" />
                    )}
                    {historyLoaded
                      ? `Start ${activityType === "walking" ? "Walk" : "Run"}`
                      : "Checking session state…"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {currentStatus === "active" ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => changeStatus("paused")}
                      className="h-11 flex-1 border-forma-border-subtle text-xs font-bold hover:border-forma-status-warning/40"
                    >
                      <HugeiconsIcon icon={Pause} className="size-4 text-forma-status-warning" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => changeStatus("active")}
                      className="h-11 flex-1 border-forma-border-subtle text-xs font-bold hover:border-forma-brand-teal/40"
                    >
                      <HugeiconsIcon icon={Play} className="size-4 text-forma-brand-teal" />
                      Resume
                    </Button>
                  )}

                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => changeStatus("completed")}
                    className="h-11 flex-1 bg-forma-brand-ember text-xs font-bold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                  >
                    <HugeiconsIcon icon={Flag} className="size-4" />
                    Finish
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => changeStatus("cancelled")}
                    className="h-11 text-xs text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error"
                  >
                    <HugeiconsIcon icon={Square} className="size-4" />
                    Discard
                  </Button>
                </div>
              )}

              {active && (
                <p className="text-[11px] leading-relaxed text-forma-text-disabled">
                  Keep this tab active in foreground while recording. Background tab throttling may interrupt GPS updates.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Telemetry Metrics (5 cols) */}
        <div className="space-y-6 xl:col-span-5">
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="p-5 sm:p-6">
              <CardTitle className="text-lg font-bold text-forma-text-primary">
                Live telemetry
              </CardTitle>
              <CardDescription className="text-xs text-forma-text-secondary">
                Calculated kinematic metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Distance"
                  value={`${routeSummary.km.toFixed(2)} km`}
                  detail={`${Math.round(routeSummary.meters)} meters`}
                  icon={Route}
                />
                <StatCard
                  label="Elapsed time"
                  value={formatDuration(elapsedSeconds)}
                  detail={currentStatus === "paused" ? "Paused" : "Workout time"}
                  icon={Clock3}
                />
                <StatCard
                  label="Moving time"
                  value={formatDuration(routeSummary.movingSeconds)}
                  detail={`Paused: ${formatDuration(trackRef.current.pausedSeconds + currentPaused)}`}
                  icon={Timer}
                />
                <StatCard
                  label="Current speed"
                  value={`${currentSpeed.toFixed(1)} km/h`}
                  icon={Wind}
                />
                <StatCard
                  label="Average speed"
                  value={`${routeSummary.averageSpeed.toFixed(1)} km/h`}
                  icon={Activity}
                />
                <StatCard
                  label="Average pace"
                  value={`${formatPace(routeSummary.pace)} /km`}
                  icon={Clock3}
                />
                <StatCard
                  label="Max speed"
                  value={`${routeSummary.maxSpeed.toFixed(1)} km/h`}
                  icon={Flag}
                />
                <StatCard
                  label="Est. calories"
                  value={estimatedCalories == null ? "—" : `${estimatedCalories} kcal`}
                  detail={
                    estimatedCalories == null
                      ? "Set weight in settings"
                      : "Calculated"
                  }
                  icon={Activity}
                />
              </div>

              {/* Status footer bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forma-border-subtle pt-4 text-xs text-forma-text-secondary">
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={MapPin} className="size-3.5 text-forma-brand-ember" />
                  {points.length} GPS points
                </span>
                <span>
                  Accuracy: <strong className="text-forma-text-primary">{gpsStatus}</strong>
                  {gpsAccuracy !== null && ` (±${Math.round(gpsAccuracy)}m)`}
                </span>
              </div>

              {session?.shareWithTrainer && (
                <div className="flex items-center gap-2 rounded-xl border border-forma-brand-teal/30 bg-forma-brand-teal/10 p-3 text-xs text-forma-brand-teal">
                  <HugeiconsIcon icon={ShieldCheck} className="size-4 shrink-0" />
                  Coach {assignedTrainerName || "Trainer"} is tracking this workout live.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History Section */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="p-5 sm:p-6">
          <CardTitle className="text-lg font-bold text-forma-text-primary">
            Past GPS workouts
          </CardTitle>
          <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
            Saved outdoor runs, walks, and routes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {!historyLoaded ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-sm text-forma-text-secondary">
              <Spinner className="size-5" />
              <span>Loading workouts…</span>
            </div>
          ) : !history.length ? (
            <EmptyState
              type="workouts"
              sentence="Your GPS workout history is empty."
              actionLabel="Start a GPS workout"
              onAction={startWorkout}
            />
          ) : (
            <div className="divide-y divide-forma-border-subtle">
              {history.slice(0, 8).map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => openHistoryItem(item._id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 py-3.5 text-left transition-colors hover:bg-forma-bg-surface-raised"
                >
                  <div>
                    <p className="font-semibold capitalize text-forma-text-primary">
                      {item.activityType} · {item.status}
                    </p>
                    <p className="mt-0.5 text-xs text-forma-text-secondary">
                      {new Date(item.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-normal text-forma-brand-ember sm:text-2xl">
                      {Number(item.distanceKm || 0).toFixed(2)} km
                    </p>
                    <p className="text-xs text-forma-text-secondary">
                      {formatDuration(item.durationSeconds)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedHistory && (
            <div className="mt-6 space-y-4 border-t border-forma-border-subtle pt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold capitalize text-forma-text-primary">
                  {selectedHistory.activityType} route replay ·{" "}
                  {new Date(selectedHistory.startedAt).toLocaleDateString()}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedHistory(null)}
                  className="border-forma-border-subtle text-xs"
                >
                  Close map
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-forma-border-subtle">
                <RunMap
                  points={selectedHistory.route || []}
                  height="min(45vh, 380px)"
                  sentence="This workout has no saved GPS route."
                  actionLabel="Back to GPS history"
                  onAction={() => setSelectedHistory(null)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-forma-text-secondary">
                <span>{Number(selectedHistory.distanceKm || 0).toFixed(2)} km</span>
                <span>·</span>
                <span>{formatDuration(selectedHistory.durationSeconds)} total</span>
                <span>·</span>
                <span>{formatDuration(selectedHistory.movingSeconds)} moving</span>
                <span>·</span>
                <span>{selectedHistory.route?.length || 0} GPS coordinates</span>
              </div>
            </div>
          )}

          {historyPages > 1 && (
            <div className="mt-5 flex items-center justify-between border-t border-forma-border-subtle pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => p - 1)}
                className="border-forma-border-subtle text-xs"
              >
                Previous
              </Button>
              <span className="font-mono text-xs text-forma-text-secondary">
                Page {historyPage} of {historyPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={historyPage >= historyPages}
                onClick={() => setHistoryPage((p) => p + 1)}
                className="border-forma-border-subtle text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
