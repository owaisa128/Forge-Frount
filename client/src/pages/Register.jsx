import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HugeiconsIcon,
  ImagePlus,
  Loader2,
  Mail,
  ShieldCheck,
} from '../components/ui/icons';
import { Button, Card, Field } from '../components/ui';
import BrandLogo from '../components/BrandLogo';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const REGISTRATION_STORAGE_KEY = 'forge_registration_flow';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const readStoredFlow = () => {
  const saved = sessionStorage.getItem(REGISTRATION_STORAGE_KEY);
  if (!saved) return null;
  try {
    const flow = JSON.parse(saved);
    if (
      typeof flow?.registrationId === 'string'
      && /^[a-f0-9]{64}$/i.test(flow.registrationId)
      && ['user', 'trainer'].includes(flow.role)
      && typeof flow.email === 'string'
    ) {
      return flow;
    }
  } catch {
    sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
  }
  return null;
};

const initialMemberDetails = {
  fitnessGoal: '',
  trainingExperience: '',
  height: '',
  weight: '',
  targetWeight: '',
  preferredUnit: 'metric',
  fitnessRequirements: '',
  bio: '',
};

const initialTrainerDetails = {
  phone: '',
  specialization: '',
  experienceYears: '',
  certifications: '',
  bio: '',
};

export default function Register() {
  const [initialFlow] = useState(readStoredFlow);
  const [flow, setFlow] = useState(initialFlow);
  const [stage, setStage] = useState(() =>
    initialFlow?.emailVerified ? 'details' : initialFlow ? 'verify' : 'create'
  );
  const [accountType, setAccountType] = useState(initialFlow?.role || 'user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialFlow?.email || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [memberDetails, setMemberDetails] = useState(initialMemberDetails);
  const [trainerDetails, setTrainerDetails] = useState(initialTrainerDetails);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarName, setAvatarName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [direction, setDirection] = useState('forward');
  const { user, register, registerTrainer, establishSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLocation = location.state?.from;
  const requestedPath =
    typeof requestedLocation === 'string' ? requestedLocation : requestedLocation?.pathname;
  const destinationPath =
    requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
      ? `${requestedPath}${typeof requestedLocation === 'object' ? (requestedLocation.search || '') + (requestedLocation.hash || '') : ''}`
      : '/dashboard';

  useEffect(() => {
    if (user && !flow && stage === 'create') {
      navigate(
        user.role === 'admin'
          ? '/admin/trainers'
          : user.role === 'trainer'
            ? user.trainerApprovalStatus === 'approved'
              ? '/trainer/dashboard'
              : '/trainer/complete-profile'
            : user.profileComplete === false
              ? '/client/complete-profile'
              : destinationPath,
        { replace: true },
      );
    }
  }, [destinationPath, flow, navigate, stage, user]);

  useEffect(() => {
    if (!flow || stage !== 'verify' || flow.emailVerified) return undefined;
    let active = true;
    let timer;

    const checkVerification = async () => {
      try {
        const { data } = await api.get(
          `/auth/registration-status/${encodeURIComponent(flow.registrationId)}`
        );
        if (!active) return;
        if (data.emailVerified) {
          const verifiedFlow = { ...flow, emailVerified: true };
          sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(verifiedFlow));
          setFlow(verifiedFlow);
          setDirection('forward');
          setError('');
          setNotice('Email confirmed. Your details are ready.');
          setStage('details');
          return;
        }
        setNotice('');
        timer = window.setTimeout(checkVerification, 4000);
      } catch (requestError) {
        if (!active) return;
        if (requestError.response?.status === 410) {
          sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
          setFlow(null);
          setStage('create');
          setError(
            requestError.response?.data?.message
              || 'This registration session expired. Start again to receive a new verification link.'
          );
          return;
        }
        setNotice('We are still checking for your confirmation. This page will continue automatically.');
        timer = window.setTimeout(checkVerification, 8000);
      }
    };

    checkVerification();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [flow, stage]);

  const clearFlow = () => {
    sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
    setFlow(null);
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (password !== passwordConfirmation) {
      setError('Those passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const result = accountType === 'trainer'
        ? await registerTrainer(name.trim(), email.trim(), password)
        : await register(name.trim(), email.trim(), password);
      if (!result?.registrationId) {
        throw new Error('Registration started without a verification session. Please try again.');
      }
      const nextFlow = {
        registrationId: result.registrationId,
        role: accountType,
        email: result.email || email.trim().toLowerCase(),
        emailVerified: false,
      };
      sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(nextFlow));
      setFlow(nextFlow);
      setPassword('');
      setPasswordConfirmation('');
      setStage('verify');
      setDirection('forward');
      setNotice(result.message || 'Check your email to confirm your address.');
    } catch (requestError) {
      setError(requestError.message || 'We could not start your registration. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!flow) return;
    setError('');
    setNotice('');
    setResending(true);
    try {
      const { data } = await api.post('/auth/email-verification/resend', {
        email: flow.email,
      });
      setNotice(data.message || 'A new verification email has been sent.');
    } catch (requestError) {
      if (requestError.response?.status === 410) {
        clearFlow();
        setStage('create');
      }
      setError(
        requestError.response?.data?.message
          || requestError.message
          || 'We could not resend the verification email. Try again.'
      );
    } finally {
      setResending(false);
    }
  };

  const updateMemberDetails = (event) => {
    const { name: fieldName, value } = event.target;
    setMemberDetails((current) => ({ ...current, [fieldName]: value }));
  };

  const updateTrainerDetails = (event) => {
    const { name: fieldName, value } = event.target;
    setTrainerDetails((current) => ({ ...current, [fieldName]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    setError('');
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Choose an image smaller than 2 MiB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('We could not read that photo. Choose another image.');
        return;
      }
      setAvatarUrl(reader.result);
      setAvatarName(file.name);
    };
    reader.onerror = () => setError('We could not read that photo. Choose another image.');
    reader.readAsDataURL(file);
  };

  const handleMemberDetails = async (event) => {
    event.preventDefault();
    if (!flow) return;
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/registration/complete', {
        registrationId: flow.registrationId,
        ...memberDetails,
      });
      clearFlow();
      setStage('submitted');
      setDirection('forward');
      establishSession(data);
      navigate(destinationPath, { replace: true });
    } catch (requestError) {
      if (requestError.response?.status === 410) {
        clearFlow();
        setStage('create');
      }
      setError(
        requestError.response?.data?.message
          || requestError.message
          || 'We could not save your details. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrainerDetails = async (event) => {
    event.preventDefault();
    if (!flow) return;
    setError('');
    if (!avatarUrl) {
      setError('Add a profile photo to submit your trainer profile.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/trainers/registration/complete', {
        registrationId: flow.registrationId,
        ...trainerDetails,
        avatarUrl,
      });
      clearFlow();
      setNotice(data.message || 'Your trainer profile is now with the administrator for review.');
      setStage('submitted');
      setDirection('forward');
    } catch (requestError) {
      if (requestError.response?.status === 410) {
        clearFlow();
        setStage('create');
      }
      setError(
        requestError.response?.data?.message
          || requestError.message
          || 'We could not submit your trainer profile. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isDetails = stage === 'details';
  const isTrainer = flow?.role === 'trainer';
  const detailsTitle = isTrainer ? 'Trainer profile' : 'Your details';
  const stepIndex = isDetails || flow?.emailVerified ? 2 : 1;

  return (
    <div className="forge-register">
      <header className="forge-register__topbar">
        <Link to="/" className="forge-register__brand" aria-label="FORGE home">
          <BrandLogo size="nav" />
        </Link>
        {stage !== 'submitted' && (
          <p className="forge-register__signin">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        )}
      </header>

      <div className="forge-register__content">
        {stage === 'submitted' ? (
          <Card as="section" className="forge-register__card forge-register__card--submitted" aria-labelledby="registration-submitted-title">
            <div className="forge-register__submitted-icon" aria-hidden="true">
              <HugeiconsIcon icon={CheckCircle2} />
            </div>
            <p className="forge-register__eyebrow">APPLICATION RECEIVED</p>
            <h1 id="registration-submitted-title">Profile submitted for review</h1>
            <p className="forge-register__intro">
              Your trainer profile is with the administrator for final approval. You do not need
              to keep this page open.
            </p>
            <div className="forge-register__status-box" role="status">
              <HugeiconsIcon icon={Mail} aria-hidden="true" />
              <p>
                We will email you when a decision is made, whether your application is approved or
                declined.
              </p>
            </div>
          </Card>
        ) : (
          <Card
            as="section"
            className={`forge-register__card forge-register__card--${stage}`}
            aria-labelledby="forge-register-title"
            data-direction={direction}
          >
            <div className="forge-register__stepper" aria-label={`Step ${stepIndex} of 2`}>
              <div
                className={`forge-register__step${isDetails || flow?.emailVerified ? ' is-done' : ' is-active'}`}
                aria-current={!isDetails && !flow?.emailVerified ? 'step' : undefined}
              >
                <span className="forge-register__step-number">
                  {isDetails || flow?.emailVerified ? <HugeiconsIcon icon={CheckCircle2} aria-hidden="true" /> : '1'}
                </span>
                <span className="forge-register__step-label">Create account</span>
              </div>
              <span className={`forge-register__step-line${isDetails || flow?.emailVerified ? ' is-done' : ''}`} aria-hidden="true" />
              <div
                className={`forge-register__step${isDetails || flow?.emailVerified ? ' is-active' : ''}`}
                aria-current={isDetails || flow?.emailVerified ? 'step' : undefined}
              >
                <span className="forge-register__step-number">2</span>
                <span className="forge-register__step-label">{detailsTitle}</span>
              </div>
            </div>

            {stage === 'create' && (
              <>
                <div className="forge-register__heading">
                  <p className="forge-register__eyebrow">START WITH FORGE</p>
                  <h1 id="forge-register-title">Let’s get your training set up.</h1>
                  <p>Create an account to keep your training and progress together.</p>
                </div>
                {error && <p className="forge-register__message is-error" role="alert"><HugeiconsIcon icon={AlertCircle} aria-hidden="true" />{error}</p>}
                <form className="forge-register__form" onSubmit={handleCreateAccount}>
                  <Field
                    as="select"
                    id="register-account-type"
                    name="accountType"
                    label="Account type"
                    value={accountType}
                    onChange={(event) => setAccountType(event.target.value)}
                  >
                    <option value="user">Fitness member</option>
                    <option value="trainer">Trainer</option>
                  </Field>
                  <Field
                    id="register-name"
                    label="Full name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                  <Field
                    id="register-email"
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                  <div className="forge-register__field-grid">
                    <div className="forma-field">
                      <label className="forma-field__label" htmlFor="register-password">Password</label>
                      <div className="forma-field__control">
                        <PasswordField
                          id="register-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                          minLength={8}
                          className="forma-field__input"
                        />
                      </div>
                    </div>
                    <div className="forma-field">
                      <label className="forma-field__label" htmlFor="register-password-confirmation">Confirm password</label>
                      <div className="forma-field__control">
                        <PasswordField
                          id="register-password-confirmation"
                          value={passwordConfirmation}
                          onChange={(event) => setPasswordConfirmation(event.target.value)}
                          placeholder="Enter it again"
                          autoComplete="new-password"
                          minLength={8}
                          className="forma-field__input"
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="forge-register__submit" disabled={submitting}>
                    {submitting ? <><HugeiconsIcon icon={Loader2} className="animate-spin" aria-hidden="true" />Starting account...</> : <>Continue <HugeiconsIcon icon={ArrowRight} aria-hidden="true" /></>}
                  </Button>
                </form>
                <p className="forge-register__footer">
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
              </>
            )}

            {stage === 'verify' && flow && (
              <div className="forge-register__verification">
                <div className="forge-register__feature-icon" aria-hidden="true">
                  <HugeiconsIcon icon={flow.emailVerified ? CheckCircle2 : Mail} />
                </div>
                <div className="forge-register__heading">
                  <p className="forge-register__eyebrow">{flow.emailVerified ? 'EMAIL CONFIRMED' : 'ONE QUICK CHECK'}</p>
                  <h1 id="forge-register-title">{flow.emailVerified ? 'Your email is verified.' : 'Confirm your email address.'}</h1>
                  <p>
                    {flow.emailVerified
                      ? 'Continue to your details to finish setting up your account.'
                      : <>We sent a secure confirmation link to <strong>{flow.email}</strong>. Open it to verify your address; this page will move on automatically.</>}
                  </p>
                </div>
                {error && <p className="forge-register__message is-error" role="alert"><HugeiconsIcon icon={AlertCircle} aria-hidden="true" />{error}</p>}
                {notice && <p className="forge-register__message is-note" role="status">{notice}</p>}
                {flow.emailVerified ? (
                  <Button
                    type="button"
                    className="forge-register__submit"
                    onClick={() => {
                      setDirection('forward');
                      setStage('details');
                    }}
                  >
                    Continue to {isTrainer ? 'your profile' : 'your details'} <HugeiconsIcon icon={ArrowRight} aria-hidden="true" />
                  </Button>
                ) : (
                  <div className="forge-register__verification-actions">
                    <span className="forge-register__checking"><span aria-hidden="true" />Waiting for confirmation</span>
                    <Button type="button" variant="secondary" onClick={handleResendVerification} disabled={resending}>
                      {resending ? <><HugeiconsIcon icon={Loader2} className="animate-spin" aria-hidden="true" />Sending...</> : 'Resend email'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {stage === 'details' && flow && (
              <>
                <div className="forge-register__heading forge-register__heading--details">
                  <p className="forge-register__eyebrow">{isTrainer ? 'STEP 2 · TRAINER PROFILE' : 'STEP 2 · YOUR PROFILE'}</p>
                  <h1 id="forge-register-title">{isTrainer ? 'Complete your trainer profile.' : 'Your fitness details.'}</h1>
                  <p>
                    {isTrainer
                      ? 'Tell us about your coaching experience. The administrator will review your profile before your trainer access is approved.'
                      : 'This helps your coach build a plan around you, not a template.'}
                  </p>
                </div>
                {error && <p className="forge-register__message is-error" role="alert"><HugeiconsIcon icon={AlertCircle} aria-hidden="true" />{error}</p>}

                {isTrainer ? (
                  <form className="forge-register__form" onSubmit={handleTrainerDetails}>
                    <div className="forge-register__field-grid">
                      <Field
                        id="trainer-phone"
                        label="Phone number"
                        type="tel"
                        name="phone"
                        value={trainerDetails.phone}
                        onChange={updateTrainerDetails}
                        placeholder="Your contact number"
                        autoComplete="tel"
                        minLength={5}
                        maxLength={40}
                        required
                      />
                      <Field
                        id="trainer-specialization"
                        label="Specialization"
                        type="text"
                        name="specialization"
                        value={trainerDetails.specialization}
                        onChange={updateTrainerDetails}
                        placeholder="e.g. Strength and conditioning"
                        minLength={2}
                        maxLength={120}
                        required
                      />
                    </div>
                    <div className="forge-register__field-grid">
                      <Field
                        id="trainer-experience"
                        label="Years of experience"
                        type="number"
                        name="experienceYears"
                        value={trainerDetails.experienceYears}
                        onChange={updateTrainerDetails}
                        min={0}
                        max={80}
                        step={1}
                        required
                      />
                      <Field
                        id="trainer-certifications"
                        label="Certifications"
                        type="text"
                        name="certifications"
                        value={trainerDetails.certifications}
                        onChange={updateTrainerDetails}
                        placeholder="List relevant certifications"
                        maxLength={1000}
                      />
                    </div>
                    <Field
                      as="textarea"
                      id="trainer-bio"
                      label="Professional bio"
                      name="bio"
                      value={trainerDetails.bio}
                      onChange={updateTrainerDetails}
                      placeholder="Introduce your coaching approach and experience"
                      minLength={20}
                      maxLength={1000}
                      required
                    />
                    <div className="forge-register__photo-field">
                      <label className="forma-field__label" htmlFor="trainer-photo">Profile photo <span>(JPEG, PNG or WebP · max 2 MiB)</span></label>
                      <input
                        id="trainer-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        aria-describedby="trainer-photo-note"
                      />
                      <label className="forge-register__photo-picker" htmlFor="trainer-photo">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Selected trainer profile preview" />
                        ) : (
                          <span className="forge-register__photo-icon"><HugeiconsIcon icon={ImagePlus} aria-hidden="true" /></span>
                        )}
                        <span><strong>{avatarName || 'Choose your profile photo'}</strong><small id="trainer-photo-note">Clear, recent photos help members recognize you.</small></span>
                      </label>
                    </div>
                    <div className="forge-register__form-actions">
                      <Button type="button" variant="secondary" onClick={() => { setError(''); setDirection('back'); setStage('verify'); }}>
                        <HugeiconsIcon icon={ArrowLeft} aria-hidden="true" /> Back
                      </Button>
                      <Button type="submit" className="forge-register__submit" disabled={submitting}>
                        {submitting ? <><HugeiconsIcon icon={Loader2} className="animate-spin" aria-hidden="true" />Submitting...</> : <>Submit for final approval <HugeiconsIcon icon={ShieldCheck} aria-hidden="true" /></>}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form className="forge-register__form" onSubmit={handleMemberDetails}>
                    <div className="forge-register__field-grid">
                      <Field
                        as="select"
                        id="member-fitness-goal"
                        label="Main fitness goal"
                        name="fitnessGoal"
                        value={memberDetails.fitnessGoal}
                        onChange={updateMemberDetails}
                      >
                        <option value="">Choose a goal</option>
                        <option value="Build strength">Build strength</option>
                        <option value="Lose fat">Lose fat</option>
                        <option value="Improve endurance">Improve endurance</option>
                        <option value="Build a consistent routine">Build a consistent routine</option>
                      </Field>
                      <Field
                        as="select"
                        id="member-training-experience"
                        label="Training experience"
                        name="trainingExperience"
                        value={memberDetails.trainingExperience}
                        onChange={updateMemberDetails}
                      >
                        <option value="">Not provided</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </Field>
                    </div>
                    <div className="forge-register__field-grid">
                      <Field
                        id="member-height"
                        label={`Height (${memberDetails.preferredUnit === 'metric' ? 'cm' : 'in'}) · optional`}
                        type="number"
                        name="height"
                        value={memberDetails.height}
                        onChange={updateMemberDetails}
                        min={50}
                        max={300}
                        step="any"
                      />
                      <Field
                        id="member-weight"
                        label={`Current weight (${memberDetails.preferredUnit === 'metric' ? 'kg' : 'lb'}) · optional`}
                        type="number"
                        name="weight"
                        value={memberDetails.weight}
                        onChange={updateMemberDetails}
                        min={20}
                        max={500}
                        step="any"
                      />
                    </div>
                    <div className="forge-register__field-grid">
                      <Field
                        id="member-target-weight"
                        label={`Target weight (${memberDetails.preferredUnit === 'metric' ? 'kg' : 'lb'}) · optional`}
                        type="number"
                        name="targetWeight"
                        value={memberDetails.targetWeight}
                        onChange={updateMemberDetails}
                        min={20}
                        max={500}
                        step="any"
                      />
                      <Field
                        as="select"
                        id="member-units"
                        label="Measurement units"
                        name="preferredUnit"
                        value={memberDetails.preferredUnit}
                        onChange={updateMemberDetails}
                      >
                        <option value="metric">Metric (kg, cm)</option>
                        <option value="imperial">Imperial (lb, in)</option>
                      </Field>
                    </div>
                    <Field
                      as="textarea"
                      id="member-requirements"
                      label="What are your fitness requirements?"
                      name="fitnessRequirements"
                      value={memberDetails.fitnessRequirements}
                      onChange={updateMemberDetails}
                      placeholder="Tell us what you want help with, your preferred workouts, schedule, equipment, or any limitations we should consider."
                      minLength={10}
                      maxLength={1000}
                      required
                    />
                    <Field
                      as="textarea"
                      id="member-bio"
                      label="A little about you · optional"
                      name="bio"
                      value={memberDetails.bio}
                      onChange={updateMemberDetails}
                      placeholder="Your routine, interests, or fitness background"
                      maxLength={500}
                    />
                    <div className="forge-register__form-actions">
                      <Button type="button" variant="secondary" onClick={() => { setError(''); setDirection('back'); setStage('verify'); }}>
                        <HugeiconsIcon icon={ArrowLeft} aria-hidden="true" /> Back
                      </Button>
                      <Button type="submit" className="forge-register__submit" disabled={submitting}>
                        {submitting ? <><HugeiconsIcon icon={Loader2} className="animate-spin" aria-hidden="true" />Saving...</> : <>Save and continue <HugeiconsIcon icon={ArrowRight} aria-hidden="true" /></>}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
