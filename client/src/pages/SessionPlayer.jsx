import React, { useCallback, useEffect, useState } from "react";
import {
  HugeiconsIcon,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Dumbbell,
  Flag,
  Pause,
  Play,
  ShieldCheck,
  Square,
  Timer,
} from "../components/ui/icons";
import PageHeader from "../components/PageHeader";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Spinner } from "../components/ui/spinner";
import EmptyState from "../components/EmptyState";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { hasFeature } from "../utils/membershipAccess";
import { useConfirm } from "../context/ConfirmDialogContext";

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

export const activeSecondsAt = (session, now) => {
  if (!session) return 0;
  if (!["active", "paused"].includes(session.status))
    return session.activeSeconds || 0;
  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000;
  const pausedNow = session.pausedAt
    ? (now - new Date(session.pausedAt).getTime()) / 1000
    : 0;
  return Math.max(0, elapsed - (session.totalPausedSeconds || 0) - pausedNow);
};

export default function SessionPlayer() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [workoutId, setWorkoutId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const assignedTrainer = user?.membership?.assignedTrainer;
  const assignedTrainerName =
    assignedTrainer && typeof assignedTrainer === "object"
      ? assignedTrainer.name
      : null;

  const loadHistory = useCallback(async () => {
    const { data } = await api.get("/workout-sessions/mine");
    if (!Array.isArray(data.sessions))
      throw new Error("Workout history was not returned.");
    setHistory(data.sessions);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/workouts"),
      api.get("/workout-sessions/current"),
      api.get("/workout-sessions/mine"),
    ])
      .then(([workoutResponse, currentResponse, historyResponse]) => {
        if (!active) return;
        if (
          !Array.isArray(workoutResponse.data?.workouts) ||
          !Array.isArray(historyResponse.data?.sessions)
        ) {
          throw new Error("Workout session data was incomplete.");
        }
        setWorkouts(workoutResponse.data.workouts);
        setSession(currentResponse.data.session || null);
        setHistory(historyResponse.data.sessions);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Unable to load your workouts.",
          );
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const startWorkout = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!workoutId && !customTitle.trim()) {
      setError("Choose a saved workout or enter a name for your session.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/workout-sessions", {
        ...(workoutId ? { workoutId } : { title: customTitle.trim() }),
      });
      setSession(data.session);
      setNotice(
        data.session.shareWithTrainer
          ? "Session started. Your trainer can see it live."
          : "Session started.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to start your workout.",
      );
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status) => {
    if (
      status === "completed" &&
      !(await confirm({
        title: "Finish and save this workout?",
        description:
          "Your completed session will be saved to your workout history.",
        confirmLabel: "Finish workout",
      }))
    )
      return;

    if (
      status === "cancelled" &&
      !(await confirm({
        title: "Cancel and discard this workout?",
        description: "This active workout will not be added to your history.",
        confirmLabel: "Discard workout",
        destructive: true,
      }))
    )
      return;

    setBusy(true);
    setError("");
    try {
      const { data } = await api.patch(
        `/workout-sessions/${session._id}/status`,
        { status },
      );
      if (["completed", "cancelled"].includes(status)) {
        setSession(null);
        setWorkoutId("");
        setCustomTitle("");
        setNotice(
          status === "completed"
            ? `Workout saved: ${formatDuration(data.session.activeSeconds)} active time.`
            : "Workout cancelled.",
        );
        await loadHistory();
      } else {
        setSession(data.session);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to update this workout.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleExercise = async (index) => {
    if (!session) return;
    const completed = !session.exercises[index].completed;
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, position) =>
        position === index ? { ...exercise, completed } : exercise,
      ),
    }));
    try {
      const { data } = await api.patch(
        `/workout-sessions/${session._id}/exercise`,
        {
          index,
          completed,
        },
      );
      setSession(data.session);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update this exercise.",
      );
      setSession((current) => ({
        ...current,
        exercises: current.exercises.map((exercise, position) =>
          position === index ? { ...exercise, completed: !completed } : exercise,
        ),
      }));
    }
  };

  const paused = session?.status === "paused";
  const doneCount =
    session?.exercises?.filter((exercise) => exercise.completed).length || 0;
  const totalCount = session?.exercises?.length || 0;
  const finishedHistory = history
    .filter((item) => item.status !== "active" && item.status !== "paused")
    .slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <PageHeader
        as="header"
        className="flex flex-col gap-4 rounded-2xl border border-forma-border-subtle bg-forma-bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-forma-brand-ember">
            Live Tracker
          </span>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            Session Player
          </h1>
          <p className="mt-1 text-xs text-forma-text-secondary sm:text-sm">
            Execute a saved routine or freestyle workout with live timers and movement check-offs.
          </p>
        </div>

        <span className="flex size-10 items-center justify-center rounded-xl bg-forma-bg-surface-raised text-forma-brand-ember">
          <HugeiconsIcon icon={Dumbbell} className="size-5" />
        </span>
      </PageHeader>

      {error && (
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <AlertTitle className="font-semibold">Notice</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert className="border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success">
          <HugeiconsIcon icon={CheckCircle2} className="size-5 shrink-0 text-forma-status-success" />
          <AlertTitle className="font-semibold text-forma-status-success">Workout Update</AlertTitle>
          <AlertDescription className="text-xs text-forma-status-success/90 sm:text-sm">
            {notice}
          </AlertDescription>
        </Alert>
      )}

      {!loaded ? (
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-sm text-forma-text-secondary">
          <Spinner className="size-6 text-forma-brand-ember" />
          <span>Loading session state…</span>
        </div>
      ) : !session ? (
        /* Start Session Form */
        <Card id="session-start" className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="p-5 sm:p-6">
            <CardTitle className="text-xl font-bold text-forma-text-primary">
              Start a workout session
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
              Select an existing plan from your library or name a custom tracking session
            </CardDescription>
          </CardHeader>

          <form onSubmit={startWorkout}>
            <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="space-y-1.5">
                <Label htmlFor="session-workout" className="text-xs text-forma-text-secondary">
                  Choose saved routine
                </Label>
                <Select value={workoutId} onValueChange={setWorkoutId}>
                  <SelectTrigger
                    id="session-workout"
                    className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm"
                  >
                    <SelectValue placeholder="Choose a routine from library…" />
                  </SelectTrigger>
                  <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                    <SelectItem value="none">Choose a routine from library…</SelectItem>
                    {workouts.map((w) => (
                      <SelectItem key={w._id} value={w._id}>
                        {w.title} {w.isTrainerAssigned ? `· from ${w.assignedByTrainer}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!workoutId && (
                <div className="space-y-1.5">
                  <Label htmlFor="session-title" className="text-xs text-forma-text-secondary">
                    Or enter a custom workout title
                  </Label>
                  <Input
                    id="session-title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Morning Conditioning"
                    maxLength={120}
                    className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm"
                  />
                </div>
              )}

              <div className="rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised p-3.5 text-xs text-forma-text-secondary">
                {assignedTrainerName && hasFeature(user?.membership, "liveTracking") ? (
                  <p className="flex items-center gap-2 text-forma-brand-teal">
                    <HugeiconsIcon icon={ShieldCheck} className="size-4 shrink-0" />
                    Live session sync: Coach {assignedTrainerName} will be able to monitor this session.
                  </p>
                ) : (
                  <p className="flex items-center gap-2">
                    <HugeiconsIcon icon={Timer} className="size-4 shrink-0 text-forma-text-disabled" />
                    Private session: Workout metrics are stored in your private history.
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-0 sm:p-6 sm:pt-0">
              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full bg-forma-brand-ember text-sm font-bold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
              >
                {busy ? <Spinner className="size-4" /> : <HugeiconsIcon icon={Play} className="size-4" />}
                Start workout
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        /* Active Live Session Card */
        <Card className="border-forma-brand-ember/40 bg-forma-bg-surface">
          <CardHeader className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs uppercase ${
                      paused
                        ? "border-forma-status-warning/40 bg-forma-status-warning/10 text-forma-status-warning"
                        : "border-forma-brand-ember/40 bg-forma-brand-ember/10 text-forma-brand-ember"
                    }`}
                  >
                    <span
                      className={`mr-1.5 inline-block size-2 rounded-full ${
                        paused ? "bg-forma-status-warning" : "animate-pulse bg-forma-brand-ember"
                      }`}
                    />
                    {paused ? "Paused" : "In Progress"}
                  </Badge>
                </div>
                <h2 className="mt-2 text-2xl font-bold text-forma-text-primary">
                  {session.title}
                </h2>
                <p className="text-xs text-forma-text-secondary">
                  Started at {new Date(session.startedAt).toLocaleTimeString()}
                </p>
              </div>

              {session.shareWithTrainer && (
                <Badge
                  variant="outline"
                  className="border-forma-brand-teal/40 bg-forma-brand-teal/10 font-mono text-xs text-forma-brand-teal"
                >
                  <HugeiconsIcon icon={ShieldCheck} className="mr-1 size-3.5" />
                  Live with coach
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
            {/* Big Stopwatch Display */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-forma-border-subtle bg-forma-bg-surface-raised p-6 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-forma-text-secondary">
                Active Duration
              </span>
              <p className="mt-1 font-display text-5xl font-normal tracking-tight text-forma-brand-ember sm:text-6xl">
                {formatDuration(activeSecondsAt(session, now))}
              </p>
              {totalCount > 0 && (
                <p className="mt-2 text-xs font-semibold text-forma-text-primary">
                  {doneCount} of {totalCount} movements completed
                </p>
              )}
            </div>

            {/* Session Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => changeStatus(paused ? "active" : "paused")}
                className="h-11 border-forma-border-subtle px-5 text-xs hover:border-forma-brand-teal/50"
              >
                {paused ? (
                  <>
                    <HugeiconsIcon icon={Play} className="size-4 text-forma-brand-teal" />
                    Resume session
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Pause} className="size-4 text-forma-status-warning" />
                    Pause session
                  </>
                )}
              </Button>

              <Button
                type="button"
                disabled={busy}
                onClick={() => changeStatus("completed")}
                className="h-11 bg-forma-brand-ember px-6 text-xs font-bold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
              >
                <HugeiconsIcon icon={Flag} className="size-4" />
                Finish workout
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

            {/* Exercises Checklist */}
            {Boolean(totalCount) && (
              <div className="space-y-3 pt-2">
                <h3 className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Movement Checklist
                </h3>
                <div className="divide-y divide-forma-border-subtle rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised">
                  {session.exercises.map((exercise, index) => (
                    <button
                      key={`${exercise.name}-${index}`}
                      type="button"
                      onClick={() => toggleExercise(index)}
                      disabled={busy}
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-forma-bg-surface"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex size-6 items-center justify-center rounded-full transition-colors ${
                            exercise.completed
                              ? "bg-forma-brand-ember text-forma-bg-base"
                              : "border border-forma-border-subtle text-forma-text-disabled"
                          }`}
                        >
                          {exercise.completed ? (
                            <HugeiconsIcon icon={CheckCircle2} className="size-4" />
                          ) : (
                            <HugeiconsIcon icon={Circle} className="size-3.5" />
                          )}
                        </span>
                        <div>
                          <p
                            className={`font-semibold text-xs sm:text-sm ${
                              exercise.completed
                                ? "text-forma-text-secondary line-through"
                                : "text-forma-text-primary"
                            }`}
                          >
                            {exercise.name}
                          </p>
                          <p className="text-[11px] text-forma-text-disabled">
                            {exercise.sets} sets × {exercise.reps} reps
                            {exercise.weight ? ` · ${exercise.weight} kg` : ""}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          exercise.completed
                            ? "border-forma-brand-ember/30 text-forma-brand-ember"
                            : "border-forma-border-subtle text-forma-text-disabled"
                        }`}
                      >
                        {exercise.completed ? "Done" : "Pending"}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Section */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-forma-text-primary">
                Workout session history
              </CardTitle>
              <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
                Past recorded training sessions
              </CardDescription>
            </div>
            <HugeiconsIcon icon={CalendarDays} className="size-5 text-forma-text-secondary" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {!finishedHistory.length ? (
            <EmptyState
              type="workouts"
              sentence="Your training log is empty — log your first workout to start tracking progress."
              actionLabel="Start a workout"
              onAction={() =>
                document
                  .getElementById("session-start")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            />
          ) : (
            <div className="divide-y divide-forma-border-subtle">
              {finishedHistory.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-forma-text-primary">
                      {item.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-forma-text-secondary">
                      <span>{new Date(item.startedAt).toLocaleString()}</span>
                      <span>·</span>
                      <Badge
                        variant="outline"
                        className={`capitalize text-[10px] ${
                          item.status === "completed"
                            ? "border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success"
                            : "border-forma-border-subtle text-forma-text-disabled"
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-4 sm:flex-col sm:items-end sm:gap-0.5">
                    <p className="font-display text-xl font-normal text-forma-brand-ember sm:text-2xl">
                      {formatDuration(item.activeSeconds)}
                    </p>
                    <p className="text-[11px] text-forma-text-disabled">
                      {item.completedExercises || 0}/{item.totalExercises || 0} movements
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
