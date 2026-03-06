DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'task_type'
  ) THEN
    CREATE TYPE task_type AS ENUM ('story', 'task', 'bug', 'subtask');
  END IF;
END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS type task_type NOT NULL DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS parent_id UUID,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS position DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM clock_timestamp()),
  ADD COLUMN IF NOT EXISTS board_position DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_parent_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_parent_id_fkey
      FOREIGN KEY (parent_id)
      REFERENCES public.tasks(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_sprint_position
  ON public.tasks(project_id, sprint_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_status_board_position
  ON public.tasks(sprint_id, status, board_position);

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY project_id, sprint_id
      ORDER BY created_at, id
    ) * 1024)::DOUBLE PRECISION AS calculated_position
  FROM public.tasks
)
UPDATE public.tasks AS tasks
SET position = ranked.calculated_position
FROM ranked
WHERE tasks.id = ranked.id;

WITH ranked_board AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY project_id, sprint_id, status
      ORDER BY created_at, id
    ) * 1024)::DOUBLE PRECISION AS calculated_board_position
  FROM public.tasks
  WHERE sprint_id IS NOT NULL
)
UPDATE public.tasks AS tasks
SET board_position = ranked_board.calculated_board_position
FROM ranked_board
WHERE tasks.id = ranked_board.id
  AND tasks.sprint_id IS NOT NULL;
