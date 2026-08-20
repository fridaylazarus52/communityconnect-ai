// api/chat.ts
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAIProvider, CHAT_MODEL, SYSTEM_PROMPT } from "@/lib/ai-gateway.server";

type ChatBody = { messages?: unknown; threadId?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return new Response("Missing OPENAI_API_KEY", { status: 500 });
        const openai = createOpenAIProvider(apiKey);
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }

        // Persist the latest user message (best-effort; auth via bearer token).
        const authHeader = request.headers.get("authorization");
        const threadId = typeof body.threadId === "string" ? body.threadId : null;
        if (authHeader && threadId) {
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const supa = createClient(
              process.env.SUPABASE_URL!,
              process.env.SUPABASE_PUBLISHABLE_KEY!,
              {
                global: { headers: { Authorization: authHeader } },
                auth: { persistSession: false, autoRefreshToken: false },
              },
            );
            const { data: userRes } = await supa.auth.getUser();
            const userId = userRes.user?.id;
            const uiMessages = body.messages as UIMessage[];
            const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
            if (userId && lastUser) {
              // Best-effort persistence: don't block the LLM stream on these DB
              // round-trips — fire them off and let them finish in the background.
              void persistUserMessage(supa, threadId, userId, lastUser).catch((err) =>
                console.error("chat persist error", err),
              );
            }

            const model = openai(CHAT_MODEL);
            const result = streamText({
              model,
              system: SYSTEM_PROMPT,
              messages: await convertToModelMessages(body.messages as UIMessage[]),
              onFinish: async ({ text }) => {
                if (userId) {
                  await supa.from("messages").insert({
                    thread_id: threadId,
                    user_id: userId,
                    role: "assistant",
                    parts: [{ type: "text", text }] as unknown as object,
                  });
                }
              },
            });
            return result.toUIMessageStreamResponse({
              originalMessages: body.messages as UIMessage[],
            });
          } catch (err) {
            console.error("chat persist error", err);
            // Fall through to unauthenticated streaming
          }
        }

        // Unauthenticated fallback: stream without persistence
        const model = openai(CHAT_MODEL);
        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(body.messages as UIMessage[]),
        });
        return result.toUIMessageStreamResponse({
          originalMessages: body.messages as UIMessage[],
        });
      },
    },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function persistUserMessage(
  supa: any,
  threadId: string,
  userId: string,
  lastUser: UIMessage,
): Promise<void> {
  // A retry (e.g. after an interrupted stream) resends the same trailing
  // user message — skip re-inserting it if it's already the last saved row.
  const { data: latestMessage } = await supa
    .from("messages")
    .select("role,parts")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const alreadyPersisted =
    latestMessage?.role === "user" &&
    JSON.stringify(latestMessage.parts) === JSON.stringify(lastUser.parts);
  if (alreadyPersisted) return;

  await supa.from("messages").insert({
    thread_id: threadId,
    user_id: userId,
    role: "user",
    parts: lastUser.parts as unknown as object,
  });

  const updatedAt = new Date().toISOString();
  const title = extractText(lastUser).slice(0, 80) || "New search";
  // Update the title only if it's still the default; always bump updated_at.
  const { count } = await supa
    .from("threads")
    .update({ title, updated_at: updatedAt }, { count: "exact" })
    .eq("id", threadId)
    .eq("user_id", userId)
    .eq("title", "New search");
  if (!count) {
    await supa
      .from("threads")
      .update({ updated_at: updatedAt })
      .eq("id", threadId)
      .eq("user_id", userId);
  }
}

function extractText(msg: UIMessage): string {
  if (!msg.parts) return "";
  return msg.parts
    .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
    .join(" ")
    .trim();
}
