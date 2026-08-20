import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { LogoMark } from "@/components/brand/logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { mode?: "signin" | "signup" } => ({
    mode: search.mode === "signup" ? "signup" : undefined,
  }),
  component: AuthPage,
});

const COMMON_PASSWORDS = new Set([
  "password", "password1", "12345678", "123456789", "1234567890",
  "qwerty", "qwerty123", "abc123", "iloveyou", "admin", "welcome",
  "monkey", "football", "111111", "123123", "dragon", "sunshine",
  "master", "login", "princess", "654321", "trustno1", "letmein",
  "changeme", "baseball", "basketball", "superman", "batman",
]);

export function getPasswordStrength(password: string): { label: string; className: string } | null {
  if (!password) return null;
  if (COMMON_PASSWORDS.has(password.toLowerCase()) || /^\d+$/.test(password)) {
    return { label: "Weak — too common, likely to be rejected", className: "text-destructive" };
  }
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", className: "text-destructive" };
  if (score <= 3) return { label: "Fair", className: "text-gold" };
  return { label: "Strong", className: "text-green" };
}

function AuthPage() {
  const navigate = useNavigate();
  const { mode: modeParam } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(modeParam === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const passwordStrength = mode === "signup" ? getPasswordStrength(password) : null;

  useEffect(() => {
    if (modeParam === "signup") setMode("signup");
  }, [modeParam]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || undefined },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentEmail(email);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!sentEmail) return;
    setResending(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: sentEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't resend the email");
    } finally {
      setResending(false);
    }
  }

  function backToSignIn() {
    setSentEmail(null);
    setMode("signin");
    setPassword("");
    setName("");
    setErr(null);
  }

  async function google() {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setErr(result.error.message);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
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
              We've sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{sentEmail}</span>. Click it to
              activate your account and start saving searches.
            </p>

            {resent && <div className="mt-4 text-sm text-green">Email resent — check your inbox.</div>}
            {err && <div className="mt-4 text-sm text-destructive">{err}</div>}

            <button
              type="button"
              onClick={resendConfirmation}
              disabled={resending}
              className="mt-6 w-full rounded-lg border border-border bg-background py-2.5 text-sm font-medium hover:bg-accent/10 disabled:opacity-60"
            >
              {resending ? "Resending…" : "Resend email"}
            </button>
            <button
              type="button"
              onClick={backToSignIn}
              className="mt-3 text-sm font-medium text-green hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="font-display text-2xl">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to continue your opportunity searches."
                : "Save your searches and get personalised matches."}
            </p>

            <button
              type="button"
              onClick={google}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent/10"
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              {mode === "signup" && (
                <Field label="Full name">
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    className="input" type="text" placeholder="Chidi Okafor" />
                </Field>
              )}
              <Field label="Email">
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input" type="email" required placeholder="you@example.com" />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input value={password} onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10" type={showPassword ? "text" : "password"}
                    required minLength={6} placeholder="At least 6 characters" />
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
                {mode === "signin" && (
                  <Link to="/forgot-password" className="mt-1 block text-right text-xs font-medium text-green hover:underline">
                    Forgot password?
                  </Link>
                )}
              </Field>
              {err && <div className="text-sm text-destructive">{err}</div>}
              <button type="submit" disabled={busy}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>New here?{" "}
                  <button className="font-medium text-green hover:underline"
                    onClick={() => { setMode("signup"); setErr(null); }}>
                    Create an account
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button className="font-medium text-green hover:underline"
                    onClick={() => { setMode("signin"); setErr(null); }}>
                    Sign in
                  </button>
                </>
              )}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
