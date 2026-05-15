"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type Mode = "login" | "signup";

const COPY: Record<Mode, {
  title: string;
  subtitle: string;
  submit: string;
  switchText: string;
  switchLinkText: string;
  switchHref: string;
}> = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to access your meeting history.",
    submit: "Sign in",
    switchText: "New here?",
    switchLinkText: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "No credit card. No onboarding form. Just start.",
    submit: "Sign up",
    switchText: "Already have an account?",
    switchLinkText: "Sign in",
    switchHref: "/login",
  },
};

const HUMAN_ERRORS: Record<string, string> = {
  email_taken: "An account with this email already exists.",
  invalid_credentials: "Invalid email or password.",
  weak_password: "Password must be at least 8 characters.",
  invalid_email: "Please enter a valid email address.",
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = HUMAN_ERRORS[data.error] ?? data.message ?? "Something went wrong.";
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 lg:hidden flex flex-col items-center text-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent mb-2" />
        <span className="text-xl font-semibold tracking-tight">
          Meeting Debrief
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{copy.title}</h2>
        <p className="text-fg-muted">{copy.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 8 characters" : ""}
            disabled={submitting}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting && <Loader2 className="animate-spin" />}
          {copy.submit}
        </Button>
      </form>

      <p className="text-center text-sm text-fg-muted">
        {copy.switchText}{" "}
        <Link
          href={copy.switchHref}
          className="text-accent hover:text-accent-hover font-medium"
        >
          {copy.switchLinkText}
        </Link>
      </p>
    </div>
  );
}
