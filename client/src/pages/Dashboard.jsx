import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  HugeiconsIcon,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Plus,
  RefreshCw,
  Utensils,
} from "../components/ui/icons";
import { Button } from "../components/ui/button";
import PageHeader from "../components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";
import { Spinner } from "../components/ui/spinner";
import { Badge } from "../components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";
import EmptyState from "../components/EmptyState";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { hasFeatureAccess } from "../utils/membershipAccess";
import { useMembershipDialog } from "../components/MembershipDialogProvider";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(Math.round(Number(value) || 0));

const toDateKey = (date) => date.toISOString().slice(0, 10);

const formatDay = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

const getLastSevenDays = () =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return toDateKey(date);
  });

function MetricCard({ label, value, detail, loading = false }) {
  return (
    <Card className="border-forma-border-subtle bg-forma-bg-surface transition-colors hover:border-forma-brand-ember/40">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-forma-text-secondary">
            {label}
          </p>
          <Badge
            aria-hidden="true"
            variant="secondary"
            className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
          >
            —
          </Badge>
        </div>
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-9 w-28 rounded-lg bg-forma-bg-surface-raised" />
          ) : (
            <p className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
              {value}
            </p>
          )}
        </div>
        <div className="mt-2 text-xs text-forma-text-secondary">
          {loading ? (
            <Skeleton className="h-4 w-36 rounded-md bg-forma-bg-surface-raised" />
          ) : (
            detail
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyCaloriesChart({ days, goal, loading, error }) {
  if (loading) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-sm text-forma-text-secondary">
        <Spinner className="size-5" />
        <span>Loading calorie history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-forma-status-error">
        Calorie history could not be loaded.
      </div>
    );
  }

  if (!days.some((day) => Number(day.summary?.mealCount) > 0)) {
    return (
      <EmptyState
        type="meals"
        sentence="No meals logged this week. Log a meal to see your nutrition trend."
        actionLabel="Log a meal"
        to="/nutrition"
      />
    );
  }

  const chartData = days.map((day) => ({
    day: formatDay(day.date),
    calories: day.summary
      ? Number(day.summary.totalCalories) || 0
      : null,
  }));
  const chartConfig = {
    calories: {
      label: "Calories",
      color: "var(--forma-brand-ember)",
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={chartConfig} className="min-h-[192px] w-full">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 12, right: 12, left: 8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[0, (dataMax) => Math.max(dataMax, goal || 0)]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatNumber}
            tick={{ fontSize: 11 }}
            width={44}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value) => `${formatNumber(value)} kcal`}
              />
            }
          />
          {goal > 0 && (
            <ReferenceLine
              y={goal}
              stroke="var(--forma-brand-teal)"
              strokeDasharray="4 4"
            />
          )}
          <Line
            dataKey="calories"
            type="monotone"
            stroke="var(--color-calories)"
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-4 text-xs text-forma-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-forma-brand-ember" />
          Calories
        </span>
        {goal > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-forma-brand-teal" />
            Daily target ({formatNumber(goal)} kcal)
          </span>
        )}
      </div>
    </div>
  );
}

function ActivityChart({ days, loading, error, accessMessage }) {
  if (loading) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-sm text-forma-text-secondary">
        <Spinner className="size-5" />
        <span>Loading weekly activity…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-forma-status-error">
        Activity history could not be loaded.
      </div>
    );
  }

  if (accessMessage) {
    return (
      <div className="flex min-h-48 items-center justify-center p-4 text-center text-sm text-forma-text-secondary">
        {accessMessage}
      </div>
    );
  }

  const total = days.reduce((sum, day) => sum + day.count, 0);
  if (!total) {
    return (
      <EmptyState
        type="workouts"
        sentence="No workouts logged this week. Log a workout to see your activity."
        actionLabel="Log a workout"
        to="/workout-tracker"
      />
    );
  }

  const chartData = days.map((day) => ({
    day: formatDay(day.date),
    count: day.count,
  }));
  const chartConfig = {
    count: {
      label: "Workouts",
      color: "var(--forma-brand-ember)",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="min-h-[192px] w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          width={28}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) =>
                `${value} ${Number(value) === 1 ? "workout" : "workouts"}`
              }
            />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ChartContainer>
  );
}

function CategoryBreakdown({ workouts, loading, error }) {
  if (loading) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-sm text-forma-text-secondary">
        <Spinner className="size-5" />
        <span>Loading workout categories…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-forma-status-error">
        Workout categories could not be loaded.
      </div>
    );
  }

  const categories = workouts.reduce((counts, workout) => {
    const category = workout.category?.trim() || "General";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});

  const rows = Object.entries(categories).sort(
    (first, second) => second[1] - first[1],
  );
  const max = Math.max(...rows.map(([, count]) => count), 1);

  if (!rows.length) {
    return (
      <EmptyState
        type="workouts"
        sentence="Your training mix will appear after you save a workout plan."
        actionLabel="Create a workout"
        to="/workouts/create"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      {rows.slice(0, 5).map(([category, count]) => (
        <div key={category} className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-forma-text-primary">{category}</span>
            <span className="text-forma-text-secondary">{count}</span>
          </div>
          <Progress
            value={(count / max) * 100}
            aria-label={`${category}: ${count} saved ${count === 1 ? "workout" : "workouts"}`}
            className="h-2 bg-forma-bg-surface-raised **:data-[slot=progress-indicator]:bg-forma-brand-teal"
          />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user: authUser } = useAuth();
  const openMembershipDialog = useMembershipDialog();
  const [userProfile, setUserProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [nutritionWeek, setNutritionWeek] = useState([]);
  const [requestErrors, setRequestErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const dates = useMemo(getLastSevenDays, [refreshKey]);

  const canLoadWorkoutSessions =
    authUser?.role === "user" &&
    hasFeatureAccess(authUser.membership, "workoutTracker");

  const workoutAccessMessage =
    authUser?.role === "user" ? (
      <>
        Workout tracking isn&apos;t included in your current plan.{" "}
        <Button
          type="button"
          variant="link"
          onClick={openMembershipDialog}
          className="h-auto min-h-0 p-0 text-forma-brand-ember underline"
        >
          Compare plans
        </Button>{" "}
        to unlock it.
      </>
    ) : (
      "Workout history is only available to client accounts."
    );

  useEffect(() => {
    let active = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      const requests = [
        { key: "profile", request: api.get("/auth/profile") },
        { key: "workouts", request: api.get("/workouts") },
        ...(canLoadWorkoutSessions
          ? [{ key: "sessions", request: api.get("/workout-sessions/mine") }]
          : []),
        ...dates.map((date) => ({
          key: "nutrition",
          date,
          request: api.get(`/nutrition/daily-summary?date=${date}`),
        })),
      ];

      const results = await Promise.allSettled(
        requests.map(({ request }) => request),
      );

      if (!active) return;

      const errors = {};
      const nutritionByDate = new Map();
      let profile = null;
      let workoutRecords = [];
      let sessionRecords = [];

      const recordError = (key, message) => {
        errors[key] ||= message;
      };

      results.forEach((result, index) => {
        const entry = requests[index];
        if (result.status === "rejected") {
          recordError(
            entry.key,
            result.reason?.response?.data?.message ||
            result.reason?.message ||
            "The request failed.",
          );
          return;
        }

        const data = result.value.data;
        if (data?.success === false) {
          recordError(
            entry.key,
            data.message || "The server rejected the request.",
          );
          return;
        }

        if (entry.key === "profile") {
          if (data?.success && data.user) profile = data.user;
          else recordError("profile", "Profile details were missing.");
        } else if (entry.key === "workouts") {
          const records = Array.isArray(data)
            ? data
            : data?.workouts || data?.data;
          if (Array.isArray(records)) workoutRecords = records;
          else recordError("workouts", "Workout data was missing.");
        } else if (entry.key === "sessions") {
          if (Array.isArray(data?.sessions)) sessionRecords = data.sessions;
          else recordError("sessions", "Workout session data was missing.");
        } else if (entry.key === "nutrition") {
          if (data?.success && data.summary)
            nutritionByDate.set(entry.date, data.summary);
          else recordError("nutrition", "Calorie summary data was missing.");
        }
      });

      setUserProfile(profile);
      setWorkouts(workoutRecords);
      setSessions(sessionRecords);
      setNutritionWeek(
        dates.map((date) => ({
          date,
          summary: nutritionByDate.get(date) || null,
        })),
      );
      setRequestErrors(errors);
      setLoading(false);
    };

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [canLoadWorkoutSessions, dates]);

  const profile = userProfile || authUser;
  const userName = profile?.name || "Athlete";
  const targetCalories = Number(profile?.targetCalories);
  const hasCalorieGoal = Number.isFinite(targetCalories) && targetCalories > 0;
  const today = toDateKey(new Date());
  const todayNutrition =
    nutritionWeek.find((day) => day.date === today)?.summary || null;

  const weeklyActivity = dates.map((date) => ({
    date,
    count: sessions.filter(
      (session) =>
        session.status === "completed" &&
        session.startedAt &&
        toDateKey(new Date(session.startedAt)) === date,
    ).length,
  }));

  const weeklyWorkoutCount = weeklyActivity.reduce(
    (total, day) => total + day.count,
    0,
  );

  const completedSessions = sessions.filter(
    (session) => session.status === "completed",
  );
  const timedSessions = completedSessions
    .map((session) => {
      const activeSeconds = Number(session.activeSeconds);
      return activeSeconds > 0
        ? activeSeconds
        : Number(session.durationSeconds);
    })
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0);

  const averageSessionMinutes = timedSessions.length
    ? Math.round(
      timedSessions.reduce((total, seconds) => total + seconds, 0) /
      timedSessions.length /
      60,
    )
    : 0;

  const recentSessions = [...sessions]
    .filter((session) => !["active", "paused"].includes(session.status))
    .sort(
      (first, second) =>
        new Date(second.startedAt || 0) - new Date(first.startedAt || 0),
    )
    .slice(0, 4);

  const macroTotals = todayNutrition
    ? [
      { label: "Protein", value: todayNutrition.totalProtein },
      { label: "Carbs", value: todayNutrition.totalCarbs },
      { label: "Fat", value: todayNutrition.totalFat },
    ]
    : [];

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const hasErrors = Object.keys(requestErrors).length > 0;
  const errorLabels = {
    profile: "profile",
    workouts: "workout library",
    sessions: "workout history",
    nutrition: "calorie history",
  };
  const errorMessage = Object.entries(requestErrors)
    .map(([key, message]) => `${errorLabels[key] || key}: ${message}`)
    .join("; ");
  const caloriesToday = Number(todayNutrition?.totalCalories) || 0;
  const calorieProgress = hasCalorieGoal
    ? Math.min(Math.max((caloriesToday / targetCalories) * 100, 0), 100)
    : 0;
  const caloriesRemaining = hasCalorieGoal
    ? targetCalories - caloriesToday
    : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        as="header"
        className="flex flex-col gap-5 border-b border-forma-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="flex min-w-0 max-w-3xl flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-forma-brand-ember">
              Athlete overview
            </p>
            {profile?.fitnessGoal && (
              <Badge
                variant="outline"
                className="border-forma-brand-teal/40 bg-forma-brand-teal/10 text-forma-brand-teal"
              >
                Focus: {profile.fitnessGoal}
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
              Welcome back, {userName}
            </h1>
            <p className="flex items-center gap-2 text-sm leading-6 text-forma-text-secondary">
              <HugeiconsIcon
                icon={CalendarDays}
                className="size-4 shrink-0"
                aria-hidden="true"
              />
              {dateLabel}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button
            asChild
            className="min-h-11 w-full bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
          >
            <Link to="/workout-tracker">
              <HugeiconsIcon icon={Plus} data-icon="inline-start" />
              Log a workout
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-11 w-full border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised sm:w-auto"
          >
            <Link to="/nutrition">
              <HugeiconsIcon icon={Utensils} data-icon="inline-start" />
              Log a meal
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Partial Errors Alert */}
      {hasErrors && (
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AlertTitle className="font-semibold">
                Some dashboard data could not be loaded
              </AlertTitle>
              <AlertDescription className="text-xs text-forma-status-error/90 sm:text-sm">
                {errorMessage}
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="shrink-0 text-forma-status-error hover:bg-forma-status-error/20"
            >
              <HugeiconsIcon icon={RefreshCw} data-icon="inline-start" />
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Stat Metric Cards */}
      <section
        aria-label="Training summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <MetricCard
          label="Today's Calories"
          value={
            requestErrors.nutrition
              ? "Unavailable"
              : `${formatNumber(todayNutrition?.totalCalories)} kcal`
          }
          detail={
            requestErrors.nutrition
              ? "Calorie history unavailable"
              : todayNutrition
              ? `${formatNumber(todayNutrition.mealCount)} meals logged today`
              : "No meals logged today"
          }
          loading={loading}
        />
        <MetricCard
          label="Weekly Workouts"
          value={
            !canLoadWorkoutSessions
              ? "—"
              : requestErrors.sessions
                ? "Unavailable"
                : weeklyWorkoutCount
          }
          detail={
            canLoadWorkoutSessions ? "Completed this week" : workoutAccessMessage
          }
          loading={loading}
        />
        <MetricCard
          label="Avg Session Time"
          value={
            !canLoadWorkoutSessions
              ? "—"
              : requestErrors.sessions
                ? "Unavailable"
                : `${averageSessionMinutes} min`
          }
          detail={
            !canLoadWorkoutSessions
              ? workoutAccessMessage
              : requestErrors.sessions
                ? "Session history unavailable"
                : timedSessions.length
                  ? `Across ${timedSessions.length} recent sessions`
                  : completedSessions.length
                    ? "No duration recorded"
                    : "No completed sessions"
          }
          loading={loading}
        />
      </section>

      {/* Charts & Detail Grid */}
      <section
        aria-label="Training and nutrition activity"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        {/* Weekly Calories Chart */}
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="flex flex-row items-start justify-between gap-4 p-5 sm:p-6">
            <div>
              <CardTitle className="text-lg font-medium text-forma-text-primary">
                Calories this week
              </CardTitle>
              <CardDescription className="text-sm text-forma-text-secondary">
                Daily intake over the last seven days
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-forma-brand-ember hover:bg-forma-brand-ember/10">
              <Link to="/nutrition">
                Nutrition <HugeiconsIcon icon={ArrowRight} data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
            <WeeklyCaloriesChart
              days={nutritionWeek}
              goal={hasCalorieGoal ? targetCalories : 0}
              loading={loading}
              error={requestErrors.nutrition}
            />
          </CardContent>
        </Card>

        {/* Today's Goal Progress */}
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="p-5 sm:p-6">
            <CardTitle className="text-lg font-medium text-forma-text-primary">
              Today&apos;s target
            </CardTitle>
            <CardDescription className="text-sm text-forma-text-secondary">
              Daily calorie & macronutrient progress
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
                  {todayNutrition
                    ? `${formatNumber(todayNutrition.totalCalories)} kcal`
                    : "No intake logged"}
                </span>
                <span className="text-xs text-forma-text-secondary sm:text-sm">
                  {hasCalorieGoal
                    ? `Goal: ${formatNumber(targetCalories)} kcal`
                    : (
                      <Link
                        to="/settings"
                        className="text-forma-brand-ember underline underline-offset-4 hover:text-forma-brand-ember-hover"
                      >
                        Set a daily target
                      </Link>
                    )}
                </span>
              </div>
              {hasCalorieGoal && !loading && (
                <div className="flex flex-col gap-2">
                  <Progress
                    value={calorieProgress}
                    aria-label={`${formatNumber(caloriesToday)} of ${formatNumber(targetCalories)} calories consumed`}
                    className="h-3 bg-forma-bg-surface-raised **:data-[slot=progress-indicator]:bg-forma-brand-ember"
                  />
                  <p className="text-xs text-forma-text-secondary">
                    {caloriesRemaining >= 0
                      ? `${formatNumber(caloriesRemaining)} kcal remaining`
                      : `${formatNumber(Math.abs(caloriesRemaining))} kcal over target`}
                  </p>
                </div>
              )}
            </div>

            {todayNutrition && macroTotals.length > 0 && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {macroTotals.map((macro) => (
                  <div
                    key={macro.label}
                    className="rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised p-3 text-center"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-forma-text-secondary sm:text-xs">
                      {macro.label}
                    </p>
                    <p className="mt-1 font-display text-xl font-normal text-forma-text-primary sm:text-2xl">
                      {formatNumber(macro.value)}
                      <span className="ml-1 text-xs font-sans text-forma-text-secondary">
                        g
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workout Activity */}
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="flex flex-row items-start justify-between gap-4 p-5 sm:p-6">
            <div>
              <CardTitle className="text-lg font-medium text-forma-text-primary">
                Workout activity
              </CardTitle>
              <CardDescription className="text-sm text-forma-text-secondary">
                Completed sessions over the last seven days
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border-forma-border-subtle font-mono text-xs text-forma-text-primary"
            >
              {!canLoadWorkoutSessions
                ? "—"
                : loading
                  ? "—"
                  : requestErrors.sessions
                    ? "—"
                    : `${weeklyWorkoutCount} sessions`}
            </Badge>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
            <ActivityChart
              days={weeklyActivity}
              loading={loading}
              error={requestErrors.sessions}
              accessMessage={
                canLoadWorkoutSessions ? null : workoutAccessMessage
              }
            />
          </CardContent>
        </Card>

        {/* Training Mix */}
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="flex flex-row items-start justify-between gap-4 p-5 sm:p-6">
            <div>
              <CardTitle className="text-lg font-medium text-forma-text-primary">
                Training mix
              </CardTitle>
              <CardDescription className="text-sm text-forma-text-secondary">
                Saved workout plans grouped by category
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-forma-brand-teal hover:bg-forma-brand-teal/10">
              <Link to="/workouts">
                Workouts <HugeiconsIcon icon={ArrowRight} data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
            <CategoryBreakdown
              workouts={workouts}
              loading={loading}
              error={requestErrors.workouts}
            />
          </CardContent>
        </Card>
      </section>

      {/* Recent Sessions */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <CardTitle className="text-lg font-medium text-forma-text-primary">
              Recent sessions
            </CardTitle>
            <CardDescription className="text-sm text-forma-text-secondary">
              Your latest logged workouts
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-forma-brand-ember hover:bg-forma-brand-ember/10">
            <Link to="/workout-tracker">
              Session player <HugeiconsIcon icon={ArrowRight} data-icon="inline-end" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-sm text-forma-text-secondary">
              <Spinner className="size-5" />
              <span>Loading recent workouts…</span>
            </div>
          ) : !canLoadWorkoutSessions ? (
            <p className="py-6 text-center text-sm text-forma-text-secondary">
              {workoutAccessMessage}
            </p>
          ) : requestErrors.sessions ? (
            <p className="py-6 text-center text-sm text-forma-status-error" role="alert">
              Workout session history could not be loaded. Use Retry above to try again.
            </p>
          ) : recentSessions.length ? (
            <div className="divide-y divide-forma-border-subtle">
              {recentSessions.map((session) => (
                <Link
                  key={session._id}
                  to="/workout-tracker"
                  className="group flex flex-col gap-3 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-forma-bg-surface-raised text-forma-brand-ember transition-colors group-hover:bg-forma-brand-ember group-hover:text-forma-bg-base">
                      <HugeiconsIcon icon={Dumbbell} className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-forma-text-primary transition-colors group-hover:text-forma-brand-ember">
                        {session.title}
                      </p>
                      <p className="text-xs text-forma-text-secondary">
                        {session.completedExercises || 0} of {session.totalExercises || 0} exercises completed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <Badge
                      variant="outline"
                      className="border-forma-border-subtle bg-forma-bg-surface-raised text-xs capitalize text-forma-text-secondary"
                    >
                      {session.status}
                    </Badge>
                    <time className="text-xs text-forma-text-disabled">
                      {session.startedAt
                        ? new Date(session.startedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                        : "N/A"}
                    </time>
                    <HugeiconsIcon
                      icon={ArrowRight}
                      className="size-4 text-forma-text-secondary transition-transform group-hover:translate-x-1 group-hover:text-forma-brand-ember"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              type="workouts"
              sentence="Your training log is empty — log your first workout to start tracking progress."
              actionLabel="Log a workout"
              to="/workout-tracker"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
