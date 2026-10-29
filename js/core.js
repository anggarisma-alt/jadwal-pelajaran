/**
 * ============================================================
 * JADWAL MTs — Frontend inti (js/core.js) — GitHub Pages
 * Vanilla JS • hash-router (#/halaman) • fetch() ke GAS REST
 * Bundel admin (js/admin.js) dimuat lazy hanya setelah admin login.
 * Konfigurasi URL backend: js/config.js
 * ============================================================
 */
// ════════ BAGIAN 1: UTILITAS & STATE ════════
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const S = { token: null, user: null, page: null, pending: 0, bootHash: null, day: null, jv: 'kelas', jk: null, jg: null, pubKelas: null, pubGuru: null, mt: 'guru', bk: null, charts: {}, av: null, wk: null, expPer: '' };
let PUB = null, ADM = null, M = null, X = null;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const tmin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : NaN; };
const fmin = n => ('0' + Math.floor(n / 60)).slice(-2) + ':' + ('0' + (n % 60)).slice(-2);
const shortName = n => String(n || '').split(',')[0].trim().split(/\s+/).slice(0, 2).join(' ');
const todayName = () => DAYS[(new Date().getDay() + 6) % 7];
const isAdm = () => S.user && (S.user.peran === 'admin' || S.user.peran === 'superadmin');
const initials = n => String(n || '?').split(',')[0].trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const by = a => { const o = {}; (a || []).forEach(r => { o[r.id] = r; }); return o; };
const val = id => { const e = $(id); return e ? e.value : ''; };
const chk = id => { const e = $(id); return !!(e && e.checked); };

// ════════ BAGIAN 2: TEMA ════════
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-bs-theme', t);
  $('themeIcon').className = 'bi ' + (t === 'dark' ? 'bi-sun' : 'bi-moon-stars');
  try { localStorage.setItem('jm_theme', t); } catch (e) { /* abaikan */ }
  const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = t === 'dark' ? '#0a1311' : '#047857';
}
function toggleTheme() {
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  if (S.page === 'dashboard' && typeof drawCharts === 'function') drawCharts();
}
function initTheme() {
  let t = null;
  try { t = localStorage.getItem('jm_theme'); } catch (e) { /* abaikan */ }
  if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(t);
}

// ════════ BAGIAN 3: LAPISAN API (fetch → GAS REST) ════════
// Semua komunikasi lewat fetch() ke GAS_URL (js/config.js). POST memakai text/plain agar
// tidak memicu CORS preflight. Baca di-retry; tulis membawa reqId (idempoten) sehingga aman di-retry.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const Perf = {
  rows: [],
  add(action, total, server) { this.rows.push({ action, total, server: server == null ? null : server, net: server == null ? null : total - server, at: Date.now() }); if (this.rows.length > 200) this.rows.shift(); },
  table() { console.table(this.rows.slice(-30)); }          // ketik Perf.table() di Console untuk melihat waktu jaringan vs server
};
window.Perf = Perf;
const LS_PREFIX = 'jm:v1:';                                  // naikkan versi bila bentuk data berubah → cache lama otomatis tak terpakai
const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(LS_PREFIX + k, s); }
    catch (e) {                                              // kuota penuh → buang cache pengguna lain lalu coba lagi
      try { Object.keys(localStorage).filter(x => x.indexOf(LS_PREFIX + 'boot:') === 0 && x !== LS_PREFIX + 'boot:' + (S.user ? S.user.id : '')).forEach(x => localStorage.removeItem(x)); localStorage.setItem(LS_PREFIX + k, s); } catch (e2) { /* tetap jalan tanpa cache */ }
    }
  },
  del(k) { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) { /* abaikan */ } }
};
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
function progress() { $('topProgress').classList.toggle('on', S.pending > 0); }
function waitOnline(ms) {
  return new Promise(r => { if (navigator.onLine !== false) return r(); const t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); });
}
const READ_FN = /^(apiPublicData|apiLogin|apiPublicPdf|apiSession|apiLogout|apiGetAppData|apiDashboard|apiListUsers|apiListPeriods|apiLoadArchive|apiGetLog|batch)$/;
const PUBLIC_FN = { apiLogin: 1, apiPublicData: 1, apiPublicPdf: 1 };
const SLOW_FN = { apiAutoSchedule: 1, apiAdminExport: 1, apiPublicPdf: 1 };
async function apiOnce(body, timeout) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
  try {
    const res = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    const text = await res.text();
    try { const j = JSON.parse(text); Perf.add(body.action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 200, message: 'Server membalas HTTP ' + res.status + ' (bukan JSON). Periksa URL /exec dan pengaturan deployment.' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Koneksi terputus. Periksa internet Anda.' };
  } finally { clearTimeout(timer); }
}
/** api('namaAksi', token?, ...args). Aksi publik (login, data publik) tanpa token; selain itu argumen pertama = token. */
async function api(fn, ...args) {
  if (!GAS_URL || /PASTE_URL/.test(GAS_URL)) return { success: false, message: 'URL backend belum diisi. Edit js/config.js lalu isi GAS_URL.' };
  const pub = !!PUBLIC_FN[fn], isRead = READ_FN.test(fn);
  const body = { action: fn, token: pub ? '' : (args[0] || ''), reqId: isRead ? '' : (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()), args: pub ? args : args.slice(1) };
  S.pending++; progress();
  try {
    let res; const tries = isRead ? 3 : 2;
    for (let i = 0; i < tries; i++) {
      if (i) { await sleep(1200 * i); if (navigator.onLine === false) await waitOnline(15000); }
      res = await apiOnce(body, SLOW_FN[fn] ? 150000 : isRead ? (i ? 40000 : 25000) : 90000);
      if (res.success || !res.retryable) break;
    }
    if (!res.network) { const who = S.user ? S.user.peran : (res.data && res.data.user ? res.data.user.peran : ''); if (who === 'admin' || who === 'superadmin') checkBackend(res.v); }
    if (res.newToken && S.user) { S.token = res.newToken; saveSession(); }
    if (!res.success && res.code === 'SESSION') onSessionExpired(res.message);
    else if (!res.success && res.code === 'WAJIB' && S.user && !_modalLocked) promptChangePw(true);
    return res;
  } finally { S.pending--; progress(); }
}
/** Jalankan aksi dengan tombol berstatus loading + toast kegagalan. Mengembalikan response atau null. */
async function act(btn, fn, ...args) {
  const old = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + (btn.dataset.busy || 'Memproses…'); }
  try {
    const r = await api(fn, ...args);
    if (!r || !r.success) { if (!(r && (r.code === 'SESSION' || r.code === 'WAJIB'))) toast((r && r.message) || 'Terjadi kesalahan.', 'err'); return null; }
    return r;
  } finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
}
/** Peringatkan admin bila backend (Apps Script) belum dideploy ulang dengan versi terbaru */
function cmpVer(a, b) { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; }
function checkBackend(v) {
  if (S.beWarned || (v && cmpVer(v, BACKEND_MIN) >= 0)) return;
  S.beWarned = true;
  toast('Backend Apps Script belum diperbarui (versi ' + (v || 'lama') + ', dibutuhkan ' + BACKEND_MIN + '). Di Apps Script: Terapkan → Kelola deployment → Edit → Versi baru → Terapkan.', 'warn', 15000);
}
function saveSession() { Store.set('sess', { token: S.token, user: S.user }); }
function tokenExp(t) {
  try { const b = String(t).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(b + '='.repeat((4 - b.length % 4) % 4))))).x || 0; } catch (e) { return 0; }
}
function onSessionExpired(msg) { if (S.user) forceLogout(msg || 'Sesi berakhir. Silakan masuk kembali.'); }
const _scripts = {};
function loadScript(src) {
  if (_scripts[src]) return _scripts[src];
  return (_scripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = () => { delete _scripts[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }));
}
const ensureChart = () => window.Chart ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js');
const loadAdminIfNeeded = () => isAdm() ? loadScript('js/admin.js?v=' + APP_VERSION) : Promise.resolve();   // bundel admin tidak ikut ke HP guru/siswa
const modalOpen = () => { try { return $('appModal').classList.contains('show'); } catch (e) { return false; } };

function toast(msg, type, ms) {
  type = type || 'ok';
  const ic = { ok: 'bi-check-circle-fill', err: 'bi-x-circle-fill', warn: 'bi-exclamation-triangle-fill' }[type] || 'bi-info-circle-fill';
  const el = document.createElement('div');
  el.className = 'toast-i ' + type; el.setAttribute('role', type === 'err' ? 'alert' : 'status');
  el.innerHTML = '<i class="bi ' + ic + '"></i><span>' + esc(msg) + '</span>';
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms || (type === 'err' ? 6000 : 3600));
}
let _modal = null, _modalLocked = false;
function openModal(o) {
  $('appModalTitle').textContent = o.title || '';
  $('appModalBody').innerHTML = o.body || '';
  $('appModalFooter').innerHTML = o.footer || ''; $('appModalFooter').style.display = o.footer ? '' : 'none';
  $('appModalDlg').className = 'modal-dialog modal-dialog-scrollable ' + (o.size || '');
  $('appModalClose').style.display = o.locked ? 'none' : '';
  if (!_modal || _modalLocked !== !!o.locked) {
    if (_modal) _modal.dispose();
    _modal = new bootstrap.Modal($('appModal'), { backdrop: o.locked ? 'static' : true, keyboard: !o.locked });
    _modalLocked = !!o.locked;
  }
  _modal.show();
  if (o.onShown) setTimeout(o.onShown, 120);
}
function closeModal() { if (_modal) _modal.hide(); }
function confirmBox(text, okLabel, cb, danger) {
  $('confirmBody').innerHTML = '<p class="mb-0">' + text + '</p>';
  const ok = $('confirmOk'); ok.textContent = okLabel || 'Ya, lanjut'; ok.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
  const m = bootstrap.Modal.getOrCreateInstance($('confirmModal'));
  ok.onclick = () => { m.hide(); setTimeout(cb, 200); };
  m.show();
}
function saveB64(b64, name, mime) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([u], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}
function copyText(id) {
  const t = $(id); t.select();
  try { (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Tersalin.'), () => { document.execCommand('copy'); toast('Tersalin.'); }); }
  catch (e) { try { document.execCommand('copy'); toast('Tersalin.'); } catch (e2) { toast('Salin manual: blok teks lalu salin.', 'warn'); } }
}
const stateEmpty = (icon, t, d) => '<div class="empty-state"><i class="bi ' + icon + '"></i><strong>' + esc(t) + '</strong>' + (d ? esc(d) : '') + '</div>';
const skeleton = n => Array.from({ length: n || 3 }, () => '<div class="skel mb-2" style="height:64px"></div>').join('');

// ════════ BAGIAN 4: MODEL DATA & INDEKS ════════
function useModel(m) { if (!m) return; M = m; if (!m._x) reindex(m); X = m._x; }
function reindex(m) {
  const x = {};
  x.guru = by(m.Guru); x.mapel = by(m.Mapel); x.kelas = by(m.Kelas); x.ruangan = by(m.Ruangan);
  x.days = DAYS.filter(d => (m.PengaturanHari || []).some(h => h.hari === d && h.aktif));
  x.jam = {}; x.kbm = {}; x.slots = {};
  x.days.forEach(d => {
    const rows = (m.JamPelajaran || []).filter(r => r.hari === d).sort((a, b) => tmin(a.mulai) - tmin(b.mulai) || a.jam_ke - b.jam_ke);
    x.jam[d] = rows; x.slots[d] = rows.filter(r => r.jam_ke > 0); x.kbm[d] = rows.filter(r => r.jam_ke > 0 && r.jenis === 'KBM');   // slots = semua nomor jam; kbm = yang bisa diisi mapel
  });
  x.maxJam = Math.max(0, ...x.days.map(d => Math.max(0, ...x.slots[d].map(r => r.jam_ke))));
  x.jd = {}; x.jg = {};
  (m.Jadwal || []).forEach(r => {
    x.jd[r.kelas_id + '|' + r.hari + '|' + r.jam_ke] = r;
    const k = r.guru_id + '|' + r.hari + '|' + r.jam_ke; (x.jg[k] = x.jg[k] || []).push(r);
  });
  x.un = new Set((m.KetersediaanGuru || []).filter(r => !r.tersedia).map(r => r.guru_id + '|' + r.hari + '|' + r.jam_ke));
  x.conf = new Set(); (m.conflicts || []).forEach(c => c.ids.forEach(i => x.conf.add(i)));
  x.hue = {}; (m.Mapel || []).forEach((mp, i) => { x.hue[mp.id] = Math.round((i * 137.508 + 60) % 360); });
  m._x = x;
}
function decodePublic(d) {
  const m = { cfg: d.cfg, Kelas: d.Kelas, Guru: d.Guru, Mapel: d.Mapel, PengaturanHari: d.PengaturanHari, JamPelajaran: d.JamPelajaran, Jadwal: [], JadwalPiket: [], KetersediaanGuru: [], conflicts: [], status: d.status };
  d.j.forEach((a, i) => m.Jadwal.push({ id: 'p' + i, hari: a[0], jam_ke: a[1], kelas_id: String(a[2]), mapel_id: String(a[3]), guru_id: a[4] < 0 ? '' : String(a[4]) }));
  d.p.forEach((a, i) => m.JadwalPiket.push({ id: 'q' + i, hari: a[0], guru_id: String(a[1]) }));
  return m;
}
/** Gabungkan hasil server (tabel, config, konflik) ke model admin */
function applyRes(res) {
  if (!ADM || !res) return;
  ADM.dashAt = 0;                                   // ringkasan dasbor dianggap basi setelah ada perubahan
  if (res.tables) Object.keys(res.tables).forEach(k => { ADM[k] = res.tables[k]; });
  if (res.conflicts) ADM.conflicts = res.conflicts;
  if (res.cfg) Object.assign(ADM.cfg, res.cfg);
  ADM._x = null; persistBoot();
}
function patchJadwal(res) {
  (res.removed || []).forEach(id => { ADM.Jadwal = ADM.Jadwal.filter(r => r.id !== id); });
  (res.rows || (res.row ? [res.row] : [])).forEach(row => { const i = ADM.Jadwal.findIndex(r => r.id === row.id); if (i >= 0) ADM.Jadwal[i] = row; else ADM.Jadwal.push(row); });
  if (res.conflicts) ADM.conflicts = res.conflicts;
  ADM._x = null; ADM.dashAt = 0; persistBoot();
}
// ── Pemuat data: SWR (tampil dari cache perangkat → segarkan di latar) ──
function applyPubCfg() {
  const c = PUB.cfg; $('sideTitle').textContent = c.nama_madrasah; document.title = c.nama_madrasah + ' — Jadwal';
  ['sideLogo', 'barLogo'].forEach(id => { $(id).innerHTML = c.logo_url ? '<img alt="" src="' + esc(c.logo_url) + '">' : '<i class="bi bi-calendar2-week"></i>'; });
}
/** Ambil data publik dari server. Mengembalikan true bila isinya berbeda dari cache. */
async function refreshPublic() {
  const r = await api('apiPublicData');
  if (r && r.success) {
    const h = hashStr(JSON.stringify(r.data)), c = Store.get('pub', null);
    Store.set('pub', { t: Date.now(), h, data: r.data });
    if (!c || c.h !== h || !PUB || PUB.error) { PUB = decodePublic(r.data); applyPubCfg(); return true; }
    return false;
  }
  if (!PUB) PUB = { error: (r && r.message) || 'Data belum tersedia.' };
  return false;
}
async function loadPublic() {
  const c = Store.get('pub', null);
  if (c && c.data) {
    PUB = decodePublic(c.data); applyPubCfg();
    if (Date.now() - c.t >= 60000) refreshPublic().then(ch => { if (ch && !modalOpen() && PAGES[S.page] && PAGES[S.page].pub && S.page !== 'login') rerender(); });
    return;
  }
  await refreshPublic();
}
function bootSig(d) { return hashStr(JSON.stringify([d.cfg, d.tables, d.dash || null])); }
function setBoot(d) {
  ADM = Object.assign({ cfg: d.cfg, me: d.me, dash: d.dash || null, dashAt: Date.now() }, d.tables);
  ADM.conflicts = d.tables.conflicts || [];
  ['Ruangan', 'MapelJam', 'GuruMapel', 'BlokWaktu', 'BebanMengajar', 'KetersediaanGuru'].forEach(k => { ADM[k] = ADM[k] || []; });
  ADM._x = null; S.bootHash = bootSig(d); persistBoot(true);
}
let _pbTimer = null;
function persistBoot(now) {
  clearTimeout(_pbTimer);
  const run = () => { if (!ADM || !S.user) return; const d = Object.assign({}, ADM); delete d._x; Store.set('boot:' + S.user.id, { t: Date.now(), sig: S.bootHash, data: d }); };
  if (now) run(); else _pbTimer = setTimeout(run, 800);
}
/** Segarkan bootstrap di latar. true bila ada perubahan dari server. */
async function revalidateApp() {
  const r = await api('apiGetAppData', S.token);
  if (!r || !r.success) return false;
  if (bootSig(r.data) === S.bootHash) { ADM.dashAt = Date.now(); return false; }
  setBoot(r.data); return true;
}
// ════════ BAGIAN 5: RENDER JADWAL (dipakai publik, guru, admin, cetak) ════════
const kodeOf = c => (c.mapel && c.mapel.kode) || '?';
function cellOf(kind, id, hari, jam) {
  if (kind === 'kelas') { const r = X.jd[id + '|' + hari + '|' + jam]; return r ? { r, mapel: X.mapel[r.mapel_id], guru: X.guru[r.guru_id], kelas: X.kelas[r.kelas_id] } : null; }
  const a = X.jg[id + '|' + hari + '|' + jam]; if (!a || !a.length) return null;
  const r = a[0]; return { r, rs: a, mapel: X.mapel[r.mapel_id], kelas: X.kelas[r.kelas_id], kelasList: a.map(x => X.kelas[x.kelas_id]).filter(Boolean), guru: X.guru[id] };
}
/** Nama kelas pada sel (kelas gabungan: "VII A + VII B") dan status bentrok sel */
const kelasNames = c => (c.kelasList || (c.kelas ? [c.kelas] : [])).map(k => k.nama).join(' + ');
const cellConf = c => (c.rs || [c.r]).some(r => X.conf.has(r.id));
/** Susunan baris: jam ke-n dan blok non-KBM (upacara/istirahat/shalat) di antara jam */
function layoutRows() {
  const blocks = {}, rows = [];
  X.days.forEach(d => { let last = 0; X.jam[d].forEach(r => { if (r.jam_ke > 0) last = r.jam_ke; else { blocks[last] = blocks[last] || {}; (blocks[last][d] = blocks[last][d] || []).push(r); } }); });
  const add = k => { if (blocks[k]) rows.push({ t: 'blok', k, items: blocks[k] }); };
  add(0); for (let j = 1; j <= X.maxJam; j++) { rows.push({ t: 'jam', j }); add(j); }
  return rows;
}
function jamInfo(d, j) { return X.kbm[d].filter(r => r.jam_ke === j)[0]; }                 // hanya jam pelajaran (bisa diisi mapel)
function slotRow(d, j) { return X.slots[d].filter(r => r.jam_ke === j)[0]; }               // nomor jam apa pun, termasuk yang ditempati blok (mis. upacara)
function cellInner(kind, c) {
  const second = kind === 'kelas' ? shortName(c.guru && c.guru.nama) : kelasNames(c);
  return '<b>' + esc(kodeOf(c)) + '</b><small>' + esc(second) + '</small>';
}
/** HTML tabel grid. opt.edit: sel bisa diklik (admin, per kelas). opt.print: tabel statis untuk cetak/PDF */
function renderGrid(kind, id, opt) {
  opt = opt || {};
  const today = todayName(), rows = layoutRows();
  const ref = X.days[0];
  let h = opt.print ? '<table class="pgrid">' : '<div class="grid-wrap"><table class="sgrid">';
  h += '<thead><tr><th class="g-time">Jam</th>' + X.days.map(d => '<th class="' + (d === today ? 'today' : '') + '">' + d + '</th>').join('') + '</tr></thead><tbody>';
  rows.forEach(row => {
    if (row.t === 'blok') {
      h += '<tr class="' + (opt.print ? 'blok-r' : 'blok-row') + '"><td class="g-time"></td>' + X.days.map(d => {
        const it = row.items[d]; if (!it) return '<td></td>';
        return '<td><div class="blok">' + it.map(b => esc(b.jenis)).join(' + ') + '<small>' + esc(it[0].mulai) + '–' + esc(it[it.length - 1].selesai) + '</small></div></td>';
      }).join('') + '</tr>'; return;
    }
    const ri = slotRow(ref, row.j) || X.days.map(d => slotRow(d, row.j)).filter(Boolean)[0];
    h += '<tr><td class="g-time"><b>' + row.j + '</b>' + (ri ? esc(ri.mulai) + '–' + esc(ri.selesai) : '') + '</td>';
    X.days.forEach(d => {
      const sr = slotRow(d, row.j);
      if (!sr) { h += '<td class="na">–</td>'; return; }
      if (sr.jenis !== 'KBM') { h += opt.print ? '<td><i>' + esc(sr.jenis) + '</i></td>' : '<td><div class="slotblok">' + esc(sr.jenis) + '<small>' + esc(sr.mulai) + '–' + esc(sr.selesai) + '</small></div></td>'; return; }
      const c = cellOf(kind, id, d, row.j);
      if (opt.print) { h += '<td>' + (c ? '<b>' + esc(kodeOf(c)) + '</b><br>' + esc(kind === 'kelas' ? shortName(c.guru && c.guru.nama) : kelasNames(c)) : '') + '</td>'; return; }
      if (kind === 'guru' && !c && X.un.has(id + '|' + d + '|' + row.j)) { h += '<td class="unv">Tidak bisa</td>'; return; }
      if (!c) { h += '<td>' + (opt.edit ? '<button class="cell empty" aria-label="Isi ' + d + ' jam ke-' + row.j + '" onclick="openSlot(\'' + id + '\',\'' + d + '\',' + row.j + ')"><i class="bi bi-plus-lg"></i></button>' : '') + '</td>'; return; }
      const cls = 'cell' + (cellConf(c) ? ' conf' : '');
      const inner = cellInner(kind, c) + (c.r.terkunci ? '<i class="bi bi-lock-fill lk"></i>' : '');
      h += '<td>' + (opt.edit ? '<button class="' + cls + '" style="--h:' + (X.hue[c.r.mapel_id] || 150) + '" onclick="openSlot(\'' + id + '\',\'' + d + '\',' + row.j + ')" aria-label="' + esc((c.mapel || {}).nama) + '">' + inner + '</button>'
        : '<div class="' + cls + '" style="--h:' + (X.hue[c.r.mapel_id] || 150) + '" title="' + esc((c.mapel || {}).nama) + '">' + inner + '</div>') + '</td>';
    });
    h += '</tr>';
  });
  h += '</tbody></table>' + (opt.print ? '' : '</div>');
  const beda = X.days.some(d => X.days.some(e => X.kbm[d].length && X.kbm[e].length && (X.kbm[d][0] || {}).mulai !== (X.kbm[e][0] || {}).mulai));
  if (!opt.print && beda) h += '<p class="small muted mt-2 mb-0"><i class="bi bi-info-circle"></i> Waktu jam pelajaran dapat berbeda per hari. Lihat tampilan harian untuk waktu pastinya.</p>';
  return h;
}
/** Tampilan harian (ponsel): tab hari + daftar jam */
function renderDayList(kind, id, opt) {
  opt = opt || {};
  if (!S.day || X.days.indexOf(S.day) < 0) S.day = X.days.indexOf(todayName()) >= 0 ? todayName() : X.days[0];
  const today = todayName();
  let h = '<div class="daytabs" role="tablist">' + X.days.map(d => {
    const n = X.kbm[d].filter(r => cellOf(kind, id, d, r.jam_ke)).length;
    return '<button class="daytab ' + (d === S.day ? 'on' : '') + (d === today ? ' today' : '') + '" role="tab" aria-selected="' + (d === S.day) + '" onclick="setDay(\'' + d + '\')">' + d.slice(0, 3) + '<small>' + n + ' jam</small></button>';
  }).join('') + '</div><div class="daylist">';
  X.jam[S.day].forEach(r => {
    const t = '<div class="dl-time"><b>' + esc(r.mulai) + '</b>' + esc(r.selesai) + '</div>';
    if (r.jenis !== 'KBM') { h += '<div class="dl-item">' + t + '<div class="dl-body blok"><i class="bi bi-' + (r.jam_ke ? 'flag' : 'cup-hot') + '"></i> ' + (r.jam_ke ? 'Jam ke-' + r.jam_ke + ' • ' : '') + esc(r.jenis) + '</div></div>'; return; }
    const c = cellOf(kind, id, S.day, r.jam_ke);
    const click = opt.edit ? ' onclick="openSlot(\'' + id + '\',\'' + S.day + '\',' + r.jam_ke + ')"' : '';
    const tag = opt.edit ? 'button' : 'div';
    if (!c) {
      const unv = kind === 'guru' && X.un.has(id + '|' + S.day + '|' + r.jam_ke);
      h += '<div class="dl-item">' + t + '<' + tag + ' class="dl-body ' + (unv ? 'unv' : 'empty') + '"' + click + '>' + (unv ? 'Tidak bisa mengajar' : (opt.edit ? '<i class="bi bi-plus-lg"></i> Jam ke-' + r.jam_ke + ' kosong' : 'Jam ke-' + r.jam_ke + ' — kosong')) + '</' + tag + '></div>';
      return;
    }
    const sub = kind === 'kelas' ? ((c.guru || {}).nama || '') : kelasNames(c);
    h += '<div class="dl-item">' + t + '<' + tag + ' class="dl-body' + (cellConf(c) ? ' conf' : '') + '" style="--h:' + (X.hue[c.r.mapel_id] || 150) + '"' + click + '><strong>' + esc((c.mapel || {}).nama) + (c.r.terkunci ? ' <i class="bi bi-lock-fill"></i>' : '') + '</strong><small>Jam ke-' + r.jam_ke + ' • ' + esc(sub) + '</small></' + tag + '></div>';
  });
  return h + '</div>';
}
function schedView(kind, id, opt) {
  S.sched = { kind, id, opt };
  if (!X.days.length) return stateEmpty('bi-calendar-x', 'Tabel jam pelajaran belum tersedia', 'Admin perlu mengatur Pengaturan Waktu.');
  return '<div id="schedBox"><div class="only-wide">' + renderGrid(kind, id, opt) + '</div><div class="only-narrow">' + renderDayList(kind, id, opt) + '</div></div>';
}
function setDay(d) {
  S.day = d; const s = S.sched; if (!s) return;
  if (S.page === 'g-home' || S.page === 'jadwal' || S.page.indexOf('pub') === 0) useModel(S.page.indexOf('pub') === 0 ? PUB : ADM);
  $('schedBox').innerHTML = '<div class="only-wide">' + renderGrid(s.kind, s.id, s.opt) + '</div><div class="only-narrow">' + renderDayList(s.kind, s.id, s.opt) + '</div>';
}
/** Jam per minggu: tiap rombel dihitung sebagai jam tersendiri (termasuk kelas gabungan) */
function totalJam(kind, id) { return (M.Jadwal || []).filter(r => (kind === 'kelas' ? r.kelas_id : r.guru_id) === id).length; }

// ── Ekspor/pratinjau: HTML statis + matriks Excel ──
function hdrHtml(title) {
  const c = M.cfg || {};
  return '<h1>' + esc(c.nama_madrasah || 'Madrasah') + '</h1><h2>' + esc(title) + ' — TA ' + esc(c.tahun_ajaran || '') + ' ' + esc(c.semester || '') + '</h2>';
}
function gridMatrix(kind, id) {
  const rows = layoutRows(), ref = X.days[0];
  const m = [['Jam'].concat(X.days)];
  rows.forEach(row => {
    if (row.t === 'blok') { m.push([''].concat(X.days.map(d => row.items[d] ? row.items[d].map(b => b.jenis).join(' + ') + ' ' + row.items[d][0].mulai + '-' + row.items[d][row.items[d].length - 1].selesai : ''))); return; }
    const ri = slotRow(ref, row.j) || {};
    m.push([row.j + (ri.mulai ? ' (' + ri.mulai + '-' + ri.selesai + ')' : '')].concat(X.days.map(d => {
      const sr = slotRow(d, row.j); if (!sr) return '-'; if (sr.jenis !== 'KBM') return sr.jenis; const c = cellOf(kind, id, d, row.j);
      return c ? kodeOf(c) + ' / ' + (kind === 'kelas' ? shortName(c.guru && c.guru.nama) : kelasNames(c)) : '';
    })));
  });
  return m;
}
function piketList(h) { return (M.JadwalPiket || []).filter(r => r.hari === h).map(r => (X.guru[r.guru_id] || {}).nama).filter(Boolean); }
function piketHtml() {
  return '<table class="pgrid"><thead><tr><th style="width:90px">Hari</th><th>Guru Piket</th></tr></thead><tbody>' + X.days.map(d => '<tr><td><b>' + d + '</b></td><td style="text-align:left">' + (piketList(d).map(esc).join('<br>') || '—') + '</td></tr>').join('') + '</tbody></table>';
}
/** Bangun paket ekspor: {title, html, sheets} untuk jenis kelas|guru|sekolah|piket */
function buildExport(jenis, id) {
  const pg = t => '<div class="pb">' + t + '</div>';
  if (jenis === 'piket') return { title: 'Jadwal Piket Guru', html: hdrHtml('Jadwal Piket Guru') + piketHtml(), sheets: [{ name: 'Piket', matrix: [['Hari', 'Guru Piket']].concat(X.days.map(d => [d, piketList(d).join(', ')])) }] };
  if (jenis === 'kelas') { const k = X.kelas[id]; const t = 'Jadwal Pelajaran Kelas ' + k.nama; return { title: t, html: hdrHtml(t) + renderGrid('kelas', id, { print: true }), sheets: [{ name: k.nama, matrix: gridMatrix('kelas', id) }] }; }
  if (jenis === 'guru') { const g = X.guru[id]; const t = 'Jadwal Mengajar ' + g.nama; return { title: t, html: hdrHtml(t) + renderGrid('guru', id, { print: true }), sheets: [{ name: shortName(g.nama), matrix: gridMatrix('guru', id) }] }; }
  const kl = M.Kelas || [];
  return {
    title: 'Jadwal Pelajaran Seluruh Kelas',
    html: kl.map(k => pg(hdrHtml('Jadwal Pelajaran Kelas ' + k.nama) + renderGrid('kelas', k.id, { print: true }))).join('') + pg(hdrHtml('Jadwal Piket Guru') + piketHtml()),
    sheets: kl.map(k => ({ name: k.nama, matrix: gridMatrix('kelas', k.id) })).concat([{ name: 'Piket', matrix: [['Hari', 'Guru Piket']].concat(X.days.map(d => [d, piketList(d).join(', ')])) }])
  };
}
function previewExport(jenis, id) {
  let pk; try { pk = buildExport(jenis, id); } catch (e) { toast('Data belum lengkap untuk dipratinjau.', 'warn'); return; }
  S.prev = pk;
  openModal({
    title: 'Pratinjau', size: 'modal-xl modal-lg-x',
    body: '<div class="print-area prev-scroll">' + (jenis === 'sekolah' ? pk.html.replace(/<div class="pb">/g, '<div class="pb mb-4">') : pk.html) + '</div>',
    footer: '<button class="btn btn-outline-secondary" data-bs-dismiss="modal"><i class="bi bi-x-lg"></i> Tutup</button><button class="btn btn-outline-secondary" onclick="window.print()"><i class="bi bi-printer"></i> Cetak</button><button class="btn btn-primary" id="btnPdf" data-busy="Membuat PDF…" onclick="downloadPdf(this)"><i class="bi bi-file-earmark-pdf"></i> Unduh PDF</button>' +
      (isAdm() ? '<button class="btn btn-outline-primary" data-busy="Membuat Excel…" onclick="downloadXlsx(this)"><i class="bi bi-file-earmark-excel"></i> Excel</button>' : '')
  });
}
async function downloadPdf(btn) {
  const pk = S.prev; if (!pk) return;
  const r = isAdm() ? await act(btn, 'apiAdminExport', S.token, 'pdf', { title: pk.title, html: pk.html }) : await act(btn, 'apiPublicPdf', pk.html, pk.title);
  if (r) { saveB64(r.data.base64, r.data.name, r.data.mime); toast(r.message && r.data.url ? r.message : 'PDF diunduh.'); }
}
async function downloadXlsx(btn) {
  const pk = S.prev; if (!pk) return;
  const r = await act(btn, 'apiAdminExport', S.token, 'xlsx', { title: pk.title, sheets: pk.sheets });
  if (r) { saveB64(r.data.base64, r.data.name, r.data.mime); toast(r.message); }
}
// ════════ BAGIAN 6: SHELL & ROUTER HASH (#/halaman) ════════
// Hash-router: tombol Back Android/browser bekerja natural, URL halaman dapat di-bookmark.
const PAGES = {};
const home = () => (S.user ? (S.user.peran === 'guru' ? 'g-home' : 'dashboard') : 'pub-kelas');
const aktifK = () => M.Kelas.filter(k => k.status !== 'Nonaktif');
const aktifG = () => M.Guru.filter(g => g.status !== 'Nonaktif');
const MORE_IDS = ['waktu', 'ketersediaan', 'ekspor', 'akun', 'pengaturan', 'log', 'profil'];
function menuBottom() {
  if (!S.user) return [{ id: 'pub-kelas', i: 'bi-mortarboard', l: 'Kelas' }, { id: 'pub-guru', i: 'bi-person-badge', l: 'Guru' }, { id: 'pub-piket', i: 'bi-shield-check', l: 'Piket' }, { id: 'login', i: 'bi-box-arrow-in-right', l: 'Masuk' }];
  if (S.user.peran === 'guru') return [{ id: 'g-home', i: 'bi-calendar-week', l: 'Jadwal Saya' }, { id: 'g-avail', i: 'bi-calendar-x', l: 'Ketersediaan' }, { id: 'pub-kelas', i: 'bi-mortarboard', l: 'Sekolah' }, { id: 'pub-piket', i: 'bi-shield-check', l: 'Piket' }, { id: 'profil', i: 'bi-person-circle', l: 'Profil' }];
  return [{ id: 'dashboard', i: 'bi-speedometer2', l: 'Dasbor' }, { id: 'jadwal', i: 'bi-calendar3', l: 'Jadwal' }, { id: 'piket', i: 'bi-shield-check', l: 'Piket' }, { id: 'master', i: 'bi-database', l: 'Data' }, { id: 'more', i: 'bi-grid', l: 'Lainnya' }];
}
function menuMore() {
  const m = [{ id: 'waktu', i: 'bi-clock-history', l: 'Pengaturan Waktu' }, { id: 'ketersediaan', i: 'bi-calendar-x', l: 'Ketersediaan Guru' }, { id: 'ekspor', i: 'bi-box-arrow-up', l: 'Ekspor & Publikasi' }, { id: 'akun', i: 'bi-people', l: 'Akun Pengguna' }, { id: 'pengaturan', i: 'bi-gear', l: 'Pengaturan Umum' }];
  if (S.user && S.user.peran === 'superadmin') m.push({ id: 'log', i: 'bi-journal-text', l: 'Log Aktivitas' });
  m.push({ id: 'profil', i: 'bi-person-circle', l: 'Profil Saya' });
  return m;
}
function menuSide() {
  if (!S.user || S.user.peran === 'guru') { const b = menuBottom(); if (S.user) b.splice(3, 0, { id: 'pub-guru', i: 'bi-person-badge', l: 'Jadwal Guru' }); return b; }
  const b = menuBottom().filter(x => x.id !== 'more');
  return b.concat([{ sep: 1 }], menuMore().filter(x => ['waktu', 'ketersediaan', 'ekspor'].indexOf(x.id) >= 0), [{ sep: 1 }], menuMore().filter(x => ['waktu', 'ketersediaan', 'ekspor'].indexOf(x.id) < 0));
}
function renderNav() {
  const active = S.page;
  $('bottomNav').innerHTML = menuBottom().map(m => {
    const on = m.id === active || (m.id === 'more' && MORE_IDS.indexOf(active) >= 0 && active !== 'profil');
    return '<button class="' + (on ? 'on' : '') + '" ' + (on ? 'aria-current="page"' : '') + ' onclick="' + (m.id === 'more' ? 'openMore()' : "nav('" + m.id + "')") + '"><i class="bi ' + m.i + '"></i><span>' + m.l + '</span></button>';
  }).join('');
  $('sideNav').innerHTML = menuSide().map(m => m.sep ? '<div class="sep"></div>' : '<button class="' + (m.id === active ? 'on' : '') + '" onclick="nav(\'' + m.id + '\')"><i class="bi ' + m.i + '"></i>' + m.l + '</button>').join('');
  $('sideFoot').innerHTML = S.user ? '<div class="mb-2"><b style="color:var(--text)">' + esc(shortName(S.user.nama)) + '</b><br>' + esc(S.user.peran === 'superadmin' ? 'Super Admin' : S.user.peran === 'admin' ? 'Admin' : 'Guru') + '</div><button class="btn btn-outline-secondary btn-sm w-100" onclick="doLogout()"><i class="bi bi-box-arrow-left"></i> Keluar</button>' : 'Lihat jadwal tanpa login';
  $('btnUser').innerHTML = '<i class="bi ' + (S.user ? 'bi-person-circle' : 'bi-box-arrow-in-right') + '"></i>';
  $('btnUser').setAttribute('aria-label', S.user ? 'Profil' : 'Masuk');
}
function openMore() {
  openModal({
    title: 'Menu Lainnya',
    body: menuMore().map(m => '<button class="item" onclick="closeModal();setTimeout(()=>nav(\'' + m.id + '\'),250)"><span class="avatar"><i class="bi ' + m.i + '"></i></span><span class="item-body"><strong>' + m.l + '</strong></span><i class="bi bi-chevron-right go"></i></button>').join('') +
      '<button class="item" onclick="closeModal();setTimeout(doLogout,250)"><span class="avatar" style="background:var(--err-soft);color:var(--err)"><i class="bi bi-box-arrow-left"></i></span><span class="item-body"><strong>Keluar</strong></span></button>'
  });
}
const routeId = () => location.hash.replace(/^#\/?/, '').split('/')[0];
function replaceRoute(id) { try { history.replaceState(null, '', '#/' + id); } catch (e) { /* abaikan */ } }
function go(id) { const h = '#/' + id; if (location.hash === h) showPage(id); else location.hash = h; }
const navigateTo = go;
function nav(id) { go(id); }
window.addEventListener('hashchange', () => showPage(routeId() || home()));
function showPage(id) {
  let pg = PAGES[id];
  if (!pg) { id = home(); pg = PAGES[id] || PAGES['pub-kelas']; if (!PAGES[id]) id = 'pub-kelas'; replaceRoute(id); }
  if (pg.auth && !S.user) { id = 'login'; pg = PAGES.login; replaceRoute(id); }
  if (pg.adm && !isAdm()) { id = home(); pg = PAGES[id] || PAGES['pub-kelas']; replaceRoute(id); }
  S.page = id;
  if (pg.pub) useModel(PUB); else if (ADM) useModel(ADM);
  $('pageTitle').textContent = pg.title || 'Jadwal MTs';
  const c = (pg.pub ? (PUB && PUB.cfg) : (ADM && ADM.cfg)) || {};
  $('pageSub').textContent = c.tahun_ajaran ? (c.nama_madrasah || '') + ' • ' + c.tahun_ajaran + ' ' + c.semester : (c.nama_madrasah || '');
  const el = $('app-container');
  try { pg.render(el); } catch (e) { console.error(e); el.innerHTML = stateEmpty('bi-bug', 'Terjadi kesalahan tampilan', e.message); }
  renderNav(); window.scrollTo(0, 0);
}
function rerender() {
  const pg = PAGES[S.page]; if (!pg) return;
  const y = window.scrollY;
  if (pg.pub) useModel(PUB); else if (ADM) useModel(ADM);
  pg.render($('app-container')); renderNav(); window.scrollTo(0, y);
}
function userButton() { go(S.user ? 'profil' : 'login'); }

// ════════ BAGIAN 7: HALAMAN PUBLIK ════════
function pubGate(el) {
  if (!PUB || PUB.error) {
    el.innerHTML = '<div class="card-x">' + stateEmpty('bi-wifi-off', 'Data belum dapat dimuat', PUB && PUB.error) + '<div class="text-center"><button class="btn btn-primary" onclick="retryPublic(this)"><i class="bi bi-arrow-clockwise"></i> Coba lagi</button></div></div>';
    return false;
  }
  return true;
}
async function retryPublic(btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Memuat…'; await refreshPublic(); rerender(); }
function heroHtml(title, desc) {
  const c = PUB.cfg;
  return '<section class="hero"><span class="chip"><i class="bi bi-calendar-check"></i> TA ' + esc(c.tahun_ajaran) + ' • ' + esc(c.semester) + '</span><h1 class="mt-2">' + esc(title) + '</h1><p>' + esc(desc) + '</p></section>';
}
const notPublished = '<div class="notice warn"><i class="bi bi-hourglass-split"></i><div><b>Jadwal belum dipublikasikan.</b> Silakan cek kembali setelah admin mempublikasikan jadwal.</div></div>';
PAGES['pub-kelas'] = {
  pub: true, title: 'Jadwal Kelas',
  render(el) {
    if (!pubGate(el)) return;
    const kl = M.Kelas;
    if (!kl.length) { el.innerHTML = heroHtml('Jadwal Pelajaran', M.cfg.nama_madrasah) + stateEmpty('bi-mortarboard', 'Belum ada data kelas'); return; }
    if (!S.pubKelas || !X.kelas[S.pubKelas]) S.pubKelas = kl[0].id;
    el.innerHTML = heroHtml('Jadwal Pelajaran', 'Pilih kelas untuk melihat jadwal mingguan ' + M.cfg.nama_madrasah) + (M.status.jadwal && M.Jadwal.length ? '' : notPublished) +
      '<div class="chips-row" role="tablist" aria-label="Pilih kelas">' + kl.map(k => '<button class="pick ' + (k.id === S.pubKelas ? 'on' : '') + '" role="tab" aria-selected="' + (k.id === S.pubKelas) + '" onclick="pubKelas(\'' + k.id + '\')">' + esc(k.nama) + '</button>').join('') + '</div>' +
      '<div class="card-x"><div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3"><h2 class="mb-0"><i class="bi bi-mortarboard"></i> Kelas ' + esc(X.kelas[S.pubKelas].nama) + '</h2><div class="btn-row"><button class="btn btn-outline-secondary btn-sm" onclick="previewExport(\'kelas\',S.pubKelas)"><i class="bi bi-eye"></i> Pratinjau / Unduh</button><button class="btn btn-outline-secondary btn-sm" onclick="previewExport(\'sekolah\')"><i class="bi bi-collection"></i> Semua kelas</button></div></div>' + schedView('kelas', S.pubKelas, {}) + '</div>';
  }
};
function pubKelas(id) { S.pubKelas = id; rerender(); }
PAGES['pub-guru'] = {
  pub: true, title: 'Jadwal Guru',
  render(el) {
    if (!pubGate(el)) return;
    if (!M.Guru.length) { el.innerHTML = heroHtml('Jadwal Guru', '') + stateEmpty('bi-person-badge', 'Belum ada data guru'); return; }
    if (!S.pubGuru || !X.guru[S.pubGuru]) S.pubGuru = M.Guru[0].id;
    el.innerHTML = heroHtml('Jadwal Mengajar Guru', 'Cari nama guru untuk melihat jadwal mengajarnya') + (M.status.jadwal && M.Jadwal.length ? '' : notPublished) +
      '<div class="card-x"><div class="grid-2"><div class="field mb-0"><label class="form-label" for="pgCari">Cari guru</label><input id="pgCari" class="form-control" type="search" placeholder="Ketik nama…" oninput="filterGuru(this.value)"></div>' +
      '<div class="field mb-0"><label class="form-label" for="pgSel">Pilih guru</label><select id="pgSel" class="form-select" onchange="pubGuru(this.value)">' + guruOpts('', S.pubGuru) + '</select></div></div></div>' + guruCard();
  }
};
const guruOpts = (q, sel) => M.Guru.filter(g => !q || g.nama.toLowerCase().indexOf(q.toLowerCase()) >= 0).map(g => '<option value="' + g.id + '"' + (g.id === sel ? ' selected' : '') + '>' + esc(g.nama) + '</option>').join('');
function filterGuru(q) { const s = $('pgSel'); s.innerHTML = guruOpts(q, S.pubGuru) || '<option value="">Tidak ditemukan</option>'; if (s.value && s.value !== S.pubGuru) pubGuru(s.value); }
function guruCard() {
  const g = X.guru[S.pubGuru], pk = M.JadwalPiket.filter(r => r.guru_id === g.id).map(r => r.hari);
  return '<div id="guruCard" class="card-x"><div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3"><div><h2 class="mb-1"><i class="bi bi-person-badge"></i> ' + esc(g.nama) + '</h2><span class="chip pri">' + totalJam('guru', g.id) + ' jam/minggu</span> ' + (pk.length ? '<span class="chip warn"><i class="bi bi-shield-check"></i> Piket: ' + pk.join(', ') + '</span>' : '') + '</div><button class="btn btn-outline-secondary btn-sm" onclick="previewExport(\'guru\',S.pubGuru)"><i class="bi bi-eye"></i> Pratinjau / Unduh</button></div>' + schedView('guru', g.id, {}) + '</div>';
}
function pubGuru(id) { if (!id) return; S.pubGuru = id; const c = $('guruCard'); c.outerHTML = guruCard(); }
function piketCards(canEdit) {
  const today = todayName();
  return X.days.map(d => {
    const names = piketList(d), q = (M.PengaturanHari.filter(h => h.hari === d)[0] || {}).guru_piket;
    return '<div class="card-x ' + (d === today ? 'today' : '') + '"><div class="piket-day"><div class="dn">' + d + '<small>' + (d === today ? 'Hari ini' : '') + '</small></div><div class="names">' +
      (names.length ? names.map(n => '<span class="gchip"><i class="bi bi-person-check"></i> ' + esc(n) + '</span>').join('') : '<span class="muted small">Belum ada guru piket</span>') + '</div></div></div>';
  }).join('');
}
PAGES['pub-piket'] = {
  pub: true, title: 'Jadwal Piket',
  render(el) {
    if (!pubGate(el)) return;
    const td = todayName(), now = piketList(td);
    el.innerHTML = heroHtml('Jadwal Piket Guru', 'Guru yang bertugas setiap hari') +
      (M.status.piket && M.JadwalPiket.length ? '<div class="card-x"><h2><i class="bi bi-shield-check"></i> Piket hari ini — ' + td + '</h2>' + (now.length ? '<div class="d-flex flex-wrap gap-2">' + now.map(n => '<span class="gchip">' + esc(n) + '</span>').join('') + '</div>' : '<p class="muted mb-0">' + (X.days.indexOf(td) < 0 ? 'Hari ini bukan hari belajar.' : 'Belum ada guru piket.') + '</p>') + '</div>' +
        '<div class="d-flex justify-content-between align-items-center mb-2"><h2 class="fs-6 mb-0">Seminggu penuh</h2><button class="btn btn-outline-secondary btn-sm" onclick="previewExport(\'piket\')"><i class="bi bi-eye"></i> Pratinjau / Unduh</button></div>' + piketCards() : notPublished);
  }
};


// ════════ BAGIAN 7b: HALAMAN LOGIN ════════
PAGES.login = {
  pub: true, title: 'Masuk',
  render(el) {
    el.innerHTML = '<div class="login-wrap"><div class="card-x text-center"><span class="brand-logo"><i class="bi bi-calendar2-week"></i></span><h1 class="fs-4">Masuk ke Jadwal MTs</h1><p class="muted small">Khusus guru dan admin. Siswa tidak perlu masuk.</p>' +
      '<form class="text-start mt-3" onsubmit="doLogin(event)" autocomplete="on"><div class="field"><label class="form-label" for="lgUser">Username</label><input id="lgUser" class="form-control" autocomplete="username" autocapitalize="none" required></div>' +
      '<div class="field"><label class="form-label" for="lgPass">Password</label><div class="pw-wrap"><input id="lgPass" type="password" class="form-control" autocomplete="current-password" required><button type="button" class="icon-btn" onclick="togglePw(\'lgPass\',this)" aria-label="Tampilkan password"><i class="bi bi-eye"></i></button></div></div>' +
      '<div id="lgErr" class="field-err" role="alert"></div><button class="btn btn-primary w-100 mt-2" type="submit" data-busy="Memeriksa…">Masuk</button></form>' +
      '<button class="btn btn-link mt-2" onclick="nav(\'pub-kelas\')"><i class="bi bi-arrow-left"></i> Kembali ke jadwal</button></div></div>';
  }
};
function togglePw(id, b) { const i = $(id); i.type = i.type === 'password' ? 'text' : 'password'; b.innerHTML = '<i class="bi ' + (i.type === 'password' ? 'bi-eye' : 'bi-eye-slash') + '"></i>'; }
// ════════ BAGIAN 8: LOGIN, LOGOUT, GANTI PASSWORD ════════
const showOverlay = () => { const o = $('loadingOverlay'); o.style.display = 'flex'; o.style.opacity = 1; };
const hideOverlay = () => { const o = $('loadingOverlay'); o.style.opacity = 0; setTimeout(() => { o.style.display = 'none'; }, 320); };
async function doLogin(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type=submit]'); $('lgErr').textContent = '';
  const r = await act(btn, 'apiLogin', val('lgUser'), val('lgPass'));
  if (!r) { $('lgErr').textContent = 'Gagal masuk. Periksa username, password, dan koneksi Anda.'; return; }
  S.token = r.data.token; S.user = r.data.user; saveSession();       // 1 panggilan: token + data layar pertama
  if (S.user.wajib_ganti) { renderNav(); promptChangePw(true); return; }
  await enterApp(r.data.boot);
}
async function enterApp(boot, quiet) {
  showOverlay();
  try {
    if (!boot) {
      const r = await api('apiGetAppData', S.token);
      if (!r || !r.success) { hideOverlay(); forceLogout(r && r.message); return; }
      boot = r.data;
    }
    setBoot(boot);
    try { await loadAdminIfNeeded(); } catch (e) { toast('Modul admin gagal dimuat. Periksa koneksi lalu muat ulang.', 'err'); }
  } finally { hideOverlay(); }
  go(home()); if (!quiet) toast('Selamat datang, ' + shortName(S.user.nama) + '.');
}
function forceLogout(msg) {
  const uid = S.user && S.user.id;
  S.token = null; S.user = null; ADM = null; S.bootHash = null;
  Store.del('sess'); if (uid) Store.del('boot:' + uid);               // bersihkan cache data pribadi di perangkat
  try { if (_modal) _modal.hide(); } catch (e) { /* abaikan */ }
  replaceRoute('login'); showPage('login');
  if (msg) toast(msg, 'warn');
}
async function doLogout() {
  const t = S.token; forceLogout(); api('apiLogout', t);
  toast('Anda telah keluar.'); go('pub-kelas');
}
function promptChangePw(forced) {
  openModal({
    title: forced ? 'Ganti password Anda' : 'Ubah password', locked: !!forced,
    body: (forced ? '<div class="notice warn"><i class="bi bi-shield-lock"></i><div>Demi keamanan, <b>wajib mengganti password</b> sebelum melanjutkan.</div></div>' : '') +
      '<form id="pwForm" onsubmit="doChangePw(event,' + (!!forced) + ')"><div class="field"><label class="form-label" for="pwOld">Password saat ini</label><input id="pwOld" type="password" class="form-control" autocomplete="current-password" required></div>' +
      '<div class="field"><label class="form-label" for="pwNew">Password baru</label><input id="pwNew" type="password" class="form-control" autocomplete="new-password" minlength="8" required><div class="form-text">Minimal 8 karakter, mengandung huruf dan angka.</div></div>' +
      '<div class="field"><label class="form-label" for="pwNew2">Ulangi password baru</label><input id="pwNew2" type="password" class="form-control" autocomplete="new-password" required></div><div id="pwErr" class="field-err" role="alert"></div>' +
      '<button class="btn btn-primary w-100" type="submit" data-busy="Menyimpan…">Simpan password</button>' + (forced ? '<button type="button" class="btn btn-link w-100 mt-1" onclick="doLogout()">Batal & keluar</button>' : '') + '</form>'
  });
}
async function doChangePw(ev, forced) {
  ev.preventDefault(); $('pwErr').textContent = '';
  const n = val('pwNew');
  if (n.length < 8 || !/[A-Za-z]/.test(n) || !/\d/.test(n)) { $('pwErr').textContent = 'Password baru minimal 8 karakter dan mengandung huruf serta angka.'; return; }
  if (n !== val('pwNew2')) { $('pwErr').textContent = 'Konfirmasi password tidak sama.'; return; }
  const r = await act(ev.target.querySelector('button[type=submit]'), 'apiChangePassword', S.token, val('pwOld'), n);
  if (!r) return;
  S.user = r.data.user; S.token = r.data.token; saveSession();       // token lama dicabut server; pakai token baru
  closeModal(); toast('Password berhasil diubah.');
  if (forced) setTimeout(() => enterApp(r.data.boot, true), 350);
}

// ════════ BAGIAN 9: HALAMAN GURU & PROFIL ════════
PAGES['g-home'] = {
  auth: true, title: 'Jadwal Saya',
  render(el) {
    const gid = S.user.guru_id;
    if (!gid || !X.guru[gid]) { el.innerHTML = '<div class="card-x">' + stateEmpty('bi-person-x', 'Akun belum terhubung dengan data guru', 'Hubungi admin.') + '</div>'; return; }
    const pk = M.JadwalPiket.map(r => r.hari), n = M.Jadwal.length;
    const draf = M.Jadwal.some(r => r.status !== 'Dipublikasikan');
    el.innerHTML = '<section class="hero"><span class="chip"><i class="bi bi-calendar-check"></i> TA ' + esc(M.cfg.tahun_ajaran) + ' • ' + esc(M.cfg.semester) + '</span><h1 class="mt-2">Halo, ' + esc(shortName(S.user.nama)) + '</h1><p>' + n + ' jam mengajar per minggu' + (pk.length ? ' • Piket: ' + pk.join(', ') : '') + '</p></section>' +
      (draf && n ? '<div class="notice warn"><i class="bi bi-pencil-square"></i><div>Sebagian jadwal Anda masih berstatus <b>Draf</b> dan dapat berubah.</div></div>' : '') +
      (n ? '' : '<div class="notice"><i class="bi bi-info-circle"></i><div>Jadwal mengajar Anda belum tersusun.</div></div>') +
      '<div class="card-x"><div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3"><h2 class="mb-0"><i class="bi bi-calendar-week"></i> Jadwal mengajar</h2><button class="btn btn-outline-secondary btn-sm" onclick="previewExport(\'guru\',\'' + gid + '\')"><i class="bi bi-eye"></i> Pratinjau / Unduh</button></div>' + schedView('guru', gid, {}) + '</div>' +
      '<div class="btn-row"><button class="btn btn-outline-primary" onclick="nav(\'g-avail\')"><i class="bi bi-calendar-x"></i> Atur hari/jam tidak bisa mengajar</button></div>';
  }
};
PAGES.profil = {
  auth: true, title: 'Profil Saya',
  render(el) {
    const u = S.user, dark = document.documentElement.getAttribute('data-theme') === 'dark';
    el.innerHTML = '<div class="card-x text-center"><span class="avatar mx-auto mb-2" style="width:64px;height:64px;font-size:1.3rem">' + esc(initials(u.nama)) + '</span><h1 class="fs-5">' + esc(u.nama) + '</h1><span class="chip pri">' + (u.peran === 'superadmin' ? 'Super Admin' : u.peran === 'admin' ? 'Admin (Waka Kurikulum)' : 'Guru') + '</span><p class="muted small mt-2 mb-0">Username: ' + esc(u.username) + '</p></div>' +
      '<div class="card-x"><h2><i class="bi bi-sliders"></i> Pengaturan akun</h2><div class="d-grid gap-2"><button class="btn btn-outline-secondary" onclick="promptChangePw(false)"><i class="bi bi-key"></i> Ubah password</button><button class="btn btn-outline-secondary" onclick="toggleTheme();rerender()"><i class="bi ' + (dark ? 'bi-sun' : 'bi-moon-stars') + '"></i> Mode ' + (dark ? 'terang' : 'gelap') + '</button><button class="btn btn-outline-danger" onclick="doLogout()"><i class="bi bi-box-arrow-left"></i> Keluar</button></div></div>';
  }
};

// ════════ BAGIAN 13: KETERSEDIAAN GURU (guru & admin) ════════
function availView(gid) {
  if (!S.av || S.av.gid !== gid) S.av = { gid, set: new Set((M.KetersediaanGuru || []).filter(r => r.guru_id === gid && !r.tersedia).map(r => r.hari + '|' + r.jam_ke)), dirty: false };
  return '<div class="card-x"><div class="d-flex flex-wrap gap-2 mb-3 small"><span class="chip ok">Bisa mengajar</span><span class="chip err">Tidak bisa</span><span class="chip warn">● Sudah terjadwal</span></div><p class="small muted">Ketuk jam yang <b>tidak bisa</b> mengajar. Ketuk nama hari untuk memilih seluruh hari.</p><div id="avGrid">' + avGrid() + '</div></div>' +
    '<div class="sticky-save"><button class="btn btn-outline-secondary" onclick="avReset()">Reset</button><button class="btn btn-primary flex-fill" data-busy="Menyimpan…" onclick="avSave(this)"><i class="bi bi-check2"></i> Simpan ketersediaan</button></div>';
}
function avGrid() {
  const n = X.days.length, cols = 'grid-template-columns:34px repeat(' + n + ',1fr)', gid = S.av.gid;
  let h = '<div class="avgrid"><div class="avrow" style="' + cols + '"><span></span>' + X.days.map(d => '<button class="avhead" onclick="avDay(\'' + d + '\')">' + d.slice(0, 3) + '<small>' + X.kbm[d].filter(r => S.av.set.has(d + '|' + r.jam_ke)).length + ' ✕</small></button>').join('') + '</div>';
  for (let j = 1; j <= X.maxJam; j++) {
    h += '<div class="avrow" style="' + cols + '"><span class="avj">' + j + '</span>' + X.days.map(d => {
      if (!jamInfo(d, j)) return '<span class="avc na"></span>';
      const no = S.av.set.has(d + '|' + j), used = (X.jg[gid + '|' + d + '|' + j] || []).length;
      return '<button class="avc ' + (no ? 'no' : '') + '" aria-pressed="' + no + '" aria-label="' + d + ' jam ' + j + (no ? ' tidak bisa' : ' bisa') + '" onclick="avToggle(\'' + d + '\',' + j + ')">' + (no ? '✕' : '✓') + (used ? '<span class="dot"></span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  return h + '</div>';
}
function avToggle(d, j) { const k = d + '|' + j; if (S.av.set.has(k)) S.av.set.delete(k); else S.av.set.add(k); S.av.dirty = true; $('avGrid').innerHTML = avGrid(); }
function avDay(d) {
  const ks = X.kbm[d].map(r => d + '|' + r.jam_ke), all = ks.every(k => S.av.set.has(k));
  ks.forEach(k => { if (all) S.av.set.delete(k); else S.av.set.add(k); }); S.av.dirty = true; $('avGrid').innerHTML = avGrid();
}
function avReset() { const g = S.av.gid; S.av = null; availKeep = g; rerender(); }
let availKeep = null;
async function avSave(btn) {
  const slots = Array.from(S.av.set).map(k => ({ hari: k.split('|')[0], jam_ke: +k.split('|')[1] }));
  const r = await act(btn, 'apiSaveKetersediaan', S.token, S.av.gid, slots); if (!r) return;
  applyRes(r); S.av.dirty = false; toast(r.message, r.data.bentrok ? 'warn' : 'ok'); rerender();
}
PAGES['g-avail'] = {
  auth: true, title: 'Ketersediaan Saya',
  render(el) {
    if (!S.user.guru_id) { el.innerHTML = '<div class="card-x">' + stateEmpty('bi-person-x', 'Akun belum terhubung dengan data guru') + '</div>'; return; }
    if (!X.days.length) { el.innerHTML = '<div class="card-x">' + stateEmpty('bi-calendar-x', 'Tabel jam pelajaran belum tersedia') + '</div>'; return; }
    el.innerHTML = '<div class="page-head"><div><h1>Hari/jam tidak bisa mengajar</h1><p>Penyusunan jadwal akan menghindari jam yang Anda tandai.</p></div></div>' + availView(S.user.guru_id);
  }
};
PAGES.ketersediaan = {
  auth: true, adm: true, title: 'Ketersediaan Guru',
  render(el) {
    const gl = aktifG();
    if (!gl.length) { el.innerHTML = '<div class="card-x">' + stateEmpty('bi-person-badge', 'Belum ada guru aktif') + '</div>'; return; }
    if (!S.avGuru || !X.guru[S.avGuru]) S.avGuru = gl[0].id;
    el.innerHTML = '<div class="page-head"><div><h1>Ketersediaan Guru</h1><p>Admin dapat mengisi atau mengubah ketersediaan semua guru.</p></div></div><div class="card-x"><label class="form-label" for="avSel">Guru</label><select id="avSel" class="form-select" onchange="S.avGuru=this.value;S.av=null;rerender()">' + gl.map(g => '<option value="' + g.id + '"' + (g.id === S.avGuru ? ' selected' : '') + '>' + esc(g.nama) + '</option>').join('') + '</select></div>' +
      (X.days.length ? availView(S.avGuru) : '<div class="card-x">' + stateEmpty('bi-calendar-x', 'Tabel jam pelajaran belum tersedia') + '</div>');
  }
};

// ════════ BAGIAN 18: INISIALISASI ════════
function warmUp() { if (GAS_URL && !/PASTE_URL/.test(GAS_URL)) fetch(GAS_URL + '?action=ping&t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => { /* abaikan */ }); }
async function init() {
  initTheme(); renderNav(); warmUp();
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 120000) { warmUp(); if (S.user && ADM) revalidateApp().then(ch => { if (ch && !modalOpen()) rerender(); }); }
  });
  if (!GAS_URL || /PASTE_URL/.test(GAS_URL)) {
    hideOverlay(); $('app-container').innerHTML = '<div class="card-x">' + stateEmpty('bi-gear', 'URL backend belum diisi', 'Buka berkas js/config.js, isi GAS_URL dengan URL /exec dari Apps Script, lalu push ulang.') + '</div>'; return;
  }
  // 1) Sesi tersimpan + cache bootstrap → layar pertama tanpa menunggu server
  const sess = Store.get('sess', null);
  let restored = false;
  if (sess && sess.token && sess.user && tokenExp(sess.token) > Date.now() + 60000) {
    S.token = sess.token; S.user = sess.user;
    const b = Store.get('boot:' + S.user.id, null);
    if (b && b.data && !S.user.wajib_ganti) { ADM = b.data; ADM._x = null; S.bootHash = b.sig; restored = true; }
  } else if (sess) Store.del('sess');
  if (restored) {
    try { await loadAdminIfNeeded(); } catch (e) { toast('Modul admin gagal dimuat. Periksa koneksi.', 'err'); }
    hideOverlay(); loadPublic(); showPage(routeId() || home());
    revalidateApp().then(ch => { if (ch && !modalOpen()) rerender(); });   // segarkan di latar
    return;
  }
  await loadPublic();
  if (S.user && S.user.wajib_ganti) { hideOverlay(); showPage('pub-kelas'); promptChangePw(true); return; }
  if (S.user) { hideOverlay(); await enterApp(null, true); return; }   // sesi valid tetapi belum ada cache data
  hideOverlay(); showPage(routeId() || 'pub-kelas');
}
document.addEventListener('DOMContentLoaded', init);
