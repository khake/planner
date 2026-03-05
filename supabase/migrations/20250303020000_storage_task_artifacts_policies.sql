-- Storage policies สำหรับ bucket "task-artifacts" (ให้อัปโหลด/อ่าน/ลบได้)
-- รันซ้ำได้: DROP IF EXISTS ก่อน CREATE

DROP POLICY IF EXISTS "task-artifacts: INSERT" ON storage.objects;
DROP POLICY IF EXISTS "task-artifacts: SELECT" ON storage.objects;
DROP POLICY IF EXISTS "task-artifacts: DELETE" ON storage.objects;
DROP POLICY IF EXISTS "task-artifacts: UPDATE" ON storage.objects;

CREATE POLICY "task-artifacts: INSERT"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'task-artifacts');

CREATE POLICY "task-artifacts: SELECT"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'task-artifacts');

CREATE POLICY "task-artifacts: DELETE"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'task-artifacts');

CREATE POLICY "task-artifacts: UPDATE"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'task-artifacts');
