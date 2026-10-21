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
  signOut as fbSignOut, sendPasswordResetEmail, updateProfile
} from 'firebase/auth';
import {
  getFirestore, doc, collection, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, deleteField
} from 'firebase/firestore';
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const list = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
const byNewest = a => a.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');
const newId = () => doc(collection(db, '_ids')).id;

export const backend = {
  kind: 'firebase',
  onAuth(cb) { return onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email, name: u.displayName || '' } : null)); },
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
    b.set(doc(db, 'societies', sid), { ...data, createdBy: user.uid, code, createdAt: Date.now() });
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
