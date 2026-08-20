-- PROFILES
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- THREADS
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
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER threads_set_updated_at BEFORE UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MESSAGES
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
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SAVED SEARCHES
CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX saved_searches_user_id_created_at_idx ON public.saved_searches(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved searches" ON public.saved_searches
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BOOKMARKS
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- OPPORTUNITIES (public catalogue)
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
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX opportunities_category_idx ON public.opportunities(category);
CREATE INDEX opportunities_deadline_idx ON public.opportunities(deadline);
GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opportunities are publicly readable" ON public.opportunities
  FOR SELECT TO anon, authenticated USING (true);

-- SAVED OPPORTUNITIES
CREATE TABLE public.saved_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_opportunities TO authenticated;
GRANT ALL ON public.saved_opportunities TO service_role;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved opportunities" ON public.saved_opportunities
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- APPLICATIONS
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
CREATE INDEX applications_user_id_idx ON public.applications(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own applications" ON public.applications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER applications_set_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NOTIFICATIONS
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
CREATE INDEX notifications_user_id_created_at_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- SEED OPPORTUNITY CATALOGUE
INSERT INTO public.opportunities (title, organisation, logo_text, category, industry, summary, location, state, work_mode, is_paid, compensation, experience_levels, skills, deadline, apply_url, featured) VALUES
('3MTT Technical Talent Programme (Cohort)', 'Federal Ministry of Communications, Innovation & Digital Economy', '3M', 'Tech Bootcamp', 'Technology', 'Fully funded training in software development, data analysis, product design, cybersecurity and cloud for 3 Million Technical Talent.', 'Nationwide', 'Nationwide', 'remote', true, 'Fully funded + stipend on selected tracks', ARRAY['student','graduate','nysc'], ARRAY['Digital Literacy','Problem Solving','Communication'], CURRENT_DATE + 45, 'https://3mtt.nitda.gov.ng', true),
('NNPC/SNEPCo National University Scholarship', 'NNPC & Shell Nigeria Exploration', 'NN', 'Scholarship', 'Energy', 'Annual undergraduate scholarship award for Nigerian students in accredited universities across all disciplines.', 'Nationwide', 'Nationwide', 'onsite', true, '₦200,000+ per session', ARRAY['student'], ARRAY['Academic Excellence'], CURRENT_DATE + 30, 'https://nnpcgroup.com', true),
('Graduate Trainee Programme', 'Dangote Group', 'DG', 'Graduate Trainee', 'Manufacturing', '18-month structured graduate programme rotating across operations, supply chain, finance and engineering.', 'Lagos', 'Lagos', 'onsite', true, '₦350,000 monthly', ARRAY['graduate','nysc'], ARRAY['Analytical Thinking','Excel','Communication','Teamwork'], CURRENT_DATE + 21, 'https://dangote.com/careers', true),
('SIWES Industrial Attachment — Software Engineering', 'Interswitch Group', 'IS', 'SIWES / IT Placement', 'Technology', '6-month SIWES placement for engineering and computer science undergraduates on real payment products.', 'Lagos', 'Lagos', 'hybrid', true, '₦80,000 monthly stipend', ARRAY['student'], ARRAY['JavaScript','Git','Problem Solving','SQL'], CURRENT_DATE + 18, 'https://interswitchgroup.com/careers', false),
('IT Placement — Network & Systems', 'MTN Nigeria', 'MT', 'SIWES / IT Placement', 'Telecommunications', 'Industrial training placement for undergraduates in networking, IT support and data operations.', 'Abuja', 'FCT', 'onsite', true, '₦75,000 monthly stipend', ARRAY['student'], ARRAY['Networking','Troubleshooting','Windows','Communication'], CURRENT_DATE + 25, 'https://mtn.ng/careers', false),
('Remote Frontend Developer Intern', 'Paystack', 'PS', 'Internship', 'Technology', 'Remote internship building merchant dashboards with React and TypeScript alongside senior engineers.', 'Remote (Nigeria)', 'Nationwide', 'remote', true, '₦250,000 monthly', ARRAY['student','graduate','nysc'], ARRAY['React','TypeScript','CSS','Git','API Integration'], CURRENT_DATE + 14, 'https://paystack.com/careers', true),
('NYSC Corps Member Placement — Digital Skills', 'Nigeria Youth Employment Action Plan', 'NY', 'NYSC Opportunity', 'Public Sector', 'Placement of serving corps members into digital skills teaching and community innovation projects.', 'Nationwide', 'Nationwide', 'onsite', true, 'Monthly allowance + NYSC stipend', ARRAY['nysc'], ARRAY['Teaching','Digital Literacy','Community Engagement'], CURRENT_DATE + 40, 'https://nysc.gov.ng', false),
('NELFUND Student Loan', 'Nigerian Education Loan Fund', 'NE', 'Grant', 'Education', 'Interest-free federal student loan covering tuition and upkeep for students in public tertiary institutions.', 'Nationwide', 'Nationwide', 'remote', true, 'Tuition + upkeep', ARRAY['student'], ARRAY[]::text[], CURRENT_DATE + 60, 'https://nelf.gov.ng', true),
('Agnes Scholarship for Female STEM Students', 'Nigerian Women in Tech Foundation', 'AS', 'Scholarship', 'Technology', 'Scholarship and mentorship for female undergraduates studying Computer Science, Engineering and Mathematics.', 'Nationwide', 'Nationwide', 'remote', true, '₦500,000 per session', ARRAY['student'], ARRAY['Mathematics','Programming'], CURRENT_DATE + 28, 'https://example.org/agnes', false),
('Graduate Trainee — Accounting & Audit', 'KPMG Nigeria', 'KP', 'Graduate Trainee', 'Professional Services', 'Audit graduate programme with full ICAN/ACCA sponsorship for high-performing accounting graduates.', 'Lagos', 'Lagos', 'hybrid', true, '₦400,000 monthly', ARRAY['graduate','nysc'], ARRAY['Accounting','Excel','IFRS','Attention to Detail'], CURRENT_DATE + 20, 'https://kpmg.com/ng/careers', true),
('Entry-Level Data Analyst', 'Flutterwave', 'FW', 'Job', 'Fintech', 'Analyse transaction data and build dashboards that guide merchant growth decisions.', 'Lagos', 'Lagos', 'hybrid', true, '₦600,000 monthly', ARRAY['graduate'], ARRAY['SQL','Python','Excel','Data Visualisation'], CURRENT_DATE + 12, 'https://flutterwave.com/careers', false),
('Ekiti State IT Placement Scheme', 'Ekiti State Ministry of Innovation', 'EK', 'SIWES / IT Placement', 'Public Sector', 'Industrial training placements for Ekiti-based students across ICT, agriculture and public administration units.', 'Ado-Ekiti', 'Ekiti', 'onsite', true, '₦40,000 monthly stipend', ARRAY['student'], ARRAY['Microsoft Office','Communication'], CURRENT_DATE + 22, 'https://ekitistate.gov.ng', false),
('Tony Elumelu Foundation Entrepreneurship Programme', 'Tony Elumelu Foundation', 'TE', 'Grant', 'Entrepreneurship', 'Non-refundable $5,000 seed capital, 12-week business training and mentorship for young African founders.', 'Nationwide', 'Nationwide', 'remote', true, '$5,000 seed capital', ARRAY['student','graduate','nysc','professional'], ARRAY['Business Planning','Pitching','Financial Literacy'], CURRENT_DATE + 35, 'https://tefconnect.net', true),
('Andela Technical Leadership Programme', 'Andela', 'AN', 'Tech Bootcamp', 'Technology', 'Intensive engineering programme preparing junior developers for global remote roles.', 'Remote (Nigeria)', 'Nationwide', 'remote', true, 'Paid during programme', ARRAY['graduate','nysc'], ARRAY['JavaScript','React','Git','Problem Solving','Communication'], CURRENT_DATE + 26, 'https://andela.com', false),
('Junior Product Designer', 'Kuda Bank', 'KB', 'Job', 'Fintech', 'Design mobile banking flows and contribute to a fast-moving design system.', 'Lagos', 'Lagos', 'hybrid', true, '₦550,000 monthly', ARRAY['graduate'], ARRAY['Figma','UI Design','User Research','Prototyping'], CURRENT_DATE + 16, 'https://kuda.com/careers', false),
('Agricultural Youth Empowerment Grant', 'Bank of Agriculture', 'BA', 'Grant', 'Agriculture', 'Low-interest funding and input support for young Nigerians going into crop and livestock production.', 'Nationwide', 'Nationwide', 'onsite', true, 'Up to ₦2,500,000 facility', ARRAY['graduate','nysc','professional'], ARRAY['Agribusiness','Record Keeping'], CURRENT_DATE + 50, 'https://boanig.com', false),
('Shell Nigeria Postgraduate Scholarship', 'Shell Petroleum Development Company', 'SH', 'Scholarship', 'Energy', 'Full postgraduate scholarship for outstanding Nigerian graduates studying abroad in selected disciplines.', 'International', 'Nationwide', 'onsite', true, 'Full tuition + living costs', ARRAY['graduate','professional'], ARRAY['Research','Academic Excellence'], CURRENT_DATE + 33, 'https://shell.com.ng', false),
('Backend Engineering Internship (Remote)', 'Moniepoint', 'MP', 'Internship', 'Fintech', 'Remote internship writing Java/Node services that power agent banking across Nigeria.', 'Remote (Nigeria)', 'Nationwide', 'remote', true, '₦200,000 monthly', ARRAY['student','graduate'], ARRAY['Java','Node.js','SQL','Git','API Integration'], CURRENT_DATE + 19, 'https://moniepoint.com/careers', false),
('N-Power Knowledge Cohort', 'National Social Investment Programme', 'NP', 'Government Programme', 'Public Sector', 'Federal skills programme in software development, animation and hardware for unemployed graduates.', 'Nationwide', 'Nationwide', 'remote', true, '₦30,000 monthly stipend', ARRAY['graduate','nysc'], ARRAY['Digital Literacy'], CURRENT_DATE + 55, 'https://npower.gov.ng', false),
('Graduate Trainee — Banking Operations', 'Access Bank', 'AB', 'Graduate Trainee', 'Banking', 'School of Banking Excellence programme for fresh graduates with a minimum of second class upper.', 'Lagos', 'Lagos', 'onsite', true, '₦300,000 monthly during training', ARRAY['graduate','nysc'], ARRAY['Customer Service','Excel','Communication','Sales'], CURRENT_DATE + 24, 'https://accessbankplc.com/careers', false),
('Google Africa Developer Scholarship', 'Google Africa', 'GO', 'Scholarship', 'Technology', 'Fully funded Android, web, cloud and mobile developer certification tracks with mentorship.', 'Remote (Nigeria)', 'Nationwide', 'remote', true, 'Fully funded', ARRAY['student','graduate','nysc'], ARRAY['Programming','Self Learning'], CURRENT_DATE + 38, 'https://developers.google.com', true),
('Junior Frontend Developer', 'Sterling Bank Innovation Lab', 'SB', 'Job', 'Banking', 'Build internal tools and customer-facing web experiences with React and TypeScript.', 'Lagos', 'Lagos', 'onsite', true, '₦450,000 monthly', ARRAY['graduate','nysc'], ARRAY['React','TypeScript','CSS','Git'], CURRENT_DATE + 15, 'https://sterling.ng/careers', false),
('Nigeria Innovation Challenge', 'i-DICE Programme', 'ID', 'Innovation Competition', 'Entrepreneurship', 'National competition funding digital and creative enterprises founded by young Nigerians.', 'Abuja', 'FCT', 'hybrid', true, 'Up to ₦10,000,000 in funding', ARRAY['student','graduate','nysc','professional'], ARRAY['Pitching','Product Thinking','Business Planning'], CURRENT_DATE + 42, 'https://idice.ng', false),
('Health Data Officer (Entry Level)', 'eHealth Africa', 'EH', 'Job', 'Health', 'Support public health data collection and reporting across northern Nigeria field sites.', 'Kano', 'Kano', 'onsite', true, '₦380,000 monthly', ARRAY['graduate','nysc'], ARRAY['Data Entry','Excel','Reporting','Field Work'], CURRENT_DATE + 17, 'https://ehealthafrica.org/careers', false),
('Teaching Fellowship for Graduates', 'Teach For Nigeria', 'TF', 'Graduate Trainee', 'Education', 'Two-year paid fellowship placing graduates in underserved classrooms with leadership training.', 'Nationwide', 'Nationwide', 'onsite', true, '₦180,000 monthly', ARRAY['graduate','nysc'], ARRAY['Teaching','Leadership','Communication'], CURRENT_DATE + 29, 'https://teachfornigeria.org', false),
('Cybersecurity Bootcamp Scholarship', 'CyberSafe Foundation', 'CS', 'Tech Bootcamp', 'Technology', 'Free cybersecurity training with certification vouchers for young Nigerians, women prioritised.', 'Remote (Nigeria)', 'Nationwide', 'remote', true, 'Fully funded', ARRAY['student','graduate','nysc'], ARRAY['Networking','Linux','Security Fundamentals'], CURRENT_DATE + 31, 'https://cybersafefoundation.org', false),
('Federal Government Youth Grant (GEEP)', 'Bank of Industry', 'BI', 'Government Programme', 'Public Sector', 'Micro-enterprise loans and grants for young traders, artisans and small business owners.', 'Nationwide', 'Nationwide', 'onsite', true, '₦50,000 – ₦300,000', ARRAY['graduate','nysc','professional'], ARRAY['Business Management'], CURRENT_DATE + 47, 'https://boi.ng', false),
('Remote Customer Success Associate', 'Bamboo', 'BM', 'Job', 'Fintech', 'Support investors across Nigeria over chat and email, fully remote with flexible hours.', 'Remote (Nigeria)', 'Nationwide', 'remote', true, '₦300,000 monthly', ARRAY['graduate','nysc'], ARRAY['Communication','Customer Service','Writing'], CURRENT_DATE + 13, 'https://investbamboo.com', false),
('Undergraduate Research Grant', 'TETFund', 'TT', 'Grant', 'Education', 'Research funding for final-year undergraduate and postgraduate projects in Nigerian institutions.', 'Nationwide', 'Nationwide', 'onsite', true, 'Up to ₦1,000,000', ARRAY['student'], ARRAY['Research','Academic Writing'], CURRENT_DATE + 36, 'https://tetfund.gov.ng', false),
('Product Management Internship', 'Piggyvest', 'PV', 'Internship', 'Fintech', 'Learn product discovery, analytics and roadmap delivery on a savings product used by millions.', 'Lagos', 'Lagos', 'hybrid', true, '₦220,000 monthly', ARRAY['student','graduate','nysc'], ARRAY['Product Thinking','Analytics','Communication','Writing'], CURRENT_DATE + 23, 'https://piggyvest.com/careers', false);