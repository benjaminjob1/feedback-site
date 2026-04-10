-- Feedback Portal - Supabase Setup Script
-- Run this in your Supabase project's SQL editor (Project > SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FEEDBACK TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site TEXT NOT NULL CHECK (site IN ('hub', 'website', 'stats-native', 'stats-preview', 'stats-public', 'stocks', 'hardware', 'software', 'railway')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  question_easy TEXT,
  question_improve TEXT,
  question_bugs TEXT,
  question_features TEXT,
  question_other TEXT,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FEEDBACK_VIEWS TABLE (who can see pending)
-- =============================================
CREATE TABLE IF NOT EXISTS public.feedback_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_view_pending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRIGGER: Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.email ILIKE 'benjamin.job@gwern.co.uk' THEN 'admin'
      ELSE 'user'
    END,
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_views ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: profiles
-- =============================================

-- Anyone can view profiles (for display names on feedback)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (TRUE);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin can do anything with profiles
CREATE POLICY "Admin can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES: feedback
-- =============================================

-- Anyone can read approved feedback
CREATE POLICY "Approved feedback is public"
  ON public.feedback FOR SELECT
  USING (status = 'approved');

-- Authenticated + verified users can read their own pending feedback
CREATE POLICY "Users can read own pending feedback"
  ON public.feedback FOR SELECT
  USING (
    submitted_by = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND email_verified = TRUE
    )
  );

-- Admin can read all feedback
CREATE POLICY "Admin can read all feedback"
  ON public.feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated + verified users can insert feedback
CREATE POLICY "Verified users can insert feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND email_verified = TRUE
    )
  );

-- Admin can update feedback status
CREATE POLICY "Admin can update feedback status"
  ON public.feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES: feedback_views
-- =============================================

-- Users can view their own view preferences
CREATE POLICY "Users can view own view preferences"
  ON public.feedback_views FOR SELECT
  USING (user_id = auth.uid());

-- Admin can manage all view preferences
CREATE POLICY "Admin can manage view preferences"
  ON public.feedback_views FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_feedback_site ON public.feedback(site);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted_by ON public.feedback(submitted_by);
CREATE INDEX IF NOT EXISTS idx_feedback_views_user ON public.feedback_views(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =============================================
-- TRIGGER: Auto-set email_verified on auth confirmation
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmed_at IS NOT NULL THEN
    UPDATE public.profiles SET email_verified = TRUE WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_confirmation();
