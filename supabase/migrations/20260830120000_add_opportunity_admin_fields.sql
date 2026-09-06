-- Add admin management fields to opportunities
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS eligibility TEXT;

-- Add admin flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- ─── RLS policy updates for opportunities ───

-- Drop the old public read policy
DROP POLICY IF EXISTS "Opportunities are publicly readable" ON public.opportunities;

-- Public/anon can only read ACTIVE opportunities
CREATE POLICY "Active opportunities are publicly readable"
  ON public.opportunities
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Admins can read ALL opportunities (including archived)
CREATE POLICY "Admins can read all opportunities"
  ON public.opportunities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can insert
CREATE POLICY "Admins can insert opportunities"
  ON public.opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update
CREATE POLICY "Admins can update opportunities"
  ON public.opportunities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can delete
CREATE POLICY "Admins can delete opportunities"
  ON public.opportunities
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ─── Guard trigger: prevent non-admins from self-granting is_admin ───

CREATE OR REPLACE FUNCTION public.guard_is_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_is_admin boolean;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();
  -- Service role (null auth.uid) bypasses the check
  IF current_uid IS NULL THEN
    RETURN NEW;
  END IF;
  -- Only existing admins can grant admin to others
  IF NEW.is_admin = true AND COALESCE(OLD.is_admin, false) = false THEN
    SELECT is_admin INTO current_is_admin FROM public.profiles WHERE id = current_uid;
    IF COALESCE(current_is_admin, false) = false THEN
      NEW.is_admin = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_is_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_is_admin();

REVOKE EXECUTE ON FUNCTION public.guard_is_admin() FROM PUBLIC, anon, authenticated;

-- ─── How to make yourself an admin ───
-- Run this in the Supabase SQL editor (service role bypasses the trigger):
-- UPDATE public.profiles SET is_admin = true WHERE id = 'your-user-uuid';
