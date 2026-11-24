import React, { useState, useEffect, useRef } from 'react';
import { HugeiconsIcon, Bot, X, Send, Maximize, Trash2 } from "./ui/icons";
import { sendChatMessage, fetchChatStatus } from '../api/chatApi';
import { Reasoning, ReasoningTrigger, ReasoningContent } from './ui/reasoning';
import {
  WorkoutWidget,
  MacroWidget,
  TimerWidget,
  FormChecklistWidget,
} from './agent/GenerativeWidgets';

/**
 * Heuristic parser: if the model returned markdown text without fenced JSON,
 * detect whether it's describing a workout, macros, timer, or form check,
 * and synthesize a Generative UI payload so the user gets an interactive widget.
 */
function synthesizeGenerativeUi(text, prompt = '') {
  if (!text) return null;
  const lower = (text + ' ' + prompt).toLowerCase();

  // 1. Timer detection
  if (lower.includes('timer') || lower.includes('rest interval')) {
    const match = text.match(/(\d{1,3})\s*(?:seconds?|s\b|sec)/i);
    const seconds = match ? parseInt(match[1], 10) : 60;
    return {
      type: 'timer',
      seconds: seconds > 0 && seconds <= 600 ? seconds : 60,
      label: 'Inter-Set Recovery Timer',
    };
  }

  // 2. Form check detection
  if (
    lower.includes('form check') ||
    lower.includes('checklist') ||
    lower.includes('biomechanic') ||
    lower.includes('cues:')
  ) {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const cues = lines
      .filter((l) => /^[*-•\d.]+\s+/.test(l.trim()))
      .map((l) => l.replace(/^[*-•\d.]+\s+/, '').trim())
      .slice(0, 5);

    if (cues.length >= 2) {
      return {
        type: 'form',
        exercise: lower.includes('squat')
          ? 'Barbell Back Squat'
          : lower.includes('bench')
            ? 'Barbell Bench Press'
            : lower.includes('deadlift')
              ? 'Conventional Deadlift'
              : 'Exercise Form & Cues',
        keyCues: cues,
        commonMistakes: [
          'Rushing the eccentric (lowering) phase',
          'Losing core brace and spinal neutrality',
        ],
        safetyTip: 'Prioritize crisp technique over loading the bar.',
      };
    }
  }

  // 3. Macro / nutrition detection
  if (
    lower.includes('macro') ||
    lower.includes('calories') ||
    lower.includes('protein')
  ) {
    const calsMatch = text.match(/(\d{3,4})\s*(?:calories|kcal)/i);
    const proteinMatch = text.match(/(\d{2,3})\s*g(?:rams)?\s*(?:of\s*)?protein/i);
    const carbsMatch = text.match(/(\d{2,3})\s*g(?:rams)?\s*(?:of\s*)?carbs/i);
    const fatMatch = text.match(/(\d{2,3})\s*g(?:rams)?\s*(?:of\s*)?fat/i);

    if (calsMatch || proteinMatch) {
      const cals = calsMatch ? parseInt(calsMatch[1], 10) : 2400;
      const protein = proteinMatch ? parseInt(proteinMatch[1], 10) : Math.round((cals * 0.3) / 4);
      const carbs = carbsMatch ? parseInt(carbsMatch[1], 10) : Math.round((cals * 0.45) / 4);
      const fat = fatMatch ? parseInt(fatMatch[1], 10) : Math.round((cals * 0.25) / 9);

      return {
        type: 'nutrition',
        goal: lower.includes('fat loss') || lower.includes('cut') ? 'Fat Loss' : 'Muscle Hypertrophy',
        calories: cals,
        proteinGrams: protein,
        carbsGrams: carbs,
        fatGrams: fat,
        waterLiters: 3.5,
      };
    }
  }

  // 4. Workout routine detection
  if (
    lower.includes('workout') ||
    lower.includes('routine') ||
    lower.includes('sets') ||
    lower.includes('reps')
  ) {
    const lines = text.split('\n');
    const detectedExercises = [];

    for (const line of lines) {
      const match = line.match(
        /(?:[*-•\d.]+\s+)?\*{0,2}([\w\s-]{4,35}?)\*{0,2}[:\-–]\s*(\d+)\s*(?:sets?|x)\s*(\d+(?:-\d+)?)\s*(?:reps?)?/i
      );
      if (match && detectedExercises.length < 5) {
        detectedExercises.push({
          name: match[1].trim(),
          sets: parseInt(match[2], 10) || 3,
          reps: match[3] || '8-12',
          restSeconds: 90,
          tip: 'Focus on full range of motion and 2-second controlled eccentric.',
        });
      }
    }

    if (detectedExercises.length >= 2) {
      return {
        type: 'workout',
        title: lower.includes('push')
          ? 'Push Day Hypertrophy'
          : lower.includes('pull')
            ? 'Pull Day Back & Biceps'
            : lower.includes('leg')
              ? 'Leg Day Power & Volume'
              : 'Targeted Fitness Routine',
        difficulty: 'Intermediate',
        durationMinutes: 45,
        targetMuscles: ['Target Muscle Groups'],
        exercises: detectedExercises,
      };
    }
  }

  return null;
}

export default function FitnessAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'agent-welcome',
      role: 'assistant',
      content:
        'I can help plan a workout, estimate calorie and macro targets, start a rest timer, or answer training questions.\n\nWhat would you like help with?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-3.5-flash',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState({
    configured: true,
    model: 'gemini-3.5-flash',
    message: 'Online',
  });
  const [activeTimerModal, setActiveTimerModal] = useState(null);

  const hasStartedConversation = messages.some((message) => message.role === 'user');
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const launcherRef = useRef(null);

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const container = messagesContainerRef.current;
      container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [isOpen, messages, loading]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [inputMessage]);

  const checkStatus = async () => {
    try {
      const res = await fetchChatStatus();
      if (res?.success) {
        setAgentStatus({
          configured: res.configured,
          model: res.model || 'gemini-3.5-flash',
          message: res.message || 'Ready',
        });
      }
    } catch (err) {
      console.debug('Chat status check failed:', err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    const historyPayload = messages
      .filter((m) => m.id !== 'agent-welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    const startTime = Date.now();
    try {
      const res = await sendChatMessage(text, historyPayload);
      const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const assistantTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (res?.success && res.reply) {
        const genUi = res.generativeUi || synthesizeGenerativeUi(res.reply, text);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: res.reply,
            reasoning: res.reasoning || null,
            reasoningDuration: elapsedSec,
            generativeUi: genUi,
            model: res.model || agentStatus.model,
            timestamp: assistantTime,
          },
        ]);
        return;
      }

      const errMsg =
        res?.message || 'Unable to generate response from FORGE AI. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          isError: true,
          content: `Error: ${errMsg}`,
          timestamp: assistantTime,
        },
      ]);
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        error.message ||
        'Could not connect to the FORGE AI service. Please verify your connection.';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          isError: true,
          content: `Error: ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'agent-welcome',
        role: 'assistant',
        content: 'New chat started. What would you like help with?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: agentStatus.model,
      },
    ]);
  };

  const launchTimer = (seconds = 60, label = 'Inter-Set Rest Timer') => {
    setActiveTimerModal({ seconds, label });
  };

  return (
    <>
      {!isOpen && (
        <div className="forma-agent-launcher-wrap">
          <button
            ref={launcherRef}
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open AI coach"
            aria-expanded={isOpen}
            aria-controls="forma-agent-panel"
            title="Open AI coach"
            className="forma-agent-launcher"
          >
            <HugeiconsIcon icon={Bot} aria-hidden="true" />
          </button>
        </div>
      )}

      {isOpen && (
        <aside
          role="dialog"
          id="forma-agent-panel"
          aria-label="FORGE AI coach"
          aria-modal="false"
          className={`forma-agent-panel${isExpanded ? ' is-expanded' : ''}`}
        >
          <header className="forma-agent-header">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="forma-agent-header__icon">
                <HugeiconsIcon icon={Bot} aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-forma-text-primary">AI coach</h3>
                <p className="truncate text-xs text-forma-text-secondary">
                  {agentStatus.configured ? 'Ready' : 'Currently unavailable'}
                </p>
              </div>
            </div>

            <div className="forma-agent-header__actions">
              {hasStartedConversation && (
                <button
                  type="button"
                  onClick={clearChat}
                  title="Start a new chat"
                  aria-label="Start a new chat"
                  className="forma-agent-icon-button"
                >
                  <HugeiconsIcon icon={Trash2} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                title={isExpanded ? 'Restore size' : 'Expand window'}
                aria-label={isExpanded ? 'Restore chat size' : 'Expand chat'}
                aria-expanded={isExpanded}
                className="forma-agent-icon-button"
              >
                <HugeiconsIcon icon={Maximize} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close AI coach"
                aria-label="Close AI coach"
                className="forma-agent-icon-button"
              >
                <HugeiconsIcon icon={X} aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* ACTIVE STANDALONE TIMER POPUP (if triggered from header/tray) */}
          {activeTimerModal && (
            <div className="mx-3 mt-2">
              <TimerWidget data={activeTimerModal} />
              <button
                type="button"
                onClick={() => setActiveTimerModal(null)}
                className="mt-1 w-full text-right text-xs text-forma-text-disabled hover:text-forma-text-secondary"
              >
                Dismiss timer
              </button>
            </div>
          )}

          {/* CHAT MESSAGES FEED */}
          <div
            ref={messagesContainerRef}
            className="forma-agent-messages flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:p-4"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex w-full min-w-0 flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`forma-agent-message rounded-xl px-3 py-2.5 text-sm leading-6 ${
                      isUser
                        ? 'bg-forma-brand-ember text-forma-text-on-ember font-medium rounded-br-xs'
                        : msg.isError
                          ? 'border border-forma-status-error/30 bg-forma-status-error/10 text-forma-status-error rounded-bl-xs'
                          : 'border border-forma-border-subtle/40 bg-forma-bg-surface-raised/50 text-forma-text-primary rounded-bl-xs'
                    }`}
                  >
                    {!isUser && (
                      <time className="mb-1 block text-xs text-forma-text-secondary">
                        {msg.timestamp}
                      </time>
                    )}

                    {!isUser && msg.reasoning && (
                      <div className="mb-2 w-full">
                        <Reasoning duration={msg.reasoningDuration || 2} defaultOpen={false}>
                          <ReasoningTrigger />
                          <ReasoningContent>{msg.reasoning}</ReasoningContent>
                        </Reasoning>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap break-words select-text">
                      {msg.content}
                    </div>

                    {msg.generativeUi && (
                      <div className="mt-2.5">
                        {msg.generativeUi.type === 'workout' && (
                          <WorkoutWidget
                            data={msg.generativeUi}
                            onStartTimer={(secs, lbl) => launchTimer(secs, lbl)}
                          />
                        )}
                        {msg.generativeUi.type === 'nutrition' && (
                          <MacroWidget data={msg.generativeUi} />
                        )}
                        {msg.generativeUi.type === 'timer' && (
                          <TimerWidget data={msg.generativeUi} />
                        )}
                        {msg.generativeUi.type === 'form' && (
                          <FormChecklistWidget data={msg.generativeUi} />
                        )}
                      </div>
                    )}

                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex w-full min-w-0 flex-col items-start">
                <div className="forma-agent-message w-full rounded-xl px-3 py-2.5 text-sm leading-6 border border-forma-border-subtle/40 bg-forma-bg-surface-raised/50 text-forma-text-primary rounded-bl-xs">
                  <Reasoning isStreaming={true}>
                    <ReasoningTrigger title="Thinking..." />
                    <ReasoningContent>
                      Analyzing biomechanics, metabolic pathways, and training parameters...
                    </ReasoningContent>
                  </Reasoning>
                </div>
              </div>
            )}

          </div>

          <footer className="forma-agent-footer">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a training or nutrition question…"
                  disabled={loading}
                  className="max-h-24 min-h-11 w-full resize-none rounded-xl border border-forma-border-subtle bg-forma-bg-surface-raised/40 p-3 text-sm leading-5 text-forma-text-primary placeholder:text-forma-text-disabled focus:border-forma-brand-ember focus:outline-none focus:ring-1 focus:ring-forma-brand-ember"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || loading}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forma-brand-ember text-forma-text-on-ember transition hover:bg-forma-brand-ember-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forma-brand-ember disabled:cursor-not-allowed disabled:opacity-40"
              >
                <HugeiconsIcon aria-hidden="true" icon={Send} className="h-4 w-4" />
              </button>
            </div>

            <p className="forma-agent-footer__hint">Enter to send · Shift+Enter for a new line</p>
          </footer>
        </aside>
      )}
    </>
  );
}
