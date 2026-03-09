DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'project_role'
  ) THEN
    CREATE TYPE project_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role project_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id
  ON public.project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_role
  ON public.project_members(project_id, role);

DROP TRIGGER IF EXISTS project_members_updated_at ON public.project_members;
CREATE TRIGGER project_members_updated_at
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.project_members IS 'สมาชิกของแต่ละโปรเจกต์และบทบาทสำหรับ authorization';
COMMENT ON COLUMN public.project_members.role IS 'owner | admin | member | viewer';

