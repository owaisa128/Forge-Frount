import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "../components/ui/field";
import { Input } from "../components/ui/input";
import { HugeiconsIcon, AlertCircle, CheckCircle2, Loader2, Lock } from "../components/ui/icons";
import api from "../api/axios";

function readResetToken() {
  if (typeof window === "undefined") return "";
  const token = window.location.hash.slice(1);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
  return /^[a-f0-9]{64}$/i.test(token) ? token : "";
}

export default function ResetPassword() {
  const [token, setToken] = useState(readResetToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState({
    type: token ? "" : "error",
    text: token ? "" : "This reset link is invalid or missing. Request a new link from your account settings.",
  });

  const submitNewPassword = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters long.",
      });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "The passwords do not match." });
      return;
    }

    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await api.post("/auth/password-reset/complete", {
        token,
        password,
      });
      if (!data?.success) {
        throw new Error(data?.message || "Unable to reset the password.");
      }
      setCompleted(true);
      setToken("");
      setPassword("");
      setConfirmPassword("");
      setMessage({
        type: "success",
        text: data.message || "Your password has been reset.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Unable to reset the password.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vf-theme-page mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <Card className="w-full border border-forma-text-primary/10 bg-forma-bg-surface ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-forma-text-primary">
            <HugeiconsIcon
              aria-hidden="true"
              icon={Lock}
              className="text-forma-status-error"
            />
            Choose a new password
          </CardTitle>
          <CardDescription className="text-forma-text-secondary">
            Set a new password for your FORGE account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message.text && (
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
              className={
                message.type === "success"
                  ? "border-forma-status-success/25 bg-forma-status-success/10 text-forma-status-success"
                  : "mb-5"
              }
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={message.type === "success" ? CheckCircle2 : AlertCircle}
              />
              <AlertTitle>
                {message.type === "success"
                  ? "Password updated"
                  : "Reset link unavailable"}
              </AlertTitle>
              <AlertDescription
                className={
                  message.type === "success" ? "text-forma-status-success" : ""
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {!completed && token && (
            <form
              onSubmit={submitNewPassword}
              className="flex flex-col gap-5"
            >
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="reset-password">
                    New password
                  </FieldLabel>
                  <Input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="reset-password-confirm">
                    Confirm new password
                  </FieldLabel>
                  <Input
                    id="reset-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={saving}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={saving ? Loader2 : Lock}
                  className={saving ? "animate-spin" : ""}
                  data-icon="inline-start"
                />
                {saving ? "Saving password…" : "Save new password"}
              </Button>
            </form>
          )}
        </CardContent>
        {(completed || !token) && (
          <CardFooter className="border-t border-forma-text-primary/10">
            <Button asChild className="w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
