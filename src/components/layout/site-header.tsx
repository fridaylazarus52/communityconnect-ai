import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications, useSession } from "@/hooks/use-career-data";
import { WordMark } from "@/components/brand/logo";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/assistant", label: "AI Career Assistant" },
  { to: "/resources", label: "Career Resources" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { isAuthed, user } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const notificationsQ = useNotifications(isAuthed ? user?.id : undefined);
  const unread = (notificationsQ.data ?? []).filter((n) => !n.read_at).length;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header
      className={`sticky top-0 z-50 glass transition-shadow duration-300 ${scrolled ? "shadow-soft" : ""}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="CommunityConnect AI home">
          <WordMark />
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-full px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-green-soft hover:text-foreground data-[status=active]:bg-green-soft data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          {isAuthed ? (
            <>
              <Link
                to="/notifications"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
                className="relative hidden h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-green sm:grid"
              >
                <Bell className="h-4 w-4" aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {unread}
                  </span>
                )}
              </Link>
              <button
                onClick={signOut}
                className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium transition-colors hover:border-green sm:inline-flex"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
              </button>
              <Link
                to="/dashboard"
                className="hidden rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 sm:inline-flex"
              >
                My hub
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden rounded-full px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-green-soft sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="hidden rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 sm:inline-flex"
              >
                Get Started
              </Link>
            </>
          )}

          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-5 pt-3 lg:hidden">
          <nav aria-label="Mobile" className="grid gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-green-soft"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid gap-2">
            {isAuthed ? (
              <>
                <Link to="/notifications" className="rounded-full border border-border px-4 py-2.5 text-center text-sm font-medium">
                  Notifications{unread ? ` (${unread})` : ""}
                </Link>
                <button onClick={signOut} className="rounded-full border border-border px-4 py-2.5 text-sm font-medium">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="rounded-full border border-border px-4 py-2.5 text-center text-sm font-medium">
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
