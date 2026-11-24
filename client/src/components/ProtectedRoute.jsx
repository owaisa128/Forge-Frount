import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HugeiconsIcon, LockKeyhole } from "./ui/icons";
import { hasFeatureAccess, hasMinimumPlan } from '../utils/membershipAccess';
import PageLoadingState from './PageLoadingState';
import { useMembershipDialog } from './MembershipDialogProvider';
import { Button } from './ui/button';
const featureLabel = (feature) =>
  feature
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export default function ProtectedRoute({
  children,
  requiredRole,
  requiredPlan,
  requiredFeature,
  trainerSetupOnly = false,
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const openMembershipDialog = useMembershipDialog();
  if (loading) {
    return <PageLoadingState message="Verifying your session" compact />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (trainerSetupOnly) {
    if (user.role !== 'trainer') return <Navigate to="/login" replace />;
    if (user.trainerApprovalStatus === 'approved')
      return <Navigate to="/trainer/dashboard" replace />;
    if (['awaiting_profile', 'awaiting_admin_review'].includes(user.trainerApprovalStatus))
      return children;
    return <Navigate to="/login" replace />;
  }
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (requiredRole && !allowedRoles.includes(user.role)) {
    const home =
      user.role === 'admin'
        ? '/admin/trainers'
        : user.role === 'trainer'
          ? '/trainer/dashboard'
          : '/dashboard';
    return <Navigate to={home} replace />;
  }
  if (user.role === 'trainer' && user.trainerApprovalStatus !== 'approved') {
    return user.trainerApprovalStatus === 'awaiting_profile' ? (
      <Navigate to="/trainer/complete-profile" replace />
    ) : (
      <Navigate to="/login" replace />
    );
  }
  if (
    user.role === 'user' &&
    user.profileComplete === false &&
    location.pathname !== '/client/complete-profile'
  ) {
    return <Navigate to="/client/complete-profile" replace state={{ from: location }} />;
  }
  const comparePlansAction = openMembershipDialog ? (
    <Button
      type="button"
      onClick={openMembershipDialog}
      className="mt-6 min-h-11 rounded-xl bg-forma-brand-ember px-5 text-sm font-bold text-forma-text-primary transition hover:bg-forma-status-error"
    >
      Compare plans
    </Button>
  ) : (
    <Link
      to="/memberships"
      className="mt-6 rounded-xl bg-forma-brand-ember px-5 py-3 text-sm font-bold text-forma-text-primary transition hover:bg-forma-status-error"
    >
      Compare plans
    </Link>
  );
  if (
    requiredPlan &&
    user.role !== 'admin' &&
    user.role !== 'trainer' &&
    !hasMinimumPlan(user.membership, requiredPlan)
  ) {
    const planName = requiredPlan[0].toUpperCase() + requiredPlan.slice(1);
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        {' '}
        <div className="mb-5 rounded-2xl border border-forma-status-error/20 bg-forma-status-error/10 p-4 text-forma-status-error">
          {' '}
          <HugeiconsIcon aria-hidden="true" icon={LockKeyhole} className="h-8 w-8" />{' '}
        </div>{' '}
        <h1 className="text-2xl font-black text-forma-text-primary">
          {' '}
          {planName} membership required{' '}
        </h1>{' '}
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-forma-text-secondary">
          {' '}
          This feature isn't included in your current plan. Your progress stays saved.{' '}
        </p>{' '}
        {comparePlansAction}{' '}
      </section>
    );
  }
  if (
    requiredFeature &&
    user.role !== 'admin' &&
    user.role !== 'trainer' &&
    !hasFeatureAccess(user.membership, requiredFeature)
  ) {
    const featureName = featureLabel(requiredFeature);
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        {' '}
        <div className="mb-5 rounded-2xl border border-forma-status-error/20 bg-forma-status-error/10 p-4 text-forma-status-error">
          {' '}
          <HugeiconsIcon aria-hidden="true" icon={LockKeyhole} className="h-8 w-8" />{' '}
        </div>{' '}
        <h1 className="text-2xl font-black text-forma-text-primary">{featureName} required</h1>{' '}
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-forma-text-secondary">
          {' '}
          {featureName} isn't included in your current plan. Compare plans to see what's available.{' '}
        </p>{' '}
        {comparePlansAction}{' '}
      </section>
    );
  }
  return children;
}
