"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DebriefDraft, DebriefResponse } from "@/lib/types";

type Phase = "paste" | "loading" | "review" | "saving";

type DraftState = DebriefDraft & {
  transcript: string;
};

const SAMPLE = `Project Sync — Q2 Roadmap
Attendees: Alice, Bob, Carol

Alice: We need to decide on the launch date for Feature X.
Bob: The backend isn't ready — we still don't have rate limiting work done.
Alice: How long would that take?
Bob: About two weeks if I focus on it.
Alice: OK, let's commit to May 31. Bob, can you have rate limiting ready by May 17?
Bob: I'll have it done.
Carol: I can help with the frontend integration once Bob's done.
Alice: Great. Carol, can you also ping legal about the data retention policy?
Carol: On it.`;

export function DebriefFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("paste");
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);

  async function runDebrief() {
    if (phase !== "paste") return;
    if (transcript.trim().length < 50) {
      toast.error("Paste a longer transcript to get a useful debrief.");
      return;
    }

    setPhase("loading");
    setInvalidMessage(null);

    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data: DebriefResponse | { error: string; message: string } =
        await res.json();

      if (!res.ok) {
        const errData = data as { error: string; message: string };
        toast.error(errData.message ?? "Debrief failed. Try again.");
        setPhase("paste");
        return;
      }

      const okData = data as DebriefResponse;
      if (!okData.isValidMeeting) {
        setInvalidMessage(okData.message);
        setPhase("paste");
        return;
      }

      setDraft({ ...okData.draft, transcript });
      setPhase("review");
    } catch {
      toast.error("Network error. Your transcript is safe — try again.");
      setPhase("paste");
    }
  }

  async function save() {
    if (!draft || phase !== "review") return;
    if (!draft.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setPhase("saving");
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Failed to save.");
        setPhase("review");
        return;
      }
      toast.success("Meeting saved");
      router.push(`/meetings/${data.id}`);
    } catch {
      toast.error("Network error. Your edits are still here.");
      setPhase("review");
    }
  }

  function discard() {
    if (confirm("Discard this draft? You can paste a new transcript.")) {
      setDraft(null);
      setTranscript("");
      setPhase("paste");
    }
  }

  if (phase === "review" || phase === "saving") {
    return (
      <ReviewView
        draft={draft!}
        onChange={setDraft}
        onSave={save}
        onDiscard={discard}
        saving={phase === "saving"}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">New debrief</h1>
        <p className="text-fg-muted">
          Paste a meeting transcript or your rough notes. AI will extract
          decisions, action items, blockers, and draft a follow-up email.
        </p>
      </header>

      {invalidMessage && (
        <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm">
          {invalidMessage}
        </div>
      )}

      <Textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Paste the meeting transcript here..."
        rows={18}
        className="min-h-96 font-mono text-sm"
        disabled={phase === "loading"}
      />

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-sm text-fg-muted hover:text-fg underline underline-offset-2"
          onClick={() => setTranscript(SAMPLE)}
          disabled={phase === "loading"}
        >
          Use sample transcript
        </button>
        <Button
          size="lg"
          onClick={runDebrief}
          disabled={phase === "loading" || transcript.trim().length < 50}
        >
          {phase === "loading" ? (
            <>
              <Loader2 className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles />
              Debrief meeting
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ReviewView({
  draft,
  onChange,
  onSave,
  onDiscard,
  saving,
}: {
  draft: DraftState;
  onChange: (d: DraftState) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  function updateAt<K extends keyof DraftState>(key: K, val: DraftState[K]) {
    onChange({ ...draft, [key]: val });
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-32">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Review draft</h1>
        <p className="text-fg-muted">
          Edit anything before saving. Tick action items later inside the
          meeting.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => updateAt("title", e.target.value)}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={draft.meetingDate ?? ""}
                onChange={(e) =>
                  updateAt("meetingDate", e.target.value || null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Participants</Label>
              <p className="text-sm text-fg-muted h-10 flex items-center">
                {draft.participants.join(", ") || "—"}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              rows={3}
              value={draft.summary}
              onChange={(e) => updateAt("summary", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          <EditableList
            items={draft.decisions}
            onChange={(items) => updateAt("decisions", items)}
            placeholder="A decision that was made..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Action items</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionItemsEditor
            items={draft.actionItems}
            onChange={(items) => updateAt("actionItems", items)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blockers</CardTitle>
        </CardHeader>
        <CardContent>
          <EditableList
            items={draft.blockers}
            onChange={(items) => updateAt("blockers", items)}
            placeholder="An open question or blocker..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up email</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={10}
            value={draft.followupEmail}
            onChange={(e) => updateAt("followupEmail", e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-4 md:bottom-6 z-10 flex items-center justify-end gap-3 p-3 rounded-lg border border-border bg-bg-deep/95 backdrop-blur-md shadow-xl">
        <Button variant="ghost" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" /> Saving...
            </>
          ) : (
            "Save meeting"
          )}
        </Button>
      </div>
    </div>
  );
}

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <Textarea
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="min-h-10 py-2"
            rows={1}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </div>
  );
}

function ActionItemsEditor({
  items,
  onChange,
}: {
  items: { text: string; owner: string | null }[];
  onChange: (next: { text: string; owner: string | null }[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 grid sm:grid-cols-[1fr_180px] gap-2">
            <Input
              value={item.text}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, text: e.target.value };
                onChange(next);
              }}
              placeholder="What needs to happen?"
            />
            <Input
              value={item.owner ?? ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, owner: e.target.value || null };
                onChange(next);
              }}
              placeholder="Owner (optional)"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { text: "", owner: null }])}
      >
        <Plus className="h-4 w-4" />
        Add action item
      </Button>
    </div>
  );
}
