import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  HugeiconsIcon,
  AlertCircle,
  ArrowLeft,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Video,
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
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Spinner } from "../components/ui/spinner";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  "Strength",
  "Cardio",
  "Flexibility",
  "HIIT",
  "Endurance",
  "Other",
  "General",
];

const newExercise = () => ({
  name: "",
  sets: 3,
  reps: 10,
  weight: 0,
  notes: "",
});

const initialForm = () => ({
  title: "",
  description: "",
  category: "Strength",
  tags: "",
  videoUrl: "",
  exercises: [newExercise()],
});

export default function WorkoutFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTrainer = user?.role === "trainer";

  const [form, setForm] = useState(initialForm);
  const [assignedClients, setAssignedClients] = useState([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [imageFileId, setImageFileId] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileName, setVideoFileName] = useState("");
  const [removeVideo, setRemoveVideo] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (currentImage) URL.revokeObjectURL(currentImage);
    },
    [imagePreview, currentImage],
  );

  useEffect(() => {
    if (!isTrainer || isEditing) return undefined;
    let active = true;
    api
      .get("/memberships/assigned-clients")
      .then(({ data }) => {
        if (active && Array.isArray(data.clients))
          setAssignedClients(data.clients);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              "Unable to load assigned clients.",
          );
      });
    return () => {
      active = false;
    };
  }, [isEditing, isTrainer]);

  useEffect(() => {
    if (!isEditing) return undefined;
    let active = true;
    api
      .get(`/workouts/${id}`)
      .then(({ data }) => {
        if (!data?.success || !data.workout)
          throw new Error("Workout details were not returned.");
        if (data.workout.isTrainerAssigned) {
          navigate(`/workouts/${id}`, { replace: true });
          return;
        }
        if (active) {
          const workout = data.workout;
          setForm({
            title: workout.title || "",
            description: workout.description || "",
            category: workout.category || "General",
            tags: workout.tags?.join(", ") || "",
            videoUrl: workout.videoUrl || "",
            exercises: workout.exercises?.length
              ? workout.exercises
              : [newExercise()],
          });
          setVideoFileName(workout.videoFileName || "");
          setImageFileId(workout.imageFileId || "");
          setImageFileName(workout.imageFileName || "");
        }
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Unable to load this workout for editing.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isEditing, navigate]);

  useEffect(() => {
    setCurrentImage("");
    if (!isEditing || !imageFileId) return undefined;
    let active = true;
    let objectUrl;
    api
      .get(`/workouts/${id}/image`, { responseType: "blob" })
      .then(({ data }) => {
        if (active) {
          objectUrl = URL.createObjectURL(data);
          setCurrentImage(objectUrl);
        }
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              "Unable to load current workout image.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, imageFileId, isEditing]);

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateExercise = (index, key, value) =>
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, position) =>
        position === index ? { ...exercise, [key]: value } : exercise,
      ),
    }));

  const selectImage = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      setError("Workout image must be 10 MiB or smaller.");
      event.target.value = "";
      setImageFile(null);
      setImagePreview("");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
    if (file) setRemoveImage(false);
  };

  const selectVideo = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 50 * 1024 * 1024) {
      setError("Workout video must be 50 MiB or smaller.");
      event.target.value = "";
      setVideoFile(null);
      return;
    }
    setError("");
    setVideoFile(file);
    if (file) setRemoveVideo(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Workout title is required.");
    if (!form.exercises.length) return setError("Add at least one exercise.");

    for (let index = 0; index < form.exercises.length; index += 1) {
      const exercise = form.exercises[index];
      if (!exercise.name.trim())
        return setError(`Exercise ${index + 1} needs a name.`);
      if (
        !Number.isInteger(Number(exercise.sets)) ||
        Number(exercise.sets) < 1 ||
        !Number.isInteger(Number(exercise.reps)) ||
        Number(exercise.reps) < 1
      ) {
        return setError(
          `Exercise ${index + 1} needs at least one whole-number set and rep.`,
        );
      }
      if (!Number.isFinite(Number(exercise.weight)) || Number(exercise.weight) < 0)
        return setError(`Exercise ${index + 1} load cannot be negative.`);
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        videoUrl: form.videoUrl.trim(),
        exercises: form.exercises.map((exercise) => ({
          name: exercise.name.trim(),
          sets: Number(exercise.sets) || 1,
          reps: Number(exercise.reps) || 1,
          weight: Number(exercise.weight) || 0,
          notes: exercise.notes?.trim() || "",
        })),
        ...(isEditing ? { removeVideo, removeImage } : {}),
        ...(!isEditing && isTrainer && assignedTo ? { assignedTo } : {}),
      };

      const useMultipart = Boolean(imageFile || videoFile);
      const body = useMultipart ? new FormData() : payload;

      if (useMultipart) {
        Object.entries(payload).forEach(([key, value]) =>
          body.append(
            key,
            Array.isArray(value) ? JSON.stringify(value) : String(value),
          ),
        );
        if (imageFile) body.append("image", imageFile);
        if (videoFile) body.append("video", videoFile);
      }

      const response = isEditing
        ? await api.put(
            `/workouts/${id}`,
            body,
            useMultipart
              ? { headers: { "Content-Type": "multipart/form-data" } }
              : undefined,
          )
        : await api.post(
            "/workouts",
            body,
            useMultipart
              ? { headers: { "Content-Type": "multipart/form-data" } }
              : undefined,
          );

      if (!response.data?.success)
        throw new Error(
          response.data?.message || "Workout could not be saved.",
        );

      navigate(isEditing ? `/workouts/${id}` : "/workouts");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to save this workout.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-sm text-forma-text-secondary">
        <Spinner className="size-6 text-forma-brand-ember" />
        <span>Loading workout for editing…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page Header */}
      <PageHeader
        as="header"
        className="flex flex-col gap-4 rounded-2xl border border-forma-border-subtle bg-forma-bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-forma-brand-ember">
            {isEditing ? "Workout Editor" : "Workout Creator"}
          </span>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            {isEditing ? "Edit Workout" : "Create a Workout"}
          </h1>
          <p className="mt-1 text-xs text-forma-text-secondary sm:text-sm">
            {isEditing
              ? "Update workout details, movement specifications, and media."
              : "Build a structured workout routine with movements, sets, and reps."}
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-xs">
          <Link to={isEditing ? `/workouts/${id}` : "/workouts"}>
            <HugeiconsIcon icon={ArrowLeft} className="size-4" />
            Cancel
          </Link>
        </Button>
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

      <form onSubmit={submit} className="space-y-6">
        {/* Section 1: Routine Information */}
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="p-5 sm:p-6">
            <CardTitle className="text-lg font-bold text-forma-text-primary">
              Routine information
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
              Provide general parameters for this training routine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-1.5">
              <Label htmlFor="workout-title" className="text-xs text-forma-text-secondary">
                Workout title *
              </Label>
              <Input
                id="workout-title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={120}
                required
                placeholder="e.g. Upper Body Hypertrophy"
                className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm"
              />
            </div>

            {isTrainer && !isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="assign-client" className="text-xs text-forma-text-secondary">
                  Assign to client (optional)
                </Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger
                    id="assign-client"
                    className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm"
                  >
                    <SelectValue placeholder="Keep in personal library" />
                  </SelectTrigger>
                  <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                    <SelectItem value="none">Keep in personal library</SelectItem>
                    {assignedClients.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="workout-category" className="text-xs text-forma-text-secondary">
                  Category
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => update("category", val)}
                >
                  <SelectTrigger
                    id="workout-category"
                    className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm"
                  >
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="workout-tags" className="text-xs text-forma-text-secondary">
                  Tags (comma separated)
                </Label>
                <Input
                  id="workout-tags"
                  value={form.tags}
                  onChange={(e) => update("tags", e.target.value)}
                  placeholder="e.g. barbell, hypertrophy, chest"
                  className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="workout-description" className="text-xs text-forma-text-secondary">
                Description / Purpose
              </Label>
              <Textarea
                id="workout-description"
                rows={3}
                maxLength={1000}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What is the stimulus or progression target for this routine?"
                className="rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Media Assets */}
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="p-5 sm:p-6">
            <CardTitle className="text-lg font-bold text-forma-text-primary">
              Media & demonstration
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
              Attach a cover graphic or demonstration video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
            {/* Image upload */}
            <div className="space-y-2">
              <Label htmlFor="workout-image" className="text-xs text-forma-text-secondary">
                Cover photo (up to 10 MiB)
              </Label>
              <Input
                id="workout-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectImage}
                className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-forma-bg-surface file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-forma-brand-ember"
              />
              <p className="text-[11px] text-forma-text-disabled">
                {imageFile
                  ? `${imageFile.name} · ${(imageFile.size / 1048576).toFixed(1)} MiB`
                  : imageFileName
                    ? `Current image: ${imageFileName}`
                    : "JPEG, PNG, or WebP format."}
              </p>

              {(imagePreview || currentImage) && !removeImage && (
                <div className="relative mt-2 h-36 w-60 overflow-hidden rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised">
                  <img
                    src={imagePreview || currentImage}
                    alt="Workout cover preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {isEditing && imageFileId && (
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="remove-image"
                    checked={removeImage}
                    onCheckedChange={(checked) => setRemoveImage(Boolean(checked))}
                  />
                  <Label htmlFor="remove-image" className="text-xs text-forma-text-secondary">
                    Remove cover image
                  </Label>
                </div>
              )}
            </div>

            {/* Video link */}
            <div className="space-y-1.5">
              <Label htmlFor="workout-video-url" className="text-xs text-forma-text-secondary">
                Video streaming URL (YouTube or direct MP4/WebM)
              </Label>
              <Input
                id="workout-video-url"
                type="url"
                value={form.videoUrl}
                onChange={(e) => update("videoUrl", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary sm:text-sm"
              />
            </div>

            {/* Video upload */}
            <div className="space-y-2">
              <Label htmlFor="workout-video" className="text-xs text-forma-text-secondary">
                Or upload video file (up to 50 MiB)
              </Label>
              <Input
                id="workout-video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                onChange={selectVideo}
                className="h-10 rounded-xl border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-forma-bg-surface file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-forma-brand-teal"
              />
              <p className="text-[11px] text-forma-text-disabled">
                {videoFile
                  ? `${videoFile.name} · ${(videoFile.size / 1048576).toFixed(1)} MiB`
                  : videoFileName
                    ? `Current video: ${videoFileName}`
                    : "Supported formats: MP4, WebM, MOV."}
              </p>

              {isEditing && videoFileName && (
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="remove-video"
                    checked={removeVideo}
                    onCheckedChange={(checked) => setRemoveVideo(Boolean(checked))}
                  />
                  <Label htmlFor="remove-video" className="text-xs text-forma-text-secondary">
                    Remove uploaded video
                  </Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Exercise Builder */}
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6">
            <div>
              <CardTitle className="text-lg font-bold text-forma-text-primary">
                Exercise movements
              </CardTitle>
              <CardDescription className="text-xs text-forma-text-secondary sm:text-sm">
                {form.exercises.length} prescribed movements
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update("exercises", [...form.exercises, newExercise()])}
              className="border-forma-border-subtle text-xs hover:border-forma-brand-ember/40 hover:bg-forma-bg-surface-raised"
            >
              <HugeiconsIcon icon={Plus} className="size-3.5 text-forma-brand-ember" />
              Add movement
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
            {form.exercises.map((exercise, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised p-4 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-forma-brand-ember">
                    Movement {String(index + 1).padStart(2, "0")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={form.exercises.length === 1}
                    onClick={() =>
                      update(
                        "exercises",
                        form.exercises.filter((_, pos) => pos !== index),
                      )
                    }
                    aria-label={`Remove movement ${index + 1}`}
                    className="size-8 rounded-lg text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error disabled:opacity-40"
                  >
                    <HugeiconsIcon icon={Trash2} className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-forma-text-secondary">
                      Exercise name *
                    </Label>
                    <Input
                      value={exercise.name}
                      onChange={(e) => updateExercise(index, "name", e.target.value)}
                      placeholder="e.g. Barbell Back Squat"
                      required
                      className="h-9 rounded-xl border-forma-border-subtle bg-forma-bg-surface text-xs text-forma-text-primary"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-forma-text-secondary">Sets *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(index, "sets", e.target.value)}
                        required
                        className="h-9 rounded-xl border-forma-border-subtle bg-forma-bg-surface text-xs text-forma-text-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-forma-text-secondary">Reps *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(index, "reps", e.target.value)}
                        required
                        className="h-9 rounded-xl border-forma-border-subtle bg-forma-bg-surface text-xs text-forma-text-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-forma-text-secondary">Load (kg)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={exercise.weight}
                        onChange={(e) => updateExercise(index, "weight", e.target.value)}
                        className="h-9 rounded-xl border-forma-border-subtle bg-forma-bg-surface text-xs text-forma-text-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-forma-text-secondary">
                      Technique cue / notes
                    </Label>
                    <Input
                      value={exercise.notes || ""}
                      onChange={(e) => updateExercise(index, "notes", e.target.value)}
                      maxLength={500}
                      placeholder="e.g. Pause 2 seconds at the bottom"
                      className="h-9 rounded-xl border-forma-border-subtle bg-forma-bg-surface text-xs text-forma-text-primary"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            asChild
            variant="outline"
            className="border-forma-border-subtle text-xs"
          >
            <Link to={isEditing ? `/workouts/${id}` : "/workouts"}>Cancel</Link>
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 bg-forma-brand-ember px-6 text-xs font-bold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
          >
            {submitting ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon icon={Save} className="size-4" />
            )}
            {isEditing ? "Save changes" : "Create routine"}
          </Button>
        </div>
      </form>
    </div>
  );
}
