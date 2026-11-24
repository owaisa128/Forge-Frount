import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  HugeiconsIcon,
  Activity,
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock,
  Dumbbell,
  Edit,
  ExternalLink,
  Flame,
  Layers,
  Play,
  Tag,
  Trash2,
  TrendingUp,
  Video,
} from "../components/ui/icons";
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
import WorkoutImage from "../components/WorkoutImage";
import WorkoutVideoPlayer from "../components/ui/WorkoutVideoPlayer";
import FeatureImage from "../components/ui/FeatureImage";
import EmptyState from "../components/EmptyState";
import api from "../api/axios";

const getYouTubeEmbedUrl = (value) => {
  try {
    const url = new URL(value);
    let videoId = "";
    if (url.hostname === "youtu.be") videoId = url.pathname.slice(1);
    if (url.hostname.endsWith("youtube.com"))
      videoId =
        url.searchParams.get("v") ||
        url.pathname.split("/").filter(Boolean).pop();
    return videoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
      : "";
  } catch {
    return "";
  }
};

const isDirectVideoUrl = (value) =>
  /\.(mp4|webm|mov|ogg)(?:$|[?#])/i.test(value);

function MetricBox({ icon: Icon, label, value, unit }) {
  return (
    <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-ember/40">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
            {label}
          </span>
          <span className="flex size-7 items-center justify-center rounded-lg bg-forma-bg-surface-raised text-forma-brand-ember">
            <HugeiconsIcon icon={Icon} className="size-4" />
          </span>
        </div>
        <p className="mt-2 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
          {value}
          {unit && (
            <span className="ml-1.5 font-sans text-xs text-forma-text-secondary">
              {unit}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get(`/workouts/${id}`)
      .then(({ data }) => {
        if (!data?.success || !data.workout)
          throw new Error("Workout details were not returned.");
        if (active) setWorkout(data.workout);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Unable to load this workout.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!workout?.videoFileId) return undefined;
    let active = true;
    let objectUrl;
    api
      .get(`/workouts/${id}/video`, { responseType: "blob" })
      .then(({ data }) => {
        if (active) {
          objectUrl = URL.createObjectURL(data);
          setUploadedVideoUrl(objectUrl);
        }
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              "Unable to load the uploaded workout video.",
          );
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUploadedVideoUrl("");
    };
  }, [id, workout?.videoFileId]);

  const exercises = workout?.exercises || [];
  const summary = useMemo(
    () =>
      exercises.reduce(
        (result, exercise) => {
          const sets = Number(exercise.sets) || 0;
          const reps = Number(exercise.reps) || 0;
          const weight = Number(exercise.weight) || 0;
          return {
            sets: result.sets + sets,
            reps: result.reps + sets * reps,
            volume: result.volume + sets * reps * weight,
          };
        },
        { sets: 0, reps: 0, volume: 0 },
      ),
    [exercises],
  );

  const removeWorkout = async () => {
    if (!window.confirm("Are you sure you want to delete this workout?")) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/workouts/${id}`);
      navigate("/workouts");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to delete this workout.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-sm text-forma-text-secondary">
        <Spinner className="size-6 text-forma-brand-ember" />
        <span>Loading workout details…</span>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-xs">
          <Link to="/workouts">
            <HugeiconsIcon icon={ArrowLeft} className="size-4" />
            Training library
          </Link>
        </Button>
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <AlertTitle className="font-semibold">Workout not found</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            {error || "The requested workout plan does not exist or has been removed."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const youtubeUrl = workout.videoUrl && getYouTubeEmbedUrl(workout.videoUrl);
  const directUrl = workout.videoUrl && isDirectVideoUrl(workout.videoUrl);
  const hasVideo = Boolean(workout.videoFileId || youtubeUrl || directUrl);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Top Navigation & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-forma-border-subtle bg-forma-bg-surface text-xs text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-text-primary"
        >
          <Link to="/workouts">
            <HugeiconsIcon icon={ArrowLeft} className="size-4" />
            Training library
          </Link>
        </Button>

        {!workout.isTrainerAssigned && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-forma-border-subtle text-xs hover:border-forma-brand-ember/40 hover:bg-forma-bg-surface-raised"
            >
              <Link to={`/workouts/${id}/edit`}>
                <HugeiconsIcon icon={Edit} className="size-4 text-forma-brand-ember" />
                Edit routine
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeWorkout}
              disabled={deleting}
              className="text-xs text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error"
            >
              {deleting ? <Spinner className="size-4" /> : <HugeiconsIcon icon={Trash2} className="size-4" />}
              Delete
            </Button>
          </div>
        )}
      </div>

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

      {/* Hero Workout Card */}
      <Card className="overflow-hidden border-forma-border-subtle bg-forma-bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="h-56 w-full overflow-hidden bg-forma-bg-surface-raised md:h-full">
            {workout.imageFileId ? (
              <WorkoutImage
                workoutId={workout._id}
                hasImage
                alt={`${workout.title} cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <FeatureImage name="workoutTracking" className="h-full w-full object-cover" />
            )}
          </div>

          <div className="col-span-2 flex flex-col justify-between p-6 sm:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-forma-brand-teal/40 bg-forma-brand-teal/10 font-mono text-xs uppercase text-forma-brand-teal"
                >
                  {workout.category || "General"}
                </Badge>
                {workout.isTrainerAssigned && (
                  <Badge
                    variant="outline"
                    className="border-forma-status-warning/40 bg-forma-status-warning/10 font-mono text-xs text-forma-status-warning"
                  >
                    Assigned by {workout.assignedByTrainer || "Coach"}
                  </Badge>
                )}
                {workout.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-forma-bg-surface-raised px-2 py-0.5 text-[10px] text-forma-text-secondary"
                  >
                    <HugeiconsIcon icon={Tag} className="size-3" />
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
                {workout.title}
              </h1>

              {workout.description && (
                <p className="text-xs leading-relaxed text-forma-text-secondary sm:text-sm">
                  {workout.description}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-forma-border-subtle pt-4 text-xs text-forma-text-disabled">
              {workout.createdAt && (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={CalendarDays} className="size-3.5" />
                  Created {new Date(workout.createdAt).toLocaleDateString()}
                </span>
              )}
              {workout.updatedAt && (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Clock} className="size-3.5" />
                  Updated {new Date(workout.updatedAt).toLocaleDateString()}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Layers} className="size-3.5 text-forma-brand-ember" />
                {exercises.length} exercises
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Metrics */}
      <section
        aria-label="Workout metrics summary"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <MetricBox
          icon={TrendingUp}
          label="Total volume"
          value={summary.volume.toLocaleString()}
          unit="kg"
        />
        <MetricBox
          icon={Dumbbell}
          label="Movements"
          value={exercises.length}
        />
        <MetricBox
          icon={Layers}
          label="Working sets"
          value={summary.sets}
        />
        <MetricBox
          icon={Flame}
          label="Total reps"
          value={summary.reps}
        />
      </section>

      {/* Demonstration Video Section */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-forma-text-primary">
                <HugeiconsIcon icon={Video} className="size-5 text-forma-brand-ember" />
                Technique demonstration
              </CardTitle>
              <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
                Watch the movement demonstration before executing your routine
              </CardDescription>
            </div>
            {workout.videoUrl && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs text-forma-brand-ember hover:bg-forma-brand-ember/10"
              >
                <a href={workout.videoUrl} target="_blank" rel="noreferrer">
                  <HugeiconsIcon icon={ExternalLink} className="size-3.5" />
                  External link
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {hasVideo ? (
            <div className="space-y-4">
              {uploadedVideoUrl && (
                <div className="overflow-hidden rounded-xl border border-forma-border-subtle">
                  <WorkoutVideoPlayer
                    src={uploadedVideoUrl}
                    title={`Uploaded demonstration for ${workout.title}`}
                    downloadName={workout.videoFileName || "workout-video"}
                  />
                </div>
              )}
              {workout.videoFileId && !uploadedVideoUrl && !error && (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-sm text-forma-text-secondary">
                  <Spinner className="size-5" />
                  <span>Loading video stream…</span>
                </div>
              )}
              {youtubeUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-forma-border-subtle">
                  <iframe
                    src={youtubeUrl}
                    title={`${workout.title} demonstration video`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              )}
              {directUrl && !youtubeUrl && (
                <div className="overflow-hidden rounded-xl border border-forma-border-subtle">
                  <WorkoutVideoPlayer
                    src={workout.videoUrl}
                    title={`Video for ${workout.title}`}
                  />
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              type="workouts"
              sentence="There isn't a demonstration video linked to this workout."
              actionLabel={
                workout.isTrainerAssigned ? "Browse workouts" : "Add video"
              }
              to={
                workout.isTrainerAssigned ? "/workouts" : `/workouts/${id}/edit`
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Exercise Plan Details */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="p-5 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-forma-text-primary">
            <HugeiconsIcon icon={Activity} className="size-5 text-forma-brand-teal" />
            Exercise plan
          </CardTitle>
          <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
            {exercises.length
              ? `${exercises.length} prescribed movements in this routine`
              : "No movements have been added to this routine yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {!exercises.length ? (
            <EmptyState
              type="workouts"
              sentence="This workout has no exercise details yet."
              actionLabel={
                workout.isTrainerAssigned ? "Browse workouts" : "Add exercises"
              }
              to={
                workout.isTrainerAssigned ? "/workouts" : `/workouts/${id}/edit`
              }
            />
          ) : (
            <div className="space-y-3">
              {exercises.map((exercise, index) => {
                const volume =
                  (Number(exercise.sets) || 0) *
                  (Number(exercise.reps) || 0) *
                  (Number(exercise.weight) || 0);

                return (
                  <div
                    key={exercise._id || `${exercise.name}-${index}`}
                    className="flex flex-col gap-3 rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised p-4 transition-all sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-forma-bg-surface font-mono text-xs font-bold text-forma-brand-ember">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="font-bold text-forma-text-primary">
                          {exercise.name}
                        </p>
                        {exercise.notes && (
                          <p className="mt-0.5 text-xs text-forma-text-secondary">
                            {exercise.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center sm:gap-6">
                      <div>
                        <p className="font-mono text-[10px] uppercase text-forma-text-disabled">Sets</p>
                        <p className="font-semibold text-forma-text-primary text-xs sm:text-sm">
                          {exercise.sets || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase text-forma-text-disabled">Reps</p>
                        <p className="font-semibold text-forma-text-primary text-xs sm:text-sm">
                          {exercise.reps || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase text-forma-text-disabled">Load</p>
                        <p className="font-semibold text-forma-text-primary text-xs sm:text-sm">
                          {exercise.weight ? `${exercise.weight} kg` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase text-forma-text-disabled">Vol</p>
                        <p className="font-semibold text-forma-brand-ember text-xs sm:text-sm">
                          {volume ? `${volume.toLocaleString()} kg` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA Card: Ready to Train */}
      <Card className="border-forma-brand-ember/30 bg-forma-bg-surface p-6 sm:p-8">
        <CardContent className="flex flex-col gap-5 p-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
              Ready to train this routine?
            </h2>
            <p className="text-xs text-forma-text-secondary sm:text-sm">
              Launch the live session player to track sets, rest timers, and volume.
            </p>
          </div>
          <Button
            asChild
            className="h-11 shrink-0 bg-forma-brand-ember px-6 text-sm font-bold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
          >
            <Link to="/workout-tracker">
              <HugeiconsIcon icon={Play} className="size-4" />
              Start workout session
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
