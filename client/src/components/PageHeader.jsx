import React from "react";

export default function PageHeader({
  as: Element = "header",
  title,
  subtitle,
  className = "",
  children,
  ...props
}) {
  const classes = [
    title != null && "flex min-w-0 flex-wrap items-end justify-between gap-4",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Element className={classes || undefined} {...props}>
      {title != null && (
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-forma-text-primary">
            {title}
          </h1>
          {subtitle != null && (
            <p className="mt-1 text-sm text-forma-text-secondary">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </Element>
  );
}
