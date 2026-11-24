import React, { useEffect } from "react";
import { AlertCircle, CheckCircle2, HugeiconsIcon, X } from "./ui/icons";
import { Button } from "./ui/button";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "./ui/alert";

export default function AdminNotice({
  type = "error",
  message,
  onDismiss,
  duration = 6000,
}) {
  useEffect(() => {
    if (!message || !onDismiss || duration <= 0) return undefined;
    const timeoutId = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timeoutId);
  }, [duration, message, onDismiss]);

  if (!message) return null;

  const isError = type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <Alert
      variant={isError ? "destructive" : "default"}
      role={isError ? "alert" : "status"}
      className={`mb-4 pr-12 ${
        isError
          ? "border-forma-status-error/25 bg-forma-status-error/5 text-forma-status-error"
          : "border-forma-status-success/25 bg-forma-status-success/5 text-forma-status-success"
      }`}
    >
      <HugeiconsIcon icon={Icon} aria-hidden="true" />
      <AlertTitle className="font-semibold">
        {isError ? "Something went wrong" : "Update complete"}
      </AlertTitle>
      <AlertDescription
        className={
          isError
            ? "text-forma-status-error/90"
            : "text-forma-status-success/90"
        }
      >
        {message}
      </AlertDescription>
      {onDismiss && (
        <AlertAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Dismiss ${isError ? "error" : "success"} notice`}
            onClick={onDismiss}
            className="text-current hover:bg-current/10 hover:text-current"
          >
            <HugeiconsIcon icon={X} aria-hidden="true" />
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
