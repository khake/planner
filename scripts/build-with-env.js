#!/usr/bin/env node
/**
 * สคริปต์ build ที่ inject env vars สำหรับ build info อัตโนมัติ
 * - Amplify: ใช้ AWS_COMMIT_ID, AWS_BRANCH ที่ Amplify ตั้งให้
 * - Local: ดึงจาก git
 */
const { spawn } = require("child_process");
const path = require("path");

function execGit(cmd, fallback = "dev") {
  try {
    return require("child_process")
      .execSync(cmd, { encoding: "utf8", timeout: 3000 })
      .trim();
  } catch {
    return fallback;
  }
}

const env = {
  ...process.env,
  NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  NEXT_PUBLIC_GIT_SHA:
    process.env.AWS_COMMIT_ID || execGit("git rev-parse HEAD"),
  NEXT_PUBLIC_APP_BRANCH:
    process.env.AWS_BRANCH || execGit("git rev-parse --abbrev-ref HEAD"),
};

const cwd = path.join(__dirname, "..");
const child = spawn("npx", ["next", "build"], {
  stdio: "inherit",
  env,
  cwd,
});

child.on("exit", (code) => process.exit(code ?? 0));
