import React, { useCallback, useEffect, useState } from 'react';
import {
  HugeiconsIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Target,
  Trash2,
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
import { Alert, AlertDescription } from '../components/ui/alert';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';
import { useConfirm } from '../context/ConfirmDialogContext';

const ACTIVITIES = ['walking', 'jogging', 'running'];
const tz = () => new Date().getTimezoneOffset();

export default function TrainerGoals() {
  const confirm = useConfirm();
  const [clients, setClients] = useState([]);
  const [goals, setGoals] = useState([]);
  const [clientId, setClientId] = useState('');
  const [activityTypes, setActivityTypes] = useState(['walking']);
  const [targetDistanceKm, setTargetDistanceKm] = useState('');
  const [targetMinutes, setTargetMinutes] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadGoals = useCallback(async () => {
    try {
      const { data } = await api.get('/goals/trainer', { params: { tz: tz() } });
      setGoals(Array.isArray(data.goals) ? data.goals : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load goals.');
    }
  }, []);

  useEffect(() => {
    api
      .get('/memberships/assigned-clients')
      .then(({ data }) =>
        setClients(
          (Array.isArray(data.clients) ? data.clients : []).filter(
            (client) =>
              client.membership?.accessLevel === 'premium' ||
              client.membership?.planSlug === 'premium'
          )
        )
      )
      .catch((requestError) =>
        setError(requestError.response?.data?.message || 'Unable to load assigned clients.')
      );

    loadGoals();
    const interval = window.setInterval(loadGoals, 30000);
    return () => window.clearInterval(interval);
  }, [loadGoals]);

  const toggleActivity = (type) =>
    setActivityTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api.post('/goals', {
        clientId,
        activityTypes,
        targetDistanceKm: Number(targetDistanceKm) || 0,
        targetMinutes: Number(targetMinutes) || 0,
        note,
      });
      setNotice('Daily goal assigned successfully. The client has been notified.');
      setTargetDistanceKm('');
      setTargetMinutes('');
      setNote('');
      await loadGoals();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to assign the goal.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (
      !(await confirm({
        title: 'Remove this daily goal?',
        description: 'The client will no longer see or track this goal.',
        confirmLabel: 'Remove goal',
        destructive: true,
      }))
    )
      return;

    try {
      await api.delete(`/goals/${id}`);
      await loadGoals();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove the goal.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember"
          >
            <HugeiconsIcon aria-hidden="true" icon={Target} className="mr-1.5 h-3 w-3" />
            PREMIUM TRACKING
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            ASSIGN DAILY TARGETS
          </h1>
          <p className="text-sm text-forma-text-secondary">
            Set daily walking, jogging, or running metrics for your Premium athletes. They record them via GPS and you follow live.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert className="border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {/* Target Setup Form */}
      <Card id="goal-assignment-form" className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-forma-text-primary">
            Target Configuration
          </CardTitle>
          <CardDescription className="text-xs text-forma-text-secondary">
            Assigning a new goal replaces the client&apos;s previous active target.
          </CardDescription>
        </CardHeader>

        <form onSubmit={submit}>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="goal-client-select" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                Select Premium Athlete <span className="text-forma-brand-ember">*</span>
              </label>
              <select
                id="goal-client-select"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-forma-border-subtle bg-forma-bg-surface-raised px-3 py-2 text-sm text-forma-text-primary outline-none focus:border-forma-brand-ember"
              >
                <option value="">
                  {clients.length ? 'Select a Premium athlete' : 'No Premium athletes available'}
                </option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                Allowed Activities
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITIES.map((type) => {
                  const active = activityTypes.includes(type);
                  return (
                    <Button
                      key={type}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleActivity(type)}
                      className={`capitalize ${
                        active
                          ? 'bg-forma-brand-ember text-xs font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover'
                          : 'border-forma-border-subtle text-xs text-forma-text-secondary hover:text-forma-text-primary'
                      }`}
                    >
                      {type}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Target Distance (km)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="200"
                  step="0.1"
                  value={targetDistanceKm}
                  onChange={(e) => setTargetDistanceKm(e.target.value)}
                  placeholder="e.g. 5.0"
                  className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Target Moving Time (Minutes)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="1440"
                  step="1"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(e.target.value)}
                  placeholder="e.g. 45"
                  className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                Instructions / Coach Note <span className="text-forma-text-muted">· Optional</span>
              </label>
              <Input
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Keep heart rate in Zone 2 for recovery day."
                className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-t border-forma-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-xs text-forma-text-muted">
              Must provide at least distance or time. If both are set, both must be achieved.
            </span>

            <Button
              type="submit"
              disabled={
                busy ||
                !clientId ||
                !activityTypes.length ||
                (!Number(targetDistanceKm) && !Number(targetMinutes))
              }
              className="w-full bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
            >
              {busy ? (
                <>
                  <HugeiconsIcon icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Target} className="mr-2 h-4 w-4" />
                  Assign Daily Target
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Today's Client Progress */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-normal tracking-wide text-forma-text-primary">
            TODAY&apos;S ATHLETE PROGRESS
          </h2>
          <span className="font-mono text-xs text-forma-text-muted">
            Auto-refreshes every 30s
          </span>
        </div>

        {!goals.length ? (
          <EmptyState
            type="progress"
            sentence="Active client targets and completion telemetry will appear here once assigned."
            actionLabel={clients.length ? 'Assign target' : 'View roster'}
            {...(clients.length
              ? {
                  onAction: () =>
                    document
                      .getElementById('goal-assignment-form')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
                }
              : { to: '/trainer/clients' })}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => {
              const met = goal.today?.met;
              const percent = Math.min(100, Math.round(goal.today?.percent || 0));

              return (
                <Card
                  key={goal._id}
                  className="flex flex-col justify-between border-forma-border-subtle bg-forma-bg-surface transition-all hover:border-forma-border-subtle/80"
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-forma-text-primary">
                          {goal.client?.name || 'Athlete'}
                        </CardTitle>
                        <p className="font-mono text-xs capitalize text-forma-text-muted">
                          {goal.activityTypes.join(', ')}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(goal._id)}
                        aria-label="Remove goal"
                        className="h-8 w-8 text-forma-text-secondary hover:text-forma-status-error"
                      >
                        <HugeiconsIcon icon={Trash2} className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-forma-brand-teal">
                        Target:{' '}
                        {[
                          goal.targetDistanceKm > 0 && `${goal.targetDistanceKm} km`,
                          goal.targetMinutes > 0 && `${goal.targetMinutes} min`,
                        ]
                          .filter(Boolean)
                          .join(' + ')}{' '}
                        / day
                      </span>

                      <Badge
                        variant="outline"
                        className={
                          met
                            ? 'border-forma-status-success/30 bg-forma-status-success/10 font-mono text-[10px] text-forma-status-success'
                            : 'border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-[10px] text-forma-brand-ember'
                        }
                      >
                        {met ? 'Completed' : `${percent}% Done`}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4">
                    {/* Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-forma-bg-surface-raised">
                      <div
                        className={`h-full transition-all duration-500 ${
                          met ? 'bg-forma-status-success' : 'bg-forma-brand-ember'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs text-forma-text-secondary">
                      <span>Logged: {goal.today?.distanceKm || 0} km</span>
                      <span>{goal.today?.minutes || 0} min moving</span>
                      <span>
                        {goal.today?.sessions || 0} session{goal.today?.sessions === 1 ? '' : 's'}
                      </span>
                    </div>

                    {goal.note && (
                      <p className="rounded-lg bg-forma-bg-surface-raised/40 p-2 text-xs text-forma-text-muted">
                        Note: {goal.note}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
