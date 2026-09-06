import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function requireAdmin(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", context.userId)
    .maybeSingle();
  if (error || !data?.is_admin) {
    throw new Error("Forbidden: Admin access required");
  }
}

const opportunityInputSchema = z.object({
  title: z.string().min(1).max(200),
  organisation: z.string().min(1).max(200),
  logo_text: z.string().max(10).optional().nullable(),
  category: z.string().min(1),
  industry: z.string().optional().nullable(),
  summary: z.string().min(1).max(2000),
  location: z.string().min(1),
  state: z.string().optional().nullable(),
  work_mode: z.string().min(1),
  is_paid: z.boolean().default(true),
  compensation: z.string().optional().nullable(),
  experience_levels: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  deadline: z.string().optional().nullable(),
  apply_url: z.string().optional().nullable(),
  source_url: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  is_verified: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

function cleanNulls<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export const listAllOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => opportunityInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const cleaned = cleanNulls(data);
    const { data: row, error } = await context.supabase
      .from("opportunities")
      .insert(cleaned)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        ...opportunityInputSchema.shape,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { id, ...fields } = data;
    const cleaned = cleanNulls(fields);
    const { data: row, error } = await context.supabase
      .from("opportunities")
      .update(cleaned)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("opportunities")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleOpportunityField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        field: z.enum(["is_verified", "is_active", "featured"]),
        value: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { id, field, value } = data;
    const update =
      field === "is_verified"
        ? { is_verified: value }
        : field === "is_active"
          ? { is_active: value }
          : { featured: value };
    const { data: row, error } = await context.supabase
      .from("opportunities")
      .update(update)
      .eq("id", id)
      .select("id, is_verified, is_active, featured")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", context.userId)
      .maybeSingle();
    console.log("[checkIsAdmin] userId:", context.userId, "data:", data, "error:", error);
    if (error) return { is_admin: false };
    return { is_admin: data?.is_admin ?? false };
  });
