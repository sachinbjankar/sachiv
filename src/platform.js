// Phone features: open UPI apps and WhatsApp, share images. Works in the Android app (Capacitor) and in a browser.
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const isNative = Capacitor.isNativePlatform();

export async function openExternal(url) {
  if (isNative) { try { await AppLauncher.openUrl({ url }); return true; } catch (e) { return false; } }
  const w = window.open(url, '_blank'); if (!w) location.href = url; return true;
}

export function upiLink({ upi, name, amount, note }) {
  const p = new URLSearchParams({ pa: upi, pn: name.slice(0, 40), am: Number(amount).toFixed(2), cu: 'INR', tn: note.slice(0, 50) });
  return 'upi://pay?' + p.toString().replace(/\+/g, '%20');
}

export function waLink(phone, text) {
  let d = String(phone || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

const blobToBase64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

// Share an image (letterhead notice) to WhatsApp or any app. Returns 'shared' | 'downloaded' | 'failed'.
export async function shareImage(blob, filename, text) {
  try {
    if (isNative) {
      const data = await blobToBase64(blob);
      const f = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
      await Share.share({ title: filename, text, files: [f.uri], dialogTitle: 'पाठवा' });
      return 'shared';
    }
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return 'shared'; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'downloaded';
  } catch (e) { return e && (e.name === 'AbortError' || /cancel/i.test(String(e.message || e))) ? 'cancelled' : 'failed'; }
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) {} ta.remove(); return ok;
  }
}
