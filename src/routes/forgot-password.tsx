import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/brand/logo";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSentEmail(email);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-lg font-semibold">
          <LogoMark />
          CommunityConnect <span className="text-gold">AI</span>
        </Link>

        {sentEmail ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-soft text-green">
              <MailCheck className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="mt-5 font-display text-2xl">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for{" "}
              <span className="font-medium text-foreground">{sentEmail}</span>, we've sent a link
              to reset your password.
            </p>

            <Link
              to="/auth"
              className="mt-6 block text-sm font-medium text-green hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="font-display text-2xl">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the email address on your account and we'll send you a link to reset your
              password.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <Field label="Email">
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input" type="email" required placeholder="you@example.com" />
              </Field>
              {err && <div className="text-sm text-destructive">{err}</div>}
              <button type="submit" disabled={busy}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/auth" className="font-medium text-green hover:underline">
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);padding:0.55rem 0.75rem;border-radius:0.5rem;font-size:0.9rem;outline:none}.input:focus{border-color:var(--green);box-shadow:0 0 0 3px color-mix(in oklch, var(--green) 20%, transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
