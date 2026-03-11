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

## สิ่งที่สคริปต์เช็ก

- login สำเร็จหรือไม่
- เข้า `/projects` ได้หรือไม่
- คลิกเข้า `project detail` และ `backlog` แล้วถูกเด้งกลับ `/login` หรือไม่
- direct navigation ไปหน้า backlog หลัง login แล้วมีปัญหาหรือไม่

สคริปต์จะ print ผลลัพธ์เป็น JSON และออกด้วย exit code:

- `0` = ผ่าน
- `2` = พบว่า navigation ใด navigation หนึ่งถูก redirect ไป `/login`
- `1` = รันไม่สำเร็จ เช่น credential ไม่ครบ หรือ browser launch ไม่ได้

