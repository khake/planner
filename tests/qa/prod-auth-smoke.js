const { chromium } = require("playwright");

const BASE_URL = process.env.QA_BASE_URL || "https://planner.a-coder.com";
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;
const HEADLESS = process.env.QA_HEADLESS !== "false";

if (!EMAIL || !PASSWORD) {
  console.error("Missing QA_EMAIL or QA_PASSWORD");
  process.exit(1);
}

function isLoginUrl(url) {
  return url.startsWith(`${BASE_URL}/login`);
}

async function waitForStableUrl(page, timeout = 15000) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {});
  return page.url();
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByLabel("อีเมล").fill(EMAIL);
  await page.getByLabel("รหัสผ่าน").fill(PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.toString().includes("/login"), {
      timeout: 20000,
    }),
    page.getByRole("button", { name: "เข้าสู่ระบบ" }).click(),
  ]);
  return waitForStableUrl(page);
}

async function collectProjectLinks(page) {
  await page.goto(`${BASE_URL}/projects`, { waitUntil: "domcontentloaded" });
  await waitForStableUrl(page);
  await page
    .waitForSelector('a[href*="/projects/"][href$="/backlog"]', { timeout: 15000 })
    .catch(() => {});

  const backlogLinks = await page.locator('a[href*="/projects/"][href$="/backlog"]').evaluateAll((links) =>
    links.map((link) => link.href)
  );

  const detailLinks = await page.locator('a[href*="/projects/"]:not([href$="/backlog"]):not([href$="/board"])').evaluateAll((links) =>
    links
      .map((link) => link.href)
      .filter((href) => /\/projects\/[^/]+$/.test(new URL(href).pathname))
  );

  return {
    backlogLinks: Array.from(new Set(backlogLinks)),
    detailLinks: Array.from(new Set(detailLinks)),
  };
}

async function checkNavigation(page, url, label) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const finalUrl = await waitForStableUrl(page);
  const redirectedToLogin = isLoginUrl(finalUrl);
  return {
    label,
    url,
    finalUrl,
    redirectedToLogin,
  };
}

async function fetchBuildInfo() {
  try {
    const res = await fetch(`${BASE_URL}/api/build-info`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      version: data.version ?? null,
      commit: data.commit ?? null,
      branch: data.branch ?? null,
      buildTime: data.buildTime ?? null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const buildInfo = await fetchBuildInfo();

  const loginUrl = await login(page);
  const links = await collectProjectLinks(page);

  const checks = [];

  // ตรวจว่าเข้า /projects ได้โดยไม่เด้งไป login
  checks.push(await checkNavigation(page, `${BASE_URL}/projects`, "projectsPage"));

  // ตรวจว่าเข้า /profile ได้โดยไม่เด้งไป login
  checks.push(await checkNavigation(page, `${BASE_URL}/profile`, "profilePage"));

  // ตรวจ /projects/[id] — ใช้ id จาก backlog link แรก หรือ QA_PROJECT_ID
  const projectIdFromBacklog = links.backlogLinks[0]
    ? links.backlogLinks[0].replace(/.*\/projects\/([^/]+)\/backlog.*/, "$1")
    : null;
  const projectId = process.env.QA_PROJECT_ID || projectIdFromBacklog;
  if (projectId) {
    checks.push(await checkNavigation(page, `${BASE_URL}/projects/${projectId}`, "projectDetailPage"));
  }

  if (links.backlogLinks[0]) {
    checks.push(await checkNavigation(page, links.backlogLinks[0], "firstBacklog"));
  }

  if (links.detailLinks[0]) {
    const detailResult = await checkNavigation(page, links.detailLinks[0], "projectDetail");
    checks.push(detailResult);

    if (!detailResult.redirectedToLogin) {
      const backlogFromDetail = await page.locator('a[href$="/backlog"]').first().getAttribute("href");
      if (backlogFromDetail) {
        const absolute = backlogFromDetail.startsWith("http")
          ? backlogFromDetail
          : `${BASE_URL}${backlogFromDetail}`;
        checks.push(await checkNavigation(page, absolute, "backlogFromDetail"));
      }
    }
  }

  const directBacklogUrl =
    process.env.QA_DIRECT_BACKLOG_URL || links.backlogLinks[0] || null;
  if (directBacklogUrl) {
    checks.push(await checkNavigation(page, directBacklogUrl, "directBacklog"));
  }

  const expectVersion = process.env.QA_EXPECT_VERSION;
  const versionOk =
    !expectVersion ||
    !buildInfo?.version ||
    buildInfo.version === expectVersion ||
    String(buildInfo.version).startsWith(String(expectVersion));
  const versionMismatch = expectVersion && buildInfo?.version && !versionOk;

  const result = {
    baseUrl: BASE_URL,
    buildInfo,
    loginUrlAfterAuth: loginUrl,
    discoveredLinks: links,
    checks,
    consoleErrors,
    ...(expectVersion && {
      expectVersion,
      versionMismatch: versionMismatch || null,
    }),
  };

  console.log(JSON.stringify(result, null, 2));

  const hasFailure =
    checks.some((item) => item.redirectedToLogin) || versionMismatch;
  await browser.close();
  process.exit(hasFailure ? 2 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

