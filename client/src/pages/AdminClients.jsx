import React, { useCallback, useEffect, useState } from "react";
import {
  HugeiconsIcon,
  Copy,
  Dumbbell,
  HelpCircle,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Utensils,
} from "../components/ui/icons";
import api from "../api/axios";
import { useConfirm } from "../context/ConfirmDialogContext";
import EmptyState from "../components/EmptyState";
import AdminNotice from "../components/AdminNotice";
import MetricHelp from "../components/MetricHelp";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../components/ui/alert";
import { Spinner } from "../components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
const roleStyles = {
  admin:
    "border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error",
  trainer:
    "border-forma-status-warning/30 bg-forma-status-warning/10 text-forma-status-warning",
  user: "border-forma-text-primary/10 bg-forma-bg-surface/5 text-forma-text-secondary",
};
export default function AdminClients() {
  const confirm = useConfirm();
  const [clients, setClients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState(""); // Selected client for modal inspection
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetailsLoading, setClientDetailsLoading] = useState(false);
  const [activitySummary, setActivitySummary] = useState(null); // Client role change & delete action states
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get("/admin/users", { params });
      if (!data?.success || !Array.isArray(data.users)) {
        throw new Error(
          data?.message || "Invalid response from users endpoint.",
        );
      }
      setClients(data.users);
      setTotalCount(data.total ?? data.users.length);
      setTotalUsers(data.totalUsers ?? data.total ?? data.users.length);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setLoadError(
        err.response?.data?.message ||
          err.message ||
          "Could not load registered clients.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);
  const viewClientDetails = async (client) => {
    setSelectedClient(client);
    setActivitySummary(null);
    setClientDetailsLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${client._id || client.id}`);
      if (data?.success) {
        setSelectedClient(data.user || client);
        setActivitySummary(data.activitySummary || null);
      }
    } catch (err) {
      console.warn("Could not fetch activity summary for user:", err.message);
    } finally {
      setClientDetailsLoading(false);
    }
  };
  const handleCopyClientDetails = async (client) => {
    const clientId = client._id || client.id;
    const registeredDate = client.createdAt
      ? new Date(client.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";
    const details = [
      `Name: ${client.name || "Unnamed client"}`,
      `Email: ${client.email || "No email"}`,
      `User ID: ${clientId}`,
      `Role: ${client.role === "user" ? "Client" : client.role || "Client"}`,
      `Registered: ${registeredDate}`,
      `Goal: ${client.fitnessGoal || "Not provided"}`,
      `Account status: ${client.isSuspended ? "Suspended" : "Active"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setActionError("");
      setNotice("Client details copied to clipboard.");
    } catch {
      setNotice("");
      setActionError(
        "Could not copy client details. Check clipboard permissions and try again.",
      );
    }
  };
  const handleRoleChange = async (clientId, newRole) => {
    const client = clients.find((item) => (item._id || item.id) === clientId);
    if (!client || client.role === newRole) return;

    const roleLabel = newRole === "user" ? "client" : newRole;
    const confirmed = await confirm({
      title: `Change ${client.name || "this user's"} role to ${roleLabel}?`,
      description: `This changes the account's access level to ${roleLabel}.`,
      confirmLabel: "Change role",
    });
    if (!confirmed) return;

    setUpdatingId(clientId);
    setActionError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/admin/users/${clientId}/role`, {
        role: newRole,
      });
      setNotice(data.message || "User role updated.");
      const leavesCurrentResults =
        newRole === "admin" || (roleFilter && roleFilter !== newRole);
      if (leavesCurrentResults) {
        if (page > 1 && clients.length === 1) {
          setPage((currentPage) => currentPage - 1);
        } else {
          await fetchClients();
        }
      } else {
        setClients((prev) =>
          prev.map((c) =>
            (c._id || c.id) === clientId ? { ...c, role: newRole } : c,
          ),
        );
      }
      if (
        selectedClient &&
        (selectedClient._id || selectedClient.id) === clientId
      ) {
        setSelectedClient((prev) => ({ ...prev, role: newRole }));
      }
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Could not update user role.",
      );
    } finally {
      setUpdatingId("");
    }
  };
  const handleSuspensionChange = async (client) => {
    const clientId = client._id || client.id;
    const suspended = !client.isSuspended;
    const confirmed = await confirm({
      title: `${suspended ? "Suspend" : "Restore"} ${client.name || "this account"}?`,
      description: suspended
        ? "This user will no longer be able to sign in until the account is restored."
        : "This user will be able to sign in and use the account again.",
      confirmLabel: suspended ? "Suspend account" : "Restore account",
      destructive: suspended,
    });
    if (!confirmed) return;

    setUpdatingId(clientId);
    setActionError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/admin/users/${clientId}/suspension`, {
        suspended,
      });
      setClients((prev) =>
        prev.map((item) =>
          (item._id || item.id) === clientId
            ? { ...item, isSuspended: suspended }
            : item,
        ),
      );
      setNotice(
        data.message || `User account ${suspended ? "suspended" : "restored"}.`,
      );
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Could not update account suspension.",
      );
    } finally {
      setUpdatingId("");
    }
  };
  const handleDeleteClient = async (clientId, clientName) => {
    if (
      !(await confirm({
        title: `Permanently delete "${clientName}"?`,
        description:
          "This permanently deletes the user and all associated records.",
        confirmLabel: "Delete user",
        destructive: true,
      }))
    )
      return;
    setDeletingId(clientId);
    setActionError("");
    setNotice("");
    try {
      const { data } = await api.delete(`/admin/users/${clientId}`);
      setNotice(data.message || "User deleted successfully.");
      setClients((prev) => prev.filter((c) => (c._id || c.id) !== clientId));
      setTotalCount((count) => Math.max(0, count - 1));
      setTotalUsers((count) => Math.max(0, count - 1));
      if (
        selectedClient &&
        (selectedClient._id || selectedClient.id) === clientId
      ) {
        setSelectedClient(null);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not delete user.");
    } finally {
      setDeletingId("");
    }
  };
  return (
    <div className="vf-theme-page mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminNotice
        type="error"
        message={actionError}
        onDismiss={() => setActionError("")}
        duration={6000}
      />
      <AdminNotice
        type="success"
        message={notice}
        onDismiss={() => setNotice("")}
        duration={5000}
      />
      {/* Search & Filter Controls */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-forma-text-primary sm:text-3xl">
            Manage clients
          </h1>
          <p className="mt-1.5 text-sm text-forma-text-secondary">
            Search and manage registered client accounts.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={fetchClients}
          disabled={loading}
          aria-label="Refresh clients"
          title="Refresh clients"
          className="mt-1 size-9 shrink-0 rounded-full bg-transparent text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-brand-teal"
        >
          {loading ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={RefreshCw} aria-hidden="true" />
          )}
        </Button>
      </header>
      <section
        aria-label="Search and filter clients"
        className="mb-6 flex justify-center"
      >
        <div className="w-full max-w-2xl">
          <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <HugeiconsIcon
                  icon={Search}
                  className="size-4 text-forma-text-secondary"
                  aria-hidden="true"
                />
              </span>
              <Input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search clients..."
                aria-label="Search registered clients"
                className="h-9 rounded-xl border-forma-border-subtle bg-forma-bg-surface pl-9 text-sm text-forma-text-primary placeholder:text-forma-text-disabled"
              />
            </div>
            <Select
              value={roleFilter || "all"}
              onValueChange={(value) => {
                setRoleFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Filter clients by role"
                className="h-9 w-full rounded-xl border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary sm:w-44"
              >
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="user">Clients (User)</SelectItem>
                <SelectItem value="trainer">Trainers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div
            aria-live="polite"
            className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1 text-xs text-forma-text-secondary sm:justify-between"
          >
            <span>
              Showing
              <strong className="font-semibold text-forma-text-primary">
                {totalCount === 0 ? 0 : (page - 1) * 10 + 1}–
                {Math.min(page * 10, totalCount)}
              </strong>
              {" of "}
              <strong className="font-semibold text-forma-text-primary">
                {totalCount}
              </strong>
              matching results
            </span>
            <span>
              Total clients
              <strong className="font-semibold text-forma-text-primary">
                {totalUsers}
              </strong>
            </span>
          </div>
        </div>
      </section>
      {/* Main Content Area */}
      <div className="max-w-4xl m-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-15 text-sm text-forma-text-secondary">
            <Spinner className="size-7 text-forma-status-error" />
            <span>Finding user's records...</span>
          </div>
        ) : loadError ? (
          <Alert
            variant="destructive"
            className="border-forma-status-error/25 bg-forma-status-error/5 text-forma-status-error"
          >
            <AlertTitle className="font-semibold">
              Failed to retrieve client records
            </AlertTitle>
            <AlertDescription className="text-forma-status-error/90">
              {loadError}
            </AlertDescription>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchClients}
              className="mt-2 text-forma-status-error hover:bg-forma-status-error/10 hover:text-forma-status-error"
            >
              <HugeiconsIcon icon={RefreshCw} aria-hidden="true" />
              Try again
            </Button>
          </Alert>
        ) : clients.length === 0 ? (
          <EmptyState
            type="clients"
            sentence={
              search.trim() || roleFilter
                ? "No client records match these filters."
                : "There are no client records yet."
            }
            actionLabel={
              search.trim() || roleFilter ? "Clear filters" : "Refresh records"
            }
            onAction={() => {
              if (search.trim() || roleFilter) {
                setSearch("");
                setRoleFilter("");
                setPage(1);
              } else {
                fetchClients();
              }
            }}
          />
        ) : (
          <div className="w-full overflow-hidden rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface">
            <Table className="min-w-[680px] table-fixed text-left text-forma-text-secondary">
              <TableHeader className="bg-forma-bg-surface font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                <TableRow className="border-forma-text-primary/10 hover:bg-transparent">
                  <TableHead className="h-10 w-[24%] px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                    Client
                  </TableHead>
                  <TableHead className="h-10 w-[25%] px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                    Email
                  </TableHead>
                  <TableHead className="h-10 w-[12%] px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                    Role
                  </TableHead>
                  <TableHead className="h-10 w-[17%] px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                    Registered
                  </TableHead>
                  <TableHead className="h-10 w-[15%] px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                    Goal
                  </TableHead>
                  <TableHead className="h-10 w-[7%] px-2 py-2.5">
                    <span className="sr-only">Row actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-forma-text-primary/5">
                {clients.map((client) => {
                  const clientId = client._id || client.id;
                  const registeredDate = client.createdAt
                    ? new Date(client.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A";
                  const initials = client.name
                    ? client.name
                        .split(" ")
                        .map((namePart) => namePart[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "VF";
                  return (
                    <TableRow
                      key={clientId}
                      tabIndex={0}
                      onClick={(event) => {
                        if (
                          event.target.closest(
                            "button, a, input, [role='checkbox'], [role='menuitem']",
                          )
                        ) {
                          return;
                        }
                        viewClientDetails(client);
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          viewClientDetails(client);
                        }
                      }}
                      className="cursor-pointer border-forma-text-primary/5 transition-colors hover:bg-forma-bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forma-brand-ember"
                    >
                      <TableCell className="max-w-0 px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="size-8 ring-1 ring-forma-border-subtle">
                            <AvatarImage
                              src={client.avatarUrl || undefined}
                              alt=""
                            />
                            <AvatarFallback className="text-xs text-center font-bold text-forma-status-error">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-[16px] text-forma-text-primary"
                              title={client.name || "Unnamed client"}
                            >
                              {client.name || "Unnamed client"}
                            </p>
                            <p className="truncate max-w-7 font-mono text-xs text-forma-text-secondary">
                              ID: {String(clientId)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0 px-3 py-3">
                        <span
                          className="block truncate text-[14px] text-forma-text-secondary"
                          title={client.email || ""}
                        >
                          {client.email || "No email"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <div className="flex min-w-0 flex-col items-start gap-1">
                          <span
                            className={`inline-flex max-w-full items-center truncate rounded-full border px-1.5 py-0.5 text-xs font-semibold capitalize leading-none ${roleStyles[client.role] || roleStyles.user}`}
                          >
                            {client.role === "user" ? "Client" : client.role}
                          </span>
                          {client.isSuspended && (
                            <span className="text-xs font-medium text-forma-status-error">
                              Suspended
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-xs text-forma-text-secondary">
                        <span className="block truncate" title={registeredDate}>
                          {registeredDate}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-0 px-3 py-3">
                        <span
                          className="block truncate text-xs text-forma-text-secondary"
                          title={client.fitnessGoal || "Not provided"}
                        >
                          {client.fitnessGoal || "Not provided"}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${client.name || "client"}`}
                              className="size-8 rounded-lg text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-text-primary cursor-pointer"
                            >
                              <HugeiconsIcon
                                icon={MoreHorizontal}
                                aria-hidden="true"
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary"
                          >
                            <DropdownMenuItem
                              onSelect={() => handleCopyClientDetails(client)}
                            >
                              <HugeiconsIcon icon={Copy} aria-hidden="true" />
                              Copy details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => viewClientDetails(client)}
                            >
                              See details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={updatingId === clientId}
                              onSelect={() => handleSuspensionChange(client)}
                            >
                              <HugeiconsIcon
                                icon={client.isSuspended ? Play : Pause}
                                aria-hidden="true"
                              />
                              {client.isSuspended
                                ? "Restore user"
                                : "Suspend user"}
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                Change role
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-40 border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                                {["user", "Trainer", "Admin"].map((role) => (
                                  <DropdownMenuItem
                                    key={role}
                                    disabled={
                                      updatingId === clientId ||
                                      client.role === role
                                    }
                                    onSelect={() =>
                                      handleRoleChange(clientId, role)
                                    }
                                  >
                                    {role === "user" ? "Client" : role}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator className="bg-forma-border-subtle" />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={deletingId === clientId}
                              onSelect={() =>
                                handleDeleteClient(clientId, client.name)
                              }
                            >
                              <HugeiconsIcon icon={Trash2} aria-hidden="true" />
                              Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-2 border-t border-forma-text-primary/10 px-3 py-3 sm:flex-row sm:px-5">
                <p className="text-xs text-forma-text-secondary">
                  Page{" "}
                  <span className="font-semibold text-forma-text-primary">
                    {page}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-forma-text-primary">
                    {totalPages}
                  </span>
                </p>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (page > 1) {
                            setPage((currentPage) =>
                              Math.max(1, currentPage - 1),
                            );
                          }
                        }}
                        aria-disabled={page <= 1}
                        tabIndex={page <= 1 ? -1 : undefined}
                        className={
                          page <= 1
                            ? "pointer-events-none opacity-40"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (page < totalPages) {
                            setPage((currentPage) =>
                              Math.min(totalPages, currentPage + 1),
                            );
                          }
                        }}
                        aria-disabled={page >= totalPages}
                        tabIndex={page >= totalPages ? -1 : undefined}
                        className={
                          page >= totalPages
                            ? "pointer-events-none opacity-40"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>
      <Dialog
        open={Boolean(selectedClient)}
        onOpenChange={(open) => {
          if (!open) setSelectedClient(null);
        }}
      >
        {selectedClient && (
          <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto border-forma-text-primary/10 bg-forma-bg-surface p-0 text-forma-text-primary sm:max-w-2xl">
            <DialogHeader className="border-b border-forma-text-primary/10 px-5 py-5 pr-14 sm:px-6">
              <div className="flex min-w-0 items-center gap-3.5">
                <Avatar className="size-14 shrink-0 ring-2 ring-forma-brand-ember/30">
                  <AvatarImage
                    src={selectedClient.avatarUrl || undefined}
                    alt=""
                  />
                  <AvatarFallback className="bg-forma-brand-ember/15 text-base font-bold text-forma-brand-ember">
                    {selectedClient.name
                      ? selectedClient.name
                          .split(" ")
                          .map((namePart) => namePart[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "VF"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <DialogTitle className="min-w-0 truncate text-lg font-bold text-forma-text-primary sm:text-xl">
                      {selectedClient.name || "Unnamed client"}
                    </DialogTitle>
                    <span
                      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${roleStyles[selectedClient.role] || roleStyles.user}`}
                    >
                      {selectedClient.role === "user"
                        ? "Client"
                        : selectedClient.role || "Client"}
                    </span>
                    <span className="text-xs text-forma-text-secondary">
                      Joined{" "}
                      {selectedClient.createdAt
                        ? new Date(
                            selectedClient.createdAt,
                          ).toLocaleDateString()
                        : "Not available"}
                    </span>
                  </div>
                  <DialogDescription className="mt-1 truncate text-sm text-forma-text-secondary">
                    {selectedClient.email || "No email address"}
                  </DialogDescription>
                  <p
                    className="mt-1 break-all font-mono text-xs text-forma-text-primary"
                    title={String(
                      selectedClient._id || selectedClient.id || "",
                    )}
                  >
                    {selectedClient._id || selectedClient.id || "Not available"}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 px-5 py-5 sm:px-6">
              <section aria-labelledby="client-activity-heading">
                <div className="mb-3">
                  <div className="flex items-center gap-1">
                    <h3
                      id="client-activity-heading"
                      className="text-sm font-semibold text-forma-text-primary"
                    >
                      Client activity
                    </h3>
                    <MetricHelp
                      label="Client activity"
                      explanation="Counts of workout, meal, progress, and support records linked to this account."
                    />
                  </div>
                </div>
                {clientDetailsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-forma-text-secondary">
                    <Spinner className="size-4 text-forma-status-error" />
                    <span>Loading activity...</span>
                  </div>
                ) : activitySummary ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      {
                        label: "Workouts",
                        value: activitySummary.workoutsCount ?? 0,
                        icon: Dumbbell,
                        color: "text-forma-status-error",
                      },
                      {
                        label: "Meals",
                        value: activitySummary.nutritionCount ?? 0,
                        icon: Utensils,
                        color: "text-forma-status-warning",
                      },
                      {
                        label: "Progress",
                        value: activitySummary.progressCount ?? 0,
                        icon: TrendingUp,
                        color: "text-forma-brand-teal",
                      },
                      {
                        label: "Tickets",
                        value: activitySummary.feedbackCount ?? 0,
                        icon: HelpCircle,
                        color: "text-[var(--info)]",
                      },
                    ].map(({ label, value, icon, color }) => (
                      <Card
                        key={label}
                        size="sm"
                        className="gap-0 rounded-xl border border-forma-text-primary/10 bg-forma-bg-base/40 py-0 shadow-none"
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-forma-bg-surface ${color}`}
                          >
                            <HugeiconsIcon
                              icon={icon}
                              className="size-4"
                              aria-hidden="true"
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="text-lg font-semibold leading-none text-forma-text-primary">
                              {value}
                            </p>
                            <p className="mt-1 truncate text-xs text-forma-text-secondary">
                              {label}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-forma-text-primary/10 px-3 py-3 text-xs text-forma-text-secondary">
                    Activity summary is unavailable for this user.
                  </p>
                )}
              </section>

              <section aria-labelledby="client-profile-heading">
                <div className="mb-3 border-t border-forma-text-primary/10 pt-5">
                  <div className="flex items-center gap-1">
                    <h3
                      id="client-profile-heading"
                      className="text-sm font-semibold text-forma-text-primary"
                    >
                      Profile details
                    </h3>
                    <MetricHelp
                      label="Profile details"
                      explanation="Personal fitness settings provided for this client account."
                    />
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs sm:gap-x-6">
                  <div>
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Fitness goal
                    </dt>
                    <dd className="mt-1 font-medium text-forma-text-primary">
                      {selectedClient.fitnessGoal || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Calorie target
                    </dt>
                    <dd className="mt-1 font-medium text-forma-text-primary">
                      {selectedClient.targetCalories != null
                        ? `${selectedClient.targetCalories} kcal`
                        : "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Weight / target
                    </dt>
                    <dd className="mt-1 font-medium text-forma-text-primary">
                      {selectedClient.weight != null
                        ? `${selectedClient.weight} kg`
                        : "Not provided"}
                      {" / "}
                      {selectedClient.targetWeight != null
                        ? `${selectedClient.targetWeight} kg`
                        : "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Height / unit
                    </dt>
                    <dd className="mt-1 font-medium text-forma-text-primary">
                      {selectedClient.height != null
                        ? `${selectedClient.height} cm`
                        : "Not provided"}
                      {" / "}
                      {selectedClient.preferredUnit || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Training experience
                    </dt>
                    <dd className="mt-1 font-medium capitalize text-forma-text-primary">
                      {selectedClient.trainingExperience || "Not provided"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Fitness requirements
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-forma-text-primary">
                      {selectedClient.fitnessRequirements ||
                        "No requirements provided yet."}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
