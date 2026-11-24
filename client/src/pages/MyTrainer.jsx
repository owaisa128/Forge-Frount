import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon, BadgeCheck, Check, Dumbbell, Loader2, Lock, Mail, ShieldCheck, UserRound, Users } from "../components/ui/icons";
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import { useMembershipDialog } from '../components/MembershipDialogProvider';
import {
  FEATURE_MIN_PLAN,
  TRAINER_FEATURES,
  hasFeature,
  planTitle,
} from '../utils/membershipAccess';
import {
  getTrainerProfileText,
  getTrainerSpecialization,
  isDirectoryTrainer,
} from '../utils/trainerProfile';
export default function MyTrainer() {
  const { user, updateUser } = useAuth();
  const openMembershipDialog = useMembershipDialog();
  const [membership, setMembership] = useState(user?.membership || null);
  const [error, setError] = useState('');
  const [trainers, setTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [assigning, setAssigning] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .get('/memberships/current')
      .then(({ data }) => {
        if (!data?.success || !data.membership)
          throw new Error('Your active membership could not be loaded.');
        if (active) {
          setMembership(data.membership);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'Unable to load trainer assignment.'
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const trainer = membership?.assignedTrainer;
  const trainerSpecialization = getTrainerSpecialization(trainer);
  const trainerBio = getTrainerProfileText(trainer?.trainerProfile?.bio);
  const needsTrainer = hasFeature(membership, 'trainer') && !trainer;
  useEffect(() => {
    if (!needsTrainer) return undefined;
    let active = true;
    setLoadingTrainers(true);
    api
      .get('/memberships/available-trainers')
      .then(({ data }) => {
        if (active)
          setTrainers(
            (data?.trainers || [])
              .filter(isDirectoryTrainer)
              .filter((item) => item.remainingSlots > 0)
          );
      })
      .catch((requestError) => {
        if (active)
          setError(requestError.response?.data?.message || 'Unable to load available trainers.');
      })
      .finally(() => {
        if (active) setLoadingTrainers(false);
      });
    return () => {
      active = false;
    };
  }, [needsTrainer]);
  const chooseTrainer = useCallback(async () => {
    if (!selectedId) return;
    setAssigning(true);
    setError('');
    try {
      const { data } = await api.post('/memberships/select-trainer', { trainerId: selectedId });
      setMembership(data.membership);
      updateUser((current) => ({ ...current, membership: data.membership }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to assign this trainer.');
    } finally {
      setAssigning(false);
    }
  }, [selectedId, updateUser]);
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {' '}
      <PageHeader
        as="header"
        className="vf-page-banner rounded-2xl border border-forma-status-success/20 bg-forma-bg-surface-raised p-6 sm:p-8"
      >
        {' '}
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-forma-status-success">
          {' '}
          <HugeiconsIcon aria-hidden="true" icon={ShieldCheck} className="h-4 w-4" /> {membership?.planName || 'Trainer'} plan{' '}
        </p>{' '}
        <h1 className="mt-3 text-3xl font-black text-forma-text-primary">Your Trainer</h1>{' '}
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-forma-text-secondary">
          {' '}
          Paid plans include a personal trainer. Available coaching features depend on your plan.{' '}
        </p>{' '}
      </PageHeader>{' '}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-forma-status-error/20 bg-forma-status-error/10 p-4 text-sm text-forma-status-error"
        >
          {' '}
          {error}{' '}
        </p>
      )}{' '}
      {trainer ? (
        <article className="rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface p-6 sm:p-8">
          {' '}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {' '}
            {trainer.avatarUrl ? (
              <img
                src={trainer.avatarUrl}
                alt={`${trainer.name} profile`}
                className="h-20 w-20 rounded-2xl border border-forma-status-success/20 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-forma-status-success/20 bg-forma-status-success/10 text-forma-status-success">
                {' '}
                <HugeiconsIcon aria-hidden="true" icon={Dumbbell} className="h-8 w-8" />{' '}
              </div>
            )}{' '}
            <div className="min-w-0 flex-1">
              {' '}
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-forma-status-success">
                {' '}
                <HugeiconsIcon aria-hidden="true" icon={BadgeCheck} className="h-4 w-4" /> Assigned trainer{' '}
              </p>{' '}
              <h2 className="mt-1 text-2xl font-black text-forma-text-primary">{trainer.name}</h2>{' '}
              <p className="mt-1 text-sm text-forma-text-secondary">
                {' '}
                {trainerSpecialization || 'Specialty not listed'}{' '}
              </p>{' '}
            </div>{' '}
          </div>{' '}
          {trainerBio && (
            <p className="mt-5 text-sm leading-relaxed text-forma-text-secondary">
              {' '}
              {trainerBio}{' '}
            </p>
          )}{' '}
          {trainer.email && (
            <a
              href={`mailto:${trainer.email}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-forma-text-primary/10 px-4 py-3 text-sm font-semibold text-forma-text-primary transition hover:border-forma-status-success/30 hover:bg-forma-status-success/5"
            >
              {' '}
              <HugeiconsIcon aria-hidden="true" icon={Mail} className="h-4 w-4 text-forma-status-success" /> Contact trainer{' '}
            </a>
          )}{' '}
          <div className="mt-6 grid gap-4 border-t border-forma-text-primary/10 pt-5 sm:grid-cols-2">
            {' '}
            <div className="rounded-xl bg-forma-bg-surface/[0.03] p-4">
              {' '}
              <p className="text-xs font-bold uppercase tracking-wider text-forma-text-secondary">
                {' '}
                Your goal{' '}
              </p>{' '}
              <p className="mt-2 text-sm font-semibold text-forma-text-primary">
                {' '}
                {user?.fitnessGoal || 'Not provided'}{' '}
              </p>{' '}
            </div>{' '}
            <div className="rounded-xl bg-forma-bg-surface/[0.03] p-4">
              {' '}
              <p className="text-xs font-bold uppercase tracking-wider text-forma-text-secondary">
                {' '}
                Training experience{' '}
              </p>{' '}
              <p className="mt-2 capitalize text-sm font-semibold text-forma-text-primary">
                {' '}
                {user?.trainingExperience || 'Not provided'}{' '}
              </p>{' '}
            </div>{' '}
            {user?.fitnessRequirements && (
              <div className="rounded-xl bg-forma-bg-surface/[0.03] p-4 sm:col-span-2">
                {' '}
                <p className="text-xs font-bold uppercase tracking-wider text-forma-text-secondary">
                  {' '}
                  Your requirements{' '}
                </p>{' '}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-forma-text-primary">
                  {' '}
                  {user.fitnessRequirements}{' '}
                </p>{' '}
              </div>
            )}{' '}
          </div>{' '}
        </article>
      ) : needsTrainer ? (
        <div className="rounded-2xl border border-forma-status-warning/20 bg-forma-status-warning/5 p-6 sm:p-8">
          {' '}
          <h2 className="flex items-center gap-2 font-bold text-forma-text-primary">
            {' '}
            <HugeiconsIcon aria-hidden="true" icon={Users} className="h-5 w-5 text-forma-status-warning" /> Choose your trainer{' '}
          </h2>{' '}
          <p className="mt-2 text-sm text-forma-text-secondary">
            {' '}
            Your plan includes a trainer. Pick one with an open slot to get started.{' '}
          </p>{' '}
          {loadingTrainers ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-forma-text-secondary">
              {' '}
              <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-4 w-4 animate-spin" /> Loading trainers...{' '}
            </p>
          ) : trainers.length === 0 ? (
            <EmptyState
              type="clients"
              sentence="No trainers have open slots right now. Check back soon or message our team."
              actionLabel="Contact support"
              to="/contact"
            />
          ) : (
            <>
              {' '}
              <div
                className="mt-4 grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Available trainers"
              >
                {' '}
                {trainers.map((item) => (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selectedId === item.id ? 'border-forma-status-success/60 bg-forma-status-success/10' : 'border-forma-text-primary/10 hover:bg-forma-bg-surface/5'}`}
                  >
                    {' '}
                    <input
                      type="radio"
                      name="trainer"
                      value={item.id}
                      checked={selectedId === item.id}
                      onChange={() => setSelectedId(item.id)}
                      className="accent-forma-status-success"
                    />{' '}
                    <span className="min-w-0 flex-1">
                      {' '}
                      <span className="block text-sm font-bold text-forma-text-primary">
                        {' '}
                        {item.name}{' '}
                      </span>{' '}
                      <span className="block text-xs text-forma-text-secondary">
                        {' '}
                        {item.specialization || 'Specialty not listed'}{' '}
                      </span>{' '}
                    </span>{' '}
                    <span className="text-xs text-forma-status-success">
                      {' '}
                      {item.remainingSlots} slots{' '}
                    </span>{' '}
                  </label>
                ))}{' '}
              </div>{' '}
              <button
                type="button"
                onClick={chooseTrainer}
                disabled={!selectedId || assigning}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-forma-brand-ember px-5 text-sm font-bold text-forma-text-primary disabled:opacity-50"
              >
                {' '}
                {assigning && <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-4 w-4 animate-spin" />}Assign this trainer{' '}
              </button>{' '}
            </>
          )}{' '}
        </div>
      ) : (
        <EmptyState
          type="clients"
          sentence="You haven't booked a coach yet. Check your plan options to see which coaching features are included."
          actionLabel="Compare plans"
          onAction={openMembershipDialog}
        />
      )}{' '}
      <section className="rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface p-6">
        {' '}
        <h2 className="text-lg font-bold text-forma-text-primary">What your plan includes</h2>{' '}
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {' '}
          {TRAINER_FEATURES.filter((feature) => feature.key !== 'trainer').map((feature) => {
            const unlocked = hasFeature(membership, feature.key);
            const FeatureLink = unlocked ? Link : 'button';
            return (
              <li key={feature.key}>
                {' '}
                <FeatureLink
                  {...(unlocked
                    ? { to: feature.to }
                    : { type: 'button', onClick: openMembershipDialog })}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${unlocked ? 'border-forma-status-success/20 text-forma-text-primary hover:bg-forma-status-success/5' : 'border-forma-text-primary/10 text-forma-text-secondary hover:bg-forma-bg-surface/5'}`}
                >
                  {' '}
                  {unlocked ? (
                    <HugeiconsIcon aria-hidden="true" icon={Check} className="h-4 w-4 text-forma-status-success" />
                  ) : (
                    <HugeiconsIcon aria-hidden="true" icon={Lock} className="h-4 w-4" />
                  )}{' '}
                  <span className="flex-1">{feature.label}</span>{' '}
                  {!unlocked && (
                    <span className="text-xs font-bold uppercase text-forma-status-error">
                      {' '}
                      {planTitle(FEATURE_MIN_PLAN[feature.key])}{' '}
                    </span>
                  )}{' '}
                </FeatureLink>{' '}
              </li>
            );
          })}{' '}
        </ul>{' '}
      </section>{' '}
    </section>
  );
}
