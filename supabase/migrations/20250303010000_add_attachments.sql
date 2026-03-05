-- ตาราง attachments สำหรับแนบไฟล์กับ Task
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON public.attachments(task_id);

COMMENT ON TABLE public.attachments IS 'ไฟล์แนบของ Task (เก็บใน Storage bucket task-artifacts)';
