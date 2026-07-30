import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LEARNING_LINKS } from "@/lib/opportunities";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Career Resources for Nigerians — CommunityConnect AI" },
      {
        name: "description",
        content:
          "CV templates, interview prep, scholarship essay guides, NYSC tips and free skill-building links for Nigerian students and graduates.",
      },
      { property: "og:title", content: "Career Resources for Nigerians — CommunityConnect AI" },
      {
        property: "og:description",
        content: "Guides on CVs, interviews, scholarship essays, NYSC and free skill-building resources.",
      },
    ],
  }),
  component: Resources,
});

const GUIDES = [
  {
    title: "Write a Nigerian-standard CV",
    body: "One to two pages, reverse-chronological, NYSC status stated clearly, and achievements written with numbers. Skip photos and marital status.",
    points: [
      "Header: name, city + state, phone (WhatsApp), email, LinkedIn",
      "Profile: 2 lines on what you do and the value you bring",
      "Experience: verb + task + measurable result",
      "Education: institution, degree, class of degree, year",
      "Add SIWES, NYSC PPA and volunteer roles as real experience",
    ],
  },
  {
    title: "Pass the interview",
    body: "Most Nigerian graduate interviews mix aptitude tests with competency questions. Prepare stories, not scripts.",
    points: [
      "Use STAR: Situation, Task, Action, Result",
      "Research the organisation's recent projects and leadership",
      "Practice aptitude tests (numerical, verbal, abstract) under time",
      "Prepare two questions to ask at the end",
      "Confirm the format: in-person, Zoom, or assessment centre",
    ],
  },
  {
    title: "Win the scholarship essay",
    body: "Selection panels read thousands of essays. Specificity is what stands out.",
    points: [
      "Answer the exact prompt in your first paragraph",
      "One concrete story beats three general claims",
      "Connect your goal to community impact in Nigeria",
      "Name the course, institution and how funding changes your outcome",
      "Proofread and stay within the word limit",
    ],
  },
  {
    title: "Make NYSC count",
    body: "Your service year is a full year of experience if you use it deliberately.",
    points: [
      "Choose a PPA aligned to your target industry when possible",
      "Run a CDS project you can describe on your CV",
      "Build one marketable skill during the year",
      "Network with your PPA supervisors before passing out",
      "Apply for graduate trainee programmes from month eight",
    ],
  },
];

function Resources() {
  const skills = Object.entries(LEARNING_LINKS);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="gradient-hero border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <p className="eyebrow">Career resources</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
              Practical guides for the Nigerian job market
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Everything here is written for how hiring, scholarships and NYSC actually work here —
              not generic international advice.
            </p>
          </div>
        </div>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            {GUIDES.map((guide) => (
              <article key={guide.title} className="surface rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-foreground">{guide.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.body}</p>
                <ul className="mt-4 grid gap-2">
                  {guide.points.map((point) => (
                    <li key={point} className="text-sm text-foreground">
                      · {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Free skill-building links</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Curated starting points for the skills that appear most often in the opportunity catalogue.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map(([skill, url]) => (
                <li key={skill}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="surface surface-hover block rounded-xl p-4 text-sm font-medium text-foreground"
                  >
                    Learn {skill}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
