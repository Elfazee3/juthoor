// Headless exploration: log in as a user, visit URLs, dump screenshots + interactive elements.
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('C:/Users/youssefbouz/ancestry/juthoor-local/apps/web/node_modules/@playwright/test');

const BASE = 'http://localhost:3000';
const PASSWORD = 'Juthoor-Demo-2026!';
const OUT = path.join(__dirname, 'explore');
fs.mkdirSync(OUT, { recursive: true });

const [, , user, ...urls] = process.argv;

async function dump(page, tag) {
  const items = await page.evaluate(() => {
    const sel = 'a[href],button,input,select,textarea,[role="tab"],[role="combobox"],[role="checkbox"],[role="menuitem"]';
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const t = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      const attrs = ['id', 'name', 'href', 'type', 'role', 'aria-label', 'placeholder', 'data-sidebar'].map((a) => (el.getAttribute(a) ? `${a}=${el.getAttribute(a).slice(0, 50)}` : '')).filter(Boolean).join(' ');
      out.push(`${el.tagName.toLowerCase()} [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}] "${t}" ${attrs}`);
    }
    return out;
  });
  const heads = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ': ' + h.innerText.trim().replace(/\s+/g, ' ').slice(0, 80)).slice(0, 25));
  console.log(`\n##### ${tag} :: ${page.url()} :: title=${await page.title()}`);
  console.log(heads.join('\n'));
  console.log('--- interactive ---');
  console.log(items.slice(0, 90).join('\n'));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ar' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  if (user && user !== 'anon') {
    await page.goto(BASE + '/login');
    const tab = page.getByRole('tab', { name: /كلمة السر|Password/ });
    if (await tab.count()) await tab.click();
    await page.locator('#sign-in-email').fill(user);
    await page.locator('#sign-in-password').fill(PASSWORD);
    await page.getByRole('button', { name: /^تسجيل الدخول$|^Login$/ }).click();
    await page.waitForURL(/dashboard|verify|tree/, { timeout: 40000 });
    console.log('logged in as', user, '->', page.url());
  }
  for (const u of urls) {
    try {
      await page.goto(u.startsWith('http') ? u : BASE + u, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);
      const name = (user || 'anon').split('@')[0] + '__' + u.replace(/[^a-z0-9]+/gi, '_').slice(0, 50);
      await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
      await dump(page, name);
    } catch (e) {
      console.log('ERR', u, e.message.split('\n')[0]);
    }
  }
  await browser.close();
})();
