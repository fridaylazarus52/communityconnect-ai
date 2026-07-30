// src/routes/chat.$threadId.tsx

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { getThreadMessages, listThreads, createThread, deleteThread, saveBookmark } from "@/lib/chat.functions";
import { LogoMark } from "@/components/brand/logo";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatPage,
});

type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: unknown;
  created_at: string;
};

function ChatPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getMessagesFn = useServerFn(getThreadMessages);
  const listThreadsFn = useServerFn(listThreads);
  const createThreadFn = useServerFn(createThread);
  const deleteThreadFn = useServerFn(deleteThread);
  const [isAuthed, setIsAuthed] = useState<boolean | undefined>(undefined);

  const threadQ = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => getMessagesFn({ data: { threadId } }),
    enabled: isAuthed === true,
  });
  const threadsQ = useQuery({
    queryKey: ["threads"],
    queryFn: () => listThreadsFn(),
    enabled: isAuthed === true,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setIsAuthed(!!data.session);
      } catch (err) {
        if (!mounted) return;
        setIsAuthed(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const initialMessages = useMemo<UIMessage[]>(() => {
    return (threadQ.data?.messages ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: (Array.isArray(m.parts) ? m.parts : [{ type: "text", text: String(m.parts) }]) as UIMessage["parts"],
    }));
  }, [threadQ.data]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        threads={threadsQ.data ?? []}
        activeId={threadId}
        onNew={async () => {
          if (!isAuthed) {
            navigate({ to: "/auth" });
            return;
          }
          const t = await createThreadFn({ data: { title: "New search" } });
          qc.invalidateQueries({ queryKey: ["threads"] });
          navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
        }}
        onDelete={async (id) => {
          if (!isAuthed) {
            navigate({ to: "/auth" });
            return;
          }
          await deleteThreadFn({ data: { threadId: id } });
          qc.invalidateQueries({ queryKey: ["threads"] });
          if (id === threadId) navigate({ to: "/dashboard" });
        }}
      />
      {threadQ.isLoading ? (
        <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <ChatWindow
          key={threadId}
          threadId={threadId}
          initialMessages={initialMessages}
          onFirstMessage={() => qc.invalidateQueries({ queryKey: ["threads"] })}
        />
      )}
    </div>
  );
}

function Sidebar({
  threads, activeId, onNew, onDelete,
}: {
  threads: { id: string; title: string }[];
  activeId: string;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <Link to="/dashboard" className="flex items-center gap-2 border-b border-sidebar-border p-5 font-display text-lg">
        <LogoMark /> etc
      </Link>
      <div className="flex-1 overflow-y-auto p-3">
        <button
          onClick={onNew}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 py-2 text-sm font-semibold text-sidebar-primary-foreground hover:opacity-90"
        >
          + New search
        </button>
        <Link
          to="/profile"
          className="mb-3 block rounded-full border border-border bg-card px-4 py-2 text-sm text-left text-sidebar-foreground hover:bg-sidebar-accent"
        >
          Edit profile
        </Link>
        <ul className="space-y-0.5">
          {threads.map((t) => (
            <li key={t.id} className="group flex items-center gap-1">
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                className={`flex-1 truncate rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent ${
                  t.id === activeId ? "bg-sidebar-accent font-medium" : ""
                }`}
              >
                {t.title}
              </Link>
              <button
                onClick={() => onDelete(t.id)}
                className="hidden rounded p-1 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-destructive group-hover:block"
                aria-label="Delete thread"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="border-t border-sidebar-border p-4 text-left text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground"
      >
        ← Back to dashboard
      </button>
    </aside>
  );
}

function ChatWindow({
  threadId, initialMessages, onFirstMessage,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onFirstMessage: () => void;
}) {
  const qc = useQueryClient();
  const saveBookmarkFn = useServerFn(saveBookmark);
  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null);
  const [savedBookmarkIds, setSavedBookmarkIds] = useState<string[]>([]);
  const [bmStatus, setBmStatus] = useState<string | null>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return {
            body: { messages, threadId, ...(body ?? {}) },
            headers,
          };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentFirstRef = useRef(initialMessages.length > 0);

  // Auto-send any prefill from landing/dashboard
  useEffect(() => {
    if (initialMessages.length > 0) return;
    const pending = sessionStorage.getItem(`prefill:${threadId}`);
    if (pending) {
      sessionStorage.removeItem(`prefill:${threadId}`);
      sendMessage({ text: pending });
      sentFirstRef.current = true;
      onFirstMessage();
    }
  }, [threadId, initialMessages.length, sendMessage, onFirstMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  async function onSaveBookmark(message: UIMessage) {
    const text = message.parts
      .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
      .join("")
      .trim();
    if (!text) return;

    const excerpt = text.length > 220 ? `${text.slice(0, 220)}…` : text;
    const title = text.slice(0, 120);

    setSavingBookmarkId(message.id);
    setBmStatus(null);
    try {
      await saveBookmarkFn({
        data: {
          threadId,
          messageId: message.id,
          title,
          excerpt,
        },
      });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      setSavedBookmarkIds((current) => (current.includes(message.id) ? current : [...current, message.id]));
      setBmStatus("Bookmark saved.");
    } catch (error) {
      setBmStatus(error instanceof Error ? error.message : "Unable to save bookmark.");
    } finally {
      setSavingBookmarkId(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    setInput("");
    sendMessage({ text });
    if (!sentFirstRef.current) {
      sentFirstRef.current = true;
      onFirstMessage();
    }
  }

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <main className="flex flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Ask about drugs, education, agriculture, health, internship placement, jobs, grants, loans, investment — and the AI will match you to real Nigerian opportunities.
            </div>
          )}
          {bmStatus ? (
            <div className="mb-4 rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground">
              {bmStatus}
            </div>
          ) : null}
          <ul className="space-y-6">
            {messages.map((m) => (
              <Message
                key={m.id}
                message={m}
                onSaveBookmark={onSaveBookmark}
                savingBookmarkId={savingBookmarkId}
                savedBookmarkIds={savedBookmarkIds}
              />
            ))}
            {status === "submitted" && (
              <li className="text-sm text-muted-foreground">
                <ThinkingDots />
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl items-end gap-2 px-6 py-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as FormEvent);
              }
            }}
            rows={1}
            placeholder="Ask a follow-up… (Shift + Enter for newline)"
            className="flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-green"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {isLoading ? "…" : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Message({
  message,
  onSaveBookmark,
  savingBookmarkId,
  savedBookmarkIds,
}: {
  message: UIMessage;
  onSaveBookmark: (message: UIMessage) => void;
  savingBookmarkId: string | null;
  savedBookmarkIds: string[];
}) {
  const text = message.parts
    .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
    .join("");

  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-paper">
          {text}
        </div>
      </li>
    );
  }
  return (
    <li>
      <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-green">
        <LogoMark className="h-4 w-4" /> CommunityConnect AI
      </div>
      <div className="chat-prose text-[15px] text-foreground">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
      {message.role === "assistant" ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onSaveBookmark(message)}
            disabled={savingBookmarkId === message.id || savedBookmarkIds.includes(message.id)}
            className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savedBookmarkIds.includes(message.id)
              ? "Saved"
              : savingBookmarkId === message.id
              ? "Saving…"
              : "Save result"}
          </button>
        </div>
      ) : null}
    </li>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green" style={{ animationDelay: "0s" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green" style={{ animationDelay: "0.15s" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green" style={{ animationDelay: "0.3s" }} />
      <span className="ml-2">Searching Nigerian opportunities…</span>
    </span>
  );
}