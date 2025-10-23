"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  async function doSignOut() {
    await fetch("/api/auth/csrf", { cache: "no-store" }).catch(() => {});
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <button
      onClick={doSignOut}
      className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40"
    >
      Salir
    </button>
  );
}
