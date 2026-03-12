-- เพิ่มสถานะสำหรับ QA ลงใน task_status และเพิ่มฟิลด์ QA ให้ตาราง tasks

ALTER TYPE task_status
  ADD VALUE IF NOT EXISTS 'ready_for_qa';

ALTER TYPE task_status
  ADD VALUE IF NOT EXISTS 'qa_in_progress';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS qa_assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qa_status TEXT CHECK (qa_status IN ('pending', 'passed', 'failed')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS qa_checklist JSONB DEFAULT '[]'::jsonb;

