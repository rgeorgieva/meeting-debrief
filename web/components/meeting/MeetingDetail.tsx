"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Trash2, Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionItemRow } from "./ActionItemRow";
import type { Meeting, ActionItem } from "@/lib/types";

export function MeetingDetail({ meeting: initial }: { meeting: Meeting }) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting>(initial);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(meeting.followupEmail);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error("Failed to copy.");
    }
  }

  async function deleteMeeting() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Meeting deleted");
      router.push("/meetings");
      router.refresh();
    } catch {
      toast.error("Failed to delete.");
      setDeleting(false);
    }
  }

  async function addItem() {
    const text = newItem.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, owner: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Failed to add.");
        return;
      }
      setMeeting({
        ...meeting,
        actionItems: [...meeting.actionItems, data.actionItem],
      });
      setNewItem("");
    } catch {
      toast.error("Network error.");
    } finally {
      setAdding(false);
    }
  }

  function updateItem(updated: ActionItem) {
    setMeeting({
      ...meeting,
      actionItems: meeting.actionItems.map((a) =>
        a.id === updated.id ? updated : a
      ),
    });
  }

  function removeItem(id: string) {
    setMeeting({
      ...meeting,
      actionItems: meeting.actionItems.filter((a) => a.id !== id),
    });
  }

  const sortedItems = [...meeting.actionItems].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    return a.position - b.position;
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-24">
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" />
        Meetings
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">
            {meeting.title}
          </h1>
          <p className="text-fg-muted">
            {meeting.meetingDate
              ? new Date(meeting.meetingDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : new Date(meeting.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            {meeting.participants.length > 0 && (
              <> · {meeting.participants.join(", ")}</>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteOpen(true)}
          aria-label="Delete meeting"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      {meeting.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-fg leading-relaxed">{meeting.summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>
            Action items
            <span className="ml-2 text-sm font-normal text-fg-muted">
              {meeting.actionItems.filter((a) => !a.isDone).length} open /{" "}
              {meeting.actionItems.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sortedItems.length === 0 ? (
            <p className="text-sm text-fg-muted py-2">
              No action items captured. Add one below.
            </p>
          ) : (
            sortedItems.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                onChange={updateItem}
                onRemove={() => removeItem(item.id)}
              />
            ))
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
            className="flex items-center gap-2 pt-3 border-t border-border mt-3"
          >
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add another action item..."
              disabled={adding}
            />
            <Button type="submit" size="sm" disabled={adding || !newItem.trim()}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {meeting.decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {meeting.decisions.map((d, i) => (
                <li key={i} className="text-fg leading-relaxed flex gap-2">
                  <span className="text-accent shrink-0">✓</span>
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {meeting.blockers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Blockers & open questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {meeting.blockers.map((b, i) => (
                <li key={i} className="text-fg leading-relaxed flex gap-2">
                  <span className="text-warning shrink-0">!</span>
                  {b}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {meeting.followupEmail && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Follow-up email</CardTitle>
            <Button variant="secondary" size="sm" onClick={copyEmail}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-fg leading-relaxed text-sm">
              {meeting.followupEmail}
            </pre>
          </CardContent>
        </Card>
      )}

      {meeting.transcript && (
        <details className="rounded-lg border border-border bg-surface/30">
          <summary className="cursor-pointer p-4 font-medium text-fg-muted hover:text-fg">
            Original transcript
          </summary>
          <div className="p-4 pt-0">
            <pre className="whitespace-pre-wrap font-mono text-sm text-fg-muted">
              {meeting.transcript}
            </pre>
          </div>
        </details>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this meeting?</DialogTitle>
            <DialogDescription>
              Everything — the summary, action items, and original transcript —
              will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={deleteMeeting}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
