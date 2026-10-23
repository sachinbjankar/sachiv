// Printable A4 poster for the society notice board: big QR that opens the join page for this society.
const GREEN = '#0B5D4B', GREEN2 = '#08473A', BUTTER = '#FFD27A', GOLD = '#D99A1E', INK = '#0F172A', MUTED = '#64748B';

function wrap(ctx, text, maxW) {
  const out = []; let cur = '';
  for (const w of String(text || '').split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; } }
  if (cur) out.push(cur);
  return out;
}

export async function drawPoster(soc, url, L) {
  const QR = await import('qrcode');
  try {
    await Promise.race([Promise.all([document.fonts.load('800 60px "Mukta"', 'सामील Aa'), document.fonts.load('600 30px "Mukta"', 'सामील Aa')]), new Promise(r => setTimeout(r, 2500))]);
  } catch (e) {}
  const W = 1240, H = 1754, M = 100;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (!x.roundRect) x.roundRect = function (a, b, w, h) { this.rect(a, b, w, h); };
  const F = (s, w = 400) => `${w} ${s}px "Mukta", "Hind", sans-serif`;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  // header
  const g = x.createLinearGradient(0, 0, W, 420); g.addColorStop(0, '#13806A'); g.addColorStop(1, GREEN2);
  x.fillStyle = g; x.fillRect(0, 0, W, 400);
  x.fillStyle = BUTTER; x.font = F(30, 700); x.textAlign = 'center';
  x.fillText(L('सोसायटीचे अधिकृत ॲप'), W / 2, 92);
  x.fillStyle = '#fff'; x.font = F(62, 800);
  let y = 178;
  for (const l of wrap(x, soc.name, W - 2 * M).slice(0, 2)) { x.fillText(l, W / 2, y); y += 72; }
  if (soc.address) { x.fillStyle = '#CFEDE3'; x.font = F(28); x.fillText(wrap(x, soc.address, W - 2 * M)[0], W / 2, Math.min(y + 4, 368)); }
  // headline
  x.fillStyle = INK; x.font = F(54, 800);
  y = 500;
  for (const l of wrap(x, L('QR स्कॅन करा आणि सोसायटीच्या ॲपमध्ये सामील व्हा'), W - 2 * M)) { x.fillText(l, W / 2, y); y += 64; }
  // QR with frame
  const qrSize = 640, qx = (W - qrSize) / 2, qy = y + 20;
  x.fillStyle = '#F8FAFC'; x.strokeStyle = '#E2E8F0'; x.lineWidth = 3;
  x.beginPath(); x.roundRect(qx - 40, qy - 40, qrSize + 80, qrSize + 80, 40); x.fill(); x.stroke();
  const qc = document.createElement('canvas');
  await QR.toCanvas(qc, url, { width: qrSize, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0F172A', light: '#FFFFFF' } });
  x.drawImage(qc, qx, qy, qrSize, qrSize);
  // logo in the middle of the QR
  const lg = 110; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(W / 2 - lg / 2 - 10, qy + qrSize / 2 - lg / 2 - 10, lg + 20, lg + 20, 26); x.fill();
  x.fillStyle = GREEN; x.beginPath(); x.roundRect(W / 2 - lg / 2, qy + qrSize / 2 - lg / 2, lg, lg, 24); x.fill();
  x.fillStyle = BUTTER; x.font = F(76, 800); x.fillText('स', W / 2, qy + qrSize / 2 + 26);
  // join code
  y = qy + qrSize + 110;
  x.fillStyle = MUTED; x.font = F(30, 600); x.fillText(L('किंवा ॲपमध्ये हा जॉइन कोड टाका'), W / 2, y);
  x.fillStyle = GREEN; x.font = F(92, 800); x.fillText(soc.code.split('').join(' '), W / 2, y + 100);
  // steps
  y += 170;
  const steps = [L('फोनच्या कॅमेऱ्याने QR स्कॅन करा'), L('Sachiv ॲप उघडा / डाउनलोड करा'), L('खाते तयार करून तुमची सदनिका निवडा')];
  const colW = (W - 2 * M) / 3;
  steps.forEach((t, i) => {
    const cx = M + colW * i + colW / 2;
    x.fillStyle = GOLD; x.beginPath(); x.arc(cx, y + 30, 32, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = F(36, 800); x.fillText(String(i + 1), cx, y + 43);
    x.fillStyle = INK; x.font = F(27, 600);
    wrap(x, t, colW - 30).forEach((l, j) => x.fillText(l, cx, y + 104 + j * 36));
  });
  // footer
  x.fillStyle = GREEN; x.fillRect(0, H - 90, W, 90);
  x.fillStyle = '#fff'; x.font = F(28, 600);
  x.fillText(L('Sachiv · मराठी · हिंदी · English · सभासदांसाठी मोफत'), W / 2, H - 36);
  return c;
}

export const canvasToBlob = c => new Promise(r => c.toBlob(r, 'image/png'));

export async function posterPdf(canvas) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
  return pdf.output('blob');
}
