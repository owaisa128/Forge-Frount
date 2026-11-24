import React, { useCallback, useEffect, useState } from 'react';
import {
  HugeiconsIcon,
  AlertCircle,
  CheckCircle2,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  Send,
} from '../components/ui/icons';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const categories = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'bug', label: 'Technical Issue' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'billing', label: 'Billing & Subscriptions' },
  { value: 'account', label: 'Account & Security' },
];

const statusStyles = {
  pending: 'border-forma-status-warning/30 bg-forma-status-warning/10 text-forma-status-warning',
  'in-progress': 'border-forma-brand-teal/30 bg-forma-brand-teal/10 text-forma-brand-teal',
  resolved: 'border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success',
};

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/feedback/my-feedback');
      if (!data?.success || !Array.isArray(data.feedback)) {
        throw new Error('Support history response was incomplete.');
      }
      setTickets(data.feedback);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load your support history.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const submitTicket = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!subject.trim() || !message.trim()) {
      setError('Please provide a subject and describe how we can assist you.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/feedback', {
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
      if (!data?.success || !data.feedback) throw new Error('Support request was not saved.');
      setTickets((current) => [data.feedback, ...current]);
      setSubject('');
      setCategory('general');
      setMessage('');
      setNotice('Your support request has been submitted. Our team will review it shortly.');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to submit your support request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="border-forma-brand-teal/30 bg-forma-brand-teal/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-teal"
          >
            <HugeiconsIcon aria-hidden="true" icon={LifeBuoy} className="mr-1.5 h-3 w-3" />
            MEMBER SUPPORT
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            HOW CAN WE HELP?
          </h1>
          <p className="text-sm text-forma-text-secondary">
            Send a direct inquiry to the FORGE engineering and coaching team and monitor its resolution.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert className="border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Ticket Submission Form */}
        <div className="lg:col-span-5">
          <Card className="border-forma-border-subtle bg-forma-bg-surface sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-forma-text-primary">
                Open a Support Ticket
              </CardTitle>
              <CardDescription className="text-xs text-forma-text-secondary">
                We typically respond within 24 hours on business days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitTicket} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="support-subject"
                    className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary"
                  >
                    Subject
                  </label>
                  <Input
                    id="support-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={150}
                    placeholder="Brief summary of your inquiry"
                    required
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-teal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="support-category"
                    className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary"
                  >
                    Category
                  </label>
                  <select
                    id="support-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-forma-border-subtle bg-forma-bg-surface-raised px-3 py-2 text-sm text-forma-text-primary outline-none focus:border-forma-brand-teal"
                  >
                    {categories.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="support-message"
                      className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary"
                    >
                      Description
                    </label>
                    <span className="font-mono text-[10px] text-forma-text-muted">
                      {message.length}/5000
                    </span>
                  </div>
                  <Textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={5000}
                    rows={6}
                    required
                    placeholder="Detail the issue, steps to reproduce, or your question..."
                    className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-teal"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                >
                  {submitting ? (
                    <>
                      <HugeiconsIcon aria-hidden="true" icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon aria-hidden="true" icon={Send} className="mr-2 h-4 w-4" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Requests History */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl font-normal tracking-wide text-forma-text-primary">
              <HugeiconsIcon aria-hidden="true" icon={MessageSquareText} className="h-5 w-5 text-forma-brand-teal" />
              YOUR TICKETS
            </h2>
            <span className="font-mono text-xs text-forma-text-muted">
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-forma-text-secondary">
              <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-5 w-5 animate-spin text-forma-brand-teal" />
              Loading your tickets…
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              type="messages"
              sentence="You haven't opened any support tickets yet. If you have questions or experience any issues, submit a ticket."
              actionLabel="Create a ticket"
              onAction={() => document.getElementById('support-subject')?.focus()}
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Card
                  key={ticket._id}
                  className="border-forma-border-subtle bg-forma-bg-surface transition-colors hover:border-forma-border-subtle/80"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-forma-text-primary">
                          {ticket.subject}
                        </h3>
                        <p className="font-mono text-xs text-forma-text-muted">
                          {ticket.category.toUpperCase()} · {new Date(ticket.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs uppercase tracking-wider ${
                          statusStyles[ticket.status] || 'border-forma-border-subtle text-forma-text-secondary'
                        }`}
                      >
                        {ticket.status}
                      </Badge>
                    </div>

                    <div className="mt-4 rounded-lg bg-forma-bg-surface-raised/40 p-3.5">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-forma-text-secondary">
                        {ticket.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
