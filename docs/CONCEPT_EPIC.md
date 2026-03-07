# Concept: Epic

เอกสารนี้อธิบายแนวคิดการทำงานกับ **Epic** ในระบบ Planner (Jira Clone) เพื่อให้ทีมเข้าใจตรงกันก่อน implement

---

## 1. Epic คืออะไร

**Epic** คือ **กลุ่มงานขนาดใหญ่** ที่รวมหลาย Story / Task ให้อยู่ภายใต้ธีมหรือ initiative เดียวกัน ใช้สำหรับ:

- **จัดกลุ่มงาน** ตามเป้าหมายหรือฟีเจอร์ (เช่น "รองรับ GPU ใน Cluster", "ย้ายระบบไป Cloud")
- **ติดตามความคืบหน้า** ระดับ initiative (ดูว่า Epic นี้ทำไปแล้วกี่ %)
- **วางแผนและรายงาน** ว่า Sprint / Quarter นี้จะทำ Epic ไหนบ้าง

ในระบบเรา **Epic ไม่ใช่ type ของงาน** แต่เป็น **ตัวจัดกลุ่ม (container)** ที่งานหลายตัวสามารถผูกอยู่ด้วยได้

---

## 2. ความสัมพันธ์กับ entity อื่น

ระบบรองรับ Epic สองแบบในโครงสร้างเดียวกัน (ดูรายละเอียดในมาตรา 6.4):

```
Project (Squad)
  └── Squad Epic (project_id = Squad นั้น) — งานของ Squad นี้เท่านั้นที่ผูกได้
  └── Sprint
        └── Task / Story / Bug (อาจผูกกับ Squad Epic หรือ Global Epic หรือไม่ผูก)

Global Epic (project_id = null) — งานจากทุก Squad ผูกได้
  └── Task / Story / Bug จากหลาย Squad
```

- **Squad Epic** — สร้างและจัดการภายใน Squad; เฉพาะงานของ Squad นั้นที่ผูกกับ Epic นี้ได้
- **Global Epic** — สร้างที่ระดับแอป; งานจาก **ทุก Squad** ผูกกับ Epic นี้ได้
- **Task / Story / Bug** อาจมี **epic_id** (ผูกกับ Epic หนึ่งตัว) หรือ **ไม่มี** (งานทั่วไปที่ยังไม่จัดเข้า Epic)
- **Subtask** อยู่ภายใต้ parent task เท่านั้น — ไม่ผูกกับ Epic โดยตรง (Epic ดูจาก parent task)
- **Sprint** กับ **Epic** เป็นมุมมองคนละแบบ:
  - Sprint = ช่วงเวลา (งานนี้อยู่ใน Sprint ไหน)
  - Epic = ธีม/ initiative (งานนี้อยู่ภายใต้ Epic ไหน)

งานหนึ่งชิ้นสามารถ **ทั้งอยู่ใน Sprint และอยู่ใน Epic** พร้อมกันได้ (เช่น Story "รองรับ GPU scheduling" อยู่ใน Epic "GPU Support" และอยู่ใน Sprint 1)

---

## 3. กฎและข้อตกลง

| หัวข้อ | ข้อตกลง |
|--------|---------|
| **Squad Epic vs Global Epic** | Squad Epic (project_id มีค่า) สร้าง/จัดการใน Squad; Global Epic (project_id = null) สร้างที่ระดับแอป และรับงานจากทุก Squad |
| **งานผูกกับ Epic แบบ optional** | Task/Story/Bug มี `epic_id` ได้หนึ่งตัว หรือ null (ยังไม่จัดเข้า Epic) |
| **หนึ่งงานอยู่ Epic เดียว** | งานหนึ่งชิ้นผูกกับ Epic ได้เพียง 1 Epic |
| **ลบ Epic** | ต้องตัดสินใจ: ลบแล้วงานที่ผูกอยู่ให้ `epic_id = null` หรือไม่อนุญาตให้ลบถ้ามีงานผูกอยู่ |
| **Subtask** | ไม่มี epic_id โดยตรง — ถ้าต้องการ "งานใน Epic" นับจาก parent (Story/Task) ที่มี epic_id |

---

## 4. ข้อมูลที่เก็บสำหรับ Epic (ระดับ concept)

- **ชื่อ** (title)
- **คำอธิบาย** (description) — optional
- **โปรเจกต์ที่สังกัด** (project_id) — **optional**: มีค่า = Squad Epic, null = Global Epic
- **สถานะ** (status) — เช่น open / in progress / done (ถ้าต้องการติดตามความคืบหน้า Epic)
- **วันที่เริ่ม / วันที่เป้าหมาย** — optional สำหรับ roadmap
- **ลำดับการแสดง** (position) — optional สำหรับการเรียง Epic ในรายการ

งาน (Task/Story/Bug) จะมีฟิลด์ **epic_id** (อ้างอิงไปที่ Epic) — ถ้าไม่มีก็เป็น null

---

## 5. การใช้งานที่คาดหวัง (UX สรุป)

1. **สร้าง Epic**  
   - ทำได้จากหน้าหลักของ Squad (เช่น รายการ Epic ใน Squad, หรือปุ่ม "สร้าง Epic" ใน Backlog/ที่เหมาะสม)

2. **ผูกงานกับ Epic**  
   - จาก Task modal (หรือหน้าตารางงาน): เลือก "Epic" จาก dropdown / autocomplete ที่แสดงเฉพาะ Epic ของ Squad นั้น  
   - จาก Backlog/Board: อาจมีคอลัมน์หรือ badge แสดง Epic ของแต่ละงาน

3. **ดูงานตาม Epic**  
   - ดูรายการ Epic ของ Squad แล้วกดเข้าไปดูเฉพาะงานที่อยู่ใน Epic นั้น  
   - ภายหลังเมื่อมี Search & Filter จะมีตัวกรอง "ตาม Epic" ด้วย

4. **ความคืบหน้า Epic (ถ้ามี)**  
   - คำนวณจากสถานะของงานที่ผูกอยู่ (เช่น นับ % done จากจำนวนงานที่ status = done)

---

## 6. กรณีปรับให้ Epic อยู่เหนือระดับโปรเจกต์ (Cross-Project Epic)

ถ้าต้องการให้ **Epic ประกอบด้วยงานจากหลายๆ โปรเจกต์ได้** (Epic อยู่เหนือ Project) โครงสร้างจะเปลี่ยนเป็นประมาณนี้ และมีประเด็นที่ต้องพิจารณาเพิ่มดังนี้

### 6.1 โครงสร้างข้อมูล (ระดับ concept)

```
Organization / Workspace (ถ้ามี)
  ├── Project (Squad) A
  │     └── Task / Story / Bug (project_id = A)
  ├── Project (Squad) B
  │     └── Task / Story / Bug (project_id = B)
  └── Epic (ไม่ผูกกับ project_id; ผูกกับ org/workspace ถ้ามี)
        └── งานจากหลายโปรเจกต์ผูกกับ Epic นี้ได้ (task.epic_id)
```

- **Epic ไม่มี `project_id`** — Epic เป็นระดับบน (หรืออยู่ภายใต้ Organization/Workspace ถาเรามีตัวนี้)
- **Task ยังมี `project_id` อยู่เหมือนเดิม** — งานยังสังกัด Squad เดิม แค่เพิ่ม **`epic_id`** ชี้ไปที่ Epic ใดก็ได้ (ที่ user มีสิทธิ์เห็น)
- **หนึ่ง Epic มีงานจากหลายโปรเจกต์ได้** — เช่น Epic "ย้ายไป Cloud" มีงานจาก Squad HPC, Squad Platform, Squad Product

### 6.2 ประเด็นที่ต้องพิจารณาเพิ่ม

| ประเด็น | คำอธิบายและตัวเลือก |
|--------|----------------------|
| **ขอบเขตการมองเห็น Epic (Scoping)** | ถ้า Epic ข้ามโปรเจกต์ ต้องกำหนดว่า "ใครเห็น Epic อะไร" และ "Epic อยู่ภายใต้ขอบเขตไหน". ทางเลือกที่พบบ่อย: **(ก) ใช้ Organization/Workspace** — สร้าง entity ระดับบน (Org/Workspace) ที่มีหลาย Project; Epic สังกัด Org นั้น; ทุกคนใน Org เห็น Epic ชุดเดียวกัน. **(ข) Epic ทั้งระบบ (global)** — ทุก Epic ในระบบทุกคนเห็น (เหมาะถ้าเป็น single-tenant หรือทีมเดียว). **(ค) Epic ตามสิทธิ์** — กำหนดเองว่า user/role ใดเห็น Epic ใด (ซับซ้อนกว่า). **แนะนำ:** ถ้าอยากให้ข้ามโปรเจกต์อย่างชัดเจน ควรมีแนวคิด **Organization/Workspace** เพื่อให้ Epic มี "บ้าน" และไม่กลายเป็น global ทั้งระบบ |
| **ที่มาของ Epic (Epic อยู่ที่ไหน)** | Epic ไม่ได้อยู่ "ใน Squad" แล้ว — ต้องมีจุดสร้าง/จัดการ Epic เช่น **หน้ารายการ Epic ระดับ Org/Workspace** หรือ **เมนู "Epics" ระดับแอป**. การสร้าง/แก้/ลบ Epic จึงเป็น flow แยกจากหน้าของแต่ละ Squad |
| **การเลือก Epic ตอนผูกงาน** | ใน Task modal ของ Squad A เมื่อเลือก Epic จะต้องแสดง **Epics ที่ user มีสิทธิ์เห็น** (เช่น Epics ใน Org เดียวกับ Squad A). รายการ Epic จึงไม่ได้ filter ตาม project_id ของ task โดยตรง แต่ตาม **ขอบเขตของ Org/Workspace** (หรือทั้งระบบถ้าใช้แบบ global) |
| **สิทธิ์ (Permissions)** | ต้องตัดสินใจ: **ใครสร้าง/แก้/ลบ Epic ได้** (เช่น เฉพาะ Org admin, หรือทุกคนใน Org), **ใครผูกงานของ Squad เข้า Epic ได้** (เช่น คนที่แก้ task ได้ และ Epic นั้นอยู่ใน Org เดียวกับ Squad ของ task). ถ้ามี Org — สิทธิ์มักผูกกับ Org หรือกับ Role ใน Org |
| **มุมมองตาม Epic** | หน้ารายละเอียด Epic จะแสดง **งานจากหลาย Squad** — ต้องแสดง **ชื่อ Squad (หรือ project)** คู่กับแต่ละงาน เพื่อให้รู้ว่างานชิ้นนี้มาจากทีมไหน. อาจมี filter ย่อยเช่น "แสดงเฉพาะ Squad HPC" ในหน้า Epic |
| **Backlog / Board ยังเป็นต่อ Squad** | Backlog และ Board ยังเป็น **ต่อโปรเจกต์ (Squad)** ตามเดิม — แสดงเฉพาะงานของ Squad นั้น. การที่งานจะอยู่ใต้ Epic ข้ามโปรเจกต์ไม่เปลี่ยนพฤติกรรมนี้; แค่ใน card/backlog อาจแสดง badge Epic และเมื่อกดไปที่ Epic จะเห็นงานจากหลาย Squad |
| **ความคืบหน้าและรายงาน Epic** | ความคืบหน้า Epic = รวมสถานะของงานจาก **หลายโปรเจกต์**. การคำนวณ % done หรือ burndown ต้องชัดเจนว่า: นับทุก task ที่ epic_id = X จากทุก project. การรายงาน (เช่น "Epic นี้มีงานจาก 3 Squads") ต้อง query ข้าม project |
| **Migration / สถานะปัจจุบัน** | ถ้าเดิมมี "Epic ใต้ Project" อยู่แล้ว ต้องออกแบบ migration: เช่น สร้าง Org (หรือใช้ org เดียวของระบบ), ย้าย Epic ไปอยู่ที่ Org และลบ epic.project_id. สำหรับโปรเจกต์ที่ยังไม่เริ่มใช้ การออกแบบ Epic ระดับบนตั้งแต่แรกจะไม่ต้อง migrate |

### 6.3 สรุปตัวเลือกสำคัญ

1. **มี Organization/Workspace หรือไม่**  
   - **มี** → Epic สังกัด Org; แต่ละ Project สังกัด Org; ใครอยู่ใน Org เห็น Epics ของ Org นั้น. ชัดเจนและขยายต่อ (multi-tenant, หลายทีม) ได้ดี.  
   - **ไม่มี (Epic global)** → ง่ายกว่า แต่ทุก Epic อยู่ในขอบเขตเดียวกันทั้งระบบ; เหมาะถ้าเป็นแอปทีมเดียวและไม่วางแผนมีหลาย "องค์กร" ในระบบ

2. **สิทธิ์จัดการ Epic**  
   - กำหนดให้ชัดว่าใครสร้าง/แก้/ลบ Epic ได้ และใครผูก/ถอดงานเข้า Epic ได้ (โดยเฉพาะเมื่องานอยู่คนละ Squad)

3. **UI รายการ Epic และหน้ารายละเอียด Epic**  
   - รายการ Epic อยู่ที่ระดับ Org (หรือระดับแอป); หน้ารายละเอียด Epic แสดงงานจากหลายโปรเจกต์พร้อมแสดงชื่อ Squad ให้ชัดเจน

ถ้าตกลงใช้แบบ **Epic อยู่เหนือโปรเจกต์** แนะนำให้กำหนดขอบเขต (Org/Workspace หรือ global) และกฎสิทธิ์ให้ชัดก่อน implement จะได้ไม่ต้องแก้ schema/flow ใหญ่ทีหลัง

---

### 6.4 แนวคิดผสม: Squad Epics + Global Epics (แนะนำ)

แทนที่จะเลือกอย่างใดอย่างหนึ่งระหว่าง "Epic ใต้โปรเจกต์เท่านั้น" กับ "Epic ข้ามโปรเจกต์เท่านั้น" สามารถ **รองรับทั้งสองแบบในระบบเดียวกัน** ได้โดยใช้ฟิลด์ **`project_id` แบบ optional** ในตาราง Epic:

| ชนิด | project_id | ความหมาย | งานที่ผูกได้ |
|------|------------|----------|----------------|
| **Squad Epic** | มีค่า (ไม่ null) | Epic ของ Squad นั้นโดยเฉพาะ | เฉพาะงานที่ `task.project_id = epic.project_id` |
| **Global Epic** | null | Epic ข้าม Squad / ทั้งระบบ | งานจาก **ทุก Squad** ผูกได้ |

**ข้อดีของแนวคิดนี้**

- **ไม่ต้องมี Organization/Workspace** — มีแค่สองขอบเขต: ต่อ Squad กับทั้งระบบ
- **ยืดหยุ่น** — initiative ภายใน Squad ใช้ Squad Epic; initiative ข้ามทีมใช้ Global Epic
- **Schema เดียว** — ตาราง `epics` ตัวเดียว มี `project_id` (nullable); logic แยกตาม null หรือไม่ null
- **UX คุ้นเคย** — ใน Squad ยังมี "Epics ของ Squad นี้" ได้; พร้อมมีจุดสร้าง/ดู "Global Epics" แยก

**กฎการใช้งาน**

- **Squad Epic**  
  - สร้างจากภายใน Squad (เช่น หน้ารายการ Epic ของ Squad หรือปุ่มใน Backlog).  
  - แก้/ลบ ได้จากบริบทของ Squad นั้น.  
  - ตอนผูกงาน: เฉพาะ task ที่อยู่ Squad เดียวกับ Epic ถึงจะเลือก Epic นี้ได้ (หรือระบบเช็คให้: ถ้า task อยู่คนละ Squad กับ Epic ที่มี project_id ไม่ให้บันทึก).

- **Global Epic**  
  - สร้างจากจุดที่ระดับแอป (เช่น เมนู "Epics" หรือ "Global Epics").  
  - แก้/ลบ ได้จากหน้านั้น (หรือกำหนดสิทธิ์แยกถ้าต้องการ).  
  - ตอนผูกงาน: task จาก **Squad ใดก็ได้** เลือก Global Epic ได้.

**การแสดงใน UI**

- **รายการ Epic ใน Squad** — แสดงเฉพาะ Squad Epics ของ Squad นั้น (และอาจมีลิงก์/แท็บไป "Global Epics" เพื่อดูรวม).
- **ตอนเลือก Epic ใน Task modal** — แสดงทั้ง **Squad Epics ของ Squad นี้** และ **Global Epics** (อาจแบ่งเป็นสองกลุ่มหรือใส่ label "Squad" / "Global" ใน dropdown).
- **หน้ารายละเอียด Epic**  
  - Squad Epic: แสดงเฉพาะงานของ Squad นั้น (เหมือนเดิม).  
  - Global Epic: แสดงงานจากหลาย Squad พร้อมแสดงชื่อ Squad คู่กับแต่ละงาน.

**การตรวจสอบ (validation)**

- บันทึก `task.epic_id = E` เมื่อ:
  - ถ้า Epic E เป็น Squad Epic (`epic.project_id` ไม่ null): ต้อง **task.project_id = epic.project_id**.
  - ถ้า Epic E เป็น Global Epic (`epic.project_id` เป็น null): อนุญาตทุก task.

แนวคิด **Squad Epics + Global Epics** จึงรวมข้อดีของทั้งสองแบบ: ใช้ภายใน Squad ได้ตามเดิม และมีทางเลือกสำหรับ initiative ข้าม Squad โดยไม่ต้องเพิ่ม entity ระดับ Organization/Workspace

---

## 7. สิ่งที่ยังไม่รวมใน Concept นี้

- **Epic board** แยกต่างหาก (ดูเป็น Kanban ของ Epic) — ถ้าต้องการค่อยเพิ่มในรอบถัดไป
- **Hierarchy ย่อยใน Epic** (เช่น Epic → Feature → Story) — เรายังใช้แค่ระดับ Epic กับ Task/Story/Bug
- **สิทธิ์การจัดการ Epic** — ถ้า Epic ใต้ Project ใช้สิทธิ์ระดับ Squad; ถ้า Epic ข้ามโปรเจกต์ต้องกำหนดระดับ Org/Workspace หรือนโยบายแยก

---

## 8. ลำดับการ implement ที่แนะนำ (หลังตกลง concept)

1. **Schema** — ตาราง `epics` (มี `project_id` แบบ nullable) + เพิ่ม `epic_id` ใน `tasks`; validation: Squad Epic รับเฉพาะ task ที่ project_id ตรงกัน, Global Epic รับทุก task
2. **Types & API** — TypeScript types, การสร้าง/แก้/ลบ Epic (ทั้ง Squad และ Global), การอัปเดต task.epic_id พร้อมตรวจสอบชนิด Epic
3. **UI สร้าง/แก้ Epic** — ภายใน Squad สำหรับ Squad Epic; จุดระดับแอป (เช่น เมนู Epics) สำหรับ Global Epic
4. **UI ผูกงานกับ Epic** — ใน Task modal เลือก Epic (แสดงทั้ง Squad Epics ของ Squad นั้น + Global Epics), แสดง Epic บน card/backlog
5. **มุมมองตาม Epic** — หน้ารายการ Epic ของ Squad (Squad Epics) + หน้ารายการ Global Epics + หน้ารายละเอียด Epic (Squad Epic แสดงเฉพาะงานของ Squad; Global Epic แสดงงานจากหลาย Squad พร้อมชื่อ Squad)
6. **(รอบถัดไป)** Search & Filter — รวมตัวกรอง "ตาม Epic"

**หมายเหตุ:** แนวคิดที่ใช้คือ **Squad Epics + Global Epics** (มาตรา 6.4) — ไม่ต้องมี Organization/Workspace

---

ถ้าตรงกับที่คุณคิดไว้ เราจะใช้ concept นี้เป็นฐานออกแบบ schema และ flow การใช้งานต่อได้เลย ถ้าต้องการปรับ (เช่น เพิ่ม status ของ Epic, กฎการลบ Epic, หรือขอบเขต Epic ข้ามโปรเจกต์) บอกได้ครับ จะอัปเดตเอกสารนี้ให้ตรงกันก่อน implement
