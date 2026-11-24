import React, { useCallback, useEffect, useState } from "react";
import {
  HugeiconsIcon,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
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
import { Input } from "../components/ui/input";
import { Spinner } from "../components/ui/spinner";
import { Badge } from "../components/ui/badge";

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const quickAmounts = [250, 500, 750];

export default function WaterTracker() {
  const [date, setDate] = useState(getToday);
  const [goal, setGoal] = useState(2500);
  const [goalInput, setGoalInput] = useState("2500");
  const [totalMl, setTotalMl] = useState(0);
  const [entries, setEntries] = useState([]);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [waterResponse, settingsResponse] = await Promise.all([
        api.get("/water-intake", { params: { date } }),
        api.get("/settings"),
      ]);

      if (
        !waterResponse.data?.success ||
        !Array.isArray(waterResponse.data.entries)
      ) {
        throw new Error("Water intake data could not be loaded.");
      }

      if (!settingsResponse.data?.success || !settingsResponse.data.settings) {
        throw new Error("Water target could not be loaded.");
      }

      const dailyGoal = Number(settingsResponse.data.settings.dailyWaterGoal);
      setGoal(Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 2500);
      setGoalInput(
        String(Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 2500),
      );
      setTotalMl(Number(waterResponse.data.totalMl) || 0);
      setEntries(waterResponse.data.entries);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load water tracking.",
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const addWater = async (amountMl) => {
    if (!Number.isInteger(amountMl) || amountMl < 1 || amountMl > 10000) {
      setError("Enter a water amount between 1 and 10,000 ml.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/water-intake", { date, amountMl });
      if (!data?.success || !data.entry) {
        throw new Error(data?.message || "Water intake was not saved.");
      }
      setCustomAmount("");
      setNotice(`${amountMl} ml added to daily water intake.`);
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to save water intake.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveGoal = async (event) => {
    event.preventDefault();
    const nextGoal = Number(goalInput);
    if (!Number.isInteger(nextGoal) || nextGoal < 250 || nextGoal > 10000) {
      setError("Set a daily water target between 250 and 10,000 ml.");
      return;
    }
    setSavingGoal(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.put("/settings", {
        dailyWaterGoal: nextGoal,
      });
      if (!data?.success) {
        throw new Error(data?.message || "Water target was not saved.");
      }
      setGoal(nextGoal);
      setGoalInput(String(nextGoal));
      setNotice("Daily water target saved.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to save water target.",
      );
    } finally {
      setSavingGoal(false);
    }
  };

  const deleteEntry = async (entryId) => {
    setDeletingId(entryId);
    setError("");
    setNotice("");
    try {
      await api.delete(`/water-intake/${entryId}`);
      setNotice("Water entry removed.");
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to remove water entry.",
      );
    } finally {
      setDeletingId("");
    }
  };

  const progress =
    goal > 0 ? Math.min(Math.round((totalMl / goal) * 100), 100) : 0;
  const remaining = Math.max(goal - totalMl, 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page Header */}
      <PageHeader
        as="header"
        className="flex flex-col gap-4 rounded-2xl border border-forma-border-subtle bg-forma-bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-forma-brand-teal">
            Hydration Tracking
          </span>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            Water Tracker
          </h1>
          <p className="mt-1 text-xs text-forma-text-secondary sm:text-sm">
            Log water intake independently from food meals and macros.
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
            aria-label="Refresh water tracker"
            className="size-10 rounded-xl text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-brand-ember"
          >
            <HugeiconsIcon
              icon={RefreshCw}
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </PageHeader>

      {/* Status Messages */}
      {error && (
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <div className="flex flex-1 items-center justify-between gap-3">
            <div>
              <AlertTitle className="font-semibold">Hydration Tracker Alert</AlertTitle>
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

      {notice && (
        <Alert className="border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success">
          <HugeiconsIcon icon={CheckCircle2} className="size-5 shrink-0 text-forma-status-success" />
          <AlertTitle className="font-semibold text-forma-status-success">Success</AlertTitle>
          <AlertDescription className="text-xs text-forma-status-success/90 sm:text-sm">
            {notice}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-sm text-forma-text-secondary">
          <Spinner className="size-6 text-forma-brand-teal" />
          <span>Loading hydration data…</span>
        </div>
      ) : (
        <>
          {/* Main Hydration Progress Card */}
          <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-teal/40">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-forma-text-secondary">
                    Water Consumed
                  </p>
                  <p className="mt-1 font-display text-4xl font-normal text-forma-text-primary sm:text-5xl">
                    {totalMl.toLocaleString()}
                    <span className="ml-2 font-sans text-sm font-medium text-forma-text-secondary">
                      ml
                    </span>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-forma-text-secondary">
                    Daily Goal
                  </p>
                  <p className="mt-1 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
                    {goal.toLocaleString()} ml
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-forma-bg-surface-raised">
                  <div
                    className="h-full rounded-full bg-forma-brand-teal transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-forma-text-secondary">
                  <span>{progress}% of daily goal completed</span>
                  <span className="font-medium text-forma-text-primary">
                    {remaining
                      ? `${remaining.toLocaleString()} ml remaining`
                      : "Target achieved"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Water Section */}
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="p-5 sm:p-6">
              <CardTitle className="text-lg font-bold text-forma-text-primary">
                Quick log
              </CardTitle>
              <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
                Add standard water volumes or log a custom amount
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => addWater(amount)}
                    className="h-11 border-forma-border-subtle bg-forma-bg-surface-raised text-forma-text-primary hover:border-forma-brand-teal/50 hover:bg-forma-bg-surface-raised/80"
                  >
                    <HugeiconsIcon icon={Droplets} className="size-4 text-forma-brand-teal" />
                    +{amount} ml
                  </Button>
                ))}

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    addWater(Number(customAmount));
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    required
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    placeholder="Custom ml"
                    aria-label="Custom water in milliliters"
                    className="h-11 w-32 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-disabled"
                  />
                  <Button
                    type="submit"
                    disabled={saving || !customAmount}
                    className="h-11 bg-forma-brand-teal text-white hover:bg-forma-brand-teal/90"
                  >
                    {saving ? <Spinner className="size-4" /> : <HugeiconsIcon icon={Plus} className="size-4" />}
                    Add
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Daily Goal Settings */}
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-forma-text-primary">
                    <HugeiconsIcon icon={Settings2} className="size-4 text-forma-brand-teal" />
                    Hydration target setting
                  </CardTitle>
                  <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
                    Configure your daily recommended hydration target
                  </CardDescription>
                </div>

                <form onSubmit={saveGoal} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="250"
                    max="10000"
                    step="50"
                    required
                    value={goalInput}
                    onChange={(event) => setGoalInput(event.target.value)}
                    aria-label="Daily water goal in milliliters"
                    className="h-9 w-28 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                  />
                  <span className="text-xs font-mono text-forma-text-secondary">ml</span>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={savingGoal}
                    className="border-forma-border-subtle text-xs hover:border-forma-brand-teal/40"
                  >
                    {savingGoal ? <Spinner className="size-3" /> : "Save"}
                  </Button>
                </form>
              </div>
            </CardHeader>
          </Card>

          {/* Logged Water Entries */}
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="p-5 sm:p-6">
              <CardTitle className="text-lg font-bold text-forma-text-primary">
                Today&apos;s intake logs
              </CardTitle>
              <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
                Recorded hydration entries for {date}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
              {entries.length === 0 ? (
                <EmptyState
                  type="water"
                  sentence="No hydration logged yet for this date. Drink a glass of water to start tracking."
                  actionLabel="Add 250 ml"
                  onAction={() => addWater(250)}
                />
              ) : (
                <div className="divide-y divide-forma-border-subtle">
                  {entries.map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between py-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-forma-bg-surface-raised text-forma-brand-teal">
                          <HugeiconsIcon icon={Droplets} className="size-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-forma-text-primary">
                            {entry.amountMl.toLocaleString()} ml
                          </p>
                          <time className="text-xs text-forma-text-disabled">
                            {new Date(entry.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEntry(entry._id)}
                        disabled={Boolean(deletingId)}
                        aria-label={`Remove ${entry.amountMl} ml water entry`}
                        className="size-8 text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error"
                      >
                        {deletingId === entry._id ? (
                          <Spinner className="size-4" />
                        ) : (
                          <HugeiconsIcon icon={Trash2} className="size-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
