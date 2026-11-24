import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  HugeiconsIcon,
  Loader2,
  Mail,
  ShieldCheck,
} from '../components/ui/icons';
import { Button, Card } from '../components/ui';
import BrandLogo from '../components/BrandLogo';
import api from '../api/axios';

export default function VerifyEmail() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token') || '';
  const tokenIsValid = /^[a-f0-9]{64}$/i.test(token);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(
    tokenIsValid ? '' : 'This verification link is missing a valid token. Open the latest link from your email.'
  );
  const [message, setMessage] = useState('');

  const verifyAddress = async () => {
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/email-verification/verify', { token });
      setVerified(true);
      setMessage(data.message || 'Your email address has been confirmed.');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
          || requestError.message
          || 'We could not verify this email address. Try the latest link from your inbox.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forge-register">
      <header className="forge-register__topbar">
        <Link to="/" className="forge-register__brand" aria-label="FORGE home">
          <BrandLogo size="nav" />
        </Link>
      </header>
      <div className="forge-register__content forge-register__content--verify">
        <Card
          as="section"
          className="forge-register__card forge-register__card--verify-page"
          aria-labelledby="verify-email-title"
        >
          <div className={`forge-register__feature-icon${verified ? ' is-success' : ''}`} aria-hidden="true">
            <HugeiconsIcon icon={verified ? CheckCircle2 : Mail} />
          </div>
          <div className="forge-register__heading">
            <p className="forge-register__eyebrow">{verified ? 'ADDRESS CONFIRMED' : 'EMAIL VERIFICATION'}</p>
            <h1 id="verify-email-title">{verified ? 'Your email is verified.' : 'Confirm your email address.'}</h1>
            <p>
              {verified
                ? 'Return to your FORGE registration tab. Your next step will open automatically.'
                : 'Confirm this address so we can continue setting up your FORGE account.'}
            </p>
          </div>
          {error && (
            <p className="forge-register__message is-error" role="alert">
              <HugeiconsIcon icon={AlertCircle} aria-hidden="true" />
              {error}
            </p>
          )}
          {message && (
            <p className="forge-register__message is-note" role="status">
              {message}
            </p>
          )}
          {verified ? (
            <Button as={Link} to="/register" className="forge-register__submit">
              Return to registration <HugeiconsIcon icon={CheckCircle2} aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              className="forge-register__submit"
              onClick={verifyAddress}
              disabled={!tokenIsValid || submitting}
            >
              {submitting
                ? <><HugeiconsIcon icon={Loader2} className="animate-spin" aria-hidden="true" />Confirming email...</>
                : <>Verify email <HugeiconsIcon icon={ShieldCheck} aria-hidden="true" /></>}
            </Button>
          )}
          <p className="forge-register__verify-note">
            <HugeiconsIcon icon={Mail} aria-hidden="true" />
            You can close this tab after verification. Your registration tab will continue automatically.
          </p>
        </Card>
      </div>
    </div>
  );
}
