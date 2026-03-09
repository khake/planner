# Deploy & Rollback (develop → main)

## Deploy production

หลัง push ไปที่ `develop` แล้ว รัน:

```bash
npm run deploy:merge
```

จะ merge `origin/develop` เข้า `main` แล้ว push ขึ้น GitHub (Amplify deploy ต่อ)

---

## Rollback main ไปเวอร์ชันก่อนหน้า

### วิธีที่ 1: Revert commit ล่าสุด (แนะนำ)

ใช้เมื่ออยาก **ยกเลิกการ merge ล่าสุด** โดยไม่ลบ history — Git จะสร้าง commit ใหม่ที่ undo การเปลี่ยนแปลง

```bash
npm run deploy:rollback
```

หรือรันสคริปต์โดยตรง:

```bash
./scripts/rollback-main.sh
```

สคริปต์จะแสดง commit ล่าสุดบน main แล้วถามยืนยันก่อน revert และ push

---

### วิธีที่ 2: Rollback ไปที่ commit ที่กำหนด (reset + force push)

ใช้เมื่ออยากให้ **main ชี้ไปที่ commit เก่าที่ระบุ** (history บน main จะถูกเขียนใหม่)

**ขั้นตอน:**

1. ดูประวัติ commit บน main:
   ```bash
   git fetch origin
   git log origin/main --oneline -10
   ```

2. เลือก commit hash ที่ต้องการ (เช่น `abc1234`) แล้วรัน:
   ```bash
   git checkout main
   git pull origin main
   git reset --hard <commit-hash>   # เช่น git reset --hard abc1234
   git push origin main --force
   git checkout develop
   ```

**ข้อควรระวัง:** `--force` จะเขียน history ใหม่บน origin ถ้ามีคนอื่น pull main อยู่จะต้องจัดระเบียบกันใหม่ ดังนั้นวิธีที่ 1 (revert) มักปลอดภัยกว่า

---

### สรุปเปรียบเทียบ

| | Revert (วิธีที่ 1) | Reset (วิธีที่ 2) |
|---|-------------------|-------------------|
| History | ไม่ลบ เพิ่ม revert commit | ลบ commit ที่ใหม่กว่าออกไป |
| ใช้เมื่อ | ยกเลิก merge ล่าสุด / อยากให้ประวัติชัด | อยากให้ main ชี้ไปที่ commit เก่าจริงๆ |
| ความเสี่ยง | ต่ำ | สูงกว่า (force push) |
