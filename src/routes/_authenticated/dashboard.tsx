import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import {
  Bookmark,
  ChevronRight,
  Clock,
  GraduationCap,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Star,
  Tags,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createThread, listThreads, saveSearch, listSavedSearches, listBookmarks } from "@/lib/chat.functions";
import { LogoMark } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type ProfileData = {
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  education_level: string | null;
  sector_interests: string[] | null;
  email: string | null;
};

type SavedSearch = {
  id: string;
  query: string;
  title: string | null;
  created_at: string;
};

type BookmarkItem = {
  id: string;
  thread_id: string;
  message_id: string;
  title: string | null;
  excerpt: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const SUGGESTIONS = [
  "Undergraduate scholarships for 2026 intake",
  "SME loans I can get in Kano",
  "Grants for female founders in Nigeria",
  "Free maternal health programs near me",
  "NYSC placement in Rivers state",
  "Subsidised HIV treatment in Lagos",
  "Anchor Borrowers programme for rice farmers",
  "T-Bills — how to invest ₦100k",
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Dashboard() {
  const navigate = useNavigate();
  const listThreadsFn = useServerFn(listThreads);
  const createThreadFn = useServerFn(createThread);
  const saveSearchFn = useServerFn(saveSearch);
  const listSavedSearchesFn = useServerFn(listSavedSearches);
  const listBookmarksFn = useServerFn(listBookmarks);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const threadsQ = useQuery({
    queryKey: ["threads"],
    queryFn: () => listThreadsFn(),
  });

  const savedSearchesQ = useQuery<SavedSearch[]>({
    queryKey: ["savedSearches"],
    queryFn: () => listSavedSearchesFn(),
  });

  const bookmarksQ = useQuery<BookmarkItem[]>({
    queryKey: ["bookmarks"],
    queryFn: () => listBookmarksFn(),
  });

  const profileQ = useQuery<ProfileData | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name,avatar_url,location,education_level,sector_interests")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return { ...(data ?? {}), email: user.email ?? null } as ProfileData;
    },
  });

  const profileCompletion = useMemo(() => {
    const p = profileQ.data;
    if (!p) return 0;
    const checks = [!!p.location, !!p.education_level, !!(p.sector_interests && p.sector_interests.length > 0)];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profileQ.data]);

  const identityLabel = profileQ.data?.display_name || profileQ.data?.email || "Account";

  const recommendations = useMemo(() => {
    const profile = profileQ.data;
    if (!profile) return [];
    const { location, education_level } = profile;
    const sectors = profile.sector_interests ?? [];
    const items: { title: string; description: string; href?: string }[] = [];

    if (!location && !education_level && sectors.length === 0) {
      return [
        {
          title: "Finish your profile",
          description: "Add your location, education level, and sector interests to unlock tailored opportunities.",
          href: "/profile",
        },
      ];
    }

    if (sectors.includes("Education")) {
      items.push({
        title: `Scholarships and bursaries${location ? ` near ${location}` : ""}`,
        description: `Opportunities for ${education_level ?? "students"} in education and professional training.`,
      });
    }
    if (sectors.includes("Health")) {
      items.push({
        title: `Health grants and programs${location ? ` in ${location}` : ""}`,
        description: "Find health support, free treatment programs and medical subsidies in your area.",
      });
    }
    if (sectors.includes("Agriculture")) {
      items.push({
        title: `Agriculture support and subsidies${location ? ` in ${location}` : ""}`,
        description: "Explore farming grants, input support and youth agriculture programs.",
      });
    }
    if (sectors.includes("Jobs")) {
      items.push({
        title: `Jobs and internships${location ? ` in ${location}` : ""}`,
        description: "Target entry-level jobs, graduate roles, and local internships that match your goals.",
      });
    }
    if (sectors.includes("Grants")) {
      items.push({
        title: `Grants for entrepreneurs${education_level ? ` with ${education_level}` : ""}`,
        description: "Apply for small business grants and finance opportunities based on your profile.",
      });
    }
    if (sectors.includes("Loans")) {
      items.push({
        title: `Loans and funding${location ? ` for ${location}` : ""}`,
        description: "Get matched with affordable loan schemes and finance programs for your sector.",
      });
    }
    if (sectors.includes("Technology")) {
      items.push({
        title: "Tech training and startup support",
        description: "Programs for young creators, coders, and tech founders in Nigeria.",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Explore new opportunities",
        description: "Select your sector interests in your profile to get personalized recommendations.",
        href: "/profile",
      });
    }

    return items.slice(0, 5);
  }, [profileQ.data]);

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

  async function saveCurrentSearch() {
    const cleaned = q.trim();
    if (!cleaned) return;
    setSavingSearch(true);
    setSearchMessage(null);
    try {
      await saveSearchFn({ data: { query: cleaned, title: cleaned.slice(0, 120) } });
      qc.invalidateQueries({ queryKey: ["savedSearches"] });
      setSearchMessage("Search saved.");
    } catch (e) {
      setSearchMessage(e instanceof Error ? e.message : "Unable to save search.");
    } finally {
      setSavingSearch(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    start(q);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 border-b border-sidebar-border p-5 font-display text-lg">
          <LogoMark /> CommunityConnect
        </Link>
        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => start("Show me new opportunities I might qualify for")}
            disabled={busy}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 py-2.5 text-sm font-semibold text-sidebar-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
          >
            <Plus size={16} aria-hidden /> New search
          </button>
          <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] font-mono uppercase tracking-wider text-sidebar-foreground/60">
            <Clock size={12} aria-hidden /> Recent
          </div>
          {threadsQ.isLoading ? (
            <div className="space-y-1 px-2">
              <Skeleton className="h-8 w-full bg-sidebar-accent/60" />
              <Skeleton className="h-8 w-full bg-sidebar-accent/60" />
              <Skeleton className="h-8 w-full bg-sidebar-accent/60" />
            </div>
          ) : threadsQ.data?.length === 0 ? (
            <div className="px-2 py-3 text-xs text-sidebar-foreground/60">
              No searches yet — ask something to get started.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {threadsQ.data?.map((t) => (
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

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-green">
            <Sparkles size={13} aria-hidden /> Dashboard
          </div>
          <h1 className="mt-2 font-display text-4xl">
            {profileQ.data?.display_name
              ? `${getGreeting()}, ${profileQ.data.display_name}`
              : "What are you looking for today?"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {profileQ.data?.location
              ? `Based on your profile from ${profileQ.data.location}, here are opportunities that may suit you.`
              : "Ask about drugs, education, agriculture, health, internships, jobs, grants, loans, investment — anything."}
          </p>

          {profileQ.isLoading ? (
            <Skeleton className="mt-4 h-24 w-full rounded-3xl" />
          ) : profileQ.data ? (
            profileCompletion < 100 ? (
              <Link
                to="/profile"
                className="mt-4 flex flex-col gap-3 rounded-3xl border border-gold/40 bg-gold/10 p-4 text-sm transition-colors hover:border-gold sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-foreground">Your profile is {profileCompletion}% complete</div>
                  <p className="mt-0.5 text-muted-foreground">
                    Finish it to unlock recommendations tailored to you.
                  </p>
                  <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${profileCompletion}%` }} />
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                  Complete profile <ChevronRight size={14} aria-hidden />
                </span>
              </Link>
            ) : (
              <div className="mt-4 rounded-3xl border border-border bg-card p-4 text-sm text-foreground">
                <div className="font-medium">Your profile</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-green" aria-hidden />
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Location</div>
                      <div>{profileQ.data.location ?? "Not set"}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <GraduationCap size={15} className="mt-0.5 shrink-0 text-green" aria-hidden />
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Education</div>
                      <div>{profileQ.data.education_level ?? "Not set"}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tags size={15} className="mt-0.5 shrink-0 text-green" aria-hidden />
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Interests</div>
                      <div>{profileQ.data.sector_interests?.join(", ") ?? "Not set"}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm transition-shadow focus-within:shadow-md sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ask CommunityConnect AI…"
                  className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-green"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || !q.trim()}
                  className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Ask"}
                </button>
                <button
                  type="button"
                  onClick={saveCurrentSearch}
                  disabled={savingSearch || !q.trim()}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent/10 disabled:opacity-60"
                >
                  <Bookmark size={14} aria-hidden /> {savingSearch ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
            {searchMessage ? (
              <div className="rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                {searchMessage}
              </div>
            ) : null}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <Sparkles size={12} aria-hidden /> Recommended for you
              </div>
              <div className="grid gap-3">
                {profileQ.isLoading ? (
                  <>
                    <Skeleton className="h-20 w-full rounded-3xl" />
                    <Skeleton className="h-20 w-full rounded-3xl" />
                  </>
                ) : (
                  recommendations.map((item) =>
                    item.href ? (
                      <Link
                        key={item.title}
                        to={item.href}
                        className="group flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4 text-sm transition-colors hover:border-green"
                      >
                        <div>
                          <div className="font-semibold">{item.title}</div>
                          <p className="mt-2 text-muted-foreground">{item.description}</p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-green"
                          aria-hidden
                        />
                      </Link>
                    ) : (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => start(item.title)}
                        disabled={busy}
                        className="group flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4 text-left text-sm transition-colors hover:border-green disabled:opacity-60"
                      >
                        <div>
                          <div className="font-semibold">{item.title}</div>
                          <p className="mt-2 text-muted-foreground">{item.description}</p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-green"
                          aria-hidden
                        />
                      </button>
                    ),
                  )
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <MessageSquare size={12} aria-hidden /> Try one of these
                  </div>
                  <div className="text-xs text-muted-foreground">Save any query for later review.</div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => start(s)}
                    disabled={busy}
                    className="rounded-xl border border-border bg-card p-4 text-left text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-green hover:shadow-md disabled:opacity-60"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {threadsQ.data?.length ? (
                <div className="mt-6 rounded-3xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-1.5 font-medium">
                    <Clock size={14} className="text-muted-foreground" aria-hidden /> Recently viewed
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {threadsQ.data.slice(0, 5).map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => navigate({ to: "/chat/$threadId", params: { threadId: thread.id } })}
                        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-green"
                      >
                        <span className="truncate text-foreground">{thread.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {savedSearchesQ.data?.length ? (
                <div className="mt-6 rounded-3xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-1.5 font-medium">
                    <Bookmark size={14} className="text-muted-foreground" aria-hidden /> Saved searches
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {savedSearchesQ.data.map((search) => (
                      <button
                        key={search.id}
                        type="button"
                        onClick={() => start(search.query)}
                        disabled={busy}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-green disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-medium text-foreground">{search.title || search.query}</div>
                          <span className="shrink-0 text-xs text-muted-foreground/70">
                            {formatRelativeTime(search.created_at)}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{search.query}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {bookmarksQ.data?.length ? (
                <div className="mt-6 rounded-3xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-1.5 font-medium">
                    <Star size={14} className="text-muted-foreground" aria-hidden /> Saved results
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {bookmarksQ.data.map((bookmark) => (
                      <div key={bookmark.id} className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-foreground">{bookmark.title || "Saved result"}</div>
                          <span className="shrink-0 text-xs text-muted-foreground/70">
                            {formatRelativeTime(bookmark.created_at)}
                          </span>
                        </div>
                        {bookmark.excerpt ? <div className="mt-1 text-xs text-muted-foreground">{bookmark.excerpt}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
