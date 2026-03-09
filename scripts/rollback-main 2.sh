#!/usr/bin/env bash
# Rollback main ไปเวอร์ชันก่อนหน้า (undo commit ล่าสุดบน main)
# ใช้เมื่อ deploy ไปแล้วแล้วอยากถอยกลับ — สร้าง revert commit ไม่ลบ history

set -e

echo "🔄 Fetch ล่าสุดจาก origin..."
git fetch origin

CURRENT_BRANCH=$(git branch --show-current)
echo "📍 branch ปัจจุบัน: $CURRENT_BRANCH"
echo ""

git checkout main
git pull origin main

echo ""
echo "📜 commit ล่าสุดบน main (ที่จะถูก revert):"
git log -1 --oneline
echo ""

read -p "ยืนยัน revert commit นี้และ push ขึ้น origin? (y/N): " confirm
if [[ "${confirm^^}" != "Y" && "${confirm^^}" != "YES" ]]; then
  echo "ยกเลิก"
  git checkout "$CURRENT_BRANCH"
  exit 0
fi

# -m 1 = ใช้ parent แรก (ฝั่ง main) เวลา revert merge commit
echo ""
echo "⏪ Revert commit ล่าสุด..."
git revert -m 1 HEAD --no-edit

echo ""
echo "📤 Push main ไปที่ origin..."
git push origin main

echo ""
echo "↩️  กลับไปที่ branch $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

echo ""
echo "✅ Rollback เสร็จแล้ว: main ถูก revert 1 commit และ push แล้ว (Amplify จะ deploy ตาม)"
