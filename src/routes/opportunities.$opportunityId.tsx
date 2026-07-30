import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MatchRing } from "@/components/opportunity/opportunity-card";
import { supabase } from "@/integrations/supabase/client";
import {
  useOpportunities,
  useProfile,
  useSavedOpportunities,
  useSession,
} from "@/hooks/use-career-data";
import { useToggleSaved } from "@/hooks/use-save-opportunity";
import { LEARNING_LINKS, deadlineLabel, scoreOpportunity } from "@/lib/opportunities";

export const Route = createFileRoute("/opportunities/$opportunityId")({
  head: () => ({
    meta: [
      { title: "Opportunity details — CommunityConnect AI" },
      {
        name: "description",
        content:
          "Full details, eligibility, required skills and deadline for this Nigerian opportunity, plus your personal match breakdown.",
      },
      { property: "og:title", content: "Opportunity details — CommunityConnect AI" },
      {
        property: "og:description",
        content: "See eligibility, skills and your match breakdown for this Nigerian opportunity.",
      },
    ],
  }),
  component: OpportunityDetail,
});

function OpportunityDetail() {
  const { opportunityId } = useParams({ from: "/opportunities/$opportunityId" });
  const { user } = useSession();
  const opportunitiesQ = useOpportunities();
  const profileQ = useProfile(user?.id);
  const savedQ = useSavedOpportunities(user?.id);
  const savedIds = savedQ.data ?? [];
  const toggleSaved = useToggleSaved(user?.id, savedIds);
  const qc = useQueryClient();

  const opportunity = (opportunitiesQ.data ?? []).find((o) => o.id === opportunityId);
  const match = opportunity ? scoreOpportunity(opportunity, profileQ.data ?? null) : null;

  const trackMutation = useMutation({
    mutationFn: async () => {
      if (!user || !opportunity) throw new Error("Sign in to track applications.");
      const { error } = await supabase.from("applications").insert({
        user_id: user.id,
        opportunity_id: opportunity.id,
        title: opportunity.title,
        organisation: opportunity.organisation,
        deadline: opportunity.deadline,
        status: "interested",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications", user?.id] });
      toast.success("Added to your application tracker");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (opportunitiesQ.isLoading) {
    return (
      <Shell>
        <div className="skeleton-shimmer h-80 rounded-3xl" />
      </Shell>
    );
  }

  if (!opportunity) {
    return (
      <Shell>
        <h1 className="text-2xl font-black text-foreground">Opportunity not found</h1>
        <Link to="/opportunities" className="mt-4 inline-block text-sm font-semibold text-green hover:underline">
          Back to all opportunities
        </Link>
      </Shell>
    );
  }

  const saved = savedIds.includes(opportunity.id);

  return (
    <Shell>
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-green"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All opportunities
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <article className="surface rounded-3xl p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-green-soft px-3 py-1 text-[11px] font-semibold text-green">
              {opportunity.category}
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
              {deadlineLabel(opportunity.deadline)}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-foreground">
            {opportunity.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {opportunity.organisation} · {opportunity.location} · {opportunity.work_mode}
          </p>

          <p className="mt-6 text-sm leading-relaxed text-foreground">{opportunity.summary}</p>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Skills in demand
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {opportunity.skills.map((skill) => (
              <li key={skill} className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground">
                {skill}
              </li>
            ))}
          </ul>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <Detail label="Experience level" value={opportunity.experience_levels.join(", ") || "Open"} />
            <Detail label="Industry" value={opportunity.industry ?? "Multiple"} />
            <Detail
              label="Compensation"
              value={opportunity.compensation ?? (opportunity.is_paid ? "Paid" : "Not stated")}
            />
            <Detail label="Deadline" value={deadlineLabel(opportunity.deadline)} />
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            {opportunity.apply_url && (
              <a
                href={opportunity.apply_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Apply on official site <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
            {user && (
              <>
                <button
                  onClick={() => trackMutation.mutate()}
                  disabled={trackMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-green disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Track application
                </button>
                <button
                  onClick={() => toggleSaved(opportunity.id)}
                  aria-pressed={saved}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-green"
                >
                  {saved ? (
                    <>
                      <BookmarkCheck className="h-4 w-4 text-green" aria-hidden /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4" aria-hidden /> Save
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </article>

        <aside className="grid content-start gap-5">
          <div className="surface rounded-3xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Your match
            </h2>
            {profileQ.data && match ? (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <MatchRing score={match.score} />
                  <p className="text-sm text-muted-foreground">
                    Based on your skills, state, study level and interests.
                  </p>
                </div>
                <ul className="mt-5 grid gap-2">
                  {match.reasons.map((reason) => (
                    <li key={reason.label} className="text-sm text-foreground">
                      · {reason.label}
                    </li>
                  ))}
                </ul>
                {match.missingSkills.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Skills to build
                    </h3>
                    <ul className="mt-2 grid gap-2">
                      {match.missingSkills.map((skill) => (
                        <li key={skill} className="text-sm">
                          {LEARNING_LINKS[skill] ? (
                            <a
                              href={LEARNING_LINKS[skill]}
                              target="_blank"
                              rel="noreferrer"
                              className="text-green hover:underline"
                            >
                              Learn {skill}
                            </a>
                          ) : (
                            <span className="text-foreground">{skill}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                <Link to="/auth" className="font-semibold text-green hover:underline">
                  Sign in
                </Link>{" "}
                and complete your profile to see a personalised match breakdown.
              </p>
            )}
          </div>

          <div className="surface rounded-3xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Not sure if you qualify?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask the AI Career Assistant about eligibility, documents and how to write a strong
              application for this opportunity.
            </p>
            <Link
              to="/assistant"
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ask the assistant
            </Link>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
