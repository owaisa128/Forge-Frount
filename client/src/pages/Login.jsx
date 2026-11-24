import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon, AlertCircle, Loader2 } from "../components/ui/icons";
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field } from '../components/ui';
import PasswordField from '../components/PasswordField';
import BrandLogo from '../components/BrandLogo';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLocation = location.state?.from;
  const destinationPath =
    typeof requestedLocation === 'string' ? requestedLocation : requestedLocation?.pathname;
  const requestedRedirect =
    destinationPath?.startsWith('/') && !destinationPath.startsWith('//')
      ? `${destinationPath}${typeof requestedLocation === 'object' ? (requestedLocation.search || '') + (requestedLocation.hash || '') : ''}`
      : '/dashboard';
  const trainerDestination = (trainer) => {
    if (trainer.trainerApprovalStatus === 'approved') return '/trainer/dashboard';
    if (trainer.trainerApprovalStatus === 'awaiting_profile') return '/trainer/complete-profile';
    return null;
  };
  const redirectTo =
    user?.role === 'admin'
      ? '/admin/trainers'
      : user?.role === 'trainer'
        ? trainerDestination(user)
        : user?.profileComplete === false
          ? '/client/complete-profile'
          : requestedRedirect;

  useEffect(() => {
    if (user && redirectTo) {
      navigate(redirectTo, {
        replace: true,
        state: redirectTo === '/client/complete-profile' ? { from: requestedRedirect } : undefined,
      });
    }
  }, [user, navigate, redirectTo, requestedRedirect]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Add your email and password to sign in.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (loginError) {
      setError(loginError.message || 'We could not sign you in. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forge-login">
      <header className="forge-login__topbar">
        <Link to="/" className="forge-login__brand" aria-label="FORGE home">
          <BrandLogo size="nav" />
        </Link>
      </header>
      <div className="forge-login__content">
        <Card
          as="section"
          className="forge-login__card"
          aria-labelledby="forge-login-title"
        >
          <div className="forge-login__heading">
            <h1 id="forge-login-title">
              {resetMode ? 'Reset your password.' : 'Welcome back.'}
            </h1>
            <p>
              {resetMode
                ? 'Enter your email and we’ll send a link to reset your password.'
                : 'Sign in to keep your training and progress together.'}
            </p>
          </div>

          {!resetMode && user?.role === 'trainer' && !redirectTo && (
            <p className="forma-auth-message is-note" role="status">
              Your trainer profile is awaiting administrator approval. You can sign in again after
              it is approved.
            </p>
          )}
          {!resetMode && error && (
            <p className="forma-auth-message is-error" role="alert">
              <HugeiconsIcon icon={AlertCircle} aria-hidden="true" />
              {error}
            </p>
          )}

          {resetMode ? (
            <>
              {resetError && (
                <p className="forge-login__message is-error" role="alert">
                  <HugeiconsIcon icon={AlertCircle} aria-hidden="true" />
                  {resetError}
                </p>
              )}
              {resetSent ? (
                <p className="forge-login__message is-success" role="status">
                  If an account exists for that email, a reset link is on its way. Check your
                  inbox.
                </p>
              ) : (
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setResetError('');
                    setResetSubmitting(true);
                    try {
                      const { data } = await api.post('/auth/password-reset/request', {
                        email: email.trim().toLowerCase(),
                      });
                      if (!data?.success) {
                        throw new Error(data?.message || 'Unable to request a password reset.');
                      }
                      setResetSent(true);
                    } catch (requestError) {
                      setResetError(
                        requestError.response?.data?.message ||
                          requestError.message ||
                          'Unable to request a password reset. Try again.',
                      );
                    } finally {
                      setResetSubmitting(false);
                    }
                  }}
                  className="forge-login__form"
                >
                  <Field
                    id="reset-request-email"
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                  <Button
                    type="submit"
                    className="forge-login__submit"
                    disabled={resetSubmitting}
                  >
                    {resetSubmitting ? (
                      <>
                        <HugeiconsIcon
                          icon={Loader2}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                        Sending link...
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>
              )}
              <button
                type="button"
                className="forge-login__back"
                onClick={() => {
                  setResetMode(false);
                  setResetError('');
                  setResetSent(false);
                }}
              >
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="forge-login__form">
                <Field
                  id="login-email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                <div className="forma-field">
                  <label className="forma-field__label" htmlFor="login-password">
                    Password
                  </label>
                  <div className="forma-field__control">
                    <PasswordField
                      id="login-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="forma-field__input"
                      toggleClassName="forge-login__password-toggle"
                    />
                  </div>
                </div>
                <div className="forge-login__forgot-row">
                  <button
                    type="button"
                    className="forge-login__forgot"
                    onClick={() => {
                      setResetMode(true);
                      setResetError('');
                      setResetSent(false);
                      setError('');
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="forge-login__submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <HugeiconsIcon icon={Loader2} className="animate-spin" aria-hidden="true" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <p className="forge-login__footer">
                New to FORGE?{' '}
                <Link to="/register" state={{ from: requestedLocation }}>
                  Create an account
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
