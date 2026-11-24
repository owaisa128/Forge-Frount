import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui';
import FeatureImage from './ui/FeatureImage';
import useGuidanceDismissal from '../hooks/useGuidanceDismissal';
const pillars = [
  {
    id: 'tracking',
    image: 'progressAnalytics',
    title: 'Track training and progress',
    description: 'Log workouts, meals, and measurements. Review your history over time.',
  },
  {
    id: 'training',
    image: 'workoutTracking',
    title: 'Plan your next workout',
    description: 'Create a routine or start a session. Completed sessions appear in Workouts.',
  },
  {
    id: 'coaching',
    image: 'coaching',
    title: 'Work with a trainer',
    description: 'Browse approved trainers, book an available session, and message your trainer.',
  },
];
export default function FirstRunOnboarding({ userId }) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const { isVisible, dismiss } = useGuidanceDismissal(userId, 'first-run-onboarding');
  const step = pillars[currentStep];
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isVisible && !dialog.open) dialog.showModal();
    if (!isVisible && dialog.open) dialog.close();
    if (isVisible) {
      dialog.querySelector('.forma-onboarding__actions .forma-button--primary')?.focus();
    }
  }, [currentStep, isVisible]);
  const skip = () => {
    dismiss();
  };
  const finish = () => {
    dismiss();
    navigate('/workouts');
  };
  return (
    <dialog
      ref={dialogRef}
      className="forma-onboarding"
      aria-labelledby="forma-onboarding-title"
      aria-describedby="forma-onboarding-description"
      onCancel={(event) => {
        event.preventDefault();
        skip();
      }}
    >
      {' '}
      {isVisible && (
        <div className="forma-onboarding__content">
          {' '}
          <header className="forma-onboarding__topline">
            {' '}
            <span>
              {' '}
              FORGE · {currentStep + 1} of {pillars.length}{' '}
            </span>{' '}
            <button type="button" className="forma-onboarding__skip" onClick={skip}>
              {' '}
              Skip{' '}
            </button>{' '}
          </header>{' '}
          <div className="forma-onboarding__progress" role="group" aria-label="Onboarding progress">
            {' '}
            {pillars.map((pillar, index) => (
              <span
                key={pillar.id}
                className={index <= currentStep ? 'is-complete' : ''}
                aria-current={index === currentStep ? 'step' : undefined}
              />
            ))}{' '}
          </div>{' '}
          <FeatureImage name={step.image} className="forma-onboarding__illustration" />{' '}
          <div className="forma-onboarding__copy">
            {' '}
            <h1 id="forma-onboarding-title">{step.title}</h1>{' '}
            <p id="forma-onboarding-description">{step.description}</p>{' '}
          </div>{' '}
          <footer className="forma-onboarding__actions">
            {' '}
            {currentStep > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep((index) => index - 1)}
              >
                {' '}
                Back{' '}
              </Button>
            )}{' '}
            {currentStep < pillars.length - 1 ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStep((index) => index + 1)}
              >
                {' '}
                Continue{' '}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={finish}>
                View workouts
              </Button>
            )}{' '}
          </footer>{' '}
        </div>
      )}{' '}
    </dialog>
  );
}
