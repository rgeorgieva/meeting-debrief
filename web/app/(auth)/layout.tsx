import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-bg-deep border-r border-border relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, oklch(0.4 0.18 220 / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, oklch(0.3 0.15 250 / 0.3), transparent 50%)",
          }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full border-2 border-accent" />
          <span className="text-xl font-semibold tracking-tight">
            Meeting Debrief
          </span>
        </Link>
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            The messy context goes in.{" "}
            <span className="text-accent">Clean commitments come out.</span>
          </h1>
          <p className="text-fg-muted text-lg leading-relaxed">
            Paste a meeting transcript. AI extracts decisions, action items,
            blockers, and drafts a follow-up email. Everything is searchable,
            trackable, and yours alone.
          </p>
        </div>
        <p className="relative z-10 text-sm text-fg-dim">
          Vibe Coding Workshop · encorp.ai
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center p-6 sm:p-12">
        <div className="w-full max-w-md mx-auto">{children}</div>
      </div>
    </div>
  );
}
