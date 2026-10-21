// Juthoor full walkthrough recorder. Usage: node walkthrough.cjs [flow,flow,...]
const path = require('node:path');
const fs = require('node:fs');
const { Recorder, sleep } = require('./lib.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const MAIL = process.env.MAIL_URL || 'http://127.0.0.1:54324';
const PASSWORD = 'Juthoor-Demo-2026!'; // local demo accounts (apps/database/supabase/demo/seed_demo_mock.sql)
const DOCS = 'C:/Users/youssefbouz/ancestry/juthoor/mock-demo-docs';
const FIXTURE_GED = path.join(__dirname, 'fixture.ged');
const OUT = path.join(__dirname, 'out');

const stamp = Date.now().toString(36);
const NEW_USER = { name: 'ليلى حدّاد', email: `layla.haddad.${stamp}@juthoor.local` };

const state = { treeId: null, selfId: null, ownerEmail: null };

/* ----------------------------------------------------------------- helpers */
async function fetchOtp(email, tries = 30) {
  // Mailpit (bundled with the local Supabase stack) exposes a JSON API.
  for (let i = 0; i < tries; i++) {
    try {
      const list = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent('to:' + email)}`).then((r) => r.json());
      const msg = (list.messages || [])[0];
      if (msg) {
        const full = await fetch(`${MAIL}/api/v1/message/${msg.ID}`).then((r) => r.json());
        const text = (full.Text || '') + ' ' + (full.HTML || '');
        const m = text.match(/\b(\d{6,8})\b/);
        if (m) return m[1];
      }
    } catch (e) {
      /* retry */
    }
    await sleep(1000);
  }
  throw new Error('OTP email not found for ' + email);
}

async function login(R, email, caption) {
  await R.goto('/login');
  if (caption) await R.caption(caption[0], caption[1], 1200);
  const tab = R.page.getByRole('tab', { name: /كلمة السر|Password/ });
  if (await tab.count()) await R.click(tab, { name: 'password tab', after: 500 });
  await R.type('#sign-in-email', email, { delay: 35 });
  await R.type('#sign-in-password', PASSWORD, { delay: 25 });
  await R.click(R.page.getByRole('button', { name: /^تسجيل الدخول$|^Login$/ }), { name: 'login' });
  await R.page.waitForURL(/dashboard|verify|tree/, { timeout: 40000 });
  await R.settle(1500);
}

async function signOut(R) {
  // sidebar footer user menu → sign out
  const trigger = R.page.locator('[data-sidebar="footer"] button, [data-sidebar="menu-button"]').filter({ hasText: /@/ }).first();
  if (await trigger.count()) {
    await R.click(trigger, { name: 'user menu' });
    const out = R.page.getByRole('menuitem', { name: /تسجيل الخروج|Sign out|Log out/ });
    if (await out.count()) {
      await R.click(out, { name: 'sign out' });
      await R.page.waitForURL(/\/$|login/, { timeout: 20000 }).catch(() => {});
      await R.settle(1200);
      return;
    }
  }
  // fallback: any visible sign-out control
  const btn = R.page.getByRole('button', { name: /تسجيل الخروج|Sign out|Log out/ }).first();
  if (await btn.count()) {
    await R.click(btn, { name: 'sign out' });
    await R.page.waitForURL(/\/$|login/, { timeout: 20000 }).catch(() => {});
    await R.settle(1200);
  }
}

/* ------------------------------------------------------------------- flows */
const flows = {};

flows.intro = async (R) => {
  await R.page.setContent(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;background:linear-gradient(135deg,#1f3a2a,#3b5f3f);color:#f6f1e6;font-family:"Cairo","Segoe UI","Noto Sans Arabic",system-ui,sans-serif}
    .w{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center}
    .ar{font-size:110px;font-weight:800;letter-spacing:.02em}.en{font-size:34px;opacity:.9;font-family:"Segoe UI",system-ui}
    .sub{font-size:22px;opacity:.75;margin-top:14px}.bar{width:160px;height:5px;background:#c9a227;border-radius:3px}
    .d{font-size:16px;opacity:.6;position:absolute;bottom:40px;font-family:"Segoe UI",system-ui;direction:ltr}
  </style></head><body><div class="w"><div class="ar">جذور</div><div class="bar"></div><div class="en">Juthoor — Palestinian Roots Platform</div>
  <div class="sub">جولة كاملة في المنصّة · Complete product walkthrough</div><div class="d">Recorded ${new Date().toISOString().slice(0, 10)} · local demo environment</div></div></body></html>`);
  await R.pause(4200);
};

flows.public = async (R) => {
  await R.goto('/');
  await R.chapter('الموقع العام', 'Public site', 2400);
  await R.caption('الصفحة الرئيسية — عربية أولًا، من اليمين إلى اليسار', 'Home page — Arabic-first, right-to-left layout', 2600);
  await R.scrollTour(900, 450, 1400);
  await R.caption('عدّادات حيّة وشريط القرى وبيان المنصّة', 'Live counters, villages marquee and the platform manifesto', 2000);
  await R.scrollTour(1500, 500, 1300);
  await R.caption('الركائز الثلاث: منشئ الشجرة، الشجرة الأم، أرشيف القرى', 'The three pillars: tree builder, the Mother Tree, the villages archive', 2000);
  await R.scrollTour(2400, 600, 1100);
  await R.caption('دعوة أخيرة للبدء — مجّانًا دائمًا', 'Final call to action — free, always', 1800);
  await R.scrollTop();
  await R.caption('تبديل اللغة إلى الإنجليزية', 'Switching the interface to English', 1200);
  const langEn = R.page.locator('[role="group"][aria-label="Language"] button', { hasText: 'EN' }).first();
  const langAr = R.page.locator('[role="group"][aria-label="Language"] button', { hasText: 'ع' }).first();
  await R.click(langEn, { name: 'locale toggle EN', after: 1600 });
  await R.caption('الواجهة نفسها بالإنجليزية — من اليسار إلى اليمين', 'Same interface in English — left-to-right', 2200);
  await R.scrollTour(700, 350, 1100);
  await R.scrollTop();
  await R.click(langAr, { name: 'locale toggle AR', after: 1400 });
  await R.caption('العودة إلى العربية', 'Back to Arabic', 1000);

  // About dropdown pages
  const pages = [
    ['/about', 'هويتنا — من نحن', 'Who we are', 1800],
    ['/why', 'أهدافنا — لماذا جذور', 'Why Juthoor', 1600],
    ['/how', 'كيف نحقق أهدافنا', 'How it works', 1600],
    ['/contact', 'تواصل معنا', 'Contact us', 1200],
    ['/privacy', 'سياسة الخصوصية', 'Privacy policy', 1000],
    ['/terms', 'الشروط والأحكام', 'Terms & conditions', 1000],
  ];
  for (const [url, ar, en, scrollPx] of pages) {
    await R.goto(url);
    await R.caption(ar, en, 1600);
    await R.scrollTour(scrollPx, 450, 1000);
    await R.scrollTop();
  }
};

flows.signup = async (R) => {
  await R.goto('/sign-up');
  await R.chapter('إنشاء حساب جديد', 'Creating a new account', 2400);
  await R.caption('نموذج التسجيل: اسم العرض والبريد الإلكتروني، وتأكيد العمر', 'Sign-up form: display name, email and the age confirmation', 1800);
  await R.type('#display-name', NEW_USER.name, { delay: 70 });
  await R.type('#email', NEW_USER.email, { delay: 35 });
  const chk = R.page.locator('input[type="checkbox"], button[role="checkbox"]').first();
  if (await chk.count()) await R.click(chk, { name: 'age/terms checkbox', after: 500 });
  await R.click(R.page.getByRole('button', { name: /أرسل الرمز|Send code/ }), { name: 'send code' });
  await R.caption('يُرسَل رمز تحقّق إلى البريد الإلكتروني', 'A one-time code is emailed to the new member', 1600);
  const otp = await fetchOtp(NEW_USER.email);
  await R.caption('إدخال الرمز المرسل بالبريد', 'Entering the emailed code', 800);
  const otpInput = R.page.locator('input[autocomplete="one-time-code"], input[inputmode="numeric"], input[name="code"], input[name="token"]').first();
  await R.click(otpInput, { name: 'otp input', after: 300 });
  await R.page.keyboard.type(otp, { delay: 120 });
  await R.pause(600);
  const verifyBtn = R.page.getByRole('button', { name: /تحقّق وادخل|Verify & sign in/ });
  if (await verifyBtn.count()) await R.click(verifyBtn, { name: 'verify & sign in' });
  await R.page.waitForURL(/verify|dashboard/, { timeout: 40000 });
  await R.settle(1500);
};

flows.verify = async (R) => {
  if (!/\/verify/.test(R.page.url())) await R.goto('/verify');
  await R.chapter('توثيق الهوية', 'Identity verification', 2200);
  await R.caption('الخطوة ٢ من ٣: رفع وثيقة هوية رسمية ودليل انتماء اختياري', 'Step 2 of 3: upload a government ID and optional family evidence', 2200);
  const idType = R.page.locator('select').nth(1);
  const selects = await R.page.locator('select').count();
  if (selects >= 2) {
    await R.click(idType, { name: 'document type', after: 400 });
    await idType.selectOption({ index: 1 });
    await R.pause(600);
  }
  const files = R.page.locator('input[type="file"]');
  await files.nth(0).setInputFiles(path.join(DOCS, 'karim-id-passport.png'));
  await R.caption('تم إرفاق جواز سفر تجريبي (وثيقة وهمية للعرض)', 'A demo passport is attached (clearly marked mock document)', 1800);
  if ((await files.count()) > 1) {
    await files.nth(1).setInputFiles(path.join(DOCS, 'rania-family-evidence.png'));
    await R.pause(800);
  }
  const note = R.page.locator('textarea').first();
  if (await note.count()) {
    await R.type(note, 'أنا حفيدة إلياس حدّاد من يافا، وأرغب في بناء شجرة عائلتي.', { delay: 45 });
  }
  await R.scroll(400, { after: 500 });
  await R.click(R.page.getByRole('button', { name: /إرسال للمراجعة|Submit for review/ }), { name: 'submit verification' });
  await R.settle(1500);
  await R.caption('طلبك قيد المراجعة — يراجعه المسؤول خلال يومين إلى ثلاثة', 'Submitted — an administrator reviews it within 2–3 days', 2200);
  const explore = R.page.getByRole('link', { name: /تخطّ الآن|Skip for now|استكشف/ }).first();
  if (await explore.count()) await R.click(explore, { name: 'explore platform' });
  else await R.goto('/dashboard');
  await R.settle(1500);
};

flows.mobile = async (R) => {
  // Run with VIEWPORT=390x844 — a phone-sized take of the main screens.
  await R.goto('/');
  await R.caption('تخطيط متجاوب للهاتف', 'Responsive phone layout', 2200);
  await R.scrollTour(1600, 400, 800);
  await R.scrollTop();
  const burger = R.page.locator('header button, nav button').filter({ has: R.page.locator('svg') }).last();
  if (await burger.count()) {
    try { await R.click(burger, { name: 'mobile menu', after: 1800 }); await R.caption('قائمة الهاتف', 'The phone menu', 1800); await R.press('Escape', 600); } catch {}
  }
  await login(R, 'rania.khatib@juthoor.local');
  await R.goto('/dashboard');
  await R.waitFor('h1');
  await R.caption('لوحة الجذور على الهاتف', 'The dashboard on a phone', 2000);
  await R.scrollTour(1200, 400, 800);
  await R.scrollTop();
  await R.goto('/tree');
  await R.waitFor('button[aria-label="تكبير"]');
  await R.pause(1500);
  await R.caption('الشجرة على الهاتف', 'The tree on a phone', 2400);
  const fit = R.page.locator('button[aria-label="ملاءمة الشجرة كاملة"]').first();
  if (await fit.count()) await R.click(fit, { name: 'fit', after: 1500 });
  await R.goto('/search');
  await R.waitFor('input[type="search"]');
  await R.caption('البحث على الهاتف', 'Search on a phone', 2000);
  await R.clearCaption();
};

flows.login_tour = async (R) => {
  // Shown after signing out: the login page and its alternatives.
  await R.goto('/login');
  await R.caption('صفحة الدخول: كلمة السر، أو رمز تحقّق، أو حساب اجتماعي', 'Login page: password, one-time code, or a social account', 1800);
  await R.click(R.page.getByRole('tab', { name: /رمز التحقق|OTP Code/ }), { name: 'otp tab', after: 1500 });
  await R.click(R.page.getByRole('tab', { name: /التواصل الاجتماعي|Social/ }), { name: 'social tab', after: 1500 });
  await R.click(R.page.getByRole('tab', { name: /كلمة السر|Password/ }), { name: 'password tab', after: 800 });
  await R.click(R.page.getByRole('link', { name: /نسيت كلمة السر|Forgot your password/ }), { name: 'forgot password' });
  await R.settle(1000);
  await R.caption('استعادة كلمة السر عبر البريد الإلكتروني', 'Password recovery by email', 1800);
};

require('./flows2.cjs')(flows, { DOCS, FIXTURE_GED, state, login, signOut, PASSWORD });

/* -------------------------------------------------------------------- main */
(async () => {
  const wanted = (process.argv[2] || Object.keys(flows).join(',')).split(',').filter(Boolean);
  fs.mkdirSync(OUT, { recursive: true });
  const vp = (process.env.VIEWPORT || '1920x1080').split('x').map(Number);
  const R = new Recorder({ baseURL: BASE, videoDir: OUT, viewport: { width: vp[0], height: vp[1] } });
  await R.start();
  const t0 = Date.now();
  try {
    if (process.env.TEST_LOGIN) { await login(R, process.env.TEST_LOGIN); }
    if (process.env.TEST_TREE) { state.treeId = process.env.TEST_TREE; }
    for (const f of wanted) {
      if (!flows[f]) throw new Error('unknown flow ' + f);
      R.log('=== FLOW', f, '===');
      await flows[f](R);
    }
    await R.clearCaption();
    await R.pause(800);
  } catch (e) {
    console.error('FLOW FAILED:', e);
    try { await R.page.screenshot({ path: path.join(OUT, 'failure.png') }); } catch {}
    process.exitCode = 1;
  } finally {
    const p = await R.stop();
    console.log('VIDEO', p, 'seconds', Math.round((Date.now() - t0) / 1000));
    fs.writeFileSync(path.join(OUT, 'state.json'), JSON.stringify({ ...state, NEW_USER, wanted }, null, 2));
  }
})();
