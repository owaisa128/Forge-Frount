import React, { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "../components/ui/field";
import {
  HugeiconsIcon,
  AlertCircle,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
} from "../components/ui/icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const statusLabels = {
  pending: "Pending",
  "in-progress": "In progress",
  resolved: "Resolved",
};

const statusColors = {
  pending: "text-forma-status-warning",
  "in-progress": "text-forma-brand-teal",
  resolved: "text-forma-status-success",
};

function formatCreatedAt(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

function SupportRequestCard({ item, busy, onUpdateStatus }) {
  const name = item.source === "contact" ? item.senderName : item.user?.name;
  const email = item.source === "contact" ? item.senderEmail : item.user?.email;
  const itemStatus = statusLabels[item.status] ? item.status : "pending";

  return (
    <Card className="border-forma-border-subtle bg-forma-bg-surface shadow-none">
      <CardHeader className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-start">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-forma-text-secondary">
            {item.source === "contact"
              ? "Website contact"
              : "Support request"}
          </p>
          <CardTitle className="break-words text-base font-semibold text-forma-text-primary sm:text-lg">
            {item.subject}
          </CardTitle>
          <CardDescription className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-forma-text-secondary">
            <span>{name || "Unknown sender"}</span>
            {email && (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href={`mailto:${email}`}
                  className="break-all text-forma-brand-teal underline-offset-4 hover:underline"
                >
                  {email}
                </a>
              </>
            )}
          </CardDescription>
        </div>
        <Field className="w-full min-w-0">
          <FieldLabel
            htmlFor={`support-status-${item._id}`}
            className="whitespace-nowrap text-xs font-normal text-forma-text-secondary"
          >
            Update status
          </FieldLabel>
          <Select
            value={itemStatus}
            onValueChange={(nextStatus) => onUpdateStatus(item, nextStatus)}
            disabled={busy}
          >
            <SelectTrigger
              id={`support-status-${item._id}`}
              aria-label={`Update status for ${item.subject}`}
              className={`h-10 w-full rounded-xl border-forma-border-subtle bg-forma-bg-surface ${statusColors[itemStatus]}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
              <SelectGroup>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {busy && (
            <span className="inline-flex items-center gap-1.5 text-xs text-forma-text-secondary">
              <HugeiconsIcon
                aria-hidden="true"
                icon={Loader2}
                className="size-3 animate-spin"
              />
              Saving status
            </span>
          )}
        </Field>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-forma-text-primary">
          {item.message}
        </p>
        <time
          dateTime={item.createdAt}
          className="mt-4 block text-xs text-forma-text-secondary"
        >
          Received {formatCreatedAt(item.createdAt)}
        </time>
      </CardContent>
    </Card>
  );
}

export default function AdminInbox() {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { limit: 100 };
      if (status !== "all") params.status = status;
      if (search.trim()) params.search = search.trim();

      const { data } = await api.get("/admin/support", { params });
      if (!Array.isArray(data.tickets)) {
        throw new Error("Inbox response was incomplete.");
      }
      setItems(data.tickets);
      setTotalCount(
        Number.isFinite(data.total) ? data.total : data.tickets.length,
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load contact messages.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (item, nextStatus) => {
    setBusyId(item._id);
    setError("");

    try {
      const { data } = await api.put(`/admin/support/${item._id}`, {
        status: nextStatus,
      });
      if (!data?.success) {
        throw new Error(data?.message || "Unable to update message status.");
      }
      setItems((current) =>
        current.map((record) =>
          record._id === item._id ? { ...record, status: nextStatus } : record,
        ),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to update message status.",
      );
    } finally {
      setBusyId("");
    }
  };

  const hasFilters = Boolean(search.trim()) || status !== "all";

  return (
    <div className="vf-theme-page mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-forma-text-primary sm:text-3xl">
            Support inbox
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-forma-text-secondary">
            Review incoming requests and keep each conversation moving.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={load}
          disabled={loading}
          aria-label="Refresh support inbox"
          title="Refresh support inbox"
          className="size-11 shrink-0 rounded-full bg-transparent text-forma-text-secondary hover:bg-transparent hover:text-forma-brand-teal"
        >
          {loading ? (
            <Spinner aria-label="Refreshing support inbox" />
          ) : (
            <HugeiconsIcon
              aria-hidden="true"
              icon={RefreshCw}
              className="size-5"
            />
          )}
        </Button>
      </header>

      <div
        aria-label="Search and filter support requests"
        className="mt-6 mb-6 flex justify-center"
      >
        <div className="w-full max-w-2xl">
          <FieldGroup className="gap-2 flex flex-row">
            <Field className="gap-0">
              <FieldLabel htmlFor="support-inbox-search" className="sr-only">
                Search support requests
              </FieldLabel>
              <InputGroup className="h-9 rounded-xl border-forma-border-subtle bg-forma-bg-surface">
                <InputGroupAddon className="pl-3">
                  <HugeiconsIcon
                    icon={Search}
                    aria-hidden="true"
                    className="size-4 text-forma-text-secondary"
                  />
                </InputGroupAddon>
                <InputGroupInput
                  id="support-inbox-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search support requests..."
                  aria-label="Search support requests"
                  className="h-8 text-forma-text-primary placeholder:text-forma-text-disabled"
                />
              </InputGroup>
            </Field>

            <Field className="gap-0 w-40">
              <FieldLabel
                htmlFor="support-inbox-status-filter"
                className="sr-only"
              >
                Filter support requests by status
              </FieldLabel>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger
                  id="support-inbox-status-filter"
                  aria-label="Filter support requests by status"
                  className="h-9 w-full rounded-xl border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary">
                  <SelectGroup>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          {!loading && !error && (
            <div
              aria-live="polite"
              className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-xs text-forma-text-secondary"
            >
              <span>
                {`Showing ${
                  items.length === 0 ? 0 : 1
                }–${Math.min(items.length, 100)} of ${totalCount} matching requests`}
              </span>
              <span>Total requests: {totalCount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl m-auto">
        {error && (
          <Alert
            variant="destructive"
            className="mb-6 border-forma-status-error/25 bg-forma-status-error/10 text-forma-status-error"
          >
            <HugeiconsIcon aria-hidden="true" icon={AlertCircle} />
            <AlertTitle>Inbox could not be loaded or updated</AlertTitle>
            <AlertDescription className="text-forma-status-error/90">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div
            role="status"
            className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-forma-text-secondary"
          >
            <Spinner className="size-6 text-forma-brand-teal" />
            <span>Loading support requests…</span>
          </div>
        ) : error && items.length === 0 ? null : items.length === 0 ? (
          <Empty className="min-h-56 border border-dashed border-forma-border-subtle bg-forma-bg-surface px-6 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon
                  icon={hasFilters ? Search : Inbox}
                  aria-hidden="true"
                />
              </EmptyMedia>
              <EmptyTitle className="text-forma-text-primary">
                {hasFilters ? "No matching requests" : "No requests yet"}
              </EmptyTitle>
              <EmptyDescription className="text-forma-text-secondary">
                {hasFilters
                  ? "Try a different search or clear the selected status filter."
                  : "New support and contact requests will appear here."}
              </EmptyDescription>
            </EmptyHeader>
            {hasFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                }}
                className="border-forma-border-subtle text-forma-text-primary"
              >
                Clear filters
              </Button>
            )}
          </Empty>
        ) : (
          <div aria-label="Support requests" className="flex flex-col gap-4">
            {items.map((item) => (
              <SupportRequestCard
                key={item._id}
                item={item}
                busy={busyId === item._id}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
