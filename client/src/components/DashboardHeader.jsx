import React from "react";
import { Link, useLocation } from "react-router-dom";
import { HugeiconsIcon, Menu, ShieldCheck } from "./ui/icons";
import NotificationSheet from "./NotificationSheet";
import UserProfileMenu from "./UserProfileMenu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

const routeLabels = {
  dashboard: "Dashboard",
  workouts: "Workouts",
  "workout-tracker": "Workout tracker",
  nutrition: "Nutrition",
  progress: "Progress",
  profile: "Profile",
  settings: "Settings",
  notifications: "Notifications",
  support: "Support",
  memberships: "Membership",
  classes: "Classes",
  clients: "Clients",
  trainers: "Trainers",
  directory: "Directory",
  plans: "Membership plans",
  inbox: "Support inbox",
  goals: "Goals",
  tracking: "Live tracking",
  slots: "Class slots",
  "meal-plans": "Meal plans",
  messages: "Messages",
  "progress-photos": "Transformation journal",
  "ai-chat": "AI chat",
};

function getRouteLabel(segment) {
  return (
    routeLabels[segment] ||
    segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function getWorkspacePath(role) {
  if (role === "admin") return "/admin/clients";
  if (role === "trainer") return "/trainer/dashboard";
  return "/dashboard";
}

export default function DashboardHeader({
  role,
  sidebarOpen,
  onOpenSidebar,
  menuButtonClassName = "rounded-lg p-2 transition-colors hover:bg-forma-bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-forma-brand-teal lg:hidden",
  user,
  onLogout,
}) {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const currentLabel = segments.length
    ? getRouteLabel(segments[segments.length - 1])
    : "Dashboard";
  const headerLabel =
    pathname === "/admin/messages" ? "Admin messages" : currentLabel;
  const workspacePath = getWorkspacePath(role);

  return (
    <header className="vf-workspace-header sticky top-0 z-30 flex min-h-18 shrink-0 items-center gap-3 px-4 py-2 sm:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label={`Open ${role} sidebar`}
        aria-expanded={sidebarOpen}
        className={menuButtonClassName}
      >
        <HugeiconsIcon aria-hidden="true" icon={Menu} className="h-5 w-5" />
      </button>
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap gap-2 truncate text-sm">
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbLink
              asChild
              className="text-forma-text-secondary hover:text-forma-text-primary"
            >
              <Link to={workspacePath}>Workspace</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {segments.length > 0 && (
            <>
              <BreadcrumbSeparator className="shrink-0 text-forma-text-disabled" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-medium text-forma-text-primary">
                  {headerLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <NotificationSheet />
        {role === "admin" && (
          <span
            className="forma-admin-badge"
            aria-label="Administrator account"
            title="Administrator"
          >
            <HugeiconsIcon aria-hidden="true" icon={ShieldCheck} />
            <span className="hidden sm:inline">Administrator</span>
          </span>
        )}
        <UserProfileMenu user={user} role={role} onLogout={onLogout} />
      </div>
    </header>
  );
}
