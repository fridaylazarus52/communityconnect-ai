import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useToggleSaved(userId: string | undefined, savedIds: string[]) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      if (!userId) throw new Error("Sign in to save opportunities.");
      const isSaved = savedIds.includes(opportunityId);
      if (isSaved) {
        const { error } = await supabase
          .from("saved_opportunities")
          .delete()
          .eq("user_id", userId)
          .eq("opportunity_id", opportunityId);
        if (error) throw new Error(error.message);
        return "removed" as const;
      }
      const { error } = await supabase
        .from("saved_opportunities")
        .insert({ user_id: userId, opportunity_id: opportunityId });
      if (error) throw new Error(error.message);
      return "saved" as const;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["saved-opportunities", userId] });
      toast.success(result === "saved" ? "Saved to your list" : "Removed from saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (id: string) => mutation.mutate(id);
}
