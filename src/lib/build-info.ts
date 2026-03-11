/**
 * Single source of truth สำหรับ build info
 * อ่านจาก src/generated/build-info.json ที่ generate ตอน build/dev
 */
import fs from "fs";
import path from "path";

export type BuildInfoData = {
  version: string;
  commit: string | null;
  branch: string | null;
  buildTime: string;
};

const defaultData: BuildInfoData = {
  version: "dev",
  commit: null,
  branch: null,
  buildTime: "",
};

let cached: BuildInfoData | null = null;

export function getBuildInfo(): BuildInfoData {
  if (cached) return cached;

  try {
    const filePath = path.join(
      process.cwd(),
      "src",
      "generated",
      "build-info.json"
    );
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw) as BuildInfoData;
    cached = {
      version: data.version ?? defaultData.version,
      commit: data.commit ?? null,
      branch: data.branch ?? null,
      buildTime: data.buildTime ?? "",
    };
    return cached;
  } catch {
    cached = defaultData;
    return cached;
  }
}
