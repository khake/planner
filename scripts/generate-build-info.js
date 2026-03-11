#!/usr/bin/env node
/**
 * สร้างไฟล์ build-info.json เป็น single source of truth
 * - App ใช้ไฟล์นี้ผ่าน BuildInfo component
 * - QA fetch จาก /api/build-info
 */
const fs = require("fs");
const path = require("path");

function execGit(cmd, fallback = null) {
  try {
    return require("child_process")
      .execSync(cmd, { encoding: "utf8", timeout: 3000 })
      .trim();
  } catch {
    return fallback;
  }
}

const pkg = require("../package.json");
const version =
  process.env.NEXT_PUBLIC_APP_VERSION ?? pkg.version ?? "dev";
const commit =
  process.env.AWS_COMMIT_ID ||
  process.env.NEXT_PUBLIC_GIT_SHA ||
  execGit("git rev-parse HEAD");
const branch =
  process.env.AWS_BRANCH ||
  process.env.NEXT_PUBLIC_APP_BRANCH ||
  execGit("git rev-parse --abbrev-ref HEAD");
const buildTime = new Date().toISOString();

const data = {
  version,
  commit: commit ? commit.slice(0, 7) : null,
  branch: branch || null,
  buildTime,
};

const outDir = path.join(__dirname, "..", "src", "generated");
const outFile = path.join(outDir, "build-info.json");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outFile, JSON.stringify(data, null, 2) + "\n", "utf8");
console.error("[generate-build-info] wrote", outFile);
