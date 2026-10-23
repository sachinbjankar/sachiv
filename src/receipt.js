// Payment receipt (पावती) drawn as a PNG, in the app's language. L(key) gives the label text.
const GREEN = '#0B5D4B', GOLD = '#D99A1E', INK = '#0F172A', MUTED = '#64748B', LINE = '#E2E8F0';

function wrap(ctx, text, maxW) {
  const out = []; let cur = '';
  for (const w of String(text || '').split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; } }
  if (cur) out.push(cur);
  return out;
}

// r: { no, date, flatId, name, purpose, amount, mode, ref, by }
export async function drawReceipt(soc, r, L) {
  try {
    await Promise.race([Promise.all([
      document.fonts.load('700 40px "Mukta"', 'पावती ₹ Aa'),
      document.fonts.load('400 30px "Mukta"', 'पावती ₹ Aa'),
      document.fonts.load('800 40px "Mukta"', '₹0123')
    ]), new Promise(res => setTimeout(res, 2500))]);
  } catch (e) {}
  const W = 1240, M = 90, H = 1180;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (!x.roundRect) x.roundRect = function (a, b, w, h) { this.rect(a, b, w, h); };
  const F = (s, w = 400) => `${w} ${s}px "Mukta", "Hind", sans-serif`;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  // header band
  const g = x.createLinearGradient(0, 0, W, 260); g.addColorStop(0, '#13806A'); g.addColorStop(1, '#08473A');
  x.fillStyle = g; x.fillRect(0, 0, W, 250);
  x.fillStyle = '#fff'; x.textAlign = 'left';
  x.font = F(46, 700);
  let y = 92;
  for (const l of wrap(x, soc.name, W - 2 * M).slice(0, 2)) { x.fillText(l, M, y); y += 54; }
  x.font = F(26); x.fillStyle = '#CFEDE3';
  const sub = [soc.address, soc.regNo ? L('नोंदणी क्रमांक') + ': ' + soc.regNo : ''].filter(Boolean).join(' · ');
  if (sub) x.fillText(wrap(x, sub, W - 2 * M)[0], M, Math.min(y + 4, 228));
  // title row
  y = 330;
  x.fillStyle = INK; x.font = F(56, 800); x.fillText(L('पावती'), M, y);
  x.textAlign = 'right'; x.font = F(26, 600); x.fillStyle = MUTED;
  x.fillText(L('पावती क्र.') + ' ' + r.no, W - M, y - 30);
  x.fillText(L('दिनांक') + ': ' + r.date, W - M, y + 6);
  x.textAlign = 'left';
  // amount box
  y = 380;
  x.fillStyle = '#F8FAFC'; x.strokeStyle = LINE; x.lineWidth = 2;
  x.beginPath(); x.roundRect(M, y, W - 2 * M, 150, 26); x.fill(); x.stroke();
  x.fillStyle = MUTED; x.font = F(28, 600); x.fillText(L('मिळालेली रक्कम'), M + 36, y + 56);
  x.fillStyle = GREEN; x.font = F(76, 800); x.fillText('₹' + Math.round(r.amount).toLocaleString('en-IN'), M + 36, y + 128);
  // rows
  const rows = [
    [L('सदनिका'), r.flatId],
    [L('नाव'), r.name || '—'],
    [L('कशासाठी'), r.purpose],
    [L('कसे भरले'), r.mode || '—'],
    [L('संदर्भ क्र. / UTR'), r.ref || '—'],
    [L('नोंद करणारे'), r.by || L('समिती')]
  ];
  y = 600;
  for (const [k, v] of rows) {
    x.fillStyle = MUTED; x.font = F(28, 600); x.fillText(k, M, y);
    x.fillStyle = INK; x.font = F(32, 700);
    x.textAlign = 'right'; x.fillText(wrap(x, v, 640)[0], W - M, y); x.textAlign = 'left';
    x.strokeStyle = LINE; x.lineWidth = 2; x.setLineDash([8, 8]);
    x.beginPath(); x.moveTo(M, y + 26); x.lineTo(W - M, y + 26); x.stroke(); x.setLineDash([]);
    y += 70;
  }
  // PAID stamp
  x.save(); x.translate(W - M - 170, 455); x.rotate(-0.15);
  x.strokeStyle = GOLD; x.lineWidth = 6; x.beginPath(); x.roundRect(-120, -48, 240, 96, 18); x.stroke();
  x.fillStyle = GOLD; x.font = F(44, 800); x.textAlign = 'center'; x.fillText(L('जमा'), 0, 16); x.restore();
  // footer
  y = H - 120;
  x.fillStyle = MUTED; x.font = F(24); x.textAlign = 'left';
  x.fillText(L('ही संगणकीय पावती आहे, सहीची आवश्यकता नाही.'), M, y);
  x.fillText(L('Sachiv ॲपद्वारे तयार'), M, y + 40);
  x.textAlign = 'right'; x.fillStyle = INK; x.font = F(30, 700);
  x.fillText(L('खजिनदार / सचिव'), W - M, y + 20);
  x.fillStyle = GREEN; x.fillRect(0, H - 14, W, 14);
  return await new Promise(res => c.toBlob(res, 'image/png'));
}
