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
              // Insert user message
              await supa.from("messages").insert({
                thread_id: threadId,
                user_id: userId,
                role: "user",
                parts: lastUser.parts as unknown as object,
              });
              // Update thread title if it's still the default
              const title = extractText(lastUser).slice(0, 80) || "New search";
              await supa
                .from("threads")
                .update({ title, updated_at: new Date().toISOString() })
                .eq("id", threadId)
                .eq("user_id", userId)
                .eq("title", "New search");
              await supa
                .from("threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId)
                .eq("user_id", userId);
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

function extractText(msg: UIMessage): string {
  if (!msg.parts) return "";
  return msg.parts
    .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
    .join(" ")
    .trim();
}
