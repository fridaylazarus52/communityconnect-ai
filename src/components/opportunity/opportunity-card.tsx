import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Building2, CalendarClock, MapPin } from "lucide-react";
import {
  deadlineLabel,
  isClosingSoon,
  type MatchResult,
  type Opportunity,
} from "@/lib/opportunities";

function scoreTone(score: number) {
  if (score >= 75) return "bg-green text-primary-foreground";
  if (score >= 50) return "bg-green-soft text-green";
  return "bg-muted text-muted-foreground";
}

export function MatchRing({ score }: { score: number }) {
  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-[13px] font-bold ${scoreTone(score)}`}
      aria-label={`Match score ${score} out of 100`}
      title={`${score}% match`}
    >
      {score}
    </div>
  );
}

export function OpportunityCard({
  opportunity,
  match,
  saved,
  onToggleSave,
}: {
  opportunity: Opportunity;
  match?: MatchResult;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const closing = isClosingSoon(opportunity.deadline);

  return (
    <article className="surface surface-hover animate-fade-up flex h-full flex-col gap-4 rounded-2xl p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-green-soft px-2.5 py-1 text-[11px] font-semibold text-green">
              {opportunity.category}
            </span>
            {opportunity.featured && (
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                Featured
              </span>
            )}
            {closing && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                Closing soon
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
            {opportunity.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{opportunity.organisation}</span>
          </p>
        </div>
        {match ? <MatchRing score={match.score} /> : null}
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {opportunity.summary}
      </p>

      {match && match.reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {match.reasons.slice(0, 3).map((reason) => (
            <li
              key={reason.label}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {reason.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto grid gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {opportunity.location}
            {opportunity.work_mode ? ` · ${opportunity.work_mode}` : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {deadlineLabel(opportunity.deadline)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/opportunities/$opportunityId"
            params={{ opportunityId: opportunity.id }}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            View details
          </Link>
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(opportunity.id)}
              aria-label={saved ? "Remove from saved" : "Save opportunity"}
              aria-pressed={saved}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-green hover:text-green"
            >
              {saved ? (
                <BookmarkCheck className="h-4 w-4 text-green" aria-hidden />
              ) : (
                <Bookmark className="h-4 w-4" aria-hidden />
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
