-- Jira Clone – ลบทั้งหมดแล้วสร้างใหม่ (ใช้ตอนเริ่มโปรเจกต์)
-- รัน: DATABASE_URL="postgresql://..." npm run db:migrate

-- ========== ลบของเดิม (เรียงตาม FK) ==========
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS sprints_updated_at ON public.sprints;
DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS users_updated_at ON public.users;

DROP TABLE IF EXISTS public.task_comments;
DROP TABLE IF EXISTS public.attachments;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.sprints;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.users;

DROP FUNCTION IF EXISTS public.set_updated_at();

DROP TYPE IF EXISTS task_priority;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS sprint_status;

-- ========== สร้างใหม่ ==========
CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed');
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status sprint_status NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'backlog',
  priority task_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sprints_project_id ON public.sprints(project_id);
CREATE INDEX idx_tasks_sprint_id ON public.tasks(sprint_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sprints_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.users IS 'Jira Clone users';
COMMENT ON TABLE public.projects IS 'Jira Clone projects';
COMMENT ON TABLE public.sprints IS 'Sprints within a project';
COMMENT ON TABLE public.tasks IS 'Tasks (sprint_id null = Backlog)';
