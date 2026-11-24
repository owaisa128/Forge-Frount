import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardShell({
  children,
  role,
  user,
  onLogout,
  sidebar,
  header = {},
  rootClassName = "bg-(--forma-bg-base)",
  contentClassName = "min-w-0 flex-1",
  mainClassName = "min-w-0",
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <div
      className={`min-h-screen w-full min-w-0 ${rootClassName} text-forma-text-primary lg:flex`}
    >
      <DashboardSidebar
        {...sidebar}
        role={role}
        open={sidebarOpen}
        onClose={closeSidebar}
      />
      <div className={`w-full min-w-0 ${contentClassName}`}>
        <DashboardHeader
          {...header}
          role={role}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          user={user}
          onLogout={onLogout}
        />
        <div className={mainClassName}>{children}</div>
      </div>
    </div>
  );
}
