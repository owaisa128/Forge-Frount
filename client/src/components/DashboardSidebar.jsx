import React from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { HugeiconsIcon } from "./ui/icons";
import BrandLogo from "./BrandLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "./ui/sidebar";

export default function DashboardSidebar({
  role,
  open,
  onClose,
  brandTo,
  brandContext,
  brandClassName = "flex items-center gap-3 rounded-xl text-left",
  user,
  userFallback,
  identityStatus,
  identityDetails,
  navigationLabel,
  groups = [],
  navFooter,
}) {
  const location = useLocation();
  const displayName = user?.name || userFallback || "Member";
  const initial = (displayName || "M").trim().charAt(0).toUpperCase();

  const renderNavLink = ({ label: linkLabel, to, icon, end, activeWhen }) => {
    const active = (() => {
      const isActive =
        location.pathname === to || location.pathname.startsWith(`${to}/`);
      if (end)
        return (
          location.pathname === to ||
          (to === "/dashboard" && location.pathname === "/dashboard")
        );
      return activeWhen ? activeWhen(location, isActive) : isActive;
    })();

    return (
      <SidebarMenuItem key={to}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className="w-full min-w-0 rounded-xl"
        >
          <NavLink
            to={to}
            end={end}
            title={linkLabel}
            aria-label={linkLabel}
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-xl text-left"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-accent/60 text-sidebar-foreground">
              <HugeiconsIcon
                aria-hidden="true"
                icon={icon}
                className="size-4"
              />
            </span>
            <span className="truncate">{linkLabel}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <SidebarProvider
        open={open}
        onOpenChange={(nextOpen) => !nextOpen && onClose?.()}
        className="min-h-0! w-0! shrink-0 lg:min-h-screen! lg:w-(--sidebar-width)!"
        style={{
          "--sidebar-width": "15rem",
          "--sidebar": "var(--color-forma-bg-base)",
          "--sidebar-foreground": "var(--forma-text-primary)",
          "--sidebar-accent": "var(--forma-bg-surface-raised)",
          "--sidebar-accent-foreground": "var(--forma-text-primary)",
          "--sidebar-border": "var(--forma-border-subtle)",
          "--sidebar-primary": "var(--forma-brand-ember)",
          "--sidebar-primary-foreground": "var(--forma-text-on-ember)",
          "--sidebar-ring": "var(--forma-brand-ember)",
        }}
      >
        {createPortal(
          <>
            {open && (
              <button
                type="button"
                aria-label={`Close ${role} sidebar`}
                onClick={onClose}
                className="fixed inset-0 z-40 bg-[var(--forma-overlay-scrim)] lg:hidden"
              />
            )}
            <Sidebar
              side="left"
              collapsible="none"
              className={[
                "dashboard-sidebar-shell fixed inset-y-0 left-0 z-50 h-dvh w-(--sidebar-width) min-w-0 max-w-[100vw] overflow-hidden bg-sidebar text-sidebar-foreground transition-transform duration-150 ease-out",
                open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
              ].join(" ")}
              style={{
                "--sidebar-width": "15rem",
                "--sidebar": "var(--color-forma-bg-base)",
                "--sidebar-foreground": "var(--forma-text-primary)",
                "--sidebar-accent": "var(--forma-bg-surface-raised)",
                "--sidebar-accent-foreground": "var(--forma-text-primary)",
                "--sidebar-border": "var(--forma-border-subtle)",
                "--sidebar-primary": "var(--forma-brand-ember)",
                "--sidebar-primary-foreground": "var(--forma-text-on-ember)",
                "--sidebar-ring": "var(--forma-brand-ember)",
              }}
            >
              <SidebarContent className="dashboard-sidebar-content min-w-0 gap-0 overflow-hidden bg-sidebar p-0">
                <SidebarHeader className="shrink-0 flex items-center justify-center w-full gap-3 mt-5 mb-2">
                  <Link
                    to={brandTo}
                    onClick={onClose}
                    className={`${brandClassName} min-w-0 max-w-full`}
                  >
                    <BrandLogo size="sidebar" contextLabel={brandContext} />
                  </Link>
                </SidebarHeader>

                <div className="dashboard-sidebar-divider mx-auto my-2 w-40 shrink-0" />

                <div className="dashboard-sidebar-scroll relative max-h-[80%] min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-10">
                  <nav
                    aria-label={navigationLabel}
                    className="flex min-w-0 flex-col gap-2"
                  >
                    {groups.map(({ label, links }) => (
                      <SidebarGroup key={label} className="max-w-[90%] p-0">
                        <SidebarGroupLabel className="max-w-full truncate px-2.5 py-2 font-mono text-xs font-medium uppercase tracking-[0.08em] text-sidebar-foreground/60">
                          {label}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                          <SidebarMenu className="gap-1.5">
                            {links.map(renderNavLink)}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>
                    ))}
                  </nav>
                </div>
              </SidebarContent>
            </Sidebar>
          </>,
          document.body,
        )}
      </SidebarProvider>
    </>
  );
}
