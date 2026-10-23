import '@fontsource/hind/devanagari-400.css';
import '@fontsource/hind/devanagari-600.css';
import '@fontsource/hind/devanagari-700.css';
import '@fontsource/hind/400.css';
import '@fontsource/hind/600.css';
import '@fontsource/hind/700.css';
import '@fontsource/mukta/devanagari-400.css';
import '@fontsource/mukta/devanagari-600.css';
import '@fontsource/mukta/devanagari-700.css';
import '@fontsource/mukta/devanagari-800.css';
import '@fontsource/mukta/latin-400.css';
import '@fontsource/mukta/latin-600.css';
import '@fontsource/mukta/latin-700.css';
import '@fontsource/mukta/latin-800.css';
import '@fontsource/tiro-devanagari-marathi/devanagari-400.css';
import '@fontsource/tiro-devanagari-marathi/400.css';
import './style.css';
import { backend as B } from './backend.js';
import { NOTICE_TEMPLATES, MINUTES_TYPES, RESOLUTION_PHRASES } from './templates.js';
import { drawLetterhead } from './letterhead.js';
import { drawReceipt, receiptPng, receiptPdf } from './receipt.js';
import { DICT } from './dict.js';
import { openExternal, upiLink, waLink, shareImage, shareFile, copyText, isNative, notifyLocal, askNotifyPermission, onNotifyTap, bgConfig } from './platform.js';
import { OWNER_EMAIL, SUPPORT_EMAIL, TRIAL_DAYS, SITE_URL, PLANS, priceFor } from './config.js';
import { drawPoster, canvasToBlob, posterPdf } from './poster.js';
import { App as CapApp } from '@capacitor/app';
import { T, canon, LANG, LANGS, setLang } from './i18n.js';

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rs = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const MONTHS_ALL = {
  mr: ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};
const MONTHS = MONTHS_ALL[LANG];
const pad = n => String(n).padStart(2, '0');
const now = new Date();
const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const monthName = k => { const [y, m] = k.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
const addMonth = (k, d) => { let [y, m] = k.split('-').map(Number); m += d; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${pad(m)}`; };
const monthsBetween = (a, b) => { const out = []; if (!a || a > b) return out; let k = a; while (k <= b) { out.push(k); k = addMonth(k, 1); } return out; };
const fmtDate = (iso, lang = LANG) => { if (!iso) return '…'; const [y, m, d] = iso.split('-').map(Number); return `${d} ${(MONTHS_ALL[lang] || MONTHS)[m - 1]} ${y}`; };
const plural = n => n === 1 ? T('महिना') : T('महिने');
let toastT;
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3400); };
const errMsg = e => {
  const c = e && e.code;
  return ({
    'auth/invalid-credential': T('ईमेल किंवा पासवर्ड चुकीचा आहे.'), 'auth/wrong-password': T('ईमेल किंवा पासवर्ड चुकीचा आहे.'), 'auth/user-not-found': T('या ईमेलचे खाते नाही. आधी नोंदणी करा.'),
    'auth/email-already-in-use': T('या ईमेलचे खाते आधीच आहे. लॉगिन करा.'), 'auth/weak-password': T('पासवर्ड किमान ६ अक्षरांचा हवा.'), 'auth/invalid-email': T('ईमेल पत्ता नीट तपासा.'),
    'auth/network-request-failed': T('इंटरनेट कनेक्शन तपासा.'), 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': T('ॲप अजून Firebase शी जोडलेले नाही (src/config.js भरा).'), 'auth/operation-not-allowed': T('Firebase मध्ये Email/Password लॉगिन चालू करा.'), 'auth/too-many-requests': T('खूप प्रयत्न झाले. थोड्या वेळाने पुन्हा करा.'), 'auth/requires-recent-login': T('पुन्हा लॉगिन करून प्रयत्न करा.'), 'auth/missing-password': T('पासवर्ड टाका.'), 'permission-denied': T('हे करण्याची परवानगी नाही.'), 'unavailable': T('इंटरनेट कनेक्शन तपासा.')
  })[c] || T('काहीतरी चुकले. पुन्हा प्रयत्न करा.');
};
const fail = e => { console.error(e); toast(e && e.code === 'permission-denied' && isAdmin() ? T('परवानगी नाही. Firebase मधील नियम (Rules) नवीनतम आहेत का तपासा.') : errMsg(e)); };
const IC = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  ledger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12M6 9h12M9 4c3 0 5 1.6 5 5s-2 5-5 5H6l8 7"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  mega: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  badge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/></svg>',
  coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v8"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h3v-3"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
  rupee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12M6 9h12M9 4c3 0 5 1.6 5 5s-2 5-5 5H6l8 7"/></svg>'
};

/* ---------- state ---------- */
const S = { user: undefined, userDoc: null, sid: null, member: undefined, society: null, members: [], accounts: {}, myAccount: null, claims: [], notices: [], complaints: [], messages: [], funds: [], files: [], tab: 'home' };
let subs = [], userSub = null, memberSub = null;
const unsubAll = () => { subs.forEach(u => { try { u(); } catch (e) {} }); subs = []; };
const isAdmin = () => S.member && S.member.status === 'active' && S.member.role === 'admin';
const isActive = () => S.member && S.member.status === 'active';
const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
let ledgerMonth = thisMonth, ledgerFilter = 'due', complaintFilter = 'open', msgSeg = 'ann', fileFolder = 'all';

/* ---------- plan (free trial / paid) ---------- */
const DAY = 864e5;
const fmtTs = ts => { const d = new Date(ts); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const isoDay = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const addMonthsTs = (ts, n) => { const d = new Date(ts); d.setMonth(d.getMonth() + n); return d.getTime(); };
const trialEndOf = s => Number(s.trialEnds) || ((Number(s.createdAt) || Date.now()) + TRIAL_DAYS * DAY);
const planEnd = s => Math.max(Number(s.paidUntil) || 0, trialEndOf(s));
function planState(s) {
  const end = planEnd(s), t = Date.now();
  return { end, left: Math.max(0, Math.ceil((end - t) / DAY)), expired: end <= t, trial: !((Number(s.paidUntil) || 0) > t) && end > t };
}
const locked = () => isAdmin() && S.society && planState(S.society).expired;
const isOwnerUser = () => !!(S.user && S.user.email && S.user.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
const LOCK_MSG = T('सदस्यत्व संपले आहे. सुरू ठेवण्यासाठी Sachiv शी संपर्क करा.');
const socPrice = s => priceFor(((s && s.flats) || []).length);
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const planTiers = () => PLANS.map((p, i) => `<li><span class="grow">${i === 0 ? T('{0} पर्यंत सदनिका', p.maxFlats) : p.maxFlats === Infinity ? T('{0} पेक्षा जास्त सदनिका', PLANS[i - 1].maxFlats) : T('{0}–{1} सदनिका', PLANS[i - 1].maxFlats + 1, p.maxFlats)}</span><b class="num">${inr(p.price)}</b></li>`).join('');
const priceLine = s => `${T('तुमचा प्लॅन')}: <b class="num">${inr(socPrice(s))}</b> ${T('/ महिना')} <span class="muted">(${T('{0} सदनिका', ((s && s.flats) || []).length)})</span>`;
function sheetPricing() {
  openSheet(`${sheetHead(T('Sachiv किंमत'))}
    <p class="small m0">${T('संपूर्ण सोसायटीसाठी एक मासिक किंमत, सदनिकांच्या संख्येनुसार. सर्व सभासद मोफत वापरतात. पहिले {0} दिवस मोफत.', TRIAL_DAYS)}</p>
    <ul class="list">${planTiers()}</ul>
    <div class="card tint small">${priceLine(S.society)}</div>
    <p class="tiny muted m0">${T('भरणा थेट Sachiv ला UPI / बँकेद्वारे. ॲपमध्ये कोणतेही पैसे कापले जात नाहीत.')}</p>
    <button class="btn primary block" type="button" data-act="support">${T('संपर्क')}: ${esc(SUPPORT_EMAIL)}</button>`);
}
function planBanner(always) {
  const p = planState(S.society);
  if (p.expired) return `<div class="card lock stack"><b>${T('सदस्यत्व संपले')} (${fmtTs(p.end)})</b>
    <span class="small">${T('भरणा नोंदी, सूचना आणि आठवणी सध्या बंद आहेत. सभासदांना त्यांची थकबाकी आणि जुन्या सूचना दिसत राहतील. सुरू ठेवण्यासाठी Sachiv शी संपर्क करा.')}</span>
    <span class="small">${priceLine(S.society)}</span>
    <button class="btn" type="button" data-act="support">${T('संपर्क')}: ${esc(SUPPORT_EMAIL)}</button></div>`;
  if (p.trial) return `<button class="card tint small row between wrap btnlike" type="button" data-act="pricing"><span>${T('मोफत कालावधी')}: <b class="num">${p.left} ${T('दिवस')}</b> ${T('बाकी')}</span><span class="tiny muted">${T('नंतर {0} / महिना', inr(socPrice(S.society)))} ›</span></button>`;
  if (p.left <= 7) return `<div class="card tint small row between wrap"><span>${T('सदस्यत्व {0} ला संपेल', fmtTs(p.end))}</span><b class="bad num">${p.left} ${T('दिवस बाकी')}</b></div>`;
  return always ? `<button class="card small row between wrap btnlike" type="button" data-act="pricing"><span>${T('सदस्यत्व')} · <b class="num">${inr(socPrice(S.society))}</b>${T('/ महिना')}</span><span class="muted">${T('{0} पर्यंत', fmtTs(p.end))} ›</span></button>` : '';
}

/* ---------- money ---------- */
const flats = () => (S.society && S.society.flats) || [];
const monthly = () => Number(S.society && S.society.monthly) || 0;
function dueFor(flatId, upTo, payments) {
  const months = monthsBetween(S.society.startMonth || thisMonth, upTo);
  const f = flats().find(x => x.id === flatId) || {};
  const expected = months.length * monthly() + (Number(f.opening) || 0);
  const P = payments || (S.accounts[flatId] || {}).payments || {};
  let paid = 0; for (const m of months) if (P[m]) paid += Number(P[m].amount) || 0;
  return Math.max(0, expected - paid);
}
function monthSummary(m) {
  let collected = 0, dueTotal = 0, dueFlats = 0, paidCount = 0;
  for (const f of flats()) {
    const p = ((S.accounts[f.id] || {}).payments || {})[m]; if (p) { collected += Number(p.amount) || 0; paidCount++; }
    const d = dueFor(f.id, m); if (d > 0) { dueFlats++; dueTotal += d; }
  }
  return { collected, dueTotal, dueFlats, clear: flats().length - dueFlats, paidCount };
}
const monthsDue = due => monthly() ? Math.ceil(due / monthly()) : 0;
// several months at once: pick the oldest months not yet fully paid, then spread the amount over them
const PERIODS = [1, 2, 3, 6, 12];
const MAXN = 24; // any whole number of months, 1 to 24
const ALLN = Array.from({ length: MAXN }, (_, i) => i + 1);
const nLabel = n => n === 12 ? T('1 वर्ष') : n === 1 ? T('1 महिना') : T('{0} महिने', n);
const monthsFrom = (start, n) => Array.from({ length: n }, (_, i) => addMonth(start, i));
function nextUnpaid(flatId, n, P) {
  P = P || (S.accounts[flatId] || {}).payments || {};
  const out = []; let k = S.society.startMonth || thisMonth, guard = 0;
  while (out.length < n && guard++ < 600) { if ((Number((P[k] || {}).amount) || 0) < monthly()) out.push(k); k = addMonth(k, 1); }
  return out;
}
const rangeLabel = ms => !ms || !ms.length ? '' : ms.length === 1 ? monthName(ms[0]) : `${monthName(ms[0])} – ${monthName(ms[ms.length - 1])} (${T('{0} महिने', ms.length)})`;
function allocate(flatId, months, total, base) {
  const P = (S.accounts[flatId] || {}).payments || {}, map = {};
  let left = Number(total) || 0;
  months.forEach((m, i) => {
    const prev = Number((P[m] || {}).amount) || 0;
    const add = i === months.length - 1 ? left : Math.min(left, Math.max(0, monthly() - prev));
    left -= add;
    map[m] = { ...base, amount: prev + add, ...(months.length > 1 ? { grp: months, grpTotal: Number(total) || 0 } : {}) };
  });
  return map;
}
function reminderText(f, due) {
  const n = monthsDue(due);
  return [T('नमस्कार {0},', f.owner || ''), S.society.name, T('सदनिका {0} ची देखभाल थकबाकी {1} आहे.', f.id, rs(due) + (n > 1 ? ` (${n} ${T('महिने')})` : '')),
    S.society.upi ? T('कृपया Sachiv ॲपमधून किंवा थेट UPI {0} वर भरा.', S.society.upi) : T('कृपया Sachiv ॲपमधून UPI द्वारे भरा.'), T('धन्यवाद,'), T('सचिव')].join('\n');
}

/* ---------- join links (QR poster) ---------- */
const PJ = 'sachiv-pending-join';
const joinUrl = code => `${SITE_URL}/site/join.html?c=${encodeURIComponent(code)}`;
function takeJoinCode(str) {
  const m = String(str || '').match(/[?&](?:c|join)=([A-Za-z0-9]{6})/); if (!m) return;
  LS.set(PJ, m[1].toUpperCase());
  setTimeout(() => { if (S.user && S.userDoc) handlePendingJoin(); else render(); }, 0);
}
takeJoinCode(location.search);
if (isNative) { try { CapApp.addListener('appUrlOpen', ev => takeJoinCode(ev && ev.url)); } catch (e) {} }
let joinBusy = false;
async function handlePendingJoin() {
  const code = LS.get(PJ); if (!code || joinBusy || !S.user || !S.userDoc) return;
  joinBusy = true; LS.set(PJ, null);
  try { await startJoin(code); } finally { joinBusy = false; }
}

/* ---------- auth + society wiring ---------- */
B.onAuth(u => {
  S.user = u; S.userDoc = null; S.member = undefined; unsubAll();
  if (userSub) { userSub(); userSub = null; } if (memberSub) { memberSub(); memberSub = null; }
  if (u) userSub = B.watchUser(u.uid, d => { const first = !S.userDoc; S.userDoc = d; pickSociety(); render(); if (first) setTimeout(handlePendingJoin, 300); }, fail);
  render();
});

function pickSociety() {
  const list = Object.keys((S.userDoc && S.userDoc.societies) || {});
  let sid = S.sid && list.includes(S.sid) ? S.sid : (LS.get('sachiv-sid') && list.includes(LS.get('sachiv-sid')) ? LS.get('sachiv-sid') : list[0] || null);
  if (sid !== S.sid || (sid && !memberSub)) selectSociety(sid);
}

function selectSociety(sid) {
  unsubAll(); if (memberSub) { memberSub(); memberSub = null; }
  Object.assign(S, { sid, member: undefined, society: null, members: [], accounts: {}, myAccount: null, claims: [], notices: [], complaints: [], messages: [], funds: [], files: [], tab: 'home' });
  LS.set('sachiv-sid', sid);
  if (!sid) { render(); return; }
  let wiredFor = null;
  memberSub = B.watchMember(sid, S.user.uid, m => {
    S.member = m;
    const key = m && m.status === 'active' ? m.role + ':' + (m.flatId || '') : null;
    if (key !== wiredFor) { unsubAll(); wiredFor = key; if (key) wire(sid, m); }
    render();
  }, e => { S.member = null; render(); });
}

function wire(sid, m) {
  subs.push(B.watchSociety(sid, s => { S.society = s; render(); }, fail));
  subs.push(B.watchNotices(sid, n => { S.notices = n; render(); }, fail));
  subs.push(B.watchMessages(sid, l => { S.messages = l; render(); }, fail));
  subs.push(B.watchFunds(sid, l => { S.funds = l; render(); }, fail));
  subs.push(B.watchFiles(sid, l => { S.files = l; render(); }, fail, m.role !== 'admin'));
  if (m.role === 'admin') {
    subs.push(B.watchMembers(sid, l => { S.members = l; render(); }, fail));
    subs.push(B.watchAccounts(sid, l => { const A = {}; l.forEach(a => A[a.id] = a); S.accounts = A; render(); }, fail));
    subs.push(B.watchClaims(sid, l => { S.claims = l; render(); }, fail));
    subs.push(B.watchComplaints(sid, l => { S.complaints = l; render(); }, fail));
  } else {
    if (m.flatId) {
      subs.push(B.watchAccount(sid, m.flatId, a => { S.myAccount = a; S.accounts = { [m.flatId]: a }; render(); }, fail));
      subs.push(B.watchClaims(sid, l => { S.claims = l; render(); }, fail, m.flatId));
    }
    subs.push(B.watchComplaints(sid, l => { S.complaints = l; render(); }, fail, S.user.uid));
  }
}

/* ---------- render ---------- */
const SUBPAGES = { committee: T('समिती'), contacts: T('महत्त्वाचे संपर्क'), funds: T('वर्गणी'), complaints: T('तक्रारी'), members: T('सभासद व मंजुरी'), me: T('माझे खाते') };
const seenKey = () => 'sachiv-seen-' + S.sid;
const unreadCount = () => { const t = Number(LS.get(seenKey()) || 0); return S.messages.filter(m => m.createdAt > t && m.uid !== (S.user && S.user.uid)).length + S.notices.filter(n => n.createdAt > t && n.uid !== (S.user && S.user.uid)).length; };

/* ---------- welcome screen while the saved login and society load ---------- */
const BOOT_MIN = Date.now() + 1100;
let booted = false;
// Keep the welcome screen until the society is ready (or there is nothing to load), and at least ~1 second.
function booting() {
  if (booted) return false;
  const ready = S.userDoc && (!S.sid || (S.member !== undefined && (!S.member || S.member.status !== 'active' || S.society)));
  if (ready && Date.now() >= BOOT_MIN) { booted = true; return false; }
  if (ready) setTimeout(render, BOOT_MIN - Date.now() + 20);
  if (!ready && Date.now() > BOOT_MIN + 7000) { booted = true; return false; } // slow network: show the app's own loading states
  if (!ready) setTimeout(render, 600);
  return true;
}
const splash = () => { const sn = LS.get('sachiv-sname'); return `<div class="splash" role="status"><div class="splash-mark" aria-hidden="true">स</div><div class="splash-name">Sachiv</div><div class="splash-wel">${T('स्वागत आहे')}${S.user && S.user.name ? `, ${esc(S.user.name.split(' ')[0])}` : ''}</div>${sn && S.user ? `<div class="splash-soc">${esc(sn)}</div>` : ''}<div class="splash-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>`; };

/* ---------- in-app notifications (bell) ---------- */
const inboxKey = () => 'sachiv-inbox-' + S.sid;
const notifKey = () => 'sachiv-notified-' + S.sid;
const myReminder = () => { const a = S.myAccount || (S.member && S.accounts[S.member.flatId]); return a && a.reminder; };
function feed() {
  if (!S.society || !S.member) return [];
  const me = S.user.uid, out = [];
  for (const m of S.messages) if (m.uid !== me) out.push({ id: 'm' + m.id, at: m.createdAt, icon: 'mega', title: m.important ? T('महत्त्वाची घोषणा') : T('नवीन घोषणा'), body: m.text, go: 'messages' });
  for (const n of S.notices) if (n.uid !== me) out.push({ id: 'n' + n.id, at: n.createdAt, icon: 'doc', title: T('नवीन सूचना पत्र'), body: n.heading || '', go: 'messages', seg: 'notice' });
  if (isAdmin()) {
    for (const c of S.claims) if (c.status === 'pending') out.push({ id: 'c' + c.id, at: c.createdAt, icon: 'rupee', title: T('नवीन भरणा नोंद'), body: `${c.flatId} · ${rs(c.amount)} · ${c.name || ''}`, go: 'home' });
    for (const m of S.members) if (m.status === 'pending') out.push({ id: 'j' + m.id, at: m.createdAt, icon: 'user', title: T('नवीन सभासद विनंती'), body: `${m.name || ''} · ${m.flatId || ''}`, go: 'members' });
    for (const c of S.complaints) if (c.status === 'open' && c.uid !== me) out.push({ id: 'k' + c.id, at: c.createdAt, icon: 'chat', title: T('नवीन तक्रार'), body: `${c.flatId || ''} · ${c.text || ''}`, go: 'complaints' });
  } else {
    const r = myReminder(), due = S.member.flatId ? dueFor(S.member.flatId, thisMonth) : 0;
    if (r && r.at && due > 0) out.push({ id: 'r' + r.at, at: r.at, icon: 'rupee', title: T('थकबाकी आठवण'), body: T('{0} थकबाकी आहे. कृपया लवकर भरा.', rs(due)) + (r.note ? ` ${r.note}` : ''), act: 'pay' });
    for (const c of S.claims) if (c.decidedAt && c.status !== 'pending') out.push({ id: 'd' + c.id, at: c.decidedAt, icon: 'rupee', title: c.status === 'approved' ? T('भरणा मंजूर ✓') : T('भरणा नाकारला'), body: `${rs(c.amount)} · ${c.ref || ''}`, go: 'home' });
  }
  return out.filter(x => x.at).sort((a, b) => b.at - a.at).slice(0, 40);
}
const inboxCount = () => { const t = Number(LS.get(inboxKey()) || 0); return feed().filter(x => x.at > t).length; };
function sheetInbox() {
  const t = Number(LS.get(inboxKey()) || 0), list = feed();
  LS.set(inboxKey(), String(Date.now())); render();
  openSheet(`${sheetHead(T('सर्व सूचना'))}${list.length ? `<ul class="list inbox">${list.map((x, i) => `<li class="${x.at > t ? 'new' : ''}"><button class="btnlike row g10" type="button" data-ix="${i}"><span class="mi">${IC[x.icon] || IC.mega}</span><span class="grow"><b>${esc(x.title)}</b><span class="small clamp">${esc(x.body)}</span><span class="tiny muted">${ago(x.at)}</span></span></button></li>`).join('')}</ul>` : `<div class="card empty muted small">${T('नवीन काही नाही.')}</div>`}`, el => {
    el.querySelectorAll('[data-ix]').forEach(b => b.addEventListener('click', () => { const x = list[+b.dataset.ix]; closeSheet(); if (x.act === 'pay') setTimeout(sheetPayChoice, 250); else { if (x.seg) msgSeg = x.seg; S.tab = x.go || 'home'; render(); } }));
  });
}
// Phone notification for anything new since last time (while the app is open or in the background).
let notifyBusy = false;
async function notifyNew() {
  if (!isNative || notifyBusy || !S.society || !S.member || S.member.status !== 'active') return;
  const list = feed(), last = Number(LS.get(notifKey()) || 0);
  if (!last) { LS.set(notifKey(), String(Date.now())); return; } // first run: don't replay old items
  const fresh = list.filter(x => x.at > last).slice(0, 3);
  if (!fresh.length) return;
  notifyBusy = true; LS.set(notifKey(), String(Math.max(...fresh.map(x => x.at))));
  try { for (const x of fresh) await notifyLocal(`${x.title} · ${S.society.name}`, x.body); } finally { notifyBusy = false; }
}
if (isNative) { askNotifyPermission(); onNotifyTap(() => { if (S.society) sheetInbox(); }); }
// Keep the background checker in step with the signed-in user, society and what was already notified.
let bgSent = '';
function syncBg() {
  if (!isNative) return;
  if (!S.user) { if (bgSent !== 'none') { bgSent = 'none'; bgConfig(null); } return; }
  if (!S.society || !S.member || S.member.status !== 'active') return;
  const a = B.bgAuth && B.bgAuth(); if (!a) return;
  const last = Number(LS.get(notifKey()) || Date.now());
  const sig = [S.user.uid, S.sid, S.member.role, S.member.flatId, last, a.refreshToken.slice(-8), LANG].join('|');
  if (sig === bgSent) return; bgSent = sig;
  bgConfig({ ...a, uid: S.user.uid, sid: S.sid, sname: S.society.name, role: S.member.role, flatId: S.member.flatId || '', last,
    labels: { announce: T('नवीन घोषणा'), important: T('महत्त्वाची घोषणा'), notice: T('नवीन सूचना पत्र'), claim: T('नवीन भरणा नोंद'), join: T('नवीन सभासद विनंती'), complaint: T('नवीन तक्रार'), reminder: T('थकबाकी आठवण'), reminderBody: T('{0} थकबाकी आहे. कृपया लवकर भरा.'), approved: T('भरणा मंजूर ✓'), rejected: T('भरणा नाकारला') } });
}
function render() {
  const head = $('#head'), v = $('#view'), tabs = $('#tabs');
  if (S.user === undefined || (S.user && booting())) { document.body.dataset.screen = 'splash'; head.innerHTML = ''; tabs.innerHTML = ''; if (!$('.splash')) v.innerHTML = splash(); return; }
  document.body.dataset.screen = S.user ? 'app' : 'auth';
  if (!S.user) { head.innerHTML = ''; tabs.innerHTML = ''; v.innerHTML = viewAuth(); syncBg(); return; }
  if (!S.userDoc) { head.innerHTML = topBar(''); tabs.innerHTML = ''; v.innerHTML = loading(); return; }
  const socs = (S.userDoc && S.userDoc.societies) || {};
  if (!S.sid) { head.innerHTML = topBar(''); tabs.innerHTML = ''; v.innerHTML = `${pageTitle(T('तुमची सोसायटी जोडा'), `${T('नमस्कार')}, ` + esc(S.user.name))}` + viewOnboard(); return; }
  const sname = (socs[S.sid] || {}).name || '';
  if (S.member === undefined || (S.member && S.member.status === 'active' && !S.society)) { head.innerHTML = topBar(sname); tabs.innerHTML = ''; v.innerHTML = loading(); return; }
  if (!S.member) { head.innerHTML = topBar(sname); tabs.innerHTML = ''; v.innerHTML = viewGone(sname); return; }
  if (S.member.status !== 'active') { head.innerHTML = topBar(sname); tabs.innerHTML = ''; v.innerHTML = viewPending(sname); return; }
  head.innerHTML = topBar(S.society.name);
  LS.set('sachiv-sname', S.society.name);
  const TABS = isAdmin()
    ? [['home', T('मुख्य'), IC.home], ['ledger', T('खाते'), IC.ledger], ['+'], ['messages', T('संदेश'), IC.mega], ['more', T('अधिक'), IC.grid]]
    : [['home', T('मुख्य'), IC.home], ['messages', T('संदेश'), IC.mega], ['+'], ['files', T('फाइल्स'), IC.folder], ['more', T('अधिक'), IC.grid]];
  if (!TABS.some(t => t[0] === S.tab) && !SUBPAGES[S.tab] && S.tab !== 'files') S.tab = 'home';
  if (S.tab === 'members' && !isAdmin()) S.tab = 'more';
  if (S.tab === 'messages') LS.set(seenKey(), String(Date.now()));
  setTimeout(() => { notifyNew().finally(syncBg); }, 0);
  const navOn = SUBPAGES[S.tab] ? 'more' : S.tab;
  const badge = k => (k === 'home' && isAdmin() && pendingCount()) || (k === 'messages' && unreadCount()) ? `<i class="dot" aria-label="${T('नवीन')}"></i>` : '';
  tabs.innerHTML = `<nav aria-label="${T('मुख्य मेनू')}" style="grid-template-columns:repeat(${TABS.length},minmax(0,1fr))">${TABS.map(([k, l, ic]) => k === '+' ? `<button class="fab" type="button" data-act="quick" aria-label="${T('झटपट कामे')}"><span class="fabi">${IC.plus}</span></button>` : `<button type="button" data-tab="${k}" ${k === navOn ? 'aria-current="page"' : ''}>${ic}<span>${l}</span>${badge(k)}</button>`).join('')}</nav>`;
  const views = isAdmin()
    ? { home: aHome, ledger: aLedger, messages: vMessages, files: vFiles, more: vMore, committee: vCommittee, contacts: vContacts, funds: vFunds, complaints: vComplaints, members: aMembers, me: vMe }
    : { home: rHome, messages: vMessages, files: vFiles, more: vMore, committee: vCommittee, contacts: vContacts, funds: vFunds, complaints: vComplaints, me: vMe };
  const body = views[S.tab]();
  v.innerHTML = SUBPAGES[S.tab] ? `<button class="backbtn" type="button" data-tab="more">${IC.back}<span>${T('अधिक')}</span></button>${pageTitle(SUBPAGES[S.tab])}${body}` : body;
}
const pendingCount = () => S.claims.filter(c => c.status === 'pending').length + S.members.filter(m => m.status === 'pending').length;
const topBar = name => `<div class="topbar">${name ? `<button class="socbtn" type="button" data-act="switch"><span class="mark" aria-hidden="true">स</span><span class="sn">${esc(name)}</span>${IC.down}</button>` : `<span class="mark" aria-hidden="true">स</span><b class="brandname">Sachiv</b>`}${S.member && S.member.status === 'active' && S.society ? (() => { const n = inboxCount(); return `<button class="bell" type="button" data-act="inbox" aria-label="${T('सर्व सूचना')}${n ? ` (${n})` : ''}">${IC.bell}${n ? `<i class="cnt">${n > 9 ? '9+' : n}</i>` : ''}</button>`; })() : ''}${S.member && S.member.status === 'active' ? `<button class="avt" type="button" data-tab="me" aria-label="${T('माझे खाते')}">${esc(initials(S.user && S.user.name))}</button>` : ''}</div>`;
const pageTitle = (t, kicker) => `<div class="ptitle">${kicker ? `<div class="kicker">${kicker}</div>` : ''}<h1>${t}</h1></div>`;
const loading = () => `<div class="card empty muted">${T('माहिती आणत आहे…')}</div>`;
const initials = n => String(n || '?').replace(/^(श्री|सौ|कु|डॉ|Mr|Mrs|Ms|Dr)\.?\s*/i, '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
const telBtn = (phone, label) => phone ? `<a class="iconbtn" href="tel:${esc(String(phone).replace(/[^\d+]/g, ''))}" data-tel="${esc(String(phone).replace(/[^\d+]/g, ''))}" aria-label="${esc(label || T('कॉल'))} ${esc(phone)}">${IC.phone}</a>` : '';
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return T('आत्ताच'); if (m < 60) return m + ` ${T('मिनिटांपूर्वी')}`; const h = Math.round(m / 60); if (h < 24) return h + ` ${T('तासांपूर्वी')}`; const d = Math.round(h / 24); return d < 7 ? d + ` ${T('दिवसांपूर्वी')}` : fmtTs(ts); };

/* ---------- language ---------- */
const langChips = () => `<div class="seg langseg" role="group" aria-label="भाषा / Language">${LANGS.map(([k, l]) => `<button class="chip" type="button" data-setlang="${k}" aria-pressed="${k === LANG}">${l}</button>`).join('')}</div>`;

/* ---------- auth + onboarding views ---------- */
let authMode = 'login';
function viewAuth() {
  const su = authMode === 'signup';
  return `<section class="hero">
    <div class="row between wrap"><span class="mark big" aria-hidden="true">स</span>${langChips()}</div>
    <h1>${T('तुमच्या सोसायटीचा')}<br><em>${T('डिजिटल सचिव.')}</em></h1>
    <p>${T('देखभाल शुल्क, वर्गणी, सूचना, फाइल्स आणि समिती. सगळे एका ठिकाणी.')}</p>
  </section>
  ${LS.get(PJ) ? `<div class="card accent small">${T('सोसायटीत सामील होण्यासाठी आधी लॉगिन करा किंवा नवीन खाते तयार करा. जॉइन कोड: {0}', `<b class="code">${esc(LS.get(PJ))}</b>`)}</div>` : ''}
  <form class="card stack" id="authForm">
    <div class="seg" role="group" aria-label="${T('लॉगिन किंवा नोंदणी')}"><button type="button" class="chip" data-auth="login" aria-pressed="${!su}">${T('लॉगिन')}</button><button type="button" class="chip" data-auth="signup" aria-pressed="${su}">${T('नवीन खाते')}</button></div>
    ${su ? `<div class="field"><label for="aName">${T('तुमचे नाव')}</label><input id="aName" type="text" required autocomplete="name"></div>` : ''}
    <div class="field"><label for="aEmail">${T('ईमेल')}</label><input id="aEmail" type="email" required autocomplete="email" inputmode="email"></div>
    <div class="field"><label for="aPass">${T('पासवर्ड')} ${su ? `<span class="hint">(${T('किमान ६ अक्षरे')})</span>` : ''}</label><input id="aPass" type="password" required minlength="6" autocomplete="${su ? 'new-password' : 'current-password'}"></div>
    <button class="btn primary block" type="submit">${su ? T('खाते तयार करा') : T('लॉगिन करा')}</button>
    ${su ? '' : `<button class="link" type="button" data-act="forgot">${T('पासवर्ड विसरलात?')}</button>`}
  </form>
  <p class="tiny muted center">${T('समिती सदस्य आणि सर्व सभासद, दोघेही इथूनच लॉगिन करतात.')}</p>`;
}
function viewOnboard() {
  return `<div class="card stack"><b>${T('समिती सदस्य आहात?')}</b><p class="small muted m0">${T('तुमच्या सोसायटीची नोंद करा. तुम्हाला एक जॉइन कोड मिळेल, तो सभासदांना पाठवा.')}</p>
      <button class="btn primary block" type="button" data-act="create">${T('नवीन सोसायटी नोंदवा')}</button></div>
    <div class="card stack"><b>${T('सभासद आहात?')}</b><p class="small muted m0">${T('समितीकडून मिळालेला ६ अक्षरी जॉइन कोड टाका.')}</p>
      <form id="joinForm" class="stack"><div class="field"><label for="jCode">${T('जॉइन कोड')}</label><input id="jCode" type="text" required maxlength="6" autocapitalize="characters" placeholder="${T('उदा. K7MP2Q')}" style="text-transform:uppercase;letter-spacing:.15em"></div>
      <button class="btn block" type="submit">${T('पुढे')}</button></form></div>
    ${ownerCard()}
    <button class="btn block" type="button" data-act="signout">${T('लॉगआउट')}</button>
    <button class="link danger" type="button" data-act="delacct">${T('खाते हटवा')}</button>`;
}
function viewPending(name) {
  return `<div class="card stack"><b>${T('विनंती पाठवली आहे')}</b><p class="small muted m0">${T('{0} च्या समितीने मंजुरी दिल्यावर तुम्हाला तुमची थकबाकी, सूचना आणि तक्रारी इथे दिसतील. समितीला कळवा की तुम्ही नोंदणी केली आहे.', esc(name))}</p></div>
    <button class="btn block" type="button" data-act="leave">${T('विनंती रद्द करा')}</button><button class="btn block" type="button" data-act="signout">${T('लॉगआउट')}</button>`;
}
function viewGone(name) {
  return `<div class="card stack"><b>${T('प्रवेश नाही')}</b><p class="small muted m0">${T('तुम्ही आता {0} चे सदस्य नाही, किंवा समितीने विनंती नाकारली आहे.', esc(name))}</p></div>
    <button class="btn primary block" type="button" data-act="leave">${T('यादीतून काढा')}</button><button class="btn block" type="button" data-act="signout">${T('लॉगआउट')}</button>`;
}

/* ---------- admin views ---------- */
/* dashboard tiles: committee can show/hide and reorder them (saved on the society) */
const TILE_DEFS = {
  collection: { label: T('या महिन्याची वसुली'), wide: true },
  actions: { label: T('झटपट कामे'), wide: true },
  dues: { label: T('एकूण थकबाकी') },
  balance: { label: T('बँक शिल्लक') },
  funds: { label: T('वर्गणी'), wide: true },
  complaints: { label: T('तक्रारी') },
  members: { label: T('ॲपवरील सभासद') },
  announce: { label: T('ताजी घोषणा'), wide: true },
  committee: { label: T('समिती'), wide: true },
  agm: { label: T('वार्षिक सभा') },
  files: { label: T('फाइल्स') }
};
const DEFAULT_TILES = ['collection', 'dues', 'balance', 'funds', 'complaints', 'members', 'announce', 'committee', 'agm', 'files', 'actions'];
const dashCfg = () => (S.society && S.society.dashboard) || {};
const dashTiles = () => Array.isArray(dashCfg().tiles) ? dashCfg().tiles.filter(k => TILE_DEFS[k]) : DEFAULT_TILES;
const fundCollected = f => Object.values(f.paid || {}).reduce((a, p) => a + (Number(p.amount) || 0), 0);
const ring = (pct, size = 92) => { const r = size / 2 - 7, c = 2 * Math.PI * r; return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`; };
function tile(k) {
  const s = monthSummary(thisMonth), n = flats().length;
  switch (k) {
    case 'collection': {
      const pendFlats = new Set(S.claims.filter(c => c.status === 'pending' && !c.fundId).map(c => c.flatId));
      const paid = s.clear, pend = flats().filter(f => pendFlats.has(f.id) && dueFor(f.id, thisMonth) > 0).length, left = Math.max(0, s.dueFlats - pend);
      const exp = s.collected + s.dueTotal;
      return `<button class="card tile-card hero-tile wide btnlike" type="button" data-tab-go="ledger">
        <span class="kicker">${T('या महिन्याची वसुली')}</span><b class="num xl">${rs(s.collected)}</b><span class="small muted">${T('एकूण अपेक्षित {0} पैकी', rs(exp))}</span>
        <span class="segbar"><i style="flex:${paid || 0.0001};background:var(--butter)"></i><i style="flex:${pend || 0.0001};background:var(--mint)"></i><i style="flex:${left || 0.0001};background:rgba(255,255,255,.2)"></i></span>
        <span class="legend"><span><span class="d" style="background:var(--butter)"></span>${T('भरले')} <b>${paid}</b></span><span><span class="d" style="background:var(--mint)"></span>${T('मंजुरी')} <b>${pend}</b></span><span><span class="d" style="background:rgba(255,255,255,.45)"></span>${T('बाकी')} <b>${left}</b></span></span></button>`;
    }
    case 'actions': return `<div class="card wide"><span class="kicker">${T('झटपट कामे')}</span>${quickGrid()}</div>`;
    case 'dues': return `<button class="card tile-card btnlike" type="button" data-tab-go="ledger"><span class="kicker">${IC.alert}${T('थकबाकी')}</span><b class="num lg bad">${rs(s.dueTotal)}</b><span class="small muted">${T('{0} सदनिका', s.dueFlats)}</span></button>`;
    case 'balance': { const d = dashCfg(); return `<button class="card tile-card gold btnlike" type="button" data-act="dashcfg"><span class="kicker">${IC.bank}${T('बँक शिल्लक')}</span>${d.bank != null && d.bank !== '' ? `<b class="num lg">${rs(d.bank)}</b><span class="small muted">${d.fd ? `${T('मुदत ठेव')} ` + rs(d.fd) + ' · ' : ''}${d.asOf ? fmtDate(d.asOf) : ''}</span>` : `<b class="lg dim">—</b><span class="small gold">${T('शिल्लक भरा')} ›</span>`}</button>`; }
    case 'funds': {
      const open = S.funds.filter(f => f.status !== 'closed');
      if (!open.length) return `<button class="card tile-card wide btnlike row between" type="button" data-act="newfund"><span><span class="kicker">${T('वर्गणी')}</span><b>${T('सध्या कोणतीही वर्गणी सुरू नाही')}</b></span><span class="gold small">+ ${T('नवीन')}</span></button>`;
      return `<div class="card wide stack"><span class="kicker">${T('वर्गणी सुरू')} · ${open.length}</span>${open.slice(0, 3).map(fundRow).join('')}</div>`;
    }
    case 'complaints': { const o = S.complaints.filter(c => c.status !== 'closed').length; return `<button class="card tile-card btnlike" type="button" data-tab-go="complaints"><span class="kicker">${T('उघड्या तक्रारी')}</span><b class="num lg ${o ? 'warn' : ''}">${o}</b><span class="small muted">${T('एकूण')} ${S.complaints.length}</span></button>`; }
    case 'members': { const a = S.members.filter(m => m.status === 'active').length; return `<button class="card tile-card btnlike" type="button" data-tab-go="members"><span class="kicker">${T('ॲपवरील सभासद')}</span><b class="num lg">${a}<small class="muted"> / ${n}</small></b><span class="small muted">${T('जॉइन कोड')} ${esc(S.society.code)}</span></button>`; }
    case 'announce': { const m = S.messages[0]; return m ? `<button class="card tile-card wide btnlike" type="button" data-tab-go="messages"><span class="kicker">${T('ताजी घोषणा')} · ${ago(m.createdAt)}</span><span class="clamp">${esc(m.text)}</span></button>` : `<button class="card tile-card wide btnlike row between" type="button" data-act="newmsg"><span><span class="kicker">${T('घोषणा')}</span><b>${T('सर्व सभासदांना संदेश पाठवा')}</b></span><span class="gold small">+ ${T('नवीन')}</span></button>`; }
    case 'committee': { const c = committeeList(); return `<button class="card tile-card wide btnlike" type="button" data-tab-go="committee"><span class="kicker">${T('समिती')} · ${c.length}</span><div class="avatars">${c.slice(0, 7).map(x => `<span class="av sm">${esc(initials(x.name))}</span>`).join('')}</div></button>`; }
    case 'agm': { const y = now.getMonth() + 1 > 9 ? now.getFullYear() + 1 : now.getFullYear(), d = Math.ceil((new Date(y, 8, 30) - now) / DAY); return `<div class="card tile-card"><span class="kicker">${T('वार्षिक सभा')}</span><b class="num lg">${d}<small class="muted"> ${T('दिवस')}</small></b><span class="small muted">${T('३० सप्टेंबर {0} पूर्वी', y)}</span></div>`; }
    case 'files': return `<button class="card tile-card btnlike" type="button" data-tab-go="files"><span class="kicker">${T('फाइल्स')}</span><b class="num lg">${S.files.length}</b><span class="small muted">${T('नोंदी आणि कागदपत्रे')}</span></button>`;
  }
  return '';
}
function aHome() {
  const pc = S.claims.filter(c => c.status === 'pending'), pm = S.members.filter(m => m.status === 'pending');
  return `
    ${pageTitle(T('डॅशबोर्ड'), `${T('समिती')} · ${MONTHS[now.getMonth()]} ${now.getFullYear()}`)}
    ${planBanner(false)}
    ${!flats().length ? `<div class="card accent stack"><b>${T('पहिली पायरी: सदनिकांची यादी भरा')}</b><span class="small">${T('खाते आणि आठवणी सुरू करण्यासाठी सदनिका जोडा.')}</span><button class="btn primary" type="button" data-act="setup">${T('सदनिका जोडा')}</button></div>` : ''}
    ${pc.length ? `<h2>${T('मंजुरीसाठी भरणा')} · ${pc.length}</h2><ul class="list">${pc.map(c => `<li><span class="flat">${esc(c.flatId)}</span><span class="grow"><b class="num">${rs(c.amount)}</b><span class="tiny muted">${esc(c.name || '')} · ${c.fundId ? `${T('वर्गणी')}: ` + esc(c.fundTitle || '') : esc(rangeLabel(c.months || [c.month]))}${c.ref ? ' · UTR ' + esc(c.ref) : ''}</span></span><span class="row g6"><button class="btn small good" type="button" data-claim-ok="${c.id}">${T('मंजूर')}</button><button class="btn small ghost" type="button" data-claim-no="${c.id}" aria-label="${T('नाकारा')}">✕</button></span></li>`).join('')}</ul>` : ''}
    ${pm.length ? `<button class="card accent row between btnlike" type="button" data-tab-go="members"><b>${pm.length} ${T('नवीन सभासद विनंत्या')}</b><span class="gold">${T('पाहा')} ›</span></button>` : ''}
    <div class="dash">${dashTiles().map(tile).join('')}</div>
    <button class="btn ghost block" type="button" data-act="dashcfg">${IC.edit} ${T('डॅशबोर्ड बदला')}</button>`;
}

function aLedger() {
  const m = ledgerMonth, s = monthSummary(m);
  let rows = flats().map(f => ({ f, due: dueFor(f.id, m), pay: ((S.accounts[f.id] || {}).payments || {})[m] }));
  if (ledgerFilter === 'due') rows = rows.filter(r => r.due > 0);
  if (ledgerFilter === 'paid') rows = rows.filter(r => r.pay);
  return `${pageTitle(T('खाते'))}
    <div class="row between"><button class="btn small" type="button" data-month="-1" aria-label="${T('मागील महिना')}">‹</button><b>${monthName(m)}</b><button class="btn small" type="button" data-month="1" aria-label="${T('पुढील महिना')}" ${m >= thisMonth ? 'disabled' : ''}>›</button></div>
    <div class="grid2">
      <div class="card"><div class="tiny muted">${T('या महिन्यात जमा')}</div><b class="good num big">${rs(s.collected)}</b><div class="tiny muted">${T('{0} सदनिका', s.paidCount)}</div></div>
      <div class="card"><div class="tiny muted">${T('एकूण थकबाकी')}</div><b class="bad num big">${rs(s.dueTotal)}</b><div class="tiny muted">${T('{0} सदनिका', s.dueFlats)}</div></div>
    </div>
    <div class="chips" role="group" aria-label="${T('फिल्टर')}">${[['due', `${T('थकबाकी')} ${s.dueFlats}`], ['paid', `${T('या महिन्यात भरले')} ${s.paidCount}`], ['all', `${T('सर्व')} ${flats().length}`]].map(([k, l]) => `<button class="chip" type="button" data-lf="${k}" aria-pressed="${ledgerFilter === k}">${l}</button>`).join('')}</div>
    ${rows.length ? `<ul class="list">${rows.map(({ f, due, pay }) => `<li>
      <span class="flat">${esc(f.id)}</span>
      <span class="grow"><span>${esc(f.owner || '')}</span><span class="tiny muted">${pay ? `${T('भरले')} ${rs(pay.amount)} · ${esc(fmtDate(pay.date))} · ${esc(T(pay.mode))}` : due > 0 ? `${monthsDue(due)} ${plural(monthsDue(due))} ${T('बाकी')}` : T('थकबाकी नाही')}</span></span>
      ${due > 0 ? `<span class="pill due num">${rs(due)}</span>` : `<span class="pill ok">✓</span>`}
      ${pay ? `<button class="iconbtn" type="button" data-rcpt="${ledgerMonth}" data-rflat="${esc(f.id)}" aria-label="${T('पावती')}">${IC.receipt}</button>` : ''}<button class="btn small" type="button" data-pay="${esc(f.id)}">${pay ? T('बदला') : T('जमा')}</button></li>`).join('')}</ul>`
      : `<div class="card empty muted">${flats().length ? (ledgerFilter === 'due' ? T('कोणाचीही थकबाकी नाही.') : T('काही नोंदी नाहीत.')) : T('आधी सदस्य टॅबमधून सदनिका जोडा.')}</div>`}
    ${s.dueFlats ? `<button class="btn primary block" type="button" data-act="reminders">${IC.wa} ${T('{0} जणांना आठवण पाठवा', s.dueFlats)}</button>` : ''}
    <button class="btn ghost block" type="button" data-act="exportcsv">${IC.ledger} ${T('संपूर्ण हिशोब Excel मध्ये')}</button>`;
}

function aMembers() {
  const pend = S.members.filter(m => m.status === 'pending'), act = S.members.filter(m => m.status === 'active').sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1));
  const flatOpts = sel => `<option value="">${T('सदनिका निवडा')}</option>` + flats().map(f => `<option ${f.id === sel ? 'selected' : ''}>${esc(f.id)}</option>`).join('');
  return `
    <div class="card stack"><div class="row between wrap"><span>${T('जॉइन कोड')}</span><b class="code big">${esc(S.society.code)}</b></div>
      <span class="small muted">${T('सभासदांनी Sachiv ॲपमध्ये नवीन खाते तयार करून हा कोड टाकावा. नंतर तुम्ही खाली मंजुरी द्या.')}</span>
      <div class="grid2"><button class="btn" type="button" data-act="invite">${IC.share} ${T('WhatsApp आमंत्रण')}</button><button class="btn primary" type="button" data-act="poster">${IC.qr} ${T('QR पोस्टर')}</button></div></div>
    ${pend.length ? `<h2>${T('नवीन विनंत्या')} · ${pend.length}</h2><ul class="list">${pend.map(m => `<li class="req"><span class="grow"><b>${esc(m.name)}</b><span class="tiny muted ellip">${esc(m.email)}</span><span class="small">${T('सांगितलेली सदनिका')}: <b>${esc(m.flatId || '—')}</b></span></span>
        <span class="reqctl"><select class="sm" data-mflat="${m.id}" aria-label="${T('सदनिका')}">${flatOpts(flats().some(f => f.id === m.flatId) ? m.flatId : '')}</select><button class="btn small good" type="button" data-mok="${m.id}">${T('मंजूर')}</button><button class="btn small" type="button" data-mno="${m.id}" aria-label="${T('नाकारा')}">✕</button></span></li>`).join('')}</ul>` : ''}
    <h2>${T('सदस्य')} · ${act.length}</h2>
    <ul class="list">${act.map(m => `<li><span class="grow"><b>${esc(m.name)}${m.id === S.user.uid ? ` (${T('तुम्ही')})` : ''}</b><span class="tiny muted">${m.role === 'admin' ? T('समिती') : T('सभासद')} · ${T('सदनिका')} ${esc(m.flatId || '—')}</span></span>
      ${m.id === S.user.uid ? '' : `<button class="btn small" type="button" data-medit="${m.id}">${T('बदला')}</button>`}</li>`).join('')}</ul>
    <div class="card stack"><b>${T('सोसायटी आणि सदनिका')}</b><span class="small muted">${T('{0} सदनिका', flats().length)} · ${rs(monthly())} ${T('प्रति महिना')}${S.society.upi ? ' · UPI ' + esc(S.society.upi) : ` · ${T('UPI आयडी भरलेला नाही')}`}</span>
      <button class="btn primary" type="button" data-act="setup">${T('माहिती आणि सदनिका बदला')}</button></div>
`;
}

/* ---------- resident views ---------- */
const fundRow = f => {
  const got = fundCollected(f), cnt = Object.keys(f.paid || {}).length, tgt = Number(f.target) || (Number(f.perFlat) || 0) * flats().length;
  const pct = tgt ? Math.min(100, Math.round(got / tgt * 100)) : Math.round(cnt / Math.max(1, flats().length) * 100);
  const mine = S.member && S.member.flatId && (f.paid || {})[S.member.flatId];
  return `<button class="fundrow btnlike" type="button" data-fund="${f.id}"><span class="row between"><b>${esc(f.title)}</b><span class="num small">${rs(got)}${tgt ? ` <span class="muted">/ ${rs(tgt)}</span>` : ''}</span></span>
    <span class="bar"><i style="width:${pct}%"></i></span>
    <span class="row between tiny muted"><span>${T('{0} सदनिकांनी भरली', cnt)}${f.perFlat ? ` · ${T('{0} प्रति सदनिका', rs(f.perFlat))}` : ''}</span>${!isAdmin() && S.member.flatId ? (mine ? `<span class="good">✓ ${T('तुम्ही भरली')}</span>` : `<span class="pill go">${f.perFlat ? T('{0} भरा', rs(f.perFlat)) : T('भरा')}</span>`) : (f.due ? `<span>${T('{0} पर्यंत', fmtDate(f.due))}</span>` : '')}</span></button>`;
};
function rHome() {
  const f = flats().find(x => x.id === S.member.flatId);
  const openFunds = S.funds.filter(x => x.status !== 'closed');
  const imp = S.messages.find(m => m.pinned) || S.messages.find(m => m.important);
  const extra = `
    ${imp ? `<button class="card msg ${imp.important ? 'important' : ''} btnlike" type="button" data-tab-go="messages"><span class="kicker">${imp.pinned ? IC.pin + ' ' : ''}${imp.important ? T('महत्त्वाची घोषणा') : T('घोषणा')} · ${ago(imp.createdAt)}</span><span class="clamp">${esc(imp.text)}</span></button>` : ''}
    <div class="actions"><button type="button" data-tab-go="committee">${IC.badge}<span>${T('समिती')}</span></button><button type="button" data-tab-go="contacts">${IC.phone}<span>${T('संपर्क')}</span></button><button type="button" data-act="newcomplaint">${IC.chat}<span>${T('तक्रार')}</span></button><button type="button" data-tab-go="funds">${IC.coins}<span>${T('वर्गणी')}</span></button></div>
    ${openFunds.length ? `<h2>${T('वर्गणी')}</h2><div class="card stack">${openFunds.map(fundRow).join('')}</div>` : ''}`;
  if (!f) return `${pageTitle(`${T('नमस्कार')}, ` + esc((S.user.name || '').split(' ')[0]))}<div class="card stack"><b>${T('सदनिका जोडलेली नाही')}</b><span class="small muted">${T('समितीने तुमची सदनिका यादीत जोडल्यावर तुमची थकबाकी इथे दिसेल.')}</span></div>${extra}`;
  const P = (S.myAccount && S.myAccount.payments) || {}, due = dueFor(f.id, thisMonth, P), n = monthsDue(due);
  const pending = S.claims.filter(c => c.status === 'pending' && !c.fundId);
  const pendSum = pending.reduce((a, c) => a + Number(c.amount || 0), 0);
  const payable = Math.max(0, due - pendSum);
  const hist = Object.entries(P).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  return `
    ${pageTitle(`${T('नमस्कार')}, ` + esc((S.user.name || '').split(' ')[0]), `${T('सदनिका')} ` + esc(f.id))}
    ${(() => { const r = myReminder(); return r && r.at && payable > 0 && Date.now() - r.at < 45 * DAY ? `<button class="card remind row g10 btnlike" type="button" data-act="pay"><span class="mi">${IC.bell}</span><span class="grow"><b>${T('समितीकडून आठवण')}</b><span class="small">${T('{0} थकबाकी आहे. कृपया लवकर भरा.', rs(payable))}</span><span class="tiny muted">${ago(r.at)}${r.by ? ' · ' + esc(r.by) : ''}</span></span><span class="gold small b6">${T('भरा')} ›</span></button>` : ''; })()}
    <div class="card hero-card stack">
      <span class="kicker">${T('देखभाल शुल्क')}</span>
      ${due > 0 ? `<b class="num huge">${rs(due)}</b><span class="small muted">${T('थकबाकी')}${n > 1 ? ` · ${n} ${T('महिने')}` : ''} · ${rs(monthly())} ${T('दरमहा')}</span>` : `<b class="huge good">${T('सर्व भरलेले')} ✓</b><span class="small muted">${T('{0} पर्यंत कोणतीही थकबाकी नाही', MONTHS[now.getMonth()])}</span>`}
      ${pendSum ? `<span class="pill wait">${T('{0} समितीच्या मंजुरीसाठी', rs(pendSum))}</span>` : ''}
      ${S.society.upi ? `<div class="hbtns"><button class="btn primary" type="button" data-act="pay" data-amt="${payable || monthly()}">${payable > 0 ? T('UPI ने भरा') : T('आगाऊ भरा')}</button><button class="btn ghost" type="button" data-act="ipaid">${T('भरले? नोंद करा')}</button></div>` : `<span class="small muted">${T('समितीने अजून UPI आयडी जोडलेला नाही. समितीकडे थेट भरा.')}</span>`}
    </div>
    ${S.claims.filter(c => c.status !== 'pending').slice(0, 2).map(c => `<div class="card small row between"><span>${c.fundId ? esc(c.fundTitle || T('वर्गणी')) : esc(rangeLabel(c.months || [c.month]))} · ${rs(c.amount)}</span><span class="pill ${c.status === 'approved' ? 'ok' : 'due'}">${c.status === 'approved' ? T('मंजूर') : T('नाकारले')}</span></div>`).join('')}
    ${extra}
    <h2>${T('भरणा इतिहास')}</h2>
    ${hist.length ? `<ul class="list">${hist.map(([m, p]) => `<li><span class="grow"><b>${monthName(m)}</b><span class="tiny muted">${esc(fmtDate(p.date))} · ${esc(T(p.mode))}</span></span><span class="num b6">${rs(p.amount)}</span><button class="iconbtn" type="button" data-rcpt="${m}" aria-label="${T('पावती')}">${IC.receipt}</button></li>`).join('')}</ul>` : `<div class="card empty muted small">${T('अजून नोंद नाही.')}</div>`}`;
}
const latestNotice = () => { const n = S.notices[0]; return n ? `<button class="card btnlike stack" type="button" data-opennotice="${n.id}"><span class="tiny muted">${T('नवीन')} ${n.kind === 'minutes' ? T('इतिवृत्त') : T('सूचना')}</span><b>${esc(n.heading)}</b><span class="small clamp">${esc(n.body)}</span></button>` : ''; };
function vMe() {
  return `<div class="card row g16"><span class="av lg">${esc(initials(S.user.name))}</span><span class="grow"><b class="lg2">${esc(S.user.name)}</b><span class="small muted">${esc(S.user.email)}</span><span class="small">${isAdmin() ? T('समिती') : T('सभासद')} · ${T('सदनिका')} ${esc(S.member.flatId || '—')}</span></span></div>
    ${isAdmin() ? planBanner(true) : ''}
    ${S.society.upi ? `<div class="card small row between"><span class="muted">${T('संस्थेचा UPI आयडी')}</span><b>${esc(S.society.upi)}</b></div>` : ''}
    ${accountCard()}`;
}
const ownerCard = () => !isOwnerUser() ? '' : S.user.emailVerified
  ? `<button class="btn primary block" type="button" data-act="owner">${T('मालक पॅनेल')}</button>`
  : `<div class="card tint stack small"><b>${T('मालक पॅनेलसाठी ईमेल पडताळा')}</b><span>${T('तुमच्या ईमेलवर पडताळणी लिंक पाठवू. ती उघडल्यावर "पडताळले" दाबा.')}</span>
     <div class="grid2"><button class="btn" type="button" data-act="verify">${T('लिंक पाठवा')}</button><button class="btn" type="button" data-act="verified">${T('पडताळले')}</button></div></div>`;
const accountCard = () => `${ownerCard()}<div class="card stack"><b>${T('खाते')}</b><span class="small muted">${esc(S.user.email)}</span>
  <div class="grid2"><button class="btn" type="button" data-act="switch">${T('दुसरी सोसायटी')}</button><button class="btn" type="button" data-act="signout">${T('लॉगआउट')}</button></div>
  <button class="link danger" type="button" data-act="delacct">${T('खाते हटवा')}</button></div>`;

/* ---------- shared views ---------- */
function vNotices() {
  return `${isAdmin() ? `<div class="grid2"><button class="tile primary" type="button" data-act="newnotice">${IC.doc}<b>${T('नवीन सूचना')}</b><span>${T('पाणी, सभा, दुरुस्ती…')}</span></button><button class="tile" type="button" data-act="newminutes">${IC.doc}<b>${T('नवीन इतिवृत्त')}</b><span>${T('सभेचे ठराव')}</span></button></div>` : ''}
    <h2>${T('सूचना फलक')}</h2>
    ${S.notices.length ? `<ul class="list">${S.notices.map(n => `<li><span class="grow"><b>${esc(n.heading)}</b><span class="tiny muted">${n.kind === 'minutes' ? T('इतिवृत्त') : T('सूचना')} · ${esc(n.dateLine || '')}</span></span><button class="btn small" type="button" data-opennotice="${n.id}">${T('उघडा')}</button></li>`).join('')}</ul>` : `<div class="card empty muted">${T('अजून काही सूचना नाहीत.')}</div>`}`;
}
function vComplaints() {
  const list = S.complaints.filter(c => complaintFilter === 'all' || (complaintFilter === 'open' ? c.status !== 'closed' : c.status === 'closed'));
  const open = S.complaints.filter(c => c.status !== 'closed').length;
  return `<button class="btn primary block" type="button" data-act="newcomplaint">${T('नवीन तक्रार नोंदवा')}</button>
    <div class="chips">${[['open', `${T('उघड्या')} ${open}`], ['closed', `${T('सोडवलेल्या')} ${S.complaints.length - open}`], ['all', T('सर्व')]].map(([k, l]) => `<button class="chip" type="button" data-cf="${k}" aria-pressed="${complaintFilter === k}">${l}</button>`).join('')}</div>
    ${list.length ? `<ul class="list">${list.map(c => `<li><span class="flat">${esc(c.flatId || '—')}</span><span class="grow"><span>${esc(c.text)}</span><span class="tiny muted">${esc(c.name || '')} · ${esc(fmtDate(new Date(c.createdAt).toISOString().slice(0, 10)))}${c.status === 'closed' ? ` · ${T('सोडवली')}` : ''}</span></span>
      ${isAdmin() ? `<button class="btn small" type="button" data-ctoggle="${c.id}">${c.status === 'closed' ? T('पुन्हा उघडा') : T('सोडवली')}</button>` : `<span class="pill ${c.status === 'closed' ? 'ok' : 'wait'}">${c.status === 'closed' ? T('सोडवली') : T('उघडी')}</span>`}</li>`).join('')}</ul>` : `<div class="card empty muted">${T('इथे काही नाही.')}</div>`}`;
}

/* ---------- committee, contacts ---------- */
const POSTS = ['अध्यक्ष', 'उपाध्यक्ष', 'सचिव', 'सहसचिव', 'खजिनदार', 'सहखजिनदार', 'सदस्य', 'सदस्य', 'सदस्य', 'सदस्य', 'सदस्य', 'सदस्य'];
const POST_OPTIONS = ['अध्यक्ष', 'उपाध्यक्ष', 'सचिव', 'सहसचिव', 'खजिनदार', 'सहखजिनदार', 'सदस्य', 'स्वीकृत सदस्य', 'महिला प्रतिनिधी'];
const KEY_POSTS = ['अध्यक्ष', 'सचिव', 'खजिनदार'];
const committeeList = () => ((S.society && S.society.committee) || []).filter(c => c && c.name);
const CONTACT_CATS = ['आपत्कालीन', 'सोसायटी', 'सेवा', 'जवळपास'];
const DEFAULT_CONTACTS = [
  { cat: 'आपत्कालीन', label: 'आपत्कालीन मदत', name: 'Emergency', phone: '112' },
  { cat: 'आपत्कालीन', label: 'पोलीस', name: '', phone: '100' },
  { cat: 'आपत्कालीन', label: 'अग्निशमन दल', name: '', phone: '101' },
  { cat: 'आपत्कालीन', label: 'रुग्णवाहिका', name: '', phone: '108' },
  { cat: 'आपत्कालीन', label: 'महिला हेल्पलाइन', name: '', phone: '1091' }
];
const contactsList = () => (S.society && Array.isArray(S.society.contacts)) ? S.society.contacts.filter(c => c && c.phone) : DEFAULT_CONTACTS;
const waBtn = (phone, label) => phone ? `<button class="iconbtn" type="button" data-wa-to="${esc(phone)}" aria-label="WhatsApp ${esc(label || '')}">${IC.wa}</button>` : '';

function vCommittee() {
  const list = committeeList();
  const key = list.filter(c => KEY_POSTS.includes(canon(c.post))), rest = list.filter(c => !KEY_POSTS.includes(canon(c.post)));
  const person = (c, big) => `<div class="card person ${big ? 'big' : ''}"><span class="av ${big ? 'lg' : ''}">${esc(initials(c.name))}</span>
    <span class="grow"><span class="post">${esc(T(c.post || 'सदस्य'))}</span><b>${esc(c.name)}</b><span class="tiny muted">${c.flatId ? `${T('सदनिका')} ` + esc(c.flatId) : ''}</span></span>
    <span class="row g6">${telBtn(c.phone, c.name)}${waBtn(c.phone, c.name)}</span></div>`;
  return `${isAdmin() ? `<button class="btn ghost block" type="button" data-act="editcommittee">${IC.edit} ${T('समिती सदस्य बदला')}</button>` : ''}
    ${list.length ? `${key.map(c => person(c, true)).join('')}${rest.length ? `<h2>${T('इतर सदस्य')} · ${rest.length}</h2>${rest.map(c => person(c, false)).join('')}` : ''}`
      : `<div class="card empty muted">${isAdmin() ? T('अजून समिती भरलेली नाही. वरील बटणाने १२ सदस्य जोडा.') : T('समितीने अजून माहिती भरलेली नाही.')}</div>`}`;
}
function vContacts() {
  const list = contactsList();
  return `${isAdmin() ? `<button class="btn ghost block" type="button" data-act="editcontacts">${IC.edit} ${T('संपर्क बदला')}</button>` : ''}
    ${CONTACT_CATS.map(cat => { const l = list.filter(c => canon(c.cat || 'सेवा') === cat); return l.length ? `<h2>${T(cat)}</h2><ul class="list">${l.map(c => `<li><span class="grow"><b>${esc(T(c.label))}</b><span class="tiny muted">${esc([c.name, c.phone].filter(Boolean).join(' · '))}</span></span>${telBtn(c.phone, c.label)}</li>`).join('')}</ul>` : ''; }).join('')}`;
}

/* ---------- quick actions (centre + button) ---------- */
const QUICK_ADMIN = [['act:newmsg', 'mega', 'घोषणा'], ['act:newnotice', 'doc', 'सूचना'], ['act:newminutes', 'doc', 'इतिवृत्त'], ['act:reminders', 'wa', 'आठवण'],
  ['act:newfund', 'coins', 'वर्गणी'], ['act:upload', 'folder', 'फाइल'], ['tab:committee', 'badge', 'समिती'], ['act:poster', 'qr', 'QR पोस्टर']];
const QUICK_RES = [['act:pay', 'rupee', 'देखभाल भरा'], ['act:ipaid', 'ledger', 'भरले? नोंद करा'], ['act:newcomplaint', 'chat', 'तक्रार नोंदवा'], ['tab:funds', 'coins', 'वर्गणी'],
  ['tab:contacts', 'phone', 'संपर्क'], ['tab:committee', 'badge', 'समिती'], ['tab:files', 'folder', 'फाइल्स'], ['tab:messages', 'mega', 'संदेश']];
const quickGrid = () => `<div class="actions">${(isAdmin() ? QUICK_ADMIN : QUICK_RES).map(([k, ic, l]) => { const [t, v] = k.split(':'); return `<button type="button" ${t === 'act' ? `data-act="${v}"` : `data-tab-go="${v}"`}>${IC[ic]}<span>${T(l)}</span></button>`; }).join('')}</div>`;
function sheetQuick() {
  openSheet(`${sheetHead(T('झटपट कामे'))}${quickGrid()}`, el => {
    el.querySelector('.actions').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      closeSheet();
      const proxy = document.createElement('button'); Object.assign(proxy.dataset, b.dataset); proxy.hidden = true; document.body.append(proxy); proxy.click(); proxy.remove();
    });
  });
}

/* ---------- funds (वर्गणी) ---------- */
function vFunds() {
  const open = S.funds.filter(f => f.status !== 'closed'), closed = S.funds.filter(f => f.status === 'closed');
  return `${isAdmin() ? `<button class="btn primary block" type="button" data-act="newfund">${IC.plus} ${T('नवीन वर्गणी')}</button>` : ''}
    ${open.length ? `<div class="card stack"><span class="kicker">${T('सुरू')}</span>${open.map(fundRow).join('')}</div>` : `<div class="card empty muted">${T('सध्या कोणतीही वर्गणी सुरू नाही.')}</div>`}
    ${closed.length ? `<div class="card stack"><span class="kicker">${T('बंद')}</span>${closed.map(fundRow).join('')}</div>` : ''}`;
}

/* ---------- messages ---------- */
function vMessages() {
  const list = [...S.messages].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
  const seg = `<div class="seg" role="group" aria-label="${T('प्रकार')}"><button class="chip" type="button" data-mseg="ann" aria-pressed="${msgSeg === 'ann'}">${T('घोषणा')} · ${S.messages.length}</button><button class="chip" type="button" data-mseg="notice" aria-pressed="${msgSeg === 'notice'}">${T('सूचना पत्रे')} · ${S.notices.length}</button></div>`;
  if (msgSeg === 'notice') return `${pageTitle(T('संदेश'))}${seg}${vNotices()}`;
  return `${pageTitle(T('संदेश'))}${seg}
    ${isAdmin() ? `<button class="btn primary block" type="button" data-act="newmsg">${IC.mega} ${T('नवीन घोषणा')}</button>` : ''}
    ${list.length ? list.map(m => `<article class="card msg ${m.important ? 'important' : ''}">
      <div class="row between"><span class="kicker">${m.pinned ? IC.pin + ' ' : ''}${esc(m.by || T('समिती'))}${m.byPost ? ' · ' + esc(T(m.byPost)) : ''}</span><span class="tiny muted">${ago(m.createdAt)}</span></div>
      ${m.important ? `<span class="tag">${T('महत्त्वाचे')}</span>` : ''}
      <p class="msgtext">${esc(m.text)}</p>
      <div class="row g6 msgacts"><button class="btn small ghost" type="button" data-msgwa="${m.id}">${IC.wa} ${T('पाठवा')}</button>${isAdmin() ? `<button class="btn small ghost" type="button" data-msgpin="${m.id}">${IC.pin} ${m.pinned ? T('काढा') : T('वर ठेवा')}</button><button class="btn small ghost danger" type="button" data-msgdel="${m.id}">${T('हटवा')}</button>` : ''}</div>
    </article>`).join('') : `<div class="card empty muted">${T('अजून कोणतीही घोषणा नाही.')}</div>`}`;
}

/* ---------- files ---------- */
const FOLDERS = ['नियम व उपविधी', 'लेखापरीक्षण', 'इतिवृत्त', 'बिले व पावत्या', 'करार व परवाने', 'इतर'];
const fileKind = f => /pdf/.test(f.mime) ? 'PDF' : /^image\//.test(f.mime) ? 'IMG' : /sheet|excel|csv/.test(f.mime) ? 'XLS' : /word|document/.test(f.mime) ? 'DOC' : 'FILE';
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
function vFiles() {
  const list = S.files.filter(f => fileFolder === 'all' || canon(f.folder) === fileFolder);
  return `${pageTitle(T('फाइल्स'))}
    ${isAdmin() ? `<div class="grid2"><button class="btn primary" type="button" data-act="upload">${IC.plus} ${T('फाइल जोडा')}</button><button class="btn ghost" type="button" data-act="exportcsv">${IC.ledger} ${T('हिशोब (Excel)')}</button></div>` : ''}
    <div class="chips scroll" role="group" aria-label="${T('फोल्डर')}"><button class="chip" type="button" data-folder="all" aria-pressed="${fileFolder === 'all'}">${T('सर्व')} · ${S.files.length}</button>${FOLDERS.map(fo => { const c = S.files.filter(f => canon(f.folder) === fo).length; return c || isAdmin() ? `<button class="chip" type="button" data-folder="${fo}" aria-pressed="${fileFolder === fo}">${T(fo)}${c ? ' · ' + c : ''}</button>` : ''; }).join('')}</div>
    ${list.length ? `<ul class="list">${list.map(f => `<li><span class="fic ${fileKind(f).toLowerCase()}">${fileKind(f)}</span><span class="grow"><b class="ellip">${esc(f.name)}</b><span class="tiny muted">${esc(T(f.folder || 'इतर'))} · ${fmtSize(f.size || 0)} · ${fmtTs(f.createdAt)}${f.visibility === 'committee' ? ` · ${T('फक्त समिती')}` : ''}</span></span>
      <button class="btn small ghost" type="button" data-file="${f.id}">${T('उघडा')}</button></li>`).join('')}</ul>` : `<div class="card empty muted">${isAdmin() ? T('अजून फाइल नाही. उपविधी, लेखापरीक्षण अहवाल, बिले इथे जोडा.') : T('अजून कोणतीही फाइल नाही.')}</div>`}`;
}

/* ---------- more ---------- */
function vMore() {
  const items = [
    ['committee', IC.badge, T('समिती'), `${T('{0} सदस्य', committeeList().length)}`],
    ['contacts', IC.phone, T('महत्त्वाचे संपर्क'), `${contactsList().length} ${T('क्रमांक')}`],
    ['funds', IC.coins, T('वर्गणी'), `${S.funds.filter(f => f.status !== 'closed').length} ${T('सुरू')}`],
    ['complaints', IC.chat, T('तक्रारी'), `${S.complaints.filter(c => c.status !== 'closed').length} ${T('उघड्या')}`],
    ...(isAdmin() ? [['files', IC.folder, T('फाइल्स'), T('नोंदी आणि कागदपत्रे')]] : []),
    ...(isAdmin() ? [['members', IC.people, T('सभासद व मंजुरी'), `${S.members.filter(m => m.status === 'pending').length} ${T('प्रलंबित')}`]] : []),
    ['me', IC.user, T('माझे खाते'), esc(S.user.email)]
  ];
  const langRow = `<div class="card stack"><span class="kicker">${T('भाषा')} · Language</span>${langChips()}</div>`;
  return `${pageTitle(T('अधिक'))}<div class="morelist">${items.map(([k, ic, t, sub]) => `<button class="card morerow btnlike" type="button" data-tab="${k}"><span class="mi">${ic}</span><span class="grow"><b>${t}</b><span class="tiny muted ellip">${sub}</span></span>${IC.chev}</button>`).join('')}
    ${isAdmin() ? `<button class="card morerow btnlike" type="button" data-act="poster"><span class="mi">${IC.qr}</span><span class="grow"><b>${T('सोसायटी QR पोस्टर')}</b><span class="tiny muted">${T('छापून सूचना फलकावर लावा')}</span></span>${IC.chev}</button>` : ''}
    ${isAdmin() ? `<button class="card morerow btnlike" type="button" data-act="setup"><span class="mi">${IC.gear}</span><span class="grow"><b>${T('सोसायटी माहिती व सदनिका')}</b><span class="tiny muted">${T('{0} सदनिका', flats().length)} · ${rs(monthly())} ${T('दरमहा')}</span></span>${IC.chev}</button>` : ''}</div>${langRow}`;
}

/* ---------- sheets ---------- */
let sheetCleanup = null;
function openSheet(html, mount) {
  if (sheetCleanup) { try { sheetCleanup(); } catch (e) {} sheetCleanup = null; }
  const root = $('#sheetRoot');
  root.innerHTML = `<div class="sheet-wrap"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const wrap = root.firstElementChild;
  wrap.addEventListener('click', e => { if (e.target === wrap) closeSheet(); });
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeSheet));
  if (mount) { const r = mount(wrap.firstElementChild); if (typeof r === 'function') sheetCleanup = r; }
}
const closeSheet = () => { if (sheetCleanup) { try { sheetCleanup(); } catch (e) {} sheetCleanup = null; } $('#sheetRoot').innerHTML = ''; };
const sheetHead = t => `<div class="row between"><h3>${t}</h3><button class="btn small" type="button" data-close>${T('बंद')}</button></div>`;

function sheetSetup(isNew) {
  const p = isNew ? { startMonth: thisMonth } : S.society;
  const flatsText = (p.flats || []).map(f => [f.id, f.owner, f.phone].concat(f.opening ? [f.opening] : []).join(', ')).join('\n');
  openSheet(`${sheetHead(isNew ? T('नवीन सोसायटी') : T('सोसायटीची माहिती'))}
    <form id="setupForm" class="stack">
      <div class="field"><label for="sName">${T('सोसायटीचे पूर्ण नाव')}</label><input type="text" id="sName" required value="${esc(p.name || '')}" placeholder="……… ${T('सहकारी गृहनिर्माण संस्था मर्या.')}"></div>
      <div class="field"><label for="sAddr">${T('पत्ता')}</label><input type="text" id="sAddr" value="${esc(p.address || '')}" placeholder="${T('उदा. वडगाव बुद्रुक, पुणे')}"></div>
      <div class="grid2"><div class="field"><label for="sReg">${T('नोंदणी क्रमांक')}</label><input type="text" id="sReg" value="${esc(p.regNo || '')}"></div>
      <div class="field"><label for="sMonthly">${T('मासिक शुल्क (₹)')}</label><input type="number" id="sMonthly" min="0" inputmode="numeric" required value="${esc(p.monthly || '')}"></div></div>
      <details class="card rcinfo"${p.nameEn || p.contact || p.rcptPrefix ? ' open' : ''}><summary><b>${T('पावतीवरील माहिती')}</b> <span class="hint">(${T('ऐच्छिक')})</span></summary><div class="stack" style="margin-top:10px">
        <div class="field"><label for="sNameEn">${T('सोसायटीचे इंग्रजी नाव')}</label><input type="text" id="sNameEn" value="${esc(p.nameEn || '')}" placeholder="${T('उदा. Krishnakunj Residency')}"></div>
        <div class="grid2"><div class="field"><label for="sContact">${T('ईमेल / फोन')}</label><input type="text" id="sContact" value="${esc(p.contact || '')}" autocapitalize="off"></div>
        <div class="field"><label for="sPrefix">${T('पावती क्रमांकाची सुरुवात')}</label><input type="text" id="sPrefix" maxlength="8" value="${esc(p.rcptPrefix || '')}" placeholder="${T('उदा. KKR')}" autocapitalize="characters"></div></div>
      </div></details>
      <div class="field"><label for="sUpi">${T('संस्थेचा UPI आयडी')} <span class="hint">(${T('सभासद यावर थेट भरतील')})</span><span class="tiny muted" style="display:block">${T('टीप: बिझनेस UPI (GPay for Business, PhonePe Business, Paytm Business) वापरल्यास सभासद ॲपमधून थेट भरू शकतात. वैयक्तिक UPI आयडीवर QR स्कॅन करून भरावे लागते.')}</span></label><input type="text" id="sUpi" value="${esc(p.upi || '')}" placeholder="${T('उदा. societyname')}@okaxis" autocapitalize="off"><label class="row g10 small" style="margin-top:6px"><input type="checkbox" id="sUpiBiz" ${p.upiBiz ? 'checked' : ''}> ${T('हा बिझनेस / मर्चंट UPI आहे (ॲपमधून थेट भरणा चालू करा)')}</label></div>
      <div class="grid2"><div class="field"><label for="sStart">${T('खाते कोणत्या महिन्यापासून')}</label><input type="month" id="sStart" value="${esc(p.startMonth || thisMonth)}"></div>
      ${isNew ? `<div class="field"><label for="sMy">${T('तुमची सदनिका')}</label><input type="text" id="sMy" placeholder="${T('उदा. A-101')}"></div>` : '<div></div>'}</div>
      <div class="field"><label for="sFlats">${T('सदनिका यादी')} <span class="hint">(${T('एका ओळीत एक: सदनिका, मालकाचे नाव, फोन, जुनी थकबाकी. Excel मधून पेस्ट करू शकता.')})</span></label>
        <textarea id="sFlats" rows="8" placeholder="${T('A-101, श्री. पाटील, 9876543210')}&#${T('10;A-102, सौ. जोशी, 9822012345, 3000')}">${esc(flatsText)}</textarea></div>
      <button class="btn primary block" type="submit">${isNew ? T('सोसायटी तयार करा') : T('जतन करा')}</button>
    </form>`, el => {
    el.querySelector('#setupForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.submitter || el.querySelector('[type=submit]'); btn.disabled = true;
      const fl = el.querySelector('#sFlats').value.split('\n').map(l => l.split(/[,\t]/).map(x => x.trim())).filter(a => a[0])
        .map(a => ({ id: a[0].replace(/[\/\s]+/g, '-').toUpperCase(), owner: a[1] || '', phone: a[2] || '', opening: Number(String(a[3] || '').replace(/[^\d.]/g, '')) || 0 }));
      const seen = new Set(), dup = fl.find(f => seen.has(f.id) || !seen.add(f.id));
      if (dup) { toast(T('सदनिका {0} दोनदा आहे.', dup.id)); btn.disabled = false; return; }
      const data = { name: el.querySelector('#sName').value.trim(), address: el.querySelector('#sAddr').value.trim(), regNo: el.querySelector('#sReg').value.trim(), monthly: Number(el.querySelector('#sMonthly').value) || 0, upi: el.querySelector('#sUpi').value.trim(), upiBiz: el.querySelector('#sUpiBiz').checked, nameEn: el.querySelector('#sNameEn').value.trim(), contact: el.querySelector('#sContact').value.trim(), rcptPrefix: el.querySelector('#sPrefix').value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, ''), startMonth: el.querySelector('#sStart').value || thisMonth, flats: fl };
      try {
        if (isNew) { data.myFlat = (el.querySelector('#sMy').value || '').trim().toUpperCase(); const sid = await B.createSociety(S.user, data); closeSheet(); selectSociety(sid); toast(T('सोसायटी तयार झाली. आता जॉइन कोड सभासदांना पाठवा.')); }
        else { await B.updateSociety(S.sid, data); closeSheet(); toast(T('माहिती जतन झाली.')); }
      } catch (er) { fail(er); btn.disabled = false; }
    });
  });
}

function sheetPay(flatId) {
  const f = flats().find(x => x.id === flatId), m = ledgerMonth, pay = ((S.accounts[flatId] || {}).payments || {})[m], due = dueFor(flatId, m);
  openSheet(`${sheetHead(`${T('सदनिका')} ${esc(flatId)} · ${monthName(m)}`)}
    <div class="small muted">${esc(f.owner || '')}${due || pay ? ` · ${T('थकबाकी')} ${rs(due + (pay ? Number(pay.amount) : 0))}` : ''}</div>
    <form id="payForm" class="stack">
      <div class="grid2"><div class="field"><label for="pAmt">${T('रक्कम (₹)')}</label><input type="number" id="pAmt" min="0" inputmode="numeric" required value="${esc(pay ? pay.amount : (due || monthly()))}"></div>
      <div class="field"><label for="pDate">${T('दिनांक')}</label><input type="date" id="pDate" required value="${esc(pay ? pay.date : today)}"></div></div>
      ${pay ? '' : `<div class="field"><label for="pN">${T('किती महिने')}</label><select id="pN">${ALLN.map(n => `<option value="${n}">${nLabel(n)}</option>`).join('')}</select><span class="tiny muted" id="pRange">${esc(rangeLabel([m]))}</span></div>`}
      <div class="grid2"><div class="field"><label for="pMode">${T('कसे भरले')}</label><select id="pMode">${['UPI', 'रोख', 'चेक', 'बँक ट्रान्सफर'].map(x => `<option value="${x}" ${pay && canon(pay.mode) === x ? 'selected' : ''}>${T(x)}</option>`).join('')}</select></div>
      <div class="field"><label for="pRef">${T('संदर्भ क्र.')} <span class="hint">(${T('ऐच्छिक')})</span></label><input type="text" id="pRef" value="${esc(pay && pay.ref || '')}"></div></div>
      <button class="btn primary block" type="submit">${T('जमा नोंदवा')}</button>
      ${pay ? `<button class="btn block danger" type="button" id="pDel">${T('ही नोंद काढा')}</button>` : ''}
    </form>`, el => {
    const pN = el.querySelector('#pN');
    if (pN) pN.addEventListener('change', () => { const n = +pN.value; el.querySelector('#pRange').textContent = rangeLabel(monthsFrom(m, n)); el.querySelector('#pAmt').value = n === 1 ? (due || monthly()) : n * monthly(); });
    el.querySelector('#payForm').addEventListener('submit', async e => {
      e.preventDefault();
      const rec = { amount: Number(el.querySelector('#pAmt').value) || 0, date: el.querySelector('#pDate').value, mode: el.querySelector('#pMode').value, ref: el.querySelector('#pRef').value.trim(), at: Date.now(), by: S.user.name };
      const n = pN ? +pN.value : 1;
      const sb = e.submitter || el.querySelector('[type=submit]'); if (sb) sb.disabled = true;
      try {
        rec.no = (n === 1 && pay && pay.no) || await newRcptNo(rec.date);
        if (n > 1) { const ms = monthsFrom(m, n), map = allocate(flatId, ms, rec.amount, { date: rec.date, mode: rec.mode, ref: rec.ref, at: rec.at, by: rec.by, no: rec.no }); await B.setPayments(S.sid, flatId, map); toast(`${T('सदनिका')} ${flatId}: ${rs(rec.amount)} ${T('जमा नोंदवले.')}`); openReceipt(maintReceipt(flatId, ms[0], map[ms[0]])); }
        else { await B.setPayment(S.sid, flatId, m, rec); toast(`${T('सदनिका')} ${flatId}: ${rs(rec.amount)} ${T('जमा नोंदवले.')}`); openReceipt(maintReceipt(flatId, m, rec)); }
      } catch (er) { fail(er); if (sb) sb.disabled = false; }
    });
    const del = el.querySelector('#pDel');
    if (del) del.addEventListener('click', async () => { try { await B.setPayment(S.sid, flatId, m, null); closeSheet(); toast(T('नोंद काढली.')); } catch (er) { fail(er); } });
  });
}

function sheetReminders() {
  const rows = flats().map(f => ({ f, due: dueFor(f.id, ledgerMonth) })).filter(r => r.due > 0);
  const picked = new Set(rows.map((r, i) => i));
  const lastRem = id => { const r = (S.accounts[id] || {}).reminder; return r && r.at ? ago(r.at) : ''; };
  openSheet(`${sheetHead(`${T('थकबाकी आठवण')} · ${rows.length}`)}
    ${rows.length ? `<p class="small muted m0">${T('सभासद निवडा. ॲपमधील आठवण सर्वांना एकदम जाते; WhatsApp एकेक करून उघडते.')}</p>
    <label class="row g10 selall"><input type="checkbox" id="rAll" checked> <b>${T('सर्व निवडा')}</b> <span class="muted small" id="rCnt"></span></label>
    <ul class="list remlist">${rows.map(({ f, due }, i) => `<li><label class="row g10 grow"><input type="checkbox" data-pick="${i}" checked><span class="flat">${esc(f.id)}</span><span class="grow"><span>${esc(f.owner || '')}</span><span class="tiny muted num">${esc(f.phone || T('फोन नाही'))} · ${rs(due)}${lastRem(f.id) ? ` · ${T('आठवण')} ${lastRem(f.id)}` : ''}</span></span></label>
      <span class="row g6"><button class="iconbtn" type="button" data-wa="${i}" aria-label="WhatsApp">${IC.wa}</button><button class="iconbtn" type="button" data-cp="${i}" aria-label="${T('संदेश कॉपी करा')}">${IC.copy}</button></span></li>`).join('')}</ul>
    <div class="stickyacts stack"><button class="btn primary block" type="button" id="rApp">${IC.bell} <span id="rAppL"></span></button>
    <button class="btn good block" type="button" id="rWa">${IC.wa} <span id="rWaL"></span></button></div>` : `<div class="card empty muted">${T('कोणाचीही थकबाकी नाही.')}</div>`}`, el => {
    if (!rows.length) return;
    let waQueue = null;
    const sel = () => rows.filter((r, i) => picked.has(i));
    const upd = () => {
      const n = picked.size; el.querySelector('#rCnt').textContent = `(${n}/${rows.length})`; el.querySelector('#rAll').checked = n === rows.length;
      el.querySelector('#rAppL').textContent = T('ॲपमध्ये आठवण पाठवा ({0})', n);
      el.querySelector('#rWaL').textContent = waQueue && waQueue.length ? T('पुढील WhatsApp: {0} ({1} बाकी)', waQueue[0].f.id, waQueue.length) : T('WhatsApp वर एकेक पाठवा ({0})', n);
      el.querySelector('#rApp').disabled = el.querySelector('#rWa').disabled = !n;
    };
    el.querySelector('#rAll').addEventListener('change', e => { picked.clear(); if (e.target.checked) rows.forEach((r, i) => picked.add(i)); el.querySelectorAll('[data-pick]').forEach(c => c.checked = e.target.checked); waQueue = null; upd(); });
    el.querySelectorAll('[data-pick]').forEach(c => c.addEventListener('change', () => { c.checked ? picked.add(+c.dataset.pick) : picked.delete(+c.dataset.pick); waQueue = null; upd(); }));
    el.querySelectorAll('[data-wa]').forEach(b => b.addEventListener('click', () => { const r = rows[+b.dataset.wa]; openExternal(waLink(r.f.phone, reminderText(r.f, r.due))); }));
    el.querySelectorAll('[data-cp]').forEach(b => b.addEventListener('click', async () => { const r = rows[+b.dataset.cp]; toast(await copyText(reminderText(r.f, r.due)) ? T('संदेश कॉपी झाला.') : T('कॉपी होऊ शकला नाही.')); }));
    el.querySelector('#rApp').addEventListener('click', async e => {
      const list = sel(); if (!list.length) return; e.currentTarget.disabled = true;
      try {
        const at = Date.now();
        await Promise.all(list.map(r => B.setReminder(S.sid, r.f.id, { at, amount: r.due, month: ledgerMonth, by: S.user.name })));
        toast(T('{0} सदनिकांना ॲपमध्ये आठवण पाठवली.', list.length));
      } catch (er) { fail(er); }
      upd();
    });
    el.querySelector('#rWa').addEventListener('click', () => {
      if (!waQueue || !waQueue.length) waQueue = sel();
      const r = waQueue.shift(); if (r) openExternal(waLink(r.f.phone, reminderText(r.f, r.due)));
      upd();
    });
    upd();
  });
}

function sheetPayChoice() {
  const flatId = S.member.flatId; if (!flatId || !S.society.upi) { toast(T('समितीने अजून UPI आयडी जोडलेला नाही. समितीकडे थेट भरा.')); return; }
  const P = (S.accounts[flatId] || {}).payments || {}, due = dueFor(flatId, thisMonth, P);
  const pendSum = S.claims.filter(c => c.status === 'pending' && !c.fundId).reduce((a, c) => a + Number(c.amount || 0), 0);
  const opts = [];
  const payable = Math.max(0, due - pendSum);
  if (payable > 0) { const ms = nextUnpaid(flatId, Math.max(1, monthsDue(payable)), P).filter(m => m <= thisMonth); opts.push({ key: 'due', label: T('संपूर्ण थकबाकी'), months: ms.length ? ms : [thisMonth], amount: payable }); }
  for (const n of PERIODS) { const ms = nextUnpaid(flatId, n, P); opts.push({ key: String(n), label: n === 12 ? T('1 वर्ष') : n === 1 ? T('1 महिना') : T('{0} महिने', n), months: ms, amount: n * monthly() }); }
  let cn = 4;
  const custom = { key: 'custom', label: T('इतर महिने'), months: nextUnpaid(flatId, cn, P), amount: cn * monthly() };
  opts.push(custom);
  let sel = opts[0];
  const ci = opts.length - 1;
  openSheet(`${sheetHead(T('किती महिन्यांचे भरायचे?'))}
    <div class="periods">${opts.map((o, i) => i === ci ? `<div class="period custom" data-opt="${i}" role="button" tabindex="0" aria-pressed="false"><span class="grow"><b>${o.label}</b><span class="tiny muted" id="cmR">${esc(rangeLabel(o.months))}</span></span>
      <span class="stepper"><button type="button" class="stp" data-cm="-1" aria-label="${T('कमी')}">−</button><b class="num" id="cmN">${cn}</b><button type="button" class="stp" data-cm="1" aria-label="${T('जास्त')}">+</button></span><b class="num" id="cmA">${rs(o.amount)}</b></div>`
      : `<button type="button" class="period" data-opt="${i}" aria-pressed="${i === 0}"><span class="grow"><b>${o.label}</b><span class="tiny muted">${esc(rangeLabel(o.months))}</span></span><b class="num">${rs(o.amount)}</b></button>`).join('')}</div>
    <button class="btn primary block" type="button" id="pcPay"></button>
    <button class="link" type="button" id="pcDone">${T('आधीच भरले? नोंद करा')}</button>`, el => {
    const btn = el.querySelector('#pcPay');
    const upd = () => { btn.textContent = T('{0} UPI ने भरा', rs(sel.amount)); };
    upd();
    el.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => { sel = opts[+b.dataset.opt]; el.querySelectorAll('[data-opt]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); upd(); }));
    el.querySelectorAll('[data-cm]').forEach(b => b.addEventListener('click', () => {
      cn = Math.min(MAXN, Math.max(1, cn + +b.dataset.cm));
      custom.months = nextUnpaid(flatId, cn, P); custom.amount = cn * monthly();
      el.querySelector('#cmN').textContent = cn; el.querySelector('#cmA').textContent = rs(custom.amount); el.querySelector('#cmR').textContent = rangeLabel(custom.months);
    }));
    btn.addEventListener('click', () => {
      const m = sel;
      sheetUpiPay(m.amount, `Maint ${flatId} ${m.months[0] || thisMonth}${m.months.length > 1 ? ' +' + (m.months.length - 1) : ''}`, () => sheetIPaid(m.amount, null, m.months));
    });
    el.querySelector('#pcDone').addEventListener('click', () => sheetIPaid(sel.amount, null, sel.months));
  });
}

// Paying the society by UPI. Many UPI apps block app-opened payments to a personal UPI ID
// ("bank limit exceeded"), so the QR code and copy buttons are the main way; the direct button
// works best when the society uses a business/merchant UPI ID.
function sheetUpiPay(amount, note, onDone) {
  const link = upiLink({ upi: S.society.upi, name: S.society.nameEn || S.society.name, amount, note });
  openSheet(`${sheetHead(T('{0} भरा', rs(amount)))}
    <div class="upiqr"><canvas id="uqC" width="560" height="560" aria-label="UPI QR"></canvas><span class="small muted">${esc(S.society.name)}</span></div>
    <ol class="small upisteps"><li>${T('खालील बटणाने QR गॅलरीत सेव्ह करा.')}</li><li>${T('GPay / PhonePe / Paytm उघडा → Scan → गॅलरीमधून हा QR निवडा.')}</li><li>${T('रक्कम आधीच भरलेली असेल. पैसे पाठवा.')}</li></ol>
    <p class="tiny muted m0">${T('किंवा UPI आयडी कॉपी करा → UPI ॲपमध्ये "UPI ID ने पाठवा" → पेस्ट करा → रक्कम टाका.')}</p>
    ${S.society.upiBiz ? `<div class="grid2"><button class="btn primary" type="button" id="uqOpen">${T('UPI ॲप उघडा')}</button><button class="btn" type="button" id="uqSave">${IC.share} ${T('QR सेव्ह / शेअर')}</button></div>` : `<button class="btn primary block" type="button" id="uqSave">${IC.share} ${T('QR सेव्ह / शेअर')}</button>`}
    <div class="card stack small"><div class="row between"><span class="muted">${T('UPI आयडी')}</span><span class="row g6"><b>${esc(S.society.upi)}</b><button class="iconbtn" type="button" id="uqCopy" aria-label="${T('कॉपी करा')}">${IC.copy}</button></span></div>
      <div class="row between"><span class="muted">${T('रक्कम')}</span><span class="row g6"><b class="num">${rs(amount)}</b><button class="iconbtn" type="button" id="uqCopyA" aria-label="${T('कॉपी करा')}">${IC.copy}</button></span></div></div>
    <button class="btn good block" type="button" id="uqDone">✓ ${T('पैसे पाठवले, नोंद करा')}</button>`, async el => {
    const cv = el.querySelector('#uqC');
    try { const QR = await import('qrcode'); await QR.toCanvas(cv, link, { width: 560, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0F172A', light: '#FFFFFF' } }); } catch (e) {}
    el.querySelector('#uqSave').addEventListener('click', async () => {
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      const res = await shareImage(blob, `UPI-${S.society.code}-${Math.round(amount)}.png`, `${S.society.name} · ${rs(amount)}`);
      if (res === 'downloaded') toast(T('QR डाउनलोड झाला.')); if (res === 'failed') toast(T('शेअर होऊ शकले नाही.'));
    });
    if (el.querySelector('#uqOpen')) el.querySelector('#uqOpen').addEventListener('click', async () => { const ok = await openExternal(link); if (!ok) toast(T('UPI ॲप उघडले नाही. QR वापरा.')); });
    el.querySelector('#uqCopy').addEventListener('click', async () => toast(await copyText(S.society.upi) ? T('UPI आयडी कॉपी झाला.') : T('कॉपी होऊ शकला नाही.')));
    el.querySelector('#uqCopyA').addEventListener('click', async () => toast(await copyText(String(Math.round(amount))) ? T('रक्कम कॉपी झाली.') : T('कॉपी होऊ शकला नाही.')));
    el.querySelector('#uqDone').addEventListener('click', onDone);
  });
}

function sheetIPaid(defaultAmt, fund, months) {
  openSheet(`${sheetHead(fund ? T('वर्गणी भरणा नोंदवा') : T('भरणा नोंदवा'))}
    <p class="small muted m0">${T('UPI ॲपमध्ये भरल्यानंतर इथे नोंद करा. समिती तपासून मंजूर करेल.')}</p>
    <form id="ipForm" class="stack">
      <div class="grid2"><div class="field"><label for="iAmt">${T('रक्कम (₹)')}</label><input type="number" id="iAmt" min="1" inputmode="numeric" required value="${esc(defaultAmt || monthly())}"></div>
      ${fund ? `<div class="field"><label>${T('वर्गणी')}</label><input value="${esc(fund.title)}" disabled></div>` : `<div class="field"><label for="iN">${T('किती महिने')}</label><select id="iN">${ALLN.map(n => `<option value="${n}" ${months && months.length === n ? 'selected' : ''}>${nLabel(n)}</option>`).join('')}</select></div>`}</div>
      ${fund ? '' : `<div class="field"><label for="iMonth">${T('पासून')}</label><input type="month" id="iMonth" required value="${(months && months[0]) || nextUnpaid(S.member.flatId, 1)[0] || thisMonth}"><span class="tiny muted" id="iRange"></span></div>`}
      <div class="field"><label for="iRef">${T('UPI संदर्भ क्र. (UTR)')} <span class="hint">(${T('UPI ॲपमधील १२ अंकी क्रमांक')})</span></label><input type="text" id="iRef" inputmode="numeric" maxlength="22"></div>
      <button class="btn primary block" type="submit">${T('नोंद पाठवा')}</button></form>`, el => {
    const nSel = el.querySelector('#iN'), mIn = el.querySelector('#iMonth'), aIn = el.querySelector('#iAmt'), rng = el.querySelector('#iRange');
    const chosen = () => monthsFrom(mIn.value || thisMonth, +nSel.value);
    const showRange = () => { if (rng) rng.textContent = rangeLabel(chosen()); };
    if (nSel) { nSel.addEventListener('change', () => { aIn.value = (+nSel.value) * monthly(); showRange(); }); mIn.addEventListener('change', showRange); showRange(); }
    el.querySelector('#ipForm').addEventListener('submit', async e => {
      e.preventDefault();
      const ms = fund ? null : chosen();
      const c = { flatId: S.member.flatId, month: fund ? thisMonth : ms[0], ...(ms && ms.length > 1 ? { months: ms } : {}), ...(fund ? { fundId: fund.id, fundTitle: fund.title } : {}), amount: Number(el.querySelector('#iAmt').value) || 0, ref: el.querySelector('#iRef').value.trim(), date: today, uid: S.user.uid, name: S.user.name, status: 'pending', createdAt: Date.now() };
      try { await B.addClaim(S.sid, c); closeSheet(); toast(T('नोंद पाठवली. समिती मंजूर केल्यावर थकबाकी अपडेट होईल.')); } catch (er) { fail(er); }
    });
  });
}

function sheetEditMember(uid) {
  const m = S.members.find(x => x.id === uid); if (!m) return;
  openSheet(`${sheetHead(esc(m.name))}<span class="small muted">${esc(m.email)}</span>
    <form id="meForm" class="stack">
      <div class="field"><label for="mFlat">${T('सदनिका')}</label><select id="mFlat"><option value="">— ${T('नाही')} —</option>${flats().map(f => `<option ${f.id === m.flatId ? 'selected' : ''}>${esc(f.id)}</option>`).join('')}</select></div>
      <div class="field"><label for="mRole">${T('भूमिका')}</label><select id="mRole"><option value="resident" ${m.role !== 'admin' ? 'selected' : ''}>${T('सभासद')}</option><option value="admin" ${m.role === 'admin' ? 'selected' : ''}>${T('समिती (सर्व अधिकार)')}</option></select></div>
      <button class="btn primary block" type="submit">${T('जतन करा')}</button>
      <button class="btn block danger" type="button" id="mDel">${T('सोसायटीतून काढा')}</button></form>`, el => {
    el.querySelector('#meForm').addEventListener('submit', async e => { e.preventDefault(); try { await B.updateMember(S.sid, uid, { flatId: el.querySelector('#mFlat').value, role: el.querySelector('#mRole').value }); closeSheet(); toast(T('बदल जतन झाले.')); } catch (er) { fail(er); } });
    el.querySelector('#mDel').addEventListener('click', async () => { try { await B.removeMember(S.sid, uid); closeSheet(); toast(T('सदस्य काढला.')); } catch (er) { fail(er); } });
  });
}

function sheetComplaint() {
  openSheet(`${sheetHead(T('नवीन तक्रार'))}
    <form id="cForm" class="stack">
      ${isAdmin() ? `<div class="field"><label for="cFlat">${T('सदनिका')}</label><select id="cFlat"><option value="">${T('सामायिक')}</option>${flats().map(f => `<option>${esc(f.id)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label for="cText">${T('तक्रार')}</label><textarea id="cText" required rows="4" placeholder="${T('उदा. B विंगच्या जिन्यातील दिवा बंद आहे')}"></textarea></div>
      <button class="btn primary block" type="submit">${T('नोंदवा')}</button></form>`, el => {
    el.querySelector('#cForm').addEventListener('submit', async e => {
      e.preventDefault();
      const text = el.querySelector('#cText').value.trim(); if (!text) return;
      const c = { flatId: isAdmin() ? el.querySelector('#cFlat').value : (S.member.flatId || ''), text, uid: S.user.uid, name: S.user.name, status: 'open', createdAt: Date.now() };
      try { await B.addComplaint(S.sid, c); closeSheet(); toast(T('तक्रार नोंदवली.')); } catch (er) { fail(er); }
    });
  });
}

/* notices + minutes: written in the language chosen for the notice, not the app language */
const DOC_WORDS = {
  mr: { notice: 'सूचना', date: 'दिनांक: ', present: 'उपस्थित सदस्य: ', sign: 'सचिव, व्यवस्थापकीय समिती' },
  hi: { notice: 'सूचना', date: 'दिनांक: ', present: 'उपस्थित सदस्य: ', sign: 'सचिव, प्रबंध समिति' },
  en: { notice: 'Notice', date: 'Date: ', present: 'Members present: ', sign: 'Secretary, Managing Committee' }
};
function sheetNotice() {
  let lang = LANG, tpl = NOTICE_TEMPLATES[0];
  const form = () => tpl.fields.map(f => {
    const lbl = f[lang] || f.mr, ph = f.ph ? (f.ph[lang] || f.ph.mr) : '';
    if (f.options) return `<div class="field"><label for="f_${f.k}">${lbl}</label><select id="f_${f.k}">${f.options[lang].map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`;
    if (f.type === 'textarea') return `<div class="field"><label for="f_${f.k}">${lbl}</label><textarea id="f_${f.k}" rows="4"></textarea></div>`;
    return `<div class="field"><label for="f_${f.k}">${lbl}</label><input id="f_${f.k}" type="${f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}" placeholder="${esc(ph)}" ${f.type === 'date' ? `value="${today}"` : ''}></div>`;
  }).join('');
  openSheet(`${sheetHead(T('नवीन सूचना'))}
    <div class="seg" role="group" aria-label="${T('भाषा')}">${LANGS.map(([k, l]) => `<button class="chip" type="button" data-lang="${k}" aria-pressed="${k === LANG}">${l}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="${T('प्रकार')}" id="tplChips"></div>
    <div class="stack" id="tplFields"></div>
    <button class="btn block" type="button" id="nBuild">${T('मसुदा तयार करा')}</button>
    <div class="field"><label for="nHead">${T('शीर्षक')}</label><input type="text" id="nHead"></div>
    <div class="field"><label for="nBody">${T('मजकूर')} <span class="hint">(${T('हवे तसे बदला')})</span></label><textarea id="nBody" rows="8"></textarea></div>
    <button class="btn primary block" type="button" id="nPub">${T('प्रकाशित करा आणि पाठवा')}</button>`, el => {
    const g = s => el.querySelector(s);
    const chips = () => { g('#tplChips').innerHTML = NOTICE_TEMPLATES.map(t => `<button class="chip" type="button" data-tpl="${t.id}" aria-pressed="${t === tpl}">${t.label[lang]}</button>`).join(''); };
    const build = () => { const f = {}; tpl.fields.forEach(x => { const i = g('#f_' + x.k); f[x.k] = i ? i.value.trim() : ''; }); const r = tpl.build(f, lang, d => fmtDate(d, lang)); g('#nHead').value = r.heading; g('#nBody').value = r.body; };
    const refresh = () => { chips(); g('#tplFields').innerHTML = form(); g('#nHead').value = ''; g('#nBody').value = ''; };
    refresh();
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-tpl]'); if (t) { tpl = NOTICE_TEMPLATES.find(x => x.id === t.dataset.tpl); refresh(); }
      const l = e.target.closest('[data-lang]'); if (l) { lang = l.dataset.lang; el.querySelectorAll('[data-lang]').forEach(x => x.setAttribute('aria-pressed', String(x === l))); refresh(); }
    });
    g('#nBuild').addEventListener('click', build);
    g('#nPub').addEventListener('click', async () => {
      if (!g('#nBody').value.trim()) build();
      const n = { kind: 'notice', lang, heading: g('#nHead').value.trim() || DOC_WORDS[lang].notice, dateLine: DOC_WORDS[lang].date + fmtDate(today, lang), presentLine: '', body: g('#nBody').value.trim(), createdAt: Date.now(), by: S.user.name, uid: S.user.uid };
      await publishAndShare(n);
    });
  });
}

function sheetMinutes() {
  let lang = LANG;
  openSheet(`${sheetHead(T('नवीन इतिवृत्त'))}
    <div class="seg" role="group" aria-label="${T('भाषा')}">${LANGS.map(([k, l]) => `<button class="chip" type="button" data-lang="${k}" aria-pressed="${k === LANG}">${l}</button>`).join('')}</div>
    <div class="field"><label for="mType">${T('सभेचा प्रकार')}</label><select id="mType"></select></div>
    <div class="grid2"><div class="field"><label for="mDate">${T('सभेचा दिनांक')}</label><input type="date" id="mDate" value="${today}"></div>
    <div class="field"><label for="mPresent">${T('उपस्थित सदस्य')}</label><input type="number" id="mPresent" min="0" inputmode="numeric"></div></div>
    <div class="field"><label for="mBody">${T('ठराव')} <span class="hint">(${T('प्रत्येक ठराव नवीन ओळीत. खालील वाक्ये मदतीसाठी.')})</span></label><textarea id="mBody" rows="8"></textarea></div>
    <div class="chips" id="phr"></div>
    <button class="btn primary block" type="button" id="mPub">${T('प्रकाशित करा आणि पाठवा')}</button>`, el => {
    const g = s => el.querySelector(s);
    const fill = () => { g('#mType').innerHTML = MINUTES_TYPES[lang].map(t => `<option>${esc(t)}</option>`).join(''); g('#phr').innerHTML = RESOLUTION_PHRASES[lang].map((p, i) => `<button class="chip small" type="button" data-phr="${i}">+ ${esc(p)}</button>`).join(''); };
    fill();
    el.addEventListener('click', e => {
      const l = e.target.closest('[data-lang]'); if (l) { lang = l.dataset.lang; el.querySelectorAll('[data-lang]').forEach(x => x.setAttribute('aria-pressed', String(x === l))); fill(); }
      const p = e.target.closest('[data-phr]'); if (p) { const ta = g('#mBody'); ta.value = (ta.value.trim() ? ta.value.trimEnd() + '\n' : '') + RESOLUTION_PHRASES[lang][+p.dataset.phr]; ta.focus(); }
    });
    g('#mPub').addEventListener('click', async () => {
      const body = g('#mBody').value.trim(); if (!body) { toast(T('किमान एक ठराव लिहा.')); return; }
      const pr = g('#mPresent').value;
      const n = { kind: 'minutes', lang, heading: g('#mType').value, dateLine: DOC_WORDS[lang].date + fmtDate(g('#mDate').value, lang), presentLine: pr ? DOC_WORDS[lang].present + pr : '', body, createdAt: Date.now(), by: S.user.name, uid: S.user.uid };
      await publishAndShare(n);
    });
  });
}

async function publishAndShare(n) {
  if (!n.body) { toast(T('मजकूर रिकामा आहे.')); return; }
  try { await B.saveNotice(S.sid, n); } catch (e) { fail(e); return; }
  closeSheet(); toast(T('प्रकाशित झाले. सभासदांना ॲपमध्ये दिसेल.'));
  sheetViewNotice(n);
}

function sheetViewNotice(n) {
  openSheet(`${sheetHead(n.kind === 'minutes' ? T('इतिवृत्त') : T('सूचना'))}
    <img class="docprev" id="vImg" alt="${esc(n.heading)}">
    <div class="grid2"><button class="btn good" type="button" id="vShare">${IC.share} ${T('WhatsApp / शेअर')}</button><button class="btn" type="button" id="vCopy">${IC.copy} ${T('मजकूर कॉपी')}</button></div>
    ${isAdmin() && n.id ? `<button class="btn block danger" type="button" id="vDel">${T('हटवा')}</button>` : ''}`, async el => {
    const blob = await drawLetterhead(S.society, n);
    const img = el.querySelector('#vImg'); if (img) img.src = URL.createObjectURL(blob);
    const name = `${n.kind === 'minutes' ? 'itivrutta' : 'suchana'}-${today}.png`;
    el.querySelector('#vShare').addEventListener('click', async () => { const r = await shareImage(blob, name, n.heading); if (r === 'downloaded') toast(T('चित्र डाउनलोड झाले. WhatsApp मध्ये जोडा.')); if (r === 'failed') toast(T('शेअर होऊ शकले नाही.')); });
    el.querySelector('#vCopy').addEventListener('click', async () => {
      const lines = n.body.split('\n').filter(Boolean);
      const txt = `*${S.society.name}*\n*${n.heading}*\n${n.dateLine}${n.presentLine ? '\n' + n.presentLine : ''}\n\n${n.kind === 'minutes' ? lines.map((l, i) => `${i + 1}. ${l}`).join('\n') : lines.join('\n\n')}\n\n${(DOC_WORDS[n.lang] || DOC_WORDS.mr).sign}`;
      toast(await copyText(txt) ? T('मजकूर कॉपी झाला.') : T('कॉपी होऊ शकले नाही.'));
    });
    const del = el.querySelector('#vDel'); if (del) del.addEventListener('click', async () => { try { await B.deleteNotice(S.sid, n.id); closeSheet(); toast(T('हटवले.')); } catch (e) { fail(e); } });
  });
}

function sheetSwitch() {
  const socs = (S.userDoc && S.userDoc.societies) || {};
  openSheet(`${sheetHead(T('तुमच्या सोसायट्या'))}
    <ul class="list">${Object.entries(socs).map(([sid, s]) => `<li><span class="grow"><b>${esc(s.name)}</b><span class="tiny muted">${s.role === 'admin' ? T('समिती') : T('सभासद')}</span></span>${sid === S.sid ? `<span class="pill ok">${T('उघडी')}</span>` : `<button class="btn small" type="button" data-pick="${sid}">${T('उघडा')}</button>`}</li>`).join('')}</ul>
    <div class="grid2"><button class="btn" type="button" id="swJoin">${T('कोडने जॉइन करा')}</button><button class="btn" type="button" id="swNew">${T('नवीन सोसायटी')}</button></div>`, el => {
    el.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { closeSheet(); selectSociety(b.dataset.pick); }));
    el.querySelector('#swNew').addEventListener('click', () => sheetSetup(true));
    el.querySelector('#swJoin').addEventListener('click', () => { closeSheet(); S.sid = null; unsubAll(); if (memberSub) { memberSub(); memberSub = null; } render(); });
  });
}

async function startJoin(code) {
  try {
    const r = await B.lookupCode(code);
    if (!r) { toast(T('हा कोड सापडला नाही. समितीकडून पुन्हा तपासा.')); return; }
    if (((S.userDoc && S.userDoc.societies) || {})[r.sid]) { selectSociety(r.sid); return; }
    openSheet(`${sheetHead(T('जॉइन करा'))}<p class="m0"><b>${esc(r.name)}</b></p>
      <form id="jf" class="stack"><div class="field"><label for="jFlat">${T('तुमची सदनिका')}</label><input id="jFlat" type="text" required placeholder="${T('उदा. A-101')}" autocapitalize="characters"></div>
      <button class="btn primary block" type="submit">${T('विनंती पाठवा')}</button></form>`, el => {
      el.querySelector('#jf').addEventListener('submit', async e => {
        e.preventDefault();
        try { await B.requestJoin(S.user, r.sid, r.name, el.querySelector('#jFlat').value.trim().toUpperCase().replace(/[\/\s]+/g, '-')); closeSheet(); selectSociety(r.sid); toast(T('विनंती पाठवली.')); } catch (er) { fail(er); }
      });
    });
  } catch (e) { fail(e); }
}

/* ---------- committee editor: up to 12 posts ---------- */
function sheetCommittee() {
  const cur = (S.society.committee || []).length ? S.society.committee : POSTS.map(post => ({ post, name: '', flatId: '', phone: '' }));
  const rows = Array.from({ length: Math.max(12, cur.length) }, (_, i) => cur[i] || { post: 'सदस्य', name: '', flatId: '', phone: '' });
  openSheet(`${sheetHead(T('समिती सदस्य'))}
    <p class="small muted m0">${T('पद, नाव, सदनिका आणि फोन भरा. सदनिका निवडल्यावर यादीतील नाव आणि फोन आपोआप येतो. रिकाम्या ओळी दाखवल्या जाणार नाहीत.')}</p>
    <datalist id="postList">${POST_OPTIONS.map(p => `<option value="${T(p)}">`).join('')}</datalist>
    <datalist id="flatList">${flats().map(f => `<option value="${esc(f.id)}">${esc(f.owner || '')}</option>`).join('')}</datalist>
    <form id="comForm" class="stack">${rows.map((r, i) => `<fieldset class="crow"><legend>${i + 1}</legend>
      <div class="grid2"><div class="field"><label for="cp${i}">${T('पद')}</label><input id="cp${i}" list="postList" value="${esc(T(r.post))}"></div><div class="field"><label for="cf${i}">${T('सदनिका')}</label><input id="cf${i}" list="flatList" data-fill="${i}" value="${esc(r.flatId)}" autocapitalize="characters"></div></div>
      <div class="grid2"><div class="field"><label for="cn${i}">${T('नाव')}</label><input id="cn${i}" value="${esc(r.name)}"></div><div class="field"><label for="ct${i}">${T('फोन')}</label><input id="ct${i}" type="tel" inputmode="tel" value="${esc(r.phone)}"></div></div></fieldset>`).join('')}
      <button class="btn primary block sticky" type="submit">${T('जतन करा')}</button></form>`, el => {
    el.querySelectorAll('[data-fill]').forEach(inp => inp.addEventListener('change', () => {
      const i = inp.dataset.fill, f = flats().find(x => x.id === inp.value.trim().toUpperCase()); if (!f) return;
      inp.value = f.id; if (!el.querySelector('#cn' + i).value) el.querySelector('#cn' + i).value = f.owner || ''; if (!el.querySelector('#ct' + i).value) el.querySelector('#ct' + i).value = f.phone || '';
    }));
    el.querySelector('#comForm').addEventListener('submit', async e => {
      e.preventDefault();
      const committee = rows.map((_, i) => ({ post: canon(el.querySelector('#cp' + i).value.trim()) || 'सदस्य', name: el.querySelector('#cn' + i).value.trim(), flatId: el.querySelector('#cf' + i).value.trim().toUpperCase(), phone: el.querySelector('#ct' + i).value.trim() })).filter(c => c.name);
      try { await B.updateSociety(S.sid, { committee }); closeSheet(); toast(T('समिती जतन झाली.')); } catch (er) { fail(er); }
    });
  });
}

/* ---------- contacts editor ---------- */
function sheetContacts() {
  let rows = contactsList().map(c => ({ ...c }));
  if (!(S.society.contacts || []).length) rows = rows.concat([{ cat: 'सोसायटी', label: 'वॉचमन', name: '', phone: '' }, { cat: 'सोसायटी', label: 'व्यवस्थापक', name: '', phone: '' }, { cat: 'सेवा', label: 'प्लंबर', name: '', phone: '' }, { cat: 'सेवा', label: 'इलेक्ट्रिशियन', name: '', phone: '' }, { cat: 'सेवा', label: 'लिफ्ट दुरुस्ती', name: '', phone: '' }, { cat: 'जवळपास', label: 'जवळचे रुग्णालय', name: '', phone: '' }]);
  openSheet(`${sheetHead(T('महत्त्वाचे संपर्क'))}<p class="small muted m0">${T('फोन नसलेल्या ओळी दाखवल्या जाणार नाहीत.')}</p><div id="ctRows" class="stack"></div>
    <button class="btn ghost block" type="button" id="ctAdd">${IC.plus} ${T('संपर्क जोडा')}</button><button class="btn primary block sticky" type="button" id="ctSave">${T('जतन करा')}</button>`, el => {
    const read = () => { rows = [...el.querySelectorAll('.ctrow')].map(r => ({ cat: r.querySelector('select').value, label: canon(r.querySelector('[data-k=label]').value.trim()), name: r.querySelector('[data-k=name]').value.trim(), phone: r.querySelector('[data-k=phone]').value.trim() })); };
    const draw = () => { el.querySelector('#ctRows').innerHTML = rows.map((c, i) => `<fieldset class="crow ctrow"><legend>${i + 1}</legend>
      <div class="grid2"><div class="field"><label for="k${i}">${T('प्रकार')}</label><select id="k${i}">${CONTACT_CATS.map(x => `<option value="${x}" ${x === canon(c.cat) ? 'selected' : ''}>${T(x)}</option>`).join('')}</select></div><div class="field"><label for="l${i}">${T('कोण')}</label><input id="l${i}" data-k="label" value="${esc(T(c.label))}" placeholder="${T('उदा. वॉचमन')}"></div></div>
      <div class="grid2"><div class="field"><label for="n${i}">${T('नाव')}</label><input id="n${i}" data-k="name" value="${esc(c.name)}"></div><div class="field"><label for="p${i}">${T('फोन')}</label><input id="p${i}" data-k="phone" type="tel" inputmode="tel" value="${esc(c.phone)}"></div></div>
      <button class="link danger" type="button" data-rm="${i}">${T('काढा')}</button></fieldset>`).join(''); };
    draw();
    el.querySelector('#ctAdd').addEventListener('click', () => { read(); rows.push({ cat: 'सेवा', label: '', name: '', phone: '' }); draw(); });
    el.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { read(); rows.splice(+b.dataset.rm, 1); draw(); } });
    el.querySelector('#ctSave').addEventListener('click', async () => { read(); try { await B.updateSociety(S.sid, { contacts: rows.filter(c => c.phone && c.label) }); closeSheet(); toast(T('संपर्क जतन झाले.')); } catch (er) { fail(er); } });
  });
}

/* ---------- dashboard settings: tiles + balance figures ---------- */
function sheetDashboard() {
  const d = dashCfg(); let order = dashTiles().slice(); Object.keys(TILE_DEFS).forEach(k => { if (!order.includes(k)) order.push(k); });
  let on = new Set(dashTiles());
  openSheet(`${sheetHead(T('डॅशबोर्ड बदला'))}
    <span class="kicker">${T('बँक शिल्लक (समितीसाठी)')}</span>
    <div class="grid2"><div class="field"><label for="dBank">${T('बँक शिल्लक (₹)')}</label><input id="dBank" type="number" inputmode="numeric" value="${esc(d.bank ?? '')}"></div><div class="field"><label for="dFd">${T('मुदत ठेव (₹)')}</label><input id="dFd" type="number" inputmode="numeric" value="${esc(d.fd ?? '')}"></div></div>
    <div class="field"><label for="dAsOf">${T('या दिवशीची शिल्लक')}</label><input id="dAsOf" type="date" value="${esc(d.asOf || today)}"></div>
    <span class="kicker">${T('काय दिसावे आणि कोणत्या क्रमाने')}</span><ul class="list" id="tList"></ul>
    <button class="btn primary block" type="button" id="dSave">${T('जतन करा')}</button>`, el => {
    const draw = () => { el.querySelector('#tList').innerHTML = order.map((k, i) => `<li><label class="grow row g6 chk"><input type="checkbox" data-on="${k}" ${on.has(k) ? 'checked' : ''}> ${TILE_DEFS[k].label}</label>
      <button class="iconbtn" type="button" data-mv="${i}:-1" aria-label="${T('वर')}" ${i ? '' : 'disabled'}>↑</button><button class="iconbtn" type="button" data-mv="${i}:1" aria-label="${T('खाली')}" ${i < order.length - 1 ? '' : 'disabled'}>↓</button></li>`).join(''); };
    draw();
    el.addEventListener('change', e => { const c = e.target.closest('[data-on]'); if (c) { c.checked ? on.add(c.dataset.on) : on.delete(c.dataset.on); } });
    el.addEventListener('click', e => { const b = e.target.closest('[data-mv]'); if (!b) return; const [i, dir] = b.dataset.mv.split(':').map(Number); const j = i + dir; [order[i], order[j]] = [order[j], order[i]]; draw(); });
    el.querySelector('#dSave').addEventListener('click', async () => {
      const num = id => { const v = el.querySelector(id).value; return v === '' ? null : Number(v); };
      try { await B.updateSociety(S.sid, { dashboard: { tiles: order.filter(k => on.has(k)), bank: num('#dBank'), fd: num('#dFd'), asOf: el.querySelector('#dAsOf').value || today } }); closeSheet(); toast(T('डॅशबोर्ड जतन झाला.')); } catch (er) { fail(er); }
    });
  });
}

/* ---------- announcements ---------- */
function sheetMessage() {
  const myPost = (committeeList().find(c => c.flatId && c.flatId === S.member.flatId) || {}).post || '';
  openSheet(`${sheetHead(T('नवीन घोषणा'))}
    <form id="msgForm" class="stack"><div class="field"><label for="mText">${T('संदेश')}</label><textarea id="mText" rows="6" required placeholder="${T('उदा. उद्या सकाळी १० ते १२ लिफ्टची देखभाल असल्याने लिफ्ट बंद राहील.')}"></textarea></div>
    <label class="chk row g6"><input type="checkbox" id="mImp"> ${T('महत्त्वाचे म्हणून दाखवा')}</label>
    <label class="chk row g6"><input type="checkbox" id="mPin"> ${T('सर्वात वर ठेवा')}</label>
    <label class="chk row g6"><input type="checkbox" id="mWa" checked> ${T('WhatsApp वरही पाठवा')}</label>
    <button class="btn primary block" type="submit">${T('प्रकाशित करा')}</button></form>`, el => {
    el.querySelector('#msgForm').addEventListener('submit', async e => {
      e.preventDefault();
      const text = el.querySelector('#mText').value.trim(); if (!text) return;
      const m = { text, important: el.querySelector('#mImp').checked, pinned: el.querySelector('#mPin').checked, by: S.user.name, byPost: myPost, uid: S.user.uid, createdAt: Date.now() };
      try { await B.saveMessage(S.sid, m); closeSheet(); toast(T('घोषणा प्रकाशित झाली.')); if (el.querySelector('#mWa').checked) openExternal(waLink('', `*${S.society.name}*\n${m.important ? `*${T('महत्त्वाची घोषणा')}*\n` : ''}${text}\n\n- ${T(m.byPost || 'समिती')}`)); } catch (er) { fail(er); }
    });
  });
}

/* ---------- funds ---------- */
function sheetFundEdit(f) {
  const x = f || { title: '', desc: '', perFlat: '', target: '', due: '' };
  openSheet(`${sheetHead(f ? T('वर्गणी बदला') : T('नवीन वर्गणी'))}
    <form id="fForm" class="stack">
      <div class="field"><label for="fTitle">${T('कशासाठी')}</label><input id="fTitle" required value="${esc(x.title)}" placeholder="${T('उदा. गणेशोत्सव 2027')}"></div>
      <div class="field"><label for="fDesc">${T('माहिती')} <span class="hint">(${T('ऐच्छिक')})</span></label><textarea id="fDesc" rows="3">${esc(x.desc)}</textarea></div>
      <div class="grid2"><div class="field"><label for="fPer">${T('प्रति सदनिका (₹)')} <span class="hint">${T('रिकामे')} = ${T('ऐच्छिक रक्कम')}</span></label><input id="fPer" type="number" inputmode="numeric" min="0" value="${esc(x.perFlat || '')}"></div>
      <div class="field"><label for="fTarget">${T('एकूण लक्ष्य (₹)')} <span class="hint">${T('ऐच्छिक')}</span></label><input id="fTarget" type="number" inputmode="numeric" min="0" value="${esc(x.target || '')}"></div></div>
      <div class="field"><label for="fDue">${T('शेवटची तारीख')}</label><input id="fDue" type="date" value="${esc(x.due || '')}"></div>
      <button class="btn primary block" type="submit">${f ? T('जतन करा') : T('सुरू करा')}</button></form>`, el => {
    el.querySelector('#fForm').addEventListener('submit', async e => {
      e.preventDefault();
      const data = { title: el.querySelector('#fTitle').value.trim(), desc: el.querySelector('#fDesc').value.trim(), perFlat: Number(el.querySelector('#fPer').value) || 0, target: Number(el.querySelector('#fTarget').value) || 0, due: el.querySelector('#fDue').value };
      try {
        if (f) await B.saveFund(S.sid, { id: f.id, ...data });
        else { await B.saveFund(S.sid, { ...data, status: 'open', paid: {}, createdAt: Date.now(), by: S.user.name }); openExternal(waLink('', `*${S.society.name}*\n*${T('वर्गणी')}: ${data.title}*\n${data.desc ? data.desc + '\n' : ''}${data.perFlat ? `${T('प्रति सदनिका')} ${rs(data.perFlat)}\n` : ''}${data.due ? `${T('शेवटची तारीख')}: ${fmtDate(data.due)}\n` : ''}${T('Sachiv ॲपमधून UPI द्वारे भरा.')}\n- ${T('समिती')}`)); }
        closeSheet(); toast(f ? T('जतन झाले.') : T('वर्गणी सुरू झाली.'));
      } catch (er) { fail(er); }
    });
  });
}
function sheetFund(id) {
  const f = S.funds.find(x => x.id === id); if (!f) return;
  const paid = f.paid || {}, got = fundCollected(f), my = S.member.flatId, mine = my && paid[my];
  const pendMine = S.claims.find(c => c.fundId === f.id && c.status === 'pending');
  const unpaid = flats().filter(x => !paid[x.id]);
  openSheet(`${sheetHead(esc(f.title))}
    ${f.desc ? `<p class="small m0">${esc(f.desc)}</p>` : ''}
    <div class="grid2"><div class="card"><span class="kicker">${T('जमा')}</span><b class="num lg good">${rs(got)}</b>${f.target ? `<span class="tiny muted">${T('लक्ष्य')} ${rs(f.target)}</span>` : ''}</div><div class="card"><span class="kicker">${T('सदनिका')}</span><b class="num lg">${Object.keys(paid).length}<small class="muted"> / ${flats().length}</small></b>${f.due ? `<span class="tiny muted">${T('{0} पर्यंत', fmtDate(f.due))}</span>` : ''}</div></div>
    ${!isAdmin() && my && f.status !== 'closed' ? (mine ? `<div class="card accent small">${T('तुम्ही')} ${rs(mine.amount)} ${T('भरले')} ✓</div>` : pendMine ? `<div class="pill wait">${rs(pendMine.amount)} ${T('समितीच्या मंजुरीसाठी')}</div>` : S.society.upi ? `<div class="field"><label for="fAmt">${T('रक्कम (₹)')}</label><input id="fAmt" type="number" inputmode="numeric" min="1" value="${esc(f.perFlat || '')}"></div><button class="btn primary block" type="button" id="fPay">${T('UPI ने भरा')}</button><button class="link" type="button" id="fIPaid">${T('आधीच भरले? नोंद करा')}</button>` : '') : ''}
    ${isAdmin() ? `<div class="grid2"><button class="btn ghost" type="button" id="fEdit">${IC.edit} ${T('बदला')}</button><button class="btn ghost" type="button" id="fWa">${IC.wa} ${T('आठवण')}</button></div>` : ''}
    <span class="kicker">${T('भरलेल्या सदनिका')} · ${Object.keys(paid).length}</span>
    ${Object.keys(paid).length ? `<ul class="list">${Object.entries(paid).sort((a, b) => a[0].localeCompare(b[0])).map(([fl, p]) => `<li><span class="flat">${esc(fl)}</span><span class="grow"><span class="tiny muted">${esc(fmtDate(p.date))} · ${esc(T(p.mode || ''))}</span></span><b class="num">${rs(p.amount)}</b>${isAdmin() || fl === my ? `<button class="iconbtn" type="button" data-frcpt="${esc(fl)}" aria-label="${T('पावती')}">${IC.receipt}</button>` : ''}${isAdmin() ? `<button class="iconbtn" type="button" data-fundunpay="${esc(fl)}" aria-label="${T('नोंद काढा')}">✕</button>` : ''}</li>`).join('')}</ul>` : `<p class="small muted m0">${T('अजून कोणी भरली नाही.')}</p>`}
    ${isAdmin() && unpaid.length ? `<span class="kicker">${T('बाकी')} · ${unpaid.length}</span><ul class="list">${unpaid.map(x => `<li><span class="flat">${esc(x.id)}</span><span class="grow small">${esc(x.owner || '')}</span><button class="btn small ghost" type="button" data-fundcash="${esc(x.id)}">${T('जमा')}</button></li>`).join('')}</ul>` : ''}
    ${isAdmin() ? `<div class="grid2"><button class="btn ghost" type="button" id="fClose">${f.status === 'closed' ? T('पुन्हा सुरू करा') : T('वर्गणी बंद करा')}</button><button class="btn ghost danger" type="button" id="fDel">${T('हटवा')}</button></div>` : ''}`, el => {
    const g = q => el.querySelector(q);
    if (g('#fPay')) g('#fPay').addEventListener('click', async () => {
      const amt = Number(g('#fAmt').value) || 0; if (!amt) { toast(T('रक्कम टाका.')); return; }
      sheetUpiPay(amt, `${f.title} ${my}`, () => sheetIPaid(amt, f));
    });
    if (g('#fIPaid')) g('#fIPaid').addEventListener('click', () => sheetIPaid(Number(g('#fAmt').value) || f.perFlat, f));
    if (g('#fEdit')) g('#fEdit').addEventListener('click', () => sheetFundEdit(f));
    if (g('#fWa')) g('#fWa').addEventListener('click', () => openExternal(waLink('', `*${S.society.name}*\n*${T('वर्गणी')}: ${f.title}*\n${f.perFlat ? T('{0} प्रति सदनिका', rs(f.perFlat)) + '. ' : ''}${T('आतापर्यंत {0} सदनिकांनी {1} भरले.', Object.keys(paid).length, rs(got))}\n${f.due ? `${T('शेवटची तारीख')}: ${fmtDate(f.due)}\n` : ''}${T('Sachiv ॲपमधून भरा.')}\n- ${T('समिती')}`)));
    if (g('#fClose')) g('#fClose').addEventListener('click', async () => { if (locked()) { toast(LOCK_MSG); return; } try { await B.saveFund(S.sid, { id: f.id, status: f.status === 'closed' ? 'open' : 'closed' }); closeSheet(); toast(T('बदल जतन झाला.')); } catch (er) { fail(er); } });
    if (g('#fDel')) g('#fDel').addEventListener('click', async e => { const b = e.currentTarget; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = T('नक्की हटवायचे?'); return; } try { await B.deleteFund(S.sid, f.id); closeSheet(); toast(T('वर्गणी हटवली.')); } catch (er) { fail(er); } });
    el.addEventListener('click', async e => {
      const rb = e.target.closest('[data-frcpt]'); if (rb) { openReceipt(fundReceipt(f, rb.dataset.frcpt, paid[rb.dataset.frcpt])); return; }
      const c = e.target.closest('[data-fundcash]'), u = e.target.closest('[data-fundunpay]');
      if ((c || u) && locked()) { toast(LOCK_MSG); return; }
      if (c) sheetFundCash(f, c.dataset.fundcash);
      if (u) { try { await B.setFundPaid(S.sid, f.id, u.dataset.fundunpay, null); toast(T('नोंद काढली.')); sheetFundSoon(f.id); } catch (er) { fail(er); } }
    });
  });
}
const sheetFundSoon = id => setTimeout(() => sheetFund(id), 250);
function sheetFundCash(f, flatId) {
  openSheet(`${sheetHead(`${esc(f.title)} · ${esc(flatId)}`)}
    <form id="fcForm" class="stack"><div class="grid2"><div class="field"><label for="fcAmt">${T('रक्कम (₹)')}</label><input id="fcAmt" type="number" inputmode="numeric" min="1" required value="${esc(f.perFlat || '')}"></div>
    <div class="field"><label for="fcMode">${T('कसे भरले')}</label><select id="fcMode">${['रोख', 'UPI', 'चेक', 'बँक ट्रान्सफर'].map(x => `<option value="${x}">${T(x)}</option>`).join('')}</select></div></div>
    <button class="btn primary block" type="submit">${T('जमा नोंदवा')}</button><button class="btn ghost block" type="button" id="fcBack">‹ ${T('मागे')}</button></form>`, el => {
    el.querySelector('#fcBack').addEventListener('click', () => sheetFund(f.id));
    el.querySelector('#fcForm').addEventListener('submit', async e => {
      e.preventDefault(); const amt = Number(el.querySelector('#fcAmt').value) || 0; if (!amt) return;
      const rec = { amount: amt, date: today, mode: el.querySelector('#fcMode').value, at: Date.now(), by: S.user.name };
      try { rec.no = await newRcptNo(today); await B.setFundPaid(S.sid, f.id, flatId, rec); toast(`${flatId}: ${rs(amt)} ${T('जमा.')}`); openReceipt(fundReceipt(f, flatId, rec)); } catch (er) { fail(er); }
    });
  });
}

/* ---------- files ---------- */
const CHUNK = 932000; // base64 characters per Firestore doc (~700 KB of file)
const readB64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(file); });
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)/.test(file.type) || file.size < 1200000) return file;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const sc = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}
function sheetUpload() {
  openSheet(`${sheetHead(T('फाइल जोडा'))}
    <form id="upForm" class="stack">
      <div class="field"><label for="uFile">${T('फाइल')} <span class="hint">(${T('PDF, फोटो, Excel, Word')} · ${T('कमाल 5 MB')})</span></label><input id="uFile" type="file" required accept=".pdf,image/*,.xls,.xlsx,.csv,.doc,.docx"></div>
      <div class="field"><label for="uName">${T('नाव')}</label><input id="uName" placeholder="${T('उदा. लेखापरीक्षण अहवाल 2025-26')}"></div>
      <div class="field"><label for="uFolder">${T('फोल्डर')}</label><select id="uFolder">${FOLDERS.map(f => `<option value="${f}" ${f === fileFolder ? 'selected' : ''}>${T(f)}</option>`).join('')}</select></div>
      <div class="field"><label for="uVis">${T('कोण पाहू शकेल')}</label><select id="uVis"><option value="all">${T('सर्व सभासद')}</option><option value="committee">${T('फक्त समिती')}</option></select></div>
      <button class="btn primary block" type="submit">${T('अपलोड करा')}</button><p class="tiny muted m0" id="uStat" role="status"></p></form>`, el => {
    const inp = el.querySelector('#uFile');
    inp.addEventListener('change', () => { const f = inp.files[0]; if (f && !el.querySelector('#uName').value) el.querySelector('#uName').value = f.name.replace(/\.\w+$/, ''); });
    el.querySelector('#upForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = el.querySelector('[type=submit]'), st = el.querySelector('#uStat');
      let file = inp.files[0]; if (!file) return;
      btn.disabled = true; st.textContent = T('तयार करत आहे…');
      try {
        file = await shrinkImage(file);
        if (file.size > 5 * 1048576) { toast(T('फाइल 5 MB पेक्षा मोठी आहे.')); btn.disabled = false; st.textContent = ''; return; }
        const b64 = await readB64(file), chunks = [];
        for (let i = 0; i < b64.length; i += CHUNK) chunks.push(b64.slice(i, i + CHUNK));
        st.textContent = `${T('अपलोड करत आहे')} (${fmtSize(file.size)})…`;
        const ext = (file.name.match(/\.\w+$/) || [''])[0];
        await B.uploadFile(S.sid, { name: (el.querySelector('#uName').value.trim() || file.name.replace(/\.\w+$/, '')) + ext, mime: file.type || 'application/octet-stream', size: file.size, folder: el.querySelector('#uFolder').value, visibility: el.querySelector('#uVis').value, by: S.user.name, createdAt: Date.now() }, chunks);
        closeSheet(); toast(T('फाइल जोडली.'));
      } catch (er) { fail(er); btn.disabled = false; st.textContent = ''; }
    });
  });
}
async function openFile(id) {
  const f = S.files.find(x => x.id === id); if (!f) return;
  openSheet(`${sheetHead(esc(f.name))}<p class="small muted m0" id="foStat">${T('उघडत आहे…')}</p><div id="foBody" class="stack"></div>`, async el => {
    try {
      const parts = await B.readFile(S.sid, f.id, f.chunks || 1), bin = atob(parts.join('')), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: f.mime });
      el.querySelector('#foStat').textContent = `${T(f.folder || '')} · ${fmtSize(f.size || bytes.length)} · ${fmtTs(f.createdAt)}${f.by ? ' · ' + f.by : ''}`;
      el.querySelector('#foBody').innerHTML = `${/^image\//.test(f.mime) ? `<img class="docprev" alt="${esc(f.name)}" src="${URL.createObjectURL(blob)}">` : `<div class="card center"><span class="fic big ${fileKind(f).toLowerCase()}">${fileKind(f)}</span></div>`}
        <button class="btn primary block" type="button" id="foOpen">${IC.share} ${T('उघडा / पाठवा')}</button>
        ${isAdmin() ? `<button class="btn ghost block danger" type="button" id="foDel">${T('हटवा')}</button>` : ''}`;
      el.querySelector('#foOpen').addEventListener('click', async () => { const r = await shareFile(blob, f.name, f.name); if (r === 'downloaded') toast(T('फाइल डाउनलोड झाली.')); if (r === 'failed') toast(T('उघडता आली नाही.')); });
      const del = el.querySelector('#foDel'); if (del) del.addEventListener('click', async () => { if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = T('नक्की हटवायचे?'); return; } try { await B.deleteFile(S.sid, f.id, f.chunks || 1); closeSheet(); toast(T('फाइल हटवली.')); } catch (er) { fail(er); } });
    } catch (er) { el.querySelector('#foStat').textContent = errMsg(er); }
  });
}
/* ---------- society QR poster ---------- */
function sheetPoster() {
  const url = joinUrl(S.society.code);
  openSheet(`${sheetHead(T('सोसायटी QR पोस्टर'))}
    <p class="small muted m0">${T('हे पोस्टर A4 वर छापून सूचना फलकावर, लिफ्टमध्ये किंवा प्रवेशद्वारावर लावा. सभासद QR स्कॅन करून थेट तुमच्या सोसायटीत सामील होतील.')}</p>
    <img class="docprev" id="psImg" alt="${T('सोसायटी QR पोस्टर')}">
    <div class="grid2"><button class="btn primary" type="button" id="psPdf">${IC.doc} ${T('PDF (छपाईसाठी)')}</button><button class="btn" type="button" id="psPng">${IC.share} ${T('चित्र / WhatsApp')}</button></div>
    <button class="btn ghost block" type="button" id="psLink">${IC.copy} ${T('जॉइन लिंक कॉपी करा')}</button>`, async el => {
    const canvas = await drawPoster(S.society, url, k => T(k));
    const img = el.querySelector('#psImg'); if (img) img.src = canvas.toDataURL('image/png');
    el.querySelector('#psPng').addEventListener('click', async () => { const r = await shareImage(await canvasToBlob(canvas), `Sachiv-QR-${S.society.code}.png`, `${S.society.name}: ${url}`); if (r === 'downloaded') toast(T('चित्र डाउनलोड झाले.')); });
    el.querySelector('#psPdf').addEventListener('click', async () => { const r = await shareFile(await posterPdf(canvas), `Sachiv-QR-${S.society.code}.pdf`, S.society.name); if (r === 'downloaded') toast(T('PDF डाउनलोड झाली.')); });
    el.querySelector('#psLink').addEventListener('click', async () => toast(await copyText(url) ? T('लिंक कॉपी झाली.') : T('कॉपी होऊ शकले नाही.')));
  });
}

/* ---------- receipts (पावती) ---------- */
const flatOwner = id => (flats().find(f => f.id === id) || {}).owner || '';
const rcptDate = rec => fmtDate(rec.date || (rec.at ? isoDay(rec.at) : today), 'en').replace(/^(\d+) (\w{3})\w* /, '$1 $2 ');
const enLabel = k => (DICT[k] || [])[1] || k;
const enMonth = k => { const [y, m] = k.split('-').map(Number); return `${MONTHS_ALL.en[m - 1].slice(0, 3)} ${y}`; };
const periodLabel = ms => { const loc = rangeLabel(ms), e = ms.length === 1 ? enMonth(ms[0]) : `${enMonth(ms[0])} – ${enMonth(ms[ms.length - 1])}`; return LANG === 'en' ? (ms.length === 1 ? monthName(ms[0]) : `${e} (${ms.length} months)`) : `${loc}  (${e})`; };
// Financial year (April–March) of a date, e.g. 2026-10-19 → "26-27"
const fyOf = iso => { const d = iso ? new Date(iso) : new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${String(y).slice(2)}-${String(y + 1).slice(2)}`; };
const rcptPrefix = () => String(S.society.rcptPrefix || S.society.code || 'R').toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'R';
// Next serial receipt number for this society and year: KKR/26-27/0001. Empty if it can't be reserved (offline).
async function newRcptNo(iso) {
  const fy = fyOf(iso);
  try { const n = await B.nextReceiptNo(S.sid, 'fy' + fy.replace('-', '')); return `${rcptPrefix()}/${fy}/${String(n).padStart(4, '0')}`; } catch (e) { return ''; }
}
const maintReceipt = (flatId, month, rec) => { const g = Array.isArray(rec.grp) && rec.grp.length > 1 ? rec.grp : null; const ms = g || [month]; return { no: rec.no || `${S.society.code}-${ms[0].replace('-', '')}-${flatId}${g ? '-' + g.length + 'M' : ''}`, date: rcptDate(rec), flatId, name: rec.payer || flatOwner(flatId), kind: 'maint', period: periodLabel(ms), purpose: `${T('देखभाल शुल्क')} · ${rangeLabel(ms)}`, amount: g ? Number(rec.grpTotal) || 0 : Number(rec.amount) || 0, mode: T(rec.mode || ''), ref: rec.ref || '', by: rec.by || '', dues: dueFor(flatId, thisMonth), asOn: fmtDate(today, 'en').replace(/^(\d+) (\w{3})\w* /, '$1 $2 ') }; };
const fundReceipt = (f, flatId, rec) => ({ no: rec.no || `${S.society.code}-V${String(f.id).slice(0, 4).toUpperCase()}-${flatId}`, date: rcptDate(rec), flatId, name: rec.payer || flatOwner(flatId), kind: 'fund', period: f.title, purpose: `${T('वर्गणी')} · ${f.title}`, amount: Number(rec.amount) || 0, mode: T(rec.mode || ''), ref: rec.ref || '', by: rec.by || '', dues: null });
function openReceipt(r) {
  const file = `Pavati-${r.no.replace(/[\/\\:*?"<>|\s]+/g, '-')}-${r.flatId}`;
  openSheet(`${sheetHead(T('पावती'))}<img class="docprev rcprev" id="rcImg" alt="${T('पावती')}">
    <div class="grid2"><button class="btn primary" type="button" id="rcPdf" disabled>${IC.doc} ${T('PDF डाउनलोड')}</button><button class="btn" type="button" id="rcShare" disabled>${IC.share} WhatsApp</button></div>
    <button class="btn ghost block" type="button" id="rcClose">${T('बंद')}</button>`, async el => {
    el.querySelector('#rcClose').addEventListener('click', closeSheet);
    if (r.kind === 'maint') { await new Promise(res => setTimeout(res, 400)); r.dues = dueFor(r.flatId, thisMonth); } // after the new payment reaches the ledger
    const canvas = await drawReceipt(S.society, r, { t: k => T(k), en: enLabel, lang: LANG });
    const img = el.querySelector('#rcImg'); if (img) img.src = canvas.toDataURL('image/jpeg', 0.9);
    const text = `${S.society.name} · ${T('पावती')} ${r.no} · ₹${r.amount}`;
    const pdfBtn = el.querySelector('#rcPdf'), shBtn = el.querySelector('#rcShare'); if (!pdfBtn) return;
    pdfBtn.disabled = shBtn.disabled = false;
    pdfBtn.addEventListener('click', async () => {
      pdfBtn.disabled = true;
      const res = await shareFile(await receiptPdf(canvas), `${file}.pdf`, text); pdfBtn.disabled = false;
      if (res === 'downloaded') toast(T('पावती PDF डाउनलोड झाली.')); if (res === 'failed') toast(T('शेअर होऊ शकले नाही.'));
    });
    shBtn.addEventListener('click', async () => {
      const res = await shareImage(await receiptPng(canvas), `${file}.png`, text);
      if (res === 'downloaded') toast(T('पावती डाउनलोड झाली.')); if (res === 'failed') toast(T('शेअर होऊ शकले नाही.'));
    });
  });
}

/* ---------- full ledger export to Excel (.xlsx with several sheets) ---------- */
async function exportLedger() {
  toast(T('Excel तयार करत आहे…'));
  const XLSX = await import('xlsx');
  const months = monthsBetween(S.society.startMonth || thisMonth, thisMonth);
  const hhmm = ts => ts ? new Date(ts).toTimeString().slice(0, 5) : '';
  const dmy = ts => ts ? isoDay(ts) : '';
  const memberOf = id => S.members.filter(m => m.flatId === id);
  // 1 summary per flat
  const summary = [[T('सदनिका'), T('मालक'), T('फोन'), T('ॲपवरील सभासद'), T('ॲप स्थिती'), T('एकूण भरले'), T('थकबाकी'), T('शेवटचा भरणा')]];
  // 2 every transaction
  const tx = [[T('दिनांक'), T('वेळ'), T('सदनिका'), T('मालक'), T('भरणारे'), T('प्रकार'), T('कशासाठी'), T('रक्कम (₹)'), T('कसे भरले'), T('संदर्भ क्र. / UTR'), T('पावती क्र.'), T('नोंद करणारे')]];
  // 3 month grid
  const grid = [[T('सदनिका'), T('मालक'), ...months.map(monthName), T('एकूण भरले'), T('थकबाकी')]];
  for (const f of flats()) {
    const P = (S.accounts[f.id] || {}).payments || {};
    const mem = memberOf(f.id);
    let paid = 0, last = '';
    const vals = months.map(m => { const p = P[m]; if (!p) return ''; paid += Number(p.amount) || 0; if ((p.date || '') > last) last = p.date || ''; return Number(p.amount) || 0; });
    Object.entries(P).forEach(([m, p]) => {
      const r = maintReceipt(f.id, m, p);
      tx.push([p.date || dmy(p.at), hhmm(p.at), f.id, f.owner || '', p.payer || '', T('देखभाल शुल्क'), monthName(m), Number(p.amount) || 0, T(p.mode || ''), p.ref || '', r.no, p.by || '']);
    });
    summary.push([f.id, f.owner || '', f.phone || '', mem.map(m => m.name).join(', '), mem.some(m => m.status === 'active') ? T('ॲपवर आहे') : mem.length ? T('मंजुरी बाकी') : T('ॲपवर नाही'), paid, dueFor(f.id, thisMonth), last]);
    grid.push([f.id, f.owner || '', ...vals, paid, dueFor(f.id, thisMonth)]);
  }
  // 4 collections
  const fundRows = [[T('वर्गणी'), T('सदनिका'), T('मालक'), T('रक्कम (₹)'), T('दिनांक'), T('वेळ'), T('कसे भरले'), T('संदर्भ क्र. / UTR'), T('पावती क्र.'), T('नोंद करणारे')]];
  for (const fd of S.funds) for (const [fl, p] of Object.entries(fd.paid || {})) {
    const r = fundReceipt(fd, fl, p);
    fundRows.push([fd.title, fl, flatOwner(fl), Number(p.amount) || 0, p.date || dmy(p.at), hhmm(p.at), T(p.mode || ''), p.ref || '', r.no, p.by || '']);
    tx.push([p.date || dmy(p.at), hhmm(p.at), fl, flatOwner(fl), p.payer || '', T('वर्गणी'), fd.title, Number(p.amount) || 0, T(p.mode || ''), p.ref || '', r.no, p.by || '']);
  }
  // 5 UPI payment reports from residents, with status
  const claims = [[T('दिनांक'), T('वेळ'), T('सदनिका'), T('भरणारे'), T('कशासाठी'), T('रक्कम (₹)'), T('संदर्भ क्र. / UTR'), T('स्थिती')]];
  for (const c of S.claims) claims.push([dmy(c.createdAt), hhmm(c.createdAt), c.flatId, c.name || '', c.fundId ? `${T('वर्गणी')} · ${c.fundTitle || ''}` : rangeLabel(c.months || [c.month]), Number(c.amount) || 0, c.ref || '', c.status === 'approved' ? T('मंजूर') : c.status === 'rejected' ? T('नाकारले') : T('प्रलंबित')]);
  // 6 app members
  const mem = [[T('नाव'), T('ईमेल'), T('सदनिका'), T('भूमिका'), T('स्थिती'), T('जोडल्याचा दिनांक')]];
  for (const m of S.members) mem.push([m.name || '', m.email || '', m.flatId || '', m.role === 'admin' ? T('समिती') : T('सभासद'), m.status === 'active' ? T('सक्रिय') : T('मंजुरी बाकी'), dmy(m.createdAt)]);
  tx.splice(1, tx.length - 1, ...tx.slice(1).sort((a, b) => String(b[0] + b[1]).localeCompare(String(a[0] + a[1]))));
  const wb = XLSX.utils.book_new();
  const add = (rows, name, widths) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = widths.map(w => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); };
  add(summary, T('सारांश'), [10, 24, 14, 24, 14, 12, 12, 12]);
  add(tx, T('सर्व व्यवहार'), [12, 7, 9, 22, 18, 14, 24, 11, 14, 18, 22, 16]);
  add(grid, T('महिनावार'), [10, 24, ...months.map(() => 12), 12, 12]);
  add(fundRows, T('वर्गणी'), [22, 9, 22, 11, 12, 7, 14, 18, 22, 16]);
  add(claims, T('UPI नोंदी'), [12, 7, 9, 18, 24, 11, 18, 12]);
  if (isAdmin()) add(mem, T('ॲप सभासद'), [20, 28, 9, 10, 12, 12]);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const r = await shareFile(blob, `Sachiv-hishob-${today}.xlsx`, `${S.society.name} ${T('हिशोब')}`);
  if (r === 'downloaded') toast(T('हिशोब डाउनलोड झाला (Excel मध्ये उघडा).'));
}

/* owner panel: every society, its plan, and a way to extend it after the society pays */
function sheetOwner() {
  let list = [], q = '';
  openSheet(`${sheetHead(T('मालक पॅनेल'))}
    <div class="grid2" id="oStats"></div>
    <input type="search" id="oQ" placeholder="${T('सोसायटी किंवा कोड शोधा')}" aria-label="${T('सोसायटी शोधा')}">
    <ul class="list" id="oList"><li class="muted small">${T('आणत आहे…')}</li></ul>`, el => {
    const draw = () => {
      const st = list.map(x => ({ x, p: planState(x) }));
      const paid = st.filter(o => !o.p.expired && !o.p.trial).length, trial = st.filter(o => o.p.trial).length, exp = st.filter(o => o.p.expired).length;
      const mrr = st.filter(o => !o.p.expired && !o.p.trial).reduce((a, o) => a + socPrice(o.x), 0), pot = st.filter(o => o.p.trial).reduce((a, o) => a + socPrice(o.x), 0);
      el.querySelector('#oStats').innerHTML = `<div class="card"><div class="tiny muted">${T('सशुल्क')}</div><b class="big good num">${paid}</b></div><div class="card"><div class="tiny muted">${T('मोफत / संपलेले')}</div><b class="big num">${trial} / <span class="bad">${exp}</span></b></div>
        <div class="card"><div class="tiny muted">${T('मासिक उत्पन्न')}</div><b class="big good num">${inr(mrr)}</b><div class="tiny muted">${T('वार्षिक {0}', inr(mrr * 12))}</div></div><div class="card"><div class="tiny muted">${T('मोफत कालावधीतून शक्य')}</div><b class="big num">${inr(pot)}</b><div class="tiny muted">${T('/ महिना')}</div></div>`;
      const rows = st.filter(({ x }) => !q || (x.name || '').toLowerCase().includes(q) || (x.code || '').toLowerCase().includes(q));
      el.querySelector('#oList').innerHTML = rows.length ? rows.map(({ x, p }) => `<li><span class="grow"><b>${esc(x.name)}</b><span class="tiny muted">${T('{0} सदनिका', (x.flats || []).length)} · ${inr(socPrice(x))}${T('/ महिना')} · ${esc(x.code || '')} · ${T('नोंद')} ${fmtTs(x.createdAt || Date.now())}</span></span>
        <span class="pill ${p.expired ? 'due' : p.trial ? 'wait' : 'ok'}">${p.expired ? T('संपले') : p.trial ? `${T('मोफत')} ${p.left}${T('दि')}` : fmtTs(p.end)}</span>
        <button class="btn small" type="button" data-plan="${x.id}">${T('बदला')}</button></li>`).join('') : `<li class="muted small">${T('काही नाही.')}</li>`;
    };
    el.querySelector('#oQ').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
    el.addEventListener('click', e => { const b = e.target.closest('[data-plan]'); if (b) { const x = list.find(y => y.id === b.dataset.plan); if (x) sheetPlan(x); } });
    return B.watchAllSocieties(l => { list = l; draw(); }, e => { el.querySelector('#oList').innerHTML = `<li class="bad small">${esc(errMsg(e))}</li>`; });
  });
}

function sheetPlan(x) {
  const p = planState(x), base = Math.max(Date.now(), p.end);
  openSheet(`${sheetHead(esc(x.name))}
    <div class="small">${T('सध्या')}: <b>${p.expired ? T('संपले') : p.trial ? T('मोफत कालावधी') : T('सशुल्क')}</b> · ${T('{0} पर्यंत', fmtTs(p.end))}</div>
    <div class="card tint small">${priceLine(x)} · <span id="plAmt"></span></div>
    <div class="chips">${[[1, `+${T('1 महिना')}`], [3, `+${T('3 महिने')}`], [6, `+${T('6 महिने')}`], [12, `+${T('1 वर्ष')}`]].map(([n, l]) => `<button class="chip" type="button" data-add="${n}">${l}</button>`).join('')}</div>
    <div class="field"><label for="plDate">${T('सदस्यत्व या दिवसापर्यंत')}</label><input type="date" id="plDate" value="${isoDay(base)}"></div>
    <button class="btn primary block" type="button" id="plSave">${T('जतन करा')}</button>
    <button class="btn block danger" type="button" id="plStop">${T('आताच बंद करा')}</button>
    <button class="btn block" type="button" id="plBack">‹ ${T('सर्व सोसायट्या')}</button>`, el => {
    const inp = el.querySelector('#plDate');
    el.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { inp.value = isoDay(addMonthsTs(base, +b.dataset.add)); el.querySelectorAll('[data-add]').forEach(c => c.setAttribute('aria-pressed', String(c === b))); el.querySelector('#plAmt').innerHTML = T('{0} महिने = {1}', b.dataset.add, `<b class="num">${inr(socPrice(x) * b.dataset.add)}</b>`); }));
    el.querySelector('#plSave').addEventListener('click', async () => {
      if (!inp.value) return;
      const until = new Date(inp.value + 'T23:59:59').getTime();
      try { await B.setPlan(x.id, { paidUntil: until, lastPaidAt: Date.now() }); toast(`${x.name}: ${T('{0} पर्यंत सुरू.', fmtTs(until))}`); sheetOwner(); } catch (e) { fail(e); }
    });
    el.querySelector('#plStop').addEventListener('click', async () => {
      try { await B.setPlan(x.id, { paidUntil: 0, trialEnds: Date.now() }); toast(T('सदस्यत्व बंद केले.')); sheetOwner(); } catch (e) { fail(e); }
    });
    el.querySelector('#plBack').addEventListener('click', sheetOwner);
  });
}

function sheetDeleteAccount() {
  openSheet(`${sheetHead(T('खाते हटवा'))}
    <p class="small m0">${T('तुमचे Sachiv लॉगिन कायमचे हटवले जाईल आणि तुम्ही सर्व सोसायट्यांमधून बाहेर पडाल. सोसायटीच्या हिशोबातील नोंदी (भरणा, सूचना) सोसायटीच्या रेकॉर्डसाठी राहतील.')}</p>
    <p class="small m0 muted">${T('तुम्ही समितीत असाल, तर आधी दुसऱ्या सदस्याला समिती भूमिका द्या.')}</p>
    <form id="delForm" class="stack"><div class="field"><label for="dPass">${T('खात्री करण्यासाठी पासवर्ड टाका')}</label><input id="dPass" type="password" required autocomplete="current-password"></div>
    <button class="btn block danger-fill" type="submit">${T('खाते कायमचे हटवा')}</button></form>`, el => {
    el.querySelector('#delForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = el.querySelector('[type=submit]'); btn.disabled = true;
      try {
        await B.deleteAccount(el.querySelector('#dPass').value, Object.keys((S.userDoc && S.userDoc.societies) || {}));
        closeSheet(); S.sid = null; LS.set('sachiv-sid', null); authMode = 'login'; toast(T('तुमचे खाते हटवले.'));
      } catch (er) { toast(errMsg(er)); btn.disabled = false; }
    });
  });
}

/* ---------- events ---------- */
document.addEventListener('submit', async e => {
  const f = e.target; if (f.closest('.sheet')) return;
  e.preventDefault();
  if (f.id === 'authForm') {
    const email = $('#aEmail').value.trim(), pass = $('#aPass').value, btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try { if (authMode === 'signup') await B.signUp(email, pass, $('#aName').value.trim()); else await B.signIn(email, pass); }
    catch (er) { toast(errMsg(er)); btn.disabled = false; }
  }
  if (f.id === 'joinForm') startJoin($('#jCode').value);
});

document.addEventListener('click', async e => {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  if (d.tel) { e.preventDefault(); openExternal('tel:' + d.tel); return; }
  if (d.waTo) { openExternal(waLink(d.waTo, '')); return; }
  if (d.setlang) { if (d.setlang !== LANG) setLang(d.setlang); return; }
  if (t.closest('.sheet')) return;
  try {
    if (locked() && (['newnotice', 'newminutes', 'reminders', 'newmsg', 'newfund', 'upload'].includes(d.act) || d.pay || d.claimOk || d.claimNo || d.mok || d.ctoggle || d.medit || d.msgpin || d.msgdel)) { toast(LOCK_MSG); return; }
    if (d.tab) { S.tab = d.tab; render(); window.scrollTo(0, 0); }
    else if (d.tabGo) { S.tab = d.tabGo; if (S.tab === 'ledger') ledgerFilter = 'due'; render(); window.scrollTo(0, 0); }
    else if (d.auth) { authMode = d.auth; render(); }
    else if (d.act === 'forgot') { const em = ($('#aEmail') || {}).value; if (!em) { toast(T('आधी ईमेल लिहा.')); return; } await B.resetPassword(em.trim()); toast(T('पासवर्ड बदलण्याची लिंक ईमेलवर पाठवली.')); }
    else if (d.act === 'signout') { LS.set('sachiv-sid', null); authMode = 'login'; S.sid = null; await B.signOut(); }
    else if (d.act === 'create') sheetSetup(true);
    else if (d.act === 'owner') sheetOwner();
    else if (d.act === 'verify') { await B.sendVerification(); toast(T('लिंक पाठवली. ईमेल उघडा (Spam सुद्धा तपासा).')); }
    else if (d.act === 'verified') { const ok = await B.refreshUser(); toast(ok ? T('ईमेल पडताळले. मालक पॅनेल सुरू.') : T('अजून पडताळले नाही. ईमेलमधील लिंक उघडा.')); }
    else if (d.act === 'delacct') sheetDeleteAccount();
    else if (d.act === 'support') openExternal(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${T('Sachiv सदस्यत्व')}: ` + S.society.name + ' (' + S.society.code + ')')}`);
    else if (d.act === 'setup') sheetSetup(false);
    else if (d.act === 'switch') sheetSwitch();
    else if (d.act === 'leave') { const sid = S.sid; if (S.member) await B.removeMember(sid, S.user.uid); await B.leaveIndex(S.user.uid, sid); S.sid = null; LS.set('sachiv-sid', null); }
    else if (d.act === 'newnotice') sheetNotice();
    else if (d.act === 'newminutes') sheetMinutes();
    else if (d.act === 'reminders') sheetReminders();
    else if (d.act === 'newcomplaint') sheetComplaint();
    else if (d.act === 'newmsg') sheetMessage();
    else if (d.act === 'quick') sheetQuick();
    else if (d.act === 'poster') sheetPoster();
    else if (d.act === 'pricing') sheetPricing();
    else if (d.act === 'inbox') sheetInbox();
    else if (d.act === 'editcommittee') sheetCommittee();
    else if (d.act === 'editcontacts') sheetContacts();
    else if (d.act === 'dashcfg') sheetDashboard();
    else if (d.act === 'newfund') sheetFundEdit(null);
    else if (d.act === 'upload') sheetUpload();
    else if (d.act === 'exportcsv') await exportLedger();
    else if (d.mseg) { msgSeg = d.mseg; render(); }
    else if (d.folder) { fileFolder = d.folder; render(); }
    else if (d.fund) sheetFund(d.fund);
    else if (d.file) await openFile(d.file);
    else if (d.msgwa) { const m = S.messages.find(x => x.id === d.msgwa); if (m) openExternal(waLink('', `*${S.society.name}*\n${m.important ? `*${T('महत्त्वाची घोषणा')}*\n` : ''}${m.text}\n\n- ${T(m.byPost || 'समिती')}`)); }
    else if (d.msgpin) { const m = S.messages.find(x => x.id === d.msgpin); if (m) await B.saveMessage(S.sid, { ...m, pinned: !m.pinned }); }
    else if (d.msgdel) { if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = T('नक्की?'); return; } await B.deleteMessage(S.sid, d.msgdel); toast(T('घोषणा हटवली.')); }
    else if (d.act === 'invite') {
      const txt = `${S.society.name}\n${T('आपल्या सोसायटीचे देखभाल शुल्क, सूचना आणि तक्रारी आता Sachiv ॲपमध्ये.')}\n${T('1. Sachiv ॲप उघडा आणि नवीन खाते तयार करा.')}\n${T('2. जॉइन कोड टाका')}: ${S.society.code}\n${T('3. तुमची सदनिका निवडा.')}\n${T('धन्यवाद')},\n${T('सचिव')}`;
      openExternal(waLink('', `${txt}\n\n${T('थेट जॉइन लिंक')}: ${joinUrl(S.society.code)}`));
    }
    else if (d.act === 'pay') sheetPayChoice();
    else if (d.act === 'ipaid') sheetIPaid();
    else if (d.month) { ledgerMonth = addMonth(ledgerMonth, +d.month); if (ledgerMonth > thisMonth) ledgerMonth = thisMonth; render(); }
    else if (d.lf) { ledgerFilter = d.lf; render(); }
    else if (d.cf) { complaintFilter = d.cf; render(); }
    else if (d.rcpt) {
      const flatId = d.rflat || S.member.flatId, p = ((S.accounts[flatId] || {}).payments || {})[d.rcpt];
      if (p) openReceipt(maintReceipt(flatId, d.rcpt, p));
    }
    else if (d.pay) sheetPay(d.pay);
    else if (d.claimOk) {
      const c = S.claims.find(x => x.id === d.claimOk); if (!c) return;
      if (c.fundId) {
        const fund = S.funds.find(x => x.id === c.fundId), prevF = fund && (fund.paid || {})[c.flatId];
        const recF = { amount: (prevF ? Number(prevF.amount) : 0) + Number(c.amount), date: c.date, mode: 'UPI', ref: c.ref || '', at: Date.now(), by: S.user.name, payer: c.name || '', no: await newRcptNo(c.date) };
        await B.setFundPaid(S.sid, c.fundId, c.flatId, recF);
        await B.updateClaim(S.sid, c.id, { status: 'approved', decidedBy: S.user.uid, decidedAt: Date.now() });
        toast(`${c.flatId}: ${rs(c.amount)} ${T('वर्गणी मंजूर.')}`); if (fund) openReceipt(fundReceipt(fund, c.flatId, recF)); return;
      }
      const prev = ((S.accounts[c.flatId] || {}).payments || {})[c.month];
      const ms = Array.isArray(c.months) && c.months.length ? c.months : [c.month];
      const map = allocate(c.flatId, ms, ms.length > 1 ? Number(c.amount) : (prev ? Number(prev.amount) : 0) + Number(c.amount) - (prev ? Number(prev.amount) : 0), { date: c.date, mode: 'UPI', ref: c.ref || '', at: Date.now(), by: S.user.name, payer: c.name || '', no: await newRcptNo(c.date) });
      const recM = map[ms[0]];
      await B.setPayments(S.sid, c.flatId, map);
      await B.updateClaim(S.sid, c.id, { status: 'approved', decidedBy: S.user.uid, decidedAt: Date.now() });
      toast(`${c.flatId}: ${rs(c.amount)} ${T('मंजूर करून खात्यात जमा केले.')}`); openReceipt(maintReceipt(c.flatId, c.month, recM));
    }
    else if (d.claimNo) { await B.updateClaim(S.sid, d.claimNo, { status: 'rejected', decidedBy: S.user.uid, decidedAt: Date.now() }); toast(T('भरणा नाकारला.')); }
    else if (d.mok) { const sel = document.querySelector(`[data-mflat="${d.mok}"]`); const flatId = sel ? sel.value : ''; if (!flatId) { toast(T('आधी सदनिका निवडा.')); return; } await B.updateMember(S.sid, d.mok, { status: 'active', flatId }); toast(T('सभासद मंजूर केला.')); }
    else if (d.mno) { await B.removeMember(S.sid, d.mno); toast(T('विनंती नाकारली.')); }
    else if (d.medit) sheetEditMember(d.medit);
    else if (d.ctoggle) { const c = S.complaints.find(x => x.id === d.ctoggle); if (c) await B.updateComplaint(S.sid, c.id, { status: c.status === 'closed' ? 'open' : 'closed' }); }
    else if (d.opennotice) { const n = S.notices.find(x => x.id === d.opennotice); if (n) sheetViewNotice(n); }
  } catch (er) { fail(er); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#sheetRoot').innerHTML) closeSheet(); });
if (B.kind === 'mock') document.documentElement.dataset.mock = '1';
render();
