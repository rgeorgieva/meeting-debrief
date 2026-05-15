import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="h-16 w-16 rounded-full border border-border bg-surface flex items-center justify-center mb-6">
        <FileQuestion className="h-7 w-7 text-fg-muted" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Meeting not found</h2>
      <p className="text-fg-muted max-w-md mb-6">
        This meeting may have been deleted, or you don&apos;t have access to it.
      </p>
      <Button asChild>
        <Link href="/meetings">Back to meetings</Link>
      </Button>
    </div>
  );
}
