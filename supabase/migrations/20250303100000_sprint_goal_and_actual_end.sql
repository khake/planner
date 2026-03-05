-- เพิ่ม goal และ actual_end_date สำหรับ Sprint
-- start_date, end_date มีอยู่แล้วในตาราง sprints (DATE)

ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS actual_end_date TIMESTAMPTZ;

COMMENT ON COLUMN public.sprints.goal IS 'Sprint goal / เป้าหมายของสปรินท์';
COMMENT ON COLUMN public.sprints.actual_end_date IS 'วันเวลาที่ปิดสปรินท์จริง (เมื่อกด Complete Sprint)';
