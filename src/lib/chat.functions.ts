import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id,title,updated_at,created_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ title: z.string().max(120).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("threads")
      .insert({ user_id: context.userId, title: data.title ?? "New search" })
      .select("id,title,updated_at,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(1).max(300), title: z.string().max(120).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("saved_searches")
      .insert({
        user_id: context.userId,
        query: data.query,
        title: data.title ?? null,
      })
      .select("id,query,title,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSavedSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_searches")
      .select("id,query,title,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      threadId: z.string().uuid(),
      messageId: z.string().uuid(),
      title: z.string().max(120).optional(),
      excerpt: z.string().max(1000).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bookmarks")
      .insert({
        user_id: context.userId,
        thread_id: data.threadId,
        message_id: data.messageId,
        title: data.title ?? null,
        excerpt: data.excerpt ?? null,
        data: null,
      })
      .select("id,thread_id,message_id,title,excerpt,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bookmarks")
      .select("id,thread_id,message_id,title,excerpt,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: thread, error: tErr } = await context.supabase
      .from("threads")
      .select("id,title")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!thread) throw new Error("Thread not found");

    const { data: rows, error } = await context.supabase
      .from("messages")
      .select("id,role,parts,created_at")
      .eq("thread_id", data.threadId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { thread, messages: rows ?? [] };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .delete()
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
