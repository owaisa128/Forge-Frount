import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HugeiconsIcon,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Save,
  Trash2,
} from "../components/ui/icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { exportToCSV, exportToPDFReport } from "../utils/exportUtils";
import { hasMinimumPlan } from "../utils/membershipAccess";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldLabel,
  FieldSet,
} from "../components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Textarea } from "../components/ui/textarea";
import { Spinner } from "../components/ui/spinner";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
const defaultSettings = {
  preferredUnit: "metric",
  dailyCalorieTarget: "",
  dailyStepGoal: 10000,
  dailyWaterGoal: 2500,
  dailyWorkoutGoal: 45,
  notificationsEnabled: true,
  emailNotifications: false,
  weeklySummary: true,
};

const profileValuesFromUser = (user) => ({
  name: user?.name || "",
  bio: user?.bio || "",
  fitnessGoal: user?.fitnessGoal || "",
  fitnessRequirements: user?.fitnessRequirements || "",
  trainingExperience: user?.trainingExperience || "",
  height: user?.height == null ? "" : String(user.height),
  weight: user?.weight == null ? "" : String(user.weight),
  targetWeight: user?.targetWeight == null ? "" : String(user.targetWeight),
});

const getInitials = (name) =>
  String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const settingsValuesFromResponse = (values = {}) => {
  const merged = { ...defaultSettings, ...values };
  return {
    ...merged,
    dailyCalorieTarget: merged.dailyCalorieTarget ?? "",
    dailyStepGoal: Number(
      merged.dailyStepGoal ?? defaultSettings.dailyStepGoal,
    ),
    dailyWaterGoal: Number(
      merged.dailyWaterGoal ?? defaultSettings.dailyWaterGoal,
    ),
    dailyWorkoutGoal: Number(
      merged.dailyWorkoutGoal ?? defaultSettings.dailyWorkoutGoal,
    ),
    notificationsEnabled: Boolean(
      merged.notificationsEnabled ?? defaultSettings.notificationsEnabled,
    ),
    emailNotifications: Boolean(
      merged.emailNotifications ?? defaultSettings.emailNotifications,
    ),
    weeklySummary: Boolean(
      merged.weeklySummary ?? defaultSettings.weeklySummary,
    ),
  };
};

const comparableSettings = (values) => ({
  ...settingsValuesFromResponse(values),
  dailyCalorieTarget:
    values.dailyCalorieTarget === "" || values.dailyCalorieTarget == null
      ? ""
      : Number(values.dailyCalorieTarget),
});

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const canAccessBasicFeatures =
    user?.role !== "user" || hasMinimumPlan(user?.membership, "basic");
  const [profile, setProfile] = useState(() => profileValuesFromUser(user));
  const [draftProfile, setDraftProfile] = useState(() =>
    profileValuesFromUser(user),
  );
  const [settings, setSettings] = useState(defaultSettings);
  const [draftSettings, setDraftSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [hasLoadedAccount, setHasLoadedAccount] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState("");
  const [deletionRequesting, setDeletionRequesting] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const loadAccountData = useCallback(
    async (isRefresh = false, signal) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setMessage({ type: "", text: "" });
      try {
        const [profileResponse, settingsResponse] = await Promise.all([
          api.get("/auth/profile", { signal }),
          api.get("/settings", { signal }),
        ]);
        if (!profileResponse.data?.success || !profileResponse.data.user) {
          throw new Error(
            profileResponse.data?.message || "Profile response was invalid.",
          );
        }
        if (
          !settingsResponse.data?.success ||
          !settingsResponse.data.settings
        ) {
          throw new Error(
            settingsResponse.data?.message || "Settings response was invalid.",
          );
        }
        if (signal?.aborted) return;

        const nextProfile = profileValuesFromUser(profileResponse.data.user);
        const nextSettings = settingsValuesFromResponse(
          settingsResponse.data.settings,
        );
        updateUser(profileResponse.data.user);
        setProfile(nextProfile);
        setDraftProfile(nextProfile);
        setSettings(nextSettings);
        setDraftSettings(nextSettings);
        setHasLoadedAccount(true);
        if (isRefresh) {
          setMessage({
            type: "success",
            text: "Profile and settings refreshed.",
          });
        }
      } catch (error) {
        if (signal?.aborted) return;
        setMessage({
          type: "error",
          text:
            error.response?.data?.message ||
            error.message ||
            "Unable to load your account settings.",
        });
      } finally {
        if (!signal?.aborted) {
          if (isRefresh) setRefreshing(false);
          else setLoading(false);
        }
      }
    },
    [updateUser],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadAccountData(false, controller.signal);
    return () => controller.abort();
  }, [loadAccountData]);

  const profileHasChanges =
    JSON.stringify(draftProfile) !== JSON.stringify(profile);
  const settingsHasChanges =
    JSON.stringify(comparableSettings(draftSettings)) !==
    JSON.stringify(settingsValuesFromResponse(settings));
  const hasUnsavedChanges = profileHasChanges || settingsHasChanges;

  const updateProfileField = (field, value) =>
    setDraftProfile((current) => ({ ...current, [field]: value }));
  const updateSettingsField = (field, value) =>
    setDraftSettings((current) => ({ ...current, [field]: value }));

  const saveChanges = async (event) => {
    event.preventDefault();
    setSaving("settings");
    setMessage({ type: "", text: "" });
    const name = draftProfile.name.trim();
    if (!name) {
      setMessage({ type: "error", text: "Enter your name before saving." });
      setSaving("");
      return;
    }

    let profileSaved = false;
    try {
      for (const [label, value] of [
        ["Height", draftProfile.height],
        ["Weight", draftProfile.weight],
        ["Target weight", draftProfile.targetWeight],
      ]) {
        if (
          value !== "" &&
          (!Number.isFinite(Number(value)) || Number(value) <= 0)
        ) {
          throw new Error(`${label} must be a number greater than zero.`);
        }
      }

      if (profileHasChanges) {
        const profilePayload = {
          name,
          bio: draftProfile.bio,
          fitnessRequirements: draftProfile.fitnessRequirements,
        };
        if (draftProfile.fitnessGoal) {
          profilePayload.fitnessGoal = draftProfile.fitnessGoal;
        }
        if (draftProfile.trainingExperience) {
          profilePayload.trainingExperience = draftProfile.trainingExperience;
        }
        for (const field of ["height", "weight", "targetWeight"]) {
          if (draftProfile[field] !== "") {
            profilePayload[field] = Number(draftProfile[field]);
          }
        }

        const { data } = await api.put("/auth/profile", profilePayload);
        if (!data?.success || !data.user) {
          throw new Error(data?.message || "Profile update was unsuccessful.");
        }
        const savedProfile = profileValuesFromUser(data.user);
        updateUser(data.user);
        setProfile(savedProfile);
        setDraftProfile(savedProfile);
        profileSaved = true;
      }

      if (settingsHasChanges) {
        const { data } = await api.put("/settings", {
          preferredUnit: draftSettings.preferredUnit,
          ...(canAccessBasicFeatures && draftSettings.dailyCalorieTarget !== ""
            ? { dailyCalorieTarget: Number(draftSettings.dailyCalorieTarget) }
            : {}),
          dailyStepGoal: Number(draftSettings.dailyStepGoal),
          dailyWaterGoal: Number(draftSettings.dailyWaterGoal),
          dailyWorkoutGoal: Number(draftSettings.dailyWorkoutGoal),
          notificationsEnabled: Boolean(draftSettings.notificationsEnabled),
          emailNotifications: Boolean(draftSettings.emailNotifications),
          weeklySummary: Boolean(draftSettings.weeklySummary),
        });
        if (!data?.success || !data.settings) {
          throw new Error(data?.message || "Settings update was unsuccessful.");
        }
        const savedSettings = settingsValuesFromResponse(data.settings);
        setSettings(savedSettings);
        setDraftSettings(savedSettings);
      }

      setMessage({
        type: "success",
        text: "Your changes have been saved.",
      });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Unable to save your changes.";
      setMessage({
        type: "error",
        text: profileSaved
          ? `Your profile was saved, but the remaining settings could not be saved: ${errorMessage}`
          : errorMessage,
      });
    } finally {
      setSaving("");
    }
  };
  const requestPasswordReset = async () => {
    setSaving("password-reset");
    setMessage({ type: "", text: "" });
    try {
      const { data } = await api.post("/auth/profile/password-reset/request");
      if (!data?.success)
        throw new Error(data?.message || "Password reset email was not sent.");
      setMessage({
        type: "success",
        text: data.message || "A password reset link was sent to your email.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Unable to send the password reset email.",
      });
    } finally {
      setSaving("");
    }
  };
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const handleRequestDeletion = async () => {
    setDeletionRequesting(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await api.post("/auth/profile/deletion/request");
      if (!data?.success) {
        throw new Error(data?.message || "Could not request account deletion.");
      }
      setDeletionOpen(false);
      setMessage({
        type: "success",
        text:
          data.message ||
          "Check your email to verify your account deletion request.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Could not request account deletion.",
      });
    } finally {
      setDeletionRequesting(false);
    }
  };
  const cancelChanges = () => {
    setDraftProfile(profile);
    setDraftSettings(settings);
    setMessage({ type: "", text: "" });
  };
  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not available";
  const runExport = async (label, createFile) => {
    setSaving(label);
    setMessage({ type: "", text: "" });
    try {
      await createFile();
      setMessage({ type: "success", text: `${label} export downloaded.` });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          `Unable to export ${label.toLowerCase()}.`,
      });
    } finally {
      setSaving("");
    }
  };
  const exportWorkouts = () =>
    runExport("Workout", async () => {
      const { data } = await api.get("/workouts");
      const records = Array.isArray(data) ? data : data?.workouts;
      if (!Array.isArray(records))
        throw new Error("The workout export response was invalid.");
      exportToCSV(
        records.map((workout) => ({
          ID: workout._id,
          Title: workout.title,
          Category: workout.category || "General",
          ExercisesCount: workout.exercises?.length || 0,
          CreatedAt: workout.createdAt
            ? new Date(workout.createdAt).toLocaleDateString()
            : "",
        })),
        "forma_workouts.csv",
      );
    });
  const exportNutrition = () =>
    runExport("Nutrition", async () => {
      const { data } = await api.get("/nutrition");
      if (!Array.isArray(data?.nutrition))
        throw new Error("The nutrition export response was invalid.");
      exportToCSV(
        data.nutrition.map((entry) => ({
          Date: entry.date,
          MealType: entry.mealType,
          FoodName: entry.foodName,
          Quantity: entry.quantity,
          Calories: entry.calories,
          Protein_g: entry.protein,
          Carbs_g: entry.carbs,
          Fat_g: entry.fat,
        })),
        "forma_nutrition.csv",
      );
    });
  const exportProgress = () =>
    runExport("Progress", async () => {
      const { data } = await api.get("/progress");
      if (!Array.isArray(data?.progress))
        throw new Error("The progress export response was invalid.");
      exportToCSV(
        data.progress.map((entry) => ({
          Date: entry.date,
          Weight_kg: entry.weight,
          BodyFat_Percent: entry.bodyFatPercentage,
          BenchMax_kg: entry.benchPressMax,
          SquatMax_kg: entry.squatMax,
          DeadliftMax_kg: entry.deadliftMax,
        })),
        "forma_progress.csv",
      );
    });
  const exportReport = () =>
    runExport("Fitness report", async () => {
      const [workoutsResponse, nutritionResponse, progressResponse] =
        await Promise.all([
          api.get("/workouts"),
          api.get("/nutrition"),
          api.get("/progress/summary"),
        ]);
      const workouts = Array.isArray(workoutsResponse.data)
        ? workoutsResponse.data
        : workoutsResponse.data?.workouts;
      if (
        !Array.isArray(workouts) ||
        !Array.isArray(nutritionResponse.data?.nutrition) ||
        !progressResponse.data?.summary
      ) {
        throw new Error("One or more fitness report responses were invalid.");
      }
      const summary = progressResponse.data.summary;
      exportToPDFReport(
        "FORGE Fitness Summary",
        `User: ${user?.name || ""} (${user?.email || ""})`,
        ["Metric", "Value", "Status"],
        [
          ["Total workouts", `${workouts.length}`, "Recorded"],
          [
            "Nutrition entries",
            `${nutritionResponse.data.nutrition.length}`,
            "Recorded",
          ],
          [
            "Current body weight",
            `${summary.currentWeight ?? "--"} kg`,
            "Latest",
          ],
          [
            "Bench press record",
            `${summary.maxBench ?? 0} kg`,
            "Personal record",
          ],
          ["Squat record", `${summary.maxSquat ?? 0} kg`, "Personal record"],
          [
            "Deadlift record",
            `${summary.maxDeadlift ?? 0} kg`,
            "Personal record",
          ],
        ],
      );
    });
  const notificationPreferences = [
    [
      "notificationsEnabled",
      "In-app notifications",
      "Show important updates and reminders in FORGE.",
    ],
    [
      "emailNotifications",
      "Email notifications",
      "Receive account and activity updates by email.",
    ],
    [
      "weeklySummary",
      "Weekly summary",
      "Get a weekly recap of your fitness activity.",
    ],
  ];

  const profileFields = [
    ["height", "Height (cm)", 50, 300],
    ["weight", "Current weight (kg)", 20, 500],
    ["targetWeight", "Target weight (kg)", 20, 500],
  ];

  const settingFields = [
    ...(canAccessBasicFeatures
      ? [["dailyCalorieTarget", "Daily calorie target", 500, undefined, "kcal"]]
      : []),
    ["dailyStepGoal", "Daily step goal", 0, undefined, "steps"],
    ...(canAccessBasicFeatures
      ? [["dailyWaterGoal", "Daily water goal", 250, 10000, "ml"]]
      : []),
    ["dailyWorkoutGoal", "Daily workout goal", 0, undefined, "minutes"],
  ];

  return (
    <section className="vf-theme-page mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-forma-text-primary sm:text-3xl">
            Profile & settings
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-forma-text-secondary">
            Manage your account details, fitness preferences, and security.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => loadAccountData(true)}
          disabled={
            loading || refreshing || Boolean(saving) || hasUnsavedChanges
          }
          aria-label="Refresh profile and settings"
          title="Refresh profile and settings"
          className="size-11 shrink-0 rounded-full bg-transparent text-forma-text-secondary hover:bg-transparent hover:text-forma-brand-teal"
        >
          {refreshing ? (
            <Spinner />
          ) : !hasLoadedAccount ? (
            <Card className="border border-forma-text-primary/10 bg-forma-bg-surface shadow-none">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-forma-text-secondary">
                  Your profile and settings are unavailable until they load.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => loadAccountData(true)}
                  disabled={refreshing}
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={RefreshCw}
                    data-icon="inline-start"
                  />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <HugeiconsIcon aria-hidden="true" icon={RefreshCw} />
          )}
        </Button>
      </header>

      {message.text && (
        <Alert
          role={message.type === "error" ? "alert" : "status"}
          variant={message.type === "error" ? "destructive" : "default"}
          className={
            message.type === "success"
              ? "border-forma-status-success/25 bg-forma-status-success/10 text-forma-status-success"
              : ""
          }
        >
          <HugeiconsIcon
            aria-hidden="true"
            icon={message.type === "success" ? CheckCircle2 : AlertCircle}
          />
          <AlertTitle>
            {message.type === "success" ? "Saved" : "Something went wrong"}
          </AlertTitle>
          <AlertDescription
            className={
              message.type === "success" ? "text-forma-status-success" : ""
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

        <div className="max-w-4xl m-auto flex flex-col gap-4">
      {loading ? (
        <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-forma-text-secondary">
          <Spinner className="size-5" />
          Loading your profile and settings…
        </div>
      ) : (
        <>
          <form onSubmit={saveChanges} className="flex flex-col gap-5">
            <Card className="border border-forma-text-primary/10 bg-forma-bg-surface shadow-none">
              <CardHeader className="grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto]">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar
                    size="lg"
                    className="size-16 ring-1 ring-forma-text-primary/10"
                  >
                    <AvatarImage
                      src={user?.avatarUrl || undefined}
                      alt={
                        user?.name
                          ? `${user.name} profile photo`
                          : "Profile photo"
                      }
                    />
                    <AvatarFallback className="bg-forma-brand-ember/10 text-base font-semibold text-forma-brand-ember">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg font-semibold text-forma-text-primary">
                      {user?.name || "Your profile"}
                    </CardTitle>
                    <CardDescription className="mt-1 break-all text-forma-text-secondary">
                      {user?.email || "No email address"}
                    </CardDescription>
                    <p className="mt-1 text-xs text-forma-text-secondary">
                      Personal and fitness details
                    </p>
                  </div>
                </div>
                <CardAction className="col-start-1 row-span-1 row-start-2 justify-self-start sm:col-start-2 sm:row-start-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLogoutOpen(true)}
                    disabled={Boolean(saving)}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={LogOut}
                      data-icon="inline-start"
                    />
                    Sign out
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                    <Input
                      id="profile-name"
                      value={draftProfile.name}
                      onChange={(event) =>
                        updateProfileField("name", event.target.value)
                      }
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                      disabled={saving === "settings"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-email">
                      Email address
                    </FieldLabel>
                    <Input
                      id="profile-email"
                      type="email"
                      value={user?.email || ""}
                      readOnly
                      aria-describedby="profile-email-note"
                    />
                    <FieldDescription id="profile-email-note">
                      Email changes are not available here.
                    </FieldDescription>
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="profile-bio">About you</FieldLabel>
                    <Textarea
                      id="profile-bio"
                      value={draftProfile.bio}
                      onChange={(event) =>
                        updateProfileField("bio", event.target.value)
                      }
                      rows={3}
                      maxLength={500}
                      placeholder="Add a short bio"
                      disabled={saving === "settings"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-fitness-goal">
                      Fitness goal
                    </FieldLabel>
                    <Select
                      value={draftProfile.fitnessGoal}
                      onValueChange={(value) =>
                        updateProfileField("fitnessGoal", value)
                      }
                      disabled={saving === "settings"}
                    >
                      <SelectTrigger
                        id="profile-fitness-goal"
                        className="w-full"
                      >
                        <SelectValue placeholder="Choose a goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="Overall Fitness">
                            Overall Fitness
                          </SelectItem>
                          <SelectItem value="Weight Loss">
                            Weight Loss
                          </SelectItem>
                          <SelectItem value="Muscle Gain">
                            Muscle Gain
                          </SelectItem>
                          <SelectItem value="Endurance">Endurance</SelectItem>
                          <SelectItem value="Strength Training">
                            Strength Training
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-experience">
                      Training experience
                    </FieldLabel>
                    <Select
                      value={draftProfile.trainingExperience}
                      onValueChange={(value) =>
                        updateProfileField("trainingExperience", value)
                      }
                      disabled={saving === "settings"}
                    >
                      <SelectTrigger id="profile-experience" className="w-full">
                        <SelectValue placeholder="Choose experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">
                            Intermediate
                          </SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="profile-requirements">
                      Fitness requirements
                    </FieldLabel>
                    <Textarea
                      id="profile-requirements"
                      value={draftProfile.fitnessRequirements}
                      onChange={(event) =>
                        updateProfileField(
                          "fitnessRequirements",
                          event.target.value,
                        )
                      }
                      maxLength={1000}
                      rows={3}
                      placeholder="Share preferred workouts, equipment, schedule, or limitations"
                      disabled={saving === "settings"}
                    />
                  </Field>
                  {profileFields.map(([field, label, min, max]) => (
                    <Field key={field}>
                      <FieldLabel htmlFor={`profile-${field}`}>
                        {label}
                      </FieldLabel>
                      <Input
                        id={`profile-${field}`}
                        type="number"
                        min={min}
                        max={max}
                        step="0.1"
                        value={draftProfile[field]}
                        onChange={(event) =>
                          updateProfileField(field, event.target.value)
                        }
                        disabled={saving === "settings"}
                      />
                    </Field>
                  ))}
                </FieldGroup>
                <Separator className="bg-forma-text-primary/10" />
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-forma-text-secondary">
                  <span className="inline-flex items-center gap-2">
                    <HugeiconsIcon aria-hidden="true" icon={Calendar} />
                    Member since {formattedDate}
                  </span>
                  <span>
                    Account ID: {user?.id || user?._id || "Not available"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-forma-text-primary/10 bg-forma-bg-surface shadow-none">
              <CardHeader className="grid-cols-[1fr_auto] items-start gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-forma-text-primary">
                    Preferences
                  </CardTitle>
                  <CardDescription className="mt-1 text-forma-text-secondary">
                    Choose how FORGE tracks your fitness and sends updates.
                  </CardDescription>
                </div>
                {canAccessBasicFeatures && (
                  <CardAction className="row-span-1 row-start-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={Boolean(saving)}
                        >
                          <HugeiconsIcon
                            aria-hidden="true"
                            icon={Download}
                            data-icon="inline-start"
                          />
                          {saving &&
                          saving !== "settings" &&
                          saving !== "password-reset"
                            ? "Preparing…"
                            : "Export data"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-56">
                        <DropdownMenuLabel>Choose an export</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          {[
                            ["Workouts CSV", FileSpreadsheet, exportWorkouts],
                            ["Nutrition CSV", FileSpreadsheet, exportNutrition],
                            ["Progress CSV", FileSpreadsheet, exportProgress],
                            ["Fitness report PDF", FileText, exportReport],
                          ].map(([label, Icon, handler]) => (
                            <DropdownMenuItem
                              key={label}
                              disabled={Boolean(saving)}
                              onSelect={handler}
                            >
                              <HugeiconsIcon
                                aria-hidden="true"
                                icon={Icon}
                                className="text-forma-status-error"
                              />
                              {label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="settings-preferred-unit">
                      Measurement units
                    </FieldLabel>
                    <Select
                      value={draftSettings.preferredUnit}
                      onValueChange={(value) =>
                        updateSettingsField("preferredUnit", value)
                      }
                      disabled={saving === "settings"}
                    >
                      <SelectTrigger
                        id="settings-preferred-unit"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="metric">
                            Metric (kg, cm)
                          </SelectItem>
                          <SelectItem value="imperial">
                            Imperial (lb, in)
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  {settingFields.map(([field, label, min, max, unit]) => (
                    <Field key={field}>
                      <FieldLabel htmlFor={`settings-${field}`}>
                        {label}
                      </FieldLabel>
                      <Input
                        id={`settings-${field}`}
                        type="number"
                        min={min}
                        max={max}
                        step="1"
                        required={field !== "dailyCalorieTarget"}
                        value={draftSettings[field]}
                        onChange={(event) =>
                          updateSettingsField(field, event.target.value)
                        }
                        aria-describedby={`settings-${field}-unit`}
                        disabled={saving === "settings"}
                      />
                      <FieldDescription id={`settings-${field}-unit`}>
                        {unit}
                      </FieldDescription>
                    </Field>
                  ))}
                </FieldGroup>

                <FieldSet className="gap-4">
                  <FieldLegend className="text-sm font-semibold text-forma-text-primary">
                    Notifications
                  </FieldLegend>
                  <Separator className="bg-forma-text-primary/10" />
                  <FieldGroup className="gap-0">
                    {notificationPreferences.map(
                      ([field, label, description]) => (
                        <Field
                          key={field}
                          orientation="horizontal"
                          className="items-center gap-4 border-b border-forma-text-primary/10 py-3 last:border-0"
                        >
                          <Switch
                            id={`settings-${field}`}
                            checked={Boolean(draftSettings[field])}
                            onCheckedChange={(checked) =>
                              updateSettingsField(field, checked)
                            }
                            aria-labelledby={`settings-${field}-label`}
                            aria-describedby={`settings-${field}-description`}
                            disabled={saving === "settings"}
                          />
                          <FieldContent>
                            <FieldLabel
                              id={`settings-${field}-label`}
                              htmlFor={`settings-${field}`}
                              className="text-sm font-medium text-forma-text-primary"
                            >
                              {label}
                            </FieldLabel>
                            <FieldDescription
                              id={`settings-${field}-description`}
                            >
                              {description}
                            </FieldDescription>
                          </FieldContent>
                        </Field>
                      ),
                    )}
                  </FieldGroup>
                </FieldSet>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch justify-between gap-4 border-t border-forma-text-primary/10 sm:flex-row sm:items-center">
                <p className="text-sm text-forma-text-secondary" role="status">
                  {hasUnsavedChanges
                    ? "Your changes haven't been saved."
                    : "Your profile and preferences are up to date."}
                </p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelChanges}
                    disabled={!hasUnsavedChanges || Boolean(saving)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!hasUnsavedChanges || Boolean(saving)}
                  >
                    {saving === "settings" ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={Save}
                        data-icon="inline-start"
                      />
                    )}
                    {saving === "settings" ? "Saving changes…" : "Save changes"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </form>

          <Card className="border border-forma-text-primary/10 bg-forma-bg-surface shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-forma-text-primary">
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Lock}
                  className="text-forma-status-error"
                />
                Account security
              </CardTitle>
              <CardDescription className="break-words text-forma-text-secondary">
                Send a one-time password reset link to{" "}
                {user?.email || "your account email"}. The link expires after 60
                minutes.
              </CardDescription>
            </CardHeader>
            <CardFooter className="border-t border-forma-text-primary/10">
              <Button
                type="button"
                variant="outline"
                onClick={requestPasswordReset}
                disabled={Boolean(saving)}
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={saving === "password-reset" ? Loader2 : Lock}
                  className={saving === "password-reset" ? "animate-spin" : ""}
                  data-icon="inline-start"
                />
                {saving === "password-reset"
                  ? "Sending reset link…"
                  : "Send reset link"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border border-forma-status-error/30 bg-forma-bg-surface shadow-none">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-forma-status-error">
                Danger area
              </CardTitle>
              <CardDescription className="text-forma-text-secondary">
                Actions here affect your FORGE account and its data.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Alert
                variant="destructive"
                className="border-forma-status-error/25 bg-forma-status-error/5"
              >
                <HugeiconsIcon aria-hidden="true" icon={AlertCircle} />
                <AlertTitle>Account deletion takes 90 days</AlertTitle>
                <AlertDescription>
                  After you verify the request by email, your account is
                  disabled immediately and scheduled for permanent deletion in
                  90 days. You can cancel during that period using the link in
                  the verification email. Membership purchase history is
                  retained.
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeletionOpen(true)}
                disabled={deletionRequesting}
                className="self-start"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Trash2}
                  data-icon="inline-start"
                />
                Request account deletion
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out of FORGE?</DialogTitle>
            <DialogDescription>
              You can sign back in at any time with your account credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutOpen(false)}
            >
              Stay signed in
            </Button>
            <Button type="button" onClick={handleLogout}>
              <HugeiconsIcon
                aria-hidden="true"
                icon={LogOut}
                data-icon="inline-start"
              />
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletionOpen} onOpenChange={setDeletionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request account deletion?</DialogTitle>
            <DialogDescription>
              We’ll send a verification link to {user?.email}. Your account
              remains active until you verify. After verification, access is
              disabled and permanent deletion is scheduled 90 days later.
              Membership purchase history will be retained.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletionOpen(false)}
              disabled={deletionRequesting}
            >
              Keep my account
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={deletionRequesting}
            >
              {deletionRequesting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Trash2}
                  data-icon="inline-start"
                />
              )}
              {deletionRequesting
                ? "Sending email…"
                : "Send verification email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
