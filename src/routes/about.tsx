import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CommunityConnect AI — Opportunity access for Nigeria" },
      {
        name: "description",
        content:
          "Why CommunityConnect AI exists: closing the information gap between Nigerian talent and the scholarships, jobs and grants they qualify for.",
      },
      { property: "og:title", content: "About CommunityConnect AI" },
      {
        property: "og:description",
        content: "Closing the opportunity information gap for Nigerian students, graduates and NYSC members.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="gradient-hero border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <p className="eyebrow">Our mission</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
              Opportunity should not depend on who you know
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Thousands of scholarships, graduate programmes, grants and internships open in Nigeria
              every year. Most go unclaimed by the people who qualify for them — not because they
              aren't capable, but because nobody told them in time.
            </p>
          </div>
        </div>

        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-black tracking-tight text-foreground">What we do</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            CommunityConnect AI collects Nigerian opportunities into a single catalogue, scores each
            one against your profile, and explains the reasoning. An AI career assistant sits on top
            of that data to answer the follow-up questions — eligibility, documents, CV structure,
            NYSC timing, salary expectations — in plain language.
          </p>

          <h2 className="mt-10 text-2xl font-black tracking-tight text-foreground">Principles</h2>
          <ul className="mt-4 grid gap-4">
            {[
              ["Explainable, not magical", "Every match score shows the skills, state and status that produced it."],
              ["Nigeria-first", "States, NYSC, SIWES, JAMB, naira compensation and federal schemes are first-class."],
              ["Free to start", "Discovery, matching and the assistant are usable without paying."],
              ["Respectful of data", "Your profile is yours; it is used to match you, not to sell you."],
            ].map(([title, body]) => (
              <li key={title} className="surface rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>

          <div className="surface mt-12 rounded-3xl p-8 text-center">
            <h2 className="text-xl font-black tracking-tight text-foreground">Ready to find your fit?</h2>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-5 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Create your free profile
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
