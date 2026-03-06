-- Ticket number and shareable link: project_key, ticket_number, ticket_key
-- project_key: auto-generated once, immutable (e.g. HPC, PRODUCT)
-- ticket_key: project_key || '-' || ticket_number (e.g. HPC-12)

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_key TEXT,
  ADD COLUMN IF NOT EXISTS last_ticket_number BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ticket_number BIGINT,
  ADD COLUMN IF NOT EXISTS ticket_key TEXT;

-- Backfill project_key for existing projects (normalize name, ensure unique)
DO $$
DECLARE
  r RECORD;
  base_key TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR r IN SELECT id, name FROM public.projects WHERE project_key IS NULL
  LOOP
    base_key := UPPER(REGEXP_REPLACE(TRIM(r.name), '[^A-Za-z0-9]', '', 'g'));
    IF LENGTH(base_key) > 10 THEN
      base_key := LEFT(base_key, 10);
    END IF;
    IF base_key = '' THEN
      base_key := 'PROJECT';
    END IF;
    candidate := base_key;
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.projects WHERE project_key = candidate AND id != r.id) LOOP
      suffix := suffix + 1;
      candidate := base_key || '_' || suffix;
    END LOOP;
    UPDATE public.projects SET project_key = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill ticket_number and ticket_key for existing tasks (order by created_at, id per project)
WITH ordered AS (
  SELECT id, project_id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.tasks
  WHERE ticket_number IS NULL
),
with_key AS (
  SELECT o.id, o.rn, p.project_key
  FROM ordered o
  JOIN public.projects p ON p.id = o.project_id
)
UPDATE public.tasks t
SET ticket_number = w.rn::BIGINT,
    ticket_key = w.project_key || '-' || w.rn
FROM with_key w
WHERE t.id = w.id;

-- Sync last_ticket_number on projects
UPDATE public.projects p
SET last_ticket_number = COALESCE(
  (SELECT MAX(ticket_number) FROM public.tasks WHERE project_id = p.id),
  0
);

-- Make columns NOT NULL only when no NULLs remain (backfill done or empty table)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE project_key IS NULL) THEN
    ALTER TABLE public.projects ALTER COLUMN project_key SET NOT NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE ticket_number IS NULL OR ticket_key IS NULL) THEN
    ALTER TABLE public.tasks
      ALTER COLUMN ticket_number SET NOT NULL,
      ALTER COLUMN ticket_key SET NOT NULL;
  END IF;
END $$;

-- Unique constraints and indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_project_key ON public.projects(project_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_ticket_key ON public.tasks(ticket_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_project_ticket_number ON public.tasks(project_id, ticket_number);

-- Function: generate project_key on project insert (auto, immutable)
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

DROP TRIGGER IF EXISTS set_project_key_trigger ON public.projects;
CREATE TRIGGER set_project_key_trigger
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_key();

-- Function: allocate ticket_number and set ticket_key on task insert (atomic per project)
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

DROP TRIGGER IF EXISTS allocate_ticket_key_trigger ON public.tasks;
CREATE TRIGGER allocate_ticket_key_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.allocate_ticket_key();

COMMENT ON COLUMN public.projects.project_key IS 'Short unique key for ticket prefix (e.g. HPC), auto-generated, immutable';
COMMENT ON COLUMN public.projects.last_ticket_number IS 'Last allocated ticket number for this project';
COMMENT ON COLUMN public.tasks.ticket_number IS 'Sequence number within project';
COMMENT ON COLUMN public.tasks.ticket_key IS 'Display key for ticket (e.g. HPC-12), unique globally';
