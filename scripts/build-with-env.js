#!/usr/bin/env node
/**
 * Build ที่ generate build-info.json แล้วรัน next build
 * - Amplify: ใช้ AWS_COMMIT_ID, AWS_BRANCH ที่ Amplify ตั้งให้
 * - Local: ดึงจาก git
 */
const { spawn } = require("child_process");
const path = require("path");

require("./generate-build-info.js");

const cwd = path.join(__dirname, "..");
const child = spawn("npx", ["next", "build"], {
  stdio: "inherit",
  env: process.env,
  cwd,
});

child.on("exit", (code) => process.exit(code ?? 0));
