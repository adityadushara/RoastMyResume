import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { width: 320, height: 568, name: "320px-mobile-s" },
  { width: 375, height: 667, name: "375px-mobile-m" },
  { width: 390, height: 844, name: "390px-mobile-iphone" },
  { width: 414, height: 896, name: "414px-mobile-l" },
  { width: 768, height: 1024, name: "768px-tablet" },
  { width: 820, height: 1180, name: "820px-ipad-air" },
  { width: 1024, height: 768, name: "1024px-laptop" },
  { width: 1280, height: 800, name: "1280px-desktop" },
  { width: 1440, height: 900, name: "1440px-desktop-l" },
  { width: 1920, height: 1080, name: "1920px-fhd" },
];

const SCREENSHOT_DIR = path.resolve("./test_screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const MOCK_RESULTS = {
  fake_quotes: [
    "Looks like it was formatted in Notepad in 2005.",
    "Claims to be a Senior Architect, but spent 4 lines listing Microsoft Word as a skill."
  ],
  meme_one_liners: [
    "Your resume is 3 pages too long for 2 years of experience.",
    "ATS parsers call this file 'unidentified object'."
  ],
  sections: [
    {
      title: "PROFILE & SUMMARY",
      claims: "Claims 5+ years leading high-scale distributed backend systems and cross-functional engineering teams.",
      roast: "Reads like a generic AI buzzword soup with no measurable business outcomes or revenue impact."
    },
    {
      title: "EXPERIENCE SECTION",
      claims: "Claims responsibility for rebuilding microservices and improving system efficiency.",
      roast: "Uses vague action verbs like 'assisted with' and 'helped implement' instead of quantifying latency drops."
    },
    {
      title: "SKILLS SECTION",
      claims: "Lists 30+ programming languages, frameworks, cloud tools, and database systems.",
      roast: "Listing every tool you ever looked at for 5 minutes dilutes your actual core competencies."
    }
  ],
  text: "Sample Senior Engineer Resume Content...",
  changes: {
    top_5_changes: [
      "Quantify bullet points with metrics (% latency reduction, $ saved).",
      "Cut outdated skills from 2018.",
      "Reformat experience section header."
    ],
    recruiter_insights: [
      "Recruiters spend an average of 6 seconds on first scan.",
      "Clear visual hierarchy increases callback rate by 40%."
    ],
    sections: [
      {
        section_name: "SUMMARY SECTION",
        current_text: "Results-driven engineer passionate about technology.",
        recommended_change: "Senior Full Stack Engineer with 5+ years of experience scaling Node/React systems serving 1M+ DAU.",
        why: "Provides immediate seniority signal and domain focus.",
        priority: "High"
      },
      {
        section_name: "EXPERIENCE SECTION",
        current_text: "Worked on API performance.",
        recommended_change: "Optimized REST API query throughput by 45%, reducing p99 latency from 800ms to 120ms.",
        why: "Demonstrates tangible impact and technical ownership.",
        priority: "High"
      }
    ]
  }
};

async function runTests() {
  console.log("Starting Playwright UI & Consistency Test Suite...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
  });

  // 1. Test Landing Page across viewports
  console.log("\n--- Testing Landing Page ---");
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    
    // Test Keyboard navigation (Tab)
    await page.keyboard.press("Tab");

    // Check horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    const screenshotPath = path.join(SCREENSHOT_DIR, `landing_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): Horizontal Overflow: ${overflow ? "⚠️ DETECTED" : "✅ NONE"}`);
  }

  // 2. Test File Upload and Analysis flow
  console.log("\n--- Testing Upload Flow ---");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

  const testFilePath = path.resolve("./sample_resume.pdf");
  if (!fs.existsSync(testFilePath)) {
    console.error("Test resume PDF not found at:", testFilePath);
    await browser.close();
    return;
  }

  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  console.log("Uploaded sample resume. Verifying upload interaction...");

  // Wait briefly to check loader or navigation
  await page.waitForTimeout(2000);

  // Set local storage data for thorough results page audit
  console.log("\n--- Injecting Audit Data for Full Results Page Inspection ---");
  await page.evaluate((data) => {
    localStorage.setItem("roast_results", JSON.stringify(data));
    localStorage.setItem("roast_filename", "sample_resume.pdf");
  }, MOCK_RESULTS);

  await page.goto("http://localhost:3000/results", { waitUntil: "networkidle" });

  // 3. Test Results Page across viewports & interactions (Analysis Tab)
  console.log("\n--- Testing Results Page (Resume Analysis Tab) Across Viewports ---");
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    const screenshotPath = path.join(SCREENSHOT_DIR, `results_report_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log(`Results Report - ${vp.name}: Horizontal Overflow: ${overflow ? "⚠️ DETECTED" : "✅ NONE"}`);
  }

  // 4. Test Results Page (Recommended Changes Tab)
  console.log("\n--- Testing Tab Switching & Recommended Changes View ---");
  const changesTab = page.locator('button[role="tab"]:has-text("Recommended Changes")');
  if (await changesTab.isVisible()) {
    await changesTab.click();
    await page.waitForTimeout(500);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      const screenshotPath = path.join(SCREENSHOT_DIR, `results_changes_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      console.log(`Results Changes - ${vp.name}: Horizontal Overflow: ${overflow ? "⚠️ DETECTED" : "✅ NONE"}`);
    }
  }

  console.log("\n--- Console Error Report ---");
  if (consoleErrors.length === 0) {
    console.log("✅ Zero console errors!");
  } else {
    console.log(`⚠️ ${consoleErrors.length} Console Errors detected:`);
    consoleErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  await browser.close();
}

runTests().catch(console.error);
