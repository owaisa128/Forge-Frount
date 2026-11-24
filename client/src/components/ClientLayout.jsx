import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon, Bell, BookOpen, Bot, CalendarDays, ChevronRight, Crown, Droplets, Dumbbell, Flame, LifeBuoy, MapPin, Settings, Timer, Users, Utensils } from "./ui/icons";
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasFeature } from '../utils/membershipAccess';
import { MEMBERSHIP_FEATURES } from '../utils/membershipFeatures';
import DashboardShell from './DashboardShell';
import MembershipDialogProvider from './MembershipDialogProvider';
const CLIENT_LINK_GROUPS = [
  {
    label: 'Training & Nutrition',
    links: [
      { label: 'Workouts', to: '/workouts', icon: Dumbbell },
      {
        label: 'Live sessions',
        to: '/classes',
        icon: CalendarDays,
        visibleFor: (membership) => hasFeature(membership, 'zoomClasses'),
      },
      { label: 'Nutrition & Meals', to: '/nutrition', icon: Utensils },
    ],
  },
  {
    label: 'Account',
    links: [
      { label: 'Notifications', to: '/notifications', icon: Bell, visibleFor: () => true },
      { label: 'Support', to: '/support', icon: LifeBuoy, visibleFor: () => true },
      { label: 'Profile & settings', to: '/settings', icon: Settings, visibleFor: () => true },
    ],
  },
];
const FEATURE_ICONS = {
  workoutTracker: Timer,
  dailyCalories: Flame,
  waterTracker: Droplets,
  progress: ChevronRight,
  trainer: Users,
  trainerMessages: ChevronRight,
  liveTracking: MapPin,
  aiChat: Bot,
  transformationJournal: BookOpen,
};
const SIDEBAR_FEATURE_KEYS = new Set(Object.keys(FEATURE_ICONS));
export default function ClientLayout({ children }) {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [plansError, setPlansError] = useState('');
  useEffect(() => {
    let active = true;
    api
      .get('/memberships/plans')
      .then(({ data }) => {
        if (!Array.isArray(data?.plans))
          throw new Error('Membership plan features were not returned.');
        if (active) {
          setPlans(data.plans);
          setPlansError('');
        }
      })
      .catch((error) => {
        if (active)
          setPlansError(
            error.response?.data?.message || error.message || 'Unable to load plan features.'
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const currentPlanSlug = user?.membership?.planSlug || 'free';
  const currentPlan = plans.find((plan) => plan.slug === currentPlanSlug);
  const membership = user?.membership;
  const isPaidMembership =
    Boolean(
      membership?.planSlug &&
        membership.planSlug !== 'free' &&
        (!membership.endsAt || new Date(membership.endsAt) > new Date())
    ) && currentPlan?.active === true;
  const activeMembership = useMemo(
    () => ({
      ...membership,
      featureKeys: isPaidMembership && currentPlan?.active ? currentPlan.featureKeys || [] : [],
    }),
    [membership, isPaidMembership, currentPlan]
  );
  const sidebarFeatures = MEMBERSHIP_FEATURES.filter(
    (feature) =>
      SIDEBAR_FEATURE_KEYS.has(feature.key) &&
      feature.to &&
      hasFeature(activeMembership, feature.key)
  );
  useEffect(() => {
    if (!membership || !currentPlan) return;
    const active = isPaidMembership;
    const featureKeys = active ? currentPlan.featureKeys || [] : [];
    if (JSON.stringify(membership.featureKeys || []) === JSON.stringify(featureKeys)) return;
    updateUser((current) =>
      current?.membership
        ? { ...current, membership: { ...current.membership, featureKeys } }
        : current
    );
  }, [membership, currentPlan, isPaidMembership, updateUser]);
  useEffect(() => {
    const endTime = membership?.endsAt ? new Date(membership.endsAt).getTime() : 0;
    if (!endTime || endTime <= Date.now()) return undefined;
    const timer = window.setTimeout(
      () => {
        updateUser((current) =>
          current?.membership
            ? { ...current, membership: { ...current.membership, featureKeys: [] } }
            : current
        );
      },
      Math.min(endTime - Date.now() + 50, 2147483647)
    );
    return () => window.clearTimeout(timer);
  }, [membership?.endsAt, updateUser]);
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const visibleClientGroups = CLIENT_LINK_GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.visibleFor || link.visibleFor(activeMembership)),
  })).filter((group) => group.links.length > 0);
  const sidebarGroups = [
    ...visibleClientGroups,
    ...(user?.role === 'user' && sidebarFeatures.length > 0
      ? [
          {
            label: 'Included features',
            links: sidebarFeatures.map((feature) => ({
              label: feature.label,
              to: feature.to,
              icon: FEATURE_ICONS[feature.key] || ChevronRight,
            })),
          },
        ]
      : []),
  ];
  const planName = currentPlan?.name || user?.membership?.planName || 'Free Starter';
  const membershipStatus = isPaidMembership && currentPlan?.active ? 'Active' : 'Free access';
  return (
    <MembershipDialogProvider>
      <DashboardShell
        role="client"
        user={user}
        onLogout={handleLogout}
        contentClassName="flex min-h-screen min-w-0 flex-1 flex-col"
        mainClassName="min-w-0 flex-1"
        sidebar={{
          brandTo: '/workouts',
          brandContext: 'Member panel',
          brandClassName: 'vf-sidebar-brand flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2',
          user,
          userFallback: 'FORGE member',
          identityStatus: (
            <span className="vf-sidebar-user-badge">
              <HugeiconsIcon icon={Crown} className="h-3 w-3" aria-hidden="true" />
              {planName} · {membershipStatus}
            </span>
          ),
          identityDetails:
            isPaidMembership && membership?.endsAt ? (
              <p className="vf-sidebar-user-meta mt-2 pl-13 text-xs">
                Expires {new Date(membership.endsAt).toLocaleDateString()}
              </p>
            ) : null,
          navigationLabel: 'Client panel navigation',
          groups: sidebarGroups,
          onLogout: handleLogout,
          navFooter: plansError ? (
            <p role="alert" className="vf-sidebar-error mx-2 mt-4 rounded-xl border p-3 text-xs">
              {plansError}
            </p>
          ) : null,
        }}
        header={{
          title: `${planName} · ${membershipStatus}`,
          menuButtonClassName: 'rounded-xl border border-forma-text-primary/10 p-2 text-forma-text-secondary hover:bg-forma-bg-surface/5 lg:hidden',
        }}
      >
        {children}
      </DashboardShell>
    </MembershipDialogProvider>
  );
}
