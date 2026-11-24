import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, HugeiconsIcon } from "../components/ui/icons";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function AccountDeletionConfirmation() {
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const action = searchParams.get("action");
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({ type: "", text: "" });

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = {
      confirm: "/auth/profile/deletion/confirm",
      cancel: "/auth/profile/deletion/cancel",
    }[action];

    if (!endpoint || !token) {
      setResult({
        type: "error",
        text: "This account link is incomplete. Request a new link from your profile.",
      });
      setLoading(false);
      return () => controller.abort();
    }

    const processRequest = async () => {
      setLoading(true);
      try {
        const { data } = await api.post(
          endpoint,
          { token },
          { signal: controller.signal },
        );
        if (!data?.success)
          throw new Error(data?.message || "The account request could not be completed.");
        if (controller.signal.aborted) return;
        if (action === "confirm") logout();
        setResult({ type: "success", text: data.message });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          type: "error",
          text:
            error.response?.data?.message ||
            error.message ||
            "The account request could not be completed.",
        });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    processRequest();
    return () => controller.abort();
  }, [action, token]);

  return (
    <div className="vf-theme-page mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-12 sm:px-6">
      <Card className="w-full border-forma-text-primary/10 bg-forma-bg-surface shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-forma-text-primary">
            {action === "cancel"
              ? "Restore your account"
              : "Account deletion request"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-forma-text-secondary">
              <Spinner />
              Verifying your account link…
            </div>
          ) : (
            <>
              {result.text && (
                <Alert
                  role={result.type === "error" ? "alert" : "status"}
                  variant={result.type === "error" ? "destructive" : "default"}
                  className={
                    result.type === "success"
                      ? "border-forma-status-success/25 bg-forma-status-success/10 text-forma-status-success"
                      : ""
                  }
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={result.type === "success" ? CheckCircle2 : AlertCircle}
                  />
                  <AlertTitle>
                    {result.type === "success" ? "Request complete" : "Link could not be used"}
                  </AlertTitle>
                  <AlertDescription>{result.text}</AlertDescription>
                </Alert>
              )}
              <Button asChild>
                <Link to="/login">
                  {action === "cancel" ? "Sign in" : "Continue to sign in"}
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
