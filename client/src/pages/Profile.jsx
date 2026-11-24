import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HugeiconsIcon,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
} from "../components/ui/icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardAction,
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
import { Field, FieldGroup, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";
import { Textarea } from "../components/ui/textarea";

const initialForm = (user) => ({
  name: user?.name || "",
  bio: user?.bio || "",
  fitnessGoal: user?.fitnessGoal || "",
  fitnessRequirements: user?.fitnessRequirements || "",
  trainingExperience: user?.trainingExperience || "",
  height: user?.height ?? "",
  weight: user?.weight ?? "",
  targetWeight: user?.targetWeight ?? "",
});

function getInitials(name) {
  return String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ProfileDetail({ label, value, className = "" }) {
  return (
    <div
      className={`min-w-0 border-b border-forma-text-primary/10 pb-3 ${className}`}
    >
      <dt className="text-xs font-medium text-forma-text-secondary">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-forma-text-primary">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function formatNumber(value, unit) {
  return value === "" || value == null ? "Not provided" : `${value} ${unit}`;
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => initialForm(user));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletionRequesting, setDeletionRequesting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);

  const loadProfile = useCallback(
    async (isRefresh = false, signal) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setMessage({ type: "", text: "" });

      try {
        const { data } = await api.get("/auth/profile", { signal });
        if (!data?.success || !data.user)
          throw new Error(data?.message || "Profile response was invalid.");
        if (signal?.aborted) return;
        updateUser(data.user);
        setForm(initialForm(data.user));
        if (isRefresh)
          setMessage({ type: "success", text: "Profile refreshed." });
      } catch (error) {
        if (signal?.aborted) return;
        setMessage({
          type: "error",
          text:
            error.response?.data?.message ||
            error.message ||
            "Unable to load your profile.",
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
    loadProfile(false, controller.signal);
    return () => controller.abort();
  }, [loadProfile]);

  const handleRefresh = () => loadProfile(true);

  const openEditDialog = () => {
    setForm(initialForm(user));
    setMessage({ type: "", text: "" });
    setEditOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setMessage({ type: "error", text: "Enter your name before saving." });
      return;
    }
    for (const [label, value] of [
      ["Height", form.height],
      ["Weight", form.weight],
      ["Target weight", form.targetWeight],
    ]) {
      if (
        value !== "" &&
        (!Number.isFinite(Number(value)) || Number(value) <= 0)
      ) {
        setMessage({
          type: "error",
          text: `${label} must be a number greater than zero.`,
        });
        return;
      }
    }
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        name,
        bio: form.bio,
        fitnessRequirements: form.fitnessRequirements,
        ...["height", "weight", "targetWeight"].reduce((fields, field) => {
          if (form[field] !== "") fields[field] = Number(form[field]);
          return fields;
        }, {}),
      };
      if (form.fitnessGoal) payload.fitnessGoal = form.fitnessGoal;
      if (form.trainingExperience)
        payload.trainingExperience = form.trainingExperience;
      const { data } = await api.put("/auth/profile", payload);
      if (!data?.success || !data.user)
        throw new Error(data?.message || "Profile update was unsuccessful.");
      updateUser(data.user);
      setForm(initialForm(data.user));
      setEditOpen(false);
      setMessage({ type: "success", text: data.message || "Profile saved." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Unable to save your profile.",
      });
    } finally {
      setSaving(false);
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
      if (!data?.success)
        throw new Error(data?.message || "Could not request account deletion.");
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

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not available";

  return (
    <section className="vf-theme-page mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-forma-text-primary sm:text-3xl">
            Profile details
          </h1>
          <p className="mt-1.5 text-sm text-forma-text-secondary">
            Manage your personal information, fitness goals, and account
            details.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={loading || refreshing || saving || deletionRequesting}
          aria-label="Refresh profile"
          title="Refresh profile"
          className="size-11 shrink-0 rounded-full bg-transparent text-forma-text-secondary hover:bg-transparent hover:text-forma-brand-teal"
        >
          {refreshing ? (
            <Spinner />
          ) : (
            <HugeiconsIcon
              aria-hidden="true"
              icon={RefreshCw}
              className="size-5"
            />
          )}
        </Button>
      </header>

      {message.text && !editOpen && (
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
            {message.type === "success" ? "Done" : "Something went wrong"}
          </AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-4xl m-auto flex w-full flex-col gap-4">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-forma-text-secondary">
            <Spinner className="size-5" />
            Loading your profile…
          </div>
        ) : (
          <>
            <Card className="border-forma-text-primary/10 bg-forma-bg-surface shadow-none">
              <CardHeader className="grid-cols-[1fr_auto] items-center gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar
                    size="lg"
                    className="size-16 ring-1 ring-forma-text-primary/10"
                  >
                    <AvatarImage src={user?.avatarUrl || undefined} alt="" />
                    <AvatarFallback className="bg-forma-brand-ember/10 text-base font-semibold text-forma-brand-ember">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="truncate text-lg font-semibold text-forma-text-primary">
                        {user?.name || "Your profile"}
                      </CardTitle>
                      {user?.role === "admin" && (
                        <Badge>
                          <HugeiconsIcon
                            icon={ShieldCheck}
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          System Administrator
                        </Badge>
                      )}
                      {user?.role === "trainer" && (
                        <Badge variant="outline">Trainer</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 break-all text-sm text-forma-text-secondary">
                      {user?.email || "No email address"}
                    </CardDescription>
                  </div>
                </div>
                <CardAction className="row-span-1 row-start-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLogoutOpen(true)}
                    className="shrink-0"
                  >
                    <HugeiconsIcon
                      icon={LogOut}
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    <span className="hidden sm:inline">Sign out</span>
                    <span className="sm:hidden">Sign out</span>
                  </Button>
                </CardAction>
              </CardHeader>
            </Card>

            <Card className="border-forma-text-primary/10 bg-forma-bg-surface shadow-none">
              <CardHeader className="grid-cols-[1fr_auto] items-start gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-forma-text-primary">
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={User}
                      className="size-5 text-forma-brand-ember"
                    />
                    Personal information
                  </CardTitle>
                  <CardDescription className="mt-1 text-forma-text-secondary">
                    Your profile and fitness details.
                  </CardDescription>
                </div>
                <CardAction className="row-span-1 row-start-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openEditDialog}
                  >
                    <HugeiconsIcon
                      icon={Edit}
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    Edit profile
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <ProfileDetail
                    label="About you"
                    value={user?.bio}
                    className="sm:col-span-2"
                  />
                  <ProfileDetail
                    label="Fitness goal"
                    value={user?.fitnessGoal}
                  />
                  <ProfileDetail
                    label="Training experience"
                    value={
                      user?.trainingExperience
                        ? user.trainingExperience[0].toUpperCase() +
                          user.trainingExperience.slice(1)
                        : ""
                    }
                  />
                  <ProfileDetail
                    label="Fitness requirements"
                    value={user?.fitnessRequirements}
                    className="sm:col-span-2"
                  />
                  <ProfileDetail
                    label="Height"
                    value={formatNumber(user?.height, "cm")}
                  />
                  <ProfileDetail
                    label="Current weight"
                    value={formatNumber(user?.weight, "kg")}
                  />
                  <ProfileDetail
                    label="Target weight"
                    value={formatNumber(user?.targetWeight, "kg")}
                  />
                  <ProfileDetail
                    label="Preferred units"
                    value={user?.preferredUnit}
                  />
                  <ProfileDetail
                    label="Account ID"
                    value={user?.id || user?._id}
                    className="sm:col-span-2"
                  />
                  <div className="flex items-center gap-2 text-sm text-forma-text-secondary sm:col-span-2">
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Calendar}
                      className="size-4 shrink-0"
                    />
                    Member since {formattedDate}
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="border-forma-status-error/30 bg-forma-bg-surface shadow-none">
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
                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeletionOpen(true)}
                    disabled={deletionRequesting}
                  >
                    <HugeiconsIcon
                      icon={Trash2}
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    Request account deletion
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Update your personal details and fitness information. Email
              address changes are not available here.
            </DialogDescription>
          </DialogHeader>
          {message.text && editOpen && (
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
                {message.type === "success" ? "Done" : "Something went wrong"}
              </AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                <Input
                  id="profile-name"
                  value={form.name}
                  maxLength={100}
                  autoComplete="name"
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="profile-bio">About you</FieldLabel>
                <Textarea
                  id="profile-bio"
                  value={form.bio}
                  maxLength={500}
                  rows={3}
                  onChange={(event) =>
                    setForm({ ...form, bio: event.target.value })
                  }
                  placeholder="Add a short bio"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-fitness-goal">
                  Fitness goal
                </FieldLabel>
                <Select
                  value={form.fitnessGoal}
                  onValueChange={(fitnessGoal) =>
                    setForm({ ...form, fitnessGoal })
                  }
                >
                  <SelectTrigger id="profile-fitness-goal" className="w-full">
                    <SelectValue placeholder="Choose a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Overall Fitness">
                        Overall Fitness
                      </SelectItem>
                      <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                      <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
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
                  value={form.trainingExperience}
                  onValueChange={(trainingExperience) =>
                    setForm({ ...form, trainingExperience })
                  }
                >
                  <SelectTrigger id="profile-experience" className="w-full">
                    <SelectValue placeholder="Choose experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
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
                  value={form.fitnessRequirements}
                  maxLength={1000}
                  rows={4}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      fitnessRequirements: event.target.value,
                    })
                  }
                  placeholder="Share your preferred workouts, schedule, equipment, or limitations"
                />
              </Field>
              {[
                ["height", "Height (cm)"],
                ["weight", "Current weight (kg)"],
                ["targetWeight", "Target weight (kg)"],
              ].map(([field, label]) => (
                <Field key={field}>
                  <FieldLabel htmlFor={`profile-${field}`}>{label}</FieldLabel>
                  <Input
                    id={`profile-${field}`}
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form[field]}
                    onChange={(event) =>
                      setForm({ ...form, [field]: event.target.value })
                    }
                  />
                </Field>
              ))}
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <HugeiconsIcon
                    icon={CheckCircle2}
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                )}
                {saving ? "Saving profile…" : "Save profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                icon={LogOut}
                data-icon="inline-start"
                aria-hidden="true"
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
                  icon={Trash2}
                  data-icon="inline-start"
                  aria-hidden="true"
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
