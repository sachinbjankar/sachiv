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
const authNotify = () => { store.__current = current ? current.email : null; save(); authL.forEach(cb => cb(current ? { uid: current.uid, email: current.email, name: current.name } : null)); };

export const backend = {
  kind: 'mock',
  onAuth(cb) { authL.add(cb); setTimeout(() => cb(current ? { uid: current.uid, email: current.email, name: current.name } : null), 0); return () => authL.delete(cb); },
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

  watchUser(uid, cb) { return watch(() => cb(store['users/' + uid] || { societies: {} })); },
  async createSociety(user, data) {
    let code = ''; do { code = Array.from({ length: 6 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join(''); } while (store['joinCodes/' + code]);
    const sid = 's' + newId();
    store['societies/' + sid] = { ...data, createdBy: user.uid, code, createdAt: Date.now() };
    store[`societies/${sid}/members/${user.uid}`] = { name: user.name, email: user.email, role: 'admin', status: 'active', flatId: data.myFlat || '', createdAt: Date.now() };
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
  async setPayment(sid, flatId, month, rec) { const k = `societies/${sid}/accounts/${flatId}`; store[k] = deepMerge(store[k], { payments: { [month]: rec || '__DEL__' } }); notify(); },
  async addClaim(sid, c) { store[`societies/${sid}/claims/${newId()}`] = c; notify(); },
  async updateClaim(sid, id, data) { const k = `societies/${sid}/claims/${id}`; store[k] = { ...store[k], ...data }; notify(); },
  async saveNotice(sid, n) { const { id, ...data } = n; store[`societies/${sid}/notices/${id || newId()}`] = data; notify(); },
  async deleteNotice(sid, id) { delete store[`societies/${sid}/notices/${id}`]; notify(); },
  async addComplaint(sid, c) { store[`societies/${sid}/complaints/${newId()}`] = c; notify(); },
  async updateComplaint(sid, id, data) { const k = `societies/${sid}/complaints/${id}`; store[k] = { ...store[k], ...data }; notify(); }
};
