import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function EmptyState({ icon: Icon, title, description, ctaLabel, ctaHref }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="h-16 w-16 rounded-full border border-border bg-surface flex items-center justify-center mb-6">
        <Icon className="h-7 w-7 text-fg-muted" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-fg-muted max-w-md mb-6">{description}</p>
      {ctaLabel && ctaHref && (
        <Button asChild>
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}
