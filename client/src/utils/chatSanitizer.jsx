import React, { useState } from 'react';
import { HugeiconsIcon, Copy, Check } from '../components/ui/icons';

/**
 * Validates whether a URL is strictly safe (http, https, mailto).
 * Rejects javascript:, vbscript:, data:, file:, etc.
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  return clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('mailto:');
}

/**
 * Strips dangerous HTML tags and inline event handlers from raw strings.
 */
export function sanitizeRawHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and contents
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove iframes, objects, embeds
    .replace(/<\/?(?:iframe|object|embed|applet|base|meta|link|form|svg|math)[^>]*>/gi, '')
    // Remove on* event handlers (onclick, onerror, onload, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Neutralize javascript: hrefs
    .replace(/href\s*=\s*(['"]?)\s*javascript:[^'"]*\1/gi, 'href="#"');
}

/**
 * Formats inline markdown elements: **bold**, *italic*, `code`, and [links](url).
 */
export function renderInlineMarkdown(text) {
  if (!text || typeof text !== 'string') return null;

  // Split text by tokens: bold, code, links
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded bg-forma-bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] font-semibold text-forma-brand-ember"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **bold**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-forma-text-primary">
          {renderInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }

    // Italic: *italic*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-forma-text-secondary">
          {renderInlineMarkdown(part.slice(1, -1))}
        </em>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      const safe = isSafeUrl(linkUrl);

      return safe ? (
        <a
          key={index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-forma-brand-ember underline decoration-forma-brand-ember/40 underline-offset-2 transition hover:text-forma-brand-ember-hover hover:decoration-forma-brand-ember"
        >
          {linkText}
        </a>
      ) : (
        <span key={index} className="text-forma-text-primary">
          {linkText}
        </span>
      );
    }

    return part;
  });
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-forma-border-subtle bg-forma-bg-base font-mono text-xs">
      <div className="flex items-center justify-between border-b border-forma-border-subtle bg-forma-bg-surface-raised/60 px-3 py-1.5 text-[11px] text-forma-text-muted">
        <span className="uppercase">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-forma-text-secondary transition hover:bg-forma-bg-surface hover:text-forma-text-primary"
        >
          {copied ? (
            <>
              <HugeiconsIcon icon={Check} className="h-3 w-3 text-forma-status-success" />
              <span className="text-[10px] text-forma-status-success">Copied</span>
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Copy} className="h-3 w-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-forma-text-primary leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Renders complete sanitized markdown (headings, blockquotes, lists, tables, code blocks).
 */
export function SanitizedMarkdown({ content, className = '' }) {
  if (!content) return null;

  // Sanitize raw dangerous HTML first
  const cleanInput = sanitizeRawHtml(content);

  // Split into lines for block-level parsing
  const lines = cleanInput.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block: ```lang ... ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <CodeBlock key={`code-${i}`} language={lang} code={codeLines.join('\n')} />
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="mt-3 mb-1 text-sm font-bold text-forma-text-primary">
          {renderInlineMarkdown(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="mt-4 mb-1.5 font-display text-lg font-normal tracking-wide text-forma-text-primary">
          {renderInlineMarkdown(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="mt-4 mb-2 font-display text-xl font-normal tracking-wide text-forma-text-primary">
          {renderInlineMarkdown(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 border-l-2 border-forma-brand-ember/60 pl-3 italic text-xs text-forma-text-secondary"
        >
          {renderInlineMarkdown(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered List (- or *)
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*]\s+/, '');
        listItems.push(
          <li key={`li-${i}`} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forma-brand-ember" />
            <span>{renderInlineMarkdown(itemText)}</span>
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1 text-xs text-forma-text-secondary leading-relaxed">
          {listItems}
        </ul>
      );
      continue;
    }

    // Ordered List (1. , 2. )
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems = [];
      let itemNum = 1;
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, '');
        listItems.push(
          <li key={`oli-${i}`} className="flex items-start gap-2">
            <span className="shrink-0 font-mono text-[10px] font-bold text-forma-brand-teal">
              {itemNum}.
            </span>
            <span>{renderInlineMarkdown(itemText)}</span>
          </li>
        );
        itemNum++;
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1 text-xs text-forma-text-secondary leading-relaxed">
          {listItems}
        </ol>
      );
      continue;
    }

    // Table rows (| ... |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows = [];
      let isHeader = true;

      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowLine = lines[i].trim();
        // Skip separator row like |---|---|
        if (/^\|(?:\s*[-:]+[-|\s:]*)\|$/.test(rowLine)) {
          isHeader = false;
          i++;
          continue;
        }

        const cells = rowLine
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        tableRows.push({
          cells,
          isHeader,
        });
        isHeader = false;
        i++;
      }

      elements.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-forma-border-subtle">
          <table className="w-full text-left font-mono text-xs">
            <tbody className="divide-y divide-forma-border-subtle">
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={row.isHeader ? 'bg-forma-bg-surface-raised font-bold text-forma-text-primary' : 'hover:bg-forma-bg-surface-raised/40 text-forma-text-secondary'}
                >
                  {row.cells.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="my-1.5 text-xs text-forma-text-secondary leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    }

    i++;
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
