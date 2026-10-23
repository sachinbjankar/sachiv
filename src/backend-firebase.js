// Real backend: Firebase Auth (email + password) and Cloud Firestore.
// Data layout (every society is private to its own members, see firestore.rules):
//   users/{uid}                          { name, email, societies: { sid: { name, role } } }   (an index the user keeps)
//   joinCodes/{code}                     { sid, name }
//   societies/{sid}                      { name, address, regNo, monthly, upi, startMonth, flats: [...], createdBy, code }
//   societies/{sid}/members/{uid}        { name, email, role: 'admin'|'resident', status: 'pending'|'active', flatId, createdAt }
//   societies/{sid}/accounts/{flatId}    { payments: { 'YYYY-MM': { amount, date, mode, ref } } }
//   societies/{sid}/claims/{id}          { flatId, month, amount, ref, date, uid, name, status, createdAt }
//   societies/{sid}/notices/{id}         { kind, lang, heading, dateLine, presentLine, body, createdAt, by }
//   societies/{sid}/complaints/{id}      { flatId, text, uid, name, status, createdAt }
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, sendPasswordResetEmail, updateProfile, sendEmailVerification,
  EmailAuthProvider, reauthenticateWithCredential, deleteUser
} from 'firebase/auth';
import {
  getFirestore, doc, collection, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, deleteField, runTransaction
} from 'firebase/firestore';
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let authCb = null;
const toUser = u => u ? { uid: u.uid, email: u.email, name: u.displayName || '', emailVerified: !!u.emailVerified } : null;
const list = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
const byNewest = a => a.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
export const TRIAL_MS = 30 * 86400000;
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');
const newId = () => doc(collection(db, '_ids')).id;

export const backend = {
  kind: 'firebase',
  onAuth(cb) { authCb = cb; return onAuthStateChanged(auth, u => cb(toUser(u))); },
  sendVerification: () => sendEmailVerification(auth.currentUser),
  // For the background check that shows phone notifications while the app is closed.
  bgAuth: () => auth.currentUser ? { refreshToken: auth.currentUser.refreshToken, apiKey: firebaseConfig.apiKey, project: firebaseConfig.projectId } : null,
  async refreshUser() { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); if (authCb) authCb(toUser(auth.currentUser)); return auth.currentUser.emailVerified; },
  async deleteAccount(password, sids) {
    const u = auth.currentUser;
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
    for (const sid of sids) { try { await deleteDoc(doc(db, 'societies', sid, 'members', u.uid)); } catch (e) {} }
    try { await deleteDoc(doc(db, 'users', u.uid)); } catch (e) {}
    await deleteUser(u);
  },
  async signUp(email, password, name) {
    const c = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(c.user, { displayName: name });
    await setDoc(doc(db, 'users', c.user.uid), { name, email, societies: {} }, { merge: true });
  },
  signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
  signOut: () => fbSignOut(auth),
  resetPassword: email => sendPasswordResetEmail(auth, email),

  watchUser(uid, cb, err) { return onSnapshot(doc(db, 'users', uid), s => cb(s.exists() ? s.data() : { societies: {} }), err); },

  async createSociety(user, input) {
    const { myFlat, ...data } = input;
    let code = newCode();
    for (let i = 0; i < 5 && (await getDoc(doc(db, 'joinCodes', code))).exists(); i++) code = newCode();
    const sid = newId();
    const b = writeBatch(db);
    b.set(doc(db, 'societies', sid), { ...data, createdBy: user.uid, code, createdAt: Date.now(), trialEnds: Date.now() + TRIAL_MS, paidUntil: 0 });
    b.set(doc(db, 'societies', sid, 'members', user.uid), { name: user.name, email: user.email, role: 'admin', status: 'active', flatId: myFlat || '', createdAt: Date.now() });
    b.set(doc(db, 'joinCodes', code), { sid, name: data.name });
    b.set(doc(db, 'users', user.uid), { societies: { [sid]: { name: data.name, role: 'admin' } } }, { merge: true });
    await b.commit();
    return sid;
  },
  async lookupCode(code) { const s = await getDoc(doc(db, 'joinCodes', code.toUpperCase().trim())); return s.exists() ? s.data() : null; },
  async requestJoin(user, sid, name, flatId) {
    await setDoc(doc(db, 'societies', sid, 'members', user.uid), { name: user.name, email: user.email, role: 'resident', status: 'pending', flatId, createdAt: Date.now() });
    await setDoc(doc(db, 'users', user.uid), { societies: { [sid]: { name, role: 'resident' } } }, { merge: true });
  },
  async leaveIndex(uid, sid) { await updateDoc(doc(db, 'users', uid), { [`societies.${sid}`]: deleteField() }); },

  watchMember(sid, uid, cb, err) { return onSnapshot(doc(db, 'societies', sid, 'members', uid), s => cb(s.exists() ? { id: s.id, ...s.data() } : null), err); },
  watchSociety(sid, cb, err) { return onSnapshot(doc(db, 'societies', sid), s => cb(s.exists() ? { id: s.id, ...s.data() } : null), err); },
  watchMembers(sid, cb, err) { return onSnapshot(collection(db, 'societies', sid, 'members'), s => cb(list(s)), err); },
  watchAccounts(sid, cb, err) { return onSnapshot(collection(db, 'societies', sid, 'accounts'), s => cb(list(s)), err); },
  watchAccount(sid, flatId, cb, err) { return onSnapshot(doc(db, 'societies', sid, 'accounts', flatId), s => cb(s.exists() ? { id: s.id, ...s.data() } : { id: flatId, payments: {} }), err); },
  watchClaims(sid, cb, err, flatId) {
    const base = collection(db, 'societies', sid, 'claims');
    // Filtered queries sort on the phone, so no extra Firestore index is needed.
    const q = flatId ? query(base, where('flatId', '==', flatId), limit(100)) : query(base, orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q, s => cb(byNewest(list(s))), err);
  },
  watchNotices(sid, cb, err) { return onSnapshot(query(collection(db, 'societies', sid, 'notices'), orderBy('createdAt', 'desc'), limit(100)), s => cb(list(s)), err); },
  watchComplaints(sid, cb, err, uid) {
    const base = collection(db, 'societies', sid, 'complaints');
    const q = uid ? query(base, where('uid', '==', uid), limit(100)) : query(base, orderBy('createdAt', 'desc'), limit(300));
    return onSnapshot(q, s => cb(byNewest(list(s))), err);
  },


  // Announcements (short messages from the committee)
  watchMessages(sid, cb, err) { return onSnapshot(query(collection(db, 'societies', sid, 'messages'), orderBy('createdAt', 'desc'), limit(100)), s => cb(list(s)), err); },
  saveMessage(sid, m) { const { id, ...data } = m; return setDoc(doc(db, 'societies', sid, 'messages', id || newId()), data); },
  deleteMessage: (sid, id) => deleteDoc(doc(db, 'societies', sid, 'messages', id)),

  // Fund collections (वर्गणी). Each fund keeps a map of flats that have paid.
  watchFunds(sid, cb, err) { return onSnapshot(query(collection(db, 'societies', sid, 'funds'), orderBy('createdAt', 'desc'), limit(50)), s => cb(list(s)), err); },
  saveFund(sid, f) { const { id, ...data } = f; return id ? updateDoc(doc(db, 'societies', sid, 'funds', id), data) : setDoc(doc(db, 'societies', sid, 'funds', newId()), data); },
  deleteFund: (sid, id) => deleteDoc(doc(db, 'societies', sid, 'funds', id)),
  setFundPaid: (sid, fundId, flatId, rec) => setDoc(doc(db, 'societies', sid, 'funds', fundId), { paid: { [flatId]: rec ? rec : deleteField() } }, { merge: true }),

  // Files: metadata doc + content split into ~700 KB chunks (Firestore docs max 1 MB).
  watchFiles(sid, cb, err, publicOnly) {
    const base = collection(db, 'societies', sid, 'files');
    const q = publicOnly ? query(base, where('visibility', '==', 'all'), limit(300)) : query(base, orderBy('createdAt', 'desc'), limit(300));
    return onSnapshot(q, s => cb(byNewest(list(s))), err);
  },
  async uploadFile(sid, meta, chunks) {
    const id = newId();
    for (let i = 0; i < chunks.length; i++) await setDoc(doc(db, 'societies', sid, 'files', id, 'chunks', String(i)), { d: chunks[i] });
    await setDoc(doc(db, 'societies', sid, 'files', id), { ...meta, chunks: chunks.length });
    return id;
  },
  async readFile(sid, id, n) {
    const out = [];
    for (let i = 0; i < n; i++) { const c = await getDoc(doc(db, 'societies', sid, 'files', id, 'chunks', String(i))); out.push(c.exists() ? c.data().d : ''); }
    return out;
  },
  async deleteFile(sid, id, n) {
    await deleteDoc(doc(db, 'societies', sid, 'files', id));
    for (let i = 0; i < n; i++) { try { await deleteDoc(doc(db, 'societies', sid, 'files', id, 'chunks', String(i))); } catch (e) {} }
  },

  // Owner only (rules check the owner's verified email).
  watchAllSocieties(cb, err) { return onSnapshot(query(collection(db, 'societies'), orderBy('createdAt', 'desc'), limit(500)), s => cb(list(s)), err); },
  setPlan: (sid, data) => updateDoc(doc(db, 'societies', sid), data),

  async updateSociety(sid, data) {
    const b = writeBatch(db);
    b.update(doc(db, 'societies', sid), data);
    if (data.name) {
      const s = await getDoc(doc(db, 'societies', sid));
      if (s.exists() && s.data().code) b.set(doc(db, 'joinCodes', s.data().code), { sid, name: data.name });
    }
    await b.commit();
  },
  updateMember: (sid, uid, data) => updateDoc(doc(db, 'societies', sid, 'members', uid), data),
  removeMember: (sid, uid) => deleteDoc(doc(db, 'societies', sid, 'members', uid)),
  // Serial receipt number per society and financial year (key like fy2627), reserved atomically.
  nextReceiptNo: (sid, key) => runTransaction(db, async t => {
    const ref = doc(db, 'societies', sid), snap = await t.get(ref);
    const n = (Number(((snap.data() || {}).rcptSeq || {})[key]) || 0) + 1;
    t.update(ref, { [`rcptSeq.${key}`]: n });
    return n;
  }),
  setReminder: (sid, flatId, rec) => setDoc(doc(db, 'societies', sid, 'accounts', flatId), { reminder: rec }, { merge: true }),
  setPayments: (sid, flatId, map) => setDoc(doc(db, 'societies', sid, 'accounts', flatId), { payments: map }, { merge: true }),
  async setPayment(sid, flatId, month, rec) {
    await setDoc(doc(db, 'societies', sid, 'accounts', flatId), { payments: { [month]: rec ? rec : deleteField() } }, { merge: true });
  },
  addClaim: (sid, c) => setDoc(doc(db, 'societies', sid, 'claims', newId()), c),
  updateClaim: (sid, id, data) => updateDoc(doc(db, 'societies', sid, 'claims', id), data),
  saveNotice(sid, n) { const { id, ...data } = n; return setDoc(doc(db, 'societies', sid, 'notices', id || newId()), data); },
  deleteNotice: (sid, id) => deleteDoc(doc(db, 'societies', sid, 'notices', id)),
  addComplaint: (sid, c) => setDoc(doc(db, 'societies', sid, 'complaints', newId()), c),
  updateComplaint: (sid, id, data) => updateDoc(doc(db, 'societies', sid, 'complaints', id), data)
};
