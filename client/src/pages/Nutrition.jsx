import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  HugeiconsIcon,
  Utensils,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  AlertCircle,
} from "../components/ui/icons";
import PageHeader from "../components/PageHeader";
import api from "../api/axios";
import { useConfirm } from "../context/ConfirmDialogContext";
import { useAuth } from "../context/AuthContext";
import { hasMinimumPlan } from "../utils/membershipAccess";
import PlanFeaturesPanel from "../components/PlanFeaturesPanel";
import EmptyState from "../components/EmptyState";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Field, FieldGroup, FieldLabel } from "../components/ui/field";
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
import { Progress } from "../components/ui/progress";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../components/ui/toggle-group";

const getValueForQuantity = (nutrition, quantity, nutrient) => {
  const amount = Number(
    quantity
      .trim()
      .match(/(\d+(?:[.,]\d+)?)/)?.[1]
      ?.replace(",", "."),
  );
  const unit = quantity.trim().toLowerCase();
  const weightMatch = unit.match(/^\s*\d+(?:[.,]\d+)?\s*(kg|g|grams?)\s*$/);
  const per100g =
    nutrient === "calories"
      ? nutrition.caloriesPer100g
      : nutrition[`${nutrient}Per100g`];

  if (weightMatch && Number.isFinite(amount)) {
    const grams = weightMatch[1] === "kg" ? amount * 1000 : amount;
    return (per100g * grams) / 100;
  }

  const perServing =
    nutrient === "calories"
      ? nutrition.caloriesPerServing
      : nutrition[`${nutrient}PerServing`];

  if (Number.isFinite(perServing) && Number.isFinite(amount)) {
    return perServing * amount;
  }

  if (nutrition.servingGrams && Number.isFinite(amount)) {
    return (per100g * nutrition.servingGrams * amount) / 100;
  }

  return per100g;
};

const roundNutritionValue = (value, field) =>
  field === "calories" ? Math.round(value) : Math.round(value * 10) / 10;

const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

export default function Nutrition() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const canTrackMacros =
    user?.role !== "user" || hasMinimumPlan(user?.membership, "basic");

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  const [summary, setSummary] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    mealCount: 0,
  });

  const [logs, setLogs] = useState([]);
  const [trainerMealPlans, setTrainerMealPlans] = useState([]);
  const [trainerMealsError, setTrainerMealsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [calorieGoal, setCalorieGoal] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedMealFilter, setSelectedMealFilter] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    date: selectedDate,
    mealType: "breakfast",
    foodName: "",
    quantity: "1 serving",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [foodLookup, setFoodLookup] = useState({ status: "idle", match: null });
  const calorieManuallyEdited = useRef(false);
  const manuallyEditedFields = useRef(new Set());

  const fetchNutritionData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const [summaryResult, settingsResult, trainerMealsResult] =
      await Promise.allSettled([
        api.get("/nutrition/daily-summary", { params: { date: selectedDate } }),
        api.get("/settings"),
        api.get("/trainer-workspace/meal-plans"),
      ]);

    if (
      summaryResult.status === "fulfilled" &&
      summaryResult.value.data?.success &&
      summaryResult.value.data.summary &&
      Array.isArray(summaryResult.value.data.logs)
    ) {
      setSummary(summaryResult.value.data.summary);
      setLogs(summaryResult.value.data.logs);
    } else {
      const error =
        summaryResult.status === "rejected" ? summaryResult.reason : null;
      setSummary({
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        mealCount: 0,
      });
      setLogs([]);
      setLoadError(
        error?.response?.data?.message ||
          "Nutrition data could not be loaded. Please retry.",
      );
    }

    if (settingsResult.status === "fulfilled" && settingsResult.value.data?.success) {
      const goal = Number(settingsResult.value.data.settings?.dailyCalorieTarget);
      setCalorieGoal(Number.isFinite(goal) && goal > 0 ? goal : null);
      setSettingsError("");
    } else {
      setCalorieGoal(null);
      setSettingsError("Your saved calorie target is unavailable.");
    }

    if (
      trainerMealsResult.status === "fulfilled" &&
      Array.isArray(trainerMealsResult.value.data?.mealPlans)
    ) {
      setTrainerMealPlans(trainerMealsResult.value.data.mealPlans);
      setTrainerMealsError("");
    } else {
      setTrainerMealPlans([]);
      setTrainerMealsError(
        trainerMealsResult.status === "rejected"
          ? trainerMealsResult.reason.response?.data?.message ||
              "Your trainer meal plan could not be loaded."
          : "Your trainer meal plan response was invalid.",
      );
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchNutritionData();
  }, [fetchNutritionData]);

  const handleOpenModal = (item = null) => {
    calorieManuallyEdited.current = Boolean(item);
    manuallyEditedFields.current = new Set(
      item ? ["calories", "protein", "carbs", "fat"] : [],
    );
    setFoodLookup({ status: "idle", match: null });

    if (item) {
      setEditingItem(item);
      setFormData({
        date: item.date,
        mealType: item.mealType,
        foodName: item.foodName,
        quantity: item.quantity || "1 serving",
        calories: item.calories,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        notes: item.notes || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        date: selectedDate,
        mealType: "breakfast",
        foodName: "",
        quantity: "1 serving",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        notes: "",
      });
    }
    setFormError("");
    setShowModal(true);
  };

  const handleLogTrainerMeal = (item) => {
    calorieManuallyEdited.current = true;
    manuallyEditedFields.current = new Set([
      "calories",
      "protein",
      "carbs",
      "fat",
    ]);
    setFoodLookup({ status: "idle", match: null });
    setEditingItem(null);
    setFormData({
      date: selectedDate,
      mealType: item.mealType,
      foodName: item.foodName,
      quantity: item.quantity || "1 serving",
      calories: item.calories,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      notes: item.notes || "",
    });
    setFormError("");
    setShowModal(true);
  };

  useEffect(() => {
    const foodName = formData.foodName.trim();
    if (!showModal || calorieManuallyEdited.current || foodName.length < 2) {
      setFoodLookup({ status: "idle", match: null });
      return undefined;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setFoodLookup({ status: "loading", match: null });
      try {
        const { data } = await api.get("/nutrition/lookup", {
          params: { name: foodName },
          signal: controller.signal,
        });
        if (data?.success && data.nutrition) {
          setFoodLookup({ status: "matched", match: data.nutrition });
        } else {
          setFoodLookup({ status: "not-found", match: null });
        }
      } catch (error) {
        if (error.code !== "ERR_CANCELED") {
          setFoodLookup({
            status: error.response?.status === 404 ? "not-found" : "error",
            match: null,
          });
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [formData.foodName, showModal]);

  useEffect(() => {
    if (foodLookup.match) {
      setFormData((current) => {
        const updated = { ...current };
        ["calories", "protein", "carbs", "fat"].forEach((field) => {
          if (manuallyEditedFields.current.has(field)) return;
          const value = getValueForQuantity(
            foodLookup.match,
            current.quantity,
            field,
          );
          if (Number.isFinite(value)) {
            updated[field] = String(roundNutritionValue(value, field));
          }
        });
        return updated;
      });
    }
  }, [foodLookup, formData.quantity]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.foodName.trim()) {
      setFormError("Food name is required");
      return;
    }

    const numericValues = ["calories", "protein", "carbs", "fat"].map(
      (field) => (formData[field] === "" ? 0 : Number(formData[field])),
    );

    if (
      formData.calories === "" ||
      numericValues.some((value) => !Number.isFinite(value) || value < 0)
    ) {
      setFormError("Please enter a valid calorie count");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const nutritionData = {
        ...formData,
        calories: numericValues[0],
        protein: numericValues[1],
        carbs: numericValues[2],
        fat: numericValues[3],
      };

      if (editingItem) {
        await api.put(`/nutrition/${editingItem._id}`, nutritionData);
      } else {
        await api.post("/nutrition", nutritionData);
      }
      setShowModal(false);
      setActionError("");
      await fetchNutritionData();
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Failed to save meal record",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !(await confirm({
        title: "Delete this meal record?",
        description:
          "This meal record will be permanently removed from your nutrition history.",
        confirmLabel: "Delete meal",
        destructive: true,
      }))
    )
      return;

    setActionError("");
    try {
      await api.delete(`/nutrition/${id}`);
      await fetchNutritionData();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Could not delete the meal. Please try again.",
      );
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesMeal =
      selectedMealFilter === "all" || log.mealType === selectedMealFilter;
    const matchesSearch = log.foodName
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesMeal && matchesSearch;
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <PageHeader
        as="header"
        className="flex flex-col gap-5 border-b border-forma-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-forma-brand-ember">
            Nutrition & Fuel
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
              {canTrackMacros ? "Nutrition & macro tracking" : "Nutrition tracking"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-forma-text-secondary sm:text-base">
              {canTrackMacros
                ? "Log meals and keep calories, protein, carbs, and fats in view."
                : "Log meals and keep your daily calorie intake in view."}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Field className="w-full sm:w-auto">
            <FieldLabel htmlFor="nutrition-date" className="sr-only">
              Select nutrition date
            </FieldLabel>
            <div className="relative w-full sm:w-44">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <HugeiconsIcon
                  icon={Calendar}
                  className="size-4 text-forma-brand-ember"
                  aria-hidden="true"
                />
              </span>
              <Input
                id="nutrition-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-11 w-full rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised pl-9 text-sm text-forma-text-primary"
              />
            </div>
          </Field>

          <Button
            type="button"
            onClick={() => handleOpenModal()}
            className="min-h-11 w-full shrink-0 bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
          >
            <HugeiconsIcon icon={Plus} data-icon="inline-start" />
            Log a meal
          </Button>
        </div>
      </PageHeader>

      <PlanFeaturesPanel category="nutrition" />

      {/* Error Banners */}
      {(loadError || actionError || settingsError || trainerMealsError) && (
        <Alert
          variant="destructive"
          className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon icon={AlertCircle} className="size-5 shrink-0" />
          <div className="flex flex-1 items-center justify-between gap-3">
            <div>
              <AlertTitle className="font-semibold">Notice</AlertTitle>
              <AlertDescription className="text-xs text-forma-status-error/90 sm:text-sm">
                {actionError || loadError || settingsError || trainerMealsError}
              </AlertDescription>
            </div>
            {loadError && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchNutritionData}
                className="text-forma-status-error hover:bg-forma-status-error/20"
              >
                Retry
              </Button>
            )}
          </div>
        </Alert>
      )}

      {/* Nutrition Totals Stats Grid */}
      <section
        aria-label="Daily nutrition totals"
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${canTrackMacros ? "lg:grid-cols-4" : "lg:grid-cols-1"}`}
      >
        <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-ember/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                Calories
              </span>
              <Badge
                aria-hidden="true"
                variant="secondary"
                className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
              >
                —
              </Badge>
            </div>
            <p className="mt-3 font-display text-3xl font-normal text-forma-text-primary sm:text-4xl">
              {Math.round(summary.totalCalories)}
              <span className="ml-1.5 font-sans text-xs text-forma-text-secondary">
                kcal
              </span>
            </p>
            <p className="mt-1 text-xs text-forma-text-secondary">
              {calorieGoal ? `Daily target: ${calorieGoal} kcal` : "Target not set"}
            </p>
            {calorieGoal && (
              <Progress
                value={Math.min(
                  Math.max((summary.totalCalories / calorieGoal) * 100, 0),
                  100,
                )}
                aria-label={`${Math.round(summary.totalCalories)} of ${calorieGoal} calories consumed`}
                className="mt-4 h-2 bg-forma-bg-surface-raised **:data-[slot=progress-indicator]:bg-forma-brand-ember"
              />
            )}
          </CardContent>
        </Card>

        {canTrackMacros && (
          <>
            <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-ember/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Protein
                  </span>
                  <Badge
                    aria-hidden="true"
                    variant="secondary"
                    className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
                  >
                    —
                  </Badge>
                </div>
                <p className="mt-3 font-display text-3xl font-normal text-forma-text-primary sm:text-4xl">
                  {roundNutritionValue(summary.totalProtein, "protein")}
                  <span className="ml-1.5 font-sans text-xs text-forma-text-secondary">
                    g
                  </span>
                </p>
                <p className="mt-1 text-xs text-forma-text-secondary">From logged meals</p>
              </CardContent>
            </Card>

            <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-teal/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Carbohydrates
                  </span>
                  <Badge
                    aria-hidden="true"
                    variant="secondary"
                    className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
                  >
                    —
                  </Badge>
                </div>
                <p className="mt-3 font-display text-3xl font-normal text-forma-text-primary sm:text-4xl">
                  {roundNutritionValue(summary.totalCarbs, "carbs")}
                  <span className="ml-1.5 font-sans text-xs text-forma-text-secondary">
                    g
                  </span>
                </p>
                <p className="mt-1 text-xs text-forma-text-secondary">From logged meals</p>
              </CardContent>
            </Card>

            <Card className="border-forma-border-subtle bg-forma-bg-surface transition-all duration-200 hover:border-forma-brand-teal/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Fats
                  </span>
                  <Badge
                    aria-hidden="true"
                    variant="secondary"
                    className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
                  >
                    —
                  </Badge>
                </div>
                <p className="mt-3 font-display text-3xl font-normal text-forma-text-primary sm:text-4xl">
                  {roundNutritionValue(summary.totalFat, "fat")}
                  <span className="ml-1.5 font-sans text-xs text-forma-text-secondary">
                    g
                  </span>
                </p>
                <p className="mt-1 text-xs text-forma-text-secondary">From logged meals</p>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* Coach Meal Plan Recommendations */}
      <Card
        role="region"
        aria-labelledby="trainer-meal-plan-title"
        className="border-forma-border-subtle bg-forma-bg-surface"
      >
        <CardHeader className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Badge
                variant="outline"
                className="border-forma-status-success/40 bg-forma-status-success/10 font-mono text-xs uppercase tracking-wider text-forma-status-success"
              >
                Coach recommendations
              </Badge>
              <CardTitle
                id="trainer-meal-plan-title"
                className="mt-2 text-lg font-medium text-forma-text-primary"
              >
                Trainer meal plan
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-forma-text-secondary">
                Add a coach-recommended meal directly to today’s log.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {trainerMealPlans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-forma-border-subtle p-6 text-center text-sm text-forma-text-secondary">
              Your coach has not assigned any meal recommendations yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {trainerMealPlans.map((item) => (
                <div
                  key={item._id}
                  className="rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised p-4 transition-colors hover:border-forma-status-success/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs uppercase text-forma-status-success">
                        {item.mealType} · {item.trainer?.name || "Coach"}
                      </p>
                      <p className="mt-1 font-medium text-forma-text-primary">
                        {item.foodName}
                      </p>
                      <p className="mt-0.5 text-xs text-forma-text-secondary">
                        {item.quantity || "1 serving"}
                        {item.notes ? ` · ${item.notes}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-xl font-normal text-forma-brand-ember">
                      {Math.round(item.calories || 0)} kcal
                    </span>
                  </div>

                  {canTrackMacros && (
                    <p className="mt-3 text-xs text-forma-text-secondary">
                      Protein: {item.protein || 0}g · Carbs: {item.carbs || 0}g · Fat: {item.fat || 0}g
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleLogTrainerMeal(item)}
                    className="mt-3.5 min-h-10 w-full border-forma-status-success/40 font-semibold text-forma-status-success hover:bg-forma-status-success/15"
                  >
                    Log this meal
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <ToggleGroup
            type="single"
            variant="outline"
            value={selectedMealFilter}
            onValueChange={(value) => {
              if (value) setSelectedMealFilter(value);
            }}
            aria-label="Filter meals by type"
            className="flex w-full flex-wrap gap-2 sm:w-auto"
          >
            <ToggleGroupItem
              value="all"
              className="min-h-10 rounded-xl border-forma-border-subtle px-3 text-xs text-forma-text-secondary data-[state=on]:border-forma-brand-ember data-[state=on]:bg-forma-brand-ember data-[state=on]:text-forma-text-on-ember data-[state=on]:hover:bg-forma-brand-ember-hover"
            >
              All ({logs.length})
            </ToggleGroupItem>
            {MEAL_TYPES.map((meal) => (
              <ToggleGroupItem
                key={meal.id}
                value={meal.id}
                className="min-h-10 rounded-xl border-forma-border-subtle px-3 text-xs text-forma-text-secondary data-[state=on]:border-forma-brand-ember data-[state=on]:bg-forma-brand-ember data-[state=on]:text-forma-text-on-ember data-[state=on]:hover:bg-forma-brand-ember-hover"
              >
                {meal.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="relative w-full sm:w-64">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <HugeiconsIcon
                icon={Search}
                className="size-4 text-forma-text-secondary"
              />
            </span>
            <Input
              aria-label="Search logged meals"
              type="search"
              placeholder="Search logged food…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised pl-9 text-sm text-forma-text-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logged Meal Records */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="p-5 sm:p-6">
          <CardTitle className="text-lg font-medium text-forma-text-primary">
            Logged meals for {selectedDate}
          </CardTitle>
          <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
            Review, edit, or adjust food items
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-forma-text-secondary">
              <Spinner className="size-6 text-forma-brand-ember" />
              <span>Loading meal entries…</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              type="meals"
              sentence={`No meals logged for ${selectedDate}. Add a meal to begin tracking.`}
              actionLabel="Add meal"
              onAction={() => handleOpenModal()}
            />
          ) : (
            <div className="divide-y divide-forma-border-subtle">
              {filteredLogs.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-forma-bg-surface-raised text-forma-brand-ember">
                      <HugeiconsIcon icon={Utensils} className="size-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-forma-text-primary">
                          {item.foodName}
                        </p>
                        <Badge
                          variant="outline"
                          className="border-forma-border-subtle font-mono text-[10px] uppercase text-forma-text-secondary"
                        >
                          {item.mealType}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-forma-text-secondary">
                        Qty: <span className="text-forma-text-primary">{item.quantity}</span>
                        {item.notes ? ` · ${item.notes}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="font-display text-xl font-normal text-forma-brand-ember sm:text-2xl">
                        {Math.round(item.calories)} kcal
                      </p>
                      {canTrackMacros && (
                        <p className="text-[11px] text-forma-text-secondary">
                          P: {item.protein || 0}g · C: {item.carbs || 0}g · F: {item.fat || 0}g
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(item)}
                        aria-label="Edit meal"
                        className="size-8 rounded-lg text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-text-primary"
                      >
                        <HugeiconsIcon icon={Edit2} className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item._id)}
                        aria-label="Delete meal"
                        className="size-8 rounded-lg text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error"
                      >
                        <HugeiconsIcon icon={Trash2} className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Meal Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <HugeiconsIcon icon={Utensils} className="size-5 text-forma-brand-ember" />
              {editingItem ? "Edit meal entry" : "Log new meal"}
            </DialogTitle>
            <DialogDescription className="text-xs text-forma-text-secondary">
              Record consumed food items, calories, and macros.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert
              variant="destructive"
              className="border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error"
            >
              <HugeiconsIcon icon={AlertCircle} className="size-4" />
              <AlertDescription className="text-xs">{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="meal-date" className="text-xs text-forma-text-secondary">
                  Date
                </FieldLabel>
                <Input
                  id="meal-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="meal-type" className="text-xs text-forma-text-secondary">
                  Meal type
                </FieldLabel>
                <Select
                  value={formData.mealType}
                  onValueChange={(val) => setFormData({ ...formData, mealType: val })}
                >
                  <SelectTrigger
                    id="meal-type"
                    className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                  >
                    <SelectValue placeholder="Select meal" />
                  </SelectTrigger>
                  <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                    <SelectGroup>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <Field>
              <FieldLabel htmlFor="meal-foodName" className="text-xs text-forma-text-secondary">
                Food item name *
              </FieldLabel>
              <Input
                id="meal-foodName"
                type="text"
                placeholder="e.g. Grilled Chicken Salad"
                value={formData.foodName}
                onChange={(e) => {
                  calorieManuallyEdited.current = false;
                  manuallyEditedFields.current.clear();
                  setFoodLookup({ status: "idle", match: null });
                  setFormData({
                    ...formData,
                    foodName: e.target.value,
                    calories: "",
                    protein: "",
                    carbs: "",
                    fat: "",
                  });
                }}
                required
                className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
              />

              {foodLookup.status === "loading" && (
                <p className="text-[11px] text-forma-text-secondary">Searching food database…</p>
              )}
              {foodLookup.status === "matched" && (
                <p className="text-[11px] text-forma-status-success">
                  {canTrackMacros ? "Calories and available macros" : "Calories"} auto-matched to{" "}
                  {foodLookup.match.foodName} ({foodLookup.match.source}).
                </p>
              )}
              {foodLookup.status === "not-found" && (
                <p className="text-[11px] text-forma-status-warning">
                  No database match found. Please enter values manually.
                </p>
              )}
            </Field>

            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="meal-qty" className="text-xs text-forma-text-secondary">
                  Portion / Quantity
                </FieldLabel>
                <Input
                  id="meal-qty"
                  type="text"
                  placeholder="e.g. 200g or 1 bowl"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="meal-calories" className="text-xs text-forma-text-secondary">
                  Calories (kcal) *
                </FieldLabel>
                <Input
                  id="meal-calories"
                  type="number"
                  placeholder="e.g. 450"
                  value={formData.calories}
                  onChange={(e) => {
                    calorieManuallyEdited.current = true;
                    manuallyEditedFields.current.add("calories");
                    setFormData({ ...formData, calories: e.target.value });
                  }}
                  required
                  className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                />
              </Field>
            </FieldGroup>

            {canTrackMacros && (
              <FieldGroup className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel htmlFor="meal-p" className="text-xs text-forma-text-secondary">
                    Protein (g)
                  </FieldLabel>
                  <Input
                    id="meal-p"
                    type="number"
                    placeholder="0"
                    value={formData.protein}
                    onChange={(e) => {
                      manuallyEditedFields.current.add("protein");
                      setFormData({ ...formData, protein: e.target.value });
                    }}
                    className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="meal-c" className="text-xs text-forma-text-secondary">
                    Carbs (g)
                  </FieldLabel>
                  <Input
                    id="meal-c"
                    type="number"
                    placeholder="0"
                    value={formData.carbs}
                    onChange={(e) => {
                      manuallyEditedFields.current.add("carbs");
                      setFormData({ ...formData, carbs: e.target.value });
                    }}
                    className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="meal-f" className="text-xs text-forma-text-secondary">
                    Fat (g)
                  </FieldLabel>
                  <Input
                    id="meal-f"
                    type="number"
                    placeholder="0"
                    value={formData.fat}
                    onChange={(e) => {
                      manuallyEditedFields.current.add("fat");
                      setFormData({ ...formData, fat: e.target.value });
                    }}
                    className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                  />
                </Field>
              </FieldGroup>
            )}

            <Field>
              <FieldLabel htmlFor="meal-notes" className="text-xs text-forma-text-secondary">
                Notes (optional)
              </FieldLabel>
              <Input
                id="meal-notes"
                type="text"
                placeholder="e.g. Post-workout meal"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
              />
            </Field>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="border-forma-border-subtle text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-forma-brand-ember text-xs font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
              >
                {submitting ? (
                  <Spinner className="size-4" />
                ) : editingItem ? (
                  "Update meal"
                ) : (
                  "Save meal"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
