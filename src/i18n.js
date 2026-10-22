// Three languages: Marathi (the source text in the code), Hindi and English.
// T('मराठी मजकूर', ...values) returns the text in the chosen language; {0}, {1} are filled with values.
// Data saved by one person (posts, folders, payment modes) is stored in Marathi and shown translated,
// and canon() turns a Hindi or English word back into its Marathi form before saving.
import { DICT } from './dict.js';

const KEY = 'sachiv-lang';
let saved = null;
try { saved = localStorage.getItem(KEY); } catch (e) {}
const device = (typeof navigator !== 'undefined' && navigator.language) || '';
export const LANG = ['mr', 'hi', 'en'].includes(saved) ? saved : (/^hi/i.test(device) ? 'hi' : /^en/i.test(device) && !/IN$/i.test(device) ? 'en' : 'mr');
export const LANGS = [['mr', 'मराठी'], ['hi', 'हिंदी'], ['en', 'English']];
const IDX = { hi: 0, en: 1 };

const REV = new Map();
for (const k of Object.keys(DICT)) REV.set(k, k);
for (const [k, v] of Object.entries(DICT)) v.forEach(x => { if (x && !REV.has(x)) REV.set(x, k); });

export const canon = s => (typeof s === 'string' && REV.get(s)) || s;
export function T(s, ...a) {
  const k = canon(s);
  const out = LANG === 'mr' || typeof k !== 'string' ? k : ((DICT[k] || [])[IDX[LANG]] || k);
  return a.length ? String(out).replace(/\{(\d)\}/g, (_, i) => a[i] ?? '') : out;
}
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch (e) {}
  location.reload();
}
if (typeof document !== 'undefined') document.documentElement.lang = LANG;
