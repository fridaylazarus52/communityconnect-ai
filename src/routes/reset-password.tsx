import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/brand/logo";
import { getPasswordStrength } from "@/routes/auth";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashError = hash.get("error_description") || hash.get("error");
    if (hashError) {
      setLinkError(hashError.replace(/\+/g, " "));
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirmPassword) {
      setErr("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/dashboard" }), 1500);
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

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {linkError ? (
            <>
              <h1 className="font-display text-2xl">Link expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Request a new one to
                continue.
              </p>
              <Link
                to="/forgot-password"
                className="mt-6 block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Request new link
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="font-display text-2xl">Password updated</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your password has been changed. Taking you to your dashboard…
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl">Set a new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a strong password for your account.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-3">
                <Field label="New password">
                  <div className="relative">
                    <input value={password} onChange={(e) => setPassword(e.target.value)}
                      className="input pr-10" type={showPassword ? "text" : "password"}
                      required minLength={6} placeholder="At least 6 characters"
                      disabled={!ready} />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordStrength && (
                    <span className={`mt-1 block text-xs ${passwordStrength.className}`}>
                      {passwordStrength.label}
                    </span>
                  )}
                </Field>
                <Field label="Confirm new password">
                  <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input" type={showPassword ? "text" : "password"}
                    required minLength={6} placeholder="Re-enter your password"
                    disabled={!ready} />
                </Field>
                {err && <div className="text-sm text-destructive">{err}</div>}
                <button type="submit" disabled={busy || !ready}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  {!ready ? "Verifying link…" : busy ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);padding:0.55rem 0.75rem;border-radius:0.5rem;font-size:0.9rem;outline:none}.input:focus{border-color:var(--green);box-shadow:0 0 0 3px color-mix(in oklch, var(--green) 20%, transparent)}.input:disabled{opacity:0.6;cursor:not-allowed}`}</style>
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
