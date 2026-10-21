// Renders system-design-report.html to docs/Juthoor_System_Design_Report.pdf.
// Usage (from the repo root): node docs/report/render.cjs
// Needs the web app's dev dependencies installed (Playwright) and Google Chrome.
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(path.join(__dirname, '../../apps/web/node_modules/@playwright/test'));

(async () => {
  const src = path.join(__dirname, 'system-design-report.html');
  const out = path.join(__dirname, '..', 'Juthoor_System_Design_Report.pdf');
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(src).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="width:100%;font-size:7px;color:#8A8178;font-family:Arial,sans-serif;padding:0 15mm;display:flex;justify-content:space-between">' +
      '<span>Juthoor · System Design Report · October 2026</span>' +
      '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await browser.close();
  console.log('Wrote ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
