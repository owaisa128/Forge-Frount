import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  HugeiconsIcon,
  AlertCircle,
  CalendarDays,
  Dumbbell,
  Eye,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
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
import { Field, FieldGroup, FieldLabel } from "../components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Spinner } from "../components/ui/spinner";
import EmptyState from "../components/EmptyState";
import WorkoutImage from "../components/WorkoutImage";
import api from "../api/axios";

const CATEGORIES = [
  "All",
  "Strength",
  "Cardio",
  "Flexibility",
  "HIIT",
  "Endurance",
  "Other",
];

export default function WorkoutLibrary() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const activeRequest = useRef(null);

  const loadWorkouts = useCallback(async (searchTerm, categoryTerm) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryTerm !== "All") params.category = categoryTerm;
      const { data } = await api.get("/workouts", {
        params,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!data?.success || !Array.isArray(data.workouts)) {
        throw new Error("Workout list was not returned.");
      }
      setWorkouts(data.workouts);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load your workouts.",
      );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadWorkouts(search, selectedCategory);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [loadWorkouts, search, selectedCategory]);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    },
    [],
  );

  const removeWorkout = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/workouts/${deleteTarget._id}`);
      setWorkouts((current) =>
        current.filter((item) => item._id !== deleteTarget._id),
      );
      setDeleteTarget(null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to delete this workout.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <PageHeader
        as="header"
        className="flex flex-col gap-5 border-b border-forma-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-forma-brand-ember">
            Your training
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
              Workout library
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-forma-text-secondary">
              Browse your saved routines, review exercises, or build a new plan.
            </p>
          </div>
        </div>

        <Button
          asChild
          className="min-h-11 w-full shrink-0 bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
        >
          <Link to="/workouts/create">
            <HugeiconsIcon icon={Plus} data-icon="inline-start" />
            Create workout
          </Link>
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <section
        aria-label="Filter workouts"
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <FieldGroup className="flex-1 gap-3 sm:flex-row">
          <Field className="min-w-0 flex-1">
            <FieldLabel htmlFor="workout-search" className="sr-only">
              Search workouts
            </FieldLabel>
            <div className="relative min-w-0">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <HugeiconsIcon
                  icon={Search}
                  className="size-4 text-forma-text-secondary"
                  aria-hidden="true"
                />
              </span>
              <Input
                id="workout-search"
                type="search"
                placeholder="Search workouts"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised pl-9 text-sm text-forma-text-primary"
              />
            </div>
          </Field>

          <Field className="w-full sm:w-52">
            <FieldLabel htmlFor="workout-category" className="sr-only">
              Filter by workout category
            </FieldLabel>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger
                id="workout-category"
                className="h-11 w-full rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary"
              >
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                <SelectGroup>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "All" ? "All categories" : cat}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </section>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <div className="flex flex-1 items-center justify-between gap-3">
            <div>
              <AlertTitle className="font-semibold">Library Error</AlertTitle>
              <AlertDescription className="text-xs text-forma-status-error/90 sm:text-sm">
                {error}
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => loadWorkouts(search, selectedCategory)}
              className="text-forma-status-error hover:bg-forma-status-error/20"
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Workouts Grid */}
      {loading ? (
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-sm text-forma-text-secondary">
          <Spinner className="size-6 text-forma-brand-ember" />
          <span>Loading workouts…</span>
        </div>
      ) : !workouts.length && !error ? (
        <EmptyState
          type="workouts"
          sentence={
            search || selectedCategory !== "All"
              ? "No workouts match your search. Reset filters to see your routines."
              : "Your training log is empty — create your first workout to start tracking progress."
          }
          actionLabel={
            search || selectedCategory !== "All"
              ? "Reset filters"
              : "Create a workout"
          }
          to={
            search || selectedCategory !== "All" ? undefined : "/workouts/create"
          }
          onAction={
            search || selectedCategory !== "All"
              ? () => {
                  setSearch("");
                  setSelectedCategory("All");
                  loadWorkouts("", "All");
                }
              : undefined
          }
        />
      ) : !workouts.length ? (
        <p className="py-8 text-center text-sm text-forma-text-secondary">
          The workout list is unavailable until the request succeeds. Retry above to try again.
        </p>
      ) : (
        <section
          aria-labelledby="saved-workouts-title"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h2
                id="saved-workouts-title"
                className="text-lg font-medium text-forma-text-primary"
              >
                Saved workouts
              </h2>
              <p className="text-sm text-forma-text-secondary">
                {workouts.length} {workouts.length === 1 ? "routine" : "routines"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {workouts.map((workout) => (
              <Card
                key={workout._id}
                className="group flex flex-col overflow-hidden border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-forma-brand-ember/40"
              >
                <div className="flex h-40 items-center justify-center overflow-hidden bg-forma-bg-surface-raised">
                  {workout.imageFileId ? (
                    <WorkoutImage
                      workoutId={workout._id}
                      hasImage
                      alt={`${workout.title} workout cover`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-16 items-center justify-center rounded-2xl border border-forma-border-subtle bg-forma-bg-surface text-forma-brand-ember"
                    >
                      <HugeiconsIcon icon={Dumbbell} className="size-8" />
                    </span>
                  )}
                </div>

                <CardHeader className="flex flex-col gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className="border-forma-border-subtle font-mono text-[10px] uppercase tracking-wider text-forma-brand-teal"
                    >
                      {workout.category || "General"}
                    </Badge>
                    {workout.createdAt && (
                      <time
                        dateTime={workout.createdAt}
                        className="flex items-center gap-1.5 text-xs text-forma-text-secondary"
                      >
                        <HugeiconsIcon
                          icon={CalendarDays}
                          className="size-3.5"
                          aria-hidden="true"
                        />
                        {new Date(workout.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    )}
                  </div>
                  <CardTitle className="text-xl font-medium leading-snug text-forma-text-primary">
                    <Link
                      to={`/workouts/${workout._id}`}
                      className="rounded-sm outline-none transition-colors hover:text-forma-brand-ember focus-visible:ring-2 focus-visible:ring-forma-brand-ember"
                    >
                      {workout.title}
                    </Link>
                  </CardTitle>
                  {workout.isTrainerAssigned && (
                    <Badge
                      variant="secondary"
                      className="w-fit bg-forma-status-warning/10 text-forma-status-warning"
                    >
                      Assigned by {workout.assignedByTrainer || "your coach"} · Read-only
                    </Badge>
                  )}
                  {workout.description && (
                    <CardDescription className="line-clamp-2 text-sm leading-6 text-forma-text-secondary">
                      {workout.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
                  <div className="flex items-center gap-2 text-sm text-forma-text-secondary">
                    <HugeiconsIcon
                      icon={Layers}
                      className="size-4 text-forma-brand-ember"
                      aria-hidden="true"
                    />
                    <span>
                      {workout.exercises?.length || 0}{" "}
                      {workout.exercises?.length === 1 ? "exercise" : "exercises"}
                    </span>
                  </div>

                  {workout.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {workout.tags.slice(0, 4).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-forma-bg-surface-raised text-xs font-normal text-forma-text-secondary"
                        >
                          <HugeiconsIcon
                            icon={Tag}
                            className="size-3"
                            aria-hidden="true"
                          />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex items-center justify-between gap-2 border-t border-forma-border-subtle p-4 sm:p-5">
                  <Button
                    asChild
                    variant="outline"
                    className="min-h-11 flex-1 border-forma-border-subtle text-sm hover:bg-forma-bg-surface-raised"
                  >
                    <Link to={`/workouts/${workout._id}`}>
                      <HugeiconsIcon icon={Eye} data-icon="inline-start" />
                      View details
                    </Link>
                  </Button>

                  {!workout.isTrainerAssigned && (
                    <div className="flex items-center gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${workout.title}`}
                        className="size-11 rounded-xl text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-text-primary"
                      >
                        <Link to={`/workouts/${workout._id}/edit`}>
                          <HugeiconsIcon icon={Pencil} />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${workout.title}`}
                        onClick={() => setDeleteTarget(workout)}
                        className="size-11 rounded-xl text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error"
                      >
                        <HugeiconsIcon icon={Trash2} />
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Delete “{deleteTarget?.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-forma-text-secondary sm:text-sm">
              This will permanently remove this workout routine from your library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="border-forma-border-subtle text-xs"
            >
              Keep workout
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                removeWorkout();
              }}
              className="bg-forma-status-error text-xs font-semibold text-white hover:bg-forma-status-error/90"
            >
              {deleting ? <Spinner className="size-4" /> : null}
              Delete workout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
