import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  HugeiconsIcon,
  AlertCircle,
  CalendarDays,
  Droplets,
  Flame,
  Plus,
  RefreshCw,
  Utensils,
} from "../components/ui/icons";
import PageHeader from "../components/PageHeader";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
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
import { Input } from "../components/ui/input";

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const mealNames = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export default function DailyCalories() {
  const [date, setDate] = useState(getToday);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [summaryResult, settingsResult] = await Promise.allSettled([
      api.get("/nutrition/daily-summary", { params: { date } }),
      api.get("/settings"),
    ]);

    if (
      summaryResult.status !== "fulfilled" ||
      !summaryResult.value.data?.success ||
      !summaryResult.value.data.summary ||
      !Array.isArray(summaryResult.value.data.logs)
    ) {
      const requestError =
        summaryResult.status === "rejected" ? summaryResult.reason : null;
      setSummary(null);
      setLogs([]);
      setError(
        requestError?.response?.data?.message ||
          "Daily calorie data could not be loaded. Please retry.",
      );
      setLoading(false);
      return;
    }

    setSummary(summaryResult.value.data.summary);
    setLogs(summaryResult.value.data.logs);

    if (
      settingsResult.status === "fulfilled" &&
      settingsResult.value.data?.success
    ) {
      const dailyGoal = Number(
        settingsResult.value.data.settings?.dailyCalorieTarget,
      );
      setGoal(Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : null);
    } else {
      setGoal(null);
      setError(
        settingsResult.reason?.response?.data?.message ||
          "Your saved calorie target is unavailable.",
      );
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const total = summary?.totalCalories || 0;
  const remaining = goal ? Math.max(goal - total, 0) : null;
  const percent = goal ? Math.min(Math.round((total / goal) * 100), 100) : 0;
  const mealTotals = summary?.byMeal || {};

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page Header */}
      <PageHeader
        as="header"
        className="flex flex-col gap-4 rounded-2xl border border-forma-border-subtle bg-forma-bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-forma-brand-teal">
            Nutrition Tracking
          </span>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            Daily Calories
          </h1>
          <p className="mt-1 text-xs text-forma-text-secondary sm:text-sm">
            Monitor daily calorie consumption versus your target goal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <HugeiconsIcon
                icon={CalendarDays}
                className="size-4 text-forma-text-secondary"
                aria-hidden="true"
              />
            </span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Select date"
              className="h-10 w-full rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised pl-9 text-xs text-forma-text-primary sm:w-44 sm:text-sm"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={load}
            disabled={loading}
            aria-label="Refresh calorie data"
            className="size-10 rounded-xl text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-brand-ember"
          >
            <HugeiconsIcon
              icon={RefreshCw}
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </PageHeader>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <div className="flex flex-1 items-center justify-between gap-3">
            <div>
              <AlertTitle className="font-semibold">Unable to load data</AlertTitle>
              <AlertDescription className="text-xs text-forma-status-error/90 sm:text-sm">
                {error}
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={load}
              className="text-forma-status-error hover:bg-forma-status-error/20"
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {loading ? (
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-sm text-forma-text-secondary">
          <Spinner className="size-6 text-forma-brand-ember" />
          <span>Loading calorie summary…</span>
        </div>
      ) : (
        summary && (
          <>
            {/* Primary Calorie Goal Summary Card */}
            <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-ember/40">
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-forma-text-secondary">
                      Calories Consumed
                    </p>
                    <p className="mt-1 font-display text-4xl font-normal text-forma-text-primary sm:text-5xl">
                      {total.toLocaleString()}
                      <span className="ml-2 font-sans text-sm font-medium text-forma-text-secondary">
                        kcal
                      </span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-forma-text-secondary">
                      Daily Target
                    </p>
                    <p className="mt-1 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
                      {goal ? `${goal.toLocaleString()} kcal` : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-forma-bg-surface-raised">
                    <div
                      className="h-full rounded-full bg-forma-brand-ember transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-forma-text-secondary">
                    <span>
                      {goal
                        ? `${percent}% of daily goal`
                        : "Set a target in Settings to track progress"}
                    </span>
                    {goal && (
                      <span className="font-medium text-forma-text-primary">
                        {remaining
                          ? `${remaining.toLocaleString()} kcal remaining`
                          : "Daily target reached"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 border-t border-forma-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-forma-text-secondary sm:text-sm">
                    <strong className="text-forma-text-primary">{summary.mealCount}</strong>{" "}
                    {summary.mealCount === 1 ? "meal" : "meals"} logged for this date
                  </span>

                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      asChild
                      className="bg-forma-brand-ember text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                    >
                      <Link to="/nutrition">
                        <HugeiconsIcon icon={Utensils} className="size-4" />
                        Log a meal
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-forma-border-subtle bg-forma-bg-surface text-forma-brand-teal hover:bg-forma-bg-surface-raised"
                    >
                      <Link to="/water-tracker">
                        <HugeiconsIcon icon={Droplets} className="size-4" />
                        Water tracker
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calories Breakdown by Meal Type */}
            <section
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Calories by meal category"
            >
              {Object.entries(mealNames).map(([key, label]) => (
                <Card
                  key={key}
                  className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-teal/40"
                >
                  <CardContent className="p-5">
                    <p className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      {label}
                    </p>
                    <p className="mt-2 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
                      {Math.round(mealTotals[key] || 0).toLocaleString()}
                      <span className="ml-1.5 font-sans text-xs text-forma-text-secondary">
                        kcal
                      </span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </section>

            {/* List of Meals for the Day */}
            <Card className="border-forma-border-subtle bg-forma-bg-surface">
              <CardHeader className="p-5 sm:p-6">
                <CardTitle className="text-lg font-bold text-forma-text-primary">
                  Logged meals
                </CardTitle>
                <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
                  All food entries recorded for {date}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                {logs.length === 0 ? (
                  <EmptyState
                    type="meals"
                    sentence="No meals logged yet for this date. Add your first meal to track calories."
                    to="/nutrition"
                    actionLabel="Log a meal"
                  />
                ) : (
                  <div className="divide-y divide-forma-border-subtle">
                    {logs.map((meal) => (
                      <div
                        key={meal._id}
                        className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-forma-text-primary">
                            {meal.foodName}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-1 border-forma-border-subtle font-mono text-[10px] uppercase text-forma-text-secondary"
                          >
                            {mealNames[meal.mealType] || meal.mealType}
                          </Badge>
                        </div>
                        <p className="font-display text-xl font-normal text-forma-brand-ember sm:text-2xl">
                          {Math.round(meal.calories || 0).toLocaleString()}{" "}
                          <span className="font-sans text-xs text-forma-text-secondary">
                            kcal
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}
