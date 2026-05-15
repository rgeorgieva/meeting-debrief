"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Meetings", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-border bg-bg-deep/50 backdrop-blur-sm">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-6 h-16 border-b border-border"
      >
        <div className="h-7 w-7 rounded-full border-2 border-accent" />
        <span className="font-semibold tracking-tight">Meeting Debrief</span>
      </Link>

      <div className="p-4">
        <Link
          href="/meetings/new"
          className="flex items-center justify-center gap-2 h-10 rounded-md bg-accent text-accent-fg hover:bg-accent-hover transition-colors font-medium text-sm shadow-sm shadow-accent/20"
        >
          <Plus className="h-4 w-4" />
          New debrief
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors",
                active
                  ? "bg-surface text-fg"
                  : "text-fg-muted hover:text-fg hover:bg-surface/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
