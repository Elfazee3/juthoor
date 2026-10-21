// Data-dependent flows, written against the live UI. Loaded by walkthrough.cjs.
const path = require('node:path');

module.exports = function register(flows, ctx) {
  const { DOCS, FIXTURE_GED, state, login, signOut } = ctx;

  const sideLink = (R, re) => R.page.locator('a[data-sidebar="menu-button"]').filter({ hasText: re }).first();
  const addForm = (R) => R.page.locator('form').filter({ has: R.page.locator('input[name="arGivenName"]') }).last();
  const visibleInput = (R) => R.page.locator('input[name="arGivenName"]').filter({ visible: true }).first();
  const isCovered = async (loc) => {
    try {
      await loc.waitFor({ state: 'visible', timeout: 8000 });
      const box = await loc.boundingBox();
      if (!box) return true;
      return await loc.evaluate((el, pt) => { const top = document.elementFromPoint(pt.x, pt.y); return !(top && (top === el || el.contains(top) || top.contains(el))); }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    } catch { return true; }
  };

  async function fillPerson(R, form, p) {
    await R.type(form.locator('input[name="arGivenName"]'), p.ar[0], { delay: 90 });
    if (p.ar[1]) await R.type(form.locator('input[name="arSurname"]'), p.ar[1], { delay: 90 });
    await R.type(form.locator('input[name="enGivenName"]'), p.en[0], { delay: 70 });
    if (p.en[1]) await R.type(form.locator('input[name="enSurname"]'), p.en[1], { delay: 70 });
    if (p.gender) {
      const g = form.locator('button[role="combobox"]').filter({ hasText: /^(اختر|Select|ذكر|أنثى|Male|Female)$/ }).first();
      if (await g.count()) {
        await R.click(g, { name: 'gender', after: 600 });
        await R.click(R.page.getByRole('option', { name: p.gender === 'M' ? /^ذكر$|^Male$/ : /^أنثى$|^Female$/ }), { name: 'gender option', after: 500 });
      }
    }
    if (p.birth) await R.type(form.locator('input[name="birthYear"]'), String(p.birth), { delay: 90 });
    if (p.village) {
      const v = form.locator('button[role="combobox"]').filter({ hasText: /اختر القرية|Select a village/ }).first();
      if (await v.count()) {
        await R.click(v, { name: 'village combobox', after: 700 });
        await R.page.keyboard.type(p.village, { delay: 120 });
        await R.pause(1400);
        const opt = R.page.getByRole('option').filter({ hasText: new RegExp(p.village) }).first();
        if (await opt.count()) await R.click(opt, { name: 'pick village', after: 600 });
        else await R.press('Escape', 300);
      }
    }
  }

  async function openBell(R, ar, en) {
    const trigger = R.page.locator('button[data-sidebar="trigger"]').first();
    const bell = R.page.locator('button[aria-label="الإشعارات"], button[aria-label="Notifications"]').first();
    if (!(await trigger.count()) || !(await bell.count())) return;
    const collapse = await isCovered(bell);
    if (collapse) {
      await R.caption('طيّ الشريط الجانبي يكشف جرس الإشعارات', 'Collapsing the sidebar reveals the notifications bell', 1000);
      await R.click(trigger, { name: 'collapse sidebar', after: 900 });
    }
    try {
      await R.click(bell, { name: 'notifications bell', after: 1200 });
      if (ar) await R.caption(ar, en, 2200);
      await R.press('Escape', 500);
    } catch (e) { R.log('bell skipped:', e.message.split('\n')[0]); }
    if (collapse) await R.click(trigger, { name: 'expand sidebar', after: 800 });
  }

  /* ------------------------------------------------ dashboard (fresh member) */
  flows.dashboard = async (R) => {
    await R.goto('/dashboard');
    await R.waitFor('h1');
    await R.chapter('لوحة الجذور', 'The member dashboard', 2200);
    await R.caption('لوحة الجذور لعضو جديد: الشجرة لا تزال فارغة، مع إجراءات سريعة', 'A new member’s dashboard: the tree is still empty, with quick actions', 2400);
    await R.scrollTour(500, 500, 1200);
    await R.scrollTop();
    await R.caption('الشريط الجانبي: لوحة الجذور، شجرة العائلة، ابحث عن ذويك، العائلات، القرى والمدن', 'Sidebar: dashboard, family tree, find family, families, villages & cities', 1800);
    const side = R.page.locator('a[data-sidebar="menu-button"]');
    const n = Math.min(await side.count(), 7);
    for (let i = 1; i < n; i++) await R.hover(side.nth(i), { dwell: 300, ms: 300 });
    await openBell(R, 'جرس الإشعارات — لا إشعارات بعد', 'The notifications bell — nothing yet');
  };

  /* ---------------------------------------------------------- tree builder */
  flows.tree = async (R) => {
    await R.chapter('منشئ الشجرة', 'The tree builder', 2400);
    await R.click(sideLink(R, /شجرة العائلة|Family Tree/), { name: 'sidebar: family tree' });
    await R.page.waitForURL(/\/tree\/[0-9a-f-]+/, { timeout: 40000 });
    await R.settle(1200);
    state.treeId = R.page.url().match(/\/tree\/([0-9a-f-]+)/)[1];
    if (!/add-self/.test(R.page.url())) {
      await R.caption('يُنشئ جذور شجرتك تلقائيًا — وتبدأ بإضافة نفسك', 'Juthoor creates your tree automatically — you start by adding yourself', 2200);
      const self = R.page.locator('a[href$="/add-self"]').first();
      if (await self.count()) await R.click(self, { name: 'add yourself' });
      else await R.goto(`/tree/${state.treeId}/add-self`);
      await R.settle(1000);
    }
    await R.waitFor(visibleInput(R));
    await R.caption('نموذج ثنائي اللغة: الاسم بالعربية والإنجليزية، الجنس، سنة الميلاد، والقرية الأصلية', 'A bilingual form: Arabic and English names, gender, birth year, village of origin', 2400);
    const hint = R.page.locator('button[aria-label*="تلميح"], button[aria-label*="hint"], [data-slot="field-hint"], button:has(svg.lucide-circle-help), button:has(svg.lucide-info)').first();
    if (await hint.count()) {
      try { await R.hover(hint, { dwell: 1500 }); await R.caption('تلميحات ثنائية اللغة لكل حقل', 'Bilingual hints on every field', 1200); } catch {}
    }
    await fillPerson(R, addForm(R), { ar: ['سامر', 'حدّاد'], en: ['Samer', 'Haddad'], gender: 'M', birth: 1988, village: 'يافا' });
    await R.caption('بحث فوري في ٤٥٦ قرية ومدينة فلسطينية موثّقة', 'Instant lookup across 456 documented Palestinian villages and towns', 1200);
    await R.click(addForm(R).getByRole('button', { name: /حفظ ومتابعة|^حفظ$|Save/ }).first(), { name: 'save self' });
    await R.page.waitForURL(/\/tree\/[0-9a-f-]+(\?|$)/, { timeout: 40000 });
    await R.settle(2000);
    const sel = R.page.url().match(/selected=([0-9a-f-]+)/);
    state.selfId = sel ? sel[1] : null;
    await R.caption('مساحة الشجرة: المخطط في الوسط، ولوحة الإجراءات للشخص المحدد', 'The tree workspace: the chart in the middle, and an action panel for the selected person', 2800);
  };

  flows.tree_relatives = async (R) => {
    const card = R.page.locator('a[aria-label="سامر حدّاد"]').first();
    await R.hover(card, { dwell: 900 });
    await R.caption('مرّر فوق البطاقة: أزرار + لإضافة والد، ابن، شقيق أو زوج', 'Hover a card: “+” buttons add a parent, child, sibling or spouse', 2200);
    // --- child: the father has no recorded spouse → a placeholder mother is created automatically
    await R.click(R.page.locator('a[aria-label="أضف ابنًا/ابنة"]').first(), { name: '+ child', allowCovered: true, after: 1200 });
    await R.waitFor(visibleInput(R), 25000);
    await R.caption('لوحة الإضافة: اختر صلة القرابة، ثم الشخص المرتبط، ثم البيانات', 'The add sheet: pick the relationship, the person it links to, then the details', 2600);
    await R.caption('القاعدة: لكل ابن أم — لا زوجة مسجّلة للأب، فستُنشأ أمٌّ مؤقتة تلقائيًا', 'Rule: every child needs a mother — no spouse recorded, so a placeholder mother is created automatically', 2800);
    let form = addForm(R);
    await fillPerson(R, form, { ar: ['كريم'], en: ['Karim'], gender: 'M', birth: 2016 });
    await R.click(form.getByRole('button', { name: /حفظ|Save/ }).first(), { name: 'save child', after: 2200 });
    await R.settle(1500);
    await R.caption('أُنشئت أمٌّ مؤقتة (بطاقة متقطّعة «أكمل البيانات») وارتبط بها كريم', 'A placeholder mother (dashed “complete the details” card) was created and Karim linked to her', 2800);
    // --- add the father via the + parent button on Samer
    const samer = R.page.locator('a[aria-label="سامر حدّاد"]').first();
    await R.hover(samer, { dwell: 700 });
    await R.click(R.page.locator('a[aria-label="أضف والدًا/والدة"]').first(), { name: '+ parent', allowCovered: true, after: 1200 });
    await R.waitFor(visibleInput(R));
    await R.caption('إضافة الأب — يرث الأبناء اللقب والقرية تلقائيًا', 'Adding the father — children inherit the surname and village automatically', 1800);
    form = addForm(R);
    await fillPerson(R, form, { ar: ['إلياس'], en: ['Elias'], gender: 'M', birth: 1955, village: 'يافا' });
    await R.click(form.getByRole('button', { name: /حفظ|Save/ }).first(), { name: 'save father', after: 2200 });
    await R.settle(1500);
    await R.caption('ظهر الأب، ومعه بطاقة شبحية «أضف الأم» لاستكمال الأسرة', 'The father appears, with a ghost “add the mother” card to complete the family', 2600);
    const ghost = R.page.locator('a[aria-label="أضف الأم"]').first();
    if (await ghost.count()) {
      await R.click(ghost, { name: 'ghost add mother', after: 1200 });
      await R.waitFor(visibleInput(R));
      form = addForm(R);
      await fillPerson(R, form, { ar: ['سلمى'], en: ['Salma'], gender: 'F', birth: 1960 });
      await R.click(form.getByRole('button', { name: /حفظ|Save/ }).first(), { name: 'save mother', after: 2200 });
      await R.settle(1500);
      await R.caption('اكتملت أسرة الوالدين — خطوط الزواج والنسب تُرسم من بيانات الأسرة', 'The parents’ family is complete — marriage and descent lines are drawn from the family data', 2600);
    }
  };

  flows.person360 = async (R) => {
    const samer = R.page.locator('a[aria-label="سامر حدّاد"]').first();
    await R.click(samer, { name: 'select Samer', after: 1200 });
    const profile = R.page.getByRole('link', { name: /عرض الملف الشخصي|View profile/ }).first();
    await R.click(profile, { name: 'view profile' });
    await R.page.waitForURL(/\/person\//, { timeout: 30000 });
    await R.settle(1500);
    await R.caption('عرض ٣٦٠°: الوالدان أعلى، الأشقاء والأزواج جانبًا، الأبناء أسفل', '360° view: parents above, siblings and spouses to the sides, children below', 3000);
    const tile = R.page.locator('main a[href*="/person/"]').first();
    if (await tile.count()) { try { await R.hover(tile, { dwell: 1600 }); await R.caption('بطاقة تمرير بملخّص ثنائي اللغة', 'A hover card with a bilingual summary', 1400); } catch {} }
    await R.scrollTour(600, 600, 1300);
    await R.caption('ترقية الشخص المؤقّت إلى شخص حقيقي، وإضافة أبناء من هنا أيضًا', 'Upgrade the placeholder to a real person, and add children from here too', 2200);
    await R.scrollTop();
    await R.goto(`/tree/${state.treeId}?selected=${state.selfId || ''}`);
  };

  flows.chart = async (R) => {
    await R.waitFor('button[aria-label="تكبير"], button[aria-label="Zoom in"]');
    await R.caption('أدوات المخطط: تكبير، تصغير، ملاءمة، تمركز، والعودة للشخص الرئيسي', 'Chart tools: zoom in/out, fit, re-centre, and back to the home person', 2000);
    for (const label of ['تكبير', 'تكبير', 'تصغير', 'ملاءمة الشجرة كاملة', 'التمركز على المحور']) {
      const b = R.page.locator(`button[aria-label="${label}"]`).first();
      if (await b.count()) await R.click(b, { name: label, after: 800 });
    }
    const samer = R.page.locator('a[aria-label="سامر حدّاد"]').first();
    const box = await samer.boundingBox();
    if (box) {
      const sx = box.x - 260, sy = box.y + 160;
      await R.moveTo(sx, sy, 400);
      await R.page.mouse.down();
      await R.moveTo(sx + 180, sy - 90, 900);
      await R.page.mouse.up();
      await R.pause(500);
      await R.caption('سحب للتحريك، وعجلة الفأرة للتكبير نحو المؤشر', 'Drag to pan, mouse wheel to zoom toward the cursor', 1200);
      for (let i = 0; i < 3; i++) { await R.page.mouse.wheel(0, -120); await R.pause(250); }
      await R.pause(500);
      for (let i = 0; i < 3; i++) { await R.page.mouse.wheel(0, 120); await R.pause(250); }
    }
    const home = R.page.locator('button[aria-label="العودة للشخص الرئيسي"]').first();
    if (await home.count()) await R.click(home, { name: 'home person', after: 900 });
    const find = R.page.getByRole('button', { name: /ابحث في الشجرة|Find in tree/ }).first();
    const trig = R.page.locator('button[data-sidebar="trigger"]').first();
    if (await find.count()) {
      const collapse = await isCovered(find);
      if (collapse) {
        await R.caption('طيّ الشريط الجانبي يوسّع مساحة المخطط', 'Collapsing the sidebar widens the chart', 900);
        await R.click(trig, { name: 'collapse sidebar', after: 1000 });
      }
      await R.click(find, { name: 'find in tree', after: 900 });
      const input = R.page.getByRole('dialog').locator('input').first();
      await R.type(input, 'كريم', { delay: 110 });
      await R.caption('لوحة «ابحث في الشجرة»: بحث حيّ، وقفز إلى أي شخص يعيد تمركز المخطط', '“Find in tree”: live search — jumping to a person re-centres the chart', 2000);
      const hit = R.page.getByRole('dialog').locator('button, a').filter({ hasText: /كريم/ }).first();
      if (await hit.count()) await R.click(hit, { name: 'jump to Karim', after: 1200 });
      await R.press('Escape', 400);
      if (collapse) await R.click(trig, { name: 'expand sidebar', after: 900 });
    }
    await R.goto(`/tree/${state.treeId}/chart`);
    await R.caption('صفحة المخطط الكامل بملء الشاشة', 'The dedicated full-screen chart page', 2400);
  };

  flows.people = async (R) => {
    await R.goto(`/tree/${state.treeId}/people`);
    await R.waitFor('h1');
    await R.caption('قائمة «كل الأشخاص»: بحث بالاسم وفلاتر الجنس والحياة والمؤقّت', '“All people” list: name search plus gender / living / placeholder filters', 2400);
    for (const re of [/^(ذكور|Male)$/, /^(مؤقتون|Placeholders?)$/, /^(الكل|All)$/]) {
      const chip = R.page.locator('main button').filter({ hasText: re }).first();
      if (await chip.count()) await R.click(chip, { name: 'filter chip', after: 1100 });
    }
    const s = R.page.locator('main input[type="search"], main input[type="text"]').first();
    if (await s.count()) await R.type(s, 'سامر', { delay: 100, after: 1200 });
    const row = R.page.locator('main a[title="عرض في الشجرة"], main a[href*="selected="]').first();
    if (await row.count()) { await R.caption('النقر على صف يقفز بالمخطط إلى ذلك الشخص', 'Clicking a row jumps the chart to that person', 1200); }
  };

  flows.gedcom = async (R) => {
    await R.goto(`/tree/${state.treeId}`);
    await R.waitFor('button[aria-label="تكبير"]');
    await R.caption('رأس الشجرة: إضافة شخص، كل الأشخاص، استيراد وتصدير GEDCOM', 'Tree header: add person, all people, GEDCOM import and export', 2200);
    const trig = R.page.locator('button[data-sidebar="trigger"]').first();
    const exp = R.page.locator('a[href*=\"/gedcom\"]').first();
    const collapse = await isCovered(exp);
    if (collapse) await R.click(trig, { name: 'collapse sidebar', after: 1000 });
    if (await exp.count()) {
      const dl = R.page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
      await R.click(exp, { name: 'export gedcom', after: 1500 });
      const d = await dl;
      await R.caption(d ? `تم تنزيل ${d.suggestedFilename()} — ملف GEDCOM قياسي يعمل مع أي برنامج أنساب` : 'تصدير GEDCOM', d ? `Downloaded ${d.suggestedFilename()} — a standard GEDCOM file for any genealogy program` : 'GEDCOM export', 2400);
    }
    const imp = R.page.getByRole('button', { name: /استيراد GEDCOM|Import GEDCOM/ }).first();
    if (await imp.count()) {
      await R.click(imp, { name: 'import gedcom', after: 1200 });
      await R.caption('استيراد ملف GEDCOM: يُطابق القرى تلقائيًا ويحمي من تكرار المعرّفات', 'Importing a GEDCOM file: villages are matched automatically, ids kept collision-free', 1800);
      await R.page.locator('input[type="file"]').first().setInputFiles(FIXTURE_GED);
      await R.pause(1400);
      const go = R.page.getByRole('dialog').getByRole('button', { name: /استيراد|Import/ }).last();
      if (await go.count()) await R.click(go, { name: 'confirm import', after: 2500 });
      await R.settle(1000);
      await R.caption('تقرير الاستيراد: الأشخاص، العائلات، الأحداث، والقرى غير المطابقة', 'Import report: persons, families, events, and unmatched places', 2800);
      const done = R.page.getByRole('dialog').getByRole('button', { name: /^تم$|^Done$/ }).first();
      if (await done.count()) await R.click(done, { name: 'close import', after: 1200 });
      else await R.press('Escape', 500);
      await R.settle(1500);
      await R.caption('الشجرة تحدّثت فورًا بالأشخاص المستوردين', 'The tree updated at once with the imported people', 2000);
    }
    if (collapse) await R.click(trig, { name: 'expand sidebar', after: 800 });
  };

  /* --------------------------------------------------------- family finder */
  flows.finder = async (R) => {
    await R.goto('/search');
    await R.waitFor('input[type="search"]');
    await R.chapter('ابحث عن ذويك', 'Family finder — search the Mother Tree', 2400);
    await R.caption('بحث في الشجرة الأم: جميع الأشجار المتصلة، بالعربية أو بالحروف اللاتينية', 'Search across every connected tree, in Arabic or Latin letters', 2200);
    const q = R.page.locator('input[type="search"]').first();
    const go = R.page.locator('button[type="submit"]').filter({ hasText: /ابحث|Search/ }).first();
    await R.type(q, 'أحمد', { delay: 110 });
    await R.click(go, { name: 'search', after: 2400 });
    await R.caption('النتائج مع درجة التطابق، شجرة المصدر، وشريحة صلة القرابة', 'Results with a match score, the source tree, and a relationship chip', 2400);
    await R.scrollTour(300, 300, 900);
    const firstResult = R.page.locator('main :is(li, article, button, [role="button"], [role="link"])').filter({ hasText: /أحمد الخطيب/ }).first();
    if (await firstResult.count()) {
      await R.hover(firstResult, { dwell: 800 });
      await R.caption('نتيجة من شجرة عامّة تفتح الملف الشخصي ٣٦٠° لذلك الشخص في شجرته', 'A public-tree result opens that person’s 360° profile inside their tree', 1800);
      await R.click(firstResult, { name: 'open result', allowCovered: true });
      await R.page.waitForURL(/\/person\//, { timeout: 30000 }).catch(() => {});
      await R.settle(1800);
      await R.caption('أحمد الخطيب في شجرة عائلة الخطيب — صفد: الوالدان، الزوجة، والأبناء', 'Ahmad Al-Khatib in the Al-Khatib (Safad) tree: parents, spouse, children', 2600);
      await R.goto('/search');
      await R.waitFor('input[type="search"]');
    }
    await R.type(q, 'Ibraheem', { clear: true, delay: 90 });
    await R.click(go, { name: 'search phonetic', after: 2400 });
    await R.caption('مطابقة صوتية: «Ibraheem» بالحروف اللاتينية يجد إبراهيم بالعربية', 'Phonetic matching: Latin “Ibraheem” finds إبراهيم in Arabic', 2800);
    const adv = R.page.getByRole('button', { name: /بحث متقدّم|Advanced filters/ }).first();
    if (await adv.count()) {
      await R.click(adv, { name: 'advanced filters', after: 1000 });
      await R.caption('فلاتر متقدّمة: اللقب، الجنس، سنة الميلاد ± سنوات، وقرية الأصل', 'Advanced filters: surname, gender, birth year ± window, village of origin', 2200);
      await R.type(q, 'خليل', { clear: true, delay: 100 });
      const sur = R.page.getByPlaceholder(/العجرمي|Al-Ajrami/).first();
      if (await sur.count()) await R.type(sur, 'الخطيب', { delay: 100 });
      const yr = R.page.getByPlaceholder('1965').first();
      if (await yr.count()) await R.type(yr, '1940', { delay: 100 });
      const vil = R.page.getByPlaceholder(/ابحث عن قرية|Search a village/).first();
      if (await vil.count()) { await R.type(vil, 'صفد', { delay: 120 }); await R.pause(1200); const o = R.page.getByRole('option').first(); if (await o.count()) await R.click(o, { name: 'pick Safad', after: 600 }); }
      await R.click(go, { name: 'search advanced', after: 2400 });
      await R.caption('خليل الخطيب، صفد ١٩٤٠ — مسجّل في شجرتين مختلفتين', 'Khalil Al-Khatib, Safad 1940 — recorded in two different trees', 2400);
      await R.scrollTour(400, 400, 1000);
      await R.scrollTop();
    }
  };

  flows.request_access = async (R) => {
    const q = R.page.locator('input[type="search"]').first();
    const go = R.page.locator('button[type="submit"]').filter({ hasText: /ابحث|Search/ }).first();
    for (const ph of [/العجرمي|Al-Ajrami/, '1965']) { const f = R.page.getByPlaceholder(ph).first(); if (await f.count()) await f.fill(''); }
    await R.type(q, 'المصري', { clear: true, delay: 100 });
    await R.click(go, { name: 'search masri', after: 2400 });
    await R.caption('شجرة خاصّة: الاسم محجوب — «شخصٌ في هذه الشجرة» — ويمكن طلب الوصول', 'A private tree: the name is hidden — “someone in this tree” — and access can be requested', 2600);
    const req = R.page.getByRole('button', { name: /اطلب الوصول|Request access/ }).first();
    await R.click(req, { name: 'request access', after: 1200 });
    await R.caption('طلب وصول: الصلاحية المطلوبة، مستند يثبت القرابة، ورسالة للمالك', 'Access request: requested role, a proof-of-kinship document, and a note to the owner', 2200);
    const collab = R.page.getByRole('button', { name: /مُشارك|Collaborator/ }).first();
    if (await collab.count()) await R.click(collab, { name: 'role: collaborator', after: 700 });
    await R.page.locator('input[type="file"]').last().setInputFiles(path.join(DOCS, 'huda-id-national.png'));
    await R.pause(1000);
    const note = R.page.locator('textarea').last();
    if (await note.count()) await R.type(note, 'جدّتي من آل المصري في نابلس، وأبحث عن فرع بيروت.', { delay: 45 });
    await R.click(R.page.getByRole('button', { name: /إرسال الطلب|Submit request/ }).first(), { name: 'submit request', after: 2200 });
    await R.caption('تمّ إرسال الطلب — ينتظر موافقة مالك الشجرة', 'Request sent — waiting for the tree owner’s approval', 2200);
    const done = R.page.getByRole('button', { name: /^تمام$|^Done$|^إغلاق$|^Close$/ }).first();
    if (await done.count()) await R.click(done, { name: 'close dialog', after: 800 });
    else await R.press('Escape', 600);
  };

  /* ------------------------------------------------------------ directories */
  flows.directories = async (R) => {
    await R.goto('/families');
    await R.waitFor('a[href^="/families/"]');
    await R.chapter('دليل العائلات والقرى', 'Families & villages directories', 2200);
    await R.caption('عائلات الشجرة الأم بحسب اللقب، مع عدد الأفراد', 'Families of the Master Tree by surname, with people counts', 2000);
    const fs = R.page.locator('input[type="search"]').first();
    if (await fs.count()) await R.type(fs, 'الخطيب', { delay: 110, after: 1200 });
    const fam = R.page.locator('a[href^="/families/"]').first();
    await R.click(fam, { name: 'family card' });
    await R.settle(1500);
    await R.caption('صفحة العائلة: أفرادها، أشجارها، والقرى التي انتشرت فيها', 'Family page: its people, its trees, and the villages it spread across', 2400);
    await R.scrollTour(900, 450, 1100);
    await R.scrollTop();
    await R.goto('/villages');
    await R.waitFor('a[href^="/villages/"]');
    await R.caption('دليل القرى والمدن والعشائر — تبويبات: الكل، قرى، مدن، عشائر، خرب', 'Villages, cities & clans directory — tabs: all, villages, cities, clans, ruins', 2200);
    const tabs = R.page.getByRole('tab');
    if ((await tabs.count()) >= 4) { await R.click(tabs.nth(3), { name: 'clans tab', after: 1200 }); await R.click(tabs.nth(0), { name: 'all tab', after: 800 }); }
    const vs = R.page.locator('input[type="search"]').first();
    if (await vs.count()) await R.type(vs, 'لفتا', { delay: 120, after: 1400 });
    const v = R.page.locator('a[href^="/villages/"]').filter({ hasText: /لفتا|Lifta/ }).first();
    await R.click((await v.count()) ? v : R.page.locator('a[href^="/villages/"]').first(), { name: 'village card' });
    await R.settle(1500);
    await R.caption('صفحة القرية: المنطقة، السكان، سنة التهجير، العائلات الموثقة، والإجراءات التالية', 'Village page: district, population, year depopulated, documented families, next actions', 2800);
    await R.scrollTour(1200, 500, 1100);
    await R.scrollTop();
  };

  /* ---------------------------------------------------------- owner inbox */
  flows.owner_inbox = async (R) => {
    await signOut(R);
    await R.chapter('مالك الشجرة', 'The tree owner’s side', 2200);
    await login(R, 'nadia.masri@juthoor.local', ['الدخول بحساب نادية المصري، مالكة شجرة فرع بيروت', 'Signing in as Nadia Masri, owner of the Beirut branch tree']);
    await R.goto('/dashboard');
    await R.waitFor('h1');
    await R.caption('لوحة مالكة شجرة قائمة: الأفراد، الأصول، وأحدث الإضافات', 'An established owner’s dashboard: people, origins, recently added', 2400);
    await R.scrollTour(700, 500, 1100);
    await R.scrollTop();
    await openBell(R, 'إشعار بطلب وصول جديد إلى شجرتها', 'A notification about the new access request to her tree');
    await R.click(sideLink(R, /طلبات الوصول|Access Requests/), { name: 'access requests' });
    await R.settle(1500);
    await R.caption('طلبات الوصول: من يطلب الانضمام، الصلاحية، المستند المرفق، والرسالة', 'Access requests: who is asking, the role, the attached document, and the note', 2600);
    const approve = R.page.getByRole('button', { name: /^موافقة$|^Approve$/ }).first();
    await R.click(approve, { name: 'approve request', after: 2200 });
    await R.caption('تمت الموافقة — صار العضو الجديد قارئًا للشجرة الخاصّة', 'Approved — the new member can now read the private tree', 2400);
    await R.goto('/tree');
    await R.waitFor('button[aria-label="تكبير"]');
    await R.caption('شجرة نادية: خمسة أشخاص عبر ثلاثة أجيال، من نابلس إلى بيروت', 'Nadia’s tree: five people across three generations, Nablus to Beirut', 2400);
    const fit = R.page.locator('button[aria-label="ملاءمة الشجرة كاملة"]').first();
    if (await fit.count()) await R.click(fit, { name: 'fit', after: 1800 });
  };

  /* ------------------------------------------------------------------ admin */
  flows.admin = async (R) => {
    await signOut(R);
    await R.chapter('لوحة المشرف', 'Administrator tools', 2400);
    await login(R, 'admin@juthoor.local', ['الدخول بحساب مشرف المنصّة', 'Signing in as the platform administrator']);
    await R.goto('/admin/review');
    await R.waitFor('button:has-text("دمج"), button:has-text("Merge")');
    await R.caption('طابور المطابقات المقترحة: يرتّبها محرّك المطابقة بحسب الثقة', 'Proposed match queue, ranked by the matching engine’s confidence', 2600);
    await R.scrollTour(500, 500, 1300);
    await R.scrollTop();
    await R.caption('شرائح الحقول: أخضر متطابق، رمادي مجهول، أحمر متعارض', 'Field chips: green agrees, grey unknown, red conflicts', 2200);
    const cards = R.page.locator('li').filter({ has: R.page.getByRole('button', { name: /^دمج$|^Merge$/ }) });
    const first = cards.first();
    await R.hover(first, { dwell: 600, fy: 0.3 });
    await R.caption('الزوج الأعلى: خليل الخطيب في شجرتين — متوفّى، يمكن دمجه مباشرة', 'Top pair: Khalil Al-Khatib in two trees — deceased, can be merged directly', 2200);
    await R.click(first.getByRole('button', { name: /^دمج$|^Merge$/ }), { name: 'merge', after: 2200 });
    await R.caption('دُمج — أصبح الشخصان رابطًا مؤكّدًا بين الشجرتين', 'Merged — the two records are now a confirmed link between the trees', 2000);
    const second = cards.first();
    const note = second.locator('input[placeholder*="ملاحظة"], input[placeholder*="Note"]').first();
    if (await note.count()) await R.type(note, 'أخوان، ليسا الشخص نفسه', { delay: 60 });
    await R.click(second.getByRole('button', { name: /^رفض$|^Reject$/ }), { name: 'reject', after: 2000 });
    await R.caption('رُفض مع ملاحظة للسجل', 'Rejected with a note for the audit log', 1800);
    const defer = R.page.getByRole('button', { name: /تأجيل للمالكَين|Defer to owners/ }).first();
    try {
      const deferCard = R.page.locator('li').filter({ has: defer }).first();
      state.deferredText = (await deferCard.innerText()).slice(0, 400);
    } catch { state.deferredText = ''; }
    await R.hover(defer, { dwell: 400 });
    await R.caption('حالة غير حاسمة — تُحال إلى مالكَي الشجرتين ليقرّرا', 'An uncertain case — deferred to both tree owners to decide', 2000);
    await R.click(defer, { name: 'defer', after: 2000 });
    const living = R.page.getByRole('button', { name: /اعتماد \(يتطلب|Approve \(needs both owners\)/ }).first();
    if (await living.count()) {
      await R.hover(living, { dwell: 800 });
      await R.caption('شخص حيّ: لا دمج من المشرف — يلزم موافقة المالكَين (قاعدة الخصوصية)', 'A living person: no admin merge — both owners must consent (privacy rule)', 2800);
    }
    const rescore = R.page.getByRole('button', { name: /إعادة تقييم|Re-check/ }).first();
    if (await rescore.count()) { await R.click(rescore, { name: 'rescore', after: 1800 }); await R.caption('إعادة التقييم عبر المحرّك عند الحاجة', 'Re-score through the engine on demand', 1500); }

    await R.goto('/admin/verifications');
    await R.waitFor('button:has-text("موافقة"), button:has-text("Approve")');
    await R.caption('طلبات توثيق الهوية: الوثيقة، دليل العائلة، والشجرة التي سيُمنح تحريرها', 'Identity verification requests: the ID, family evidence, and the tree edit grant', 2800);
    await R.scrollTour(500, 500, 1200);
    await R.scrollTop();
    const idLink = R.page.getByRole('link', { name: /وثيقة الهوية|ID document/ }).first();
    if (await idLink.count()) {
      const href = await idLink.getAttribute('href');
      await R.hover(idLink, { dwell: 500 });
      if (href) {
        await R.goto(href, 1200);
        await R.caption('الوثيقة المرفوعة (وثيقة تجريبية مُعلَّمة بوضوح)', 'The uploaded document (a clearly watermarked mock)', 2400);
        await R.page.goBack(); await R.settle(1200);
        await R.waitFor('button:has-text("موافقة")');
      }
    }
    const approve = R.page.getByRole('button', { name: /^موافقة$|^Approve$/ }).first();
    await R.hover(approve, { dwell: 400 });
    await R.caption('الموافقة على رانيا تمنحها تحرير شجرة فرع عمّان', 'Approving Rania grants her edit rights on the Amman branch tree', 2000);
    await R.click(approve, { name: 'approve verification', after: 2200 });
    const reject = R.page.getByRole('button', { name: /^رفض$|^Reject$/ }).last();
    if (await reject.count()) { await R.click(reject, { name: 'reject verification', after: 1800 }); await R.caption('رفض طلب غير مكتمل — يمكن للعضو إعادة الإرسال بوثائق أوضح', 'Rejecting an incomplete request — the member can resubmit clearer documents', 2200); }
  };

  /* ------------------------------------------------------- owner connections */
  flows.owner_connections = async (R) => {
    await signOut(R);
    await R.chapter('روابط عائلية بين الأشجار', 'Family connections between trees', 2200);
    const txt = state.deferredText || '';
    const owner = /الخطيب|Khat/.test(txt) ? ['omar.khatib@juthoor.local', 'عمر الخطيب، مالك شجرة آل الخطيب — فرع عمّان', 'Omar Al-Khatib, owner of the Amman-branch Al-Khatib tree']
      : /العجرمي|عجرمي|Ajram/.test(txt) ? ['sami.ajrami@juthoor.local', 'سامي العجرمي، مالك شجرة العجرمي — المجدل', 'Sami Al-Ajrami, owner of the al-Majdal tree']
      : /المصري|Masri/.test(txt) ? ['khalil.masri@juthoor.local', 'خليل المصري، مالك شجرة آل المصري — نابلس', 'Khalil Al-Masri, owner of the Nablus tree']
      : ['yousef.hajj@juthoor.local', 'يوسف الحاج، مالك شجرة دار الحاج — لفتا', 'Yousef Al-Hajj, owner of the Lifta tree'];
    await login(R, owner[0], ['الدخول بحساب ' + owner[1], 'Signing in as ' + owner[2]]);
    await openBell(R, 'إشعار: مطابقة محالة إليك من المشرف', 'Notification: a match deferred to you by the admin');
    await R.goto('/dashboard/connections');
    await R.waitFor('h1');
    await R.caption('روابط محتملة بين شجرتك وأخرى — الطرف الآخر محجوب حتى يوافق الاثنان', 'Possible links with another tree — the other side stays masked until both agree', 2800);
    const no = R.page.getByRole('button', { name: /ليس نفس الشخص|Not the same/ }).first();
    if (await no.count()) { await R.hover(no, { dwell: 600 }); await R.caption('يمكن الرفض، مع خيار «عدم مطابقة قريبك مستقبلًا»', 'Or decline, with “stop matching my relative in future”', 2000); }
    const yes = R.page.getByRole('button', { name: /نعم، نفس الشخص|Yes, same person/ }).first();
    if (await yes.count()) {
      await R.click(yes, { name: 'yes same person', after: 2000 });
      await R.caption('قبلتَ — بانتظار موافقة الطرف الآخر؛ يتأكّد الرابط عندما يوافق الاثنان', 'Accepted — awaiting the other owner; the link confirms only when both agree', 2600);
    }
  };

  flows.verified_member = async (R) => {
    await signOut(R);
    await login(R, 'rania.khatib@juthoor.local', ['الدخول بحساب رانيا بعد توثيق هويتها', 'Signing in as Rania after her verification was approved']);
    await openBell(R, 'إشعار: تمّ توثيق هويتك', 'Notification: your identity is verified');
    await R.goto('/verify');
    await R.waitFor('h2');
    await R.caption('حالة التوثيق: تم توثيق هويتك', 'Verification status: identity verified', 2000);
    await R.goto('/tree');
    await R.waitFor('button[aria-label="تكبير"]');
    await R.caption('شجرة رانيا — عائلة الخطيب من صفد عبر أربعة أجيال', 'Rania’s tree — the Al-Khatib family of Safad across four generations', 2200);
    const fit = R.page.locator('button[aria-label="ملاءمة الشجرة كاملة"]').first();
    if (await fit.count()) await R.click(fit, { name: 'fit', after: 2000 });
    await R.goto(`${R.page.url().match(/\/tree\/[0-9a-f-]+/)[0]}/people`);
    await R.waitFor('h1');
    await R.caption('قائمة أفراد شجرة قائمة مع أعمدة الميلاد والوفاة', 'The people list of an established tree, with birth and death columns', 2200);
  };

  /* ------------------------------------------------------------------ extras */
  flows.extras = async (R) => {
    await R.goto('/dashboard');
    await R.waitFor('h1');
    await R.chapter('التفضيلات والمظهر', 'Preferences & appearance', 2000);
    const mode = R.page.locator('button:has-text("Toggle theme"), button[aria-label*="theme" i]').first();
    if (await mode.count()) {
      const isDark = () => R.page.evaluate(() => document.documentElement.classList.contains('dark'));
      await R.click(mode, { name: 'theme toggle', after: 1200 });
      if (!(await isDark())) await R.click(mode, { name: 'theme toggle (again)', after: 1200 });
      await R.caption('الوضع الداكن', 'Dark mode', 2400);
      await R.scrollTour(500, 500, 1000);
      await R.scrollTop();
      await R.click(mode, { name: 'theme toggle back', after: 1000 });
      if (await isDark()) await R.click(mode, { name: 'theme toggle back (again)', after: 1000 });
    }
    const langEn = R.page.locator('[role="group"][aria-label="Language"] button', { hasText: 'EN' }).first();
    if (await langEn.count()) {
      await R.click(langEn, { name: 'locale EN', after: 1500 });
      await R.caption('الواجهة الكاملة للأعضاء بالإنجليزية أيضًا', 'The full member interface in English, too', 2200);
      await R.goto('/search'); await R.waitFor('input[type="search"]'); await R.settle(1500);
      await R.caption('Find Family — the same search, left-to-right', 'ابحث عن ذويك بالإنجليزية', 2200);
      await R.click(R.page.locator('[role="group"][aria-label="Language"] button', { hasText: 'ع' }).first(), { name: 'locale AR', after: 1200 });
    }
    await R.goto('/private-items');
    await R.waitFor('h1');
    await R.caption('وحدة «العناصر الخاصّة» الموروثة من القالب الأساسي (قائمة وإنشاء وعرض)', 'The “private items” module inherited from the starter template (list, create, view)', 2400);
    await signOut(R);
    await R.caption('تسجيل الخروج', 'Signing out', 1200);
  };

  flows.outro = async (R) => {
    await R.page.setContent(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
      html,body{margin:0;height:100%;background:linear-gradient(135deg,#1f3a2a,#3b5f3f);color:#f6f1e6;font-family:"Cairo","Segoe UI","Noto Sans Arabic",system-ui,sans-serif}
      .w{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:0 80px}
      .ar{font-size:72px;font-weight:800}.en{font-size:28px;opacity:.9;font-family:"Segoe UI",system-ui}.bar{width:140px;height:5px;background:#c9a227;border-radius:3px}
      .s{font-size:20px;opacity:.8;max-width:1100px;line-height:2}
    </style></head><body><div class="w"><div class="ar">جذور — لنُعيد نسج الحكاية</div><div class="bar"></div>
    <div class="en">Juthoor — reweaving the story, one family at a time</div>
    <div class="s">موقع عام · إنشاء حساب برمز بريدي · توثيق الهوية · لوحة الجذور · منشئ الشجرة ولوحة الإجراءات · عرض ٣٦٠° · المخطط الكامل · قائمة الأشخاص · استيراد وتصدير GEDCOM · البحث في الشجرة الأم والمطابقة الصوتية · طلبات الوصول · دليل العائلات والقرى · مراجعة المطابقات وتوثيق الهوية للمشرف · روابط بين الأشجار · الوضع الداكن والإنجليزية</div></div></body></html>`);
    await R.pause(4500);
  };
};
