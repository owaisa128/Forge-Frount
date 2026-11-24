import React, { useState } from 'react';
import {
  HugeiconsIcon,
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Upload,
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

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

const readImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });

export default function TrainerProfileCompletion() {
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    phone: '',
    specialization: '',
    experienceYears: '',
    certifications: '',
    bio: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    setError('');
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP profile image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setError('Profile images must be 2 MiB or smaller.');
      event.target.value = '';
      return;
    }
    try {
      setAvatarUrl(await readImage(file));
      setImageName(file.name);
    } catch (readError) {
      setError(readError.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!avatarUrl) {
      setError('Upload a professional profile photo to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/trainers/complete-profile', { ...form, avatarUrl });
      updateUser((currentUser) => ({
        ...currentUser,
        trainerApprovalStatus: 'awaiting_admin_review',
      }));
      setSuccess(data.message || 'Profile submitted for administrator review.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit the trainer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Card className="border-forma-border-subtle bg-forma-bg-surface">
        <CardHeader className="border-b border-forma-border-subtle pb-5">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember"
            >
              <HugeiconsIcon aria-hidden="true" icon={ShieldCheck} className="mr-1.5 h-3 w-3" />
              COACH ACCREDITATION
            </Badge>
          </div>
          <CardTitle className="font-display text-2xl font-normal tracking-wide text-forma-text-primary sm:text-3xl">
            {success ? 'APPLICATION SUBMITTED' : 'COMPLETE YOUR COACH PROFILE'}
          </CardTitle>
          <CardDescription className="text-xs text-forma-text-secondary">
            {success
              ? 'Your credentials are now in the administrator review queue.'
              : 'Provide your professional background, certifications, and coaching philosophy for verification.'}
          </CardDescription>
        </CardHeader>

        {success ? (
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forma-status-success/10 text-forma-status-success">
              <HugeiconsIcon icon={CheckCircle2} className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-forma-text-primary">
              Under Administrator Review
            </h2>
            <p className="mx-auto max-w-md text-sm text-forma-text-secondary">
              {success} We will notify you via email as soon as your coaching account has been approved. You may safely navigate away or sign in later.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-6">
              {error && (
                <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Photo Upload Zone */}
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                  Coach Profile Photograph <span className="text-forma-brand-ember">*</span>
                </span>
                <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-forma-border-subtle bg-forma-bg-surface-raised/40 p-4 transition-colors hover:border-forma-brand-ember/50">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Trainer profile preview"
                      className="h-16 w-16 shrink-0 rounded-full border border-forma-brand-ember object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-forma-border-subtle bg-forma-bg-surface text-forma-text-secondary">
                      <HugeiconsIcon aria-hidden="true" icon={ImagePlus} className="h-6 w-6" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-forma-text-primary">
                      {imageName || 'Select a headshot or portrait photo'}
                    </p>
                    <p className="font-mono text-[11px] text-forma-text-muted mt-0.5">
                      JPEG, PNG, or WebP · Up to 2 MiB
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Form Fields */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="trainer-phone" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Contact Phone Number <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Input
                    id="trainer-phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    placeholder="+1 (555) 000-0000"
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="trainer-specialization" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Specialization <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Input
                    id="trainer-specialization"
                    maxLength={120}
                    placeholder="e.g. Strength &amp; Conditioning, Hypertrophy"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    required
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="trainer-experience" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Years of Coaching Experience <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Input
                    id="trainer-experience"
                    type="number"
                    min="0"
                    max="80"
                    step="1"
                    placeholder="e.g. 5"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                    required
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="trainer-certifications" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Certifications &amp; Accreditations
                  </label>
                  <Input
                    id="trainer-certifications"
                    maxLength={1000}
                    placeholder="e.g. CSCS, NASM-CPT, Precision Nutrition"
                    value={form.certifications}
                    onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="trainer-bio" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                    Professional Biography <span className="text-forma-brand-ember">*</span>
                  </label>
                  <Textarea
                    id="trainer-bio"
                    minLength={20}
                    maxLength={1000}
                    rows={4}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    required
                    placeholder="Describe your training methodology, client transformation track record, and athlete expectations (20–1000 characters)..."
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                  />
                  <span className="font-mono text-[11px] text-forma-text-muted">
                    Between 20 and 1,000 characters.
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t border-forma-border-subtle p-6">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
              >
                {submitting ? (
                  <>
                    <HugeiconsIcon icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Application…
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={ShieldCheck} className="mr-2 h-4 w-4" />
                    Submit for Administrator Review
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
