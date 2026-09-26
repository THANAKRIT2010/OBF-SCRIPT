"use client";

import { signOut } from "next-auth/react";

/**
 * Red "door" logout button.
 * variant="icon"  -> round icon-only button (used in the navbar)
 * variant="full"  -> icon + label (used in dropdown / profile page)
 */
export default function LogoutButton({
  variant = "full",
  className = "",
}: {
  variant?: "icon" | "full";
  className?: string;
}) {
  const DoorIcon = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 256 256"
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* door frame */}
      <path d="M136 40H72a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h64" />
      {/* door leaf */}
      <path d="M136 24l56 16v176l-56 16z" />
      {/* door knob */}
      <circle cx="160" cy="128" r="6" fill="currentColor" stroke="none" />
      {/* exit arrow */}
      <path d="M176 128h56m0 0-20-20m20 20-20 20" />
    </svg>
  );

  if (variant === "icon") {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        aria-label="ออกจากระบบ"
        title="ออกจากระบบ"
        className={`logout-door-btn size-9 shrink-0 ${className}`}
      >
        {DoorIcon}
      </button>
    );
  }

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={`logout-door-btn px-4 py-2 text-sm w-full ${className}`}
    >
      {DoorIcon}
      ออกจากระบบ
    </button>
  );
}
