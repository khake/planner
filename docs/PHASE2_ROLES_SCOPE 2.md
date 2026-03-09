# Phase 2: Roles — ขอบเขตและแนวทาง (เมื่อพร้อม implement)

เอกสารนี้สรุปขอบเขตของ **Role ของแต่ละคน** ตามแผน Epic แล้วตามด้วย Roles เพื่อใช้เมื่อทีมพร้อม implement

## วัตถุประสงค์

กำหนดว่า **ใครทำอะไรได้บ้าง** ในระบบ เช่น

- สร้าง/แก้/ลบ Squad Epic
- สร้าง/แก้/ลบ Global Epic (Portfolio)
- จัดการ Squad (สร้าง/แก้/ลบโปรเจกต์)
- สิทธิ์ใน task (ดู/แก้/ลบ/assign)
- การเห็นรายการ Epics / Squads ตามสิทธิ์

## สิ่งที่ต้องออกแบบและ implement (เมื่อเริ่ม Phase 2)

1. **Role types**  
   กำหนดชุด role ที่ใช้ในระบบ เช่น  
   - admin — จัดการได้ทุกอย่าง รวมถึง Global Epic  
   - squad_lead — จัดการ Squad และ Squad Epic ภายใน Squad ที่ได้รับมอบ  
   - member — สร้าง/แก้ task และผูก Epic ภายใน Squad  
   - viewer — ดูอย่างเดียว  

2. **โมเดลข้อมูล**  
   - ตารางหรือความสัมพันธ์ระหว่าง user กับ role (ระดับระบบ และ/หรือระดับ Squad)  
   - การเก็บว่า user ใดมี role อะไรที่ระดับแอป หรือต่อ Squad  

3. **การตรวจสิทธิ์ (Authorization)**  
   - เช็คก่อนสร้าง/แก้/ลบ Epic (Squad vs Global)  
   - เช็คก่อนสร้าง/แก้/ลบ Project, Sprint, Task  
   - ใน API หรือใน UI ตามที่ตัดสินใจ  

4. **UI**  
   - แสดง/ซ่อนปุ่มหรือเมนูตาม role  
   - จำกัดการเข้าถึงหน้า (เช่น Portfolio/Global Epics อาจจำกัดเฉพาะ admin หรือ role ที่กำหนด)  

## ลำดับที่แนะนำเมื่อ implement

1. ออกแบบ role types และโมเดลข้อมูล (ตาราง/ความสัมพันธ์)  
2. Migration + types  
3. Logic ตรวจสิทธิ์ (helper / middleware / RLS ถ้าใช้ Supabase RLS)  
4. ปรับ UI ให้สอดคล้องกับสิทธิ์  

---

Phase 2 นี้จะทำเมื่อทีมพร้อม — ใช้เอกสารนี้เป็นฐานสำหรับการออกแบบและ implement ต่อ
