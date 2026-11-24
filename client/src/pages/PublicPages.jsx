import React, { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { Card, Button, Field } from "../components/ui";
import FeatureImage from "../components/ui/FeatureImage";
import FeatureHighlights from "../components/FeatureHighlights";
import PublicFeatureCard from "../components/PublicFeatureCard";
import {
  FEATURE_MIN_PLAN,
  TRAINER_FEATURES,
  getMembershipRank,
} from "../utils/membershipAccess";
import {
  HugeiconsIcon,
  AlertCircle,
  CheckCircle2,
  Dumbbell,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "../components/ui/icons";
const money = (amount) => `PKR ${Number(amount || 0).toLocaleString("en-PK")}`;
function PageShell({ children, className = "" }) {
  return <div className={`forma-public ${className}`.trim()}>{children}</div>;
}
function PageIntro({
  title,
  children,
  imageName,
  className = "",
}) {
  return (
    <header
      className={`forma-public__container forma-public__section forma-public__intro ${className}`.trim()}
    >
      {" "}
      <div>
        {" "}
        <h1 className="forma-public__title">{title}</h1>{" "}
        {children && <p className="forma-public__lead">{children}</p>}{" "}
      </div>{" "}
      {imageName && (
        <FeatureImage
          name={imageName}
          className="forma-illustration"
          loading={imageName === "homeHero" ? "eager" : "lazy"}
        />
      )}{" "}
    </header>
  );
}
const landingFeatures = [
  {
    title: "Strength programs",
    description: "Progressive lifting plans built around your numbers.",
  },
  {
    title: "Live coaching",
    description: "Message your trainer and book scheduled classes.",
  },
  {
    title: "A real community",
    description: "Track progress and stay connected to training.",
  },
];

const trainingValues = ["Strength", "Endurance", "Community", "Results"];
const aboutPrinciples = [
  {
    title: "Train with purpose",
    description:
      "Programs target a specific outcome, not a generic calorie burn.",
  },
  {
    title: "Coached, not just tracked",
    description: "An app logs reps, but a coach can correct your squat.",
  },
  {
    title: "Community that shows up",
    description:
      "People make it easier to return when they notice you’re away.",
  },
];
const contactShortcuts = [
  {
    label: "Memberships",
    description: "Compare available plans.",
    to: "/memberships",
  },
  {
    label: "Account access",
    description: "Sign in to manage your account.",
    to: "/login",
  },
  {
    label: "Message FORGE",
    description: "Ask about plans, trainers, or facilities.",
    to: "#contact-form",
  },
];

function TrainingValuesTicker() {
  const renderValues = (duplicate = false) => (
    <ul
      className="forge-landing__ticker-group"
      aria-label={duplicate ? undefined : "Training values"}
      aria-hidden={duplicate || undefined}
    >
      {trainingValues.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  );

  return (
    <div className="forge-landing__ticker">
      <div className="forge-landing__ticker-track">
        {renderValues()}
        {renderValues(true)}
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <PageShell className="forge-landing">
      <section
        className="forge-landing__hero"
        data-enter
        aria-labelledby="forge-landing-title"
      >
        <div className="forge-landing__hero-inner">
          <div className="forge-landing__copy">
            <p className="forge-landing__eyebrow">
              <span aria-hidden="true" />
              STRENGTH STARTS HERE
            </p>
            <h1 id="forge-landing-title">
              Strength training for people who show up.
            </h1>
            <p className="forge-landing__lead">
              Strength programs, live coaching and a community for people who
              want to train with purpose.
            </p>
            <div className="forge-landing__actions">
              <Button
                as={Link}
                to="/register"
                variant="primary"
                className="forge-landing__primary-action"
              >
                Join Forge
              </Button>
              <Button
                as={Link}
                to="#features-title"
                variant="secondary"
                className="forge-landing__secondary-action"
              >
                Explore training
              </Button>
            </div>
          </div>

          <div
            className="forge-landing__visual"
            role="img"
            aria-label="Athlete lifting a barbell in a gym."
          >
            <div className="forge-landing__diagonal-panel">
            </div>
          </div>
        </div>
      </section>

      <TrainingValuesTicker />

      <section
        id="programs"
        className="forge-landing__features"
        aria-labelledby="features-title"
      >
        <div className="forge-landing__container">
          <header className="forge-landing__section-heading">
            <p className="forge-landing__eyebrow">
              <span aria-hidden="true" />
              WHAT YOU GET
            </p>
            <h2 id="features-title">Built for people who show up</h2>
          </header>
          <div className="forge-landing__cards">
            {landingFeatures.map(({ title, description }) => (
              <PublicFeatureCard
                className="forge-landing__card"
                key={title}
                title={title}
                description={description}
              />
            ))}
          </div>
        </div>
      </section>

      <FeatureHighlights />

      <section
        className="forge-landing__closing"
        aria-labelledby="closing-title"
      >
        <div className="forge-landing__closing-inner">
          <div>
            <h2 id="closing-title">Ready to forge something stronger?</h2>
            <p>
              Create an account to build workout plans and track your training.
            </p>
          </div>
          <div className="forge-landing__actions">
            <Button
              as={Link}
              to="/register"
              variant="primary"
              className="forge-landing__primary-action"
            >
              Join Forge
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
export function AboutPage() {
  return (
    <PageShell className="forge-about">
      <section
        className="forge-about__hero"
        data-enter
        aria-labelledby="forge-about-title"
      >
        <div className="forge-about__hero-inner">
          <div className="forge-about__copy">
            <p className="forge-about__eyebrow">Our story</p>
            <h1 id="forge-about-title">
              We got tired of gyms that felt like waiting rooms.
            </h1>
            <p>
              FORGE exists because gyms kept treating real coaching as an upsell
              instead of the whole point. Every session here has an actual coach
              watching, not just a mirror — that’s the one rule we won’t bend as
              we grow.
            </p>
          </div>
          <div className="forge-about__visual" aria-hidden="true" />
        </div>
      </section>

      <section
        className="forge-about__values"
        aria-labelledby="forge-about-values-title"
      >
        <div className="forge-about__container">
          <header className="forge-about__section-heading">
            <p className="forge-about__tag">What we believe</p>
            <h2 id="forge-about-values-title">Three rules we don’t break</h2>
            <p>
              They shape every program, every hire, and every piece of equipment
              we buy.
            </p>
          </header>
          <ul className="forge-about__cards">
            {aboutPrinciples.map(({ title, description }) => (
              <PublicFeatureCard
                as="li"
                className="forge-about__card"
                key={title}
                title={title}
                description={description}
              />
            ))}
          </ul>
        </div>
      </section>

      <section className="forge-about__statement" aria-label="Our standard">
        <p>The best gym is the one you actually walk into.</p>
        <span className="forge-about__statement-label">
          — The FORGE coaching team
        </span>
      </section>

      <section
        className="forge-about__cta"
        aria-labelledby="forge-about-cta-title"
      >
        <div className="forge-about__cta-inner">
          <h2 id="forge-about-cta-title">Come see it for yourself.</h2>
          <p>
            Start with Free Starter. Add trainer-led support when you’re ready.
          </p>
          <Button
            as={Link}
            to="/memberships"
            variant="secondary"
            className="forge-about__cta-button"
          >
            Compare plans
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
export function PricingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [membership, setMembership] = useState(user?.membership || null);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      setLoading(true);
      setError("");
      try {
        const plansResponse = await api.get("/memberships/plans");
        if (!Array.isArray(plansResponse.data?.plans))
          throw new Error("Membership plans response was invalid.");
        let currentMembership = user?.membership || null;
        if (user) {
          const currentResponse = await api.get("/memberships/current");
          currentMembership = currentResponse.data.membership || null;
        }
        if (active) {
          setPlans(plansResponse.data.plans);
          setMembership(currentMembership);
        }
      } catch (requestError) {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Unable to load plans.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPlans();
    return () => {
      active = false;
    };
  }, [user]);
  const switchToFree = async () => {
    setProcessing(true);
    setError("");
    try {
      const { data } = await api.post("/memberships/purchase", {
        planSlug: "free",
        billingInterval: "monthly",
        paymentMethod: "free",
      });
      setMembership(data.membership);
      updateUser((currentUser) => ({
        ...currentUser,
        membership: data.membership,
      }));
      setNotice(data.message || "You are now on the Free plan.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to switch plans.",
      );
    } finally {
      setProcessing(false);
    }
  };
  const choosePlan = (plan) => {
    const interval = annualBilling ? "annual" : "monthly";
    if (!user) {
      navigate("/login", {
        state: {
          from: {
            pathname: "/checkout",
            search: `?plan=${plan.slug}&interval=${interval}`,
          },
        },
      });
      return;
    }
    if (user.role !== "user") {
      setError("Membership plans can only be purchased by client accounts.");
      return;
    }
    setNotice("");
    if (plan.slug === "free") {
      switchToFree();
      return;
    }
    navigate(`/checkout?plan=${plan.slug}&interval=${interval}`);
  };
  const activePlanSlug = membership?.planSlug || "free";
  const currentTrainer = membership?.assignedTrainer;
  const paidActive =
    getMembershipRank(membership) >= 1 &&
    membership?.endsAt &&
    new Date(membership.endsAt) > new Date();
  const accessTiers = ["basic", "elite", "premium"]
    .map((slug) => ({
      slug,
      name:
        plans.find((plan) => plan.slug === slug)?.name ||
        `${slug[0].toUpperCase()}${slug.slice(1)}`,
      features: TRAINER_FEATURES.filter(
        (feature) => FEATURE_MIN_PLAN[feature.key] === slug,
      ),
    }))
    .filter((tier) => tier.features.length > 0);
  return (
    <PageShell>
      {" "}
      <PageIntro
        title="Choose the plan that fits your training"
        imageName="membership"
        className="forma-public__intro--pricing"
      >
        {" "}
        Plan details and prices below are loaded from FORGE. Compare what each
        active membership includes.{" "}
      </PageIntro>{" "}
      <section
        className="forma-public__container forma-public__section forma-public__pricing"
        aria-label="Membership plans"
      >
        {" "}
        {user && (
          <Card className="forma-public__membership">
            {" "}
            <div className="forma-public__membership-mark">
              {" "}
              <HugeiconsIcon icon={ShieldCheck} aria-hidden="true" />{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="forma-public__surface-label">
                Your current plan
              </p>{" "}
              <h2>{membership?.planName || "Free Starter"}</h2>{" "}
              {membership?.endsAt && (
                <p>
                  Renews or ends{" "}
                  {new Date(membership.endsAt).toLocaleDateString()}.
                </p>
              )}{" "}
              {currentTrainer && (
                <p>Assigned trainer: {currentTrainer.name}</p>
              )}{" "}
            </div>{" "}
          </Card>
        )}{" "}
        {error && (
          <p className="forma-public__status is-error" role="alert">
            {" "}
            {error}{" "}
          </p>
        )}{" "}
        {notice && (
          <p className="forma-public__status is-success" role="status">
            {" "}
            {notice}{" "}
          </p>
        )}{" "}
        {user?.role === "user" && paidActive && !currentTrainer && (
          <p className="forma-public__status is-warning">
            {" "}
            Your plan includes a trainer. Choose one from your account when
            ready.{" "}
          </p>
        )}{" "}
        <div className="forma-public__pricing-controls">
          {" "}
          <div>
            {" "}
            <h2>Choose your billing period</h2>{" "}
            <p>Switch any time before you continue to checkout.</p>{" "}
          </div>{" "}
          <div
            className="forma-public__billing-switch"
            role="group"
            aria-label="Billing period"
          >
            {" "}
            <Button
              type="button"
              variant={annualBilling ? "ghost" : "primary"}
              aria-pressed={!annualBilling}
              onClick={() => setAnnualBilling(false)}
            >
              {" "}
              Monthly{" "}
            </Button>{" "}
            <Button
              type="button"
              variant={annualBilling ? "primary" : "ghost"}
              aria-pressed={annualBilling}
              onClick={() => setAnnualBilling(true)}
            >
              {" "}
              Annual{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        {loading ? (
          <div role="status" className="forma-public__pricing-state">
            {" "}
            <HugeiconsIcon icon={Loader2} aria-hidden="true" />{" "}
            <p>Loading available plans…</p>{" "}
          </div>
        ) : plans.length === 0 ? (
          <Card className="forma-public__pricing-empty" role="status">
            {" "}
            <FeatureImage
              name="membership"
              className="forma-illustration forma-illustration--compact"
            />{" "}
            <div>
              {" "}
              <h2>No plans to compare right now</h2>{" "}
              <p>
                Membership options are temporarily unavailable. Please try again
                later.
              </p>{" "}
            </div>{" "}
          </Card>
        ) : (
          <div className="forma-public__plan-grid">
            {" "}
            {plans.map((plan) => {
              const price = annualBilling
                ? plan.annualPrice
                : plan.monthlyPrice;
              const isCurrentPlan = activePlanSlug === plan.slug;
              const isHighlighted = Boolean(plan.highlight);
              return (
                <Card
                  key={plan.slug}
                  className={`forma-public__plan${isHighlighted ? " is-highlighted" : ""}`}
                >
                  {" "}
                  <div className="forma-public__plan-heading">
                    {" "}
                    <div className="forma-public__plan-tags">
                      {" "}
                      {plan.badge && (
                        <span className="forma-public__plan-badge">
                          {plan.badge}
                        </span>
                      )}{" "}
                      {isCurrentPlan && (
                        <span className="forma-public__plan-current">
                          Current plan
                        </span>
                      )}{" "}
                    </div>{" "}
                    <h2>{plan.name}</h2> <p>{plan.description}</p>{" "}
                  </div>{" "}
                  <div className="forma-public__plan-price">
                    {" "}
                    <p>
                      {" "}
                      <span className="forma-public__price-amount">
                        {money(price)}
                      </span>{" "}
                      <span className="forma-public__price-period">
                        {" "}
                        {plan.slug === "free" ? "forever" : "per month"}{" "}
                      </span>{" "}
                    </p>{" "}
                    {annualBilling && plan.slug !== "free" && (
                      <p className="forma-public__annual-total">
                        {" "}
                        {money(price * 12)} billed yearly{" "}
                      </p>
                    )}{" "}
                  </div>{" "}
                  <ul className="forma-public__plan-features">
                    {" "}
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        {" "}
                        <HugeiconsIcon
                          icon={CheckCircle2}
                          aria-hidden="true"
                        />{" "}
                        <span>{feature}</span>{" "}
                      </li>
                    ))}{" "}
                  </ul>{" "}
                  <Button
                    type="button"
                    variant={isHighlighted ? "primary" : "secondary"}
                    disabled={processing || isCurrentPlan}
                    onClick={() => choosePlan(plan)}
                  >
                    {" "}
                    {processing && plan.slug === "free" ? (
                      <HugeiconsIcon icon={Loader2} aria-hidden="true" />
                    ) : null}{" "}
                    {processing && plan.slug !== "free"
                      ? "Continuing…"
                      : isCurrentPlan
                        ? "Your current plan"
                        : plan.slug === "free"
                          ? "Choose free plan"
                          : "Continue with plan"}{" "}
                  </Button>{" "}
                </Card>
              );
            })}{" "}
          </div>
        )}{" "}
        <section
          className="forma-public__access"
          aria-labelledby="trainer-access-title"
        >
          {" "}
          <div className="forma-public__access-heading">
            {" "}
            <h2 id="trainer-access-title">Coaching tools, tier by tier</h2>{" "}
            <p>Trainer access expands with your membership.</p>{" "}
          </div>{" "}
          <div className="forma-public__access-tiers">
            {" "}
            {accessTiers.map((tier) => (
              <article key={tier.slug} className="forma-public__access-tier">
                {" "}
                <p className="forma-public__access-from">From</p>{" "}
                <h3>{tier.name}</h3>{" "}
                <ul>
                  {" "}
                  {tier.features.map((feature) => (
                    <li key={feature.key}>
                      {" "}
                      <HugeiconsIcon
                        icon={CheckCircle2}
                        aria-hidden="true"
                      />{" "}
                      <span>{feature.label}</span>{" "}
                    </li>
                  ))}{" "}
                </ul>{" "}
              </article>
            ))}{" "}
          </div>{" "}
          <p className="forma-public__checkout-note">
            {" "}
            Checkout in this project is simulated; no real payment is
            processed.{" "}
          </p>{" "}
        </section>{" "}
      </section>{" "}
    </PageShell>
  );
}
export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLocation = location.state?.from;
  const destinationPath =
    typeof requestedLocation === "string"
      ? requestedLocation
      : requestedLocation?.pathname;
  const requestedRedirect =
    destinationPath?.startsWith("/") && !destinationPath.startsWith("//")
      ? `${destinationPath}${typeof requestedLocation === "object" ? (requestedLocation.search || "") + (requestedLocation.hash || "") : ""}`
      : "/dashboard";
  const trainerDestination = (trainer) => {
    if (trainer.trainerApprovalStatus === "approved")
      return "/trainer/dashboard";
    if (trainer.trainerApprovalStatus === "awaiting_profile")
      return "/trainer/complete-profile";
    return null;
  };
  const redirectTo =
    user?.role === "admin"
      ? "/admin/trainers"
      : user?.role === "trainer"
        ? trainerDestination(user)
        : user?.profileComplete === false
          ? "/client/complete-profile"
          : requestedRedirect;
  useEffect(() => {
    if (user && redirectTo) {
      navigate(redirectTo, {
        replace: true,
        state:
          redirectTo === "/client/complete-profile"
            ? { from: requestedRedirect }
            : undefined,
      });
    }
  }, [user, navigate, redirectTo, requestedRedirect]);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Sign in failed. Check your email and password, then try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <PageShell>
      {" "}
      <section className="forma-public__container forma-public__section forma-public__auth-layout">
        {" "}
        <aside className="forma-public__auth-aside">
          {" "}
          <h2>Your training record, in one place</h2>{" "}
          <p>Review sessions, progress, and coaching from your account.</p>{" "}
        </aside>{" "}
        <Card className="forma-public__auth-card">
          {" "}
          <h1 className="forma-public__section-title">Sign in to FORGE</h1>{" "}
          <p>Pick up where your training record left off.</p>{" "}
          {user?.role === "trainer" && !redirectTo && (
            <p className="forma-public__status is-warning" role="status">
              {" "}
              Confirm your email before continuing your trainer
              application.{" "}
            </p>
          )}{" "}
          {error && (
            <p className="forma-public__status is-error" role="alert">
              {" "}
              {error}{" "}
            </p>
          )}{" "}
          <form className="forma-public__form" onSubmit={submit}>
            {" "}
            <Field
              id="login-email"
              label="Email address"
              name="email"
              type="email"
              icon={Mail}
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />{" "}
            <Field
              id="login-password"
              label="Password"
              name="password"
              type="password"
              icon={LockKeyhole}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />{" "}
            <Button type="submit" variant="primary" disabled={submitting}>
              {" "}
              {submitting ? (
                <HugeiconsIcon icon={Loader2} aria-hidden="true" />
              ) : null}{" "}
              {submitting ? "Signing in…" : "Sign in"}{" "}
            </Button>{" "}
          </form>{" "}
          <p>
            {" "}
            New to FORGE? <Link to="/register">Create an account</Link>{" "}
          </p>{" "}
        </Card>{" "}
      </section>{" "}
    </PageShell>
  );
}
export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState("user");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, register, registerTrainer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLocation = location.state?.from;
  const destinationPath = requestedLocation?.pathname;
  const requestedRedirect =
    destinationPath?.startsWith("/") && !destinationPath.startsWith("//")
      ? `${destinationPath}${requestedLocation.search || ""}${requestedLocation.hash || ""}`
      : "/dashboard";
  const redirectTo =
    user?.role === "admin"
      ? "/admin/trainers"
      : user?.role === "trainer"
        ? "/trainer/dashboard"
        : user?.profileComplete === false
          ? "/client/complete-profile"
          : requestedRedirect;
  const passwordError =
    password && password.length < 6 ? "Use at least 6 characters." : "";
  const confirmError =
    confirmPassword && password !== confirmPassword
      ? "Passwords do not match."
      : "";
  useEffect(() => {
    if (user) {
      navigate(redirectTo, {
        replace: true,
        state:
          redirectTo === "/client/complete-profile"
            ? { from: requestedRedirect }
            : undefined,
      });
    }
  }, [user, navigate, redirectTo, requestedRedirect]);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      if (accountType === "trainer") {
        const result = await registerTrainer(
          name.trim(),
          email.trim(),
          password,
        );
        setSuccess(
          result.message ||
            "Check your email to confirm your address and continue your trainer profile.",
        );
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        await register(name.trim(), email.trim(), password);
      }
    } catch (requestError) {
      setError(
        requestError.message || "Registration failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <PageShell>
      {" "}
      <section className="forma-public__container forma-public__section forma-public__auth-layout">
        {" "}
        <aside className="forma-public__auth-aside">
          {" "}
          <h2>Start with a training record</h2>{" "}
          <p>
            {" "}
            Track workouts and progress. Connect with a trainer if your plan
            includes coaching.{" "}
          </p>{" "}
        </aside>{" "}
        <Card className="forma-public__auth-card">
          {" "}
          <h1 className="forma-public__section-title">
            Create an account
          </h1>{" "}
          <p>Save your workouts and progress in one place.</p>{" "}
          {error && (
            <p className="forma-public__status is-error" role="alert">
              {" "}
              {error}{" "}
            </p>
          )}{" "}
          {success && (
            <p className="forma-public__status is-success" role="status">
              {" "}
              {success}{" "}
            </p>
          )}{" "}
          <form className="forma-public__form" onSubmit={submit}>
            {" "}
            <Field
              as="select"
              id="account-type"
              label="Account type"
              icon={Dumbbell}
              value={accountType}
              onChange={(event) => setAccountType(event.target.value)}
            >
              {" "}
              <option value="user">Fitness member</option>{" "}
              <option value="trainer">Apply as a trainer</option>{" "}
            </Field>{" "}
            {accountType === "trainer" && (
              <p className="forma-public__status">
                {" "}
                Confirm your email, complete your trainer profile, then wait for
                the administrator&apos;s final decision.{" "}
              </p>
            )}{" "}
            <Field
              id="register-name"
              label="Full name"
              name="name"
              type="text"
              icon={UserRound}
              autoComplete="name"
              placeholder="Your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
            />{" "}
            <Field
              id="register-email"
              label="Email address"
              name="email"
              type="email"
              icon={Mail}
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />{" "}
            <Field
              id="register-password"
              label="Password"
              name="password"
              type="password"
              icon={LockKeyhole}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              error={passwordError}
              required
            />{" "}
            <Field
              id="register-confirm-password"
              label="Confirm password"
              name="confirmPassword"
              type="password"
              icon={LockKeyhole}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={confirmError}
              required
            />{" "}
            <Button type="submit" variant="primary" disabled={submitting}>
              {" "}
              {submitting ? (
                <HugeiconsIcon icon={Loader2} aria-hidden="true" />
              ) : null}{" "}
              {submitting
                ? "Creating account…"
                : accountType === "trainer"
                  ? "Create trainer account"
                  : "Create account"}{" "}
            </Button>{" "}
          </form>{" "}
          <p>
            {" "}
            Already have an account?{" "}
            <Link to="/login" state={{ from: requestedLocation }}>
              {" "}
              Sign in{" "}
            </Link>{" "}
          </p>{" "}
        </Card>{" "}
      </section>{" "}
    </PageShell>
  );
}
export function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
    setNotice("");
  };
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/feedback/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: "Contact page inquiry",
        message: form.message.trim(),
      });
      if (!data?.success)
        throw new Error(data?.message || "Your message could not be sent.");
      setForm({ name: "", email: "", message: "" });
      setNotice(
        data.message || "Your message has been sent to the FORGE team.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to send your message right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <PageShell className="forge-contact">
      <header className="forge-contact__intro">
        <p className="forge-contact__eyebrow">Get in touch</p>
        <h1>Questions before you join?</h1>
        <p className="forge-contact__lead">
          Ask about plans, trainers, or facilities. A real person on the team
          answers, not a bot.
        </p>
      </header>
      <section className="forge-contact__layout" aria-label="Contact FORGE">
        <div className="forge-contact__form-card">
          {error && (
            <p className="forma-public__status is-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="forma-public__status is-success" role="status">
              {notice}
            </p>
          )}
          <form
            id="contact-form"
            className="forge-contact__form"
            aria-label="Send a message to FORGE"
            onSubmit={submit}
          >
            <Field
              id="contact-name"
              label="Full name"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              value={form.name}
              onChange={update}
              minLength={2}
              maxLength={100}
              required
            />
            <Field
              id="contact-email"
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update}
              maxLength={254}
              required
            />
            <Field
              as="textarea"
              id="contact-message"
              label="Message"
              name="message"
              placeholder="What would you like to know?"
              value={form.message}
              onChange={update}
              rows={5}
              maxLength={5000}
              required
            />
            <Button
              type="submit"
              variant="primary"
              className="forge-contact__submit"
              disabled={submitting}
            >
              {submitting ? (
                <HugeiconsIcon icon={Loader2} aria-hidden="true" />
              ) : null}
              {submitting ? "Sending…" : "Send message"}
            </Button>
          </form>
        </div>
        <nav
          className="forge-contact__shortcuts"
          aria-label="Other ways to get help"
        >
          {contactShortcuts.map(({ label, description, to }) => (
            <PublicFeatureCard
              as={Link}
              className="forge-contact__shortcut"
              key={label}
              to={to}
              title={label}
              titleClassName="forge-contact__shortcut-label"
              description={description}
              descriptionClassName="forge-contact__shortcut-description"
            />
          ))}
        </nav>
      </section>
    </PageShell>
  );
}
export function TrainerEmailReviewPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { establishSession } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!token) {
      setError("This verification link is missing a token.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/trainers/verify-email", { token });
      establishSession(data);
      navigate("/trainer/complete-profile", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to verify this email.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <PageShell>
      {" "}
      <section className="forma-public__container forma-public__section forma-public__auth-layout">
        {" "}
        <aside className="forma-public__auth-aside">
          {" "}
          <h2>One quick check</h2>{" "}
          <p>
            Verify your email, complete your trainer profile, then wait for the
            final review.
          </p>{" "}
        </aside>{" "}
        <Card className="forma-public__auth-card">
          {" "}
          <h1 className="forma-public__section-title">
            Confirm your email
          </h1>{" "}
          <p>
            {" "}
            Confirm the email address you used to register. We will then take
            you to the remaining trainer profile details.{" "}
          </p>{" "}
          <form className="forma-public__form" onSubmit={submit}>
            {" "}
            {error && (
              <p className="forma-public__status is-error" role="alert">
                {" "}
                <HugeiconsIcon icon={AlertCircle} aria-hidden="true" />{" "}
                {error}{" "}
              </p>
            )}{" "}
            {!token && (
              <p className="forma-public__status is-error" role="alert">
                {" "}
                This verification link is invalid because its token is
                missing.{" "}
              </p>
            )}{" "}
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !token}
            >
              {" "}
              {submitting ? (
                <HugeiconsIcon icon={Loader2} aria-hidden="true" />
              ) : (
                <HugeiconsIcon icon={ShieldCheck} aria-hidden="true" />
              )}{" "}
              {submitting
                ? "Verifying email…"
                : "Confirm email and continue"}{" "}
            </Button>{" "}
          </form>
          {!token && (
            <p className="forma-public__status">
              <Link to="/register">Return to trainer registration</Link>
            </p>
          )}{" "}
          <p>
            {" "}
            <Link to="/">Return to FORGE</Link>{" "}
          </p>{" "}
        </Card>{" "}
      </section>{" "}
    </PageShell>
  );
}
