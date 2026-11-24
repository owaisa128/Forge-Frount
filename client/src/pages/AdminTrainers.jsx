import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  HugeiconsIcon,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
} from "../components/ui/icons";
import api from "../api/axios";
import AdminNotice from "../components/AdminNotice";
import EmptyState from "../components/EmptyState";
import MetricHelp from "../components/MetricHelp";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const statusLabels = {
  awaiting_email_review: "Waiting for email verification",
  awaiting_profile: "Waiting for profile completion",
  awaiting_admin_review: "Ready for review",
  approved: "Approved",
  rejected: "Not approved",
};

const statusStyles = {
  awaiting_email_review:
    "border-forma-status-warning/30 bg-forma-status-warning/10 text-forma-status-warning",
  awaiting_profile:
    "border-forma-brand-teal/30 bg-forma-brand-teal/10 text-forma-brand-teal",
  awaiting_admin_review:
    "border-forma-status-warning/30 bg-forma-status-warning/10 text-forma-status-warning",
  approved:
    "border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success",
  rejected:
    "border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error",
};

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TrainerStatus({ status }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-tight ${
        statusStyles[status] ||
        "border-forma-text-primary/10 bg-forma-bg-surface/5 text-forma-text-secondary"
      }`}
    >
      {statusLabels[status] || "Status unavailable"}
    </span>
  );
}

function TrainerDecisionButtons({ trainer, actingDecision, onDecision }) {
  const status = trainer.trainerApprovalStatus;
  const canApprove = status === "awaiting_admin_review";

  if (!canApprove && !["awaiting_email_review", "awaiting_profile"].includes(status)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={Boolean(actingDecision)}
        onClick={(event) => {
          event.stopPropagation();
          onDecision(trainer, "reject");
        }}
        className="h-8 border-forma-status-error/30 px-2.5 text-xs text-forma-status-error hover:bg-forma-status-error/10 hover:text-forma-status-error"
      >
        {actingDecision === "reject" ? (
          <Spinner />
        ) : (
          <HugeiconsIcon icon={UserRoundX} aria-hidden="true" />
        )}
        Reject
      </Button>
      {canApprove && (
        <Button
          type="button"
          size="sm"
          disabled={Boolean(actingDecision)}
          onClick={(event) => {
            event.stopPropagation();
            onDecision(trainer, "approve");
          }}
          className="h-8 bg-forma-status-success px-2.5 text-xs text-forma-text-on-ember hover:bg-forma-status-success/90"
        >
          {actingDecision === "approve" ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={UserRoundCheck} aria-hidden="true" />
          )}
          Approve trainer
        </Button>
      )}
      {status === "awaiting_profile" && (
        <span className="basis-full text-xs text-forma-text-secondary">
          Final approval is available after profile submission.
        </span>
      )}
    </div>
  );
}

export default function AdminTrainers() {
  const location = useLocation();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [actingOn, setActingOn] = useState("");
  const [actingDecision, setActingDecision] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const activeTab = location.pathname.endsWith("/directory")
    ? "directory"
    : "applications";

  const loadTrainers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/admin/trainers");
      if (!data?.success || !Array.isArray(data.trainers)) {
        throw new Error(data?.message || "Invalid trainers response.");
      }
      setTrainers(data.trainers);
    } catch (error) {
      setLoadError(
        error.response?.data?.message ||
          error.message ||
          "Could not load trainers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrainers();
  }, [loadTrainers]);

  const applications = useMemo(
    () =>
      trainers.filter((trainer) =>
        [
          "awaiting_email_review",
          "awaiting_profile",
          "awaiting_admin_review",
        ].includes(trainer.trainerApprovalStatus),
      ),
    [trainers],
  );
  const visibleTrainers =
    activeTab === "applications" ? applications : trainers;

  const handleDecision = async (trainer, decision) => {
    setActingOn(trainer.id);
    setActingDecision(decision);
    setActionError("");
    setNotice("");
    try {
      const { data } = await api.patch(
        `/admin/trainers/${trainer.id}/decision`,
        { decision },
      );
      const trainerApprovalStatus =
        data.trainer?.trainerApprovalStatus ||
        (decision === "approve" ? "approved" : "rejected");
      const updatedTrainer = { ...trainer, trainerApprovalStatus };
      if (data.approvalEmailSent === false || data.settingsInitialized === false) {
        setActionError(data.message || "Trainer approved, but the approval email could not be sent.");
      } else {
        setNotice(
          data.message ||
            `Trainer application ${decision === "approve" ? "approved" : "rejected"}.`,
        );
      }
      setTrainers((current) =>
        current.map((item) =>
          item.id === trainer.id ? updatedTrainer : item,
        ),
      );
      setSelectedTrainer((current) =>
        current?.id === trainer.id
          ? updatedTrainer
          : current,
      );
    } catch (error) {
      setActionError(
        error.response?.data?.message ||
          "Could not update this trainer application.",
      );
    } finally {
      setActingOn("");
      setActingDecision("");
    }
  };

  const pageTitle =
    activeTab === "directory" ? "Trainer directory" : "Trainer applications";

  return (
    <div className="vf-theme-page mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-forma-text-primary sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-1.5 text-sm text-forma-text-secondary">
            {activeTab === "directory"
              ? "Browse trainer profiles and review their approval status."
              : "Review trainer applications after email verification and profile completion."}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={loadTrainers}
          disabled={loading}
          aria-label={`Refresh ${activeTab === "directory" ? "trainer directory" : "trainer applications"}`}
          title="Refresh"
          className="mt-5 size-9 shrink-0 rounded-full bg-transparent text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-brand-teal"
        >
          {loading ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={RefreshCw} aria-hidden="true" />
          )}
        </Button>
      </header>

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
      <AdminNotice
        type="error"
        message={loadError}
        onDismiss={() => setLoadError("")}
        duration={0}
      />

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-forma-text-secondary">
          <Spinner className="size-5 text-forma-status-error" />
          Loading trainers...
        </div>
      ) : !loadError && visibleTrainers.length === 0 ? (
        <EmptyState
          type="clients"
          sentence={
            activeTab === "applications"
              ? "There are no trainer applications to review."
              : "Trainer profiles will appear here."
          }
          actionLabel={
            activeTab === "applications"
              ? "Refresh applications"
              : "Refresh trainers"
          }
          onAction={loadTrainers}
        />
      ) : (
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface">
          <Table className="min-w-[700px] text-left text-forma-text-secondary">
            <TableHeader className="bg-forma-bg-surface font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
              <TableRow className="border-forma-text-primary/10 hover:bg-transparent">
                <TableHead className="h-10 w-[30%] px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                  Trainer
                </TableHead>
                <TableHead className="h-10 w-[26%] px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                  Status
                </TableHead>
                <TableHead className="h-10 w-[20%] px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                  Joined
                </TableHead>
                <TableHead className="h-10 w-[24%] px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                  {activeTab === "applications" ? "Decision" : "Details"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-forma-text-primary/5">
              {visibleTrainers.map((trainer) => {
                const initials = String(trainer.name || "Trainer")
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase();
                return (
                  <TableRow
                    key={trainer.id}
                    tabIndex={0}
                    onClick={() => setSelectedTrainer(trainer)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        setSelectedTrainer(trainer);
                      }
                    }}
                    className="cursor-pointer border-forma-text-primary/5 transition-colors hover:bg-forma-bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forma-brand-ember"
                  >
                    <TableCell className="max-w-0 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-9 shrink-0 ring-1 ring-forma-border-subtle">
                          <AvatarImage
                            src={trainer.avatarUrl || undefined}
                            alt=""
                          />
                          <AvatarFallback className="bg-forma-brand-teal/10 text-xs font-semibold text-forma-brand-teal">
                            {initials || "TR"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto max-w-full justify-start truncate p-0 text-sm font-semibold text-forma-text-primary"
                            onClick={() => setSelectedTrainer(trainer)}
                          >
                            {trainer.name || "Unnamed trainer"}
                          </Button>
                          <p
                            className="truncate text-xs text-forma-text-secondary"
                            title={trainer.email || ""}
                          >
                            {trainer.email || "No email address"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <TrainerStatus status={trainer.trainerApprovalStatus} />
                    </TableCell>
                    <TableCell className="px-3 py-3 text-xs text-forma-text-secondary">
                      {formatDate(trainer.createdAt)}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      {activeTab === "applications" ? (
                        <TrainerDecisionButtons
                          trainer={trainer}
                          actingDecision={actingOn === trainer.id ? actingDecision : ""}
                          onDecision={handleDecision}
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`View details for ${trainer.name || "trainer"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTrainer(trainer);
                          }}
                        >
                          <HugeiconsIcon
                            icon={MoreHorizontal}
                            aria-hidden="true"
                          />
                          Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={Boolean(selectedTrainer)}
        onOpenChange={(open) => {
          if (!open) setSelectedTrainer(null);
        }}
      >
        {selectedTrainer && (
          <DialogContent className="max-h-[90vh] max-w-xl gap-0 overflow-y-auto border-forma-text-primary/10 bg-forma-bg-surface p-0 text-forma-text-primary sm:max-w-xl">
            <DialogHeader className="border-b border-forma-text-primary/10 px-5 py-5 pr-14 sm:px-6">
              <div className="flex min-w-0 items-center gap-3.5">
                <Avatar className="size-14 shrink-0 ring-2 ring-forma-brand-teal/20">
                  <AvatarImage
                    src={selectedTrainer.avatarUrl || undefined}
                    alt=""
                  />
                  <AvatarFallback className="bg-forma-brand-teal/10 font-semibold text-forma-brand-teal">
                    {String(selectedTrainer.name || "Trainer")
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <DialogTitle className="truncate text-lg font-bold text-forma-text-primary sm:text-xl">
                      {selectedTrainer.name || "Unnamed trainer"}
                    </DialogTitle>
                    <TrainerStatus
                      status={selectedTrainer.trainerApprovalStatus}
                    />
                  </div>
                  <DialogDescription className="mt-1 truncate text-sm text-forma-text-secondary">
                    {selectedTrainer.email || "No email address"}
                  </DialogDescription>
                  <p className="mt-1.5 text-xs text-forma-text-secondary">
                    Joined {formatDate(selectedTrainer.createdAt)}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <section aria-labelledby="trainer-overview-heading">
                <div className="mb-3 flex items-center gap-1">
                  <h3
                    id="trainer-overview-heading"
                    className="text-sm font-semibold text-forma-text-primary"
                  >
                    Trainer overview
                  </h3>
                  <MetricHelp
                    label="Trainer overview"
                    explanation="Specialization and professional experience supplied in the trainer profile."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    size="sm"
                    className="gap-1 rounded-xl border border-forma-text-primary/10 bg-forma-bg-base/40 py-3 shadow-none"
                  >
                    <CardContent className="px-3">
                      <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                        Specialization
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-forma-text-primary">
                        {selectedTrainer.trainerProfile?.specialization ||
                          "Not provided"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card
                    size="sm"
                    className="gap-1 rounded-xl border border-forma-text-primary/10 bg-forma-bg-base/40 py-3 shadow-none"
                  >
                    <CardContent className="px-3">
                      <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                        Experience
                      </p>
                      <p className="mt-1 text-sm font-medium text-forma-text-primary">
                        {selectedTrainer.trainerProfile?.experienceYears != null
                          ? `${selectedTrainer.trainerProfile.experienceYears} years`
                          : "Not provided"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section
                aria-labelledby="trainer-profile-heading"
                className="border-t border-forma-text-primary/10 pt-4"
              >
                <div className="mb-3 flex items-center gap-1">
                  <h3
                    id="trainer-profile-heading"
                    className="text-sm font-semibold text-forma-text-primary"
                  >
                    Profile details
                  </h3>
                  <MetricHelp
                    label="Profile details"
                    explanation="Contact information, certifications, and the professional bio submitted by this trainer."
                  />
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Phone
                    </dt>
                    <dd className="mt-1 break-words font-medium text-forma-text-primary">
                      {selectedTrainer.trainerProfile?.phone || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Certifications
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words font-medium text-forma-text-primary">
                      {selectedTrainer.trainerProfile?.certifications ||
                        "None listed"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Professional bio
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-forma-text-primary">
                      {selectedTrainer.trainerProfile?.bio || "Not provided"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Application submitted
                    </dt>
                    <dd className="mt-1 font-medium text-forma-text-primary">
                      {formatDate(
                        selectedTrainer.updatedAt || selectedTrainer.createdAt,
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              {selectedTrainer.trainerApprovalStatus ===
                "awaiting_email_review" && (
                <Alert className="border-forma-status-warning/25 bg-forma-status-warning/5 text-forma-status-warning">
                  <AlertTitle className="font-semibold">
                    Waiting for email verification
                  </AlertTitle>
                  <AlertDescription className="text-forma-status-warning/90">
                    The trainer must confirm their email before continuing. You may reject the
                    incomplete request here.
                  </AlertDescription>
                </Alert>
              )}
              {selectedTrainer.trainerApprovalStatus === "awaiting_profile" && (
                <Alert className="border-forma-brand-teal/25 bg-forma-brand-teal/5 text-forma-brand-teal">
                  <AlertTitle className="font-semibold">
                    Waiting for profile completion
                  </AlertTitle>
                  <AlertDescription className="text-forma-brand-teal/90">
                    The trainer confirmed their email and can complete their profile. Final approval
                    becomes available after they submit it.
                  </AlertDescription>
                </Alert>
              )}

              {activeTab === "applications" && (
                <div className="border-t border-forma-text-primary/10 pt-4">
                  <TrainerDecisionButtons
                    trainer={selectedTrainer}
                    actingDecision={
                      actingOn === selectedTrainer.id ? actingDecision : ""
                    }
                    onDecision={handleDecision}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
