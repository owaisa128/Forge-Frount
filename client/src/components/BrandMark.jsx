import React from "react";
export default function BrandMark({ className = "", ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {" "}
      <path d="M3 21V4h13.5L21 1l1.5 1.4L18.3 7H6v2.5h9.5v3H6V15h5.5v3H6v3H3Z" />{" "}
    </svg>
  );
}
