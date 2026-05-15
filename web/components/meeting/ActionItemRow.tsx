"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ActionItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: ActionItem;
  onChange: (next: ActionItem) => void;
  onRemove: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function toggle(checked: boolean) {
    // Optimistic update
    const previous = item.isDone;
    onChange({
      ...item,
      isDone: checked,
      completedAt: checked ? new Date().toISOString() : null,
    });
    setPending(true);
    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: checked }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Revert
      onChange({ ...item, isDone: previous });
      toast.error("Failed to update — reverted.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this action item?")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onRemove();
    } catch {
      toast.error("Failed to delete.");
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-md border border-transparent hover:border-border hover:bg-surface/40 transition-colors",
        pending && "opacity-60"
      )}
    >
      <Checkbox
        checked={item.isDone}
        onCheckedChange={(c) => toggle(c === true)}
        disabled={pending}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            item.isDone && "line-through text-fg-muted"
          )}
        >
          {item.text}
        </p>
        {item.owner && (
          <p className="text-xs text-fg-muted mt-0.5">@ {item.owner}</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={pending}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
