// Draws a notice or minutes on the society letterhead as a PNG (A4 proportions, 1240px wide).
function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/); let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; } }
    out.push(cur);
  }
  return out;
}

export async function drawLetterhead(soc, d) {
  try {
    await Promise.race([Promise.all([
      document.fonts.load('32px "Tiro Devanagari Marathi"', 'सूचना Aa'),
      document.fonts.load('700 32px "Hind"', 'सूचना Aa')
    ]), new Promise(r => setTimeout(r, 2500))]);
  } catch (e) {}
  const W = 1240, M = 110, inner = W - 2 * M, isMin = d.kind === 'minutes', en = d.lang === 'en', hi = d.lang === 'hi';
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  const F = (s, w = 400) => `${w} ${s}px "Tiro Devanagari Marathi", "Hind", serif`;
  const items = String(d.body || '').split('\n').map(x => x.trim()).filter(Boolean);
  ctx.font = F(34);
  const blocks = items.map((t, i) => {
    const num = isMin && !/^\d+[.)]/.test(t);
    const label = num ? `${i + 1}. ` : '';
    const lw = label ? ctx.measureText(label).width : (/^\d+[.)]/.test(t) && !isMin ? 0 : 0);
    return { label, lw, lines: wrapLines(ctx, t, inner - lw) };
  });
  const LH = 56;
  const h = Math.max(1754, 480 + blocks.reduce((s, b) => s + b.lines.length * LH + 22, 0) + 280);
  c.width = W; c.height = h;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = '#0B5D4B'; ctx.fillRect(0, 0, W, 16); ctx.fillRect(0, h - 16, W, 16);
  ctx.textAlign = 'center'; ctx.fillStyle = '#0B5D4B';
  let y = 120;
  ctx.font = F(52, 700); for (const l of wrapLines(ctx, soc.name, inner)) { ctx.fillText(l, W / 2, y); y += 64; }
  ctx.font = F(26); ctx.fillStyle = '#4A5A62';
  const sub = [soc.address, soc.regNo ? (en ? 'Reg. No. ' : hi ? 'पंजीकरण क्र. ' : 'नोंदणी क्र. ') + soc.regNo : ''].filter(Boolean).join(' · ');
  if (sub) { for (const l of wrapLines(ctx, sub, inner)) { ctx.fillText(l, W / 2, y - 8); y += 34; } }
  ctx.strokeStyle = '#0B5D4B'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(W - M, y); ctx.stroke();
  y += 80;
  ctx.fillStyle = isMin ? '#14232B' : '#B3261E'; ctx.font = F(isMin ? 42 : 56, 700);
  for (const l of wrapLines(ctx, d.heading, inner)) { ctx.fillText(l, W / 2, y); y += isMin ? 54 : 66; }
  ctx.fillStyle = '#4A5A62'; ctx.font = F(30);
  if (isMin) { ctx.fillText([d.dateLine, d.presentLine].filter(Boolean).join(' · '), W / 2, y + 4); }
  else { ctx.textAlign = 'right'; ctx.fillText(d.dateLine || '', W - M, y + 4); }
  y += 80;
  ctx.textAlign = 'left'; ctx.fillStyle = '#14232B';
  for (const b of blocks) {
    b.lines.forEach((l, i) => {
      if (i === 0 && b.label) { ctx.font = F(34, 700); ctx.fillText(b.label, M, y); }
      ctx.font = F(34); ctx.fillText(l, M + b.lw, y); y += LH;
    });
    y += 22;
  }
  y = Math.max(y + 90, h - 200);
  ctx.font = F(32); ctx.fillStyle = '#14232B';
  if (isMin) { ctx.textAlign = 'left'; ctx.fillText(en ? 'Secretary' : 'सचिव', M, y); ctx.textAlign = 'right'; ctx.fillText(en ? 'Chairman' : 'अध्यक्ष', W - M, y); }
  else { ctx.textAlign = 'right'; ctx.fillText(en ? 'Secretary,' : 'सचिव,', W - M, y); ctx.fillText(en ? 'Managing Committee' : hi ? 'प्रबंध समिति' : 'व्यवस्थापकीय समिती', W - M, y + 46); }
  return await new Promise(r => c.toBlob(r, 'image/png'));
}
