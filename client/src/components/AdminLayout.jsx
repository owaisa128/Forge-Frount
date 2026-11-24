import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  Dumbbell,
  Images,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Utensils,
} from "./ui/icons";
import { useAuth } from "../context/AuthContext";
import DashboardShell from "./DashboardShell";

const navigationGroups = [
  {
    label: "Admin",
    links: [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
        end: true,
      },
      { label: "Workouts", to: "/workouts", icon: Dumbbell, end: true },
      { label: "Nutrition", to: "/nutrition", icon: Utensils, end: true },
      { label: "Progress", to: "/progress", icon: TrendingUp, end: true },
      { label: "Journal", to: "/progress-photos", icon: Images, end: true },
      {
        label: "Profile & settings",
        to: "/settings",
        icon: Settings,
        end: true,
      },
      { label: "Support inbox", to: "/admin/inbox", icon: Inbox, end: true },
      {
        label: "Admin messages",
        to: "/admin/messages",
        icon: MessageSquareText,
        end: true,
      },
      { label: "AI Chat", to: "/ai-chat", icon: MessageSquare, end: true },
    ],
  },
  {
    label: "Management",
    links: [
      {
        label: "Registered clients",
        to: "/admin/clients",
        icon: Users,
        end: true,
      },
      {
        label: "Trainer applications",
        to: "/admin/trainers",
        icon: ShieldCheck,
        end: true,
      },
      {
        label: "All trainers",
        to: "/admin/trainers/directory",
        icon: Dumbbell,
      },
      {
        label: "Membership plans",
        to: "/admin/plans",
        icon: BadgeDollarSign,
        end: true,
      },
    ],
  },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <DashboardShell
      role="admin"
      user={user}
      onLogout={handleLogout}
      sidebar={{
        brandTo: "/admin/trainers",
        brandContext: "Admin panel",
        user,
        userFallback: "Administrator",
        identityStatus: (
          <span className="vf-sidebar-user-badge">Administrator</span>
        ),
        navigationLabel: "Admin navigation",
        groups: navigationGroups,
      }}
      header={{ title: "Admin workspace" }}
    >
      {children}
    </DashboardShell>
  );
}
