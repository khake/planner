import { NextResponse } from "next/server";
import { getBuildInfo } from "@/lib/build-info";

/** API สำหรับ QA และเครื่องมือภายนอก — ดึงเวอร์ชันจากไฟล์ static เดียวกับ BuildInfo */
export async function GET() {
  const info = getBuildInfo();
  return NextResponse.json(info, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
