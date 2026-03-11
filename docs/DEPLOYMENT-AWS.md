# Deploy จาก GitHub ไปยัง AWS

คู่มือนี้แนะนำ 2 วิธีหลัก: **AWS Amplify** (ง่าย เหมาะกับเริ่มต้น) และ **EC2 + GitHub Actions** (ควบคุม server เองได้เต็มที่)

---

## วิธีที่ 1: AWS Amplify (แนะนำ)

Amplify เชื่อมกับ GitHub แล้ว build + deploy อัตโนมัติเมื่อ push และรองรับ Next.js (SSR/API routes) ได้  

**ถ้ามีโดเมนหลักอยู่แล้ว (เช่น a-coder.com)** แนะนำให้ deploy แอปนี้เป็น **subdomain** เช่น `planner.a-coder.com` — ตั้งค่าตามขั้นตอนที่ 7 ด้านล่าง

**ถ้า a-coder.com ใช้ repo อื่นอยู่แล้ว (เช่น a-coder-web):**  
ต้องสร้าง **Amplify app ใหม่** สำหรับ repo ของแอปนี้ (planner) แล้วผูกแค่ subdomain `planner.a-coder.com` กับแอปใหม่ — ไม่ใช้แอปเดิมของ a-coder-web เพื่อไม่ให้ทั้งสอง repo อยู่แอปเดียวกัน

### ขั้นตอน

1. **Push โค้ดขึ้น GitHub**
   - สร้าง repo ใน GitHub แล้ว push โปรเจกต์นี้ขึ้นไป (อย่า push `.env.local`)

2. **เข้า AWS Amplify Console**
   - ล็อกอิน [AWS Console](https://console.aws.amazon.com/) → ค้นหา **Amplify**
   - กด **Create new app** → **Host web app**

3. **เชื่อม GitHub**
   - เลือก **GitHub** → อนุญาต AWS เข้าถึง GitHub (ถ้ายังไม่เคย)
   - เลือก **Organization** และ **Repository** ของโปรเจกต์
   - เลือก branch ที่จะ deploy (เช่น `main`)
   - กด **Next**

4. **ตั้งค่า Build**
   - โปรเจกต์มี `amplify.yml` ใน root — Amplify จะใช้ build spec นี้โดยอัตโนมัติ
   - ถ้าไม่ detect หรือ build ล้ม ให้ใช้ build settings ด้านล่าง (กด **Edit** ที่ส่วน build settings):

   ```yaml
   version: 1
   applications:
     - appRoot: .
       frontend:
         phases:
           preBuild:
             commands:
               - npm ci
           build:
             commands:
               - npm run build
         artifacts:
           baseDirectory: .next
           files:
             - '**/*'
         cache:
           paths:
             - node_modules/**/*
       customHeaders:
         - pattern: '**'
           headers:
             - key: 'Strict-Transport-Security'
               value: 'max-age=31536000; includeSubDomains'
   ```

   - **Next.js ใช้โหมด SSR ของ Amplify** ไม่ต้องใส่ `output: 'export'` (ถ้าใช้ static export ค่อยปรับ)

5. **ใส่ Environment variables**
   - ใน Amplify: **App settings** → **Environment variables**
   - เพิ่มค่าจาก `.env.local.example`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `APP_LOGIN_USER` (ถ้าใช้)
     - `APP_LOGIN_PASSWORD` (ถ้าใช้)
   - **อย่า** commit ค่าเหล่านี้ใน repo

   **Build Info (อัตโนมัติ)** — ไม่ต้องตั้งเอง
   - `scripts/build-with-env.js` จะ inject เวอร์ชัน/commit/branch/เวลา build ให้อัตโนมัติ
   - Amplify ตั้ง `AWS_COMMIT_ID`, `AWS_BRANCH` ให้ระหว่าง build → ระบบใช้ค่าดังกล่าว
   - ถ้าต้องการ override version: ตั้ง `NEXT_PUBLIC_APP_VERSION` ได้ (เช่น `0.1.0`)

6. **Deploy**
   - กด **Save and deploy**
   - รอ build จบ จะได้ URL แบบ `https://main.xxxxx.amplifyapp.com`

7. **ตั้งค่า Subdomain (เช่น planner.a-coder.com)**
   - ไปที่ **Hosting** → **Domain management** → **Add domain**
   - เลือกโดเมนหลักที่คุณจัดการอยู่ (เช่น `a-coder.com`)
   - เพิ่ม **subdomain**: ใส่ `planner` (หรือชื่ออื่นที่ต้องการ) → ได้ `planner.a-coder.com`
   - Amplify จะแสดงค่า **CNAME** ที่ต้องไปตั้งที่ผู้ให้บริการโดเมน (เช่น Route 53, Cloudflare, ผู้ขายโดเมน)
   - ไปที่ DNS ของโดเมน `a-coder.com` → สร้างเรคอร์ด:
     - **Type**: CNAME  
     - **Name**: `planner` (หรือ subdomain ที่เลือก)  
     - **Value**: URL ที่ Amplify ให้มา (เช่น `main.xxxxx.amplifyapp.com` หรือค่าแบบ `*.amplifyapp.com`)
   - รอ DNS propagate (ประมาณ 5–30 นาที) Amplify จะออก SSL (HTTPS) ให้ subdomain อัตโนมัติ
   - เปิดใช้ได้ที่ `https://planner.a-coder.com`

   **ถ้าโดเมนอยู่ที่ Namecheap:**
   - ล็อกอิน [Namecheap](https://www.namecheap.com/) → **Domain List** → กด **Manage** ที่โดเมน (เช่น a-coder.com)
   - ไปที่ **Advanced DNS**
   - กด **Add New Record**
   - เลือก **CNAME Record**
   - ใส่ค่า:
     - **Host**: `planner` (ได้ subdomain เป็น planner.a-coder.com; ถ้าใส่แค่ `planner` ไม่ต้องต่อท้ายโดเมน)
     - **Value**: ใส่ค่าที่ Amplify แสดง (เช่น `main.xxxxx.amplifyapp.com` — ต้องเป็นโดเมนที่ Amplify ให้มา ไม่มี `https://`)
     - **TTL**: Automatic หรือ 300
   - กด Save
   - รอ 5–30 นาที แล้วตรวจที่ Amplify ว่า subdomain ขึ้นสถานะ "Available" และใช้ HTTPS ได้

### กรณีใช้คนละ Repo กับ a-coder-web (แอปนี้อยู่ repo อื่น)

ถ้า a-coder.com กับ www ใช้แอป a-coder-web อยู่แล้ว และต้องการให้ **planner.a-coder.com** ใช้โค้ดจาก **repo ของแอปนี้ (planner)** ทำแบบนี้:

1. **สร้าง Amplify app ใหม่** (ไม่ใช้แอปเดิมของ a-coder-web)
   - Amplify Console → **Create new app** → **Host web app**

2. **เชื่อมกับ repo ของแอป planner**
   - เลือก GitHub → เลือก **Organization** และ **Repository ของโปรเจกต์ planner นี้** (คนละ repo กับ a-coder-web)
   - เลือก branch (เช่น `main`) → Next → ตั้งค่า build ตามขั้นตอนที่ 4 ด้านบน → ใส่ env ตามขั้นตอนที่ 5 → Deploy

3. **ผูก subdomain กับแอปใหม่เท่านั้น**
   - ในแอป **planner** (แอปที่เพิ่งสร้าง) → **Hosting** → **Domain management** → **Add domain**
   - ใส่โดเมนหลัก **a-coder.com** แล้วเพิ่ม **subdomain** เฉพาะ `planner` → ได้ `planner.a-coder.com`
   - Amplify จะแสดง **CNAME target** ของแอปนี้ (เช่น `main.yyyyy.amplifyapp.com` — คนละค่ากับแอป a-coder-web)

4. **ตั้งค่า DNS ที่ Namecheap**
   - ถ้ายังไม่มี CNAME สำหรับ `planner` → สร้าง CNAME ใหม่: Host = `planner`, Value = **CNAME target ของแอป planner** (จากขั้น 3)
   - ถ้ามี CNAME `planner` อยู่แล้ว (เคยชี้ไปแอป a-coder-web) → **แก้ Value** ให้ชี้ไป CNAME target ของแอป **planner** แทน (ค่า `main.xxxxx.amplifyapp.com` ของแอป planner ไม่ใช่ของ a-coder-web)

ผลลัพธ์:
- **a-coder.com / www.a-coder.com** → แอป a-coder-web (repo เดิม)
- **planner.a-coder.com** → แอป planner (repo ของโปรเจกต์นี้)

### หลัง deploy

- ทุกครั้งที่ **push ขึ้น branch ที่เชื่อมไว้** Amplify จะ build และ deploy ใหม่ให้อัตโนมัติ
- ดู logs ได้ที่ **Build** / **Monitoring** ใน Amplify

---

## วิธีที่ 2: EC2 + GitHub Actions

ใช้เมื่อต้องการควบคุม server เอง (เช่น รันบน EC2 เดี่ยว, ใช้ VPC/DB ใน AWS โดยตรง)

### สิ่งที่ต้องมี

- **EC2 instance** (Ubuntu 22.04 แนะนำ) ที่เปิดพอร์ต 22 (SSH) และ 80/443 (ถ้าใช้ Nginx เป็น reverse proxy)
- **GitHub repo** ของโปรเจกต์
- **IAM user / role** สำหรับ GitHub Actions ที่มีสิทธิ์ SSH หรือ deploy ไป EC2 (หรือใช้ OIDC + role ใน AWS)

### 1. เตรียม EC2

- สร้าง EC2 (Ubuntu), ติดตั้ง Node (v20 LTS), PM2, และ Nginx (ถ้าใช้):

  ```bash
  # บน EC2 (หลัง SSH เข้าไป)
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  sudo npm install -g pm2
  sudo apt-get install -y nginx   # optional, สำหรับ reverse proxy
  ```

- สร้างโฟลเดอร์แอป เช่น `/var/www/planner` และ chown เป็น user ที่รันแอป

### 2. ตั้งค่า GitHub Actions

สร้างไฟล์ใน repo:

**.github/workflows/deploy-aws.yml**

```yaml
name: Deploy to AWS EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install and Build
        run: |
          npm ci
          npm run build

      - name: Deploy to EC2
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          source: '.next,package.json,package-lock.json,public'
          target: '/var/www/planner'

      - name: Restart app on EC2
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /var/www/planner
            npm ci --omit=dev
            pm2 restart planner || pm2 start npm --name planner -- start
            pm2 save
```

- บน EC2 ต้องมีโฟลเดอร์ `/var/www/planner` และครั้งแรกอาจต้อง clone/copy ทั้งโปรเจกต์แล้วรัน `npm run build` หนึ่งครั้ง จากนั้น workflow ด้านบนจะส่งเฉพาะ `.next`, `package.json`, `package-lock.json`, `public` ไปแล้วรัน `npm ci` + `pm2 restart` บน server

### 3. ใส่ Secrets ใน GitHub

ไปที่ **GitHub repo** → **Settings** → **Secrets and variables** → **Actions** แล้วเพิ่ม:

- `EC2_HOST` – IP หรือ hostname ของ EC2
- `EC2_USER` – user สำหรับ SSH (เช่น `ubuntu`)
- `EC2_SSH_KEY` – เนื้อหา private key ที่ใช้ SSH เข้า EC2 (ทั้งก้อน รวมบรรทัด `-----BEGIN ... END ...-----`)

### 4. Environment variables บน EC2

สร้างไฟล์ `.env.local` บน EC2 ที่ `/var/www/planner` (หรือใช้ `pm2 ecosystem` แล้วส่ง env ผ่านนั้น) ใส่ค่าเดียวกับที่ใช้ใน dev เช่น:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APP_LOGIN_USER` / `APP_LOGIN_PASSWORD` (ถ้าใช้)

จากนั้นรันแอปด้วย PM2 เช่น:

```bash
cd /var/www/planner
pm2 start npm --name planner -- start
pm2 save
pm2 startup   # ให้รันต่อหลัง reboot
```

### 5. Nginx เป็น reverse proxy (แนะนำ)

เพื่อให้ใช้พอร์ต 80/443 และใส่ SSL กับโดเมน:

```nginx
# /etc/nginx/sites-available/planner
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

จากนั้น `sudo ln -s /etc/nginx/sites-available/planner /etc/nginx/sites-enabled/` และใช้ Certbot สำหรับ HTTPS

---

## สรุปเปรียบเทียบ

| หัวข้อ           | Amplify                    | EC2 + GitHub Actions        |
|------------------|----------------------------|-----------------------------|
| ความยาก          | ง่าย                       | ปานกลาง                     |
| ค่าใช้จ่าย        | จ่ายตาม build + hosting    | จ่ายตาม EC2 + traffic       |
| Auto deploy      | ใช่ (จาก GitHub push)     | ใช่ (จาก workflow)          |
| ควบคุม server    | ไม่ได้                     | ได้เต็มที่                  |
| เหมาะกับ         | โปรเจกต์ทั่วไป, MVP        | ต้องการควบคุม infra / VPC  |

แนะนำให้เริ่มจาก **Amplify** ก่อน ถ้าภายหลังต้องการย้ายไป EC2 หรือ ECS ค่อยใช้ขั้นตอนในวิธีที่ 2 เป็นแนวทางได้
