import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Clock,
  Compass,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createThread, listThreads } from "@/lib/chat.functions";
import { LogoMark } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type ProfileData = {
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DashboardSidebar() {
  const navigate = useNavigate();
  const listThreadsFn = useServerFn(listThreads);
  const createThreadFn = useServerFn(createThread);
  const [busy, setBusy] = useState(false);

  const threadsQ = useQuery({
    queryKey: ["threads"],
    queryFn: () => listThreadsFn(),
  });

  const profileQ = useQuery<ProfileData | null>({
    queryKey: ["sidebar-profile"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return { ...(data ?? {}), email: user.email ?? null } as ProfileData;
    },
  });

  const identityLabel = profileQ.data?.display_name || profileQ.data?.email || "Account";

  async function start(query: string) {
    const cleaned = query.trim();
    if (!cleaned) return;
    setBusy(true);
    try {
      const thread = await createThreadFn({ data: { title: cleaned.slice(0, 60) } });
      sessionStorage.setItem(`prefill:${thread.id}`, cleaned);
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <Link to="/" className="flex items-center gap-2 border-b border-sidebar-border p-5 font-display text-lg">
        <LogoMark /> CommunityConnect
      </Link>
      <div className="flex-1 overflow-y-auto p-3">
        <Link
          to="/dashboard"
          className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LayoutDashboard size={16} aria-hidden /> Overview
        </Link>
        <button
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              const thread = await createThreadFn({ data: {} });
              navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 py-2.5 text-sm font-semibold text-sidebar-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
        >
          <Plus size={16} aria-hidden /> New Search
        </button>
        <Link
          to="/opportunities"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/50 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:border-green hover:bg-sidebar-accent"
        >
          <Compass size={16} aria-hidden /> Browse Opportunities
        </Link>
        <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] font-mono uppercase tracking-wider text-sidebar-foreground/60">
          <Clock size={12} aria-hidden /> Recent
        </div>
        {threadsQ.isLoading ? (
          <div className="space-y-1 px-2">
            <Skeleton className="h-8 w-full bg-sidebar-accent/60" />
            <Skeleton className="h-8 w-full bg-sidebar-accent/60" />
            <Skeleton className="h-8 w-full bg-sidebar-accent/60" />
          </div>
        ) : (threadsQ.data?.filter((t) => t.title !== "New search").length ?? 0) === 0 ? (
          <div className="px-2 py-3 text-xs text-sidebar-foreground/60">
            No searches yet — ask something to get started.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {threadsQ.data?.filter((t) => t.title !== "New search").map((t) => (
              <li key={t.id}>
                <Link
                  to="/chat/$threadId"
                  params={{ threadId: t.id }}
                  className="flex items-center gap-2 truncate rounded-lg px-3 py-2 text-sm text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <MessageSquare size={14} className="shrink-0 opacity-60" aria-hidden />
                  <span className="truncate">{t.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-2 rounded-xl px-2 py-2">
          <Avatar className="h-8 w-8 border border-sidebar-border">
            {profileQ.data?.avatar_url ? (
              <AvatarImage src={profileQ.data.avatar_url} alt={identityLabel} />
            ) : null}
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
              {getInitials(identityLabel)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-sidebar-foreground">{identityLabel}</div>
            <div className="text-xs text-sidebar-foreground/50">Signed in</div>
          </div>
        </div>
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <User size={15} aria-hidden /> Edit profile
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut size={15} aria-hidden /> Sign out
        </button>
      </div>
    </aside>
  );
}
