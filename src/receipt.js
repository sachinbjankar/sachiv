// Payment receipt (पावती) in the classic printed style: A5 landscape, bilingual labels,
// numbered receipt box, amount box, amount in words and a signature line.
// Drawn on a canvas (2480×1750 ≈ A5 at 300 dpi), shared as an image or saved as a PDF.
const NAVY = '#1B2340', GOLD = '#E3A21A', CREAM = '#FFFDF6', INK = '#1B2340', MUTED = '#6B7280', RULE = '#D9D6CC', GOOD = '#0B7A4B', BAD = '#B42318';

// English words, Indian system: 3500 → "Rupees Three Thousand Five Hundred Only"
export function amountInWords(n) {
  n = Math.round(Number(n) || 0);
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = x => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
  const three = x => x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x);
  const cr = Math.floor(n / 1e7); n %= 1e7;
  const lk = Math.floor(n / 1e5); n %= 1e5;
  const th = Math.floor(n / 1000); n %= 1000;
  const s = [cr ? (cr >= 100 ? amountInWords(cr).replace(/^Rupees | Only$/g, '') : two(cr)) + ' Crore' : '', lk ? two(lk) + ' Lakh' : '', th ? two(th) + ' Thousand' : '', n ? three(n) : ''].filter(Boolean).join(' ');
  return `Rupees ${s || 'Zero'} Only`;
}

// Lotus mark in a gold circle (generic, works for any society)
function lotus(x, cx, cy, r) {
  x.fillStyle = GOLD; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.save(); x.translate(cx, cy + r * 0.12); x.fillStyle = NAVY;
  const petal = (ang, len, wid) => { x.save(); x.rotate(ang); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(wid, -len * 0.55, 0, -len); x.quadraticCurveTo(-wid, -len * 0.55, 0, 0); x.fill(); x.restore(); };
  petal(0, r * 0.62, r * 0.2); petal(-0.62, r * 0.55, r * 0.17); petal(0.62, r * 0.55, r * 0.17); petal(-1.18, r * 0.42, r * 0.13); petal(1.18, r * 0.42, r * 0.13);
  x.fillRect(-r * 0.42, r * 0.1, r * 0.84, r * 0.09); x.fillRect(-r * 0.3, r * 0.25, r * 0.6, r * 0.07);
  x.restore();
}

// Shrink the font until the text fits; returns the size used.
function fit(x, text, maxW, size, min, weight) {
  let s = size;
  while (s > min) { x.font = `${weight} ${s}px "Mukta", "Hind", sans-serif`; if (x.measureText(text).width <= maxW) break; s -= 0.5; }
  x.font = `${weight} ${s}px "Mukta", "Hind", sans-serif`;
  return s;
}

// r: { no, date, flatId, name, kind: 'maint'|'fund', period, mode, ref, amount, dues (number|null), asOn }
// tx: { t(mr) → label in app language, en(mr) → English label, lang }
export async function drawReceipt(soc, r, tx) {
  try {
    await Promise.race([Promise.all([
      document.fonts.load('800 40px "Mukta"', 'पावती ₹ Aa'), document.fonts.load('700 40px "Mukta"', 'पावती ₹ Aa'),
      document.fonts.load('600 30px "Mukta"', 'पावती ₹ Aa'), document.fonts.load('400 30px "Mukta"', 'पावती ₹ Aa')
    ]), new Promise(res => setTimeout(res, 2500))]);
  } catch (e) {}
  const en = tx.lang === 'en';
  const P = k => en ? tx.en(k) : tx.t(k);            // primary label
  const Bi = k => en ? tx.en(k) : `${tx.t(k)} / ${tx.en(k)}`; // one-line bilingual
  const BW = 910, BH = 642, K = 2480 / BW;
  const c = document.createElement('canvas'); c.width = 2480; c.height = Math.round(BH * K);
  const x = c.getContext('2d'); x.scale(K, K);
  const F = (s, w = 400) => `${w} ${s}px "Mukta", "Hind", sans-serif`;
  // paper and double border
  x.fillStyle = CREAM; x.fillRect(0, 0, BW, BH);
  x.strokeStyle = NAVY; x.lineWidth = 3; x.strokeRect(20, 20, BW - 40, BH - 40);
  x.lineWidth = 1; x.strokeRect(29, 29, BW - 58, BH - 58);
  // logo + society name
  lotus(x, 95, 92, 43);
  x.textAlign = 'left'; x.fillStyle = NAVY;
  const nameW = 440;
  const ns = fit(x, soc.name || '', nameW, 36, 20, 800);
  let ny = 84;
  if (x.measureText(soc.name || '').width > nameW) { // still too long: two lines
    x.font = F(22, 800); const words = String(soc.name).split(/\s+/); let l1 = '';
    while (words.length && x.measureText((l1 ? l1 + ' ' : '') + words[0]).width <= nameW) l1 += (l1 ? ' ' : '') + words.shift();
    x.fillText(l1, 155, 66); fit(x, words.join(' '), nameW, 22, 14, 800); x.fillText(words.join(' '), 155, 92); ny = 92;
  } else x.fillText(soc.name || '', 155, ns > 30 ? 84 : 80);
  let sy = ny + 24;
  if (soc.nameEn) { x.fillStyle = NAVY; fit(x, String(soc.nameEn).toUpperCase(), nameW, 15, 10, 700); x.fillText(String(soc.nameEn).toUpperCase(), 155, sy); sy += 21; }
  const sub = [soc.address, soc.regNo ? `${P('नोंदणी क्रमांक')}: ${soc.regNo}` : ''].filter(Boolean).join(' · ');
  x.fillStyle = MUTED;
  if (sub && sy < 150) { fit(x, sub, nameW, 12, 9, 400); x.fillText(sub, 155, sy); sy += 18; }
  if (soc.contact && sy < 160) { const t = `${en ? 'Contact' : tx.t('संपर्क') + ' / Contact'}: ${soc.contact}`; fit(x, t, nameW, 12, 9, 400); x.fillText(t, 155, sy); }
  // receipt number box
  x.strokeStyle = NAVY; x.lineWidth = 1.5; x.strokeRect(620, 48, 245, 116);
  x.fillStyle = NAVY; x.fillRect(620, 48, 245, 36);
  x.fillStyle = '#fff'; x.font = F(15, 700); x.textAlign = 'center';
  x.fillText(en ? 'RECEIPT' : `${tx.t('पावती')}  ·  RECEIPT`, 742, 72);
  const boxRow = (k, v, y) => {
    x.textAlign = 'left'; x.fillStyle = MUTED; x.font = F(11.5, 600); x.fillText(en ? tx.en(k) : `${tx.t(k)} / ${tx.en(k)}`, 632, y);
    x.textAlign = 'right'; x.fillStyle = INK; fit(x, v, 120, 14.5, 10, 800); x.fillText(v, 855, y);
  };
  boxRow('पावती क्र.', r.no, 112);
  boxRow('दिनांक', r.date, 145);
  // gold rule and title
  x.fillStyle = GOLD; x.fillRect(50, 182, BW - 100, 4);
  x.fillStyle = INK; x.textAlign = 'center';
  const title = r.kind === 'fund' ? 'वर्गणी पावती' : 'देखभाल शुल्क पावती';
  const tt = en ? tx.en(title) : `${tx.t(title)}  ·  ${tx.en(title)}`;
  fit(x, tt, 760, 18, 12, 700); x.fillText(tt, BW / 2, 218);
  // detail rows
  const rows = [
    ['सभासदाचे नाव', r.name || '—'],
    ['सदनिका क्र.', r.flatId || '—'],
    r.kind === 'fund' ? ['वर्गणीचे नाव', r.period || '—'] : ['कालावधी', r.period || '—'],
    ['भरणा पद्धत', [r.mode, r.ref ? `Ref: ${r.ref}` : ''].filter(Boolean).join('  ·  ') || '—'],
    ['अक्षरी रक्कम', amountInWords(r.amount)]
  ];
  let y = 256;
  for (const [k, v] of rows) {
    x.textAlign = 'left';
    x.fillStyle = INK; x.font = F(14, 600); x.fillText(P(k), 58, y);
    if (!en) { x.fillStyle = MUTED; x.font = F(10.5, 400); x.fillText(tx.en(k), 58, y + 17); }
    x.fillStyle = INK; fit(x, v, 450, 15.5, 10, 600); x.fillText(v, 218, y + 9);
    x.strokeStyle = RULE; x.lineWidth = 1; x.beginPath(); x.moveTo(205, y + 23); x.lineTo(668, y + 23); x.stroke();
    y += 47.5;
  }
  // amount box
  x.fillStyle = '#FBEFD9'; x.fillRect(693, 248, 172, 109);
  x.strokeStyle = GOLD; x.lineWidth = 2; x.strokeRect(693, 248, 172, 109);
  x.textAlign = 'center'; x.fillStyle = INK; x.font = F(12.5, 600); x.fillText(Bi('रक्कम'), 779, 276);
  const amt = '₹' + Math.round(Number(r.amount) || 0).toLocaleString('en-IN');
  fit(x, amt, 150, 36, 18, 800); x.fillText(amt, 779, 330);
  // dues status (maintenance only)
  if (r.dues != null) {
    const ok = !(r.dues > 0);
    x.fillStyle = ok ? GOOD : BAD; x.font = F(11, 700);
    x.fillText(ok ? Bi('थकबाकी नाही') : `${Bi('थकबाकी')}: ₹${Math.round(r.dues).toLocaleString('en-IN')}`, 779, 379);
    x.fillText(`as on ${r.asOn}`, 779, 396);
  }
  // thank you + signature
  x.textAlign = 'left'; x.fillStyle = INK; x.font = F(16, 700);
  x.fillText(en ? 'Thank you' : `${tx.t('धन्यवाद!')} / Thank you`, 58, 556);
  x.fillStyle = MUTED; x.font = F(11, 400);
  x.fillText(en ? tx.en('ही संगणकीय पावती आहे.') : `${tx.t('ही संगणकीय पावती आहे.')} / ${tx.en('ही संगणकीय पावती आहे.')}`, 58, 580);
  x.strokeStyle = NAVY; x.lineWidth = 1.2; x.beginPath(); x.moveTo(630, 548); x.lineTo(865, 548); x.stroke();
  x.textAlign = 'center'; x.fillStyle = INK; x.font = F(13.5, 700);
  x.fillText(en ? 'Treasurer / Secretary' : tx.t('खजिनदार / सचिव'), 747, 569);
  if (!en) { x.fillStyle = MUTED; x.font = F(10.5, 400); x.fillText('Treasurer / Secretary', 747, 587); }
  x.fillStyle = '#A3A3A3'; x.font = F(8.5, 400); x.fillText('Sachiv', BW / 2, 605);
  return c;
}

export const receiptPng = c => new Promise(r => c.toBlob(r, 'image/png'));

export async function receiptPdf(c) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'landscape' });
  pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 148);
  return pdf.output('blob');
}
