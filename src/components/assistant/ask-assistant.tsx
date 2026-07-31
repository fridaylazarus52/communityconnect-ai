import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LOADING_PHASES = ["Thinking…", "Finding opportunities…", "Analysing your request…"];

export function AskAssistant({
  prompts,
  className = "",
  placeholder = "Ask about scholarships, jobs, NYSC, grants…",
}: {
  prompts: string[];
  className?: string;
  placeholder?: string;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const headers: Record<string, string> = {};
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (token) headers.Authorization = `Bearer ${token}`;
          } catch {
            /* anonymous is fine */
          }
          return { body: { messages, ...(body ?? {}) }, headers };
        },
      }),
    [],
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { messages, sendMessage, status } = useChat({
    id: "inline-assistant",
    transport,
    onError: () =>
      setErrorMessage("We couldn't generate a response right now. Please try again."),
  });

  const [input, setInput] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);
  const answerRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";
  const inFlightRef = useRef(false);

  // Single shared submit path for the Ask button, Enter key and prompt cards.
  const submitPrompt = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || inFlightRef.current) return;
      inFlightRef.current = true;
      setErrorMessage(null);
      setInput(text);
      setActivePrompt(text);
      setPhase(0);
      void Promise.resolve(sendMessage({ text })).catch(() => {
        setErrorMessage("We couldn't generate a response right now. Please try again.");
      });
    },
    [sendMessage],
  );

  // Release the in-flight lock whenever the stream settles.
  useEffect(() => {
    if (!isLoading) inFlightRef.current = false;
  }, [isLoading]);

  // Rotating loading copy.
  useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => setPhase((p) => (p + 1) % LOADING_PHASES.length), 1400);
    return () => clearInterval(id);
  }, [isLoading]);

  // Smooth scroll to the answer as soon as it starts arriving.
  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  return (
    <div className={className}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitPrompt(input);
        }}
        className="surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label="Ask the AI career assistant"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-green"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {isLoading ? "Working…" : "Ask"}
        </button>
      </form>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {prompts.map((prompt) => {
          const selected = activePrompt === prompt;
          return (
            <li key={prompt}>
              <button
                type="button"
                onClick={() => submitPrompt(prompt)}
                disabled={isLoading}
                aria-pressed={selected}
                className={`surface w-full rounded-2xl p-5 text-left text-sm text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected ? "border-green ring-2 ring-green/40" : "hover:border-green"
                }`}
              >
                “{prompt}”
              </button>
            </li>
          );
        })}
      </ul>

      <div ref={answerRef} className="scroll-mt-24">
        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {isLoading && messages.filter((m) => m.role === "assistant").length === 0 ? (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green" style={{ animationDelay: "0.15s" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green" style={{ animationDelay: "0.3s" }} />
            <span className="ml-2">{LOADING_PHASES[phase]}</span>
          </div>
        ) : null}

        {messages.length > 0 ? (
          <ul className="mt-6 space-y-5">
            {messages.map((m) => (
              <li key={m.id}>
                {m.role === "user" ? (
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    You asked: {partsToText(m)}
                  </p>
                ) : (
                  <div className="chat-prose surface rounded-2xl p-5 text-[15px] text-foreground">
                    <ReactMarkdown>{partsToText(m)}</ReactMarkdown>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function partsToText(message: UIMessage) {
  return (message.parts ?? [])
    .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
    .join("");
}
