import React, { useState } from 'react';
import { HugeiconsIcon, Eye, EyeOff } from "./ui/icons";
export default function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  required = true,
  minLength,
  autoComplete,
  leadingIcon: LeadingIcon,
  leadingIconClassName = 'text-[var(--muted)]',
  className = '',
  toggleClassName = '',
  style = {},
}) {
  const [visible, setVisible] = useState(false);
  const VisibilityIcon = visible ? EyeOff : Eye;
  return (
    <div className="relative w-full">
      {' '}
      {LeadingIcon && (
        <HugeiconsIcon
          icon={LeadingIcon}
          className={`pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 shrink-0 ${leadingIconClassName}`}
          aria-hidden="true"
        />
      )}{' '}
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        style={{ paddingLeft: LeadingIcon ? '2.75rem' : '1rem', paddingRight: '2.75rem', ...style }}
        className={`${className} ${LeadingIcon ? '!pl-11' : '!pl-4'} !pr-11`.trim()}
      />{' '}
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className={`absolute inset-y-0 right-2 my-auto flex h-11 w-11 items-center justify-center rounded-lg !border-0 !bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forma-brand-teal ${toggleClassName}`}
      >
        <HugeiconsIcon
          icon={VisibilityIcon}
          className="h-4 w-5 shrink-0"
          aria-hidden="true"
          focusable="false"
        />
      </button>{' '}
    </div>
  );
}
