import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createThread, listThreads, saveSearch, listSavedSearches, listBookmarks } from "@/lib/chat.functions";
import { LogoMark } from "@/components/brand/logo";

type ProfileData = {
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  education_level: string | null;
  sector_interests: string[] | null;
};

type SavedSearch = {
  id: string;
  query: string;
  title: string | null;
  created_at: string;
};

type Bookmark = {
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

  const bookmarksQ = useQuery<Bookmark[]>({
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
      return (data ?? null) as ProfileData | null;
    },
  });

  const recommendations = useMemo(() => {
    const profile = profileQ.data;
    if (!profile) return [];
    const { location, education_level, sector_interests } = profile;
    const sectors = profile.sector_interests ?? [];
    const items: { title: string; description: string }[] = [];

    if (!location && !education_level && sectors.length === 0) {
      return [
        {
          title: "Finish your profile",
          description: "Add your location, education level, and sector interests to unlock tailored opportunities.",
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
      });
    }

    return items.slice(0, 5);
  }, [profileQ.data]);

  async function start(query: string) {
    const cleaned = query.trim();
    if (!cleaned) return;
    setBusy(true);
    try {
      const thread = await createThreadFn({ data: { title: "New search" } });
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
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 border-b border-sidebar-border p-5 font-display text-lg">
          <LogoMark /> CommunityConnect
        </Link>
        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => start("Show me new opportunities I might qualify for")}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 py-2 text-sm font-semibold text-sidebar-primary-foreground hover:opacity-90"
          >
            + New search
          </button>
          <div className="px-2 py-2 text-[11px] font-mono uppercase tracking-wider text-sidebar-foreground/60">
            Recent
          </div>
          {threadsQ.data?.length === 0 && (
            <div className="px-2 py-3 text-xs text-sidebar-foreground/60">No searches yet.</div>
          )}
          <ul className="space-y-0.5">
            {threadsQ.data?.map((t) => (
              <li key={t.id}>
                <Link
                  to="/chat/$threadId"
                  params={{ threadId: t.id }}
                  className="block truncate rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
                >
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
          <Link
            to="/profile"
            className="mb-3 block rounded-full border border-border bg-card px-4 py-2 text-sm text-left text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Edit profile
          </Link>
          <button
            onClick={signOut}
            className="border-t border-sidebar-border p-4 text-left text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            Sign out
          </button>
        </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="font-mono text-xs uppercase tracking-wider text-green">Dashboard</div>
          <h1 className="mt-2 font-display text-4xl">
            {profileQ.data?.display_name ? `Welcome back, ${profileQ.data.display_name}` : "What are you looking for today?"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {profileQ.data?.location
              ? `Based on your profile from ${profileQ.data.location}, here are opportunities that may suit you.`
              : "Ask about drugs, education, agriculture, health, internships, jobs, grants, loans, investment — anything."}
          </p>
          {profileQ.data ? (
            <div className="mt-4 rounded-3xl border border-border bg-card p-4 text-sm text-foreground">
              <div className="font-medium">Your profile</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Location</div>
                  <div>{profileQ.data.location ?? "Not set"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Education</div>
                  <div>{profileQ.data.education_level ?? "Not set"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Interests</div>
                  <div>{profileQ.data.sector_interests?.join(", ") ?? "Not set"}</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask CommunityConnect AI…"
                className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-green"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Ask"}
                </button>
                <button
                  type="button"
                  onClick={saveCurrentSearch}
                  disabled={savingSearch || !q.trim()}
                  className="rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent/10 disabled:opacity-60"
                >
                  {savingSearch ? "Saving…" : "Save"}
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
              <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Recommended for you
              </div>
              <div className="grid gap-3">
                {recommendations.map((item) => (
                  <div key={item.title} className="rounded-3xl border border-border bg-card p-4 text-sm">
                    <div className="font-semibold">{item.title}</div>
                    <p className="mt-2 text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Try one of these
                  </div>
                  <div className="text-xs text-muted-foreground">Save any query for later review.</div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => start(s)}
                    className="rounded-xl border border-border bg-card p-4 text-left text-sm hover:border-green"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {threadsQ.data?.length ? (
                <div className="mt-6 rounded-3xl border border-border bg-card p-4">
                  <div className="mb-3 font-medium">Recently viewed</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {threadsQ.data.slice(0, 5).map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => navigate({ to: "/chat/$threadId", params: { threadId: thread.id } })}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left hover:border-green"
                      >
                        {thread.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {savedSearchesQ.data?.length ? (
                <div className="mt-6 rounded-3xl border border-border bg-card p-4">
                  <div className="mb-3 font-medium">Saved searches</div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {savedSearchesQ.data.map((search) => (
                      <button
                        key={search.id}
                        type="button"
                        onClick={() => start(search.query)}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left hover:border-green"
                      >
                        <div className="font-medium text-foreground">{search.title || search.query}</div>
                        <div className="text-xs text-muted-foreground">{search.query}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {bookmarksQ.data?.length ? (
                <div className="mt-6 rounded-3xl border border-border bg-card p-4">
                  <div className="mb-3 font-medium">Saved results</div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {bookmarksQ.data.map((bookmark) => (
                      <div key={bookmark.id} className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="font-medium text-foreground">{bookmark.title || "Saved result"}</div>
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
