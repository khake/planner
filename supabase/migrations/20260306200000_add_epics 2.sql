-- Epic (Squad + Global): ตาราง epics และ epic_id ใน tasks
-- project_id NOT NULL = Squad Epic, project_id IS NULL = Global Epic
-- Idempotent: ถ้า initial_schema สร้าง epics ไว้แล้ว จะข้ามการสร้างตาราง

CREATE TABLE IF NOT EXISTS public.epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  position DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM clock_timestamp()),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS epics_updated_at ON public.epics;
CREATE TRIGGER epics_updated_at
  BEFORE UPDATE ON public.epics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_epics_project_id ON public.epics(project_id);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_epic_id ON public.tasks(epic_id);

COMMENT ON TABLE public.epics IS 'Epics: Squad Epic (project_id set) or Global Epic (project_id null)';
COMMENT ON COLUMN public.epics.project_id IS 'Null = Global Epic; non-null = Squad Epic';
COMMENT ON COLUMN public.tasks.epic_id IS 'Optional link to Epic (Squad or Global)';
