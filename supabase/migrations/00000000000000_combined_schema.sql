-- ============================================================
-- COMBINED MIGRATION — Run this single file on a fresh database
-- Fixes table ordering issues from original migrations
-- ============================================================

-- ─── Profiles ───
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  location TEXT,
  state TEXT,
  education_level TEXT,
  field_of_study TEXT,
  current_status TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  sector_interests TEXT[],
  preferred_industries TEXT[] NOT NULL DEFAULT '{}',
  opportunity_interests TEXT[] NOT NULL DEFAULT '{}',
  career_goal TEXT,
  work_preference TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, location, education_level, sector_interests)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NULL,
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Threads ───
CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New search',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX threads_user_id_updated_at_idx ON public.threads(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads TO authenticated;
GRANT ALL ON public.threads TO service_role;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own threads" ON public.threads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Messages (must come BEFORE bookmarks) ───
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  parts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_thread_id_created_at_idx ON public.messages(thread_id, created_at ASC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Bookmarks (references messages, so must come after) ───
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  title TEXT,
  excerpt TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bookmarks_user_id_created_at_idx ON public.bookmarks(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Saved searches ───
CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX saved_searches_user_id_created_at_idx ON public.saved_searches(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved searches" ON public.saved_searches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Opportunities ───
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organisation TEXT NOT NULL,
  logo_text TEXT,
  category TEXT NOT NULL,
  industry TEXT,
  summary TEXT NOT NULL,
  location TEXT NOT NULL,
  state TEXT,
  work_mode TEXT NOT NULL DEFAULT 'onsite',
  is_paid BOOLEAN NOT NULL DEFAULT true,
  compensation TEXT,
  experience_levels TEXT[] NOT NULL DEFAULT '{}',
  skills TEXT[] NOT NULL DEFAULT '{}',
  deadline DATE,
  apply_url TEXT,
  source_url TEXT,
  eligibility TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

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

-- ─── Saved opportunities ───
CREATE TABLE public.saved_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, opportunity_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_opportunities TO authenticated;
GRANT ALL ON public.saved_opportunities TO service_role;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved opportunities" ON public.saved_opportunities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Applications ───
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  organisation TEXT,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','applied','interview','offer','accepted','rejected')),
  notes TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own applications" ON public.applications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Notifications ───
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Updated_at trigger ───
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER threads_set_updated_at BEFORE UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER applications_set_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Guard trigger: prevent non-admins from self-granting is_admin ───
CREATE OR REPLACE FUNCTION public.guard_is_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_is_admin boolean;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();
  IF current_uid IS NULL THEN
    RETURN NEW;
  END IF;
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

-- Revoke function execution from non-service roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_is_admin() FROM PUBLIC, anon, authenticated;

-- ─── Avatar storage bucket ───
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Seed data: opportunities ───
INSERT INTO public.opportunities (title, organisation, logo_text, category, industry, summary, location, state, work_mode, is_paid, compensation, experience_levels, skills, deadline, apply_url, source_url, eligibility, featured, is_verified, is_active) VALUES
('Graduate Trainee — Banking', 'Access Bank', 'AB', 'Graduate Trainee', 'Banking', 'Rotational graduate programme across retail, corporate and digital banking divisions.', 'Lagos', 'Lagos', 'onsite', true, '₦450,000 monthly', ARRAY['graduate'], ARRAY['Excel','Communication','Analytical Thinking'], CURRENT_DATE + 45, 'https://accessbankplc.com/careers', NULL, 'Second Class Upper graduates, NYSC completed', true, true, true),
('Software Engineering Internship', 'Paystack', 'PS', 'Internship', 'Fintech', '6-month internship building payment infrastructure with mentorship from senior engineers.', 'Lagos', 'Lagos', 'hybrid', true, '₦250,000 monthly', ARRAY['student','graduate'], ARRAY['JavaScript','React','Node.js'], CURRENT_DATE + 30, 'https://paystack.com/careers', NULL, '300-level students or recent graduates in CS/related fields', false, true, true),
('NYSC PPA — Tech Startup', 'Andela', 'AN', 'NYSC Opportunity', 'Technology', 'NYSC placement at a leading tech company with potential for post-service retention.', 'Lagos', 'Lagos', 'hybrid', true, '₦100,000 monthly + allowance', ARRAY['nysc'], ARRAY['Python','Git','Problem Solving'], CURRENT_DATE + 60, 'https://andela.com/careers', NULL, 'Current NYSC corps members in Lagos', false, true, true),
('Scholarship for Female STEM Students', 'Chevron Nigeria', 'CV', 'Scholarship', 'Oil & Gas', 'Full tuition scholarship for female undergraduates in engineering and science fields.', 'Nationwide', 'Nationwide', 'remote', true, 'Full tuition + ₦150,000 stipend', ARRAY['student'], ARRAY[]::text[], CURRENT_DATE + 90, 'https://chevron.com/ng/scholarships', NULL, 'Female 200-level students in accredited universities', true, true, true),
('SIWES Placement — Data Science', 'Data Science Nigeria', 'DS', 'SIWES / IT Placement', 'Technology', 'Industrial training placement focusing on machine learning and data analytics projects.', 'Lagos', 'Lagos', 'onsite', false, 'IT allowance', ARRAY['student'], ARRAY['Python','Statistics','Data Visualisation'], CURRENT_DATE + 15, 'https://datasciencenigeria.org', NULL, '300-level students requiring SIWES placement', false, false, true),
('Grant for Young Agripreneurs', 'Bank of Industry', 'BO', 'Grant', 'Agriculture', 'Seed funding and business support for young Nigerians starting agribusiness ventures.', 'Nationwide', 'Nationwide', 'remote', true, 'Up to ₦2,000,000', ARRAY['graduate','nysc'], ARRAY['Business Planning','Financial Literacy'], CURRENT_DATE + 75, 'https://boi.ng', NULL, 'Ages 18-35 with viable agribusiness plan', false, true, true),
('Junior Accountant', 'Dangote Group', 'DG', 'Job', 'Manufacturing', 'Entry-level accounting role supporting financial reporting and reconciliation processes.', 'Lagos', 'Lagos', 'onsite', true, '₦350,000 monthly', ARRAY['graduate'], ARRAY['Accounting','Excel','IFRS'], CURRENT_DATE + 25, 'https://dangote.com/careers', NULL, 'BSc Accounting, ICAN ATS or in-progress', false, false, true),
('Remote Customer Success Associate', 'Flutterwave', 'FW', 'Job', 'Fintech', 'Remote role managing merchant relationships and resolving payment issues for African businesses.', 'Lagos', 'Lagos', 'remote', true, '₦500,000 monthly', ARRAY['graduate'], ARRAY['Communication','CRM','Problem Solving'], CURRENT_DATE + 20, 'https://flutterwave.com/careers', NULL, '1+ year customer-facing experience', false, true, true),
('3MTT Fellowship — AI/ML', 'Federal Ministry of Communications', '3M', 'Grant', 'Technology', '3 Million Technical Talent programme — AI/ML track with stipend and job placement support.', 'Nationwide', 'Nationwide', 'remote', true, '₦100,000 monthly stipend', ARRAY['student','graduate','nysc'], ARRAY['Python','Machine Learning','Data Analysis'], CURRENT_DATE + 40, 'https://3mtt.nitda.gov.ng', NULL, 'Basic programming knowledge, ages 18-45', true, true, true),
('Health Sector Grant — Community Health', 'WHO Nigeria', 'WH', 'Grant', 'Health', 'Funding for community health initiatives targeting maternal and child health in rural areas.', 'Nationwide', 'Nationwide', 'remote', true, 'Up to ₦5,000,000', ARRAY['graduate'], ARRAY['Project Management','Public Health'], CURRENT_DATE + 50, NULL, NULL, 'Registered NGOs and CBOs in health sector', false, false, true),
('Graduate Trainee — Oil & Gas', 'Shell Nigeria', 'SH', 'Graduate Trainee', 'Oil & Gas', 'Premier graduate programme with rotations across exploration, production and energy transition.', 'Rivers', 'Rivers', 'hybrid', true, '₦800,000 monthly', ARRAY['graduate'], ARRAY['Engineering','Safety Management','Analytical Thinking'], CURRENT_DATE + 35, 'https://shell.com.ng/careers', NULL, 'Second Class Upper in Engineering/Geosciences', true, true, true),
('Tech Talent Programme', 'MTN Nigeria', 'MT', 'Graduate Trainee', 'Telecommunications', '12-month technology rotation programme across network, digital and data teams.', 'Lagos', 'Lagos', 'hybrid', true, '₦600,000 monthly', ARRAY['graduate'], ARRAY['Networking','Python','Cloud'], CURRENT_DATE + 55, 'https://mtn.ng/careers', NULL, 'BSc in CS, Engineering or related field', false, true, true),
('Undergraduate Scholarship — Tech', 'Google Africa', 'GG', 'Scholarship', 'Technology', 'Google Africa Developer Scholarship covering tuition and certification exam fees.', 'Nationwide', 'Nationwide', 'remote', true, 'Full tuition + certification', ARRAY['student'], ARRAY['Programming','Android','Web Development'], CURRENT_DATE + 70, 'https://google.com/africa/scholarships', NULL, '200-level+ CS/Engineering students', true, true, true),
('Entry-Level Marketing Executive', 'Nestle Nigeria', 'NE', 'Job', 'FMCG', 'Brand management and marketing campaign execution for leading FMCG products.', 'Lagos', 'Lagos', 'onsite', true, '₦400,000 monthly', ARRAY['graduate'], ARRAY['Marketing','Communication','Excel'], CURRENT_DATE + 18, 'https://nestle.com.ng/careers', NULL, 'BSc Marketing/Business, 0-2 years experience', false, false, true),
('Women in Tech Grant', 'Lagos State Government', 'LA', 'Grant', 'Technology', 'Seed funding for female-led tech startups in Lagos State.', 'Lagos', 'Lagos', 'remote', true, 'Up to ₦3,000,000', ARRAY['graduate'], ARRAY['Business Planning','Technology','Leadership'], CURRENT_DATE + 65, 'https://lagosstate.gov.ng', NULL, 'Female founders 18-40 with tech startup', false, true, true),
('NYSC PPA — Corporate Banking', 'Zenith Bank', 'ZB', 'NYSC Opportunity', 'Banking', 'NYSC placement in corporate banking division with training and potential retention.', 'Lagos', 'Lagos', 'onsite', true, '₦80,000 monthly + allowance', ARRAY['nysc'], ARRAY['Excel','Financial Analysis','Communication'], CURRENT_DATE + 50, 'https://zenithbank.com/careers', NULL, 'Current NYSC corps members, Finance/Business grads', false, false, true),
('Internship — Content Marketing', 'TechCabal', 'TC', 'Internship', 'Media', '3-month internship creating content about African tech and startup ecosystems.', 'Lagos', 'Lagos', 'remote', true, '₦150,000 monthly', ARRAY['student','graduate'], ARRAY['Writing','SEO','Social Media'], CURRENT_DATE + 22, 'https://techcabal.com/careers', NULL, 'Undergraduates or recent graduates in any field', false, false, true),
('SME Loan — Trader Moni', 'Federal Government', 'FG', 'Grant', 'Finance', 'GEEP Trader Moni micro-loans for small business owners across Nigeria.', 'Nationwide', 'Nationwide', 'remote', true, '₦50,000 to ₦100,000', ARRAY['graduate','nysc'], ARRAY['Business Planning','Financial Literacy'], CURRENT_DATE + 100, NULL, NULL, 'Registered small business owners', false, true, true),
('Graduate Trainee — Consulting', 'McKinsey Nigeria', 'MC', 'Graduate Trainee', 'Professional Services', 'Analyst programme solving strategy problems for leading African organisations.', 'Lagos', 'Lagos', 'onsite', true, '₦1,200,000 monthly', ARRAY['graduate'], ARRAY['Analytical Thinking','Communication','PowerPoint'], CURRENT_DATE + 28, 'https://mckinsey.com/careers', NULL, 'Top university graduates, any discipline', true, true, true),
('Scholarship — Law Students', 'NBA Young Lawyers Forum', 'NB', 'Scholarship', 'Law', 'Tuition support for outstanding law students in their final year of study.', 'Nationwide', 'Nationwide', 'remote', true, '₦300,000 per session', ARRAY['student'], ARRAY['Legal Research','Writing'], CURRENT_DATE + 80, NULL, NULL, '500-level Law students in accredited universities', false, false, true),
('Data Analyst Graduate Programme', 'Bloomberg Africa', 'BB', 'Graduate Trainee', 'Fintech', '2-year rotational programme in financial data analysis and market research.', 'Lagos', 'Lagos', 'hybrid', true, '₦700,000 monthly', ARRAY['graduate'], ARRAY['SQL','Python','Data Visualisation','Statistics'], CURRENT_DATE + 32, 'https://bloomberg.com/careers', NULL, 'Quantitative degree, strong analytical skills', false, true, true),
('Internship — Product Design', 'Kuda Bank', 'KD', 'Internship', 'Fintech', '3-month product design internship working on digital banking features.', 'Lagos', 'Lagos', 'remote', true, '₦200,000 monthly', ARRAY['student','graduate'], ARRAY['Figma','User Research','Prototyping'], CURRENT_DATE + 14, 'https://kuda.com/careers', NULL, 'Portfolio required, design background preferred', false, false, true),
('Agricultural Input Subsidy', 'FMARD', 'FM', 'Grant', 'Agriculture', 'Federal Ministry of Agriculture input subsidy for smallholder farmers.', 'Nationwide', 'Nationwide', 'remote', true, 'Inputs worth ₦150,000', ARRAY['graduate','nysc'], ARRAY[]::text[], CURRENT_DATE + 120, NULL, NULL, 'Registered smallholder farmers', false, false, true),
('Junior Software Developer', 'Interswitch', 'IS', 'Job', 'Fintech', 'Build payment solutions for African markets with mentorship and growth path.', 'Lagos', 'Lagos', 'hybrid', true, '₦550,000 monthly', ARRAY['graduate'], ARRAY['Java','Spring','SQL','Git'], CURRENT_DATE + 26, 'https://interswitchgroup.com/careers', NULL, 'BSc CS/Engineering, 0-2 years experience', false, true, true),
('NELFUND Student Loan', 'Nigerian Education Loan Fund', 'NE', 'Grant', 'Education', 'Interest-free federal student loan covering tuition and upkeep for students in public tertiary institutions.', 'Nationwide', 'Nationwide', 'remote', true, 'Tuition + upkeep', ARRAY['student'], ARRAY[]::text[], CURRENT_DATE + 60, 'https://nelf.gov.ng', NULL, 'Students in public tertiary institutions', true, true, true),
('Agnes Scholarship for Female STEM Students', 'Nigerian Women in Tech Foundation', 'AS', 'Scholarship', 'Technology', 'Scholarship and mentorship for female undergraduates studying Computer Science, Engineering and Mathematics.', 'Nationwide', 'Nationwide', 'remote', true, '₦500,000 per session', ARRAY['student'], ARRAY['Mathematics','Programming'], CURRENT_DATE + 28, 'https://example.org/agnes', NULL, 'Female undergraduates in STEM', false, false, true),
('Graduate Trainee — Accounting & Audit', 'KPMG Nigeria', 'KP', 'Graduate Trainee', 'Professional Services', 'Audit graduate programme with full ICAN/ACCA sponsorship for high-performing accounting graduates.', 'Lagos', 'Lagos', 'hybrid', true, '₦400,000 monthly', ARRAY['graduate','nysc'], ARRAY['Accounting','Excel','IFRS','Attention to Detail'], CURRENT_DATE + 20, 'https://kpmg.com/ng/careers', NULL, 'Second Class Upper Accounting/Finance graduates', true, true, true),
('Entry-Level Data Analyst', 'Flutterwave', 'FW', 'Job', 'Fintech', 'Analyse transaction data and build dashboards that guide merchant growth decisions.', 'Lagos', 'Lagos', 'hybrid', true, '₦600,000 monthly', ARRAY['graduate'], ARRAY['SQL','Python','Excel','Data Visualisation'], CURRENT_DATE + 12, 'https://flutterwave.com/careers', NULL, 'BSc in quantitative field, 0-1 year experience', false, false, true),
('N-Power Volunteer Programme', 'Federal Government of Nigeria', 'NP', 'Grant', 'Government', 'N-Power volunteer programme providing monthly stipend and work experience for graduates.', 'Nationwide', 'Nationwide', 'remote', true, '₦30,000 monthly', ARRAY['graduate','nysc'], ARRAY['Teaching','Communication','Computer Literacy'], CURRENT_DATE + 90, 'https://npower.fmhds.gov.ng', NULL, 'Ages 18-35, HND or BSc degree', false, true, true),
('Junior Frontend Developer', 'Helios Investment Partners', 'HI', 'Job', 'Finance', 'Frontend developer role building internal dashboards for investment analysis.', 'Lagos', 'Lagos', 'remote', true, '₦650,000 monthly', ARRAY['graduate'], ARRAY['React','TypeScript','CSS','Git'], CURRENT_DATE + 18, NULL, NULL, '1+ year frontend experience, React proficiency', false, false, true);

-- ─── How to make yourself an admin ───
-- Run this in the Supabase SQL editor (service role bypasses the guard trigger):
-- UPDATE public.profiles SET is_admin = true WHERE id = 'your-user-uuid';
