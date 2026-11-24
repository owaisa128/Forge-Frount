import React, { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon, RefreshCw, Save } from "../components/ui/icons";
import api from "../api/axios";
import { MEMBERSHIP_FEATURES } from "../utils/membershipFeatures";
import EmptyState from "../components/EmptyState";
import AdminNotice from "../components/AdminNotice";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Spinner } from "../components/ui/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  FieldDescription,
  Field,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "../components/ui/field";
const dialogInputClass =
  "h-11 rounded-xl border-forma-text-primary/10 bg-forma-bg-surface text-sm text-forma-text-primary placeholder:text-forma-text-secondary/70 focus-visible:border-forma-brand-ember focus-visible:ring-forma-brand-ember/20";
const checkboxClass =
  "border-forma-text-primary/30 data-checked:border-forma-brand-ember data-checked:bg-forma-brand-ember data-checked:text-forma-text-on-ember";

const formatPurchaseDate = (dateValue) => {
  if (!dateValue) return "Not available";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const formatPaymentMethod = (method) =>
  String(method || "unknown")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatPlanPrice = (amount) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const accessLevelLabels = {
  free: "Free",
  basic: "Basic",
  elite: "Elite",
  premium: "Premium",
};

function FieldTooltip({ children, content }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-64 border border-forma-text-primary/10 bg-forma-bg-surface-raised text-forma-text-primary"
      >
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function MembershipPlanDialog({
  plan,
  open,
  onOpenChange,
  onPlanChange,
  onSave,
  saving,
  error,
}) {
  if (!plan) return null;

  const setField = (key, value) => onPlanChange(key, value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-forma-text-primary/10 bg-forma-bg-surface text-forma-text-primary sm:max-w-3xl">
        <TooltipProvider>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Edit {plan.name}
            </DialogTitle>
            <DialogDescription>
              Update plan details, pricing, availability, and included features.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSave(plan);
            }}
            className="flex flex-col gap-5"
          >
            {error && (
              <Alert
                variant="destructive"
                className="border-forma-status-error/25 bg-forma-status-error/5 text-forma-status-error"
              >
                <AlertTitle className="font-semibold">
                  Could not save plan
                </AlertTitle>
                <AlertDescription className="text-forma-status-error/90">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldTitle className="text-xs font-normal text-forma-text-secondary">
                  Plan name
                </FieldTitle>
                <FieldTooltip content="The name members see when choosing a plan.">
                  <Input
                    className={dialogInputClass}
                    required
                    maxLength={80}
                    aria-label="Plan name"
                    value={plan.name}
                    onChange={(event) => setField("name", event.target.value)}
                  />
                </FieldTooltip>
              </Field>
              <Field>
                <FieldTitle className="text-xs font-normal text-forma-text-secondary">
                  Plan ID
                </FieldTitle>
                <FieldTooltip content="Plan IDs are fixed after creation because they identify this plan in member records.">
                  <Input
                    className={dialogInputClass}
                    aria-label="Plan ID"
                    value={plan.slug}
                    disabled
                  />
                </FieldTooltip>
              </Field>
              <Field>
                <FieldTitle className="text-xs font-normal text-forma-text-secondary">
                  Access level
                </FieldTitle>
                <Select
                  value={plan.accessLevel || plan.slug}
                  onValueChange={(value) => {
                    setField("accessLevel", value);
                    setField("trainerIncluded", value !== "free");
                  }}
                  disabled={plan.slug === "free" || plan.slug === "premium"}
                >
                  <FieldTooltip content="Sets which membership features members can access.">
                    <SelectTrigger
                      aria-label="Access level"
                      className={`${dialogInputClass} w-full`}
                    >
                      <SelectValue placeholder="Choose an access level" />
                    </SelectTrigger>
                  </FieldTooltip>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldTitle className="text-xs font-normal text-forma-text-secondary">
                  Badge
                </FieldTitle>
                <FieldTooltip content="An optional short label displayed with the plan.">
                  <Input
                    className={dialogInputClass}
                    maxLength={60}
                    aria-label="Plan badge"
                    placeholder="Optional plan badge"
                    value={plan.badge || ""}
                    onChange={(event) => setField("badge", event.target.value)}
                  />
                </FieldTooltip>
              </Field>
              <Field>
                <FieldTitle className="text-xs font-normal text-forma-text-secondary">
                  Monthly price (PKR)
                </FieldTitle>
                <FieldTooltip content="Price charged for one month. The Free plan must remain zero.">
                  <Input
                    className={dialogInputClass}
                    type="number"
                    min="0"
                    max="10000000"
                    required
                    aria-label="Monthly price in PKR"
                    value={plan.monthlyPrice}
                    disabled={plan.slug === "free"}
                    onChange={(event) =>
                      setField("monthlyPrice", Number(event.target.value))
                    }
                  />
                </FieldTooltip>
              </Field>
              <Field>
                <FieldTitle className="text-xs font-normal text-forma-text-secondary">
                  Annual monthly rate (PKR)
                </FieldTitle>
                <FieldTooltip content="Per-month rate for annual billing. Members are charged this amount multiplied by 12.">
                  <Input
                    className={dialogInputClass}
                    type="number"
                    min="0"
                    max="10000000"
                    required
                    aria-label="Annual monthly rate in PKR"
                    value={plan.annualPrice}
                    disabled={plan.slug === "free"}
                    onChange={(event) =>
                      setField("annualPrice", Number(event.target.value))
                    }
                  />
                </FieldTooltip>
              </Field>
              <Field className="sm:col-span-2">
                <FieldTitle className="text-xs font-normal text-forma-text-secondary">
                  Description
                </FieldTitle>
                <FieldTooltip content="A short overview members see before choosing the plan.">
                  <Textarea
                    className="rounded-xl border-forma-text-primary/10 bg-forma-bg-surface text-sm text-forma-text-primary placeholder:text-forma-text-secondary/70 focus-visible:border-forma-brand-ember focus-visible:ring-forma-brand-ember/20"
                    rows={2}
                    maxLength={500}
                    required
                    aria-label="Plan description"
                    value={plan.description}
                    onChange={(event) =>
                      setField("description", event.target.value)
                    }
                  />
                </FieldTooltip>
              </Field>
              <Field className="sm:col-span-2">
                <FieldTitle className="text-xs font-normal text-forma-text-secondary">
                  Plan benefits
                </FieldTitle>
                <FieldTooltip content="These benefit lines are shown on the membership plan card.">
                  <Textarea
                    className="rounded-xl border-forma-text-primary/10 bg-forma-bg-surface text-sm text-forma-text-primary placeholder:text-forma-text-secondary/70 focus-visible:border-forma-brand-ember focus-visible:ring-forma-brand-ember/20"
                    rows={4}
                    maxLength={4800}
                    aria-label="Plan benefits"
                    value={(plan.features || []).join("\n")}
                    onChange={(event) =>
                      setField(
                        "features",
                        event.target.value.split("\n").slice(0, 30),
                      )
                    }
                  />
                </FieldTooltip>
              </Field>
            </FieldGroup>

            <FieldSet className="gap-3">
              <FieldLegend className="text-sm">
                Included app features
              </FieldLegend>
              <FieldDescription>
                Choose which features are available to members on this plan.
              </FieldDescription>
              <FieldGroup className="grid gap-2 sm:grid-cols-2">
                {MEMBERSHIP_FEATURES.map(({ key, label }) => (
                  <Field
                    key={key}
                    orientation="horizontal"
                    className="items-center gap-2 rounded-lg border border-forma-text-primary/10 px-3 py-2"
                  >
                    <FieldTooltip content={`Allow members to use ${label}.`}>
                      <Checkbox
                        id={`edit-${plan.slug}-${key}`}
                        checked={(plan.featureKeys || []).includes(key)}
                        aria-label={label}
                        className={checkboxClass}
                        onCheckedChange={(checked) =>
                          setField(
                            "featureKeys",
                            checked
                              ? [...(plan.featureKeys || []), key]
                              : (plan.featureKeys || []).filter(
                                  (item) => item !== key,
                                ),
                          )
                        }
                      />
                    </FieldTooltip>
                    <label
                      htmlFor={`edit-${plan.slug}-${key}`}
                      className="cursor-pointer text-xs font-normal text-forma-text-secondary"
                    >
                      {label}
                    </label>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>

            <FieldSet className="gap-3">
              <FieldLegend className="text-sm">
                Plan visibility and extras
              </FieldLegend>
              <FieldDescription>
                Control whether members can see this plan and how it is
                featured. Paid plans include trainer access automatically.
              </FieldDescription>
              <FieldGroup className="grid gap-2 sm:grid-cols-3">
                {[
                  {
                    id: "active",
                    label: "Available to clients",
                    content: "Visible plans can be selected by members.",
                    checked: Boolean(plan.active),
                    disabled: false,
                  },
                  {
                    id: "highlight",
                    label: "Highlight plan",
                    content: "Mark this plan as a recommended option.",
                    checked: Boolean(plan.highlight),
                    disabled: false,
                  },
                  {
                    id: "trainerIncluded",
                    label: "Include a trainer",
                    content:
                      plan.accessLevel === "free"
                        ? "Trainer access is available on paid plans."
                        : "Trainer access is included automatically with paid plans.",
                    checked: plan.accessLevel !== "free",
                    disabled: true,
                  },
                ].map((option) => (
                  <Field
                    key={option.id}
                    orientation="horizontal"
                    data-disabled={option.disabled || undefined}
                    className="items-center gap-2 rounded-lg border border-forma-text-primary/10 px-3 py-2"
                  >
                    <FieldTooltip content={option.content}>
                      <Checkbox
                        id={`edit-${plan.slug}-${option.id}`}
                        checked={option.checked}
                        disabled={option.disabled}
                        aria-label={option.label}
                        className={checkboxClass}
                        onCheckedChange={(checked) =>
                          setField(option.id, Boolean(checked))
                        }
                      />
                    </FieldTooltip>
                    <label
                      htmlFor={`edit-${plan.slug}-${option.id}`}
                      className="cursor-pointer text-xs font-normal text-forma-text-secondary"
                    >
                      {option.label}
                    </label>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner data-icon="inline-start" />}
                Save plan
              </Button>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminMemberships() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("config");
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesError, setPurchasesError] = useState("");
  const [savingSlug, setSavingSlug] = useState("");
  const [visibilitySavingSlug, setVisibilitySavingSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDialogError, setPlanDialogError] = useState("");
  const [newPlan, setNewPlan] = useState({
    slug: "",
    accessLevel: "basic",
    name: "",
    badge: "",
    description: "",
    monthlyPrice: 1000,
    annualPrice: 1000,
    features: "",
    featureKeys: [],
    highlight: false,
    trainerIncluded: false,
    active: true,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: planResponse } = await api.get("/admin/membership-plans");
      if (!Array.isArray(planResponse?.plans))
        throw new Error("Membership plans were not returned.");
      setPlans(planResponse.plans);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load membership management data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPurchases = useCallback(async () => {
    setPurchasesLoading(true);
    setPurchasesError("");
    try {
      const { data } = await api.get("/admin/membership-purchases");
      if (!data?.success || !Array.isArray(data.purchases)) {
        throw new Error(data?.message || "Purchase history was not returned.");
      }
      setPurchases(data.purchases);
    } catch (requestError) {
      setPurchasesError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load membership purchase history.",
      );
    } finally {
      setPurchasesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeSection === "purchases") loadPurchases();
  }, [activeSection, loadPurchases]);

  const refreshActiveSection = () => {
    if (activeSection === "purchases") {
      loadPurchases();
      return;
    }
    loadData();
  };
  const updateSelectedPlan = (key, value) => {
    setSelectedPlan((current) =>
      current ? { ...current, [key]: value } : current,
    );
  };
  const openPlanDetails = (plan) => {
    setPlanDialogError("");
    setSelectedPlan({
      ...plan,
      features: plan.features || [],
      featureKeys: plan.featureKeys || [],
    });
  };
  const savePlan = async (plan) => {
    setSavingSlug(plan.slug);
    setPlanDialogError("");
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(`/admin/membership-plans/${plan.slug}`, {
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
        featureKeys: Array.isArray(plan.featureKeys) ? plan.featureKeys : [],
      });
      setPlans((current) =>
        current.map((item) => (item.slug === plan.slug ? data.plan : item)),
      );
      setSelectedPlan(null);
      setNotice(`${plan.name} plan saved.`);
      return true;
    } catch (requestError) {
      const message =
        requestError.response?.data?.message || "Unable to save this plan.";
      setPlanDialogError(message);
      setError(message);
      return false;
    } finally {
      setSavingSlug("");
    }
  };
  const updatePlanVisibility = async (plan, active) => {
    setVisibilitySavingSlug(plan.slug);
    setError("");
    setNotice("");
    setPlans((current) =>
      current.map((item) =>
        item.slug === plan.slug ? { ...item, active } : item,
      ),
    );
    setSelectedPlan((current) =>
      current?.slug === plan.slug ? { ...current, active } : current,
    );
    try {
      const { data } = await api.put(`/admin/membership-plans/${plan.slug}`, {
        ...plan,
        active,
        features: Array.isArray(plan.features) ? plan.features : [],
        featureKeys: Array.isArray(plan.featureKeys) ? plan.featureKeys : [],
      });
      setPlans((current) =>
        current.map((item) => (item.slug === plan.slug ? data.plan : item)),
      );
      setSelectedPlan((current) =>
        current?.slug === plan.slug ? { ...current, ...data.plan } : current,
      );
      setNotice(
        `${plan.name} is now ${active ? "visible" : "hidden"} to members.`,
      );
    } catch (requestError) {
      setPlans((current) =>
        current.map((item) =>
          item.slug === plan.slug ? { ...item, active: plan.active } : item,
        ),
      );
      setSelectedPlan((current) =>
        current?.slug === plan.slug
          ? { ...current, active: plan.active }
          : current,
      );
      setError(
        requestError.response?.data?.message ||
          `Unable to change visibility for ${plan.name}.`,
      );
    } finally {
      setVisibilitySavingSlug("");
    }
  };
  const createPlan = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...newPlan,
        slug: newPlan.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        features: newPlan.features
          .split("\n")
          .map((feature) => feature.trim())
          .filter(Boolean),
      };
      const { data } = await api.post("/admin/membership-plans", payload);
      setPlans((current) =>
        [...current, data.plan].sort(
          (first, second) => first.sortOrder - second.sortOrder,
        ),
      );
      setNewPlan({
        slug: "",
        accessLevel: "basic",
        name: "",
        badge: "",
        description: "",
        monthlyPrice: 1000,
        annualPrice: 1000,
        features: "",
        highlight: false,
        featureKeys: [],
        trainerIncluded: false,
        active: true,
      });
      setCreateDialogOpen(false);
      setNotice(`${data.plan.name} plan created.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to create this plan.",
      );
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="vf-theme-page mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-forma-text-primary sm:text-3xl">
            Manage memberships
          </h1>
          <p className="mt-1.5 text-sm text-forma-text-secondary">
            Review purchases and manage the plans available to your members.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={refreshActiveSection}
          disabled={activeSection === "config" ? loading : purchasesLoading}
          aria-label={
            activeSection === "config"
              ? "Refresh membership configuration"
              : "Refresh purchase history"
          }
          className="mt-1 size-9 shrink-0 rounded-full bg-transparent text-forma-text-secondary hover:bg-forma-bg-surface-raised hover:text-forma-brand-teal"
        >
          {(activeSection === "config" ? loading : purchasesLoading) ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={RefreshCw} aria-hidden="true" />
          )}
        </Button>
      </header>
      <Tabs
        value={activeSection}
        onValueChange={setActiveSection}
        className="mx-auto mt-6 w-full max-w-4xl"
      >
        <div className="flex w-full items-center justify-between gap-4 border-b border-forma-text-primary/10">
          <TabsList
            variant="line"
            className="h-auto w-auto justify-start gap-5 rounded-none border-0 p-0"
          >
            <TabsTrigger
              value="purchases"
              className="flex-none cursor-pointer rounded-none px-1 pb-3 text-sm text-forma-text-secondary data-active:text-forma-text-primary after:bg-forma-brand-teal"
            >
              Purchase history
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="flex-none cursor-pointer rounded-none px-1 pb-3 text-sm text-forma-text-secondary data-active:text-forma-text-primary after:bg-forma-brand-teal"
            >
              Membership config
            </TabsTrigger>
          </TabsList>
          {activeSection === "config" && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setError("");
                setCreateDialogOpen(true);
              }}
              className="mb-2 cursor-pointer shrink-0"
            >
              Create plan
            </Button>
          )}
        </div>

        <TabsContent value="purchases" className="mt-5">
          {purchasesLoading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-forma-text-secondary">
              <Spinner className="size-5 text-forma-status-error" />
              Loading purchase history...
            </div>
          ) : purchasesError ? (
            <Alert
              variant="destructive"
              className="mx-auto max-w-4xl border-forma-status-error/25 bg-forma-status-error/5 text-forma-status-error"
            >
              <AlertTitle className="font-semibold">
                Could not load purchase history
              </AlertTitle>
              <AlertDescription className="text-forma-status-error/90">
                {purchasesError}
              </AlertDescription>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadPurchases}
                className="mt-2 text-forma-status-error hover:bg-forma-status-error/10 hover:text-forma-status-error"
              >
                Try again
              </Button>
            </Alert>
          ) : purchases.length === 0 ? (
            <EmptyState
              type="membership"
              sentence="No membership purchases have been recorded yet."
              actionLabel="Refresh purchase history"
              onAction={loadPurchases}
            />
          ) : (
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="border-forma-text-primary/10 hover:bg-transparent">
                    <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Date
                    </TableHead>
                    <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Member
                    </TableHead>
                    <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Membership
                    </TableHead>
                    <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Amount
                    </TableHead>
                    <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Payment
                    </TableHead>
                    <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow
                      key={purchase._id}
                      tabIndex={0}
                      onClick={() => setSelectedPurchase(purchase)}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          setSelectedPurchase(purchase);
                        }
                      }}
                      className="cursor-pointer border-forma-text-primary/5 transition-colors hover:bg-forma-bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forma-brand-ember"
                    >
                      <TableCell className="text-xs text-forma-text-secondary">
                        {formatPurchaseDate(purchase.createdAt)}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-48 truncate text-sm font-medium text-forma-text-primary">
                          {purchase.user?.name || "Deleted account"}
                        </p>
                        <p className="max-w-48 truncate text-xs text-forma-text-secondary">
                          {purchase.user?.email || "No email available"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-forma-text-primary">
                          {purchase.planName || "Membership"}
                        </p>
                        <p className="text-xs capitalize text-forma-text-secondary">
                          {purchase.billingInterval || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-forma-text-primary">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: purchase.currency || "PKR",
                          maximumFractionDigits: 0,
                        }).format(purchase.amount ?? 0)}
                      </TableCell>
                      <TableCell className="text-xs text-forma-text-secondary">
                        {formatPaymentMethod(purchase.paymentMethod)}
                        {purchase.paymentMode === "simulated" && (
                          <span className="mt-0.5 block text-xs text-forma-status-warning">
                            Simulated
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
                            purchase.status === "active"
                              ? "border-forma-status-success/25 bg-forma-status-success/10 text-forma-status-success"
                              : "border-forma-status-warning/25 bg-forma-status-warning/10 text-forma-status-warning"
                          }`}
                        >
                          {purchase.status === "simulated_success"
                            ? "Simulated success"
                            : purchase.status || "Unknown"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Dialog
            open={Boolean(selectedPurchase)}
            onOpenChange={(open) => {
              if (!open) setSelectedPurchase(null);
            }}
          >
            {selectedPurchase && (
              <DialogContent className="max-w-lg border-forma-text-primary/10 bg-forma-bg-surface text-forma-text-primary">
                <DialogHeader>
                  <DialogTitle>Membership purchase</DialogTitle>
                  <DialogDescription>
                    Purchase details recorded for this member.
                  </DialogDescription>
                </DialogHeader>
                <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-forma-text-secondary">
                      Member
                    </dt>
                    <dd className="mt-1 break-words font-medium">
                      {selectedPurchase.user?.name || "Deleted account"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-forma-text-secondary">Email</dt>
                    <dd className="mt-1 break-all font-medium">
                      {selectedPurchase.user?.email || "No email available"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-forma-text-secondary">
                      Membership
                    </dt>
                    <dd className="mt-1 font-medium">
                      {selectedPurchase.planName || "Membership"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-forma-text-secondary">
                      Billing interval
                    </dt>
                    <dd className="mt-1 font-medium capitalize">
                      {selectedPurchase.billingInterval || "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-forma-text-secondary">
                      Amount
                    </dt>
                    <dd className="mt-1 font-medium">
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: selectedPurchase.currency || "PKR",
                        maximumFractionDigits: 0,
                      }).format(selectedPurchase.amount ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-forma-text-secondary">
                      Payment method
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatPaymentMethod(selectedPurchase.paymentMethod)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-forma-text-secondary">
                      Payment mode
                    </dt>
                    <dd className="mt-1 font-medium capitalize">
                      {selectedPurchase.paymentMode || "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-forma-text-secondary">
                      Purchase date
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatPurchaseDate(selectedPurchase.createdAt)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-forma-text-secondary">
                      Status
                    </dt>
                    <dd className="mt-1 font-medium">
                      {selectedPurchase.status === "simulated_success"
                        ? "Simulated success"
                        : selectedPurchase.status || "Unknown"}
                    </dd>
                  </div>
                </dl>
              </DialogContent>
            )}
          </Dialog>
        </TabsContent>

        <TabsContent value="config" className="mt-5">
          <AdminNotice
            type="error"
            message={error && !createDialogOpen ? error : ""}
            onDismiss={() => setError("")}
            duration={0}
          />
          <AdminNotice
            type="success"
            message={notice}
            onDismiss={() => setNotice("")}
            duration={5000}
          />
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-forma-text-secondary">
              <Spinner className="size-5 text-forma-status-error" />
              Loading plans...
            </div>
          ) : (
            <>
              <Dialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
              >
                <DialogContent className="max-h-[90vh] overflow-y-auto border border-forma-text-primary/10 bg-forma-bg-surface text-forma-text-primary sm:max-w-3xl">
                  <TooltipProvider>
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold">
                        Create a membership plan
                      </DialogTitle>
                      <DialogDescription>
                        Add the plan details and choose what members can access.
                        Hover over or focus a field for a quick explanation.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createPlan} className="flex flex-col gap-5">
                      {error && (
                        <Alert
                          variant="destructive"
                          className="border-forma-status-error/25 bg-forma-status-error/5 text-forma-status-error"
                        >
                          <AlertTitle className="font-semibold">
                            Could not create plan
                          </AlertTitle>
                          <AlertDescription className="text-forma-status-error/90">
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FieldTooltip content="This name appears to members when they compare plans.">
                          <Input
                            className={dialogInputClass}
                            required
                            maxLength={80}
                            aria-label="Membership name"
                            placeholder="Add a membership name"
                            value={newPlan.name}
                            onChange={(event) =>
                              setNewPlan((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </FieldTooltip>
                        <FieldTooltip content="Use lowercase letters, numbers, and dashes. This ID must be unique.">
                          <Input
                            className={dialogInputClass}
                            required
                            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                            maxLength={48}
                            aria-label="Unique plan ID"
                            placeholder="Unique plan ID, e.g. student-plus"
                            value={newPlan.slug}
                            onChange={(event) =>
                              setNewPlan((current) => ({
                                ...current,
                                slug: event.target.value
                                  .toLowerCase()
                                  .replace(/\s+/g, "-"),
                              }))
                            }
                          />
                        </FieldTooltip>
                        <Select
                          value={newPlan.accessLevel}
                          onValueChange={(value) =>
                            setNewPlan((current) => ({
                              ...current,
                              accessLevel: value,
                            }))
                          }
                        >
                          <FieldTooltip content="Sets the feature access tier available to members on this plan.">
                            <SelectTrigger
                              aria-label="Membership access level"
                              className={`${dialogInputClass} w-full`}
                            >
                              <SelectValue placeholder="Choose an access level" />
                            </SelectTrigger>
                          </FieldTooltip>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="elite">Elite</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldTooltip content="Add a short label to call attention to this plan.">
                          <Input
                            className={dialogInputClass}
                            maxLength={60}
                            aria-label="Plan badge"
                            placeholder="Add a short badge (optional)"
                            value={newPlan.badge}
                            onChange={(event) =>
                              setNewPlan((current) => ({
                                ...current,
                                badge: event.target.value,
                              }))
                            }
                          />
                        </FieldTooltip>
                        <FieldTooltip content="The amount charged for one month of membership, in PKR.">
                          <Input
                            className={dialogInputClass}
                            type="number"
                            min="1000"
                            max="10000000"
                            required
                            aria-label="Monthly price in PKR"
                            placeholder="Monthly price (PKR)"
                            value={newPlan.monthlyPrice}
                            onChange={(event) =>
                              setNewPlan((current) => ({
                                ...current,
                                monthlyPrice: Number(event.target.value),
                              }))
                            }
                          />
                        </FieldTooltip>
                        <FieldTooltip content="Enter the per-month equivalent members pay when choosing annual billing.">
                          <Input
                            className={dialogInputClass}
                            type="number"
                            min="1000"
                            max="10000000"
                            required
                            aria-label="Annual monthly equivalent in PKR"
                            placeholder="Annual price per month (PKR)"
                            value={newPlan.annualPrice}
                            onChange={(event) =>
                              setNewPlan((current) => ({
                                ...current,
                                annualPrice: Number(event.target.value),
                              }))
                            }
                          />
                        </FieldTooltip>
                        <FieldTooltip content="A short explanation members see before choosing the plan.">
                          <Textarea
                            className="rounded-xl border-forma-text-primary/10 bg-forma-bg-surface text-sm text-forma-text-primary placeholder:text-forma-text-secondary/70 focus-visible:border-forma-brand-ember focus-visible:ring-forma-brand-ember/20 sm:col-span-2"
                            required
                            rows={2}
                            maxLength={500}
                            aria-label="Plan description"
                            placeholder="Describe this membership in a sentence"
                            value={newPlan.description}
                            onChange={(event) =>
                              setNewPlan((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                          />
                        </FieldTooltip>
                        <FieldTooltip content="List the benefits shown on the plan card, with one benefit on each line.">
                          <Textarea
                            className="rounded-xl border-forma-text-primary/10 bg-forma-bg-surface text-sm text-forma-text-primary placeholder:text-forma-text-secondary/70 focus-visible:border-forma-brand-ember focus-visible:ring-forma-brand-ember/20 sm:col-span-2"
                            rows={3}
                            aria-label="Plan benefits"
                            placeholder="Add plan benefits, one per line"
                            value={newPlan.features}
                            onChange={(event) =>
                              setNewPlan((current) => ({
                                ...current,
                                features: event.target.value,
                              }))
                            }
                          />
                        </FieldTooltip>
                      </div>

                      <FieldSet className="gap-3">
                        <FieldLegend className="text-sm">
                          Included app features
                        </FieldLegend>
                        <FieldDescription>
                          Choose which app features members on this plan can
                          use.
                        </FieldDescription>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {MEMBERSHIP_FEATURES.map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center gap-2 px-3 py-2"
                            >
                              <FieldTooltip
                                content={`Allow members with this plan to use ${label}.`}
                              >
                                <Checkbox
                                  id={`create-feature-${key}`}
                                  checked={newPlan.featureKeys.includes(key)}
                                  aria-label={label}
                                  className="border-forma-text-primary/30 data-checked:border-forma-brand-teal data-checked:bg-forma-brand-teal data-checked:text-forma-bg-base"
                                  onCheckedChange={(checked) =>
                                    setNewPlan((current) => ({
                                      ...current,
                                      featureKeys: checked
                                        ? [...current.featureKeys, key]
                                        : current.featureKeys.filter(
                                            (item) => item !== key,
                                          ),
                                    }))
                                  }
                                />
                              </FieldTooltip>
                              <label
                                htmlFor={`create-feature-${key}`}
                                className="min-w-0 flex-1 cursor-pointer text-sm text-forma-text-secondary"
                              >
                                {label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </FieldSet>

                      <FieldSet className="gap-3">
                        <FieldLegend className="text-sm">
                          Plan availability and extras
                        </FieldLegend>
                        <FieldDescription>
                          Control whether members can see this plan, whether it
                          is highlighted, and if trainer access is included.
                        </FieldDescription>
                        <div className="grid gap-12 px-10 sm:grid-cols-3">
                          <div className="flex items-center gap-2 text-xs text-forma-text-secondary">
                            <FieldTooltip content="Turn this off to hide the plan from members.">
                              <Checkbox
                                id="create-plan-active"
                                checked={newPlan.active}
                                aria-label="Make plan available to clients"
                                className="border-forma-text-primary/30 data-checked:border-forma-brand-teal data-checked:bg-forma-brand-teal data-checked:text-forma-bg-base"
                                onCheckedChange={(checked) =>
                                  setNewPlan((current) => ({
                                    ...current,
                                    active: Boolean(checked),
                                  }))
                                }
                              />
                            </FieldTooltip>
                            <label
                              htmlFor="create-plan-active"
                              className="min-w-0 flex-1 cursor-pointer text-xs font-normal"
                            >
                              Available to clients
                            </label>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-forma-text-secondary">
                            <FieldTooltip content="Mark this plan as a recommended option.">
                              <Checkbox
                                id="create-plan-highlight"
                                checked={newPlan.highlight}
                                aria-label="Highlight this plan"
                                className="border-forma-text-primary/30 data-checked:border-forma-brand-teal data-checked:bg-forma-brand-teal data-checked:text-forma-bg-base"
                                onCheckedChange={(checked) =>
                                  setNewPlan((current) => ({
                                    ...current,
                                    highlight: Boolean(checked),
                                  }))
                                }
                              />
                            </FieldTooltip>
                            <label
                              htmlFor="create-plan-highlight"
                              className="min-w-0 flex-1 cursor-pointer text-xs font-normal"
                            >
                              Highlight plan
                            </label>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-forma-text-secondary">
                            <FieldTooltip content="Paid access levels include trainer assignment automatically.">
                              <Checkbox
                                id="create-plan-trainer"
                                checked={
                                  newPlan.accessLevel !== "free" ||
                                  newPlan.trainerIncluded
                                }
                                disabled={newPlan.accessLevel !== "free"}
                                aria-label="Include a trainer"
                                className="border-forma-text-primary/30 data-checked:border-forma-brand-teal data-checked:bg-forma-brand-teal data-checked:text-forma-bg-base"
                                onCheckedChange={(checked) =>
                                  setNewPlan((current) => ({
                                    ...current,
                                    trainerIncluded: Boolean(checked),
                                  }))
                                }
                              />
                            </FieldTooltip>
                            <label
                              htmlFor="create-plan-trainer"
                              className="min-w-0 flex-1 cursor-pointer text-xs font-normal"
                            >
                              Include a trainer
                            </label>
                          </div>
                        </div>
                      </FieldSet>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creating}>
                          {creating && <Spinner data-icon="inline-start" />}
                          Create plan
                        </Button>
                      </DialogFooter>
                    </form>
                  </TooltipProvider>
                </DialogContent>
              </Dialog>
              <section
                aria-label="Membership plans"
                className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface"
              >
                {plans.length ? (
                  <>
                    <TooltipProvider>
                      <Table className="min-w-[640px] bg-forma-bg-surface">
                        <TableHeader className="bg-forma-bg-surface">
                          <TableRow className="border-forma-text-primary/10 hover:bg-transparent">
                            <TableHead className="w-[36%] font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                              Plan
                            </TableHead>
                            <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                              Tier
                            </TableHead>
                            <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                              Monthly
                            </TableHead>
                            <TableHead className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                              Yearly
                            </TableHead>
                            <TableHead className="text-right font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-text-secondary">
                              Visible
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-forma-bg-surface">
                          {plans.map((plan) => (
                            <TableRow
                              key={plan.slug}
                              onClick={(event) => {
                                if (
                                  event.target.closest(
                                    "button, input, [role='checkbox']",
                                  )
                                ) {
                                  return;
                                }
                                openPlanDetails(plan);
                              }}
                              className="cursor-pointer border-forma-text-primary/5 bg-forma-bg-surface transition-colors hover:!bg-forma-bg-surface"
                            >
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => openPlanDetails(plan)}
                                  className="h-auto w-full justify-start rounded-lg px-2 py-1.5 text-left font-normal hover:bg-forma-bg-surface-raised"
                                >
                                  <span className="flex min-w-0 flex-col items-start">
                                    <span className="max-w-full truncate text-sm font-medium text-forma-text-primary">
                                      {plan.name}
                                    </span>
                                    <span className="max-w-full truncate text-xs text-forma-text-secondary">
                                      {plan.slug}
                                    </span>
                                  </span>
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => openPlanDetails(plan)}
                                  className="h-auto w-full justify-start rounded-lg px-2 py-1.5 text-left text-sm font-normal text-forma-text-primary hover:bg-forma-bg-surface-raised"
                                >
                                  {accessLevelLabels[plan.accessLevel] ||
                                    accessLevelLabels[plan.slug] ||
                                    "Custom"}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => openPlanDetails(plan)}
                                  className="h-auto w-full justify-start rounded-lg px-2 py-1.5 text-left text-sm font-medium text-forma-text-primary hover:bg-forma-bg-surface-raised"
                                >
                                  {formatPlanPrice(plan.monthlyPrice)}
                                  <span className="ml-1 text-xs font-normal text-forma-text-secondary">
                                    / month
                                  </span>
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => openPlanDetails(plan)}
                                  className="h-auto w-full flex-col items-start justify-start rounded-lg px-2 py-1.5 text-left hover:bg-forma-bg-surface-raised"
                                >
                                  <span className="text-sm font-medium text-forma-text-primary">
                                    {formatPlanPrice(
                                      (plan.annualPrice || 0) * 12,
                                    )}
                                  </span>
                                  <span className="text-xs font-normal text-forma-text-secondary">
                                    billed yearly
                                  </span>
                                </Button>
                              </TableCell>
                              <TableCell className="text-right">
                                <FieldTooltip
                                  content={
                                    plan.active
                                      ? "This plan is visible and can be selected by members."
                                      : "This plan is hidden and cannot be selected by members."
                                  }
                                >
                                  <Checkbox
                                    checked={Boolean(plan.active)}
                                    disabled={
                                      visibilitySavingSlug === plan.slug
                                    }
                                    aria-label={`${plan.active ? "Hide" : "Show"} ${plan.name} plan for members`}
                                    className={checkboxClass}
                                    onCheckedChange={(checked) =>
                                      updatePlanVisibility(
                                        plan,
                                        Boolean(checked),
                                      )
                                    }
                                  />
                                </FieldTooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TooltipProvider>
                    <MembershipPlanDialog
                      plan={selectedPlan}
                      open={Boolean(selectedPlan)}
                      onOpenChange={(open) => {
                        if (!open) setSelectedPlan(null);
                      }}
                      onPlanChange={updateSelectedPlan}
                      onSave={savePlan}
                      saving={savingSlug === selectedPlan?.slug}
                      error={planDialogError}
                    />
                  </>
                ) : (
                  <EmptyState
                    type="membership"
                    sentence="No membership plans are configured yet."
                    actionLabel="Create the first plan"
                    onAction={() => setCreateDialogOpen(true)}
                  />
                )}
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
