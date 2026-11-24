import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { HugeiconsIcon, AlertCircle, Bell, CheckCheck, Dumbbell, Loader2, Trash2, Utensils } from "./ui/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Spinner } from "./ui/spinner";

const formatTime = (date) => {
  if (!date) return "Recently";
  const value = new Date(date);
  return Number.isNaN(value.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);
};

export default function NotificationSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const requestId = useRef(0);

  const loadNotifications = useCallback(async ({ markReadOnLoad = false } = {}) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");

    if (markReadOnLoad) {
      setUnreadCount(0);
      setNotifications((items) =>
        items.map((item) => ({ ...item, unread: false })),
      );
    }

    try {
      const { data } = await api.get("/notifications");
      if (!data?.success || !Array.isArray(data.notifications)) {
        throw new Error(data?.message || "The notifications response was invalid.");
      }

      const unread = Number.isFinite(Number(data.unreadCount))
        ? Number(data.unreadCount)
        : data.notifications.filter((item) => item.unread).length;

      if (markReadOnLoad && unread > 0) {
        const { data: readData } = await api.put("/notifications/mark-all-read");
        if (!readData?.success) {
          throw new Error(readData?.message || "Could not mark notifications as read.");
        }
      }

      if (currentRequest !== requestId.current) return;
      setNotifications(
        markReadOnLoad
          ? data.notifications.map((item) => ({ ...item, unread: false }))
          : data.notifications,
      );
      setUnreadCount(markReadOnLoad ? 0 : unread);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load notifications.",
      );
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) return undefined;

    const refresh = () => void loadNotifications();
    refresh();
    const intervalId = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [isOpen, loadNotifications]);

  const handleOpenChange = (nextOpen) => {
    setIsOpen(nextOpen);
    if (nextOpen) void loadNotifications({ markReadOnLoad: true });
  };

  const markAllRead = async () => {
    setAction("read-all");
    setError("");
    try {
      const { data } = await api.put("/notifications/mark-all-read");
      if (!data?.success) {
        throw new Error(data?.message || "Could not mark notifications as read.");
      }
      setNotifications((items) =>
        items.map((item) => ({ ...item, unread: false })),
      );
      setUnreadCount(0);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Could not mark notifications as read.",
      );
    } finally {
      setAction("");
    }
  };

  const removeNotification = async (notification) => {
    setAction(notification._id);
    setError("");
    try {
      const { data } = await api.delete(`/notifications/${notification._id}`);
      if (!data?.success) {
        throw new Error(data?.message || "Could not delete this notification.");
      }
      setNotifications((items) =>
        items.filter((item) => item._id !== notification._id),
      );
      if (notification.unread) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Could not delete this notification.",
      );
    } finally {
      setAction("");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative size-10 rounded-full text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-text-primary"
        >
          <HugeiconsIcon aria-hidden="true" icon={Bell} />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 size-2 rounded-full bg-forma-text-primary ring-2 ring-forma-bg-base"
            />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="border-forma-border-subtle bg-forma-bg-surface text-forma-text-primary"
      >
        <SheetHeader className="border-b border-forma-border-subtle px-6 py-5 pr-16">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-forma-text-primary">
                Notifications
              </SheetTitle>
              <SheetDescription className="text-forma-text-secondary">
                Opening this panel marks current updates as read.
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <span className="shrink-0 rounded-full bg-forma-bg-surface-raised px-2.5 py-1 text-xs font-medium text-forma-text-secondary">
                {unreadCount} unread
              </span>
            )}
          </div>
          {notifications.some((item) => item.unread) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              disabled={Boolean(action)}
              className="mt-2 w-fit text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-text-primary"
            >
              <HugeiconsIcon aria-hidden="true" icon={CheckCheck} data-icon="inline-start" />
              Mark all read
            </Button>
          )}
        </SheetHeader>

        {error && (
          <Alert
            variant="destructive"
            role="alert"
            className="mx-6 mt-4 border-forma-status-error/25 bg-forma-status-error/10 text-forma-status-error"
          >
            <HugeiconsIcon aria-hidden="true" icon={AlertCircle} />
            <AlertTitle>Could not update notifications</AlertTitle>
            <AlertDescription className="text-forma-status-error/90">
              {error}
            </AlertDescription>
            <Button
              type="button"
              variant="link"
              onClick={() =>
                void loadNotifications({ markReadOnLoad: isOpen })
              }
              className="mt-2 h-auto p-0 text-forma-status-error"
            >
              Try again
            </Button>
          </Alert>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading && notifications.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-forma-text-secondary">
              <Spinner />
              Loading notifications
            </div>
          ) : notifications.length === 0 && !error ? (
            <Empty className="min-h-64 border-0 p-6">
              <EmptyMedia
                variant="icon"
                className="bg-forma-bg-surface-raised text-forma-brand-ember"
              >
                <HugeiconsIcon aria-hidden="true" icon={Bell} />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle className="text-forma-text-primary">
                  You’re all caught up
                </EmptyTitle>
                <EmptyDescription className="text-forma-text-secondary">
                  New updates will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col divide-y divide-forma-border-subtle">
              {notifications.map((notification) => {
                const Icon =
                  notification.type === "workout"
                    ? Dumbbell
                    : notification.type === "nutrition"
                      ? Utensils
                      : Bell;

                return (
                  <article
                    key={notification._id}
                    className={`flex items-start gap-3 py-4 ${
                      notification.unread
                        ? "bg-forma-bg-surface-raised/50"
                        : ""
                    }`}
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-forma-bg-surface-raised text-forma-brand-ember">
                      <HugeiconsIcon aria-hidden="true" icon={Icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-forma-text-primary">
                        {notification.link ? (
                          <Link
                            to={notification.link}
                            onClick={() => setIsOpen(false)}
                            className="min-w-0 hover:text-forma-brand-ember"
                          >
                            {notification.title}
                          </Link>
                        ) : (
                          notification.title
                        )}
                        {notification.unread && (
                          <span
                            aria-label="Unread"
                            className="size-1.5 shrink-0 rounded-full bg-forma-text-primary"
                          />
                        )}
                      </h3>
                      <p className="mt-1 break-words text-sm leading-relaxed text-forma-text-secondary">
                        {notification.message}
                      </p>
                      <time className="mt-2 block text-xs text-forma-text-disabled">
                        {formatTime(notification.createdAt)}
                      </time>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void removeNotification(notification)}
                      disabled={Boolean(action)}
                      aria-label={`Delete ${notification.title}`}
                      className="shrink-0 text-forma-text-secondary hover:bg-forma-status-error/10 hover:text-forma-status-error"
                    >
                      {action === notification._id ? (
                        <HugeiconsIcon
                          aria-hidden="true"
                          icon={Loader2}
                          className="animate-spin"
                        />
                      ) : (
                        <HugeiconsIcon aria-hidden="true" icon={Trash2} />
                      )}
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-forma-border-subtle px-6 py-4">
          <Button
            asChild
            variant="outline"
            className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised"
          >
            <Link to="/notifications" onClick={() => setIsOpen(false)}>
              View notification history
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
