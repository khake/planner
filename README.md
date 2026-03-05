# Jira Clone

โปรเจกต์ Jira Clone ที่ใช้ **Next.js 15 (App Router)**, **Tailwind CSS**, **Shadcn UI** และ **Supabase**

## โครงสร้างโฟลเดอร์ (Feature-based)

```
src/
├── app/                    # App Router (routes + layout)
│   ├── layout.tsx
│   ├── page.tsx
│   └── projects/
├── components/             # UI components แบบ global (เช่น Shadcn)
│   └── ui/
├── features/              # แบ่งตามฟีเจอร์
│   ├── projects/
│   │   └── components/
│   ├── sprints/
│   ├── tasks/
│   └── users/
├── lib/                   # Utilities, Supabase client
│   ├── supabase/
│   └── utils.ts
└── types/                 # TypeScript interfaces
    └── index.ts
```

## วิธีรัน

1. **ติดตั้ง dependencies**
   ```bash
   npm install
   ```

2. **ตั้งค่า Supabase**
   - คัดลอก `.env.local.example` เป็น `.env.local`
   - ใส่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` จาก Supabase Dashboard (Project Settings → API)
   - **อย่า commit ไฟล์ `.env.local`** (มีใน `.gitignore` แล้ว)

3. **สร้างตารางใน Supabase**
   - เปิด Supabase Dashboard → SQL Editor
   - รันสคริปต์ใน `supabase/migrations/20250302000000_initial_schema.sql`

4. **รัน dev server**
   ```bash
   npm run dev
   ```
   เปิด [http://localhost:3000](http://localhost:3000)

## Database Schema (Supabase)

- **users** – id, name, avatar_url
- **projects** – id, name, description
- **sprints** – id, project_id, name, status (planned | active | completed), start_date, end_date
- **tasks** – id, sprint_id, title, description, status (backlog | todo | in_progress | done), priority, assignee_id

Types ตรงกับ schema อยู่ที่ `src/types/index.ts`

## สคริปต์

- `npm run dev` – รันโหมดพัฒนา (Turbopack)
- `npm run build` – build สำหรับ production
- `npm run start` – รันหลัง build
- `npm run lint` – ตรวจโค้ดด้วย ESLint
