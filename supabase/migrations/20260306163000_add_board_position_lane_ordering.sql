ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS board_position DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_tasks_sprint_status_board_position
  ON public.tasks(sprint_id, status, board_position);

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
  AND tasks.sprint_id IS NOT NULL
  AND tasks.board_position IS NULL;
