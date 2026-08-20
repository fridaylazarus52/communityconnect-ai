import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { OpportunityCard } from "@/components/opportunity/opportunity-card";
import {
  useOpportunities,
  useProfile,
  useSavedOpportunities,
  useSession,
} from "@/hooks/use-career-data";
import { useToggleSaved } from "@/hooks/use-save-opportunity";
import { CATEGORIES, NIGERIAN_STATES, scoreOpportunity } from "@/lib/opportunities";

export const Route = createFileRoute("/opportunities/")({
  head: () => ({
    meta: [
      { title: "Opportunities in Nigeria — CommunityConnect AI" },
      {
        name: "description",
        content:
          "Browse scholarships, jobs, internships, grants and government programmes across Nigeria, filtered by state, category and deadline.",
      },
      { property: "og:title", content: "Opportunities in Nigeria — CommunityConnect AI" },
      {
        property: "og:description",
        content: "Filter Nigerian scholarships, jobs, internships and grants matched to your profile.",
      },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  const { user } = useSession();
  const opportunitiesQ = useOpportunities();
  const profileQ = useProfile(user?.id);
  const savedQ = useSavedOpportunities(user?.id);
  const savedIds = savedQ.data ?? [];
  const toggleSaved = useToggleSaved(user?.id, savedIds);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [state, setState] = useState("All");
  const [sort, setSort] = useState<"match" | "deadline">("match");

  const results = useMemo(() => {
    const profile = profileQ.data ?? null;
    const items = (opportunitiesQ.data ?? [])
      .filter((o) => (category === "All" ? true : o.category === category))
      .filter((o) => (state === "All" ? true : o.state === state || o.state === "Nationwide"))
      .filter((o) => {
        if (!query.trim()) return true;
        const haystack = `${o.title} ${o.organisation} ${o.summary} ${o.skills.join(" ")}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      })
      .map((o) => ({ opportunity: o, match: scoreOpportunity(o, profile) }));

    items.sort((a, b) => {
      if (sort === "deadline") {
        const av = a.opportunity.deadline ? new Date(a.opportunity.deadline).getTime() : Infinity;
        const bv = b.opportunity.deadline ? new Date(b.opportunity.deadline).getTime() : Infinity;
        return av - bv;
      }
      return b.match.score - a.match.score;
    });
    return items;
  }, [opportunitiesQ.data, profileQ.data, category, state, query, sort]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="gradient-hero border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <p className="eyebrow">Opportunity catalogue</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
              Find what you actually qualify for
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {profileQ.data
                ? "Sorted by how well each opportunity matches your profile."
                : "Sign in and complete onboarding to see personalised match scores."}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="surface grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <label className="relative min-w-0">
              <span className="sr-only">Search opportunities</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, organisation or skill"
                className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-green"
              />
            </label>

            <Select label="Category" value={category} onChange={setCategory} options={["All", ...CATEGORIES]} />
            <Select label="State" value={state} onChange={setState} options={["All", ...NIGERIAN_STATES]} />
            <Select
              label="Sort"
              value={sort}
              onChange={(v) => setSort(v as "match" | "deadline")}
              options={["match", "deadline"]}
              display={{ match: "Best match", deadline: "Closing soonest" }}
            />
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {opportunitiesQ.isLoading ? "Loading opportunities…" : `${results.length} opportunities`}
          </p>

          <div className="mt-5 grid gap-5 pb-16 md:grid-cols-2 lg:grid-cols-3">
            {opportunitiesQ.isLoading
              ? [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton-shimmer h-72 rounded-2xl" />)
              : results.map(({ opportunity, match }) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    match={profileQ.data ? match : undefined}
                    saved={savedIds.includes(opportunity.id)}
                    onToggleSave={user ? toggleSaved : undefined}
                  />
                ))}
          </div>

          {!opportunitiesQ.isLoading && results.length === 0 && (
            <p className="pb-20 text-sm text-muted-foreground">
              No opportunities match those filters yet. Try widening the state or category.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  display,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  display?: Record<string, string>;
}) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-green md:w-44"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {display?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
