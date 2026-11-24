import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HugeiconsIcon,
  Bot,
  X,
  Send,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Dumbbell,
  HeartPulse,
  MessageSquare,
  Attachment,
  ThumbsUp,
  ThumbsDown,
  Share,
  SquareStop,
  Copy,
  Check,
  Settings2,
  MoreHorizontal,
  Plus,
  Trash2,
  ChevronDown,
  Flame,
  Zap,
} from "./ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "./ui/reasoning";
import { sendChatMessage, fetchChatStatus } from "../api/chatApi";
import {
  WorkoutWidget,
  MacroWidget,
  TimerWidget,
  FormChecklistWidget,
} from "./agent/GenerativeWidgets";
import { SanitizedMarkdown } from "../utils/chatSanitizer";

const PERSONAS = [
  {
    id: "coach",
    name: "FORGE Coach",
    subtitle: "Evidence-based strength & conditioning",
    badge: "All-Round Coach",
  },
  {
    id: "hypertrophy",
    name: "Hypertrophy Specialist",
    subtitle: "Mechanical tension & volume landmarks",
    badge: "Hypertrophy",
  },
  {
    id: "fatloss",
    name: "Fat Loss & Nutrition",
    subtitle: "Caloric deficit & metabolic conditioning",
    badge: "Nutrition",
  },
  {
    id: "mobility",
    name: "Mobility & Recovery",
    subtitle: "Joint mechanics & injury prevention",
    badge: "Recovery",
  },
];

const DEFAULT_SUGGESTIONS = [
  {
    id: "sug-1",
    label: "Push Day Hypertrophy Routine",
    prompt:
      "Design an evidence-based Push workout routine targeting chest, shoulders, and triceps with sets, reps, and RIR recommendations.",
    icon: Dumbbell,
  },
  {
    id: "sug-2",
    label: "2,400 kcal Fat Loss Macros",
    prompt:
      "Calculate optimal macronutrients for a 2,400 kcal fat loss deficit with high satiety meal suggestions and hydration goals.",
    icon: Flame,
  },
  {
    id: "sug-3",
    label: "90s Rest Interval Timer",
    prompt:
      "Provide a 90 second rest interval timer with breathing tips for heavy compound barbell exercises.",
    icon: Zap,
  },
  {
    id: "sug-4",
    label: "Barbell Squat Form Cues",
    prompt:
      "Break down the biomechanical form cues, setup checklist, and common mistakes to avoid for barbell back squats.",
    icon: HeartPulse,
  },
];

function createWelcomeMessage(personaName = "FORGE Coach") {
  return {
    id: "welcome-1",
    role: "assistant",
    content: `Hi, I'm your **${personaName}**. Tell me your current training goals, recent lifts, or nutrition questions, and we'll program your next step scientifically.`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export default function ChatBox({ embedded = false }) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [selectedPersona, setSelectedPersona] = useState("coach");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);

  // Suggestions state (dismiss individual chips with X)
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);

  // Coach tuning settings
  const [coachSettings, setCoachSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("forge_coach_settings");
      return saved
        ? JSON.parse(saved)
        : { level: "Intermediate", goal: "Hypertrophy", detail: "Comprehensive" };
    } catch {
      return { level: "Intermediate", goal: "Hypertrophy", detail: "Comprehensive" };
    }
  });

  // Multi-thread conversation management with localStorage persistence
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem("forge_ai_threads");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load threads from localStorage", e);
    }
    return [
      {
        id: "conversation-1",
        title: "Initial Consultation",
        persona: "coach",
        messages: [createWelcomeMessage("FORGE Coach")],
        updatedAt: Date.now(),
      },
    ];
  });

  const [activeConversationId, setActiveConversationId] = useState(() => {
    return conversations[0]?.id || "conversation-1";
  });

  // Sync conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("forge_ai_threads", JSON.stringify(conversations));
    } catch (e) {
      console.warn("Could not save threads to localStorage", e);
    }
  }, [conversations]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];
  const messages = activeConversation?.messages || [];

  const setMessages = useCallback(
    (update) => {
      setConversations((currentConversations) =>
        currentConversations.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          const nextMessages =
            typeof update === "function" ? update(conv.messages) : update;
          const firstUserMessage = nextMessages.find((m) => m.role === "user");
          const derivedTitle =
            firstUserMessage && conv.title === "Initial Consultation"
              ? firstUserMessage.content.slice(0, 36).trim() +
              (firstUserMessage.content.length > 36 ? "..." : "")
              : conv.title;

          return {
            ...conv,
            messages: nextMessages,
            title: derivedTitle,
            updatedAt: Date.now(),
          };
        })
      );
    },
    [activeConversationId]
  );

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    configured: false,
    checking: true,
    message: "",
  });

  const abortControllerRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const openButtonRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
      checkBackendStatus();
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  }, [inputMessage]);

  const checkBackendStatus = async () => {
    setStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetchChatStatus();
      if (!res?.success) {
        throw new Error(res?.message || "AI Coach status check failed.");
      }
      setStatus({
        configured: res.configured,
        checking: false,
        message: res.message || "",
      });
    } catch (error) {
      setStatus({
        configured: false,
        checking: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Unable to reach the AI service.",
      });
    }
  };

  // Start new conversation thread
  const startNewConversation = () => {
    if (loading) return;
    const currentPersona =
      PERSONAS.find((p) => p.id === selectedPersona)?.name || "FORGE Coach";
    const newThread = {
      id: crypto.randomUUID ? crypto.randomUUID() : `thread-${Date.now()}`,
      title: "New consultation",
      persona: selectedPersona,
      messages: [createWelcomeMessage(currentPersona)],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newThread, ...prev]);
    setActiveConversationId(newThread.id);
    setInputMessage("");
    inputRef.current?.focus();
  };

  // Delete conversation thread
  const deleteConversation = (id, e) => {
    e?.stopPropagation();
    if (conversations.length <= 1) {
      setMessages([createWelcomeMessage(activePersonaObj.name)]);
      return;
    }
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (activeConversationId === id) {
      setActiveConversationId(updated[0].id);
    }
  };

  // Stop Generating with AbortController
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `stopped-${Date.now()}`,
        role: "assistant",
        content: "_[Generation stopped]_",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  // Send message handler
  const handleSendMessage = async (textToSend) => {
    const rawText = (textToSend || inputMessage).trim();
    if (!rawText || loading) return;

    let fullMessage = rawText;
    if (attachedFile) {
      fullMessage += `\n\n[Context attached from ${attachedFile.name}: ${attachedFile.content.slice(0, 300)}]`;
      setAttachedFile(null);
    }

    const userTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: rawText,
      timestamp: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    const historyPayload = messages
      .filter((m) => m.id !== "welcome-1")
      .map((m) => ({ role: m.role, content: m.content }));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const startTime = Date.now();

    try {
      const res = await sendChatMessage(fullMessage, historyPayload, {
        persona: selectedPersona,
        signal: abortController.signal,
      });

      const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const assistantTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (res?.success && res.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: res.reply,
            reasoning: res.reasoning || null,
            reasoningDuration: elapsedSec,
            generativeUi: res.generativeUi || null,
            timestamp: assistantTime,
          },
        ]);
        return;
      }

      let errText = res?.message || "AI Coach returned an unsuccessful response.";
      if (res?.errorType === "NOT_CONFIGURED") {
        errText =
          "FitTrack AI Assistant is unconfigured. Please add GEMINI_API_KEY to server/.env.";
        setStatus((s) => ({ ...s, configured: false, checking: false }));
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          isError: true,
          content: errText,
          timestamp: assistantTime,
        },
      ]);
    } catch (error) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
        return;
      }
      const errText =
        error.response?.data?.message ||
        (error.code === "ECONNABORTED"
          ? "Request timed out. Please try again."
          : "Failed to connect to FORGE AI Coach.");

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          isError: true,
          content: errText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (msgId, text) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleRegenerate = (msgIndex) => {
    if (loading) return;
    const previousUserMsg = [...messages.slice(0, msgIndex)]
      .reverse()
      .find((m) => m.role === "user");
    if (previousUserMsg) {
      handleSendMessage(previousUserMsg.content);
    }
  };

  const handleToggleFeedback = (msgId, type) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        return {
          ...m,
          feedback: m.feedback === type ? null : type,
        };
      })
    );
  };

  const handleShareMessage = async (content) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "FORGE AI Coach Advice",
          text: content,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content);
      alert("Message copied to clipboard!");
    }
  };

  const handleDismissSuggestion = (id, e) => {
    e.stopPropagation();
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        name: file.name,
        size: file.size,
        content: event.target.result || "",
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportChatAsMarkdown = () => {
    const text = messages
      .map(
        (m) =>
          `### ${m.role === "user" ? "Athlete" : "FORGE AI Coach"} (${m.timestamp})\n\n${m.content}\n`
      )
      .join("\n---\n\n");
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forge-chat-${activeConversation.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePersonaObj =
    PERSONAS.find((p) => p.id === selectedPersona) || PERSONAS[0];

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={
          embedded
            ? "relative flex h-full w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent text-foreground"
            : "fixed bottom-4 right-4 z-50 font-sans sm:bottom-6 sm:right-6"
        }
      >
        {/* Floating launcher if not embedded */}
        {!embedded && !isOpen && (
          <button
            ref={openButtonRef}
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Open FORGE AI Coach"
          >
            <HugeiconsIcon icon={Bot} className="size-5.5" />
            <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
            </span>
          </button>
        )}

        {/* Main Chat Workspace */}
        {(isOpen || embedded) && (
          <div className="flex h-full w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
            {/* =====================================================================
                HEADER (COMPACT h-10, CLEAN SELECTOR WITH TOOLTIP, NO BORDERS/OUTLINES)
               ===================================================================== */}
            <header className="flex h-10 shrink-0 items-center justify-between border-b border-border/20 px-3 backdrop-blur-xs">
              <div className="flex min-w-0 items-center gap-1.5">
                {/* Persona Selector (Compact with hover tooltip for explanation) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-secondary/40 outline-none border-0"
                    >
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span>{activePersonaObj.name}</span>
                      <HugeiconsIcon
                        icon={ChevronDown}
                        className="size-2.5 text-muted-foreground/60"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={4}
                    className="w-48 rounded-xl border border-border/40 bg-popover/95 p-1.5 backdrop-blur-md shadow-xl space-y-1"
                  >
                    <DropdownMenuLabel className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                      Coaching Persona
                    </DropdownMenuLabel>
                    {PERSONAS.map((persona) => {
                      const isCur = persona.id === selectedPersona;
                      return (
                        <Tooltip key={persona.id}>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onSelect={() => setSelectedPersona(persona.id)}
                              className={`flex cursor-pointer items-center justify-between rounded-lg px-2 py-0 text-[11px] transition ${isCur
                                ? "bg-primary/15 text-primary font-medium"
                                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                }`}
                            >
                              <span>{persona.name}</span>
                              {isCur && <span className="size-1 rounded-full bg-primary" />}
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            sideOffset={8}
                            className="text-[10px] max-w-50 leading-snug"
                          >
                            {persona.subtitle}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Active Consultation Title */}
                <span className="hidden sm:inline-block max-w-[170px] truncate text-[10px] text-muted-foreground font-normal pl-1">
                  {activeConversation.title}
                </span>
              </div>

              {/* Header Right Actions (Pure ghost icons - no square borders/backgrounds) */}
              <div className="flex items-center gap-1.5">

                {/* Coach Tuning / Parameters button */}
                <span
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  title="Coach parameters"
                  className="flex size-5 items-center justify-center text-muted-foreground/60 hover:text-foreground outline-none cursor-pointer transition-colors"
                >
                  <HugeiconsIcon icon={Settings2} className="size-3.5" />
                </span>

                {/* 3-Dot Options Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title="Menu options"
                      className="flex size-5 items-center justify-center text-muted-foreground/60 hover:text-foreground bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors"
                    >
                      <HugeiconsIcon icon={MoreHorizontal} className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={4}
                    className="w-56 rounded-xl border border-border/40 bg-popover/95 p-1 backdrop-blur-md shadow-2xl"
                  >
                    <DropdownMenuItem
                      onSelect={startNewConversation}
                      className="flex cursor-pointer items-center gap-2 rounded-lg text-[11px] font-semibold text-primary hover:bg-primary/10"
                    >
                      <HugeiconsIcon icon={Plus} className="size-3" />
                      <span>New Consultation</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="-mx-1 my-1 bg-border/20" />

                    <DropdownMenuLabel className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                      Recent Consultations
                    </DropdownMenuLabel>
                    <div className="max-h-40 overflow-y-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-0.5">
                      {conversations.map((conv) => {
                        const isActive = conv.id === activeConversationId;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => setActiveConversationId(conv.id)}
                            className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-[11px] transition ${isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                              }`}
                          >
                            <div className="flex min-w-0 items-center gap-1.5 truncate pr-1">
                              <HugeiconsIcon
                                icon={MessageSquare}
                                className="size-2.5 shrink-0 opacity-60"
                              />
                              <span className="truncate">{conv.title}</span>
                            </div>
                            <span
                              type="button"
                              onClick={(e) => deleteConversation(conv.id, e)}
                              title="Delete thread"
                              className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:text-destructive cursor-pointer transition-opacity py-1"
                            >
                              <HugeiconsIcon icon={Trash2} className="size-3.5" />
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <DropdownMenuSeparator className="-mx-1 my-1 bg-border/20" />

                    <DropdownMenuItem
                      onSelect={exportChatAsMarkdown}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    >
                      <HugeiconsIcon icon={Share} className="size-3" />
                      <span>Export Markdown</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onSelect={() => setSuggestions(DEFAULT_SUGGESTIONS)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    >
                      <HugeiconsIcon icon={RefreshCw} className="size-3" />
                      <span>Reset Suggestions</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="-mx-1 my-1 bg-border/20" />

                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() =>
                        setMessages([createWelcomeMessage(activePersonaObj.name)])
                      }
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                    >
                      <HugeiconsIcon icon={Trash2} className="size-3" />
                      <span>Clear Messages</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Floating Close Button if dialog mode */}
                {!embedded && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex size-5 items-center justify-center text-muted-foreground/60 hover:text-foreground bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors"
                  >
                    <HugeiconsIcon icon={X} className="size-3.5" />
                  </button>
                )}
              </div>
            </header>

            {/* =====================================================================
                STREAM (MESSAGES CONTAINER WITH HIDDEN SCROLLBAR & EXPANDED SPACE)
               ===================================================================== */}
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 min-w-0 overflow-y-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-3 sm:px-5 py-2.5 space-y-3"
              role="log"
              aria-label="Conversation messages"
            >
              {/* Unconfigured Alert Banner */}
              {!status.configured && !status.checking && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-foreground">
                  <HugeiconsIcon
                    icon={AlertCircle}
                    className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                  />
                  <div className="flex-1">
                    <strong className="text-[11px] font-semibold text-foreground">
                      Configuration Notice
                    </strong>
                    <p className="text-[10px] text-muted-foreground">
                      {status.message ||
                        "Add GEMINI_API_KEY in server/.env for live response generation."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={checkBackendStatus}
                    className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/30 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Message Turns */}
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";

                // USER MESSAGE BUBBLE
                if (isUser) {
                  return (
                    <div
                      key={msg.id}
                      className="flex flex-col items-end gap-0.5 animate-fade-in"
                    >
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-secondary/80 border border-border/40 px-3 py-1.5 text-xs sm:text-[13px] text-foreground">
                        <p className="whitespace-pre-wrap break-words leading-relaxed font-normal">
                          {msg.content}
                        </p>
                      </div>
                      <span className="px-1 text-[9px] text-muted-foreground/50">
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                }

                // ASSISTANT CARD (WITHOUT ANY BACKGROUND OR BORDER, SPAN ACTIONS ON LEFT THEN TIME)
                return (
                  <div
                    key={msg.id}
                    className="flex w-full max-w-full min-w-0 flex-col gap-1 bg-transparent border-0 p-0 shadow-none animate-fade-in overflow-hidden"
                  >
                    {/* Reasoning Disclosure (if present) */}
                    {msg.reasoning && (
                      <div className="mb-1">
                        <Reasoning
                          duration={msg.reasoningDuration || 2}
                          defaultOpen={false}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{msg.reasoning}</ReasoningContent>
                        </Reasoning>
                      </div>
                    )}

                    {/* Sanitized Markdown Body */}
                    <div className="text-xs sm:text-[13px] leading-relaxed text-foreground/90 overflow-hidden">
                      <SanitizedMarkdown content={msg.content} />
                    </div>

                    {/* Left-Aligned Actions (using span, no button/bg/border) First Options then Time */}
                    <div className="mt-1 flex items-center gap-2 pt-0.5 text-[10px] text-muted-foreground/50">
                      {/* Copy */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        onKeyDown={(e) => e.key === "Enter" && handleCopyMessage(msg.id, msg.content)}
                        className="flex size-4 items-center justify-center text-muted-foreground/50 hover:text-foreground bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors"
                        title={copiedMessageId === msg.id ? "Copied!" : "Copy response"}
                      >
                        <HugeiconsIcon
                          icon={copiedMessageId === msg.id ? Check : Copy}
                          className={`size-3 ${copiedMessageId === msg.id ? "text-emerald-500" : ""
                            }`}
                        />
                      </span>

                      {/* Regenerate */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => !loading && handleRegenerate(index)}
                        onKeyDown={(e) => !loading && e.key === "Enter" && handleRegenerate(index)}
                        className={`flex size-4 items-center justify-center text-muted-foreground/50 hover:text-foreground bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors ${loading ? "opacity-30 pointer-events-none" : ""
                          }`}
                        title="Regenerate"
                      >
                        <HugeiconsIcon icon={RefreshCw} className="size-3" />
                      </span>

                      {/* Thumbs Up */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleFeedback(msg.id, "up")}
                        onKeyDown={(e) => e.key === "Enter" && handleToggleFeedback(msg.id, "up")}
                        className={`flex size-4 items-center justify-center bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors ${msg.feedback === "up"
                          ? "text-emerald-500"
                          : "text-muted-foreground/50 hover:text-foreground"
                          }`}
                        title="Helpful"
                      >
                        <HugeiconsIcon icon={ThumbsUp} className="size-3" />
                      </span>

                      {/* Thumbs Down */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleFeedback(msg.id, "down")}
                        onKeyDown={(e) => e.key === "Enter" && handleToggleFeedback(msg.id, "down")}
                        className={`flex size-4 items-center justify-center bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors ${msg.feedback === "down"
                          ? "text-rose-500"
                          : "text-muted-foreground/50 hover:text-foreground"
                          }`}
                        title="Not helpful"
                      >
                        <HugeiconsIcon icon={ThumbsDown} className="size-3" />
                      </span>

                      {/* Share */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => handleShareMessage(msg.content)}
                        onKeyDown={(e) => e.key === "Enter" && handleShareMessage(msg.content)}
                        className="flex size-4 items-center justify-center text-muted-foreground/50 hover:text-foreground bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors"
                        title="Share"
                      >
                        <HugeiconsIcon icon={Share} className="size-3" />
                      </span>

                      {/* Separator dot */}
                      <span className="text-[9px] text-muted-foreground/30">•</span>

                      {/* Stream Time placed right after all options */}
                      <span className="text-[9px] text-muted-foreground/40">{msg.timestamp}</span>
                    </div>
                  </div>
                );
              })}

              {/* Streaming Indicator */}
              {loading && (
                <div className="flex w-full flex-col gap-1 bg-transparent border-0 p-0 shadow-none">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                    <HugeiconsIcon icon={Bot} className="size-3 text-primary animate-pulse" />
                    <span>FORGE Coach</span>
                    <span className="text-[10px] text-primary font-normal">Analyzing...</span>
                  </div>
                  <Reasoning isStreaming>
                    <ReasoningTrigger title="Formulating workout programming & cues..." />
                    <ReasoningContent>
                      Checking biomechanical cues, volume landmarks, and progressive overload targets...
                    </ReasoningContent>
                  </Reasoning>
                </div>
              )}
            </div>

            {/* =====================================================================
                FOOTER: SUGGESTIONS (HIDDEN SCROLLBAR) & COMPOSER (BARE ICONS, NO OUTLINES)
               ===================================================================== */}
            <div className="shrink-0 w-full px-2.5 pb-2.5 pt-0.5">
              {/* SUGGESTIONS: NO SCROLLBAR, REDUCED FONT SIZE, NO BG */}
              {suggestions.length > 0 && !loading && (
                <div className="mb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 w-full">
                  {suggestions.map((sug) => (
                    <button
                      type="button"
                      key={sug.id}
                      onClick={() => handleSendMessage(sug.prompt)}
                      className="flex cursor-pointer items-center gap-1 px-3"
                    >
                      <span className="whitespace-nowrap">{sug.label}</span>
                      <span
                        onClick={(e) => handleDismissSuggestion(sug.id, e)}
                        title="Dismiss"
                        className="text-muted-foreground/40 hover:text-foreground cursor-pointer"
                      >
                        <HugeiconsIcon icon={X} className="size-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Attached File Preview Badge */}
              {attachedFile && (
                <div className="mb-1 inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 py-1 text-[10px] text-foreground">
                  <HugeiconsIcon icon={Attachment} className="size-2.5 text-primary" />
                  <span className="truncate max-w-[180px]">{attachedFile.name}</span>
                  <span
                    onClick={() => setAttachedFile(null)}
                    className="rounded p-0.5 hover:text-destructive cursor-pointer"
                  >
                    <HugeiconsIcon icon={X} className="size-2" />
                  </span>
                </div>
              )}

              {/* COMPOSER (NO INNER OUTLINES, NO FOCUS RING, BARE SEND/STOP ICON) */}
              <div className="flex flex-col rounded-xl transition-all outline-none ring-0 shadow-none">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".txt,.csv,.json,.md"
                />

                {/* Textarea */}
                <div className="flex items-start px-2.5 pt-1.5 pb-0.5">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${activePersonaObj.name}... (e.g. workout routine, macro target, form cues)`}
                    maxLength={1000}
                    disabled={loading}
                    className="w-full resize-none bg-transparent text-sm sm:text-[10px] leading-relaxed placeholder:text-muted-foreground/45 border-0 outline-none ring-0 hover:outline-none hover:border-none focus:outline-none focus:border-none focus-visible:ring-0 min-h-7.5 max-h-32 py-0"
                  />
                </div>

                {/* Bottom Row of Composer (Bare Attachment & Send/Stop Icon Button) */}
                <div className="flex items-center justify-between gap-1.5 pb-1.5 pt-1 mx-2">
                  {/* Bare Attachment Button (No bg, no border) */}
                  <span
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach log (.txt, .csv, .json)"
                    className="flex size-5 items-center justify-center text-muted-foreground/50 hover:text-foreground bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors"
                  >
                    <HugeiconsIcon icon={Attachment} className="size-4" />
                  </span>

                  <div className="text-xs text-muted-foreground/50">Forge Coach is AI and can make mistakes. Please double-check responses.</div>
                  {/* Combined Send / Stop Icon Button (No bg, no border, pure icon) */}
                  {loading ? (
                    <span
                      onClick={handleStopGeneration}
                      title="Stop generating"
                      className="flex size-5 items-center justify-center text-destructive hover:text-destructive/80 bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors"
                    >
                      <HugeiconsIcon icon={SquareStop} className="size-6" />
                    </span>
                  ) : (
                    <span
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim()}
                      title="Send message"
                      className="flex size-5 items-center justify-center text-primary hover:text-primary/80 disabled:opacity-25 disabled:pointer-events-none bg-transparent border-0 p-0 outline-none cursor-pointer transition-colors"
                    >
                      <HugeiconsIcon icon={Send} className="size-6" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COACH SETTINGS / PARAMETERS MODAL */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-popover p-4 shadow-2xl animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Settings2} className="size-3.5 text-primary" />
                  <h3 className="font-semibold text-xs text-foreground">Coach Parameters</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-muted-foreground hover:text-foreground bg-transparent border-0 p-0 outline-none cursor-pointer"
                >
                  <HugeiconsIcon icon={X} className="size-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Experience Level
                  </label>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {["Beginner", "Intermediate", "Advanced"].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setCoachSettings((s) => ({ ...s, level: lvl }))}
                        className={`cursor-pointer rounded-md border py-1 text-[11px] font-medium transition ${coachSettings.level === lvl
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 bg-secondary/20 text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Primary Focus
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {["Hypertrophy", "Strength", "Fat Loss", "Conditioning"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setCoachSettings((s) => ({ ...s, goal: g }))}
                        className={`cursor-pointer rounded-md border py-1 text-[11px] font-medium transition ${coachSettings.goal === g
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 bg-secondary/20 text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Response Style
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {["Concise & Direct", "Detailed Science"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCoachSettings((s) => ({ ...s, detail: d }))}
                        className={`cursor-pointer rounded-md border py-1 text-[11px] font-medium transition ${coachSettings.detail === d
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 bg-secondary/20 text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-1.5 border-t border-border/20 pt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem("forge_coach_settings", JSON.stringify(coachSettings));
                    } catch (e) {
                      console.warn(e);
                    }
                    setIsSettingsOpen(false);
                  }}
                  className="cursor-pointer rounded-md bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
