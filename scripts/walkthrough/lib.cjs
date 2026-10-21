// Recording helpers: visible cursor, bilingual caption bar, chapter cards, human-paced actions.
const path = require('node:path');
const { chromium } = require('C:/Users/youssefbouz/ancestry/juthoor-local/apps/web/node_modules/@playwright/test');

const OVERLAY_INIT = `
(() => {
  if (window.top !== window) return; // only the main frame
  const STYLE = [
    '#jt-rec-cursor{position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;',
    '  transform:translate(-4px,-3px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));transition:opacity .2s;opacity:0}',
    '#jt-rec-ripple{position:fixed;width:44px;height:44px;border-radius:50%;border:3px solid #c9a227;z-index:2147483646;',
    '  pointer-events:none;transform:translate(-50%,-50%) scale(.3);opacity:0}',
    '#jt-rec-ripple.go{animation:jtRipple .55s ease-out forwards}',
    '@keyframes jtRipple{0%{transform:translate(-50%,-50%) scale(.3);opacity:.95}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}',
    '#jt-rec-cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;',
    '  max-width:min(1100px,86vw);padding:14px 26px;border-radius:16px;background:rgba(24,36,28,.86);color:#f6f1e6;',
    '  box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(6px);text-align:center;opacity:0;transition:opacity .35s;',
    '  font-family:"Cairo","Segoe UI","Noto Sans Arabic","Noto Sans",system-ui,sans-serif;direction:rtl}',
    '#jt-rec-cap .ar{font-size:24px;font-weight:700;line-height:1.5}',
    '#jt-rec-cap .en{font-size:16px;opacity:.85;direction:ltr;margin-top:2px;font-family:"Segoe UI",system-ui,sans-serif}',
    '#jt-rec-chap{position:fixed;inset:0;z-index:2147483644;pointer-events:none;display:flex;flex-direction:column;align-items:center;',
    '  justify-content:center;gap:14px;background:linear-gradient(135deg,#1f3a2a 0%,#3b5f3f 100%);color:#f6f1e6;opacity:0;transition:opacity .45s;',
    '  font-family:"Cairo","Segoe UI","Noto Sans Arabic",system-ui,sans-serif}',
    '#jt-rec-chap .k{font-size:15px;letter-spacing:.3em;text-transform:uppercase;opacity:.75;font-family:"Segoe UI",system-ui,sans-serif}',
    '#jt-rec-chap .ar{font-size:56px;font-weight:800;direction:rtl}',
    '#jt-rec-chap .en{font-size:26px;opacity:.9;font-family:"Segoe UI",system-ui,sans-serif}',
    '#jt-rec-chap .bar{width:120px;height:4px;border-radius:2px;background:#c9a227;margin-top:6px}',
    '@media (max-width:600px){#jt-rec-cap{bottom:14px;padding:8px 14px;border-radius:12px;max-width:92vw}#jt-rec-cap .ar{font-size:15px;line-height:1.4}#jt-rec-cap .en{font-size:11px}',
    '  #jt-rec-chap .ar{font-size:30px}#jt-rec-chap .en{font-size:15px}#jt-rec-cursor{width:22px;height:22px}}',
  ].join('\\n');
  function mount(){
    if (document.getElementById('jt-rec-cursor')) return;
    const root = document.documentElement;
    const st = document.createElement('style'); st.id='jt-rec-style'; st.textContent = STYLE; root.appendChild(st);
    const cur = document.createElement('div'); cur.id='jt-rec-cursor';
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M5 3l14 8.5-6.2 1.4L9.5 19 5 3z" fill="#fff" stroke="#222" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    root.appendChild(cur);
    const rip = document.createElement('div'); rip.id='jt-rec-ripple'; root.appendChild(rip);
    const cap = document.createElement('div'); cap.id='jt-rec-cap'; cap.innerHTML='<div class="ar"></div><div class="en"></div>'; root.appendChild(cap);
    const chap = document.createElement('div'); chap.id='jt-rec-chap';
    chap.innerHTML='<div class="k">Juthoor · جذور</div><div class="ar"></div><div class="bar"></div><div class="en"></div>'; root.appendChild(chap);
    const saved = sessionStorage.getItem('jt-rec-cap');
    if (saved) { try { const o = JSON.parse(saved); setCap(o.ar, o.en, false); } catch {} }
    const pos = sessionStorage.getItem('jt-rec-pos');
    if (pos) { try { const p = JSON.parse(pos); cur.style.left=p.x+'px'; cur.style.top=p.y+'px'; cur.style.opacity='1'; } catch {} }
  }
  function setCap(ar, en, store){
    if (store === undefined) store = true;
    const cap = document.getElementById('jt-rec-cap'); if(!cap) return;
    if (!ar && !en) { cap.style.opacity='0'; if(store) sessionStorage.removeItem('jt-rec-cap'); return; }
    cap.querySelector('.ar').textContent = ar || ''; cap.querySelector('.en').textContent = en || '';
    cap.style.opacity='1'; if(store) sessionStorage.setItem('jt-rec-cap', JSON.stringify({ar:ar,en:en}));
  }
  window.__jtCaption = setCap;
  window.__jtChapter = function(ar, en, show){ const c=document.getElementById('jt-rec-chap'); if(!c) return;
    c.querySelector('.ar').textContent=ar; c.querySelector('.en').textContent=en; c.style.opacity = show ? '1' : '0'; };
  document.addEventListener('mousemove', function(e){ const c=document.getElementById('jt-rec-cursor'); if(!c) return;
    c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px'; c.style.opacity='1';
    sessionStorage.setItem('jt-rec-pos', JSON.stringify({x:e.clientX,y:e.clientY})); }, true);
  document.addEventListener('mousedown', function(e){ const r=document.getElementById('jt-rec-ripple'); if(!r) return;
    r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); }, true);
  const t = setInterval(function(){ if (document.body) { clearInterval(t); mount(); } }, 10);
  document.addEventListener('DOMContentLoaded', mount);
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Recorder {
  constructor(opts = {}) {
    this.viewport = opts.viewport || { width: 1920, height: 1080 };
    this.videoDir = opts.videoDir || path.join(__dirname, 'out');
    this.baseURL = opts.baseURL || 'http://localhost:3000';
    this.speed = opts.speed || 1; // >1 = slower
    this.log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
  }

  async start() {
    this.browser = await chromium.launch({
      channel: 'chrome',
      headless: process.env.HEADED ? false : true,
      args: ['--window-position=0,0', '--window-size=1920,1080', '--hide-scrollbars=false', '--font-render-hinting=none'],
    });
    this.ctx = await this.browser.newContext({
      viewport: this.viewport,
      deviceScaleFactor: 1,
      locale: 'ar',
      recordVideo: { dir: this.videoDir, size: this.viewport },
      acceptDownloads: true,
    });
    await this.ctx.addInitScript(OVERLAY_INIT);
    this.page = await this.ctx.newPage();
    this.page.setDefaultTimeout(30000);
    this.mouse = { x: this.viewport.width / 2, y: this.viewport.height / 2 };
    await this.page.mouse.move(this.mouse.x, this.mouse.y);
    return this.page;
  }

  async stop() {
    const v = this.page.video();
    await this.ctx.close();
    const p = v ? await v.path() : null;
    await this.browser.close();
    return p;
  }

  async pause(ms) {
    await sleep(ms * this.speed);
  }

  async caption(ar, en, hold = 1400) {
    await this.page
      .evaluate(([a, e]) => window.__jtCaption && window.__jtCaption(a, e), [ar, en])
      .catch(() => {});
    this.log('CAPTION', en || ar);
    await this.pause(hold);
  }

  async clearCaption() {
    await this.page.evaluate(() => window.__jtCaption && window.__jtCaption('', '')).catch(() => {});
  }

  async chapter(ar, en, hold = 2600) {
    this.log('CHAPTER', en);
    await this.clearCaption();
    await this.page
      .evaluate(([a, e]) => window.__jtChapter && window.__jtChapter(a, e, true), [ar, en])
      .catch(() => {});
    await this.pause(hold);
    await this.page.evaluate(() => window.__jtChapter && window.__jtChapter('', '', false)).catch(() => {});
    await this.pause(500);
  }

  async goto(url, settle = 1500) {
    const full = url.startsWith('http') ? url : this.baseURL + url;
    this.log('GOTO', full);
    await this.page.goto(full, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.pause(settle);
  }

  async waitFor(target, timeout = 20000) {
    const loc = typeof target === 'string' ? this.page.locator(target).first() : target;
    await loc.waitFor({ state: 'visible', timeout }).catch(() => {});
    return loc;
  }

  async settle(ms = 1200) {
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.pause(ms);
  }

  async moveTo(x, y, ms = 450) {
    const steps = Math.max(8, Math.round(ms / 16));
    const sx = this.mouse.x, sy = this.mouse.y;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out
      await this.page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
      await sleep(ms / steps);
    }
    this.mouse = { x, y };
  }

  async hover(target, opts = {}) {
    const loc = typeof target === 'string' ? this.page.locator(target).first() : target;
    await loc.waitFor({ state: 'visible', timeout: opts.timeout || 20000 });
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await this.pause(250);
    const box = await loc.boundingBox();
    if (!box) throw new Error('no bounding box for target');
    const x = box.x + box.width * (opts.fx ?? 0.5);
    const y = box.y + box.height * (opts.fy ?? 0.5);
    const covered = await loc.evaluate((el, pt) => {
      const top = document.elementFromPoint(pt.x, pt.y);
      return !(top && (top === el || el.contains(top) || top.contains(el)));
    }, { x, y }).catch(() => false);
    if (covered && !opts.allowCovered) throw new Error('target is covered by another element at ' + Math.round(x) + ',' + Math.round(y));
    await this.moveTo(x, y, opts.ms || 500);
    await this.pause(opts.dwell ?? 400);
    return loc;
  }

  async click(target, opts = {}) {
    const loc = await this.hover(target, opts);
    await this.page.mouse.down();
    await sleep(70);
    await this.page.mouse.up();
    this.log('CLICK', opts.name || (typeof target === 'string' ? target : 'locator'));
    await this.pause(opts.after ?? 900);
    return loc;
  }

  async type(target, text, opts = {}) {
    const loc = await this.click(target, { ...opts, after: 250 });
    if (opts.clear) await loc.fill('');
    await loc.pressSequentially(text, { delay: opts.delay ?? 55 });
    await this.pause(opts.after ?? 500);
    return loc;
  }

  async press(key, after = 600) {
    await this.page.keyboard.press(key);
    await this.pause(after);
  }

  async scroll(dy, opts = {}) {
    const chunks = Math.max(1, Math.round(Math.abs(dy) / 120));
    for (let i = 0; i < chunks; i++) {
      await this.page.mouse.wheel(0, dy / chunks);
      await sleep((opts.ms || 700) / chunks);
    }
    await this.pause(opts.after ?? 600);
  }

  async scrollTour(total, step = 600, dwell = 1300) {
    let done = 0;
    while (done < total) {
      await this.scroll(step, { ms: 650, after: dwell });
      done += step;
    }
  }

  async scrollTop() {
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await this.pause(900);
  }
}

module.exports = { Recorder, sleep };
