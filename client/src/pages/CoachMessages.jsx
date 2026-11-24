import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HugeiconsIcon,
  AlertCircle,
  ArrowLeft,
  CheckCheck,
  Loader2,
  MessageCircle,
  Search,
  Send,
  UserRound,
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
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';

const formatTime = (value) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  );

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'C';

export default function CoachMessages() {
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [clientId, setClientId] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const bottomRef = useRef(null);

  const requestedClientId = searchParams.get('clientId');

  const loadMessages = useCallback(async () => {
    const { data } = await api.get('/trainer-workspace/messages');
    if (!Array.isArray(data.messages)) throw new Error('Messages were not returned.');
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/trainer-workspace/messages'),
      isTrainer
        ? api.get('/memberships/assigned-clients')
        : Promise.resolve({ data: { clients: [] } }),
    ])
      .then(([messageResponse, clientResponse]) => {
        if (!Array.isArray(messageResponse.data?.messages)) {
          throw new Error('Messages were not returned.');
        }
        const assignedClients = (
          Array.isArray(clientResponse.data?.clients) ? clientResponse.data.clients : []
        ).filter(
          (client) =>
            ['elite', 'premium'].includes(client.membership?.accessLevel) ||
            ['elite', 'premium'].includes(client.membership?.planSlug)
        );

        if (active) {
          setMessages(messageResponse.data.messages);
          setClients(assignedClients);
          if (isTrainer && assignedClients.length) {
            setClientId(
              assignedClients.some((client) => client._id === requestedClientId)
                ? requestedClientId
                : assignedClients[0]._id
            );
          }
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'Unable to load messages.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isTrainer, requestedClientId]);

  const selectedClient = clients.find((client) => client._id === clientId);

  const visibleClients = useMemo(
    () =>
      clients.filter((client) =>
        `${client.name} ${client.email}`.toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  const thread = useMemo(
    () =>
      messages
        .filter((message) => (isTrainer ? message.client?._id === clientId : true))
        .slice()
        .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt)),
    [isTrainer, messages, clientId]
  );

  const assignedTrainer = user?.membership?.assignedTrainer;
  const trainer =
    messages[0]?.trainer ||
    (assignedTrainer && typeof assignedTrainer === 'object' ? assignedTrainer : null);
  const hasTrainer = Boolean(trainer || assignedTrainer);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  const selectClient = (id) => {
    setClientId(id);
    setSuccess('');
    setError('');
    setMobileChatOpen(true);
    setSearchParams({ clientId: id });
  };

  const send = async (event) => {
    event.preventDefault();
    if ((isTrainer && !clientId) || (!isTrainer && !hasTrainer) || !body.trim()) return;

    setError('');
    setSuccess('');
    setSending(true);
    try {
      const { data } = await api.post('/trainer-workspace/messages', {
        ...(isTrainer ? { clientId } : {}),
        body,
      });
      setSuccess(data.message || 'Message sent.');
      setBody('');
      await loadMessages();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to send message.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="border-forma-brand-teal/30 bg-forma-brand-teal/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-teal"
          >
            <HugeiconsIcon aria-hidden="true" icon={MessageCircle} className="mr-1.5 h-3 w-3" />
            DIRECT CHANNEL
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            COACH &amp; ATHLETE MESSAGES
          </h1>
          <p className="text-sm text-forma-text-secondary">
            {isTrainer
              ? 'Private 1-on-1 consultations and programming check-ins with your assigned clients.'
              : 'Direct messaging and workout feedback with your personal coach.'}
          </p>
        </div>
      </div>

      {(error || success) && (
        <Alert
          variant={error ? 'destructive' : 'default'}
          className={
            error
              ? 'border-forma-status-error/30 bg-forma-status-error/10'
              : 'border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success'
          }
        >
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      {/* Two-Pane Messaging Interface */}
      <div className="overflow-hidden rounded-xl border border-forma-border-subtle bg-forma-bg-surface">
        <div className="grid h-[640px] md:grid-cols-12">
          {/* Left Sidebar: Conversations List (4 cols) */}
          <aside
            className={`border-r border-forma-border-subtle bg-forma-bg-surface flex flex-col md:col-span-4 ${
              mobileChatOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="border-b border-forma-border-subtle p-4">
              <h2 className="font-display text-lg font-normal tracking-wide text-forma-text-primary">
                {isTrainer ? 'ASSIGNED ATHLETES' : 'YOUR COACH'}
              </h2>

              {isTrainer && (
                <div className="relative mt-3">
                  <HugeiconsIcon
                    icon={Search}
                    className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-forma-text-muted"
                  />
                  <Input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search athletes…"
                    className="h-8 border-forma-border-subtle bg-forma-bg-surface-raised pl-8 text-xs text-forma-text-primary placeholder:text-forma-text-muted"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <p className="p-4 text-center text-xs text-forma-text-muted">
                  Loading conversations…
                </p>
              ) : isTrainer ? (
                visibleClients.length ? (
                  visibleClients.map((client) => {
                    const latest = messages.find((m) => m.client?._id === client._id);
                    const isActive = client._id === clientId;

                    return (
                      <button
                        key={client._id}
                        type="button"
                        onClick={() => selectClient(client._id)}
                        className={`w-full rounded-lg p-3 text-left transition-colors flex items-center gap-3 ${
                          isActive
                            ? 'bg-forma-brand-ember/15 border border-forma-brand-ember/30'
                            : 'hover:bg-forma-bg-surface-raised/60 border border-transparent'
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forma-bg-surface-raised font-mono text-xs font-bold text-forma-brand-ember">
                          {initials(client.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs font-bold text-forma-text-primary">
                              {client.name}
                            </span>
                            {latest && (
                              <time className="font-mono text-[10px] text-forma-text-muted">
                                {formatTime(latest.createdAt)}
                              </time>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-forma-text-secondary mt-0.5">
                            {latest?.body || client.fitnessGoal || 'Start a conversation'}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : clients.length ? (
                  <EmptyState
                    type="messages"
                    sentence="No athletes match your search."
                    actionLabel="Clear search"
                    onAction={() => setSearch('')}
                  />
                ) : (
                  <EmptyState
                    type="clients"
                    sentence="No assigned clients to message yet."
                    actionLabel="View roster"
                    to="/trainer/clients"
                  />
                )
              ) : trainer || assignedTrainer || thread.length ? (
                <button
                  type="button"
                  onClick={() => setMobileChatOpen(true)}
                  className="w-full rounded-lg bg-forma-brand-ember/15 border border-forma-brand-ember/30 p-3 text-left flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forma-bg-surface-raised font-mono text-xs font-bold text-forma-brand-teal">
                    {initials(trainer?.name || 'Coach')}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-forma-text-primary">
                      {trainer?.name || 'Your Coach'}
                    </span>
                    <span className="font-mono text-[10px] text-forma-brand-teal">
                      Assigned Master Coach
                    </span>
                  </div>
                </button>
              ) : (
                <EmptyState
                  type="clients"
                  sentence="You haven't paired with a coach yet."
                  actionLabel="Browse trainers"
                  to="/my-trainer"
                />
              )}
            </div>
          </aside>

          {/* Right Area: Active Message Thread & Composer (8 cols) */}
          <section
            className={`flex flex-col bg-forma-bg-base/30 md:col-span-8 ${
              !mobileChatOpen ? 'hidden md:flex' : 'flex'
            }`}
            aria-label="Message thread"
          >
            {/* Thread Header */}
            <div className="flex items-center gap-3 border-b border-forma-border-subtle bg-forma-bg-surface px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileChatOpen(false)}
                className="h-8 w-8 text-forma-text-secondary md:hidden"
                aria-label="Back to conversations"
              >
                <HugeiconsIcon icon={ArrowLeft} className="h-4 w-4" />
              </Button>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forma-bg-surface-raised font-mono text-xs font-bold text-forma-brand-ember">
                {initials(isTrainer ? selectedClient?.name || 'Athlete' : trainer?.name || 'Coach')}
              </div>

              <div>
                <h3 className="text-sm font-bold text-forma-text-primary">
                  {isTrainer
                    ? selectedClient?.name || 'Select an athlete'
                    : trainer?.name || 'Your Coach'}
                </h3>
                <p className="font-mono text-[10px] text-forma-text-muted">
                  {isTrainer ? 'Assigned Athlete' : 'Personal Coach'}
                </p>
              </div>
            </div>

            {/* Thread Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
              {loading ? (
                <p className="text-center text-xs text-forma-text-muted py-8">
                  Loading message history…
                </p>
              ) : isTrainer && !selectedClient ? (
                <EmptyState
                  type="clients"
                  sentence="Select an athlete from the roster to review or send messages."
                  actionLabel="View clients"
                  to="/trainer/clients"
                  className="m-auto"
                />
              ) : !isTrainer && !hasTrainer ? (
                <EmptyState
                  type="clients"
                  sentence="You have not selected an assigned coach yet."
                  actionLabel="Browse coaches"
                  to="/my-trainer"
                  className="m-auto"
                />
              ) : !thread.length ? (
                <EmptyState
                  type="messages"
                  sentence={
                    isTrainer
                      ? 'No messages exchanged yet. Send a greeting to initiate your consultation.'
                      : 'Nothing here yet. Write a message to your coach to get started.'
                  }
                  actionLabel="Focus message field"
                  onAction={() => document.getElementById('coach-message-input')?.focus()}
                  className="m-auto"
                />
              ) : (
                thread.map((item) => {
                  const sent = isTrainer
                    ? item.senderRole !== 'client'
                    : item.senderRole === 'client';

                  return (
                    <div
                      key={item._id}
                      className={`flex flex-col ${sent ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                          sent
                            ? 'bg-forma-brand-ember text-forma-text-on-ember font-medium'
                            : 'bg-forma-bg-surface-raised border border-forma-border-subtle text-forma-text-primary'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{item.body}</p>
                      </div>
                      <time className="mt-1 font-mono text-[10px] text-forma-text-muted px-1">
                        {formatTime(item.createdAt)}
                      </time>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer Bar */}
            <form onSubmit={send} className="border-t border-forma-border-subtle bg-forma-bg-surface p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  id="coach-message-input"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(e);
                    }
                  }}
                  maxLength={2000}
                  rows={2}
                  placeholder={
                    isTrainer
                      ? selectedClient
                        ? 'Type a message (Enter to send, Shift+Enter for newline)…'
                        : 'Select an athlete first'
                      : 'Message your coach…'
                  }
                  disabled={sending || (isTrainer && !selectedClient) || (!isTrainer && !hasTrainer)}
                  className="resize-none border-forma-border-subtle bg-forma-bg-surface-raised text-xs text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                />

                <Button
                  type="submit"
                  size="icon"
                  disabled={
                    sending ||
                    (isTrainer && !selectedClient) ||
                    (!isTrainer && !hasTrainer) ||
                    !body.trim()
                  }
                  className="h-10 w-10 shrink-0 bg-forma-brand-ember text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                  aria-label="Send message"
                >
                  {sending ? (
                    <HugeiconsIcon icon={Loader2} className="h-4 w-4 animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={Send} className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
