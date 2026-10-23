-- ==============================================================================
-- Outing & Packing Checklist - Database Schema & Security
-- Migration: 20261024000000_outing_checklist_schema.sql
-- Description: Core entities, RLS policies, indexes, and permanent completion lock.
-- ==============================================================================

-- 1. Profiles Table (Synchronized with Clerk Authentication)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL REFERENCES public.profiles(clerk_user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  archived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Event Members Table
CREATE TABLE IF NOT EXISTS public.event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL REFERENCES public.profiles(clerk_user_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_member UNIQUE (event_id, clerk_user_id)
);

-- 4. Event Invites Table
CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL REFERENCES public.profiles(clerk_user_id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- 5. Checklist Sections Table
CREATE TABLE IF NOT EXISTS public.checklist_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Checklist Items Table
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.checklist_sections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  quantity TEXT,
  assignee_id TEXT REFERENCES public.profiles(clerk_user_id) ON DELETE SET NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT REFERENCES public.profiles(clerk_user_id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES public.profiles(clerk_user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Checklist Templates Table
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL REFERENCES public.profiles(clerk_user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Template Sections Table
CREATE TABLE IF NOT EXISTS public.template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Template Items Table
CREATE TABLE IF NOT EXISTS public.template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.template_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  quantity TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Activity Events Table
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES public.profiles(clerk_user_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- Indexes for Query Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON public.profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_event_members_event ON public.event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user ON public.event_members(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_code ON public.event_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_sections_event ON public.checklist_sections(event_id, position);
CREATE INDEX IF NOT EXISTS idx_items_event_section ON public.checklist_items(event_id, section_id, position);
CREATE INDEX IF NOT EXISTS idx_items_assignee ON public.checklist_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_templates_owner ON public.checklist_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_event ON public.activity_events(event_id, created_at DESC);

-- ==============================================================================
-- Automatic updated_at Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_checklist_sections_updated_at ON public.checklist_sections;
CREATE TRIGGER trg_checklist_sections_updated_at BEFORE UPDATE ON public.checklist_sections
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_checklist_items_updated_at ON public.checklist_items;
CREATE TRIGGER trg_checklist_items_updated_at BEFORE UPDATE ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_checklist_templates_updated_at ON public.checklist_templates;
CREATE TRIGGER trg_checklist_templates_updated_at BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Database-Level Defense: Permanent Completed-Event Lock
-- ==============================================================================

-- Prevent reopening completed events
CREATE OR REPLACE FUNCTION public.prevent_reopening_completed_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    RAISE EXCEPTION 'Cannot reopen completed event: % is permanently locked.', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_event_reopening ON public.events;
CREATE TRIGGER trg_prevent_event_reopening
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.prevent_reopening_completed_event();

-- Prevent mutations to sections, items, or memberships on completed events
CREATE OR REPLACE FUNCTION public.check_event_not_locked()
RETURNS TRIGGER AS $$
DECLARE
  v_event_status TEXT;
  v_event_id UUID;
BEGIN
  v_event_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;

  SELECT status INTO v_event_status FROM public.events WHERE id = v_event_id;

  IF v_event_status = 'completed' THEN
    RAISE EXCEPTION 'Event % is completed and permanently locked against mutations.', v_event_id;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_checklist_sections ON public.checklist_sections;
CREATE TRIGGER trg_lock_checklist_sections
BEFORE INSERT OR UPDATE OR DELETE ON public.checklist_sections
FOR EACH ROW EXECUTE FUNCTION public.check_event_not_locked();

DROP TRIGGER IF EXISTS trg_lock_checklist_items ON public.checklist_items;
CREATE TRIGGER trg_lock_checklist_items
BEFORE INSERT OR UPDATE OR DELETE ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.check_event_not_locked();

DROP TRIGGER IF EXISTS trg_lock_event_members ON public.event_members;
CREATE TRIGGER trg_lock_event_members
BEFORE INSERT OR UPDATE OR DELETE ON public.event_members
FOR EACH ROW EXECUTE FUNCTION public.check_event_not_locked();

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read user profile data; users can only update their own profile
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

-- Events: Viewable by owner or members
CREATE POLICY "Events viewable by participants"
ON public.events FOR SELECT TO authenticated
USING (
  owner_id = (auth.jwt() ->> 'sub') OR
  EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = public.events.id AND clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

-- Events: Insertable by authenticated users
CREATE POLICY "Users can create events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

-- Events: Updatable by owner only
CREATE POLICY "Owners can update events"
ON public.events FOR UPDATE TO authenticated
USING (owner_id = (auth.jwt() ->> 'sub'))
WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

-- Checklist Sections: Viewable by event participants
CREATE POLICY "Sections viewable by event participants"
ON public.checklist_sections FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = public.checklist_sections.event_id AND clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

-- Checklist Items: Viewable by event participants
CREATE POLICY "Items viewable by event participants"
ON public.checklist_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = public.checklist_items.event_id AND clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

-- Templates: Owner only
CREATE POLICY "Templates viewable by owner"
ON public.checklist_templates FOR ALL TO authenticated
USING (owner_id = (auth.jwt() ->> 'sub'))
WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Template sections viewable by owner"
ON public.template_sections FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_templates
    WHERE id = public.template_sections.template_id AND owner_id = (auth.jwt() ->> 'sub')
  )
);

CREATE POLICY "Template items viewable by owner"
ON public.template_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_templates
    WHERE id = public.template_items.template_id AND owner_id = (auth.jwt() ->> 'sub')
  )
);

-- Activity Events: Viewable by event participants
CREATE POLICY "Activity events viewable by participants"
ON public.activity_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = public.activity_events.event_id AND clerk_user_id = (auth.jwt() ->> 'sub')
  )
);
