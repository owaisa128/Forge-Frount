import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HugeiconsIcon,
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Target,
  User,
  Users,
  Utensils,
  Route,
} from '../components/ui/icons';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );

export default function TrainerDashboard() {
  const { user } = useAuth();
  const profile = user?.trainerProfile || {};
  const [clients, setClients] = useState([]);
  const [classes, setClasses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/memberships/assigned-clients'),
      api.get('/trainer-workspace/classes'),
      api.get('/trainer-workspace/messages'),
    ])
      .then(([clientResponse, classResponse, messageResponse]) => {
        if (
          !Array.isArray(clientResponse.data?.clients) ||
          !Array.isArray(classResponse.data?.classes) ||
          !Array.isArray(messageResponse.data?.messages)
        ) {
          throw new Error('Trainer dashboard data was incomplete.');
        }
        if (active) {
          setClients(clientResponse.data.clients);
          setClasses(classResponse.data.classes);
          setMessages(messageResponse.data.messages);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'Unable to load trainer dashboard.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const upcomingClasses = classes
    .filter((trainerClass) => new Date(trainerClass.startsAt) > new Date())
    .sort((first, second) => new Date(first.startsAt) - new Date(second.startsAt));

  const stats = [
    {
      label: 'ACTIVE CLIENTS',
      value: clients.length,
    },
    {
      label: 'UPCOMING CLINICS',
      value: upcomingClasses.length,
    },
    {
      label: 'COACH MESSAGES',
      value: messages.length,
    },
    {
      label: 'ACCREDITATION',
      value: 'APPROVED',
      isText: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-6 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.name} profile`}
              className="h-16 w-16 shrink-0 rounded-xl border border-forma-border-subtle object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised text-forma-brand-ember sm:h-20 sm:w-20">
              <HugeiconsIcon aria-hidden="true" icon={Dumbbell} className="h-8 w-8" />
            </div>
          )}

          <div className="space-y-1">
            <Badge
              variant="outline"
              className="border-forma-status-success/40 bg-forma-status-success/10 font-mono text-[10px] uppercase tracking-wider text-forma-status-success"
            >
              <HugeiconsIcon aria-hidden="true" icon={ShieldCheck} className="mr-1 h-3 w-3" />
              Accredited Coach
            </Badge>
            <h1 className="font-display text-2xl font-normal tracking-tight text-forma-text-primary sm:text-3xl">
              WELCOME BACK, {user?.name?.toUpperCase()}
            </h1>
            <p className="text-xs text-forma-text-secondary sm:text-sm">
              Your coaching command center, assigned athletes, and training sessions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised">
            <Link to="/trainer/clients">
              <HugeiconsIcon icon={Users} className="mr-1.5 h-3.5 w-3.5 text-forma-brand-ember" />
              Clients
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised">
            <Link to="/trainer/tracking">
              <HugeiconsIcon icon={Route} className="mr-1.5 h-3.5 w-3.5 text-forma-brand-teal" />
              GPS Live
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised">
            <Link to="/trainer/meal-plans">
              <HugeiconsIcon icon={Utensils} className="mr-1.5 h-3.5 w-3.5 text-forma-brand-ember" />
              Nutrition
            </Link>
          </Button>

          <Button asChild size="sm" className="bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover">
            <Link to="/trainer/classes">
              <HugeiconsIcon icon={CalendarDays} className="mr-1.5 h-3.5 w-3.5" />
              Manage Clinics
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <HugeiconsIcon aria-hidden="true" icon={ShieldCheck} className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Stats Row */}
      <section aria-label="Trainer statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, isText }) => (
          <Card key={label} className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                {label}
              </span>
              <Badge
                aria-hidden="true"
                variant="secondary"
                className="min-w-9 justify-center rounded-full bg-forma-bg-surface-raised font-mono text-sm leading-none text-forma-text-muted"
              >
                —
              </Badge>
            </CardHeader>
            <CardContent>
              <p className={`font-display font-normal ${isText ? 'text-2xl text-forma-status-success' : 'text-4xl text-forma-text-primary'}`}>
                {loading ? (
                  <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-7 w-7 animate-spin text-forma-brand-ember" />
                ) : (
                  value
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Main Workspace Split */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Assigned Clients Roster (7 cols) */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-normal tracking-wide text-forma-text-primary">
                ASSIGNED ATHLETES
              </h2>
              <p className="text-xs text-forma-text-secondary">
                Active Basic, Elite and Premium athletes paired with you.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-forma-brand-ember hover:bg-forma-bg-surface-raised">
              <Link to="/trainer/clients">
                All Clients ({clients.length})
                <HugeiconsIcon icon={ArrowRight} className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-forma-text-secondary">
              <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-5 w-5 animate-spin text-forma-brand-ember" />
              Loading athlete roster…
            </div>
          ) : !error && clients.length === 0 ? (
            <EmptyState
              type="clients"
              sentence="Your assigned athletes will appear here once members select you as their personal coach."
              actionLabel="View roster"
              to="/trainer/clients"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {clients.slice(0, 6).map((client) => (
                <Card
                  key={client._id}
                  className="flex flex-col justify-between border-forma-border-subtle bg-forma-bg-surface transition-colors hover:border-forma-border-subtle/80"
                >
                  <CardHeader className="space-y-1 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-forma-text-primary truncate">
                        {client.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-forma-status-success/30 bg-forma-status-success/10 font-mono text-[10px] text-forma-status-success"
                      >
                        Active
                      </Badge>
                    </div>
                    <CardDescription className="truncate font-mono text-xs text-forma-text-muted">
                      {client.email}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2 pb-3">
                    <div className="rounded-lg bg-forma-bg-surface-raised/40 p-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-forma-text-muted">
                        Target Focus
                      </p>
                      <p className="line-clamp-2 text-xs font-medium text-forma-text-primary">
                        {client.fitnessGoal || 'No goal set'}
                      </p>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-forma-border-subtle pt-3">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between font-mono text-xs text-forma-brand-teal hover:bg-forma-bg-surface-raised"
                    >
                      <Link to={`/messages?clientId=${client._id}`}>
                        <span className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={MessageCircle} className="h-3.5 w-3.5" />
                          Message Athlete
                        </span>
                        <HugeiconsIcon icon={ArrowRight} className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Next Session + Quick Shortcuts (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Next Scheduled Class Card */}
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-forma-text-primary">
                  Next Live Clinic
                </CardTitle>
                <CardDescription className="text-xs text-forma-text-secondary">
                  Your closest upcoming group session
                </CardDescription>
              </div>
              <HugeiconsIcon icon={CalendarDays} className="h-5 w-5 text-forma-brand-teal" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-xs text-forma-text-muted">Loading schedule…</p>
              ) : upcomingClasses[0] ? (
                <div className="space-y-3 rounded-lg border border-forma-border-subtle bg-forma-bg-surface-raised p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-forma-bg-surface font-mono text-[10px] text-forma-text-secondary">
                      {upcomingClasses[0].category || 'Strength'}
                    </Badge>
                    <span className="font-mono text-xs text-forma-text-muted">
                      {upcomingClasses[0].durationMinutes} min
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-forma-text-primary">
                    {upcomingClasses[0].title}
                  </h3>

                  <p className="flex items-center gap-1.5 font-mono text-xs text-forma-brand-teal">
                    <HugeiconsIcon icon={Clock} className="h-3.5 w-3.5" />
                    {formatDate(upcomingClasses[0].startsAt)}
                  </p>

                  <Button asChild size="sm" className="w-full bg-forma-brand-teal font-semibold text-forma-text-primary hover:opacity-90">
                    <Link to="/trainer/classes">
                      Open Session Room
                      <HugeiconsIcon icon={ArrowRight} className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <EmptyState
                  type="workouts"
                  sentence="No upcoming sessions scheduled. Create a live clinic to invite your athletes."
                  actionLabel="Schedule session"
                  to="/trainer/slots"
                />
              )}
            </CardContent>
          </Card>

          {/* Coach Profile & Qualifications Card */}
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forma-bg-surface-raised text-forma-brand-ember">
                <HugeiconsIcon icon={User} className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-forma-text-primary">
                  Trainer Qualifications
                </CardTitle>
                <CardDescription className="text-xs text-forma-text-secondary">
                  {profile.specialization || 'Specialization pending'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-forma-border-subtle py-2">
                <span className="font-mono uppercase text-forma-text-muted">Experience</span>
                <span className="font-semibold text-forma-text-primary">
                  {profile.experienceYears != null ? `${profile.experienceYears} Years` : 'Not set'}
                </span>
              </div>

              <div className="border-b border-forma-border-subtle py-2">
                <span className="block font-mono uppercase text-forma-text-muted">Certifications</span>
                <p className="mt-1 text-forma-text-secondary">
                  {profile.certifications || 'No certifications listed'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-xs text-forma-text-secondary hover:text-forma-text-primary">
                  <Link to="/settings">
                    <HugeiconsIcon icon={User} className="mr-1.5 h-3.5 w-3.5" />
                    Account Settings
                  </Link>
                </Button>

                <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-xs text-forma-text-secondary hover:text-forma-text-primary">
                  <Link to="/workouts">
                    <HugeiconsIcon icon={Activity} className="mr-1.5 h-3.5 w-3.5" />
                    Routine Library
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
