import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

async function waitPort(port: number, timeoutMs = 25000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/system/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function main() {
  const screenshotsDir = path.resolve(process.cwd(), "docs/screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const PORT = 3005;
  console.log(`Starting Next.js server on port ${PORT}...`);

  // Start Next.js server
  const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT) },
  });

  const isReady = await waitPort(PORT);
  if (!isReady) {
    console.error("Server failed to respond on port", PORT);
    server.kill();
    process.exit(1);
  }

  console.log("Server is ready. Launching Playwright Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  try {
    // 1. Login
    console.log("1. Logging in...");
    await page.goto(`http://127.0.0.1:${PORT}/login`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', "admin@apihub.local");
    await page.fill('input[type="password"]', "AdminSecurePassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(`http://127.0.0.1:${PORT}/`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // 2. Dashboard Overview Screenshot
    console.log("2. Capturing Dashboard Overview...");
    await page.screenshot({ path: path.join(screenshotsDir, "01-dashboard-overview.png") });

    // 3. API Catalog Screenshot
    console.log("3. Capturing API Catalog...");
    await page.goto(`http://127.0.0.1:${PORT}/apis`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, "02-api-catalog.png") });

    // 4. API Details & Interactive Docs Screenshot
    console.log("4. Capturing API Documentation & Explorer...");
    await page.goto(`http://127.0.0.1:${PORT}/apis/api-payments-01`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, "03-interactive-docs.png") });

    // 5. Health Monitoring Hub Screenshot
    console.log("5. Capturing Health Monitoring...");
    await page.goto(`http://127.0.0.1:${PORT}/monitoring`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, "04-monitoring-hub.png") });

    // 6. Spec Diff & Breaking Changes Screenshot
    console.log("6. Capturing Spec Diff & Breaking Changes...");
    await page.goto(`http://127.0.0.1:${PORT}/specifications/diff`);
    await page.waitForLoadState("networkidle");
    await page.click("button:has-text('Compare Specifications')");
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, "05-spec-diff-analyzer.png") });

    // 7. Governance & Quality Scorecard Screenshot
    console.log("7. Capturing API Governance Scorecard...");
    await page.goto(`http://127.0.0.1:${PORT}/governance`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, "06-governance-scorecard.png") });

    // 8. Incident Management Screenshot
    console.log("8. Capturing Incident Management...");
    await page.goto(`http://127.0.0.1:${PORT}/incidents`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, "07-incident-management.png") });

    // 9. Audit Logs Screenshot
    console.log("9. Capturing Audit Trail...");
    await page.goto(`http://127.0.0.1:${PORT}/audit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, "08-audit-trail.png") });

    console.log("All 8 high-resolution screenshots captured successfully!");
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
