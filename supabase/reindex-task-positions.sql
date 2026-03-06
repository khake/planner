-- Helper สำหรับ reindex ค่า public.tasks.position และ public.tasks.board_position
-- ใช้เมื่อค่า ordering เริ่มกระโดด/ซ้ำเยอะจากการลากวางจำนวนมาก

-- ============================================================
-- 1) Reindex position สำหรับ Backlog / Sprint list order
--    partition ตาม project_id + sprint_id
-- ============================================================
with ranked as (
  select
    id,
    row_number() over (
      partition by project_id, coalesce(sprint_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by position asc nulls last, created_at asc, id asc
    ) * 1024::double precision as new_position
  from public.tasks
)
update public.tasks as tasks
set position = ranked.new_position
from ranked
where tasks.id = ranked.id
  and tasks.position is distinct from ranked.new_position;

-- ============================================================
-- 2) Reindex board_position สำหรับ Board lane order
--    partition ตาม project_id + sprint_id + status
--    ใช้เฉพาะ task ที่อยู่ใน sprint
-- ============================================================
with ranked_board as (
  select
    id,
    row_number() over (
      partition by project_id, sprint_id, status
      order by board_position asc nulls last, created_at asc, id asc
    ) * 1024::double precision as new_board_position
  from public.tasks
  where sprint_id is not null
)
update public.tasks as tasks
set board_position = ranked_board.new_board_position
from ranked_board
where tasks.id = ranked_board.id
  and tasks.board_position is distinct from ranked_board.new_board_position;
