-- เพิ่ม status 'review' สำหรับ Kanban
DO $$ BEGIN
  ALTER TYPE task_status ADD VALUE 'review';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
