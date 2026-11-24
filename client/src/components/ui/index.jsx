import React, { useId, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HugeiconsIcon, Activity, Dumbbell, LayoutDashboard, MessageCircle, UserRound } from "./icons";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './alert-dialog';
import { Button as ShadcnButton } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Textarea } from './textarea';
import './components.css';

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
};

export function Button({
  as: Element = 'button',
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const shadcnVariant =
    variant === 'primary' ? 'default' : variant === 'secondary' ? 'outline' : 'ghost';
  const sharedProps = { className, variant: shadcnVariant };
  if (Element !== 'button') {
    return (
      <ShadcnButton asChild {...sharedProps}>
        <Element {...props}>{children}</Element>
      </ShadcnButton>
    );
  }
  return (
    <ShadcnButton {...props} {...sharedProps} type={type}>
      {children}
    </ShadcnButton>
  );
}
export function Card({ as: Element = 'article', className = '', ...props }) {
  return <Element {...props} className={`forma-card ${className}`.trim()} />;
}
export function Field({
  as: Element = 'input',
  id,
  label,
  hint,
  error,
  success,
  icon,
  children,
  className = '',
  ...inputProps
}) {
  const [uncontrolledSelectValue, setUncontrolledSelectValue] = useState(
    inputProps.value ?? inputProps.defaultValue ?? ''
  );
  const generatedId = useId();
  const fieldId = id || generatedId;
  const message = error || success || hint;
  const messageId = message ? `${fieldId}-message` : undefined;
  const Icon = icon;
  const controlProps = {
    ...inputProps,
    id: fieldId,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': messageId,
    className: `forma-field__input${Icon ? ' has-icon' : ''}${error ? ' is-error' : ''}${success && !error ? ' is-success' : ''}`,
  };
  const fieldLabel = (
    <Label className="forma-field__label" htmlFor={fieldId}>
      {label}
    </Label>
  );
  const options =
    Element === 'select'
      ? React.Children.toArray(children).filter(
          (child) => React.isValidElement(child) && child.type === 'option'
        )
      : [];
  const getOptionValue = (option) =>
    String(option.props.value ?? option.props.children ?? '').trim();
  const emptyOption = options.find((option) => getOptionValue(option) === '');
  const {
    name,
    value,
    defaultValue,
    onChange,
    required,
    disabled,
    placeholder,
    form: formId,
    ...selectProps
  } = inputProps;
  const currentSelectValue = value !== undefined ? value : uncontrolledSelectValue;
  const selectedOption = options.find(
    (option) => getOptionValue(option) === String(currentSelectValue ?? '')
  );
  const selectedIndex =
    selectedOption && getOptionValue(selectedOption) !== ''
      ? String(options.indexOf(selectedOption))
      : undefined;
  return (
    <div
      className={`forma-field ${className}`.trim()}
    >
      {fieldLabel}
      <div className="forma-field__control">
        {Icon && (
          <span className="forma-field__icon" aria-hidden="true">
            <HugeiconsIcon aria-hidden="true" icon={Icon} />
          </span>
        )}
        {Element === 'select' ? (
          <>
            <Select
              value={value !== undefined ? selectedIndex ?? '' : undefined}
              defaultValue={value === undefined ? selectedIndex : undefined}
              onValueChange={(selectedIndex) => {
                const selected = options[Number(selectedIndex)];
                if (selected) {
                  const selectedValue = getOptionValue(selected);
                  if (value === undefined) setUncontrolledSelectValue(selectedValue);
                  onChange?.({
                    target: {
                      name,
                      value: selectedValue,
                    },
                  });
                }
              }}
              required={required}
              disabled={disabled}
              {...selectProps}
            >
              <SelectTrigger
                id={fieldId}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={messageId}
                className="w-full min-w-0"
              >
                <SelectValue placeholder={placeholder || emptyOption?.props.children || label} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option, index) =>
                  getOptionValue(option) === '' ? null : (
                    <SelectItem
                      key={option.key ?? index}
                      value={String(index)}
                      disabled={option.props.disabled}
                    >
                      {option.props.children}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {name && (
              <input
                type="hidden"
                name={name}
                value={currentSelectValue ?? ''}
                form={formId}
                disabled={disabled}
                data-slot="select-form-value"
              />
            )}
          </>
        ) : Element === 'textarea' ? (
          <Textarea {...controlProps} />
        ) : (
          <Input {...controlProps} />
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={`forma-field__message${error ? ' is-error' : ''}${success && !error ? ' is-success' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {' '}
          {message}{' '}
        </p>
      )}{' '}
    </div>
  );
}
const destinations = [
  { label: 'Dashboard', to: '/dashboard', Icon: LayoutDashboard },
  { label: 'Train', to: '/workouts', Icon: Dumbbell },
  { label: 'Track', to: '/workout-tracker', Icon: Activity },
  { label: 'Coach', to: '/my-trainer', Icon: MessageCircle },
  { label: 'Profile & settings', to: '/settings', Icon: UserRound },
];
const publicDestinations = [
  { label: 'Pricing', to: '/memberships' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];
export function PrimaryNavigation({ publicMode = false, onNavigate, className = '' }) {
  if (publicMode) {
    return (
      <nav
        className={`forma-navigation forma-navigation--public ${className}`.trim()}
        aria-label="Public navigation"
      >
        {' '}
        {publicDestinations.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to.startsWith('/#')}
            onClick={onNavigate}
            className={({ isActive }) => `forma-navigation__link${isActive ? ' is-active' : ''}`}
          >
            {' '}
            {label}{' '}
          </NavLink>
        ))}{' '}
      </nav>
    );
  }
  return (
    <nav className="forma-navigation" aria-label="Primary">
      {' '}
      {destinations.map(({ label, to, Icon }) => (
        <NavLink
          key={label}
          to={to}
          end={to === '/dashboard'}
          className={({ isActive }) => `forma-navigation__link${isActive ? ' is-active' : ''}`}
        >
          {' '}
          <HugeiconsIcon icon={Icon} className="forma-navigation__icon" aria-hidden="true" /> <span>{label}</span>{' '}
        </NavLink>
      ))}{' '}
    </nav>
  );
}
export function MessageBubble({
  children,
  variant = 'received',
  sender,
  timestamp,
  timestampLabel,
  className = '',
}) {
  const isSent = variant === 'sent';
  return (
    <article
      className={`forma-message forma-message--${isSent ? 'sent' : 'received'} ${className}`.trim()}
      aria-label={sender || (isSent ? 'Your message' : 'Coach message')}
    >
      {' '}
      {!isSent && sender && <p className="forma-message__sender">{sender}</p>}{' '}
      <p className="forma-message__content">{children}</p>{' '}
      {timestamp && (
        <time className="forma-message__time" dateTime={timestamp}>
          {' '}
          {timestampLabel || timestamp}{' '}
        </time>
      )}{' '}
    </article>
  );
}

export {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  useReasoning,
} from './reasoning';
