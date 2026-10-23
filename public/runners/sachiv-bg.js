// Sachiv background check: runs about every 15 minutes while the app is closed (Android WorkManager).
// It reads new announcements, notices, reminders and approvals for the current society through the
// Firestore REST API (as the signed-in user, so the normal security rules apply) and shows a phone notification.
const KEY = 'sachiv-bg-config';

addEventListener('saveConfig', (resolve, reject, args) => {
  try {
    if (!args || !args.cfg) CapacitorKV.remove(KEY);
    else {
      const old = readCfg() || {};
      const cfg = args.cfg;
      // never move the "last notified" mark backwards
      if (old.sid === cfg.sid && old.uid === cfg.uid && Number(old.last) > Number(cfg.last || 0)) cfg.last = old.last;
      CapacitorKV.set(KEY, JSON.stringify(cfg));
    }
    resolve();
  } catch (e) { reject(e); }
});

function readCfg() {
  try { const v = CapacitorKV.get(KEY); return v && v.value ? JSON.parse(v.value) : null; } catch (e) { return null; }
}

function val(f) {
  if (!f) return undefined;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return Number(f.doubleValue);
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('mapValue' in f) { const o = {}; const m = f.mapValue.fields || {}; for (const k in m) o[k] = val(m[k]); return o; }
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(val);
  return undefined;
}
const obj = d => { const o = {}; const fs = (d && d.fields) || {}; for (const k in fs) o[k] = val(fs[k]); o.id = d && d.name ? d.name.split('/').pop() : ''; return o; };

async function idToken(cfg) {
  const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(cfg.refreshToken)}`
  });
  const j = await r.json();
  if (!j.id_token) throw new Error('token');
  if (j.refresh_token && j.refresh_token !== cfg.refreshToken) cfg.refreshToken = j.refresh_token;
  return j.id_token;
}

async function query(cfg, tok, col, where, orderDesc, limit) {
  const sq = { from: [{ collectionId: col }], limit: limit || 10 };
  if (where) sq.where = where;
  if (orderDesc) sq.orderBy = [{ field: { fieldPath: orderDesc }, direction: 'DESCENDING' }];
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${cfg.project}/databases/(default)/documents/societies/${cfg.sid}:runQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ structuredQuery: sq })
  });
  const j = await r.json();
  return Array.isArray(j) ? j.filter(x => x.document).map(x => obj(x.document)) : [];
}
const eq = (f, v) => ({ fieldFilter: { field: { fieldPath: f }, op: 'EQUAL', value: { stringValue: v } } });
const gt = (f, n) => ({ fieldFilter: { field: { fieldPath: f }, op: 'GREATER_THAN', value: { integerValue: String(Math.floor(n)) } } });

async function getDoc(cfg, tok, path) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${cfg.project}/databases/(default)/documents/societies/${cfg.sid}/${path}`, { method: 'GET', headers: { Authorization: `Bearer ${tok}` } });
  if (r.status !== 200) return null;
  return obj(await r.json());
}

addEventListener('check', async (resolve, reject) => {
  try {
    const cfg = readCfg();
    if (!cfg || !cfg.refreshToken || !cfg.sid) { resolve(); return; }
    const last = Number(cfg.last) || Date.now();
    const tok = await idToken(cfg);
    const L = cfg.labels || {};
    const items = [];
    for (const m of await query(cfg, tok, 'messages', gt('createdAt', last), 'createdAt', 5)) if (m.uid !== cfg.uid) items.push({ at: m.createdAt, title: m.important ? L.important : L.announce, body: m.text || '' });
    for (const n of await query(cfg, tok, 'notices', gt('createdAt', last), 'createdAt', 5)) if (n.uid !== cfg.uid) items.push({ at: n.createdAt, title: L.notice, body: n.heading || '' });
    if (cfg.role === 'admin') {
      for (const c of await query(cfg, tok, 'claims', eq('status', 'pending'), null, 30)) if (c.createdAt > last) items.push({ at: c.createdAt, title: L.claim, body: `${c.flatId || ''} · ₹${c.amount || ''} · ${c.name || ''}` });
      for (const m of await query(cfg, tok, 'members', eq('status', 'pending'), null, 30)) if (m.createdAt > last) items.push({ at: m.createdAt, title: L.join, body: `${m.name || ''} · ${m.flatId || ''}` });
      for (const c of await query(cfg, tok, 'complaints', eq('status', 'open'), null, 30)) if (c.createdAt > last && c.uid !== cfg.uid) items.push({ at: c.createdAt, title: L.complaint, body: `${c.flatId || ''} · ${c.text || ''}` });
    } else if (cfg.flatId) {
      const a = await getDoc(cfg, tok, `accounts/${encodeURIComponent(cfg.flatId)}`);
      if (a && a.reminder && a.reminder.at > last) items.push({ at: a.reminder.at, title: L.reminder, body: (L.reminderBody || '{0}').replace('{0}', '₹' + (a.reminder.amount || '')) });
      for (const c of await query(cfg, tok, 'claims', eq('flatId', cfg.flatId), null, 30)) if (c.decidedAt > last && c.status !== 'pending') items.push({ at: c.decidedAt, title: c.status === 'approved' ? L.approved : L.rejected, body: `₹${c.amount || ''} · ${c.ref || ''}` });
    }
    items.sort((a, b) => b.at - a.at);
    const fresh = items.filter(x => x.at > last).slice(0, 4);
    if (fresh.length) {
      CapacitorNotifications.schedule(fresh.map((x, i) => ({ id: (Math.floor(x.at / 1000) + i) % 2000000000, title: `${x.title} · ${cfg.sname || 'Sachiv'}`, body: String(x.body).slice(0, 240), smallIcon: 'ic_stat_sachiv', autoCancel: true })));
      cfg.last = Math.max(...fresh.map(x => x.at));
    }
    CapacitorKV.set(KEY, JSON.stringify(cfg));
    resolve();
  } catch (e) { console.error('sachiv-bg', String(e)); resolve(); }
});
