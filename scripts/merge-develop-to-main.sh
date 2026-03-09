#!/usr/bin/env bash
# Merge develop ไปที่ main แล้ว push ขึ้น origin
# ใช้หลัง push code ไปที่ develop แล้ว ไม่ต้องเปิด GitHub ทำ MR

set -e

echo "🔄 Fetch ล่าสุดจาก origin..."
git fetch origin

# ตรวจสอบ working tree สะอาด (ถ้าอยู่บน develop และมีของยังไม่ commit จะไม่ merge)
if [[ -n $(git status -s) ]]; then
  echo "❌ มีการเปลี่ยนแปลงที่ยังไม่ commit กรุณา commit หรือ stash ก่อน"
  exit 1
fi

# บันทึก branch ปัจจุบันเพื่อกลับมาทีหลัง
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 บranch ปัจจุบัน: $CURRENT_BRANCH"

echo ""
echo "📥 Checkout main และ pull ล่าสุด..."
git checkout main
git pull origin main

echo ""
echo "🔀 Merge develop เข้า main..."
git merge origin/develop -m "Merge develop into main"

echo ""
echo "📤 Push main ไปที่ origin..."
git push origin main

echo ""
echo "↩️  กลับไปที่ branch $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

echo ""
echo "✅ เสร็จแล้ว: main อัปเดตจาก develop และ push ขึ้น GitHub แล้ว (Amplify จะ deploy ต่อ)"
