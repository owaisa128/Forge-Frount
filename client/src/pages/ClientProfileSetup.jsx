import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HugeiconsIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  UserRound,
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
import { useAuth } from '../context/AuthContext';

const goalOptions = [
  'Overall Fitness',
  'Weight Loss',
  'Muscle Gain',
  'Endurance',
  'Strength Training',
];

export default function ClientProfileSetup() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fitnessGoal: user?.fitnessGoal || '',
    fitnessRequirements: user?.fitnessRequirements || '',
    trainingExperience: user?.trainingExperience || '',
    height: user?.height || '',
    weight: user?.weight || '',
    targetWeight: user?.targetWeight || '',
    bio: user?.bio || '',
    preferredUnit: user?.preferredUnit || 'metric',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.fitnessRequirements.trim().length < 10) {
      setError('Please describe your fitness requirements in at least 10 characters.');
      return;
    }

    for (const [label, value, min, max] of [
      ['Height', form.height, 50, 300],
      ['Current weight', form.weight, 20, 500],
      ['Target weight', form.targetWeight, 20, 500],
    ]) {
      if (
        value !== '' &&
        (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)
      ) {
        setError(`${label} must be between ${min} and ${max}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        fitnessRequirements: form.fitnessRequirements.trim(),
        bio: form.bio.trim(),
        preferredUnit: form.preferredUnit,
        profileComplete: true,
      };

      if (form.fitnessGoal) payload.fitnessGoal = form.fitnessGoal;
      if (form.trainingExperience) payload.trainingExperience = form.trainingExperience;
      ['height', 'weight', 'targetWeight'].forEach((field) => {
        if (form[field] !== '') payload[field] = Number(form[field]);
      });

      const { data } = await api.put('/auth/profile', payload);
      if (!data?.success || !data.user) {
        throw new Error(data?.message || 'Your fitness profile could not be saved.');
      }

      updateUser(data.user);
      const requestedDestination = location.state?.from;
      const destinationPath =
        typeof requestedDestination === 'string'
          ? requestedDestination
          : requestedDestination?.pathname;
      const target =
        destinationPath?.startsWith('/') && !destinationPath.startsWith('//')
          ? `${destinationPath}${typeof requestedDestination === 'object' ? (requestedDestination.search || '') + (requestedDestination.hash || '') : ''}`
          : '/dashboard';
      navigate(target, { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to save your fitness profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    'flex h-10 w-full rounded-md border border-forma-border-subtle bg-forma-bg-surface-raised px-3 py-2 text-sm text-forma-text-primary outline-none focus:border-forma-brand-ember';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {error && (
        <Alert variant="destructive" className="mb-6 border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="border-b border-forma-border-subtle pb-5">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember"
            >
              <HugeiconsIcon aria-hidden="true" icon={UserRound} className="mr-1.5 h-3 w-3" />
              ONBOARDING
            </Badge>
          </div>
          <CardTitle className="font-display text-2xl font-normal tracking-wide text-forma-text-primary sm:text-3xl">
            COMPLETE YOUR FITNESS PROFILE
          </CardTitle>
          <CardDescription className="text-xs text-forma-text-secondary">
            Provide your targets and history so our coaches and algorithms can tailor your routine and nutrition plans.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Primary Fitness Goal
                </label>
                <select
                  value={form.fitnessGoal}
                  onChange={(e) => setForm({ ...form, fitnessGoal: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Select your main goal</option>
                  {goalOptions.map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Training Experience
                </label>
                <select
                  value={form.trainingExperience}
                  onChange={(e) => setForm({ ...form, trainingExperience: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Select your level</option>
                  <option value="beginner">Beginner (0–1 years)</option>
                  <option value="intermediate">Intermediate (1–3 years)</option>
                  <option value="advanced">Advanced (3+ years)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Height (cm) <span className="text-forma-text-muted">· Optional</span>
                </label>
                <Input
                  type="number"
                  min="50"
                  max="300"
                  step="0.1"
                  placeholder="e.g. 178"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                  className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Current Weight (kg) <span className="text-forma-text-muted">· Optional</span>
                </label>
                <Input
                  type="number"
                  min="20"
                  max="500"
                  step="0.1"
                  placeholder="e.g. 75"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Target Weight (kg) <span className="text-forma-text-muted">· Optional</span>
                </label>
                <Input
                  type="number"
                  min="20"
                  max="500"
                  step="0.1"
                  placeholder="e.g. 70"
                  value={form.targetWeight}
                  onChange={(e) => setForm({ ...form, targetWeight: e.target.value })}
                  className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Measurement System
                </label>
                <select
                  value={form.preferredUnit}
                  onChange={(e) => setForm({ ...form, preferredUnit: e.target.value })}
                  className={selectClass}
                >
                  <option value="metric">Metric (kg, cm)</option>
                  <option value="imperial">Imperial (lb, in)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                Fitness Requirements &amp; Limitations <span className="text-forma-brand-ember">*</span>
              </label>
              <Textarea
                value={form.fitnessRequirements}
                onChange={(e) => setForm({ ...form, fitnessRequirements: e.target.value })}
                minLength={10}
                maxLength={1000}
                rows={4}
                required
                className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                placeholder="Detail what you want help with, available equipment (gym, home dumbbells, bodyweight), schedule preferences, injuries, or dietary constraints..."
              />
              <span className="font-mono text-[11px] text-forma-text-muted">
                Minimum 10 characters. Up to 1,000 characters.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                Bio &amp; Background <span className="text-forma-text-muted">· Optional</span>
              </label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={500}
                rows={3}
                className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                placeholder="Tell us about your sports history, daily routine, or personal interests..."
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col-reverse gap-4 border-t border-forma-border-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-forma-text-secondary">
              <HugeiconsIcon aria-hidden="true" icon={CheckCircle2} className="h-4 w-4 text-forma-status-success" />
              You can adjust these settings at any time in your Settings panel.
            </p>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover sm:w-auto"
            >
              {saving ? (
                <>
                  <HugeiconsIcon aria-hidden="true" icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                  Saving Profile…
                </>
              ) : (
                <>
                  <HugeiconsIcon aria-hidden="true" icon={Save} className="mr-2 h-4 w-4" />
                  Save and Continue
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
