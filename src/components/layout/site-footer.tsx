import { Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="text-base font-bold tracking-tight">CommunityConnect AI</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Helping Nigerian students, graduates, NYSC members and early-career professionals find
            the scholarships, jobs and grants that actually fit them.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Built in Nigeria 🇳🇬 for Nigerian talent.</p>
        </div>

        <FooterCol
          title="Platform"
          links={[
            { to: "/opportunities", label: "Opportunities" },
            { to: "/assistant", label: "AI Career Assistant" },
            { to: "/dashboard", label: "Dashboard" },
            { to: "/applications", label: "Application Tracker" },
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            { to: "/resources", label: "Career Resources" },
            { to: "/onboarding", label: "Build your profile" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
          ]}
        />
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} CommunityConnect AI. Opportunity data is provided for guidance —
        always confirm details on the official organisation website.
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">{title}</h3>
      <ul className="mt-3 grid gap-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-green"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
