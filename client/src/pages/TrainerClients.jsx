import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HugeiconsIcon,
  AlertCircle,
  CalendarDays,
  Loader2,
  MessageCircle,
  Route,
  Search,
  Target,
  Users,
  Utensils,
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
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const planColors = {
  basic: 'border-forma-border-subtle bg-forma-bg-surface-raised text-forma-text-secondary',
  elite: 'border-forma-brand-teal/40 bg-forma-brand-teal/10 text-forma-brand-teal',
  premium: 'border-forma-brand-ember/40 bg-forma-brand-ember/10 text-forma-brand-ember',
};

export default function TrainerClients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/memberships/assigned-clients');
      if (!Array.isArray(data?.clients)) {
        throw new Error('Assigned clients were not returned.');
      }
      setClients(data.clients);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load assigned clients.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const term = search.toLowerCase();
    return clients.filter(
      (client) =>
        client.name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.fitnessGoal?.toLowerCase().includes(term) ||
        client.membership?.planName?.toLowerCase().includes(term)
    );
  }, [clients, search]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember"
          >
            <HugeiconsIcon aria-hidden="true" icon={Users} className="mr-1.5 h-3 w-3" />
            ATHLETE ROSTER
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            ASSIGNED CLIENTS
          </h1>
          <p className="text-sm text-forma-text-secondary">
            Athletes paired with your coaching practice across Basic, Elite, and Premium tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised">
            <Link to="/trainer/goals">
              <HugeiconsIcon icon={Target} className="mr-1.5 h-3.5 w-3.5 text-forma-brand-ember" />
              Daily Targets
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="border-forma-border-subtle text-forma-text-primary hover:bg-forma-bg-surface-raised">
            <Link to="/trainer/meal-plans">
              <HugeiconsIcon icon={Utensils} className="mr-1.5 h-3.5 w-3.5 text-forma-brand-teal" />
              Meal Plans
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Counts Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <HugeiconsIcon
            icon={Search}
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forma-text-muted"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or goal…"
            className="border-forma-border-subtle bg-forma-bg-surface pl-9 text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
          />
        </div>

        <span className="font-mono text-xs text-forma-text-muted">
          Showing {filteredClients.length} of {clients.length} athletes
        </span>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-forma-text-secondary">
          <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-5 w-5 animate-spin text-forma-brand-ember" />
          Loading assigned athletes…
        </div>
      ) : !error && clients.length === 0 ? (
        <EmptyState
          type="clients"
          sentence="Your assigned clients will appear here when they select you as their coach."
          actionLabel="Refresh clients"
          onAction={loadClients}
        />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          type="clients"
          sentence="No clients match your filter criteria. Try clearing your search term."
          actionLabel="Clear search"
          onAction={() => setSearch('')}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const planKey = (client.membership?.planSlug || client.membership?.accessLevel || 'basic').toLowerCase();
            const planBadgeClass = planColors[planKey] || planColors.basic;

            return (
              <Card
                key={client._id}
                className="flex flex-col justify-between border-forma-border-subtle bg-forma-bg-surface transition-all hover:border-forma-border-subtle/80"
              >
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold text-forma-text-primary truncate">
                      {client.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${planBadgeClass}`}
                    >
                      {client.membership?.planName || 'Active'}
                    </Badge>
                  </div>
                  <CardDescription className="truncate font-mono text-xs text-forma-text-muted">
                    {client.email}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pb-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-forma-bg-surface-raised/40 p-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-forma-text-muted">
                        Experience
                      </p>
                      <p className="font-semibold capitalize text-forma-text-primary">
                        {client.trainingExperience || 'Unspecified'}
                      </p>
                    </div>

                    <div className="rounded-lg bg-forma-bg-surface-raised/40 p-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-forma-text-muted">
                        Expires
                      </p>
                      <p className="font-mono text-xs font-semibold text-forma-text-primary truncate">
                        {client.membership?.endsAt
                          ? new Date(client.membership.endsAt).toLocaleDateString()
                          : 'Ongoing'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-forma-bg-surface-raised/40 p-2.5 text-xs">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-forma-text-muted">
                      Fitness Focus
                    </p>
                    <p className="line-clamp-2 mt-0.5 text-forma-text-secondary">
                      {client.fitnessGoal || 'No goal statement recorded.'}
                    </p>
                  </div>

                  {client.fitnessRequirements && (
                    <div className="rounded-lg border border-forma-border-subtle/60 bg-forma-bg-surface-raised/20 p-2.5 text-xs">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember">
                        Special Instructions
                      </p>
                      <p className="line-clamp-3 mt-1 text-forma-text-secondary">
                        {client.fitnessRequirements}
                      </p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-wrap gap-2 border-t border-forma-border-subtle pt-3">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 border-forma-border-subtle text-xs text-forma-text-primary hover:bg-forma-bg-surface-raised"
                  >
                    <Link to={`/messages?clientId=${client._id}`}>
                      <HugeiconsIcon icon={MessageCircle} className="mr-1.5 h-3.5 w-3.5 text-forma-brand-teal" />
                      Chat
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    className="flex-1 bg-forma-brand-ember text-xs font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                  >
                    <Link to="/trainer/goals">
                      <HugeiconsIcon icon={Target} className="mr-1.5 h-3.5 w-3.5" />
                      Goals
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
