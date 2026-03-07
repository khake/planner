-- Jira Clone – ลบทั้งหมดแล้วสร้างใหม่ (ใช้ตอนเริ่มโปรเจกต์)
-- รัน: DATABASE_URL="postgresql://..." npm run db:migrate

-- ========== ลบของเดิม (เรียงตาม FK) ==========
DROP TRIGGER IF EXISTS allocate_ticket_key_trigger ON public.tasks;
DROP TRIGGER IF EXISTS set_project_key_trigger ON public.projects;
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'epics') THEN
    DROP TRIGGER IF EXISTS epics_updated_at ON public.epics;
  END IF;
END $$;
DROP TRIGGER IF EXISTS sprints_updated_at ON public.sprints;
DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS users_updated_at ON public.users;

DROP TABLE IF EXISTS public.task_comments;
DROP TABLE IF EXISTS public.attachments;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.epics;
DROP TABLE IF EXISTS public.sprints;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.users;

DROP FUNCTION IF EXISTS public.allocate_ticket_key();
DROP FUNCTION IF EXISTS public.set_project_key();
DROP FUNCTION IF EXISTS public.set_updated_at();

DROP TYPE IF EXISTS task_type;
DROP TYPE IF EXISTS task_priority;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS sprint_status;

-- ========== สร้างใหม่ ==========
CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed');
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_type AS ENUM ('story', 'task', 'bug', 'subtask');

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
  project_key TEXT,
  last_ticket_number BIGINT NOT NULL DEFAULT 0,
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

CREATE TABLE public.epics (
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

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  type task_type NOT NULL DEFAULT 'task',
  parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  position DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM clock_timestamp()),
  board_position DOUBLE PRECISION,
  status task_status NOT NULL DEFAULT 'backlog',
  priority task_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ticket_number BIGINT,
  ticket_key TEXT,
  epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sprints_project_id ON public.sprints(project_id);
CREATE INDEX idx_epics_project_id ON public.epics(project_id);
CREATE INDEX idx_tasks_sprint_id ON public.tasks(sprint_id);
CREATE INDEX idx_tasks_epic_id ON public.tasks(epic_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_id);
CREATE INDEX idx_tasks_project_sprint_position ON public.tasks(project_id, sprint_id, position);
CREATE INDEX idx_tasks_sprint_status_board_position ON public.tasks(sprint_id, status, board_position);
CREATE UNIQUE INDEX idx_projects_project_key ON public.projects(project_key);
CREATE UNIQUE INDEX idx_tasks_ticket_key ON public.tasks(ticket_key);
CREATE UNIQUE INDEX idx_tasks_project_ticket_number ON public.tasks(project_id, ticket_number);

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
CREATE TRIGGER epics_updated_at
  BEFORE UPDATE ON public.epics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_project_key()
RETURNS TRIGGER AS $$
DECLARE
  base_key TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  IF NEW.project_key IS NOT NULL AND NEW.project_key != '' THEN
    RETURN NEW;
  END IF;
  base_key := UPPER(REGEXP_REPLACE(TRIM(NEW.name), '[^A-Za-z0-9]', '', 'g'));
  IF LENGTH(base_key) > 10 THEN
    base_key := LEFT(base_key, 10);
  END IF;
  IF base_key = '' THEN
    base_key := 'PROJECT';
  END IF;
  candidate := base_key;
  WHILE EXISTS (SELECT 1 FROM public.projects WHERE project_key = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_key || '_' || suffix;
  END LOOP;
  NEW.project_key := candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_key_trigger
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_key();

CREATE OR REPLACE FUNCTION public.allocate_ticket_key()
RETURNS TRIGGER AS $$
DECLARE
  v_project_key TEXT;
  v_ticket_number BIGINT;
BEGIN
  IF NEW.ticket_key IS NOT NULL AND NEW.ticket_key != '' THEN
    RETURN NEW;
  END IF;
  UPDATE public.projects
  SET last_ticket_number = last_ticket_number + 1
  WHERE id = NEW.project_id
  RETURNING project_key, last_ticket_number INTO v_project_key, v_ticket_number;
  IF v_project_key IS NULL THEN
    RAISE EXCEPTION 'project_id % not found', NEW.project_id;
  END IF;
  NEW.ticket_number := v_ticket_number;
  NEW.ticket_key := v_project_key || '-' || v_ticket_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER allocate_ticket_key_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.allocate_ticket_key();

COMMENT ON TABLE public.users IS 'Jira Clone users';
COMMENT ON TABLE public.projects IS 'Jira Clone projects';
COMMENT ON TABLE public.sprints IS 'Sprints within a project';
COMMENT ON TABLE public.tasks IS 'Tasks (sprint_id null = Backlog)';
