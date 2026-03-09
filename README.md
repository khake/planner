# Project Tracking

ระบบติดตามงานทีมสไตล์ Jira สำหรับจัดการ Squad, Backlog, Sprint และ Board โดยพัฒนาด้วย **Next.js 15 (App Router)**, **Tailwind CSS**, **Shadcn UI** และ **Supabase**

## จุดประสงค์ของระบบ

โปรเจกต์นี้ถูกออกแบบมาเพื่อช่วยทีมวางแผนงานและติดตามสถานะงานในแต่ละ Sprint ได้ในที่เดียว โดยเน้น 3 มุมมองหลัก:

- มุมมองรวมของแต่ละ Squad เพื่อดูภาพรวมและ Sprint ทั้งหมด
- มุมมอง `Backlog` สำหรับวางแผน จัดลำดับงาน และย้ายงานเข้า Sprint
- มุมมอง `Board` สำหรับติดตามงานที่กำลังทำใน Sprint แบบ Kanban

ระบบเหมาะกับการใช้งานในทีมที่ต้องการ:

- แยกงานที่ยังไม่เริ่ม กับงานที่อยู่ใน Sprint อย่างชัดเจน
- จัดลำดับความสำคัญของงานก่อนเริ่ม Sprint
- ติดตามความคืบหน้างานรายวันผ่านสถานะ `todo`, `in_progress`, `review`, `done`
- เก็บบริบทของงานไว้ใน Task เช่น description, tags, comments และ attachments

## ฟีเจอร์หลัก

### 1. Authentication และ Profile

- Login ด้วย Supabase Auth
- Register ผู้ใช้ใหม่ได้
- หน้า `Profile` สำหรับแก้ชื่อที่ใช้แสดงและเปลี่ยนรหัสผ่าน
- ข้อมูลผู้ใช้ sync ระหว่าง `auth.users`, `public.profiles` และ `public.users`

### 2. Squad / Project Overview

- หน้า `Squads` แสดงรายการทีมทั้งหมดในระบบ
- เข้าไปดูรายละเอียดแต่ละ Squad ได้
- ดูรายการ Sprint ของ Squad พร้อมสถานะ `planned`, `active`, `completed`

### 3. Backlog Planning

- ดูงานใน Backlog และงานที่อยู่ในแต่ละ Sprint ของ Squad เดียวกัน
- ลากงานจาก Backlog เข้า Sprint หรือย้ายกลับมา Backlog ได้
- จัดลำดับงานใน Backlog และลำดับรวมของงานใน Sprint ได้
- สร้าง Sprint ใหม่จากหน้า Backlog
- สร้าง Task ใหม่ได้ทั้งใน Backlog และใน Sprint
- เริ่ม Sprint ได้จากหน้า Backlog

หมายเหตุเชิงระบบ:
- `position` ใช้เป็น source of truth สำหรับลำดับงานใน `Backlog` และลำดับรวมงานใน Sprint
- การลากในหน้า Backlog จะไม่ไปกระทบลำดับใน Board

### 4. Sprint Board

- แสดงงานใน Sprint แบบ Kanban แยกเป็น lane:
  - `todo`
  - `in_progress`
  - `review`
  - `done`
- ลากงานเปลี่ยนลำดับใน lane ได้
- ลากงานข้าม lane เพื่อเปลี่ยนสถานะได้
- แสดง progress ของ Sprint จากจำนวนงานที่ `done`
- รองรับการ Start Sprint และ Complete Sprint
- ตอน Complete Sprint สามารถเลือกได้ว่าจะย้ายงานที่ยังไม่เสร็จกลับ Backlog หรือย้ายไป Sprint ถัดไป

หมายเหตุเชิงระบบ:
- `board_position` ใช้เป็น source of truth สำหรับลำดับในแต่ละ lane ของ Board
- การลากในหน้า Board จะไม่ไปทำให้ลำดับใน Backlog เพี้ยน

### 5. Task Detail

เมื่อคลิกการ์ดงานจาก Backlog หรือ Board จะเปิด `Task Modal` ที่ใช้จัดการรายละเอียดงานได้ เช่น

- แก้ชื่อและรายละเอียดงาน
- เปลี่ยนประเภทงาน เช่น `story`, `task`, `bug`, `subtask`
- ตั้ง parent task
- จัดการ tags
- เปลี่ยนสถานะและความสำคัญ
- ระบุผู้รับผิดชอบ
- เพิ่ม subtask
- แนบไฟล์
- เขียน Activity / Comments ภายในงาน

### 6. Comments และ Activity Panel

- ส่งข้อความคุยกันภายใน Task ได้
- ผู้ส่งข้อความอิงจากผู้ที่ login อยู่จริง
- ใช้เก็บ context ของงาน เช่น คำถาม คำตอบ หรืออัปเดตความคืบหน้า

## โครงสร้างหน้าหลักของระบบ

- `/` หน้าแรก
- `/login` เข้าสู่ระบบ
- `/register` ลงทะเบียนผู้ใช้ใหม่
- `/projects` รายการ Squad ทั้งหมด
- `/projects/[id]` หน้ารายละเอียด Squad
- `/projects/[id]/backlog` หน้า Backlog ของ Squad
- `/projects/[id]/board` หน้า Active Sprint ของ Squad
- `/projects/[id]/board/[sprintId]` หน้า Board ของ Sprint ที่เลือก
- `/profile` หน้าโปรไฟล์ผู้ใช้

## วิธีใช้งานสำหรับผู้ใช้

### เริ่มต้นใช้งาน

1. เข้าสู่ระบบที่หน้า `Login`
2. ไปที่หน้า `Squads`
3. เลือก Squad ที่ต้องการทำงาน
4. เลือกว่าจะทำงานในมุมมอง `Backlog` หรือ `Active Sprint`

### การวางแผนงานใน Backlog

1. เข้าไปที่หน้า `Backlog` ของ Squad
2. เพิ่มงานใหม่ใน Backlog หรือใน Sprint ที่ต้องการ
3. ลากงานเพื่อจัดลำดับความสำคัญ
4. ลากงานจาก Backlog เข้า Sprint เมื่อต้องการนำงานเข้าสปรินต์
5. ถ้ายังไม่มี Sprint ให้กด `Create Sprint`
6. เมื่อต้องการเริ่ม Sprint ให้กด `Start Sprint`

เหมาะสำหรับ:
- Product owner
- Team lead
- คนที่วางแผน Sprint

### การติดตามงานใน Sprint Board

1. เข้าไปที่หน้า `Active Sprint` หรือหน้า Board ของ Sprint ที่ต้องการ
2. ดูงานตามสถานะในแต่ละ lane
3. ลากงานข้าม lane เมื่องานมีความคืบหน้า
4. จัดลำดับงานภายใน lane ตามลำดับการทำงาน
5. เมื่อจบ Sprint ให้กด `Complete Sprint`
6. เลือกปลายทางของงานที่ยังไม่เสร็จ

เหมาะสำหรับ:
- ทีมพัฒนา
- Scrum master
- ผู้จัดการโครงการที่ต้องการติดตามความคืบหน้า

### การจัดการรายละเอียด Task

1. คลิกการ์ดงานจากหน้า Backlog หรือ Board
2. แก้ไขข้อมูลที่จำเป็นใน modal
3. เพิ่ม tags เพื่อจัดหมวดหมู่งาน
4. แนบไฟล์ประกอบ เช่น requirement, รูป mockup, เอกสารอ้างอิง
5. เพิ่ม subtask เพื่อแตกงานย่อย
6. ใช้ Activity & Comments สำหรับคุยกันในงานเดียวกัน

## คู่มือสำหรับผู้ดูแลระบบ / นักพัฒนา

## การติดตั้งและรันในเครื่อง

1. ติดตั้ง dependencies

```bash
npm install
```

2. ตั้งค่า environment

- คัดลอก `.env.local.example` เป็น `.env.local`
- กำหนดค่าอย่างน้อย:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL`

3. รัน dev server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## การจัดการฐานข้อมูล

สคริปต์ในโปรเจกต์:

- `npm run db:migrate` รันไฟล์ SQL ใน `supabase/migrations`
- `npm run db:seed` ใส่ข้อมูลตัวอย่าง
- `npm run db:reset` reset schema แล้ว seed ใหม่
- `npm run db:reindex-positions` reindex ลำดับ `position`
- `npm run db:reindex-positions -- --board` reindex ลำดับ `board_position`
- `npm run db:resync-auth-users` sync ผู้ใช้จาก `auth.users` ไป `public.profiles` และ `public.users`

ข้อควรระวัง:
- `npm run db:migrate` ในโปรเจกต์นี้ยังรัน migration ทุกไฟล์เรียงลำดับแบบตรง ๆ
- ไฟล์ `supabase/migrations/20250302000000_initial_schema.sql` เป็นลักษณะสร้าง schema ใหม่ทั้งก้อน
- ถ้าจะใช้กับ production ควรตรวจ flow migration ให้เหมาะกับ environment ที่มีข้อมูลอยู่แล้ว

## Schema หลักของระบบ

- `auth.users` ผู้ใช้จาก Supabase Auth
- `profiles` โปรไฟล์ผู้ใช้สำหรับแสดงผลในแอป
- `users` ตารางผู้ใช้เดิมที่ใช้รองรับ relation บางจุดในระบบ
- `projects` ข้อมูล Squad / โปรเจกต์
- `sprints` ข้อมูล Sprint
- `tasks` ข้อมูลงาน
- `attachments` ไฟล์แนบของงาน
- `task_comments` คอมเมนต์และแชทในงาน
- `activity_logs` ประวัติการเปลี่ยนแปลงสำคัญ

Types อยู่ที่ `src/types/index.ts`

## โครงสร้างโฟลเดอร์

```text
src/
├── app/                        routes หลักของระบบ
├── components/                 UI shared components
├── features/
│   ├── backlog/                ฟีเจอร์ Backlog Planning
│   ├── board/                  ฟีเจอร์ Sprint Board และ Task Modal
│   ├── profile/                ฟีเจอร์โปรไฟล์ผู้ใช้
│   ├── projects/               ฟีเจอร์ Squad overview
│   └── sprints/                ฟีเจอร์สร้าง Sprint
├── lib/                        utilities และ Supabase client
└── types/                      TypeScript types
```

## Deploy ไป Production

อ่านคู่มือใน `docs/DEPLOYMENT-AWS.md`

รองรับแนวทางหลัก:

- AWS Amplify
- EC2 + GitHub Actions

## คำสั่งที่ใช้บ่อย

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run db:migrate
npm run db:seed
npm run db:resync-auth-users
```
