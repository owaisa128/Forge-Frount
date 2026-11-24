import React, { useState } from "react";
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
import { Field, FieldGroup, FieldLabel } from "../components/ui/field";
import {
  HugeiconsIcon,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
} from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { Spinner } from "../components/ui/spinner";
import { Textarea } from "../components/ui/textarea";

export default function AdminMessages() {
  const [message, setMessage] = useState({ title: "", message: "", link: "" });
  const [status, setStatus] = useState({ type: "", text: "" });
  const [sending, setSending] = useState(false);

  const refreshPage = () => {
    setMessage({ title: "", message: "", link: "" });
    setStatus({ type: "", text: "" });
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus({ type: "", text: "" });

    try {
      const { data } = await api.post("/notifications/announcements", message);
      if (!data?.success) {
        throw new Error(data?.message || "Unable to send this message.");
      }
      setStatus({
        type: "success",
        text: `Message sent to ${data.recipientCount} accounts.`,
      });
      setMessage({ title: "", message: "", link: "" });
    } catch (requestError) {
      setStatus({
        type: "error",
        text:
          requestError.response?.data?.message ||
          requestError.message ||
          "Unable to send this message.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="vf-theme-page mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-forma-text-primary sm:text-3xl">
            Admin broadcast
          </h1>
          <p className="mt-1.5 text-sm text-forma-text-secondary">
            Send an update to every registered account.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={refreshPage}
          disabled={sending}
          aria-label="Refresh admin broadcast"
          title="Refresh admin broadcast"
          className="size-11 shrink-0 rounded-full bg-transparent text-forma-text-secondary hover:bg-transparent hover:text-forma-brand-teal"
        >
          <HugeiconsIcon
            aria-hidden="true"
            icon={RefreshCw}
            className="size-5"
          />
        </Button>
      </header>
      <Card className="border-forma-border-subtle bg-forma-bg-surface shadow-none max-w-4xl m-auto">
        <CardHeader>
          <CardTitle className="text-forma-text-primary">
            Write a broadcast message
          </CardTitle>
          <CardDescription className="text-forma-text-secondary">
            Accounts can open this message from the workspace header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status.text && (
            <Alert
              role={status.type === "error" ? "alert" : "status"}
              variant={status.type === "error" ? "destructive" : "default"}
              className={`mb-5 ${
                status.type === "success"
                  ? "border-forma-status-success/25 bg-forma-status-success/10 text-forma-status-success"
                  : "border-forma-status-error/25 bg-forma-status-error/10 text-forma-status-error"
              }`}
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={status.type === "success" ? CheckCircle2 : AlertCircle}
              />
              <AlertTitle>
                {status.type === "success"
                  ? "Message sent"
                  : "Message not sent"}
              </AlertTitle>
              <AlertDescription
                className={
                  status.type === "success"
                    ? "text-forma-status-success/90"
                    : "text-forma-status-error/90"
                }
              >
                {status.text}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={sendMessage} className="flex flex-col gap-5">
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="admin-message-title"
                    className="text-sm font-normal text-forma-text-secondary"
                  >
                    Title
                  </FieldLabel>
                  <Input
                    id="admin-message-title"
                    required
                    maxLength={120}
                    value={message.title}
                    onChange={(event) =>
                      setMessage((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Add a short title"
                    className="border-forma-border-subtle bg-forma-bg-base text-forma-text-primary placeholder:text-forma-text-disabled"
                  />
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor="admin-message-link"
                    className="text-sm font-normal text-forma-text-secondary"
                  >
                    In-app link (optional)
                  </FieldLabel>
                  <Input
                    id="admin-message-link"
                    maxLength={300}
                    value={message.link}
                    onChange={(event) =>
                      setMessage((current) => ({
                        ...current,
                        link: event.target.value,
                      }))
                    }
                    placeholder="/memberships"
                    className="border-forma-border-subtle bg-forma-bg-base text-forma-text-primary placeholder:text-forma-text-disabled"
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel
                  htmlFor="admin-message-body"
                  className="text-sm font-normal text-forma-text-secondary"
                >
                  Message
                </FieldLabel>
                <Textarea
                  id="admin-message-body"
                  required
                  maxLength={500}
                  rows={5}
                  value={message.message}
                  onChange={(event) =>
                    setMessage((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Write the update you want every account to see"
                  className="border-forma-border-subtle bg-forma-bg-base text-forma-text-primary placeholder:text-forma-text-disabled"
                />
              </Field>
            </FieldGroup>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={sending}
                className="bg-forma-brand-ember text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
              >
                {sending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={Send}
                    data-icon="inline-start"
                  />
                )}
                Send message
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
