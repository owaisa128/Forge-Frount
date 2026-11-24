import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import api from "../api/axios";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  HugeiconsIcon,
  AlertCircle,
  Bell,
  CheckCheck,
  Dumbbell,
  Loader2,
  RefreshCw,
  Trash2,
  Utensils,
} from "../components/ui/icons";
import { Spinner } from "../components/ui/spinner";

const formatTime = (date) => {
  const value = new Date(date);
  return Number.isNaN(value.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/notifications");
      if (!data?.success || !Array.isArray(data.notifications)) {
        throw new Error(data?.message || "The notifications response was invalid.");
      }
      setItems(data.notifications);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAllRead = async () => {
    setBusy("all");
    setError("");
    try {
      const { data } = await api.put("/notifications/mark-all-read");
      if (!data?.success) {
        throw new Error(data?.message || "Unable to mark notifications as read.");
      }
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to mark notifications as read.",
      );
    } finally {
      setBusy("");
    }
  };

  const markRead = async (item) => {
    if (!item.unread) return;
    setBusy(item._id);
    setError("");
    try {
      const { data } = await api.put(`/notifications/${item._id}/read`);
      if (!data?.success) {
        throw new Error(data?.message || "Unable to update this notification.");
      }
      setItems((current) =>
        current.map((notification) =>
          notification._id === item._id ? data.notification : notification,
        ),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to update this notification.",
      );
    } finally {
      setBusy("");
    }
  };

  const remove = async (item) => {
    setBusy(item._id);
    setError("");
    try {
      const { data } = await api.delete(`/notifications/${item._id}`);
      if (!data?.success) {
        throw new Error(data?.message || "Unable to delete this notification.");
      }
      setItems((current) => current.filter(({ _id }) => _id !== item._id));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to delete this notification.",
      );
    } finally {
      setBusy("");
    }
  };

  const unreadCount = items.filter((item) => item.unread).length;

  return (
    <section className="vf-theme-page mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        as="section"
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread updates`
            : "You’re all caught up."
        }
        className="mb-6"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
            className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised"
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={RefreshCw}
              data-icon="inline-start"
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => void markAllRead()}
            disabled={loading || !unreadCount || Boolean(busy)}
            className="bg-forma-brand-ember text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={CheckCheck}
              data-icon="inline-start"
            />
            Mark all read
          </Button>
        </div>
      </PageHeader>

      {error && (
        <Alert
          variant="destructive"
          role="alert"
          className="mb-5 border-forma-status-error/25 bg-forma-status-error/10 text-forma-status-error"
        >
          <HugeiconsIcon aria-hidden="true" icon={AlertCircle} />
          <AlertTitle>Could not update notifications</AlertTitle>
          <AlertDescription className="text-forma-status-error/90">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {loading && items.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-forma-text-secondary">
          <Spinner />
          Loading notifications
        </div>
      ) : items.length === 0 && !error ? (
        <EmptyState
          type="notifications"
          sentence="You’re all caught up; new updates will appear here."
          actionLabel="Open settings"
          to="/settings"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const Icon =
              item.type === "workout"
                ? Dumbbell
                : item.type === "nutrition"
                  ? Utensils
                  : Bell;

            return (
              <Card
                key={item._id}
                className={`border-forma-border-subtle shadow-none ${
                  item.unread
                    ? "bg-forma-bg-surface-raised/70"
                    : "bg-forma-bg-surface"
                }`}
              >
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forma-bg-base text-forma-brand-ember">
                    <HugeiconsIcon aria-hidden="true" icon={Icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="flex flex-wrap items-center gap-2 font-semibold text-forma-text-primary">
                      {item.link ? (
                        <Link
                          to={item.link}
                          className="hover:text-forma-brand-ember"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )}
                      {item.unread && (
                        <span className="rounded-full bg-forma-bg-base px-2 py-0.5 text-xs text-forma-text-secondary">
                          Unread
                        </span>
                      )}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-forma-text-secondary">
                      {item.message}
                    </p>
                    <time className="mt-2 block text-xs text-forma-text-disabled">
                      {formatTime(item.createdAt)}
                    </time>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {item.unread && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void markRead(item)}
                        disabled={Boolean(busy)}
                        className="border-forma-border-subtle text-forma-text-secondary hover:bg-forma-bg-base"
                      >
                        {busy === item._id ? (
                          <Spinner data-icon="inline-start" />
                        ) : null}
                        Mark read
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove(item)}
                      disabled={Boolean(busy)}
                      aria-label={`Delete ${item.title}`}
                      className="text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error"
                    >
                      {busy === item._id ? (
                        <HugeiconsIcon
                          aria-hidden="true"
                          icon={Loader2}
                          className="animate-spin"
                        />
                      ) : (
                        <HugeiconsIcon aria-hidden="true" icon={Trash2} />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
