import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Bell, CalendarDays, CalendarPlus, Dumbbell, LayoutDashboard, MapPinned, MessageSquare, Settings, Target, Users, Utensils } from './ui/icons';
import { useAuth } from '../context/AuthContext';
import DashboardShell from './DashboardShell';

const navigationGroups = [
  {
    label: 'Workspace',
    links: [
      {
        label: 'Dashboard',
        to: '/trainer/dashboard',
        icon: LayoutDashboard,
        end: true,
        activeWhen: (location) =>
          location.pathname === '/trainer/dashboard' && !location.hash,
      },
      { label: 'My clients', to: '/trainer/clients', icon: Users },
    ],
  },
  {
    label: 'Coaching',
    links: [
      { label: 'Live tracking', to: '/trainer/tracking', icon: MapPinned },
      { label: 'Daily goals', to: '/trainer/goals', icon: Target },
      { label: 'Zoom classes', to: '/trainer/classes', icon: CalendarDays },
      { label: 'Create class slot', to: '/trainer/slots', icon: CalendarPlus },
      { label: 'Client meal plans', to: '/trainer/meal-plans', icon: Utensils },
    ],
  },
  {
    label: 'Activity',
    links: [
      { label: 'Messages', to: '/messages', icon: MessageSquare },
      { label: 'Workouts', to: '/workouts', icon: Dumbbell },
      { label: 'Nutrition', to: '/nutrition', icon: Utensils },
      { label: 'Progress', to: '/progress', icon: Activity },
      { label: 'Notifications', to: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'Account',
    links: [
      { label: 'Profile & settings', to: '/settings', icon: Settings },
    ],
  },
];
export default function TrainerLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <DashboardShell
      role="trainer"
      user={user}
      onLogout={handleLogout}
      sidebar={{
        brandTo: '/trainer/dashboard',
        brandContext: 'Trainer panel',
        brandClassName: 'vf-sidebar-brand flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2',
        user,
        userFallback: 'FORGE trainer',
        identityStatus: <span className="vf-sidebar-user-badge">Approved trainer</span>,
        navigationLabel: 'Trainer panel navigation',
        groups: navigationGroups,
        onLogout: handleLogout,
        logoutLabel: 'Log out',
      }}
      header={{ title: 'Trainer workspace' }}
    >
      {children}
    </DashboardShell>
  );
}
