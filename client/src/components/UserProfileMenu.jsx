import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon, Crown, LogOut, Settings } from "./ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useMembershipDialog } from "./MembershipDialogProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const roleLabels = {
  admin: "Administrator",
  client: "Member",
  trainer: "Trainer",
};

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length
    ? parts
        .slice(0, 2)
        .map((part) => Array.from(part)[0])
        .join("")
        .toUpperCase()
    : "U";
}

export default function UserProfileMenu({ user, role, onLogout }) {
  const displayName = user?.name || roleLabels[role] || "Account";
  const openMembershipDialog = useMembershipDialog();
  const profileButtonRef = useRef(null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={profileButtonRef}
          type="button"
          aria-label="Open profile menu"
          title="Profile menu"
          className="cursor-pointer flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-all"
        >
          <Avatar className="size-9 ring-1 ring-forma-border-subtle">
            <AvatarImage src={user?.avatarUrl || undefined} alt="" />
            <AvatarFallback className="bg-forma-bg-surface-raised font-semibold text-forma-text-primary">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="forma-profile-dropdown"
      >
        {role === "client" && openMembershipDialog && (
          <DropdownMenuItem
            onSelect={() => openMembershipDialog(profileButtonRef.current)}
            className="forma-profile-dropdown__item forma-profile-dropdown__plan cursor-pointer"
          >
            <HugeiconsIcon aria-hidden="true" icon={Crown} />
            <span>Update Plan</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="forma-profile-dropdown__item cursor-pointer">
          <Link to="/settings">
            <HugeiconsIcon aria-hidden="true" icon={Settings} />
            <span>Profile &amp; settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={onLogout}
          className="forma-profile-dropdown__signou cursor-pointert"
        >
          <HugeiconsIcon aria-hidden="true" icon={LogOut} />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
