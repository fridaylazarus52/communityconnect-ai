import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CareerProfile, Opportunity } from "@/lib/opportunities";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
      qc.invalidateQueries();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  return { session, user: session?.user ?? null, ready, isAuthed: !!session };
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CareerProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        ...data,
        skills: data.skills ?? [],
        preferred_industries: data.preferred_industries ?? [],
        opportunity_interests: data.opportunity_interests ?? [],
      } as CareerProfile;
    },
  });
}

export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: async (): Promise<Opportunity[]> => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("featured", { ascending: false })
        .order("deadline", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Opportunity[];
    },
    staleTime: 60_000,
  });
}

export function useSavedOpportunities(userId: string | undefined) {
  return useQuery({
    queryKey: ["saved-opportunities", userId],
    enabled: !!userId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select("opportunity_id")
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => row.opportunity_id);
    },
  });
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useApplications(userId: string | undefined) {
  return useQuery({
    queryKey: ["applications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}
