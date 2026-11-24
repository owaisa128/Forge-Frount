import React from "react";
import { HugeiconsIcon, Info } from "./ui/icons";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

export default function MetricHelp({ label, explanation }) {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          aria-label={`About ${label}`}
          className="inline-flex size-11 cursor-help items-center justify-center rounded-full border-0 bg-transparent p-0 text-forma-text-secondary transition-colors hover:text-forma-brand-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forma-brand-ember"
        >
          <HugeiconsIcon icon={Info} aria-hidden="true" className="size-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-64 border border-forma-border-subtle bg-forma-bg-surface p-4 text-forma-text-primary"
      >
        <p className="text-sm leading-relaxed text-forma-text-secondary">
          {explanation}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
