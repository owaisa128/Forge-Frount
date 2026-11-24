import React from "react";

export default function BrandLogo({
  size = "nav",
  contextLabel,
  className = "",
}) {
  const accessibleName = ["FORGE", contextLabel].filter(Boolean).join(". ");
  return (
    <span
      className={`forma-brand-lockup forma-brand-lockup--${size} ${className}`.trim()}
      role="img"
      aria-label={accessibleName}
    >
      <img
        className="forma-brand-lockup__image"
        src="/forge-logo.png"
        width={141}
        height={49}
        alt=""
      />
    </span>
  );
}
