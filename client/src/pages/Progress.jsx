import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "../components/ui/icons";
import PageHeader from "../components/PageHeader";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Spinner } from "../components/ui/spinner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";
import EmptyState from "../components/EmptyState";
import FirstUseCoachMark from "../components/FirstUseCoachMark";
import MetricHelp from "../components/MetricHelp";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { hasMinimumPlan } from "../utils/membershipAccess";
import { useConfirm } from "../context/ConfirmDialogContext";

const getTodayDateKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const createEmptyForm = () => ({
  date: getTodayDateKey(),
  weight: "",
  chest: "",
  waist: "",
  hips: "",
  biceps: "",
  thighs: "",
  bodyFatPercentage: "",
  benchPressMax: "",
  squatMax: "",
  deadliftMax: "",
  notes: "",
});

const measurementFields = [
  { key: "chest", label: "Chest", unit: "cm" },
  { key: "waist", label: "Waist", unit: "cm" },
  { key: "hips", label: "Hips", unit: "cm" },
  { key: "biceps", label: "Biceps", unit: "cm" },
  { key: "thighs", label: "Thighs", unit: "cm" },
  { key: "bodyFatPercentage", label: "Body fat", unit: "%", max: 100 },
];

const strengthFields = [
  { key: "benchPressMax", label: "Bench press", unit: "kg" },
  { key: "squatMax", label: "Squat", unit: "kg" },
  { key: "deadliftMax", label: "Deadlift", unit: "kg" },
];

const isValidDateKey = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const formatProgressDate = (
  value,
  options = { year: "numeric", month: "short", day: "numeric" },
) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);

function TrendChart({ logs, targetWeight, onAddCheckIn, userId }) {
  const validLogs = logs
    .map((log, index) => ({
      ...log,
      chartWeight: Number(log.weight),
      originalIndex: index,
    }))
    .filter(
      (log) =>
        Number.isFinite(log.chartWeight) &&
        log.chartWeight > 0 &&
        isValidDateKey(log.date),
    )
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        new Date(first.createdAt || 0) - new Date(second.createdAt || 0) ||
        first.originalIndex - second.originalIndex,
    );

  if (!validLogs.length) {
    return (
      <EmptyState
        type="progress"
        sentence="No check-ins yet. Add your first measurement to see your trend."
        actionLabel="Add a check-in"
        onAction={onAddCheckIn}
      />
    );
  }

  const target = Number(targetWeight);
  const hasTarget = Number.isFinite(target) && target > 0;
  const weights = validLogs.map((log) => log.chartWeight);
  const minimumWeight = Math.min(...weights, ...(hasTarget ? [target] : []));
  const maximumWeight = Math.max(...weights, ...(hasTarget ? [target] : []));
  const padding = Math.max((maximumWeight - minimumWeight) * 0.14, 1);
  const min = minimumWeight - padding;
  const max = maximumWeight + padding;
  const weightChange =
    validLogs[validLogs.length - 1].chartWeight - validLogs[0].chartWeight;
  const firstLog = validLogs[0];
  const latestLog = validLogs[validLogs.length - 1];
  const chartConfig = {
    chartWeight: {
      label: "Weight",
      color: "var(--forma-brand-ember)",
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <FirstUseCoachMark
        userId={userId}
        guidanceId="weight-trend-chart"
        title="Reading your weight trend"
      >
        Each point represents a recorded check-in. The dashed horizontal line marks your target weight.
      </FirstUseCoachMark>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-forma-text-secondary">
        <span>
          {formatProgressDate(firstLog.date)} to{" "}
          {formatProgressDate(latestLog.date)}
        </span>
        {validLogs.length > 1 && (
          <Badge
            variant="outline"
            className={`font-mono text-xs ${
              weightChange <= 0
                ? "border-forma-status-success/30 text-forma-status-success"
                : "border-forma-brand-teal/30 text-forma-brand-teal"
            }`}
          >
            {weightChange > 0 ? (
              <HugeiconsIcon icon={ArrowUpRight} className="mr-1 size-3.5" />
            ) : weightChange < 0 ? (
              <HugeiconsIcon icon={ArrowDownRight} className="mr-1 size-3.5" />
            ) : null}
            {weightChange > 0 ? "+" : ""}
            {weightChange.toFixed(1)} kg overall
          </Badge>
        )}
      </div>

      <ChartContainer
        config={chartConfig}
        className="min-h-[220px] w-full"
        aria-label={`Weight trend across ${validLogs.length} check-ins, from ${formatProgressDate(firstLog.date)} at ${firstLog.chartWeight.toFixed(1)} kilograms to ${formatProgressDate(latestLog.date)} at ${latestLog.chartWeight.toFixed(1)} kilograms${hasTarget ? `, with a target of ${target.toFixed(1)} kilograms` : ""}.`}
      >
        <LineChart
          accessibilityLayer
          data={validLogs}
          margin={{ top: 16, right: 12, left: 8, bottom: 4 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            interval="preserveStartEnd"
            tickFormatter={(value) =>
              formatProgressDate(value, { month: "short", day: "numeric" })
            }
            tick={{ fontSize: 10 }}
          />
          <YAxis
            domain={[min, max]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => Number(value).toFixed(1)}
            tick={{ fontSize: 10 }}
            width={40}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatProgressDate(value)}
                formatter={(value) => `${Number(value).toFixed(1)} kg`}
              />
            }
          />
          {hasTarget && (
            <ReferenceLine
              y={target}
              stroke="var(--forma-brand-teal)"
              strokeDasharray="4 4"
              label={{
                value: `Target ${target.toFixed(1)} kg`,
                position: "insideTopRight",
                fill: "var(--forma-brand-teal)",
                fontSize: 10,
              }}
            />
          )}
          <Line
            dataKey="chartWeight"
            type="monotone"
            stroke="var(--color-chartWeight)"
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export default function Progress() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const canTrackStrengthPRs =
    user?.role !== "user" || hasMinimumPlan(user?.membership, "elite");

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchProgressData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [historyResponse, summaryResponse] = await Promise.all([
        api.get("/progress"),
        api.get("/progress/summary"),
      ]);
      setLogs(
        Array.isArray(historyResponse.data?.logs)
          ? historyResponse.data.logs
          : [],
      );
      setSummary(summaryResponse.data?.summary || null);
    } catch (error) {
      setLoadError(
        error.response?.data?.message ||
          error.message ||
          "Could not load your body progress records.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  const openCreateForm = () => {
    setEditingRecord(null);
    setFormData(createEmptyForm());
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (record) => {
    setEditingRecord(record);
    setFormData({
      date: record.date || getTodayDateKey(),
      weight: record.weight != null ? String(record.weight) : "",
      chest: record.chest != null ? String(record.chest) : "",
      waist: record.waist != null ? String(record.waist) : "",
      hips: record.hips != null ? String(record.hips) : "",
      biceps: record.biceps != null ? String(record.biceps) : "",
      thighs: record.thighs != null ? String(record.thighs) : "",
      bodyFatPercentage:
        record.bodyFatPercentage != null
          ? String(record.bodyFatPercentage)
          : "",
      benchPressMax:
        record.benchPressMax != null ? String(record.benchPressMax) : "",
      squatMax: record.squatMax != null ? String(record.squatMax) : "",
      deadliftMax:
        record.deadliftMax != null ? String(record.deadliftMax) : "",
      notes: record.notes || "",
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRecord(null);
    setFormError("");
  };

  const updateFormField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const weight = Number(formData.weight);
    if (!formData.weight || !Number.isFinite(weight) || weight <= 0) {
      setFormError("Enter a body weight greater than zero.");
      return;
    }
    if (!isValidDateKey(formData.date)) {
      setFormError("Enter a valid check-in date.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = editingRecord
        ? await api.put(`/progress/${editingRecord._id}`, formData)
        : await api.post("/progress", formData);

      if (!response.data?.success)
        throw new Error(
          response.data?.message || "Progress record could not be saved.",
        );

      closeForm();
      setFormData(createEmptyForm());
      await fetchProgressData();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          error.message ||
          "Could not save check-in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !(await confirm({
        title: "Delete this progress check-in?",
        description:
          "This check-in will be permanently removed from your progress history.",
        confirmLabel: "Delete check-in",
        destructive: true,
      }))
    )
      return;

    setActionError("");
    try {
      await api.delete(`/progress/${id}`);
      await fetchProgressData();
    } catch (error) {
      setActionError(
        error.response?.data?.message ||
          "Could not delete check-in. Please try again.",
      );
    }
  };

  const sortedLogs = useMemo(
    () => [...logs].sort((first, second) => second.date.localeCompare(first.date)),
    [logs],
  );

  const hasRecords = logs.length > 0;
  const currentWeight =
    hasRecords && Number(summary?.totalLogs) > 0
      ? summary.currentWeight
      : sortedLogs[0]?.weight;
  const weightChange =
    hasRecords && Number(summary?.totalLogs) > 1
      ? Number(summary.weightChange)
      : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        as="header"
        className="flex flex-col gap-5 border-b border-forma-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-3xl space-y-3">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-forma-brand-ember">
            Your progress
          </p>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
              Body progress
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-forma-text-secondary sm:text-base">
              {canTrackStrengthPRs
                ? "Track body measurements, composition, and personal strength records."
                : "Track body weight and circumferences across your fitness journey."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={openCreateForm}
          className="min-h-11 w-full shrink-0 bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
        >
          <HugeiconsIcon aria-hidden="true" icon={Plus} data-icon="inline-start" />
          Log a check-in
        </Button>
      </PageHeader>

      {/* Errors */}
      {(loadError || actionError) && (
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <div className="flex flex-1 items-center justify-between gap-3">
            <div>
              <AlertTitle className="font-semibold">Notice</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                {actionError || loadError}
              </AlertDescription>
            </div>
            {loadError && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchProgressData}
                className="text-forma-status-error hover:bg-forma-status-error/20"
              >
                Retry
              </Button>
            )}
          </div>
        </Alert>
      )}

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] gap-5 overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
          <DialogHeader className="pr-10">
            <DialogTitle className="font-display text-2xl font-normal tracking-tight">
              {editingRecord ? "Edit check-in" : "Log a body check-in"}
            </DialogTitle>
            <DialogDescription>
              Record your body weight and any measurements you want to track.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
            {formError && (
              <Alert
                variant="destructive"
                className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
              >
                <HugeiconsIcon aria-hidden="true" icon={AlertCircle} />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="checkin-date" className="text-forma-text-secondary">
                  Check-in date *
                </FieldLabel>
                <Input
                  id="checkin-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateFormField("date", e.target.value)}
                  required
                  className="border-forma-border-subtle bg-forma-bg-surface-raised text-forma-text-primary"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="checkin-weight" className="text-forma-text-secondary">
                  Body weight (kg) *
                </FieldLabel>
                <Input
                  id="checkin-weight"
                  type="number"
                  step="0.1"
                  min="1"
                  max="500"
                  placeholder="e.g. 78.5"
                  value={formData.weight}
                  onChange={(e) => updateFormField("weight", e.target.value)}
                  required
                  className="border-forma-border-subtle bg-forma-bg-surface-raised text-forma-text-primary"
                />
              </Field>
            </FieldGroup>

            <FieldSet className="gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised p-4">
              <FieldLegend
                variant="label"
                className="mb-0 font-mono text-xs font-normal uppercase tracking-wider text-forma-text-secondary"
              >
                Circumferences &amp; body fat
              </FieldLegend>
              <FieldGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {measurementFields.map((field) => {
                  const id = `checkin-${field.key}`;
                  return (
                    <Field key={field.key}>
                      <FieldLabel htmlFor={id} className="text-xs text-forma-text-secondary">
                        {field.label} ({field.unit})
                      </FieldLabel>
                      <Input
                        id={id}
                        type="number"
                        step="0.1"
                        min="0"
                        max={field.max || 300}
                        value={formData[field.key] || ""}
                        onChange={(e) => updateFormField(field.key, e.target.value)}
                        placeholder="Optional"
                        className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary"
                      />
                    </Field>
                  );
                })}
              </FieldGroup>
            </FieldSet>

            {canTrackStrengthPRs && (
              <FieldSet className="gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised p-4">
                <FieldLegend
                  variant="label"
                  className="mb-0 font-mono text-xs font-normal uppercase tracking-wider text-forma-brand-teal"
                >
                  Strength PR benchmarks
                </FieldLegend>
                <FieldGroup className="grid gap-3 sm:grid-cols-3">
                  {strengthFields.map((field) => {
                    const id = `checkin-${field.key}`;
                    return (
                      <Field key={field.key}>
                        <FieldLabel htmlFor={id} className="text-xs text-forma-text-secondary">
                          {field.label} ({field.unit})
                        </FieldLabel>
                        <Input
                          id={id}
                          type="number"
                          step="0.5"
                          min="0"
                          value={formData[field.key] || ""}
                          onChange={(e) => updateFormField(field.key, e.target.value)}
                          placeholder="Optional"
                          className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary"
                        />
                      </Field>
                    );
                  })}
                </FieldGroup>
              </FieldSet>
            )}

            <Field>
              <FieldLabel htmlFor="checkin-notes" className="text-forma-text-secondary">
                Notes <span className="font-normal text-forma-text-muted">(optional)</span>
              </FieldLabel>
              <Textarea
                id="checkin-notes"
                rows={3}
                maxLength={1000}
                value={formData.notes}
                onChange={(e) => updateFormField("notes", e.target.value)}
                placeholder="Add context for this check-in."
                className="border-forma-border-subtle bg-forma-bg-surface-raised text-forma-text-primary"
              />
            </Field>

            <DialogFooter className="sticky bottom-0 -mx-4 border-t border-forma-border-subtle bg-forma-bg-surface px-4 pt-4 sm:-mx-6 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={submitting}
                className="min-h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="min-h-11 bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
              >
                {submitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Saving…
                  </>
                ) : editingRecord ? (
                  "Save changes"
                ) : (
                  "Save check-in"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Progress Summary Cards */}
      <section
        aria-label="Progress summary"
        className={`grid grid-cols-2 gap-4 ${canTrackStrengthPRs ? "lg:grid-cols-6" : "lg:grid-cols-3"}`}
      >
        <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-ember/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                Current Weight
              </span>
              <Badge
                aria-hidden="true"
                variant="secondary"
                className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
              >
                —
              </Badge>
            </div>
            <p className="mt-2 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
              {loading
                ? "—"
                : currentWeight != null
                  ? `${Number(currentWeight).toFixed(1)} kg`
                  : "—"}
            </p>
            <p className="mt-1 text-[11px] text-forma-text-secondary">
              {hasRecords ? "Latest recorded" : "No check-ins"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-ember/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                Overall Delta
              </span>
              <Badge
                aria-hidden="true"
                variant="secondary"
                className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
              >
                —
              </Badge>
            </div>
            <p className="mt-2 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
              {loading || weightChange === null
                ? "—"
                : `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg`}
            </p>
            <p className="mt-1 text-[11px] text-forma-text-secondary">
              {weightChange === null ? "Requires 2+ entries" : "Since initial check-in"}
            </p>
          </CardContent>
        </Card>

        {canTrackStrengthPRs && (
          <>
            <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-teal/40">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                    Bench PR
                  </span>
                  <Badge
                    aria-hidden="true"
                    variant="secondary"
                    className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
                  >
                    —
                  </Badge>
                </div>
                <p className="mt-2 font-display text-2xl font-normal text-forma-brand-teal sm:text-3xl">
                  {loading || !summary?.maxBench ? "—" : `${summary.maxBench} kg`}
                </p>
                <p className="mt-1 text-[11px] text-forma-text-secondary">Max lift</p>
              </CardContent>
            </Card>

            <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-teal/40">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                    Squat PR
                  </span>
                  <Badge
                    aria-hidden="true"
                    variant="secondary"
                    className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
                  >
                    —
                  </Badge>
                </div>
                <p className="mt-2 font-display text-2xl font-normal text-forma-brand-teal sm:text-3xl">
                  {loading || !summary?.maxSquat ? "—" : `${summary.maxSquat} kg`}
                </p>
                <p className="mt-1 text-[11px] text-forma-text-secondary">Max lift</p>
              </CardContent>
            </Card>

            <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-teal/40">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                    Deadlift PR
                  </span>
                  <Badge
                    aria-hidden="true"
                    variant="secondary"
                    className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
                  >
                    —
                  </Badge>
                </div>
                <p className="mt-2 font-display text-2xl font-normal text-forma-brand-teal sm:text-3xl">
                  {loading || !summary?.maxDeadlift ? "—" : `${summary.maxDeadlift} kg`}
                </p>
                <p className="mt-1 text-[11px] text-forma-text-secondary">Max lift</p>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-ember/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-forma-text-secondary">
                Total Check-ins
              </span>
              <Badge
                aria-hidden="true"
                variant="secondary"
                className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
              >
                —
              </Badge>
            </div>
            <p className="mt-2 font-display text-2xl font-normal text-forma-text-primary sm:text-3xl">
              {loading ? "—" : (summary?.totalLogs ?? logs.length)}
            </p>
            <p className="mt-1 text-[11px] text-forma-text-secondary">Recorded entries</p>
          </CardContent>
        </Card>
      </section>

      {/* Weight Trend Chart Card */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6">
          <div>
            <CardTitle className="font-heading text-lg font-medium tracking-tight text-forma-text-primary">
              Weight trend
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
              {Number(user?.targetWeight) > 0
                ? `Check-ins over time, compared with your ${Number(user.targetWeight).toFixed(1)} kg target`
                : "Check-ins over time"}
            </CardDescription>
          </div>
          {summary?.totalLogs > 0 && (
            <Badge variant="outline" className="font-mono text-xs text-forma-text-secondary">
              {summary.totalLogs} check-ins
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-sm text-forma-text-secondary">
              <Spinner className="size-5" />
              <span>Loading trend line…</span>
            </div>
          ) : loadError ? (
            <p className="py-8 text-center text-sm text-forma-status-error" role="alert">
              Weight history chart is unavailable.
            </p>
          ) : (
            <TrendChart
              logs={logs}
              targetWeight={user?.targetWeight}
              onAddCheckIn={openCreateForm}
              userId={userId}
            />
          )}
        </CardContent>
      </Card>

      {/* Check-in History Table */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6">
          <div>
            <CardTitle className="font-heading text-lg font-medium tracking-tight text-forma-text-primary">
              Check-in history
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
              A dated record of your measurements and strength benchmarks
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs text-forma-text-secondary">
            {loading ? "—" : `${logs.length} entries`}
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-sm text-forma-text-secondary">
              <Spinner className="size-5" />
              <span>Loading records…</span>
            </div>
          ) : !hasRecords ? (
            <div className="p-6">
              <EmptyState
                type="progress"
                sentence="No check-ins yet. Add your first measurement to see your trend."
                actionLabel="Add a check-in"
                onAction={openCreateForm}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-forma-border-subtle hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase text-forma-text-secondary">Date</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-forma-text-secondary">Weight</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-forma-text-secondary">Body Fat</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-forma-text-secondary">Waist</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-forma-text-secondary">Chest</TableHead>
                    {canTrackStrengthPRs && (
                      <TableHead className="font-mono text-xs uppercase text-forma-text-secondary">
                        Bench / Squat / Deadlift
                      </TableHead>
                    )}
                    <TableHead className="text-right font-mono text-xs uppercase text-forma-text-secondary">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.map((log) => (
                    <TableRow
                      key={log._id}
                      className="border-forma-border-subtle transition-colors hover:bg-forma-bg-surface-raised"
                    >
                      <TableCell className="font-medium text-forma-text-primary">
                        <span className="flex items-center gap-1.5 text-xs">
                          <HugeiconsIcon icon={Calendar} className="size-3.5 text-forma-text-disabled" />
                          {formatProgressDate(log.date)}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-forma-brand-ember">
                        {log.weight != null ? `${log.weight} kg` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-forma-text-secondary">
                        {log.bodyFatPercentage != null ? `${log.bodyFatPercentage}%` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-forma-text-secondary">
                        {log.waist != null ? `${log.waist} cm` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-forma-text-secondary">
                        {log.chest != null ? `${log.chest} cm` : "—"}
                      </TableCell>
                      {canTrackStrengthPRs && (
                        <TableCell className="text-xs text-forma-text-primary">
                          {[log.benchPressMax, log.squatMax, log.deadliftMax]
                            .map((v) => (v != null ? `${v} kg` : "—"))
                            .join(" / ")}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(log)}
                            aria-label={`Edit check-in from ${formatProgressDate(log.date)}`}
                            className="size-11 rounded-lg text-forma-text-secondary hover:text-forma-text-primary"
                          >
                            <HugeiconsIcon icon={Pencil} className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(log._id)}
                            aria-label={`Delete check-in from ${formatProgressDate(log.date)}`}
                            className="size-11 rounded-lg text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error"
                          >
                            <HugeiconsIcon icon={Trash2} className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
