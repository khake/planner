# QA Smoke Tests

สคริปต์ในโฟลเดอร์นี้ใช้สำหรับตรวจ flow บน production แบบอัตโนมัติ โดยเฉพาะปัญหา auth/session

## ใช้งาน

```bash
QA_BASE_URL="https://planner.a-coder.com" \
QA_EMAIL="your-email@example.com" \
QA_PASSWORD="your-password" \
node tests/qa/prod-auth-smoke.js
```

## ตัวแปรเสริม

- `QA_HEADLESS=false` เพื่อเปิด browser ให้เห็นตอนรัน
- `QA_DIRECT_BACKLOG_URL="https://planner.a-coder.com/projects/<id>/backlog"` เพื่อบังคับทดสอบ backlog URL ที่ต้องการ
- `QA_PROJECT_ID="uuid"` ใช้ project id สำหรับเช็คหน้า project detail (ถ้าไม่ตั้ง จะใช้ id จาก backlog link แรก)
- `QA_EXPECT_VERSION="0.1.0"` ถ้าตั้งค่า สคริปต์จะเช็คว่า build info บนเว็บตรงกับเวอร์ชันที่คาดหวังหรือไม่ ถ้าไม่ตรงจะ exit code 2

## สิ่งที่สคริปต์เช็ก

- login สำเร็จหรือไม่
- **หลัง login:** เข้าแต่ละหน้าโดยไม่ถูก redirect ไป `/login`
  - `projectsPage` — `/projects`
  - `profilePage` — `/profile`
  - `projectDetailPage` — `/projects/[id]`
  - `firstBacklog` — ลิงก์ backlog แรกจากหน้า projects
  - `directBacklog` — เปิด URL backlog โดยตรง (หรือ `QA_DIRECT_BACKLOG_URL`)
  - `backlogFromDetail` — จากหน้า project detail คลิกไป backlog (ถ้ามี)
- **Build info** — ดึงจาก `/api/build-info` (single source เดียวกับ BuildInfo บนหน้าเว็บ)

สคริปต์จะ print ผลลัพธ์เป็น JSON และออกด้วย exit code:

- `0` = ผ่าน
- `2` = พบว่า navigation ใด navigation หนึ่งถูก redirect ไป `/login`
- `1` = รันไม่สำเร็จ เช่น credential ไม่ครบ หรือ browser launch ไม่ได้

