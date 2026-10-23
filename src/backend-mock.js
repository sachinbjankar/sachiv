// Stand-in backend for testing without Firebase. Same API as backend-firebase.js.
// Keeps everything in this browser's localStorage. Not used in the real app.
const KEY = 'sachiv-mock-db';
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
const users = store.__users || (store.__users = {});
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
const listeners = new Set();
const notify = () => { save(); setTimeout(() => listeners.forEach(l => l()), 0); };
const watch = fn => { const l = () => fn(); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); };
const docsIn = col => Object.keys(store).filter(k => k.startsWith(col + '/') && k.slice(col.length + 1).indexOf('/') === -1).map(k => ({ id: k.slice(col.length + 1), ...store[k] }));
const deepMerge = (a, b) => { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) { if (v === '__DEL__') delete o[k]; else if (v && typeof v === 'object' && !Array.isArray(v)) o[k] = deepMerge(o[k], v); else o[k] = v; } return o; };
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
let current = store.__current ? users[store.__current] : null;
const authL = new Set();
const pub = () => current ? { uid: current.uid, email: current.email, name: current.name, emailVerified: !!current.verified } : null;
const authNotify = () => { store.__current = current ? current.email : null; save(); authL.forEach(cb => cb(pub())); };

export const backend = {
  kind: 'mock',
  onAuth(cb) { authL.add(cb); setTimeout(() => cb(pub()), 0); return () => authL.delete(cb); },
  async signUp(email, password, name) {
    email = email.toLowerCase(); if (users[email]) throw { code: 'auth/email-already-in-use' };
    if (password.length < 6) throw { code: 'auth/weak-password' };
    current = users[email] = { uid: 'u' + newId(), email, name, password };
    store['users/' + current.uid] = { name, email, societies: {} }; notify(); authNotify();
  },
  async signIn(email, password) {
    const u = users[email.toLowerCase()]; if (!u || u.password !== password) throw { code: 'auth/invalid-credential' };
    current = u; authNotify();
  },
  async signOut() { current = null; authNotify(); },
  async resetPassword() {},
  async sendVerification() { if (current) current.verified = true; save(); },
  async refreshUser() { authNotify(); return !!(current && current.verified); },
  async deleteAccount(password, sids) {
    if (!current || current.password !== password) throw { code: 'auth/invalid-credential' };
    for (const sid of sids) delete store[`societies/${sid}/members/${current.uid}`];
    delete store['users/' + current.uid]; delete users[current.email]; current = null; notify(); authNotify();
  },

  watchMessages(sid, cb) { return watch(() => cb(docsIn(`societies/${sid}/messages`).sort((a, b) => b.createdAt - a.createdAt))); },
  async saveMessage(sid, m) { const { id, ...data } = m; store[`societies/${sid}/messages/${id || newId()}`] = data; notify(); },
  async deleteMessage(sid, id) { delete store[`societies/${sid}/messages/${id}`]; notify(); },
  watchFunds(sid, cb) { return watch(() => cb(docsIn(`societies/${sid}/funds`).sort((a, b) => b.createdAt - a.createdAt))); },
  async saveFund(sid, f) { const { id, ...data } = f; const k = `societies/${sid}/funds/${id || newId()}`; store[k] = { ...(store[k] || {}), ...data }; notify(); },
  async deleteFund(sid, id) { delete store[`societies/${sid}/funds/${id}`]; notify(); },
  async setFundPaid(sid, fundId, flatId, rec) { const k = `societies/${sid}/funds/${fundId}`; store[k] = deepMerge(store[k], { paid: { [flatId]: rec || '__DEL__' } }); notify(); },
  watchFiles(sid, cb, err, publicOnly) { return watch(() => cb(docsIn(`societies/${sid}/files`).filter(f => !publicOnly || f.visibility === 'all').sort((a, b) => b.createdAt - a.createdAt))); },
  async uploadFile(sid, meta, chunks) { const id = newId(); chunks.forEach((c, i) => { store[`societies/${sid}/files/${id}/chunks/${i}`] = { d: c }; }); store[`societies/${sid}/files/${id}`] = { ...meta, chunks: chunks.length }; notify(); return id; },
  async readFile(sid, id, n) { return Array.from({ length: n }, (_, i) => (store[`societies/${sid}/files/${id}/chunks/${i}`] || {}).d || ''); },
  async deleteFile(sid, id, n) { delete store[`societies/${sid}/files/${id}`]; for (let i = 0; i < n; i++) delete store[`societies/${sid}/files/${id}/chunks/${i}`]; notify(); },
  watchAllSocieties(cb) { return watch(() => cb(docsIn('societies').sort((a, b) => b.createdAt - a.createdAt))); },
  async setPlan(sid, data) { store['societies/' + sid] = { ...store['societies/' + sid], ...data }; notify(); },

  watchUser(uid, cb) { return watch(() => cb(store['users/' + uid] || { societies: {} })); },
  async createSociety(user, input) {
    const { myFlat, ...data } = input;
    let code = ''; do { code = Array.from({ length: 6 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join(''); } while (store['joinCodes/' + code]);
    const sid = 's' + newId();
    store['societies/' + sid] = { ...data, createdBy: user.uid, code, createdAt: Date.now(), trialEnds: Date.now() + 30 * 86400000, paidUntil: 0 };
    store[`societies/${sid}/members/${user.uid}`] = { name: user.name, email: user.email, role: 'admin', status: 'active', flatId: myFlat || '', createdAt: Date.now() };
    store['joinCodes/' + code] = { sid, name: data.name };
    store['users/' + user.uid] = deepMerge(store['users/' + user.uid], { societies: { [sid]: { name: data.name, role: 'admin' } } });
    notify(); return sid;
  },
  async lookupCode(code) { return store['joinCodes/' + code.toUpperCase().trim()] || null; },
  async requestJoin(user, sid, name, flatId) {
    store[`societies/${sid}/members/${user.uid}`] = { name: user.name, email: user.email, role: 'resident', status: 'pending', flatId, createdAt: Date.now() };
    store['users/' + user.uid] = deepMerge(store['users/' + user.uid], { societies: { [sid]: { name, role: 'resident' } } }); notify();
  },
  async leaveIndex(uid, sid) { store['users/' + uid] = deepMerge(store['users/' + uid], { societies: { [sid]: '__DEL__' } }); notify(); },

  watchMember(sid, uid, cb) { return watch(() => { const m = store[`societies/${sid}/members/${uid}`]; cb(m ? { id: uid, ...m } : null); }); },
  watchSociety(sid, cb) { return watch(() => { const s = store['societies/' + sid]; cb(s ? { id: sid, ...s } : null); }); },
  watchMembers(sid, cb) { return watch(() => cb(docsIn(`societies/${sid}/members`))); },
  watchAccounts(sid, cb) { return watch(() => cb(docsIn(`societies/${sid}/accounts`))); },
  watchAccount(sid, flatId, cb) { return watch(() => cb({ id: flatId, payments: {}, ...(store[`societies/${sid}/accounts/${flatId}`] || {}) })); },
  watchClaims(sid, cb, err, flatId) { return watch(() => cb(docsIn(`societies/${sid}/claims`).filter(c => !flatId || c.flatId === flatId).sort((a, b) => b.createdAt - a.createdAt))); },
  watchNotices(sid, cb) { return watch(() => cb(docsIn(`societies/${sid}/notices`).sort((a, b) => b.createdAt - a.createdAt))); },
  watchComplaints(sid, cb, err, uid) { return watch(() => cb(docsIn(`societies/${sid}/complaints`).filter(c => !uid || c.uid === uid).sort((a, b) => b.createdAt - a.createdAt))); },

  async updateSociety(sid, data) { store['societies/' + sid] = { ...store['societies/' + sid], ...data }; notify(); },
  async updateMember(sid, uid, data) { const k = `societies/${sid}/members/${uid}`; store[k] = { ...store[k], ...data }; notify(); },
  async removeMember(sid, uid) { delete store[`societies/${sid}/members/${uid}`]; notify(); },
  async nextReceiptNo(sid, key) { const k = 'societies/' + sid, seq = { ...(store[k].rcptSeq || {}) }; seq[key] = (Number(seq[key]) || 0) + 1; store[k] = { ...store[k], rcptSeq: seq }; notify(); return seq[key]; },
  async setPayments(sid, flatId, map) { const k = `societies/${sid}/accounts/${flatId}`; store[k] = deepMerge(store[k], { payments: map }); notify(); },
  async setPayment(sid, flatId, month, rec) { const k = `societies/${sid}/accounts/${flatId}`; store[k] = deepMerge(store[k], { payments: { [month]: rec || '__DEL__' } }); notify(); },
  async addClaim(sid, c) { store[`societies/${sid}/claims/${newId()}`] = c; notify(); },
  async updateClaim(sid, id, data) { const k = `societies/${sid}/claims/${id}`; store[k] = { ...store[k], ...data }; notify(); },
  async saveNotice(sid, n) { const { id, ...data } = n; store[`societies/${sid}/notices/${id || newId()}`] = data; notify(); },
  async deleteNotice(sid, id) { delete store[`societies/${sid}/notices/${id}`]; notify(); },
  async addComplaint(sid, c) { store[`societies/${sid}/complaints/${newId()}`] = c; notify(); },
  async updateComplaint(sid, id, data) { const k = `societies/${sid}/complaints/${id}`; store[k] = { ...store[k], ...data }; notify(); }
};
