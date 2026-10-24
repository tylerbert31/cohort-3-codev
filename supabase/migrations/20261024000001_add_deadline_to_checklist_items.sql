-- Migration: Add optional deadline column to checklist_items
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_items_deadline ON public.checklist_items(deadline);
