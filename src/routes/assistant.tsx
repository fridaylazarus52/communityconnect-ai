import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AskAssistant } from "@/components/assistant/ask-assistant";
import { createThread, listThreads } from "@/lib/chat.functions";
import { useSession } from "@/hooks/use-career-data";


export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Career Assistant for Nigerians — CommunityConnect AI" },
      {
        name: "description",
        content:
          "Ask an AI career assistant about scholarships, NYSC, CVs, interviews and Nigerian job opportunities — in English or Pidgin.",
      },
      { property: "og:title", content: "AI Career Assistant — CommunityConnect AI" },
      {
        property: "og:description",
        content: "Career guidance for Nigerian students, graduates and NYSC members, powered by AI.",
      },
    ],
  }),
  component: Assistant,
});

const PROMPTS = [
  "Which scholarships can I apply for as a 300-level student in Kano?",
  "Rewrite my CV summary for a graduate trainee role in banking",
  "What grants exist for a small agribusiness in Oyo State?",
  "How do I prepare for an aptitude test at a Nigerian bank?",
];

function Assistant() {
  const { isAuthed, ready } = useSession();
  const navigate = useNavigate();
  const create = useServerFn(createThread);
  const [creating, setCreating] = useState(false);

  const threadsQ = useQuery({
    queryKey: ["threads"],
    enabled: isAuthed,
    queryFn: () => listThreads(),
  });

  async function openFullAssistant() {
    if (!isAuthed || creating) return;
    const existing = threadsQ.data?.[0];
    if (existing) {
      navigate({ to: "/chat/$threadId", params: { threadId: existing.id } });
      return;
    }
    setCreating(true);
    try {
      const thread = await create({ data: {} });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 sm:px-6">
        <p className="eyebrow">AI Career Assistant</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
          Career guidance that understands Nigeria
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Ask about scholarships, NYSC timing, CV structure, salary ranges or how to strengthen an
          application. Tap a suggestion to get an answer instantly.
        </p>

        <AskAssistant className="mt-8" prompts={PROMPTS} />

        <div className="mt-8 flex flex-wrap gap-3">
          {isAuthed && ready ? (
            <button
              type="button"
              onClick={openFullAssistant}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-green disabled:opacity-60"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden />
              {creating ? "Opening…" : "Continue in your saved chats"}
            </button>
          ) : null}
          {!isAuthed && ready && (
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden /> Save your chats free
            </Link>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

