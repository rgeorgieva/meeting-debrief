"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, FileText, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { cn } from "@/lib/utils";
import type { MeetingListItem } from "@/lib/types";

export function MeetingsList() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [items, setItems] = useState<MeetingListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchList = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const url = new URL("/api/meetings", window.location.origin);
      if (search.trim()) url.searchParams.set("q", search.trim());
      const res = await fetch(url.toString());
      const data = await res.json();
      setItems(data.meetings ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchList(value);
      const url = new URL(window.location.href);
      if (value.trim()) url.searchParams.set("q", value.trim());
      else url.searchParams.delete("q");
      router.replace(url.pathname + url.search, { scroll: false });
    }, 300);
  }

  const isEmpty = items !== null && items.length === 0;
  const isSearching = q.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Meetings</h1>
          <p className="text-fg-muted mt-1">
            Your debriefed meetings, newest first.
          </p>
        </div>
        <Button asChild>
          <Link href="/meetings/new">
            <Plus />
            New debrief
          </Link>
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
        <Input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search meetings by title, summary, or transcript..."
          className="pl-9"
        />
      </div>

      {loading && items === null && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg shimmer"
            />
          ))}
        </div>
      )}

      {!loading && isEmpty && !isSearching && (
        <EmptyState
          icon={FileText}
          title="No meetings yet"
          description="Paste your first meeting transcript and let the AI extract the structure."
          ctaLabel="Create your first debrief"
          ctaHref="/meetings/new"
        />
      )}

      {!loading && isEmpty && isSearching && (
        <EmptyState
          icon={Search}
          title="No matches"
          description={`No meetings match "${q}". Try different keywords.`}
        />
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((m) => (
            <li key={m.id}>
              <Link
                href={`/meetings/${m.id}`}
                className={cn(
                  "block rounded-lg border border-border bg-surface/60 p-5",
                  "hover:bg-surface hover:border-border-strong transition-all",
                  loading && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-fg flex-1">{m.title}</h3>
                  {m.openActionItemsCount > 0 && (
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-accent/15 text-accent font-medium">
                      {m.openActionItemsCount} open
                    </span>
                  )}
                </div>
                {m.summaryPreview && (
                  <p className="text-sm text-fg-muted line-clamp-2 mt-1">
                    {m.summaryPreview}
                  </p>
                )}
                <p className="text-xs text-fg-dim mt-2">
                  {m.meetingDate
                    ? new Date(m.meetingDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : new Date(m.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {loading && items !== null && items.length > 0 && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-fg-dim" />
        </div>
      )}
    </div>
  );
}
