"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, ListChecks, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty/EmptyState";
import type { OpenActionItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DashboardList() {
  const [items, setItems] = useState<OpenActionItem[] | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/action-items/open")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  async function complete(id: string) {
    if (!items) return;
    setPending((p) => new Set(p).add(id));
    // Optimistic: remove from list (since dashboard shows open only)
    const previous = items;
    setItems(items.filter((it) => it.id !== id));
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Marked done");
    } catch {
      // Revert
      setItems(previous);
      toast.error("Failed to update — reverted.");
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-fg-muted mt-1">
          Every open action item across all your meetings. Oldest first.
        </p>
      </header>

      {items === null && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg shimmer" />
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up"
          description="No open action items. Create a new debrief to capture more."
          ctaLabel="New debrief"
          ctaHref="/meetings/new"
        />
      )}

      {items !== null && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => {
            const isPending = pending.has(item.id);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border border-border bg-surface/60 hover:bg-surface transition-colors",
                  isPending && "opacity-60"
                )}
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => complete(item.id)}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-fg">{item.text}</p>
                  <div className="text-xs text-fg-muted mt-1 flex items-center gap-2">
                    {item.owner && <span>@ {item.owner} ·</span>}
                    <Link
                      href={`/meetings/${item.meeting.id}`}
                      className="hover:text-fg underline underline-offset-2"
                    >
                      {item.meeting.title}
                    </Link>
                  </div>
                </div>
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-fg-dim mt-1" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {items !== null && items.length > 0 && (
        <p className="text-xs text-fg-dim flex items-center gap-2 pt-4">
          <ListChecks className="h-3.5 w-3.5" />
          {items.length} open item{items.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
