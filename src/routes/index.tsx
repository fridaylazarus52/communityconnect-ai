import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, LineChart, MessagesSquare, ShieldCheck, Sparkle, Target } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { OpportunityCard } from "@/components/opportunity/opportunity-card";
import { AskAssistant } from "@/components/assistant/ask-assistant";
import { useOpportunities } from "@/hooks/use-career-data";

const HOME_PROMPTS = [
  "Undergraduate scholarships for 2026 intake",
  "Graduate trainee jobs in Lagos for a fresh graduate",
  "Grants for a small agribusiness in Oyo State",
  "How do I prepare for a Nigerian bank aptitude test?",
];


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CommunityConnect AI — Nigerian Career & Opportunity Platform" },
      {
        name: "description",
        content:
          "Find scholarships, jobs, internships and grants across Nigeria, matched to your skills, state and study level by an AI career assistant.",
      },
      { property: "og:title", content: "CommunityConnect AI — Nigerian Career & Opportunity Platform" },
      {
        property: "og:description",
        content:
          "Personalised scholarships, jobs, internships and grants for Nigerian students, graduates and NYSC members.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: Compass,
    title: "Tell us about you",
    body: "Two minutes of guided onboarding: your state, study level, skills and what you're looking for.",
  },
  {
    icon: Target,
    title: "Get matched",
    body: "Every opportunity is scored 0–100 against your profile, with clear reasons for the match.",
  },
  {
    icon: LineChart,
    title: "Apply and track",
    body: "Save opportunities, track applications from interested to offer, and never miss a deadline.",
  },
];

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "AI Career Assistant",
    body: "Ask about JAMB, NYSC, CV structure, salary ranges or which scholarship suits you — in English or Pidgin.",
  },
  {
    icon: Sparkle,
    title: "Explainable matching",
    body: "No black boxes. See exactly which skills, states and deadlines drove each recommendation.",
  },
  {
    icon: ShieldCheck,
    title: "Nigeria-first data",
    body: "Federal schemes, state bursaries, graduate trainee programmes and tech bootcamps in one catalogue.",
  },
];

function Landing() {
  const opportunitiesQ = useOpportunities();
  const featured = (opportunitiesQ.data ?? []).slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="gradient-hero relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
            <div className="animate-fade-up">
              <p className="eyebrow">Built for Nigerian talent</p>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Every opportunity you qualify for, <span className="gradient-text">in one place</span>.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                CommunityConnect AI matches Nigerian students, graduates, NYSC members and
                early-career professionals to scholarships, jobs, internships and grants — and
                explains why each one fits.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  Start free <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/opportunities"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-green"
                >
                  Browse opportunities
                </Link>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
                {[
                  ["36+", "States covered"],
                  ["10", "Opportunity types"],
                  ["0–100", "Match scoring"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-2xl font-black text-foreground">{value}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="animate-fade-up surface rounded-3xl p-6 lg:mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Live match preview
              </p>
              <div className="mt-4 grid gap-3">
                {opportunitiesQ.isLoading
                  ? [0, 1, 2].map((i) => (
                      <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
                    ))
                  : featured.map((opportunity) => (
                      <div key={opportunity.id} className="rounded-2xl border border-border p-4">
                        <p className="text-sm font-semibold text-foreground">{opportunity.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {opportunity.organisation} · {opportunity.location}
                        </p>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
          <h2 className="text-3xl font-black tracking-tight text-foreground">Ask the AI assistant</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap a suggestion — you'll get an answer straight away, no sign-in needed.
          </p>
          <AskAssistant className="mt-6" prompts={HOME_PROMPTS} />
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">

          <h2 className="text-3xl font-black tracking-tight text-foreground">How it works</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="surface rounded-2xl p-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-soft text-green">
                  <step.icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-4 text-xs font-semibold text-muted-foreground">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              Designed for real Nigerian career journeys
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-border bg-background p-6">
                  <feature.icon className="h-5 w-5 text-green" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <h2 className="text-3xl font-black tracking-tight text-foreground">Opportunities open now</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A snapshot of the catalogue — sign in to see them scored against your profile.
              </p>
            </div>
            <Link to="/opportunities" className="text-sm font-semibold text-green hover:underline">
              See all
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {opportunitiesQ.isLoading
              ? [0, 1, 2].map((i) => <div key={i} className="skeleton-shimmer h-64 rounded-2xl" />)
              : featured.map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <div className="gradient-hero surface rounded-3xl p-10 text-center">
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              Your next opportunity is already out there
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Build your profile once and let CommunityConnect AI keep matching you as new
              scholarships, jobs and grants open.
            </p>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              Create your free profile <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
