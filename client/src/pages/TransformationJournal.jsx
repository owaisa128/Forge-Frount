import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  HugeiconsIcon,
  AlertCircle,
  CalendarDays,
  Check,
  Images,
  Loader2,
  Pencil,
  Scale,
  Trash2,
  Upload,
  X,
  Sparkles,
} from '../components/ui/icons';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/card';
import { AspectRatio } from '../components/ui/aspect-ratio';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '../components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';
import { useConfirm } from '../context/ConfirmDialogContext';

const todayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDate = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatCaptureTime = (dateTime) =>
  new Date(dateTime).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

function PrivatePhotoImage({ photo, className, alt }) {
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setError(false);

    api
      .get(`/transformation-photos/${photo.id}/image`, { responseType: 'blob' })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-forma-bg-surface-raised font-mono text-xs text-forma-status-error ${className}`}
      >
        Photo unavailable
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-forma-bg-surface-raised text-forma-text-secondary ${className}`}
      >
        <HugeiconsIcon
          aria-hidden="true"
          icon={Loader2}
          className="h-6 w-6 animate-spin text-forma-brand-ember"
        />
      </div>
    );
  }

  return <img src={imageUrl} alt={alt} className={className} />;
}

export default function TransformationJournal() {
  const confirm = useConfirm();
  const [photos, setPhotos] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [progressError, setProgressError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const uploadFormRef = useRef(null);
  const photoInputRef = useRef(null);
  const [photoNotes, setPhotoNotes] = useState('');
  const [selection, setSelection] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadJournal = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setPhotoError('');
    setProgressError('');

    const [photoResult, progressResult] = await Promise.allSettled([
      api.get('/transformation-photos'),
      api.get('/progress'),
    ]);

    if (photoResult.status === 'fulfilled' && photoResult.value.data?.success) {
      setPhotos(photoResult.value.data.photos || []);
    } else {
      setPhotoError(
        photoResult.status === 'rejected'
          ? photoResult.reason.response?.data?.message || 'Could not load private photos.'
          : 'Could not load private photos.'
      );
    }

    if (progressResult.status === 'fulfilled' && progressResult.value.data?.success) {
      setProgress(progressResult.value.data.progress || []);
    } else {
      setProgressError(
        progressResult.status === 'rejected'
          ? progressResult.reason.response?.data?.message || 'Could not load progress history.'
          : 'Could not load progress history.'
      );
    }

    if (photoResult.status === 'rejected' && progressResult.status === 'rejected') {
      setLoadError('The journal could not load. Check your connection and try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setPhotoError('');
    if (!photoFile) {
      setPhotoError('Choose a progress photo to upload.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (photoFile.size > 8 * 1024 * 1024) {
      setPhotoError('Photo must be 8 MiB or smaller.');
      return;
    }

    const data = new FormData();
    data.append('photo', photoFile);
    data.append('date', todayDate());
    data.append('notes', photoNotes);

    setUploading(true);
    try {
      const response = await api.post('/transformation-photos', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setPhotos((current) =>
        [response.data.photo, ...current].sort((a, b) => b.date.localeCompare(a.date))
      );
      setPhotoFile(null);
      setPhotoNotes('');
      uploadFormRef.current?.reset();
      setUploadOpen(false);
    } catch (error) {
      setPhotoError(error.response?.data?.message || 'Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const setSelectedFile = (file) => {
    setPhotoError('');
    if (!file) {
      setPhotoFile(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      setPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Photo must be 8 MiB or smaller.');
      setPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    setPhotoFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    setSelectedFile(event.dataTransfer.files?.[0] || null);
  };

  const toggleComparison = (id) => {
    setSelection((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : current.length < 2
          ? [...current, id]
          : [current[1], id]
    );
  };

  const startEditing = (photo) => {
    setEditingId(photo.id);
    setEditDate(photo.date);
    setEditNotes(photo.notes || '');
    setPhotoError('');
  };

  const saveEdit = async (id) => {
    setSavingEdit(true);
    setPhotoError('');
    try {
      const response = await api.patch(`/transformation-photos/${id}`, {
        date: editDate,
        notes: editNotes,
      });
      setPhotos((current) =>
        current
          .map((photo) => (photo.id === id ? response.data.photo : photo))
          .sort((a, b) => b.date.localeCompare(a.date))
      );
      setEditingId('');
    } catch (error) {
      setPhotoError(error.response?.data?.message || 'Could not update photo details.');
    } finally {
      setSavingEdit(false);
    }
  };

  const deletePhoto = async (photo) => {
    if (
      !(await confirm({
        title: 'Delete this progress photo?',
        description: 'This photo will be permanently removed from your progress journal.',
        confirmLabel: 'Delete photo',
        destructive: true,
      }))
    )
      return;

    setPhotoError('');
    try {
      await api.delete(`/transformation-photos/${photo.id}`);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setSelection((current) => current.filter((id) => id !== photo.id));
      if (editingId === photo.id) setEditingId('');
    } catch (error) {
      setPhotoError(error.response?.data?.message || 'Could not delete photo.');
    }
  };

  const selectedPhotos = selection
    .map((id) => photos.find((photo) => photo.id === id))
    .filter(Boolean)
    .sort((first, second) => first.date.localeCompare(second.date));

  const openUploadDialog = () => {
    setPhotoError('');
    setUploadOpen(true);
  };
  const clearSelectedFile = () => {
    setPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };
  const focusTimeline = () =>
    document
      .getElementById('photo-timeline')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 border-b border-forma-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-forma-brand-ember">
              Your progress
            </p>
            <Badge
              variant="outline"
              className="border-forma-border-subtle font-normal text-forma-text-secondary"
            >
              <HugeiconsIcon aria-hidden="true" icon={Images} className="mr-1.5 h-3.5 w-3.5" />
              Private journal
            </Badge>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
              Progress photos
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-forma-text-secondary sm:text-base">
              Keep a private visual record of your training and compare milestones over time.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={openUploadDialog}
          className="w-full shrink-0 bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
        >
          <HugeiconsIcon aria-hidden="true" icon={Upload} data-icon="inline-start" />
          Add progress photo
        </Button>
      </header>

      {loadError && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <HugeiconsIcon aria-hidden="true" icon={AlertCircle} className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={loadJournal}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {photoError && !uploadOpen && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <HugeiconsIcon aria-hidden="true" icon={AlertCircle} className="h-4 w-4" />
          <AlertDescription>{photoError}</AlertDescription>
        </Alert>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] gap-5 overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
          <DialogHeader className="pr-10">
            <DialogTitle className="font-display text-2xl font-normal tracking-tight">
              Add a progress photo
            </DialogTitle>
            <DialogDescription>
              Choose a clear photo and add a note if you like. The date defaults to today, and the upload time is recorded automatically.
            </DialogDescription>
          </DialogHeader>

          {photoError && (
            <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
              <HugeiconsIcon aria-hidden="true" icon={AlertCircle} className="h-4 w-4" />
              <AlertDescription>{photoError}</AlertDescription>
            </Alert>
          )}

          <form ref={uploadFormRef} onSubmit={handleUpload} className="flex flex-col gap-5">
            <FieldGroup className="grid gap-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <Field className="min-w-0">
                <FieldLabel htmlFor="journal-photo-upload" className="text-sm font-medium text-forma-text-primary">
                  Photo
                </FieldLabel>
                <Input
                  ref={photoInputRef}
                  id="journal-photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="sr-only"
                />
                <div
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  className={`w-full rounded-xl transition-colors ${
                    isDragging ? 'ring-2 ring-forma-brand-ember ring-offset-2 ring-offset-forma-bg-surface' : ''
                  }`}
                >
                  <AspectRatio
                    ratio={4 / 5}
                    className="overflow-hidden rounded-xl border border-dashed border-forma-border-subtle bg-forma-bg-surface-raised"
                  >
                    {photoPreviewUrl ? (
                      <>
                        <img
                          src={photoPreviewUrl}
                          alt={`Preview of ${photoFile?.name || 'selected image'}`}
                          className="size-full object-contain"
                        />
                        <Badge className="absolute left-3 top-3 border border-forma-border-subtle bg-forma-bg-base/90 text-forma-text-primary">
                          Preview
                        </Badge>
                        <Badge className="absolute bottom-3 left-3 max-w-[calc(100%-5rem)] truncate border border-forma-border-subtle bg-forma-bg-base/90 text-forma-text-primary">
                          {photoFile?.name || 'Selected image'}
                        </Badge>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          onClick={clearSelectedFile}
                          aria-label="Remove selected photo"
                          className="absolute right-3 top-3"
                        >
                          <HugeiconsIcon aria-hidden="true" icon={X} />
                        </Button>
                      </>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-forma-brand-ember/10 text-forma-brand-ember">
                          <HugeiconsIcon aria-hidden="true" icon={Upload} className="size-5" />
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-forma-text-primary">
                            Drop a photo here
                          </p>
                          <FieldDescription className="text-xs">
                            JPEG, PNG, or WebP · Up to 8 MiB
                          </FieldDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => photoInputRef.current?.click()}
                        >
                          Choose photo
                        </Button>
                      </div>
                    )}
                  </AspectRatio>
                </div>
                <FieldDescription>
                  Photos stay private to your account.
                </FieldDescription>
              </Field>

              <Field className="justify-start">
                <FieldLabel htmlFor="photo-notes-input" className="text-sm font-medium text-forma-text-primary">
                  Note <span className="font-normal text-forma-text-muted">(optional)</span>
                </FieldLabel>
                <Textarea
                  id="photo-notes-input"
                  value={photoNotes}
                  onChange={(event) => setPhotoNotes(event.target.value)}
                  maxLength={1000}
                  rows={5}
                  placeholder="What would you like to remember about this check-in?"
                  className="min-h-32 border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted"
                />
                <FieldDescription>
                  Add context to this check-in. You can edit the note later.
                </FieldDescription>
                <Badge
                  variant="outline"
                  className="mt-auto flex w-fit items-center gap-2 whitespace-normal border-forma-border-subtle px-3 py-2 font-normal text-forma-text-secondary"
                >
                  <HugeiconsIcon aria-hidden="true" icon={CalendarDays} className="h-4 w-4 shrink-0 text-forma-brand-ember" />
                  <span>
                    <span className="font-medium text-forma-text-primary">{formatDate(todayDate())}</span>
                    <span> · upload time saved automatically</span>
                  </span>
                </Badge>
              </Field>
            </FieldGroup>

            <DialogFooter className="border-t border-forma-border-subtle pt-4 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || loading || !photoFile}
                className="bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
              >
                {uploading ? (
                  <>
                    <HugeiconsIcon aria-hidden="true" icon={Loader2} data-icon="inline-start" className="animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <HugeiconsIcon aria-hidden="true" icon={Upload} data-icon="inline-start" />
                    Save photo
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Before & After Comparison */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-medium tracking-tight text-forma-text-primary">
              <HugeiconsIcon aria-hidden="true" icon={Sparkles} className="h-4 w-4 text-forma-brand-ember" />
              Before &amp; After Comparison
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm text-forma-text-secondary">
              Choose two photos from your timeline. The earlier check-in is shown first.
            </CardDescription>
          </div>
          {selection.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelection([])}
              className="shrink-0 border-forma-border-subtle text-forma-text-secondary hover:text-forma-text-primary"
            >
              <HugeiconsIcon aria-hidden="true" icon={X} data-icon="inline-start" />
              Clear selection ({selection.length}/2)
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((index) => {
            const photo = selectedPhotos[index];
            const isFirst = index === 0;
            const label = isFirst ? 'Before' : 'After';

            return (
              <Card
                key={label}
                className="min-w-0 overflow-hidden border-forma-border-subtle bg-forma-bg-base/50"
              >
                <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-forma-border-subtle px-4 py-3">
                  <CardTitle className="font-heading text-sm font-medium text-forma-text-primary">
                    {label}
                  </CardTitle>
                  {photo ? (
                    <Badge
                      variant="outline"
                      className={
                        isFirst
                          ? 'border-forma-brand-teal/40 bg-forma-brand-teal/10 font-normal text-forma-brand-teal'
                          : 'border-forma-brand-ember/40 bg-forma-brand-ember/10 font-normal text-forma-brand-ember'
                      }
                    >
                      {formatDate(photo.date)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-normal text-forma-text-muted">
                      Awaiting photo
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 p-3 sm:p-4">
                  <AspectRatio
                    ratio={4 / 5}
                    className="overflow-hidden rounded-lg bg-forma-bg-surface-raised"
                  >
                    {photo ? (
                      <PrivatePhotoImage
                        photo={photo}
                        alt={`${label} progress photo dated ${photo.date}`}
                        className="size-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                        <HugeiconsIcon
                          aria-hidden="true"
                          icon={Images}
                          className="h-6 w-6 text-forma-text-muted"
                        />
                        <p className="max-w-48 text-sm leading-5 text-forma-text-secondary">
                          {photos.length
                            ? `Select a photo for your ${label.toLowerCase()} check-in.`
                            : 'Add a photo to start your comparison.'}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={photos.length ? focusTimeline : openUploadDialog}
                        >
                          {photos.length ? 'Choose photo' : 'Add first photo'}
                        </Button>
                      </div>
                    )}
                  </AspectRatio>
                  {photo && (
                    <p className="min-h-5 text-sm leading-5 text-forma-text-secondary">
                      {photo.notes || 'No note added'}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Photo Timeline */}
      <section id="photo-timeline" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-normal tracking-tight text-forma-text-primary">
            <HugeiconsIcon aria-hidden="true" icon={CalendarDays} className="h-5 w-5 text-forma-brand-ember" />
            Photo timeline
          </h2>
          <Badge variant="outline" className="font-normal text-forma-text-secondary">
            {photos.length} {photos.length === 1 ? 'record' : 'records'}
          </Badge>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-forma-text-secondary">
            <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-5 w-5 animate-spin text-forma-brand-ember" />
            Loading timeline photos…
            </div>
        ) : photos.length === 0 ? (
          <EmptyState
            type="progress"
            sentence="Your photo timeline is empty. Add a private progress photo to get started."
            actionLabel="Add progress photo"
            onAction={openUploadDialog}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => {
              const selected = selection.includes(photo.id);
              const editing = editingId === photo.id;

              return (
                <Card
                  key={photo.id}
                  className={`overflow-hidden border transition-all ${
                    selected
                      ? 'border-forma-brand-ember shadow-md shadow-forma-brand-ember/5'
                      : 'border-forma-border-subtle bg-forma-bg-surface hover:border-forma-border-subtle/80'
                  }`}
                >
                  <AspectRatio ratio={4 / 5} className="bg-forma-bg-surface-raised">
                    <PrivatePhotoImage
                      photo={photo}
                      alt={`Progress photo dated ${photo.date}`}
                      className="size-full object-contain"
                    />
                  </AspectRatio>
                  <CardContent className="space-y-3 p-4">
                    {editing ? (
                      <div className="space-y-3">
                        <FieldGroup className="gap-3">
                          <Field>
                            <FieldLabel
                              htmlFor={`photo-edit-date-${photo.id}`}
                              className="text-xs font-medium text-forma-text-secondary"
                            >
                              Date
                            </FieldLabel>
                            <Input
                              id={`photo-edit-date-${photo.id}`}
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="h-9 border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                            />
                          </Field>
                          <Field>
                            <FieldLabel
                              htmlFor={`photo-edit-notes-${photo.id}`}
                              className="text-xs font-medium text-forma-text-secondary"
                            >
                              Notes
                            </FieldLabel>
                            <Textarea
                              id={`photo-edit-notes-${photo.id}`}
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              maxLength={1000}
                              rows={2}
                              className="border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary"
                            />
                          </Field>
                        </FieldGroup>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId('')}
                            className="h-8 text-xs text-forma-text-secondary"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingEdit}
                            onClick={() => saveEdit(photo.id)}
                            className="h-8 bg-forma-brand-ember text-xs font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                          >
                            {savingEdit ? (
                              <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <HugeiconsIcon aria-hidden="true" icon={Check} className="mr-1 h-3.5 w-3.5" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="flex items-center gap-1.5 font-mono text-xs font-medium text-forma-brand-ember">
                              <HugeiconsIcon aria-hidden="true" icon={CalendarDays} className="h-3.5 w-3.5" />
                              {formatDate(photo.date)}
                            </p>
                            {photo.createdAt && (
                              <p className="mt-1 pl-5 font-mono text-[11px] text-forma-text-muted">
                                Uploaded {formatCaptureTime(photo.createdAt)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(photo)}
                              aria-label={`Edit photo dated ${photo.date}`}
                              className="h-7 w-7 text-forma-text-secondary hover:text-forma-text-primary"
                            >
                              <HugeiconsIcon aria-hidden="true" icon={Pencil} className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePhoto(photo)}
                              aria-label={`Delete photo dated ${photo.date}`}
                              className="h-7 w-7 text-forma-text-secondary hover:text-forma-status-error"
                            >
                              <HugeiconsIcon aria-hidden="true" icon={Trash2} className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <p className="min-h-5 text-xs text-forma-text-secondary">
                          {photo.notes || <span className="text-forma-text-muted">No notes provided</span>}
                        </p>

                        <Button
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleComparison(photo.id)}
                          className={`w-full text-xs font-medium ${
                            selected
                              ? 'bg-forma-brand-ember text-forma-text-on-ember hover:bg-forma-brand-ember-hover'
                              : 'border-forma-border-subtle text-forma-text-secondary hover:text-forma-text-primary'
                          }`}
                        >
                          {selected ? 'Selected for comparison' : 'Select for comparison'}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Measurement History Sync Table */}
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-medium tracking-tight text-forma-text-primary">
            <HugeiconsIcon aria-hidden="true" icon={Scale} className="h-4 w-4 text-forma-brand-ember" />
            Weight &amp; Measurement History
          </CardTitle>
          <CardDescription className="text-xs text-forma-text-secondary">
            Cross-referenced with check-in entries from your Progress logger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progressError ? (
            <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{progressError}</AlertDescription>
            </Alert>
          ) : progress.length === 0 && !loading ? (
            <EmptyState
              type="progress"
              sentence="No check-ins logged yet. Add your first measurement to see your trend."
              actionLabel="Add check-in"
              to="/progress"
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-forma-border-subtle">
              <Table>
                <TableHeader className="bg-forma-bg-surface-raised/50">
                  <TableRow className="border-forma-border-subtle hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Date</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Weight</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Chest</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Waist</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Hips</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">Body Fat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.map((record) => (
                    <TableRow key={record._id} className="border-forma-border-subtle hover:bg-forma-bg-surface-raised/40">
                      <TableCell className="font-mono text-xs font-medium text-forma-brand-ember">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell className="text-xs text-forma-text-primary">{record.weight ?? '—'} kg</TableCell>
                      <TableCell className="text-xs text-forma-text-secondary">{record.chest ? `${record.chest} cm` : '—'}</TableCell>
                      <TableCell className="text-xs text-forma-text-secondary">{record.waist ? `${record.waist} cm` : '—'}</TableCell>
                      <TableCell className="text-xs text-forma-text-secondary">{record.hips ? `${record.hips} cm` : '—'}</TableCell>
                      <TableCell className="text-xs text-forma-text-secondary">
                        {record.bodyFatPercentage ? `${record.bodyFatPercentage}%` : '—'}
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
