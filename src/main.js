import '@fontsource/hind/devanagari-400.css';
import '@fontsource/hind/devanagari-600.css';
import '@fontsource/hind/devanagari-700.css';
import '@fontsource/hind/400.css';
import '@fontsource/hind/600.css';
import '@fontsource/hind/700.css';
import '@fontsource/tiro-devanagari-marathi/devanagari-400.css';
import '@fontsource/tiro-devanagari-marathi/400.css';
import './style.css';
import { backend as B } from './backend.js';
import { NOTICE_TEMPLATES, MINUTES_TYPES, RESOLUTION_PHRASES } from './templates.js';
import { drawLetterhead } from './letterhead.js';
import { openExternal, upiLink, waLink, shareImage, copyText, isNative } from './platform.js';
import { OWNER_EMAIL, SUPPORT_EMAIL, TRIAL_DAYS } from './config.js';

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rs = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const MONTHS = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = n => String(n).padStart(2, '0');
const now = new Date();
const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const monthName = k => { const [y, m] = k.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
const addMonth = (k, d) => { let [y, m] = k.split('-').map(Number); m += d; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${pad(m)}`; };
const monthsBetween = (a, b) => { const out = []; if (!a || a > b) return out; let k = a; while (k <= b) { out.push(k); k = addMonth(k, 1); } return out; };
const fmtDate = (iso, lang = 'mr') => { if (!iso) return '…'; const [y, m, d] = iso.split('-').map(Number); return lang === 'en' ? `${d} ${MONTHS_EN[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]} ${y}`; };
const plural = n => n === 1 ? 'महिना' : 'महिने';
let toastT;
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3400); };
const errMsg = e => {
  const c = e && e.code;
  return ({
    'auth/invalid-credential': 'ईमेल किंवा पासवर्ड चुकीचा आहे.', 'auth/wrong-password': 'ईमेल किंवा पासवर्ड चुकीचा आहे.', 'auth/user-not-found': 'या ईमेलचे खाते नाही. आधी नोंदणी करा.',
    'auth/email-already-in-use': 'या ईमेलचे खाते आधीच आहे. लॉगिन करा.', 'auth/weak-password': 'पासवर्ड किमान ६ अक्षरांचा हवा.', 'auth/invalid-email': 'ईमेल पत्ता नीट तपासा.',
    'auth/network-request-failed': 'इंटरनेट कनेक्शन तपासा.', 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'ॲप अजून Firebase शी जोडलेले नाही (src/config.js भरा).', 'auth/operation-not-allowed': 'Firebase मध्ये Email/Password लॉगिन चालू करा.', 'auth/too-many-requests': 'खूप प्रयत्न झाले. थोड्या वेळाने पुन्हा करा.', 'auth/requires-recent-login': 'पुन्हा लॉगिन करून प्रयत्न करा.', 'auth/missing-password': 'पासवर्ड टाका.', 'permission-denied': 'हे करण्याची परवानगी नाही.', 'unavailable': 'इंटरनेट कनेक्शन तपासा.'
  })[c] || 'काहीतरी चुकले. पुन्हा प्रयत्न करा.';
};
const fail = e => { console.error(e); toast(errMsg(e)); };
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
  rupee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12M6 9h12M9 4c3 0 5 1.6 5 5s-2 5-5 5H6l8 7"/></svg>'
};

/* ---------- state ---------- */
const S = { user: null, userDoc: null, sid: null, member: undefined, society: null, members: [], accounts: {}, myAccount: null, claims: [], notices: [], complaints: [], tab: 'home' };
let subs = [], userSub = null, memberSub = null;
const unsubAll = () => { subs.forEach(u => { try { u(); } catch (e) {} }); subs = []; };
const isAdmin = () => S.member && S.member.status === 'active' && S.member.role === 'admin';
const isActive = () => S.member && S.member.status === 'active';
const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
let ledgerMonth = thisMonth, ledgerFilter = 'due', complaintFilter = 'open';

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
const LOCK_MSG = 'सदस्यत्व संपले आहे. सुरू ठेवण्यासाठी Sachiv शी संपर्क करा.';
function planBanner(always) {
  const p = planState(S.society);
  if (p.expired) return `<div class="card lock stack"><b>सदस्यत्व संपले (${fmtTs(p.end)})</b>
    <span class="small">भरणा नोंदी, सूचना आणि आठवणी सध्या बंद आहेत. सभासदांना त्यांची थकबाकी आणि जुन्या सूचना दिसत राहतील. सुरू ठेवण्यासाठी Sachiv शी संपर्क करा.</span>
    <button class="btn" type="button" data-act="support">संपर्क: ${esc(SUPPORT_EMAIL)}</button></div>`;
  if (p.trial) return `<div class="card tint small row between wrap"><span>मोफत कालावधी: <b class="num">${p.left} दिवस</b> बाकी</span><span class="tiny muted">${fmtTs(p.end)} पर्यंत</span></div>`;
  if (p.left <= 7) return `<div class="card tint small row between wrap"><span>सदस्यत्व ${fmtTs(p.end)} ला संपेल</span><b class="bad num">${p.left} दिवस बाकी</b></div>`;
  return always ? `<div class="card small row between wrap"><span>सदस्यत्व</span><span class="muted">${fmtTs(p.end)} पर्यंत</span></div>` : '';
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
function reminderText(f, due) {
  const n = monthsDue(due);
  return `नमस्कार ${f.owner || ''},\n${S.society.name}\nसदनिका ${f.id} ची देखभाल थकबाकी ${rs(due)}${n > 1 ? ` (${n} महिने)` : ''} आहे.\nकृपया Sachiv ॲपमधून UPI द्वारे भरा${S.society.upi ? ` किंवा थेट UPI: ${S.society.upi} वर भरा` : ''}.\nधन्यवाद,\nसचिव`;
}

/* ---------- auth + society wiring ---------- */
B.onAuth(u => {
  S.user = u; S.userDoc = null; S.member = undefined; unsubAll();
  if (userSub) { userSub(); userSub = null; } if (memberSub) { memberSub(); memberSub = null; }
  if (u) userSub = B.watchUser(u.uid, d => { S.userDoc = d; pickSociety(); render(); }, fail);
  render();
});

function pickSociety() {
  const list = Object.keys((S.userDoc && S.userDoc.societies) || {});
  let sid = S.sid && list.includes(S.sid) ? S.sid : (LS.get('sachiv-sid') && list.includes(LS.get('sachiv-sid')) ? LS.get('sachiv-sid') : list[0] || null);
  if (sid !== S.sid || (sid && !memberSub)) selectSociety(sid);
}

function selectSociety(sid) {
  unsubAll(); if (memberSub) { memberSub(); memberSub = null; }
  Object.assign(S, { sid, member: undefined, society: null, members: [], accounts: {}, myAccount: null, claims: [], notices: [], complaints: [], tab: 'home' });
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
function render() {
  const head = $('#head'), v = $('#view'), tabs = $('#tabs');
  if (!S.user) { head.innerHTML = brand() + `<div class="soc"><h1>हाऊसिंग सोसायटीचा डिजिटल सचिव</h1><div class="sub">देखभाल शुल्क, सूचना, इतिवृत्त आणि तक्रारी, एकाच ॲपमध्ये.</div></div>`; tabs.innerHTML = ''; v.innerHTML = viewAuth(); return; }
  if (!S.userDoc) { head.innerHTML = brand(); tabs.innerHTML = ''; v.innerHTML = loading(); return; }
  const socs = (S.userDoc && S.userDoc.societies) || {};
  if (!S.sid) { head.innerHTML = brand() + `<div class="soc"><div class="kicker">नमस्कार, ${esc(S.user.name)}</div><h1>तुमची सोसायटी जोडा</h1></div>`; tabs.innerHTML = ''; v.innerHTML = viewOnboard(); return; }
  const sname = (socs[S.sid] || {}).name || '';
  if (S.member === undefined) { head.innerHTML = brand() + socHead(sname); tabs.innerHTML = ''; v.innerHTML = loading(); return; }
  if (!S.member) { head.innerHTML = brand() + socHead(sname); tabs.innerHTML = ''; v.innerHTML = viewGone(sname); return; }
  if (S.member.status !== 'active') { head.innerHTML = brand() + socHead(sname); tabs.innerHTML = ''; v.innerHTML = viewPending(sname); return; }
  if (!S.society) { head.innerHTML = brand() + socHead(sname); tabs.innerHTML = ''; v.innerHTML = loading(); return; }
  head.innerHTML = brand() + socHead(S.society.name, true);
  const T = isAdmin()
    ? [['home', 'मुख्य', IC.home], ['ledger', 'खाते', IC.ledger], ['notices', 'सूचना', IC.doc], ['complaints', 'तक्रारी', IC.chat], ['members', 'सदस्य', IC.people]]
    : [['home', 'मुख्य', IC.home], ['notices', 'सूचना', IC.doc], ['complaints', 'तक्रारी', IC.chat], ['me', 'माझे', IC.user]];
  if (!T.some(t => t[0] === S.tab)) S.tab = 'home';
  tabs.innerHTML = `<nav aria-label="मुख्य मेनू">${T.map(([k, l, ic]) => `<button type="button" data-tab="${k}" ${k === S.tab ? 'aria-current="page"' : ''}>${ic}<span>${l}</span>${k === 'home' && isAdmin() && pendingCount() ? `<i class="dot" aria-label="${pendingCount()} प्रलंबित"></i>` : ''}</button>`).join('')}</nav>`;
  tabs.querySelector('nav').style.gridTemplateColumns = `repeat(${T.length}, minmax(0, 1fr))`;
  v.innerHTML = (isAdmin()
    ? { home: aHome, ledger: aLedger, notices: vNotices, complaints: vComplaints, members: aMembers }
    : { home: rHome, notices: vNotices, complaints: vComplaints, me: rMe })[S.tab]();
}
const pendingCount = () => S.claims.filter(c => c.status === 'pending').length + S.members.filter(m => m.status === 'pending').length;
const brand = () => `<div class="brand"><span class="mark" aria-hidden="true">स</span><b>Sachiv</b>${S.user ? `<button class="mode" type="button" data-act="switch">${Object.keys((S.userDoc && S.userDoc.societies) || {}).length > 1 ? 'सोसायटी बदला' : '+ सोसायटी'}</button>` : ''}</div>`;
const socHead = (name, full) => `<div class="soc"><div class="kicker">${S.member && S.member.status === 'active' ? (isAdmin() ? 'समिती' : 'सभासद · सदनिका ' + esc(S.member.flatId || '—')) : 'सोसायटी'}</div><h1>${esc(name)}</h1>${full ? `<div class="sub">${flats().length} सदनिका${S.society.address ? ' · ' + esc(S.society.address) : ''}</div>` : ''}</div>`;
const loading = () => `<div class="card empty muted">माहिती आणत आहे…</div>`;

/* ---------- auth + onboarding views ---------- */
let authMode = 'login';
function viewAuth() {
  const su = authMode === 'signup';
  return `<form class="card stack" id="authForm">
    <div class="seg" role="group" aria-label="लॉगिन किंवा नोंदणी"><button type="button" class="chip" data-auth="login" aria-pressed="${!su}">लॉगिन</button><button type="button" class="chip" data-auth="signup" aria-pressed="${su}">नवीन खाते</button></div>
    ${su ? `<div class="field"><label for="aName">तुमचे नाव</label><input id="aName" type="text" required autocomplete="name"></div>` : ''}
    <div class="field"><label for="aEmail">ईमेल</label><input id="aEmail" type="email" required autocomplete="email" inputmode="email"></div>
    <div class="field"><label for="aPass">पासवर्ड ${su ? '<span class="hint">(किमान ६ अक्षरे)</span>' : ''}</label><input id="aPass" type="password" required minlength="6" autocomplete="${su ? 'new-password' : 'current-password'}"></div>
    <button class="btn primary block" type="submit">${su ? 'खाते तयार करा' : 'लॉगिन करा'}</button>
    ${su ? '' : `<button class="link" type="button" data-act="forgot">पासवर्ड विसरलात?</button>`}
  </form>
  <p class="tiny muted center">समिती सदस्य आणि सर्व सभासद, दोघेही इथूनच लॉगिन करतात.</p>`;
}
function viewOnboard() {
  return `<div class="card stack"><b>समिती सदस्य आहात?</b><p class="small muted m0">तुमच्या सोसायटीची नोंद करा. तुम्हाला एक जॉइन कोड मिळेल, तो सभासदांना पाठवा.</p>
      <button class="btn primary block" type="button" data-act="create">नवीन सोसायटी नोंदवा</button></div>
    <div class="card stack"><b>सभासद आहात?</b><p class="small muted m0">समितीकडून मिळालेला ६ अक्षरी जॉइन कोड टाका.</p>
      <form id="joinForm" class="stack"><div class="field"><label for="jCode">जॉइन कोड</label><input id="jCode" type="text" required maxlength="6" autocapitalize="characters" placeholder="उदा. K7MP2Q" style="text-transform:uppercase;letter-spacing:.15em"></div>
      <button class="btn block" type="submit">पुढे</button></form></div>
    ${ownerCard()}
    <button class="btn block" type="button" data-act="signout">लॉगआउट</button>
    <button class="link danger" type="button" data-act="delacct">खाते हटवा</button>`;
}
function viewPending(name) {
  return `<div class="card stack"><b>विनंती पाठवली आहे</b><p class="small muted m0">${esc(name)} च्या समितीने मंजुरी दिल्यावर तुम्हाला तुमची थकबाकी, सूचना आणि तक्रारी इथे दिसतील. समितीला कळवा की तुम्ही नोंदणी केली आहे.</p></div>
    <button class="btn block" type="button" data-act="leave">विनंती रद्द करा</button><button class="btn block" type="button" data-act="signout">लॉगआउट</button>`;
}
function viewGone(name) {
  return `<div class="card stack"><b>प्रवेश नाही</b><p class="small muted m0">तुम्ही आता ${esc(name)} चे सदस्य नाही, किंवा समितीने विनंती नाकारली आहे.</p></div>
    <button class="btn primary block" type="button" data-act="leave">यादीतून काढा</button><button class="btn block" type="button" data-act="signout">लॉगआउट</button>`;
}

/* ---------- admin views ---------- */
function aHome() {
  const s = monthSummary(thisMonth), n = flats().length, pct = n ? Math.round(s.clear / n * 100) : 0;
  const pc = S.claims.filter(c => c.status === 'pending'), pm = S.members.filter(m => m.status === 'pending');
  const agmYear = now.getMonth() + 1 > 9 ? now.getFullYear() + 1 : now.getFullYear(), days = Math.ceil((new Date(agmYear, 8, 30) - now) / 864e5);
  return `
    ${planBanner(false)}
    ${!n ? `<div class="card tint stack"><b>पहिली पायरी: सदनिकांची यादी भरा</b><span class="small">खाते आणि आठवणी सुरू करण्यासाठी सदस्य टॅबमधून सदनिका जोडा.</span><button class="btn primary" type="button" data-act="setup">सदनिका जोडा</button></div>` : ''}
    ${pc.length ? `<h2>मंजुरीसाठी भरणा · ${pc.length}</h2><ul class="list">${pc.map(c => `<li><span class="flat">${esc(c.flatId)}</span><span class="grow"><b class="num">${rs(c.amount)}</b><span class="tiny muted">${esc(c.name || '')} · ${monthName(c.month)} · ${esc(fmtDate(c.date))}${c.ref ? ' · Ref ' + esc(c.ref) : ''}</span></span><span class="row g6"><button class="btn small good" type="button" data-claim-ok="${c.id}">मंजूर</button><button class="btn small" type="button" data-claim-no="${c.id}" aria-label="नाकारा">✕</button></span></li>`).join('')}</ul>` : ''}
    ${pm.length ? `<button class="card tint row between btnlike" type="button" data-tab-go="members"><b>${pm.length} नवीन सभासद विनंत्या</b><span>पाहा ›</span></button>` : ''}
    <button class="card btnlike" type="button" data-tab-go="ledger">
      <div class="row between"><b>${MONTHS[now.getMonth()]} देखभाल शुल्क</b><span class="small muted num">${s.clear} / ${n} थकबाकीमुक्त</span></div>
      <div class="bar" role="img" aria-label="${pct}% सदनिकांची थकबाकी नाही"><i style="width:${pct}%"></i></div>
      <div class="row between small wrap"><span class="good num b6">या महिन्यात जमा ${rs(s.collected)}</span><span class="bad num b6">थकबाकी ${rs(s.dueTotal)} · ${s.dueFlats}</span></div>
    </button>
    <div class="grid2">
      <button class="tile primary" type="button" data-act="newnotice">${IC.doc}<b>सूचना बनवा</b><span>तयार मसुदे, लेटरहेडवर</span></button>
      <button class="tile" type="button" data-act="newminutes">${IC.doc}<b>इतिवृत्त बनवा</b><span>सभेचे ठराव</span></button>
      <button class="tile" type="button" data-act="reminders">${IC.wa}<b>थकबाकी आठवण</b><span>${s.dueFlats} सदनिकांना</span></button>
      <button class="tile" type="button" data-tab-go="complaints">${IC.chat}<b>तक्रारी</b><span>${S.complaints.filter(c => c.status !== 'closed').length} उघड्या</span></button>
    </div>
    <div class="card tint small"><b>वार्षिक सर्वसाधारण सभा</b><br>३० सप्टेंबर ${agmYear} पूर्वी घ्यावी लागते. आणखी ${days} दिवस बाकी.</div>
    <div class="card row between wrap"><span class="small">सभासदांसाठी जॉइन कोड: <b class="code">${esc(S.society.code)}</b></span><button class="btn small" type="button" data-act="invite">${IC.share} पाठवा</button></div>`;
}

function aLedger() {
  const m = ledgerMonth, s = monthSummary(m);
  let rows = flats().map(f => ({ f, due: dueFor(f.id, m), pay: ((S.accounts[f.id] || {}).payments || {})[m] }));
  if (ledgerFilter === 'due') rows = rows.filter(r => r.due > 0);
  if (ledgerFilter === 'paid') rows = rows.filter(r => r.pay);
  return `
    <div class="row between"><button class="btn small" type="button" data-month="-1" aria-label="मागील महिना">‹</button><b>${monthName(m)}</b><button class="btn small" type="button" data-month="1" aria-label="पुढील महिना" ${m >= thisMonth ? 'disabled' : ''}>›</button></div>
    <div class="grid2">
      <div class="card"><div class="tiny muted">या महिन्यात जमा</div><b class="good num big">${rs(s.collected)}</b><div class="tiny muted">${s.paidCount} सदनिका</div></div>
      <div class="card"><div class="tiny muted">एकूण थकबाकी</div><b class="bad num big">${rs(s.dueTotal)}</b><div class="tiny muted">${s.dueFlats} सदनिका</div></div>
    </div>
    <div class="chips" role="group" aria-label="फिल्टर">${[['due', `थकबाकी ${s.dueFlats}`], ['paid', `या महिन्यात भरले ${s.paidCount}`], ['all', `सर्व ${flats().length}`]].map(([k, l]) => `<button class="chip" type="button" data-lf="${k}" aria-pressed="${ledgerFilter === k}">${l}</button>`).join('')}</div>
    ${rows.length ? `<ul class="list">${rows.map(({ f, due, pay }) => `<li>
      <span class="flat">${esc(f.id)}</span>
      <span class="grow"><span>${esc(f.owner || '')}</span><span class="tiny muted">${pay ? `भरले ${rs(pay.amount)} · ${esc(fmtDate(pay.date))} · ${esc(pay.mode)}` : due > 0 ? `${monthsDue(due)} ${plural(monthsDue(due))} बाकी` : 'थकबाकी नाही'}</span></span>
      ${due > 0 ? `<span class="pill due num">${rs(due)}</span>` : `<span class="pill ok">✓</span>`}
      <button class="btn small" type="button" data-pay="${esc(f.id)}">${pay ? 'बदला' : 'जमा'}</button></li>`).join('')}</ul>`
      : `<div class="card empty muted">${flats().length ? (ledgerFilter === 'due' ? 'कोणाचीही थकबाकी नाही.' : 'काही नोंदी नाहीत.') : 'आधी सदस्य टॅबमधून सदनिका जोडा.'}</div>`}
    ${s.dueFlats ? `<button class="btn primary block" type="button" data-act="reminders">${IC.wa} ${s.dueFlats} जणांना आठवण पाठवा</button>` : ''}`;
}

function aMembers() {
  const pend = S.members.filter(m => m.status === 'pending'), act = S.members.filter(m => m.status === 'active').sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1));
  const flatOpts = sel => `<option value="">सदनिका निवडा</option>` + flats().map(f => `<option ${f.id === sel ? 'selected' : ''}>${esc(f.id)}</option>`).join('');
  return `
    <div class="card stack"><div class="row between wrap"><span>जॉइन कोड</span><b class="code big">${esc(S.society.code)}</b></div>
      <span class="small muted">सभासदांनी Sachiv ॲपमध्ये नवीन खाते तयार करून हा कोड टाकावा. नंतर तुम्ही खाली मंजुरी द्या.</span>
      <button class="btn block" type="button" data-act="invite">${IC.share} WhatsApp वर आमंत्रण पाठवा</button></div>
    ${pend.length ? `<h2>नवीन विनंत्या · ${pend.length}</h2><ul class="list">${pend.map(m => `<li class="wrap"><span class="grow"><b>${esc(m.name)}</b><span class="tiny muted">${esc(m.email)} · सांगितलेली सदनिका: ${esc(m.flatId || '—')}</span></span>
        <span class="row g6 wrap"><select class="sm" data-mflat="${m.id}" aria-label="सदनिका">${flatOpts(flats().some(f => f.id === m.flatId) ? m.flatId : '')}</select><button class="btn small good" type="button" data-mok="${m.id}">मंजूर</button><button class="btn small" type="button" data-mno="${m.id}" aria-label="नाकारा">✕</button></span></li>`).join('')}</ul>` : ''}
    <h2>सदस्य · ${act.length}</h2>
    <ul class="list">${act.map(m => `<li><span class="grow"><b>${esc(m.name)}${m.id === S.user.uid ? ' (तुम्ही)' : ''}</b><span class="tiny muted">${m.role === 'admin' ? 'समिती' : 'सभासद'} · सदनिका ${esc(m.flatId || '—')}</span></span>
      ${m.id === S.user.uid ? '' : `<button class="btn small" type="button" data-medit="${m.id}">बदला</button>`}</li>`).join('')}</ul>
    <div class="card stack"><b>सोसायटी आणि सदनिका</b><span class="small muted">${flats().length} सदनिका · ${rs(monthly())} प्रति महिना${S.society.upi ? ' · UPI ' + esc(S.society.upi) : ' · UPI आयडी भरलेला नाही'}</span>
      <button class="btn primary" type="button" data-act="setup">माहिती आणि सदनिका बदला</button></div>
    ${planBanner(true)}
    ${accountCard()}`;
}

/* ---------- resident views ---------- */
function rHome() {
  const f = flats().find(x => x.id === S.member.flatId);
  if (!f) return `<div class="card stack"><b>सदनिका जोडलेली नाही</b><span class="small muted">समितीने तुमची सदनिका यादीत जोडल्यावर तुमची थकबाकी इथे दिसेल.</span></div>${latestNotice()}`;
  const P = (S.myAccount && S.myAccount.payments) || {}, due = dueFor(f.id, thisMonth, P), n = monthsDue(due);
  const pending = S.claims.filter(c => c.status === 'pending');
  const payable = Math.max(0, due - pending.reduce((s, c) => s + Number(c.amount || 0), 0));
  const hist = Object.entries(P).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  return `
    <div class="card stack center">
      <span class="small muted">सदनिका ${esc(f.id)} · ${esc(f.owner || S.user.name)}</span>
      ${due > 0 ? `<b class="bad num huge">${rs(due)}</b><span class="small">थकबाकी${n > 1 ? ` · ${n} महिने` : ''}</span>` : `<b class="good huge">थकबाकी नाही</b><span class="small muted">${MONTHS[now.getMonth()]} पर्यंत सर्व भरलेले आहे.</span>`}
      ${pending.length ? `<span class="pill wait">${rs(pending.reduce((s, c) => s + Number(c.amount || 0), 0))} भरणा समितीच्या मंजुरीसाठी</span>` : ''}
      ${S.society.upi ? `<button class="btn primary block" type="button" data-act="pay" data-amt="${payable || monthly()}">${IC.rupee} ${payable > 0 ? `${rs(payable)} UPI ने भरा` : `पुढील महिन्याचे ${rs(monthly())} भरा`}</button>
        <button class="btn block" type="button" data-act="ipaid">आधीच भरले? नोंद करा</button>` : `<span class="small muted">समितीने अजून UPI आयडी जोडलेला नाही. समितीकडे थेट भरा.</span>`}
    </div>
    ${S.claims.filter(c => c.status !== 'pending').slice(0, 3).map(c => `<div class="card small row between"><span>${monthName(c.month)} · ${rs(c.amount)}</span><span class="pill ${c.status === 'approved' ? 'ok' : 'due'}">${c.status === 'approved' ? 'मंजूर' : 'नाकारले'}</span></div>`).join('')}
    ${latestNotice()}
    <h2>भरणा इतिहास</h2>
    ${hist.length ? `<ul class="list">${hist.map(([m, p]) => `<li><span class="grow"><b>${monthName(m)}</b><span class="tiny muted">${esc(fmtDate(p.date))} · ${esc(p.mode)}</span></span><span class="num b6">${rs(p.amount)}</span></li>`).join('')}</ul>` : `<div class="card empty muted small">अजून नोंद नाही.</div>`}`;
}
const latestNotice = () => { const n = S.notices[0]; return n ? `<button class="card btnlike stack" type="button" data-opennotice="${n.id}"><span class="tiny muted">नवीन ${n.kind === 'minutes' ? 'इतिवृत्त' : 'सूचना'}</span><b>${esc(n.heading)}</b><span class="small clamp">${esc(n.body)}</span></button>` : ''; };
function rMe() {
  return `<div class="card stack"><b>${esc(S.user.name)}</b><span class="small muted">${esc(S.user.email)}</span><span class="small">सदनिका ${esc(S.member.flatId || '—')} · ${esc(S.society.name)}</span></div>
    ${S.society.upi ? `<div class="card small">संस्थेचा UPI आयडी: <b>${esc(S.society.upi)}</b></div>` : ''}
    ${accountCard()}`;
}
const ownerCard = () => !isOwnerUser() ? '' : S.user.emailVerified
  ? `<button class="btn primary block" type="button" data-act="owner">मालक पॅनेल</button>`
  : `<div class="card tint stack small"><b>मालक पॅनेलसाठी ईमेल पडताळा</b><span>तुमच्या ईमेलवर पडताळणी लिंक पाठवू. ती उघडल्यावर "पडताळले" दाबा.</span>
     <div class="grid2"><button class="btn" type="button" data-act="verify">लिंक पाठवा</button><button class="btn" type="button" data-act="verified">पडताळले</button></div></div>`;
const accountCard = () => `${ownerCard()}<div class="card stack"><b>खाते</b><span class="small muted">${esc(S.user.email)}</span>
  <div class="grid2"><button class="btn" type="button" data-act="switch">दुसरी सोसायटी</button><button class="btn" type="button" data-act="signout">लॉगआउट</button></div>
  <button class="link danger" type="button" data-act="delacct">खाते हटवा</button></div>`;

/* ---------- shared views ---------- */
function vNotices() {
  return `${isAdmin() ? `<div class="grid2"><button class="tile primary" type="button" data-act="newnotice">${IC.doc}<b>नवीन सूचना</b><span>पाणी, सभा, दुरुस्ती…</span></button><button class="tile" type="button" data-act="newminutes">${IC.doc}<b>नवीन इतिवृत्त</b><span>सभेचे ठराव</span></button></div>` : ''}
    <h2>सूचना फलक</h2>
    ${S.notices.length ? `<ul class="list">${S.notices.map(n => `<li><span class="grow"><b>${esc(n.heading)}</b><span class="tiny muted">${n.kind === 'minutes' ? 'इतिवृत्त' : 'सूचना'} · ${esc(n.dateLine || '')}</span></span><button class="btn small" type="button" data-opennotice="${n.id}">उघडा</button></li>`).join('')}</ul>` : `<div class="card empty muted">अजून काही सूचना नाहीत.</div>`}`;
}
function vComplaints() {
  const list = S.complaints.filter(c => complaintFilter === 'all' || (complaintFilter === 'open' ? c.status !== 'closed' : c.status === 'closed'));
  const open = S.complaints.filter(c => c.status !== 'closed').length;
  return `<button class="btn primary block" type="button" data-act="newcomplaint">नवीन तक्रार नोंदवा</button>
    <div class="chips">${[['open', `उघड्या ${open}`], ['closed', `सोडवलेल्या ${S.complaints.length - open}`], ['all', 'सर्व']].map(([k, l]) => `<button class="chip" type="button" data-cf="${k}" aria-pressed="${complaintFilter === k}">${l}</button>`).join('')}</div>
    ${list.length ? `<ul class="list">${list.map(c => `<li><span class="flat">${esc(c.flatId || '—')}</span><span class="grow"><span>${esc(c.text)}</span><span class="tiny muted">${esc(c.name || '')} · ${esc(fmtDate(new Date(c.createdAt).toISOString().slice(0, 10)))}${c.status === 'closed' ? ' · सोडवली' : ''}</span></span>
      ${isAdmin() ? `<button class="btn small" type="button" data-ctoggle="${c.id}">${c.status === 'closed' ? 'पुन्हा उघडा' : 'सोडवली'}</button>` : `<span class="pill ${c.status === 'closed' ? 'ok' : 'wait'}">${c.status === 'closed' ? 'सोडवली' : 'उघडी'}</span>`}</li>`).join('')}</ul>` : `<div class="card empty muted">इथे काही नाही.</div>`}`;
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
const sheetHead = t => `<div class="row between"><h3>${t}</h3><button class="btn small" type="button" data-close>बंद</button></div>`;

function sheetSetup(isNew) {
  const p = isNew ? { startMonth: thisMonth } : S.society;
  const flatsText = (p.flats || []).map(f => [f.id, f.owner, f.phone].concat(f.opening ? [f.opening] : []).join(', ')).join('\n');
  openSheet(`${sheetHead(isNew ? 'नवीन सोसायटी' : 'सोसायटीची माहिती')}
    <form id="setupForm" class="stack">
      <div class="field"><label for="sName">सोसायटीचे पूर्ण नाव</label><input type="text" id="sName" required value="${esc(p.name || '')}" placeholder="……… सहकारी गृहनिर्माण संस्था मर्या."></div>
      <div class="field"><label for="sAddr">पत्ता</label><input type="text" id="sAddr" value="${esc(p.address || '')}" placeholder="उदा. वडगाव बुद्रुक, पुणे"></div>
      <div class="grid2"><div class="field"><label for="sReg">नोंदणी क्रमांक</label><input type="text" id="sReg" value="${esc(p.regNo || '')}"></div>
      <div class="field"><label for="sMonthly">मासिक शुल्क (₹)</label><input type="number" id="sMonthly" min="0" inputmode="numeric" required value="${esc(p.monthly || '')}"></div></div>
      <div class="field"><label for="sUpi">संस्थेचा UPI आयडी <span class="hint">(सभासद यावर थेट भरतील)</span></label><input type="text" id="sUpi" value="${esc(p.upi || '')}" placeholder="उदा. societyname@okaxis" autocapitalize="off"></div>
      <div class="grid2"><div class="field"><label for="sStart">खाते कोणत्या महिन्यापासून</label><input type="month" id="sStart" value="${esc(p.startMonth || thisMonth)}"></div>
      ${isNew ? `<div class="field"><label for="sMy">तुमची सदनिका</label><input type="text" id="sMy" placeholder="उदा. A-101"></div>` : '<div></div>'}</div>
      <div class="field"><label for="sFlats">सदनिका यादी <span class="hint">(एका ओळीत एक: सदनिका, मालकाचे नाव, फोन, जुनी थकबाकी. Excel मधून पेस्ट करू शकता.)</span></label>
        <textarea id="sFlats" rows="8" placeholder="A-101, श्री. पाटील, 9876543210&#10;A-102, सौ. जोशी, 9822012345, 3000">${esc(flatsText)}</textarea></div>
      <button class="btn primary block" type="submit">${isNew ? 'सोसायटी तयार करा' : 'जतन करा'}</button>
    </form>`, el => {
    el.querySelector('#setupForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.submitter || el.querySelector('[type=submit]'); btn.disabled = true;
      const fl = el.querySelector('#sFlats').value.split('\n').map(l => l.split(/[,\t]/).map(x => x.trim())).filter(a => a[0])
        .map(a => ({ id: a[0].replace(/[\/\s]+/g, '-').toUpperCase(), owner: a[1] || '', phone: a[2] || '', opening: Number(String(a[3] || '').replace(/[^\d.]/g, '')) || 0 }));
      const seen = new Set(), dup = fl.find(f => seen.has(f.id) || !seen.add(f.id));
      if (dup) { toast(`सदनिका ${dup.id} दोनदा आहे.`); btn.disabled = false; return; }
      const data = { name: el.querySelector('#sName').value.trim(), address: el.querySelector('#sAddr').value.trim(), regNo: el.querySelector('#sReg').value.trim(), monthly: Number(el.querySelector('#sMonthly').value) || 0, upi: el.querySelector('#sUpi').value.trim(), startMonth: el.querySelector('#sStart').value || thisMonth, flats: fl };
      try {
        if (isNew) { data.myFlat = (el.querySelector('#sMy').value || '').trim().toUpperCase(); const sid = await B.createSociety(S.user, data); closeSheet(); selectSociety(sid); toast('सोसायटी तयार झाली. आता जॉइन कोड सभासदांना पाठवा.'); }
        else { await B.updateSociety(S.sid, data); closeSheet(); toast('माहिती जतन झाली.'); }
      } catch (er) { fail(er); btn.disabled = false; }
    });
  });
}

function sheetPay(flatId) {
  const f = flats().find(x => x.id === flatId), m = ledgerMonth, pay = ((S.accounts[flatId] || {}).payments || {})[m], due = dueFor(flatId, m);
  openSheet(`${sheetHead(`सदनिका ${esc(flatId)} · ${monthName(m)}`)}
    <div class="small muted">${esc(f.owner || '')}${due || pay ? ` · थकबाकी ${rs(due + (pay ? Number(pay.amount) : 0))}` : ''}</div>
    <form id="payForm" class="stack">
      <div class="grid2"><div class="field"><label for="pAmt">रक्कम (₹)</label><input type="number" id="pAmt" min="0" inputmode="numeric" required value="${esc(pay ? pay.amount : (due || monthly()))}"></div>
      <div class="field"><label for="pDate">दिनांक</label><input type="date" id="pDate" required value="${esc(pay ? pay.date : today)}"></div></div>
      <div class="grid2"><div class="field"><label for="pMode">कसे भरले</label><select id="pMode">${['UPI', 'रोख', 'चेक', 'बँक ट्रान्सफर'].map(x => `<option ${pay && pay.mode === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label for="pRef">संदर्भ क्र. <span class="hint">(ऐच्छिक)</span></label><input type="text" id="pRef" value="${esc(pay && pay.ref || '')}"></div></div>
      <button class="btn primary block" type="submit">जमा नोंदवा</button>
      ${pay ? `<button class="btn block danger" type="button" id="pDel">ही नोंद काढा</button>` : ''}
    </form>`, el => {
    el.querySelector('#payForm').addEventListener('submit', async e => {
      e.preventDefault();
      const rec = { amount: Number(el.querySelector('#pAmt').value) || 0, date: el.querySelector('#pDate').value, mode: el.querySelector('#pMode').value, ref: el.querySelector('#pRef').value.trim() };
      try { await B.setPayment(S.sid, flatId, m, rec); closeSheet(); toast(`सदनिका ${flatId}: ${rs(rec.amount)} जमा नोंदवले.`); } catch (er) { fail(er); }
    });
    const del = el.querySelector('#pDel');
    if (del) del.addEventListener('click', async () => { try { await B.setPayment(S.sid, flatId, m, null); closeSheet(); toast('नोंद काढली.'); } catch (er) { fail(er); } });
  });
}

function sheetReminders() {
  const rows = flats().map(f => ({ f, due: dueFor(f.id, ledgerMonth) })).filter(r => r.due > 0);
  openSheet(`${sheetHead(`थकबाकी आठवण · ${rows.length}`)}
    <p class="small muted m0">प्रत्येक सदनिकेसाठी WhatsApp उघडा. फोन क्रमांक नसल्यास WhatsApp मध्ये संपर्क निवडा.</p>
    <ul class="list">${rows.map(({ f, due }, i) => `<li class="wrap"><span class="flat">${esc(f.id)}</span><span class="grow"><span>${esc(f.owner || '')}</span><span class="tiny muted num">${esc(f.phone || 'फोन नाही')} · ${rs(due)}</span></span>
      <span class="row g6"><button class="btn small good" type="button" data-wa="${i}">${IC.wa} WhatsApp</button><button class="btn small" type="button" data-cp="${i}" aria-label="संदेश कॉपी करा">${IC.copy}</button></span></li>`).join('')}</ul>`, el => {
    el.querySelectorAll('[data-wa]').forEach(b => b.addEventListener('click', () => { const r = rows[+b.dataset.wa]; openExternal(waLink(r.f.phone, reminderText(r.f, r.due))); }));
    el.querySelectorAll('[data-cp]').forEach(b => b.addEventListener('click', async () => { const r = rows[+b.dataset.cp]; toast(await copyText(reminderText(r.f, r.due)) ? 'संदेश कॉपी झाला.' : 'कॉपी होऊ शकला नाही.'); }));
  });
}

function sheetIPaid(defaultAmt) {
  openSheet(`${sheetHead('भरणा नोंदवा')}
    <p class="small muted m0">UPI ॲपमध्ये भरल्यानंतर इथे नोंद करा. समिती तपासून मंजूर करेल.</p>
    <form id="ipForm" class="stack">
      <div class="grid2"><div class="field"><label for="iAmt">रक्कम (₹)</label><input type="number" id="iAmt" min="1" inputmode="numeric" required value="${esc(defaultAmt || monthly())}"></div>
      <div class="field"><label for="iMonth">कोणत्या महिन्याचे</label><input type="month" id="iMonth" required value="${thisMonth}"></div></div>
      <div class="field"><label for="iRef">UPI संदर्भ क्र. (UTR) <span class="hint">(UPI ॲपमधील १२ अंकी क्रमांक)</span></label><input type="text" id="iRef" inputmode="numeric" maxlength="22"></div>
      <button class="btn primary block" type="submit">नोंद पाठवा</button></form>`, el => {
    el.querySelector('#ipForm').addEventListener('submit', async e => {
      e.preventDefault();
      const c = { flatId: S.member.flatId, month: el.querySelector('#iMonth').value, amount: Number(el.querySelector('#iAmt').value) || 0, ref: el.querySelector('#iRef').value.trim(), date: today, uid: S.user.uid, name: S.user.name, status: 'pending', createdAt: Date.now() };
      try { await B.addClaim(S.sid, c); closeSheet(); toast('नोंद पाठवली. समिती मंजूर केल्यावर थकबाकी अपडेट होईल.'); } catch (er) { fail(er); }
    });
  });
}

function sheetEditMember(uid) {
  const m = S.members.find(x => x.id === uid); if (!m) return;
  openSheet(`${sheetHead(esc(m.name))}<span class="small muted">${esc(m.email)}</span>
    <form id="meForm" class="stack">
      <div class="field"><label for="mFlat">सदनिका</label><select id="mFlat"><option value="">— नाही —</option>${flats().map(f => `<option ${f.id === m.flatId ? 'selected' : ''}>${esc(f.id)}</option>`).join('')}</select></div>
      <div class="field"><label for="mRole">भूमिका</label><select id="mRole"><option value="resident" ${m.role !== 'admin' ? 'selected' : ''}>सभासद</option><option value="admin" ${m.role === 'admin' ? 'selected' : ''}>समिती (सर्व अधिकार)</option></select></div>
      <button class="btn primary block" type="submit">जतन करा</button>
      <button class="btn block danger" type="button" id="mDel">सोसायटीतून काढा</button></form>`, el => {
    el.querySelector('#meForm').addEventListener('submit', async e => { e.preventDefault(); try { await B.updateMember(S.sid, uid, { flatId: el.querySelector('#mFlat').value, role: el.querySelector('#mRole').value }); closeSheet(); toast('बदल जतन झाले.'); } catch (er) { fail(er); } });
    el.querySelector('#mDel').addEventListener('click', async () => { try { await B.removeMember(S.sid, uid); closeSheet(); toast('सदस्य काढला.'); } catch (er) { fail(er); } });
  });
}

function sheetComplaint() {
  openSheet(`${sheetHead('नवीन तक्रार')}
    <form id="cForm" class="stack">
      ${isAdmin() ? `<div class="field"><label for="cFlat">सदनिका</label><select id="cFlat"><option value="">सामायिक</option>${flats().map(f => `<option>${esc(f.id)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label for="cText">तक्रार</label><textarea id="cText" required rows="4" placeholder="उदा. B विंगच्या जिन्यातील दिवा बंद आहे"></textarea></div>
      <button class="btn primary block" type="submit">नोंदवा</button></form>`, el => {
    el.querySelector('#cForm').addEventListener('submit', async e => {
      e.preventDefault();
      const text = el.querySelector('#cText').value.trim(); if (!text) return;
      const c = { flatId: isAdmin() ? el.querySelector('#cFlat').value : (S.member.flatId || ''), text, uid: S.user.uid, name: S.user.name, status: 'open', createdAt: Date.now() };
      try { await B.addComplaint(S.sid, c); closeSheet(); toast('तक्रार नोंदवली.'); } catch (er) { fail(er); }
    });
  });
}

/* notices + minutes */
function sheetNotice() {
  let lang = 'mr', tpl = NOTICE_TEMPLATES[0];
  const form = () => tpl.fields.map(f => {
    const lbl = lang === 'en' ? f.en : f.mr, ph = f.ph ? f.ph[lang] : '';
    if (f.options) return `<div class="field"><label for="f_${f.k}">${lbl}</label><select id="f_${f.k}">${f.options[lang].map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`;
    if (f.type === 'textarea') return `<div class="field"><label for="f_${f.k}">${lbl}</label><textarea id="f_${f.k}" rows="4"></textarea></div>`;
    return `<div class="field"><label for="f_${f.k}">${lbl}</label><input id="f_${f.k}" type="${f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}" placeholder="${esc(ph)}" ${f.type === 'date' ? `value="${today}"` : ''}></div>`;
  }).join('');
  openSheet(`${sheetHead('नवीन सूचना')}
    <div class="seg" role="group" aria-label="भाषा"><button class="chip" type="button" data-lang="mr" aria-pressed="true">मराठी</button><button class="chip" type="button" data-lang="en" aria-pressed="false">English</button></div>
    <div class="chips" role="group" aria-label="प्रकार" id="tplChips"></div>
    <div class="stack" id="tplFields"></div>
    <button class="btn block" type="button" id="nBuild">मसुदा तयार करा</button>
    <div class="field"><label for="nHead">शीर्षक</label><input type="text" id="nHead"></div>
    <div class="field"><label for="nBody">मजकूर <span class="hint">(हवे तसे बदला)</span></label><textarea id="nBody" rows="8"></textarea></div>
    <button class="btn primary block" type="button" id="nPub">प्रकाशित करा आणि पाठवा</button>`, el => {
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
      const n = { kind: 'notice', lang, heading: g('#nHead').value.trim() || (lang === 'en' ? 'Notice' : 'सूचना'), dateLine: (lang === 'en' ? 'Date: ' : 'दिनांक: ') + fmtDate(today, lang), presentLine: '', body: g('#nBody').value.trim(), createdAt: Date.now(), by: S.user.name };
      await publishAndShare(n);
    });
  });
}

function sheetMinutes() {
  let lang = 'mr';
  openSheet(`${sheetHead('नवीन इतिवृत्त')}
    <div class="seg" role="group" aria-label="भाषा"><button class="chip" type="button" data-lang="mr" aria-pressed="true">मराठी</button><button class="chip" type="button" data-lang="en" aria-pressed="false">English</button></div>
    <div class="field"><label for="mType">सभेचा प्रकार</label><select id="mType"></select></div>
    <div class="grid2"><div class="field"><label for="mDate">सभेचा दिनांक</label><input type="date" id="mDate" value="${today}"></div>
    <div class="field"><label for="mPresent">उपस्थित सदस्य</label><input type="number" id="mPresent" min="0" inputmode="numeric"></div></div>
    <div class="field"><label for="mBody">ठराव <span class="hint">(प्रत्येक ठराव नवीन ओळीत. खालील वाक्ये मदतीसाठी.)</span></label><textarea id="mBody" rows="8"></textarea></div>
    <div class="chips" id="phr"></div>
    <button class="btn primary block" type="button" id="mPub">प्रकाशित करा आणि पाठवा</button>`, el => {
    const g = s => el.querySelector(s);
    const fill = () => { g('#mType').innerHTML = MINUTES_TYPES[lang].map(t => `<option>${esc(t)}</option>`).join(''); g('#phr').innerHTML = RESOLUTION_PHRASES[lang].map((p, i) => `<button class="chip small" type="button" data-phr="${i}">+ ${esc(p)}</button>`).join(''); };
    fill();
    el.addEventListener('click', e => {
      const l = e.target.closest('[data-lang]'); if (l) { lang = l.dataset.lang; el.querySelectorAll('[data-lang]').forEach(x => x.setAttribute('aria-pressed', String(x === l))); fill(); }
      const p = e.target.closest('[data-phr]'); if (p) { const ta = g('#mBody'); ta.value = (ta.value.trim() ? ta.value.trimEnd() + '\n' : '') + RESOLUTION_PHRASES[lang][+p.dataset.phr]; ta.focus(); }
    });
    g('#mPub').addEventListener('click', async () => {
      const body = g('#mBody').value.trim(); if (!body) { toast('किमान एक ठराव लिहा.'); return; }
      const pr = g('#mPresent').value;
      const n = { kind: 'minutes', lang, heading: g('#mType').value, dateLine: (lang === 'en' ? 'Date: ' : 'दिनांक: ') + fmtDate(g('#mDate').value, lang), presentLine: pr ? (lang === 'en' ? `Members present: ${pr}` : `उपस्थित सदस्य: ${pr}`) : '', body, createdAt: Date.now(), by: S.user.name };
      await publishAndShare(n);
    });
  });
}

async function publishAndShare(n) {
  if (!n.body) { toast('मजकूर रिकामा आहे.'); return; }
  try { await B.saveNotice(S.sid, n); } catch (e) { fail(e); return; }
  closeSheet(); toast('प्रकाशित झाले. सभासदांना ॲपमध्ये दिसेल.');
  sheetViewNotice(n);
}

function sheetViewNotice(n) {
  openSheet(`${sheetHead(n.kind === 'minutes' ? 'इतिवृत्त' : 'सूचना')}
    <img class="docprev" id="vImg" alt="${esc(n.heading)}">
    <div class="grid2"><button class="btn good" type="button" id="vShare">${IC.share} WhatsApp / शेअर</button><button class="btn" type="button" id="vCopy">${IC.copy} मजकूर कॉपी</button></div>
    ${isAdmin() && n.id ? `<button class="btn block danger" type="button" id="vDel">हटवा</button>` : ''}`, async el => {
    const blob = await drawLetterhead(S.society, n);
    const img = el.querySelector('#vImg'); if (img) img.src = URL.createObjectURL(blob);
    const name = `${n.kind === 'minutes' ? 'itivrutta' : 'suchana'}-${today}.png`;
    el.querySelector('#vShare').addEventListener('click', async () => { const r = await shareImage(blob, name, n.heading); if (r === 'downloaded') toast('चित्र डाउनलोड झाले. WhatsApp मध्ये जोडा.'); if (r === 'failed') toast('शेअर होऊ शकले नाही.'); });
    el.querySelector('#vCopy').addEventListener('click', async () => {
      const lines = n.body.split('\n').filter(Boolean);
      const txt = `*${S.society.name}*\n*${n.heading}*\n${n.dateLine}${n.presentLine ? '\n' + n.presentLine : ''}\n\n${n.kind === 'minutes' ? lines.map((l, i) => `${i + 1}. ${l}`).join('\n') : lines.join('\n\n')}\n\n${n.lang === 'en' ? 'Secretary, Managing Committee' : 'सचिव, व्यवस्थापकीय समिती'}`;
      toast(await copyText(txt) ? 'मजकूर कॉपी झाला.' : 'कॉपी होऊ शकले नाही.');
    });
    const del = el.querySelector('#vDel'); if (del) del.addEventListener('click', async () => { try { await B.deleteNotice(S.sid, n.id); closeSheet(); toast('हटवले.'); } catch (e) { fail(e); } });
  });
}

function sheetSwitch() {
  const socs = (S.userDoc && S.userDoc.societies) || {};
  openSheet(`${sheetHead('तुमच्या सोसायट्या')}
    <ul class="list">${Object.entries(socs).map(([sid, s]) => `<li><span class="grow"><b>${esc(s.name)}</b><span class="tiny muted">${s.role === 'admin' ? 'समिती' : 'सभासद'}</span></span>${sid === S.sid ? '<span class="pill ok">उघडी</span>' : `<button class="btn small" type="button" data-pick="${sid}">उघडा</button>`}</li>`).join('')}</ul>
    <div class="grid2"><button class="btn" type="button" id="swJoin">कोडने जॉइन करा</button><button class="btn" type="button" id="swNew">नवीन सोसायटी</button></div>`, el => {
    el.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { closeSheet(); selectSociety(b.dataset.pick); }));
    el.querySelector('#swNew').addEventListener('click', () => sheetSetup(true));
    el.querySelector('#swJoin').addEventListener('click', () => { closeSheet(); S.sid = null; unsubAll(); if (memberSub) { memberSub(); memberSub = null; } render(); });
  });
}

async function startJoin(code) {
  try {
    const r = await B.lookupCode(code);
    if (!r) { toast('हा कोड सापडला नाही. समितीकडून पुन्हा तपासा.'); return; }
    if (((S.userDoc && S.userDoc.societies) || {})[r.sid]) { selectSociety(r.sid); return; }
    openSheet(`${sheetHead('जॉइन करा')}<p class="m0"><b>${esc(r.name)}</b></p>
      <form id="jf" class="stack"><div class="field"><label for="jFlat">तुमची सदनिका</label><input id="jFlat" type="text" required placeholder="उदा. A-101" autocapitalize="characters"></div>
      <button class="btn primary block" type="submit">विनंती पाठवा</button></form>`, el => {
      el.querySelector('#jf').addEventListener('submit', async e => {
        e.preventDefault();
        try { await B.requestJoin(S.user, r.sid, r.name, el.querySelector('#jFlat').value.trim().toUpperCase().replace(/[\/\s]+/g, '-')); closeSheet(); selectSociety(r.sid); toast('विनंती पाठवली.'); } catch (er) { fail(er); }
      });
    });
  } catch (e) { fail(e); }
}

/* owner panel: every society, its plan, and a way to extend it after the society pays */
function sheetOwner() {
  let list = [], q = '';
  openSheet(`${sheetHead('मालक पॅनेल')}
    <div class="grid2" id="oStats"></div>
    <input type="search" id="oQ" placeholder="सोसायटी किंवा कोड शोधा" aria-label="सोसायटी शोधा">
    <ul class="list" id="oList"><li class="muted small">आणत आहे…</li></ul>`, el => {
    const draw = () => {
      const st = list.map(x => ({ x, p: planState(x) }));
      const paid = st.filter(o => !o.p.expired && !o.p.trial).length, trial = st.filter(o => o.p.trial).length, exp = st.filter(o => o.p.expired).length;
      el.querySelector('#oStats').innerHTML = `<div class="card"><div class="tiny muted">सशुल्क</div><b class="big good num">${paid}</b></div><div class="card"><div class="tiny muted">मोफत / संपलेले</div><b class="big num">${trial} / <span class="bad">${exp}</span></b></div>`;
      const rows = st.filter(({ x }) => !q || (x.name || '').toLowerCase().includes(q) || (x.code || '').toLowerCase().includes(q));
      el.querySelector('#oList').innerHTML = rows.length ? rows.map(({ x, p }) => `<li><span class="grow"><b>${esc(x.name)}</b><span class="tiny muted">${(x.flats || []).length} सदनिका · ${esc(x.code || '')} · नोंद ${fmtTs(x.createdAt || Date.now())}</span></span>
        <span class="pill ${p.expired ? 'due' : p.trial ? 'wait' : 'ok'}">${p.expired ? 'संपले' : p.trial ? `मोफत ${p.left}दि` : fmtTs(p.end)}</span>
        <button class="btn small" type="button" data-plan="${x.id}">बदला</button></li>`).join('') : `<li class="muted small">काही नाही.</li>`;
    };
    el.querySelector('#oQ').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
    el.addEventListener('click', e => { const b = e.target.closest('[data-plan]'); if (b) { const x = list.find(y => y.id === b.dataset.plan); if (x) sheetPlan(x); } });
    return B.watchAllSocieties(l => { list = l; draw(); }, e => { el.querySelector('#oList').innerHTML = `<li class="bad small">${esc(errMsg(e))}</li>`; });
  });
}

function sheetPlan(x) {
  const p = planState(x), base = Math.max(Date.now(), p.end);
  openSheet(`${sheetHead(esc(x.name))}
    <div class="small">सध्या: <b>${p.expired ? 'संपले' : p.trial ? 'मोफत कालावधी' : 'सशुल्क'}</b> · ${fmtTs(p.end)} पर्यंत</div>
    <div class="chips">${[[1, '+1 महिना'], [3, '+3 महिने'], [6, '+6 महिने'], [12, '+1 वर्ष']].map(([n, l]) => `<button class="chip" type="button" data-add="${n}">${l}</button>`).join('')}</div>
    <div class="field"><label for="plDate">सदस्यत्व या दिवसापर्यंत</label><input type="date" id="plDate" value="${isoDay(base)}"></div>
    <button class="btn primary block" type="button" id="plSave">जतन करा</button>
    <button class="btn block danger" type="button" id="plStop">आताच बंद करा</button>
    <button class="btn block" type="button" id="plBack">‹ सर्व सोसायट्या</button>`, el => {
    const inp = el.querySelector('#plDate');
    el.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { inp.value = isoDay(addMonthsTs(base, +b.dataset.add)); el.querySelectorAll('[data-add]').forEach(c => c.setAttribute('aria-pressed', String(c === b))); }));
    el.querySelector('#plSave').addEventListener('click', async () => {
      if (!inp.value) return;
      const until = new Date(inp.value + 'T23:59:59').getTime();
      try { await B.setPlan(x.id, { paidUntil: until, lastPaidAt: Date.now() }); toast(`${x.name}: ${fmtTs(until)} पर्यंत सुरू.`); sheetOwner(); } catch (e) { fail(e); }
    });
    el.querySelector('#plStop').addEventListener('click', async () => {
      try { await B.setPlan(x.id, { paidUntil: 0, trialEnds: Date.now() }); toast('सदस्यत्व बंद केले.'); sheetOwner(); } catch (e) { fail(e); }
    });
    el.querySelector('#plBack').addEventListener('click', sheetOwner);
  });
}

function sheetDeleteAccount() {
  openSheet(`${sheetHead('खाते हटवा')}
    <p class="small m0">तुमचे Sachiv लॉगिन कायमचे हटवले जाईल आणि तुम्ही सर्व सोसायट्यांमधून बाहेर पडाल. सोसायटीच्या हिशोबातील नोंदी (भरणा, सूचना) सोसायटीच्या रेकॉर्डसाठी राहतील.</p>
    <p class="small m0 muted">तुम्ही समितीत असाल, तर आधी दुसऱ्या सदस्याला समिती भूमिका द्या.</p>
    <form id="delForm" class="stack"><div class="field"><label for="dPass">खात्री करण्यासाठी पासवर्ड टाका</label><input id="dPass" type="password" required autocomplete="current-password"></div>
    <button class="btn block danger-fill" type="submit">खाते कायमचे हटवा</button></form>`, el => {
    el.querySelector('#delForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = el.querySelector('[type=submit]'); btn.disabled = true;
      try {
        await B.deleteAccount(el.querySelector('#dPass').value, Object.keys((S.userDoc && S.userDoc.societies) || {}));
        closeSheet(); S.sid = null; LS.set('sachiv-sid', null); authMode = 'login'; toast('तुमचे खाते हटवले.');
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
  const t = e.target.closest('button, a'); if (!t || t.closest('.sheet')) return;
  const d = t.dataset;
  try {
    if (locked() && (['newnotice', 'newminutes', 'reminders'].includes(d.act) || d.pay || d.claimOk || d.claimNo || d.mok || d.ctoggle || d.medit)) { toast(LOCK_MSG); return; }
    if (d.tab) { S.tab = d.tab; render(); window.scrollTo(0, 0); }
    else if (d.tabGo) { S.tab = d.tabGo; if (S.tab === 'ledger') ledgerFilter = 'due'; render(); window.scrollTo(0, 0); }
    else if (d.auth) { authMode = d.auth; render(); }
    else if (d.act === 'forgot') { const em = ($('#aEmail') || {}).value; if (!em) { toast('आधी ईमेल लिहा.'); return; } await B.resetPassword(em.trim()); toast('पासवर्ड बदलण्याची लिंक ईमेलवर पाठवली.'); }
    else if (d.act === 'signout') { LS.set('sachiv-sid', null); authMode = 'login'; S.sid = null; await B.signOut(); }
    else if (d.act === 'create') sheetSetup(true);
    else if (d.act === 'owner') sheetOwner();
    else if (d.act === 'verify') { await B.sendVerification(); toast('लिंक पाठवली. ईमेल उघडा (Spam सुद्धा तपासा).'); }
    else if (d.act === 'verified') { const ok = await B.refreshUser(); toast(ok ? 'ईमेल पडताळले. मालक पॅनेल सुरू.' : 'अजून पडताळले नाही. ईमेलमधील लिंक उघडा.'); }
    else if (d.act === 'delacct') sheetDeleteAccount();
    else if (d.act === 'support') openExternal(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Sachiv सदस्यत्व: ' + S.society.name + ' (' + S.society.code + ')')}`);
    else if (d.act === 'setup') sheetSetup(false);
    else if (d.act === 'switch') sheetSwitch();
    else if (d.act === 'leave') { const sid = S.sid; if (S.member) await B.removeMember(sid, S.user.uid); await B.leaveIndex(S.user.uid, sid); S.sid = null; LS.set('sachiv-sid', null); }
    else if (d.act === 'newnotice') sheetNotice();
    else if (d.act === 'newminutes') sheetMinutes();
    else if (d.act === 'reminders') sheetReminders();
    else if (d.act === 'newcomplaint') sheetComplaint();
    else if (d.act === 'invite') {
      const txt = `${S.society.name}\nआपल्या सोसायटीचे देखभाल शुल्क, सूचना आणि तक्रारी आता Sachiv ॲपमध्ये.\n1. Sachiv ॲप उघडा आणि नवीन खाते तयार करा.\n2. जॉइन कोड टाका: ${S.society.code}\n3. तुमची सदनिका निवडा.\nधन्यवाद,\nसचिव`;
      openExternal(waLink('', txt));
    }
    else if (d.act === 'pay') {
      const amt = Number(d.amt) || monthly();
      const ok = await openExternal(upiLink({ upi: S.society.upi, name: S.society.name, amount: amt, note: `Maint ${S.member.flatId} ${thisMonth}` }));
      if (!ok) toast('UPI ॲप उघडले नाही. UPI आयडी: ' + S.society.upi);
      setTimeout(() => sheetIPaid(amt), 600);
    }
    else if (d.act === 'ipaid') sheetIPaid();
    else if (d.month) { ledgerMonth = addMonth(ledgerMonth, +d.month); if (ledgerMonth > thisMonth) ledgerMonth = thisMonth; render(); }
    else if (d.lf) { ledgerFilter = d.lf; render(); }
    else if (d.cf) { complaintFilter = d.cf; render(); }
    else if (d.pay) sheetPay(d.pay);
    else if (d.claimOk) {
      const c = S.claims.find(x => x.id === d.claimOk); if (!c) return;
      const prev = ((S.accounts[c.flatId] || {}).payments || {})[c.month];
      await B.setPayment(S.sid, c.flatId, c.month, { amount: (prev ? Number(prev.amount) : 0) + Number(c.amount), date: c.date, mode: 'UPI', ref: c.ref || '' });
      await B.updateClaim(S.sid, c.id, { status: 'approved', decidedBy: S.user.uid });
      toast(`${c.flatId}: ${rs(c.amount)} मंजूर करून खात्यात जमा केले.`);
    }
    else if (d.claimNo) { await B.updateClaim(S.sid, d.claimNo, { status: 'rejected', decidedBy: S.user.uid }); toast('भरणा नाकारला.'); }
    else if (d.mok) { const sel = document.querySelector(`[data-mflat="${d.mok}"]`); const flatId = sel ? sel.value : ''; if (!flatId) { toast('आधी सदनिका निवडा.'); return; } await B.updateMember(S.sid, d.mok, { status: 'active', flatId }); toast('सभासद मंजूर केला.'); }
    else if (d.mno) { await B.removeMember(S.sid, d.mno); toast('विनंती नाकारली.'); }
    else if (d.medit) sheetEditMember(d.medit);
    else if (d.ctoggle) { const c = S.complaints.find(x => x.id === d.ctoggle); if (c) await B.updateComplaint(S.sid, c.id, { status: c.status === 'closed' ? 'open' : 'closed' }); }
    else if (d.opennotice) { const n = S.notices.find(x => x.id === d.opennotice); if (n) sheetViewNotice(n); }
  } catch (er) { fail(er); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#sheetRoot').innerHTML) closeSheet(); });
if (B.kind === 'mock') document.documentElement.dataset.mock = '1';
render();
