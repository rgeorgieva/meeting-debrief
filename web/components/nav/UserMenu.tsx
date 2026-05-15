"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Logout failed");
      setLoggingOut(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 h-9 rounded-md hover:bg-surface transition-colors text-sm"
      >
        <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-accent">
          <UserIcon className="h-3.5 w-3.5" />
        </div>
        <span className="hidden sm:inline text-fg-muted">{email}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-bg-deep shadow-xl z-20 overflow-hidden">
            <button
              onClick={logout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-3 h-10 text-sm text-fg hover:bg-surface transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
