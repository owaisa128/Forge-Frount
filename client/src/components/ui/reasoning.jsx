import * as React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"
import { cn } from "cn"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiBrain01Icon,
  Brain01Icon,
  CircleCheckIcon,
} from "@hugeicons/core-free-icons"

const ReasoningContext = createContext(null)

export function useReasoning() {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error("Reasoning sub-components must be used within a <Reasoning> parent component.")
  }
  return context
}

/**
 * <Reasoning>
 * Root wrapper component based on shadcn's Trace primitive & AI Elements.
 * Manages streaming state, open/closed collapsible state, and thought duration timer.
 */
export function Reasoning({
  children,
  isStreaming = false,
  duration,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
  ...props
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen || isStreaming)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const setIsOpen = (nextOpen) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  // Track live duration if streaming and no duration prop is provided
  const [liveSeconds, setLiveSeconds] = useState(duration || 0)
  const startTimeRef = useRef(null)

  useEffect(() => {
    if (isStreaming) {
      // Auto-open while reasoning is streaming
      setIsOpen(true)
      startTimeRef.current = Date.now()
      const timer = setInterval(() => {
        if (startTimeRef.current) {
          setLiveSeconds(Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)))
        }
      }, 1000)
      return () => clearInterval(timer)
    } else {
      if (duration !== undefined) {
        setLiveSeconds(duration)
      }
    }
  }, [isStreaming, duration])

  const effectiveDuration = duration !== undefined ? duration : liveSeconds
  const status = isStreaming ? "running" : "done"

  return (
    <ReasoningContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isStreaming,
        duration: effectiveDuration,
        status,
      }}
    >
      <Trace data-slot="reasoning" className={cn("my-1.5", className)} {...props}>
        <TraceCollapsible open={isOpen} onOpenChange={setIsOpen}>
          {children}
        </TraceCollapsible>
      </Trace>
    </ReasoningContext.Provider>
  )
}

/**
 * <ReasoningTrigger>
 * Clickable header line that shows thinking status / elapsed duration and arrow indicator.
 */
export function ReasoningTrigger({
  title,
  description,
  className,
  children,
  ...props
}) {
  const { isStreaming, duration, status } = useReasoning()

  const defaultTitle = isStreaming ? "Thinking..." : "Thought"
  const defaultDescription = duration > 0 ? `${duration}s` : ""

  return (
    <TraceCollapsibleTrigger
      className={cn("select-none text-xs font-medium py-1", className)}
      {...props}
    >
      {children || (
        <TraceLine status={status}>
          <TraceIcon>
            {isStreaming ? (
              <HugeiconsIcon
                icon={AiBrain01Icon}
                className="animate-pulse text-amber-500"
                strokeWidth={2}
              />
            ) : (
              <HugeiconsIcon
                icon={Brain01Icon}
                className="text-muted-foreground transition-colors group-hover/trace-collapsible-trigger:text-foreground"
                strokeWidth={2}
              />
            )}
          </TraceIcon>
          <TraceTitle>{title || defaultTitle}</TraceTitle>
          {(description || defaultDescription) && (
            <TraceDescription>{description || defaultDescription}</TraceDescription>
          )}
        </TraceLine>
      )}
    </TraceCollapsibleTrigger>
  )
}

/**
 * <ReasoningContent>
 * Expandable container for the reasoning / chain-of-thought markdown or raw stream text.
 */
export function ReasoningContent({
  children,
  className,
  ...props
}) {
  return (
    <TraceCollapsibleContent className={className} {...props}>
      <div
        data-slot="reasoning-content"
        className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground/80 py-1 select-text"
      >
        {children}
      </div>
    </TraceCollapsibleContent>
  )
}

export default Reasoning
