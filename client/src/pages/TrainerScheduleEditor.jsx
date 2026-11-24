import React, { useEffect, useState } from 'react';
import {
  HugeiconsIcon,
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Video,
} from '../components/ui/icons';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const initialForm = {
  title: '',
  description: '',
  category: 'Strength',
  startsAt: '',
  durationMinutes: '45',
  zoomUrl: '',
};

export default function TrainerScheduleEditor() {
  const [form, setForm] = useState(initialForm);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get('/memberships/assigned-clients')
      .then(({ data }) => {
        if (!Array.isArray(data.clients)) throw new Error('Assigned clients were not returned.');
        if (active) setClients(data.clients);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'Unable to load your assigned clients.'
          );
        }
      })
      .finally(() => {
        if (active) setLoadingClients(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const startsAt = new Date(form.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      setError('Choose a future date and time for this class.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/trainer-workspace/classes', {
        ...form,
        startsAt: startsAt.toISOString(),
        durationMinutes: Number(form.durationMinutes),
      });
      setSuccess(
        data.message || 'Class scheduled. Your eligible assigned clients have been notified.'
      );
      setForm(initialForm);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to schedule this class.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember"
          >
            <HugeiconsIcon aria-hidden="true" icon={Video} className="mr-1.5 h-3 w-3" />
            LIVE CLINIC CREATOR
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            SCHEDULE A LIVE SESSION
          </h1>
          <p className="text-sm text-forma-text-secondary">
            Set up a group video workout or technique review for your paired clients.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {!loadingClients && !clients.length && !error ? (
        <EmptyState
          type="clients"
          sentence="You need an active assigned client before you can schedule a live session."
          actionLabel="View clients"
          to="/trainer/clients"
        />
      ) : (
        <Card className="border-forma-border-subtle bg-forma-bg-surface">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-forma-text-primary">
              Session Configuration
            </CardTitle>
            <CardDescription className="text-xs text-forma-text-secondary">
              Provide session details and meeting connection parameters.
            </CardDescription>
          </CardHeader>

          <form onSubmit={submit}>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="class-title" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Class Title <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Input
                    id="class-title"
                    name="title"
                    value={form.title}
                    onChange={update}
                    maxLength={120}
                    required
                    placeholder="e.g. Full-Body Kettlebell Mechanics"
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="class-category" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Training Category <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Input
                    id="class-category"
                    name="category"
                    value={form.category}
                    onChange={update}
                    maxLength={50}
                    required
                    placeholder="e.g. Strength, Mobility, HIIT"
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="class-start" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Date &amp; Time <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Input
                    id="class-start"
                    name="startsAt"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={update}
                    required
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="class-duration" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Duration (Minutes) <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Input
                    id="class-duration"
                    name="durationMinutes"
                    type="number"
                    min="10"
                    max="240"
                    value={form.durationMinutes}
                    onChange={update}
                    required
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="class-zoom" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Meeting URL (Zoom / Google Meet) <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Input
                    id="class-zoom"
                    name="zoomUrl"
                    type="url"
                    value={form.zoomUrl}
                    onChange={update}
                    required
                    placeholder="https://zoom.us/j/..."
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="class-description" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Athlete Preparation Notes <span className="text-forma-text-muted">· Optional</span>
                  </label>
                  <Textarea
                    id="class-description"
                    name="description"
                    value={form.description}
                    onChange={update}
                    rows={4}
                    maxLength={1000}
                    placeholder="Specify required equipment, warm-up prerequisites, or space needed..."
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t border-forma-border-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-xs text-forma-text-muted">
                This class will appear automatically in the schedule of all eligible clients.
              </p>

              <Button
                type="submit"
                disabled={submitting || loadingClients || clients.length === 0}
                className="w-full bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
              >
                {submitting || loadingClients ? (
                  <>
                    <HugeiconsIcon icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling…
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={CalendarPlus} className="mr-2 h-4 w-4" />
                    Publish Live Session
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
