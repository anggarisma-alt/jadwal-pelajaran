/**
 * ============================================================
 * JADWAL MTs — Bundel admin (js/admin.js)
 * Dimuat lazy oleh core.js setelah Admin/Super Admin login,
 * sehingga HP siswa & guru tidak mengunduh kode admin.
 * ============================================================
 */
// ════════ BAGIAN 10: DASBOR + INSIGHT (SWR: tampil dari bootstrap, segarkan di latar) ════════
PAGES.dashboard = {
  auth: true, adm: true, title: 'Dasbor',
  render(el) {
    if (ADM.dash) drawDash(el, ADM.dash);
    else el.innerHTML = '<div class="page-head"><div><h1>Dasbor</h1><p>Memuat ringkasan…</p></div></div><div class="kpis">' + Array.from({ length: 6 }, () => '<div class="skel" style="height:104px"></div>').join('') + '</div>' + skeleton(2);
    if (!ADM.dash || Date.now() - (ADM.dashAt || 0) > 60000) refreshDash(el);   // freshness TTL 60 dtk
  }
};
async function refreshDash(el) {
  const r = await api('apiDashboard', S.token);
  if (S.page !== 'dashboard') return;
  if (!r || !r.success) { if (!ADM.dash) el.innerHTML = '<div class="card-x">' + stateEmpty('bi-exclamation-triangle', 'Dasbor gagal dimuat', r && r.message) + '<div class="text-center"><button class="btn btn-primary" onclick="rerender()">Coba lagi</button></div></div>'; return; }
  const changed = hashStr(JSON.stringify(r.data)) !== hashStr(JSON.stringify(ADM.dash || null));
  ADM.dash = r.data; ADM.dashAt = Date.now();
  if (changed) drawDash($('app-container'), r.data);
}
function drawDash(el, d) {
  S.dash = d; const k = d.kpi;
  const kp = (i, v, l, c) => '<div class="kpi ' + (c || '') + '"><i class="bi ' + i + '"></i><b>' + v + '</b><span>' + l + '</span></div>';
  el.innerHTML = '<div class="page-head"><div><h1>Dasbor</h1><p>Periode ' + esc(d.periode) + '</p></div><div class="btn-row"><span class="chip ' + (d.status.jadwal === 'Dipublikasikan' ? 'ok' : 'warn') + '"><i class="bi bi-calendar3"></i> Jadwal: ' + esc(d.status.jadwal) + '</span><span class="chip ' + (d.status.piket === 'Dipublikasikan' ? 'ok' : 'warn') + '"><i class="bi bi-shield-check"></i> Piket: ' + esc(d.status.piket) + '</span></div></div>' +
    '<div class="kpis">' + kp('bi-person-workspace', k.guru, 'Guru aktif') + kp('bi-mortarboard', k.kelas, 'Kelas aktif') + kp('bi-book', k.mapel, 'Mata pelajaran') + kp('bi-grid-3x3-gap', k.persenTerisi + '%', 'Slot terisi') + kp('bi-exclamation-octagon', k.bentrok, 'Peringatan bentrok', k.bentrok ? 'err' : '') + kp('bi-hourglass-split', k.belum, 'Jam belum tertempat', k.belum ? 'warn' : '') + '</div>' +
    '<div class="insight"><h2><i class="bi bi-stars"></i> Insight otomatis</h2><ul>' + d.insights.map(t => '<li><i class="bi bi-chevron-right"></i><span>' + esc(t) + '</span></li>').join('') + '</ul></div>' +
    '<div class="btn-row mb-3"><button class="btn btn-primary" onclick="nav(\'jadwal\')"><i class="bi bi-calendar3"></i> Buka penyusunan jadwal</button><button class="btn btn-outline-secondary" onclick="nav(\'ekspor\')"><i class="bi bi-box-arrow-up"></i> Publikasi & ekspor</button></div>' +
    '<div class="charts"><div class="card-x"><h2><i class="bi bi-bar-chart-line"></i> Beban jam per guru</h2><div class="chart-box" style="height:' + (d.bebanGuru.length * 26 + 50) + 'px"><canvas id="chBeban" role="img" aria-label="Grafik beban jam mengajar per guru"></canvas></div><p class="small muted mb-0 mt-2"><span class="chip ok">normal</span> <span class="chip warn">≥90% batas</span> <span class="chip err">melebihi batas</span></p></div>' +
    '<div><div class="card-x"><h2><i class="bi bi-calendar-range"></i> Sebaran jam per hari</h2><div class="chart-box" style="height:230px"><canvas id="chHari" role="img" aria-label="Grafik jumlah jam per hari"></canvas></div></div>' +
    '<div class="card-x"><h2><i class="bi bi-shield-check"></i> Distribusi piket</h2>' + (d.piketGuru.length ? '<div class="chart-box" style="height:' + (Math.min(d.piketGuru.length, 14) * 26 + 50) + 'px"><canvas id="chPiket" role="img" aria-label="Grafik jumlah piket per guru"></canvas></div>' : '<p class="muted mb-0">Jadwal piket belum disusun.</p>') + '</div></div></div>';
  ensureChart().then(drawCharts).catch(() => toast('Grafik gagal dimuat (periksa koneksi).', 'warn'));
}
function drawCharts() {
  const d = S.dash; if (!d || !$('chBeban')) return;
  Object.keys(S.charts).forEach(k => { try { S.charts[k].destroy(); } catch (e) { /* abaikan */ } }); S.charts = {};
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  Chart.defaults.font.family = "'Plus Jakarta Sans',system-ui,sans-serif"; Chart.defaults.color = v('--muted');
  const base = (horiz) => ({ indexAxis: horiz ? 'y' : 'x', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: v('--border') }, beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } });
  const o1 = base(true); o1.plugins.tooltip = { callbacks: { afterLabel: c => 'Batas: ' + d.bebanGuru[c.dataIndex].maks + ' jam/minggu' } };
  S.charts.b = new Chart($('chBeban'), { type: 'bar', data: { labels: d.bebanGuru.map(g => shortName(g.nama)), datasets: [{ label: 'Jam mengajar', data: d.bebanGuru.map(g => g.jam), borderRadius: 6, backgroundColor: d.bebanGuru.map(g => g.jam > g.maks ? v('--err') : g.jam >= g.maks * 0.9 ? v('--accent') : v('--primary')) }] }, options: o1 });
  const hk = Object.keys(d.perHari), o2 = base(false); o2.scales.x.grid.display = false; o2.scales.y.beginAtZero = true;
  S.charts.h = new Chart($('chHari'), { type: 'bar', data: { labels: hk.map(h => h.slice(0, 3)), datasets: [{ label: 'Jam pelajaran', data: hk.map(h => d.perHari[h]), borderRadius: 8, backgroundColor: v('--primary') }] }, options: o2 });
  if ($('chPiket')) { const p = d.piketGuru.slice(0, 14); S.charts.p = new Chart($('chPiket'), { type: 'bar', data: { labels: p.map(g => shortName(g.nama)), datasets: [{ label: 'Piket', data: p.map(g => g.n), borderRadius: 6, backgroundColor: v('--accent') }] }, options: base(true) }); }
}

// ════════ BAGIAN 11: PENYUSUNAN JADWAL PELAJARAN ════════
PAGES.jadwal = {
  auth: true, adm: true, title: 'Jadwal Pelajaran',
  render(el) {
    const kl = aktifK(), gl = aktifG(), nc = (M.conflicts || []).length, st = ADM.cfg.publish_jadwal;
    if (!S.jk || !X.kelas[S.jk]) S.jk = (kl[0] || {}).id;
    if (!S.jg || !X.guru[S.jg]) S.jg = (gl[0] || {}).id;
    let body = '';
    if (!kl.length) body = '<div class="card-x">' + stateEmpty('bi-mortarboard', 'Belum ada kelas aktif', 'Tambahkan kelas di menu Data.') + '</div>';
    else if (S.jv === 'kelas') body = jadwalKelas(kl);
    else if (S.jv === 'guru') body = jadwalGuru(gl);
    else body = '<div class="card-x"><h2><i class="bi bi-table"></i> Rekap seluruh kelas</h2><p class="small muted">Ketuk sel untuk mengubah. Kotak merah = peringatan bentrok.</p>' + rekapHtml(kl) + '</div>';
    el.innerHTML = '<div class="page-head"><div><h1>Jadwal Pelajaran</h1><p>Susun otomatis, lalu rapikan manual.</p></div><div class="btn-row"><span class="chip ' + (st === 'Dipublikasikan' ? 'ok' : 'warn') + '">' + esc(st) + '</span><button class="chip ' + (nc ? 'err' : 'ok') + '" style="cursor:pointer" onclick="showConflicts()"><i class="bi ' + (nc ? 'bi-exclamation-octagon' : 'bi-check-circle') + '"></i> ' + (nc ? nc + ' peringatan' : 'Tanpa bentrok') + '</button></div></div>' +
      '<div class="btn-row mb-3"><button class="btn btn-primary" onclick="openAuto()"><i class="bi bi-magic"></i> Susun otomatis</button><button class="btn btn-outline-danger" onclick="openClear()"><i class="bi bi-eraser"></i> Kosongkan</button></div>' +
      '<div class="seg" role="tablist"><button class="' + (S.jv === 'kelas' ? 'on' : '') + '" onclick="jView(\'kelas\')">Per kelas</button><button class="' + (S.jv === 'guru' ? 'on' : '') + '" onclick="jView(\'guru\')">Per guru</button><button class="' + (S.jv === 'rekap' ? 'on' : '') + '" onclick="jView(\'rekap\')">Rekap</button></div>' + body;
  }
};
function jView(v) { S.jv = v; rerender(); }
function jKelas(id) { S.jk = id; rerender(); }
function jGuru(id) { S.jg = id; rerender(); }
function jadwalKelas(kl) {
  const per = {}, placed = {};
  M.BebanMengajar.filter(b => b.kelas_id === S.jk).forEach(b => { per[b.mapel_id] = (per[b.mapel_id] || 0) + b.jam_per_minggu; });
  M.Jadwal.filter(r => r.kelas_id === S.jk).forEach(r => { placed[r.mapel_id] = (placed[r.mapel_id] || 0) + 1; });
  const target = Object.keys(per).reduce((a, k) => a + per[k], 0), done = M.Jadwal.filter(r => r.kelas_id === S.jk).length;
  const sisa = Object.keys(per).filter(m => (placed[m] || 0) < per[m]).map(m => '<span class="chip warn"><span class="swatch" style="--h:' + (X.hue[m] || 150) + '"></span>' + esc((X.mapel[m] || {}).kode) + ' sisa ' + (per[m] - (placed[m] || 0)) + '</span>').join(' ');
  return '<div class="chips-row" role="tablist" aria-label="Pilih kelas">' + kl.map(k => '<button class="pick ' + (k.id === S.jk ? 'on' : '') + '" onclick="jKelas(\'' + k.id + '\')">' + esc(k.nama) + '</button>').join('') + '</div>' +
    '<div class="card-x"><div class="d-flex justify-content-between align-items-center gap-2 mb-1"><h2 class="mb-0"><i class="bi bi-mortarboard"></i> ' + esc(X.kelas[S.jk].nama) + '</h2><span class="small fw-7">' + done + ' / ' + target + ' jam</span></div>' +
    '<div class="progress-x mb-2" role="progressbar" aria-valuenow="' + done + '" aria-valuemin="0" aria-valuemax="' + target + '"><i style="width:' + (target ? Math.min(100, done / target * 100) : 0) + '%"></i></div>' +
    (target ? (sisa ? '<div class="d-flex flex-wrap gap-1 mb-3">' + sisa + '</div>' : '<p class="small mb-3" style="color:var(--ok)"><i class="bi bi-check-circle-fill"></i> Seluruh beban kelas ini sudah tertempatkan.</p>') : '<div class="notice warn"><i class="bi bi-exclamation-triangle"></i><div>Beban mengajar kelas ini belum diisi. Buka menu <b>Data → Beban</b>.</div></div>') +
    '<p class="small muted"><i class="bi bi-hand-index"></i> Ketuk sel untuk memilih mata pelajaran & guru.</p>' + schedView('kelas', S.jk, { edit: true }) + '</div>';
}
function jadwalGuru(gl) {
  if (!gl.length) return '<div class="card-x">' + stateEmpty('bi-person-badge', 'Belum ada guru aktif') + '</div>';
  const g = X.guru[S.jg], mm = +g.maks_jam_minggu || +ADM.cfg.maks_jam_minggu_default || 30, n = totalJam('guru', g.id);
  return '<div class="card-x"><div class="field"><label class="form-label" for="jgSel">Pilih guru</label><select id="jgSel" class="form-select" onchange="jGuru(this.value)">' + gl.map(x => '<option value="' + x.id + '"' + (x.id === S.jg ? ' selected' : '') + '>' + esc(x.nama) + '</option>').join('') + '</select></div>' +
    '<div class="d-flex justify-content-between small fw-7 mb-1"><span>Beban mengajar</span><span>' + n + ' / ' + mm + ' jam</span></div><div class="progress-x ' + (n > mm ? 'err' : n >= mm * 0.9 ? 'warn' : '') + ' mb-3"><i style="width:' + Math.min(100, n / mm * 100) + '%"></i></div>' +
    '<p class="small muted">Area bergaris merah = guru tidak bisa mengajar. Untuk mengubah jadwal, gunakan tab Per kelas.</p>' + schedView('guru', g.id, {}) + '</div>';
}
function rekapHtml(kl) {
  let h = '<div class="grid-wrap"><table class="sgrid rekap"><thead><tr><th class="g-time">Jam</th>' + kl.map(k => '<th class="kls">' + esc(k.nama) + '</th>').join('') + '</tr></thead><tbody>';
  X.days.forEach(d => {
    h += '<tr class="day-sep"><td colspan="' + (kl.length + 1) + '">' + d + '</td></tr>';
    X.kbm[d].forEach(r => {
      h += '<tr><td class="g-time"><b>' + r.jam_ke + '</b>' + esc(r.mulai) + '</td>' + kl.map(k => {
        const c = cellOf('kelas', k.id, d, r.jam_ke), oc = 'onclick="openSlot(\'' + k.id + '\',\'' + d + '\',' + r.jam_ke + ')"';
        return '<td>' + (c ? '<button class="cell' + (X.conf.has(c.r.id) ? ' conf' : '') + '" style="--h:' + (X.hue[c.r.mapel_id] || 150) + '" ' + oc + ' title="' + esc(((c.mapel || {}).nama || '') + ' — ' + ((c.guru || {}).nama || '')) + '"><b>' + esc(kodeOf(c)) + '</b></button>' : '<button class="cell empty" ' + oc + ' aria-label="Kosong"><i class="bi bi-plus"></i></button>') + '</td>';
      }).join('') + '</tr>';
    });
  });
  return h + '</tbody></table></div>';
}
function showConflicts() {
  const cs = M.conflicts || [];
  const ic = { gabung_beda_tingkat: 'bi-people', tidak_berurutan: 'bi-layers-half', guru_ganda: 'bi-people', kelas_ganda: 'bi-layers', guru_tidak_tersedia: 'bi-calendar-x', lebih_hari: 'bi-graph-up-arrow', lebih_minggu: 'bi-graph-up-arrow', ruangan_ganda: 'bi-door-closed', slot_tidak_ada: 'bi-clock-history', bukan_pengampu: 'bi-person-x' };
  openModal({
    title: cs.length ? cs.length + ' peringatan bentrok' : 'Tidak ada bentrok',
    body: cs.length ? cs.slice(0, 150).map(c => '<div class="notice err"><i class="bi ' + (ic[c.type] || 'bi-exclamation-triangle') + '"></i><div>' + esc(c.msg) + '</div></div>').join('') + (cs.length > 150 ? '<p class="small muted">Menampilkan 150 pertama.</p>' : '') : '<div class="notice ok"><i class="bi bi-check-circle-fill"></i><div>Jadwal bebas dari bentrok guru, kelas, ruangan, dan batas jam mengajar.</div></div>',
    footer: '<button class="btn btn-primary" data-bs-dismiss="modal">Tutup</button>'
  });
}

// ── Dialog slot (pilih mapel → guru) ──
/** Kelas lain yang sedang diajar guru ini di slot yang sama + apakah boleh digabung (mapel sama, mapel mengizinkan, belum melewati batas) */
function jointInfo(gid, hari, jam, kid, mid) {
  const other = (X.jg[gid + '|' + hari + '|' + jam] || []).filter(r => r.kelas_id !== kid);
  if (!other.length) return { other, bisa: false };
  const mx = Number((X.mapel[mid] || {}).gabung_maks) || 0;
  return { other, bisa: mx >= 2 && other.every(r => r.mapel_id === mid) && other.length + 1 <= mx };
}
function guruProblems(gid, hari, jam, kid, mid) {
  const g = X.guru[gid], p = [];
  if (X.un.has(gid + '|' + hari + '|' + jam)) p.push({ m: 'Tidak tersedia pada jam ini' });
  const ji = jointInfo(gid, hari, jam, kid, mid);
  if (ji.other.length && !ji.bisa) {
    const mx = Number((X.mapel[mid] || {}).gabung_maks) || 0, sm = ji.other.every(r => r.mapel_id === mid);
    p.push({ m: 'Sedang mengajar ' + ji.other.map(r => (X.kelas[r.kelas_id] || {}).nama).join(', ') + (mx >= 2 ? (sm ? ' (batas gabungan ' + mx + ' kelas tercapai)' : ' (mapel berbeda tidak bisa digabung)') : '') });
  }
  if (ji.bisa && ji.other.some(r => (X.kelas[r.kelas_id] || {}).tingkat !== (X.kelas[kid] || {}).tingkat)) p.push({ m: 'Digabung dengan kelas berbeda tingkat' });
  const mine = M.Jadwal.filter(r => r.guru_id === gid && !(r.kelas_id === kid && r.hari === hari && r.jam_ke === jam));
  const mh = +g.maks_jam_hari || +ADM.cfg.maks_jam_hari_default || 8, mm = +g.maks_jam_minggu || +ADM.cfg.maks_jam_minggu_default || 30;
  if (mine.filter(r => r.hari === hari).length + 1 > mh) p.push({ m: 'Melebihi batas ' + mh + ' jam/hari' });   // tiap rombel dihitung sebagai jam tersendiri
  if (mine.length + 1 > mm) p.push({ m: 'Melebihi batas ' + mm + ' jam/minggu' });
  return p;
}
function openSlot(kid, hari, jam) {
  const k = X.kelas[kid], cur = X.jd[kid + '|' + hari + '|' + jam], ji = jamInfo(hari, jam) || {};
  const per = {}, placed = {};
  M.BebanMengajar.filter(b => b.kelas_id === kid).forEach(b => { per[b.mapel_id] = (per[b.mapel_id] || 0) + b.jam_per_minggu; });
  M.Jadwal.filter(r => r.kelas_id === kid).forEach(r => { placed[r.mapel_id] = (placed[r.mapel_id] || 0) + 1; });
  const mids = Object.keys(per).filter(id => per[id] > 0); if (cur && mids.indexOf(cur.mapel_id) < 0) mids.push(cur.mapel_id);
  S.slot = { kid, hari, jam, mapel: cur ? cur.mapel_id : '', guru: cur ? cur.guru_id : '', cur };
  const head = '<p class="mb-3"><span class="chip pri">' + esc(k.nama) + '</span> <span class="chip">' + hari + ' • jam ke-' + jam + (ji.mulai ? ' (' + esc(ji.mulai) + '–' + esc(ji.selesai) + ')' : '') + '</span></p>';
  if (!mids.length) { openModal({ title: 'Atur slot', body: head + '<div class="notice warn"><i class="bi bi-exclamation-triangle"></i><div>Beban mengajar kelas ini belum diisi.</div></div>', footer: '<button class="btn btn-primary" onclick="closeModal();setTimeout(()=>{S.mt=\'beban\';S.bk=\'' + kid + '\';nav(\'master\')},300)">Isi beban mengajar</button>' }); return; }
  const rooms = (M.Ruangan || []).filter(r => r.status !== 'Nonaktif');
  openModal({
    title: cur ? 'Ubah slot' : 'Isi slot',
    body: head + '<h3 class="fs-6 mb-2">Mata pelajaran</h3>' + mids.map(id => { const m = X.mapel[id] || { nama: '?' }; return '<label class="opt"><input type="radio" name="slM" value="' + id + '"' + (id === S.slot.mapel ? ' checked' : '') + ' onchange="slotMapel(\'' + id + '\')"><span class="ob"><b><span class="swatch" style="--h:' + (X.hue[id] || 150) + '"></span>' + esc(m.nama) + '</b><small>' + (placed[id] || 0) + ' / ' + (per[id] || 0) + ' jam terisi</small></span></label>'; }).join('') +
      '<h3 class="fs-6 mt-3 mb-2">Guru pengajar</h3><div id="slGuru"></div><div id="slSpanBox" class="field mt-3" style="display:none"><label class="form-label" for="slSpan">Jumlah jam berurutan</label><select id="slSpan" class="form-select" onchange="S.slot.span=Number(this.value);slotWarn()"></select><div class="form-text" id="slSpanHint"></div></div><div id="slWarn" class="warnbox" role="alert"></div>' +
      (rooms.length ? '<div class="field mt-3"><label class="form-label" for="slRoom">Ruangan (opsional)</label><select id="slRoom" class="form-select" onchange="slotWarn()"><option value="">— Tidak dipakai —</option>' + rooms.map(r => { const busy = M.Jadwal.some(x => x.ruangan_id === r.id && x.hari === hari && x.jam_ke === jam && x.kelas_id !== kid); return '<option value="' + r.id + '"' + (cur && cur.ruangan_id === r.id ? ' selected' : '') + '>' + esc(r.nama) + (busy ? ' (terpakai)' : '') + '</option>'; }).join('') + '</select></div>' : '<input type="hidden" id="slRoom" value="">') +
      '<div class="form-check form-switch mt-3"><input class="form-check-input" type="checkbox" id="slLock" ' + (cur && cur.terkunci ? 'checked' : '') + '><label class="form-check-label" for="slLock"><i class="bi bi-lock"></i> Kunci slot (tidak berubah saat susun ulang)</label></div>',
    footer: (cur ? '<button class="btn btn-outline-danger" data-busy="Menghapus…" onclick="clearSlot(this)"><i class="bi bi-eraser"></i> Kosongkan</button>' : '') + '<button class="btn btn-primary" data-busy="Menyimpan…" onclick="saveSlot(this)"><i class="bi bi-check2"></i> Simpan</button>',
    onShown: () => { slotSpanRender(); slotGuruRender(); }
  });
  slotSpanRender(); slotGuruRender();
}
function slotMapel(id) { S.slot.mapel = id; S.slot.guru = ''; S.slot.span = 0; slotSpanRender(); slotGuruRender(); }
/** Jumlah jam KBM yang bersambung (tanpa istirahat/blok) mulai dari jam ini, dan daftar nomor jamnya */
function slotTargets(hari, jam, span) {
  const rows = X.jam[hari], i = rows.findIndex(r => r.jam_ke === jam && r.jenis === 'KBM'); if (i < 0) return [jam];
  const t = [jam]; for (let n = 1; n < span; n++) { const r = rows[i + n]; if (!r || r.jenis !== 'KBM') break; t.push(r.jam_ke); } return t;
}
function slotSpanRender() {
  const s = S.slot, box = $('slSpanBox'); if (!box) return;
  const mx = Math.min(slotTargets(s.hari, s.jam, 6).length, 6);
  if (mx < 2 || !s.mapel) { box.style.display = 'none'; s.span = 1; return; }
  const m = X.mapel[s.mapel] || {}, B = Number(m.blok_jam) || 0;
  if (!s.span) {
    s.span = 1;
    if (!s.cur && B >= 2) {
      const per = M.BebanMengajar.filter(b => b.kelas_id === s.kid && b.mapel_id === s.mapel).reduce((t, b) => t + b.jam_per_minggu, 0), placed = M.Jadwal.filter(r => r.kelas_id === s.kid && r.mapel_id === s.mapel).length;
      s.span = Math.max(1, Math.min(B, mx, per - placed));
    }
  }
  s.span = Math.min(s.span, mx);
  $('slSpan').innerHTML = Array.from({ length: mx }, (_, i) => '<option value="' + (i + 1) + '"' + (i + 1 === s.span ? ' selected' : '') + '>' + (i + 1) + ' jam' + (i ? ' berurutan' : '') + '</option>').join('');
  $('slSpanHint').textContent = (B >= 2 ? 'Mapel ini diatur harus berurutan ' + B + ' jam. ' : '') + 'Jam berurutan yang sudah terisi akan ditimpa.';
  box.style.display = '';
}
function slotGuru(id) { S.slot.guru = id; slotWarn(); }
function slotGuruRender() {
  const s = S.slot, box = $('slGuru'); if (!box) return;
  if (!s.mapel) { box.innerHTML = '<p class="muted small">Pilih mata pelajaran terlebih dahulu.</p>'; return; }
  const gs = M.GuruMapel.filter(x => x.mapel_id === s.mapel).map(x => X.guru[x.guru_id]).filter(g => g && g.status !== 'Nonaktif');
  if (!gs.length) { box.innerHTML = '<div class="notice warn"><i class="bi bi-person-x"></i><div>Belum ada guru pengampu mapel ini. Atur di Data → Guru.</div></div>'; s.guru = ''; return; }
  const bg = (M.BebanMengajar.filter(b => b.kelas_id === s.kid && b.mapel_id === s.mapel)[0] || {}).guru_id;
  const rows = gs.map(g => ({ g, p: guruProblems(g.id, s.hari, s.jam, s.kid, s.mapel), jn: (function (ji) { return ji.bisa ? ji.other.map(r => (X.kelas[r.kelas_id] || {}).nama).join(' + ') : ''; })(jointInfo(g.id, s.hari, s.jam, s.kid, s.mapel)) })).sort((a, b) => (a.p.length - b.p.length) || ((b.g.id === bg) - (a.g.id === bg)));
  if (!s.guru || !gs.some(g => g.id === s.guru)) { const pick = rows.filter(r => !r.p.length && r.g.id === bg)[0] || rows.filter(r => !r.p.length)[0]; s.guru = pick ? pick.g.id : ''; }
  box.innerHTML = rows.map(r => '<label class="opt ' + (r.p.length ? 'dis' : '') + '"><input type="radio" name="slG" value="' + r.g.id + '"' + (r.g.id === s.guru ? ' checked' : '') + ' onchange="slotGuru(\'' + r.g.id + '\')"><span class="ob"><b>' + esc(r.g.nama) + '</b>' + (r.p.length ? '<small style="color:var(--err)">' + r.p.map(x => esc(x.m)).join(' • ') + '</small>' : '<small style="color:var(--ok)">Tersedia' + (r.jn ? ' • digabung dengan ' + esc(r.jn) : '') + (r.g.id === bg ? ' • guru beban kelas ini' : '') + '</small>') + '</span></label>').join('');
  slotWarn();
}
function slotWarn() {
  const s = S.slot, w = $('slWarn'); if (!w) return;
  const tg = slotTargets(s.hari, s.jam, s.span || 1);
  const msgs = []; if (s.guru) tg.forEach(j => guruProblems(s.guru, s.hari, j, s.kid, s.mapel).forEach(p => msgs.push((X.guru[s.guru] || {}).nama + (tg.length > 1 ? ' (jam ke-' + j + ')' : '') + ': ' + p.m)));
  const timpa = tg.filter((j, i) => i > 0 && X.jd[s.kid + '|' + s.hari + '|' + j] && X.jd[s.kid + '|' + s.hari + '|' + j].mapel_id !== s.mapel).length; if (timpa) msgs.push(timpa + ' jam yang sudah berisi mapel lain akan ditimpa.');
  const rid = val('slRoom'); if (rid && M.Jadwal.some(x => x.ruangan_id === rid && x.hari === s.hari && x.jam_ke === s.jam && x.kelas_id !== s.kid)) msgs.push('Ruangan sedang dipakai kelas lain.');
  w.innerHTML = msgs.map(m => '<div><i class="bi bi-exclamation-triangle-fill"></i><span>' + esc(m) + ' — tetap dapat disimpan, tetapi akan muncul sebagai peringatan.</span></div>').join('');
}
async function saveSlot(btn) {
  const s = S.slot;
  if (!s.mapel) { toast('Pilih mata pelajaran.', 'warn'); return; }
  if (!s.guru) { toast('Pilih guru pengajar.', 'warn'); return; }
  const r = await act(btn, 'apiSetSlot', S.token, { kelas_id: s.kid, hari: s.hari, jam_ke: s.jam, mapel_id: s.mapel, guru_id: s.guru, ruangan_id: val('slRoom'), terkunci: chk('slLock'), span: $('slSpanBox').style.display === 'none' ? 1 : (s.span || 1) });
  if (!r) return;
  patchJadwal(r); closeModal(); rerender();
  const ids = (r.rows || [r.row]).map(x => x.id), bad = ADM.conflicts.filter(c => c.ids.some(i => ids.indexOf(i) >= 0))[0];
  toast(bad ? 'Tersimpan, namun: ' + bad.msg : r.message, bad ? 'warn' : 'ok');
}
async function clearSlot(btn) {
  const s = S.slot, r = await act(btn, 'apiClearSlot', S.token, s.kid, s.hari, s.jam);
  if (!r) return; patchJadwal(r); closeModal(); rerender(); toast('Slot dikosongkan.');
}

// ── Susun otomatis & kosongkan ──
function openAuto() {
  const lk = ADM.Jadwal.filter(r => r.terkunci).length, k = X.kelas[S.jk];
  openModal({
    title: 'Susun jadwal otomatis',
    body: '<p class="small muted">Sistem menempatkan jam dari <b>Beban Mengajar</b> dengan memperhatikan ketersediaan guru, batas jam harian/mingguan, dan menghindari jam kosong di tengah hari.</p>' +
      '<label class="opt"><input type="radio" name="auScope" value="all" checked><span class="ob"><b>Semua kelas aktif</b><small>' + aktifK().length + ' kelas</small></span></label>' +
      (k ? '<label class="opt"><input type="radio" name="auScope" value="one"><span class="ob"><b>Hanya kelas ' + esc(k.nama) + '</b><small>Kelas lain tidak diubah</small></span></label>' : '') +
      '<div class="notice warn mt-3"><i class="bi bi-exclamation-triangle"></i><div>Isian <b>tidak terkunci</b> pada cakupan di atas akan <b>diganti</b>. Slot terkunci (' + lk + ') dipertahankan.</div></div><div id="auProg"></div>',
    footer: '<button class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" data-busy="Menyusun… (hingga 30 detik)" onclick="runAuto(this)"><i class="bi bi-magic"></i> Mulai susun</button>'
  });
}
async function runAuto(btn) {
  const one = (document.querySelector('input[name=auScope]:checked') || {}).value === 'one';
  const r = await act(btn, 'apiAutoSchedule', S.token, { kelasIds: one ? [S.jk] : [] });
  if (!r) return;
  applyRes(r); const d = r.data;
  openModal({
    title: d.gagal ? 'Selesai dengan catatan' : 'Berhasil disusun',
    body: '<div class="grid-3 mb-3"><div class="kpi"><b>' + d.ditempatkan + '</b><span>jam ditempatkan</span></div><div class="kpi ' + (d.gagal ? 'warn' : '') + '"><b>' + d.gagal + '</b><span>belum tertempat</span></div><div class="kpi ' + (ADM.conflicts.length ? 'err' : '') + '"><b>' + ADM.conflicts.length + '</b><span>peringatan</span></div></div>' +
      (d.gagal ? '<h3 class="fs-6">Belum tertempatkan</h3>' + d.daftarGagal.map(f => '<div class="notice warn"><i class="bi bi-exclamation-triangle"></i><div><b>' + esc(f.kelas) + ' — ' + esc(f.mapel) + '</b> (' + f.sisa + ' jam, ' + esc(shortName(f.guru)) + ')<br>' + esc(f.alasan) + '</div></div>').join('') + '<p class="small muted">Tips: longgarkan ketersediaan/batas jam guru, atau tempatkan sisanya secara manual.</p>' : '<div class="notice ok"><i class="bi bi-check-circle-fill"></i><div>Seluruh beban mengajar berhasil ditempatkan. Periksa bentrok lalu publikasikan.</div></div>'),
    footer: '<button class="btn btn-primary" onclick="closeModal();rerender()">Lihat jadwal</button>'
  });
  rerender();
}
function openClear() {
  const k = X.kelas[S.jk];
  openModal({
    title: 'Kosongkan jadwal',
    body: '<label class="opt"><input type="radio" name="clScope" value="one" checked><span class="ob"><b>Kelas ' + esc(k ? k.nama : '-') + '</b></span></label><label class="opt"><input type="radio" name="clScope" value="all"><span class="ob"><b>Seluruh kelas</b><small>Semua jadwal periode ini</small></span></label>' +
      '<div class="form-check mt-3"><input class="form-check-input" type="checkbox" id="clLock"><label class="form-check-label" for="clLock">Termasuk slot yang terkunci</label></div>',
    footer: '<button class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-danger" data-busy="Menghapus…" onclick="doClear(this)">Kosongkan</button>'
  });
}
async function doClear(btn) {
  const all = (document.querySelector('input[name=clScope]:checked') || {}).value === 'all';
  const r = await act(btn, 'apiClearJadwal', S.token, all ? [] : [S.jk], chk('clLock'));
  if (!r) return; applyRes(r); closeModal(); rerender(); toast(r.message);
}

// ════════ BAGIAN 12: JADWAL PIKET ════════
function piketInfo(g, hari) {
  const nJam = X.kbm[hari].length;
  const un = X.kbm[hari].filter(r => X.un.has(g.id + '|' + hari + '|' + r.jam_ke)).length;
  return { ngajar: M.Jadwal.filter(r => r.guru_id === g.id && r.hari === hari).length, penuhTidak: nJam > 0 && un >= nJam, total: M.JadwalPiket.filter(r => r.guru_id === g.id).length };
}
PAGES.piket = {
  auth: true, adm: true, title: 'Jadwal Piket',
  render(el) {
    const today = todayName(), st = ADM.cfg.publish_piket;
    el.innerHTML = '<div class="page-head"><div><h1>Jadwal Piket</h1><p>Kuota mengikuti Pengaturan Waktu.</p></div><span class="chip ' + (st === 'Dipublikasikan' ? 'ok' : 'warn') + '">' + esc(st) + '</span></div>' +
      '<div class="btn-row mb-3"><button class="btn btn-primary" data-busy="Menyusun…" onclick="autoPiket(this)"><i class="bi bi-magic"></i> Susun otomatis</button></div>' +
      X.days.map(d => {
        const q = (M.PengaturanHari.filter(h => h.hari === d)[0] || {}).guru_piket || 0, rows = M.JadwalPiket.filter(r => r.hari === d), warn = [];
        if (rows.length < q) warn.push('<span class="chip warn"><i class="bi bi-exclamation-triangle"></i> Kurang ' + (q - rows.length) + ' guru</span>');
        rows.forEach(r => { const g = X.guru[r.guru_id]; if (g && piketInfo(g, d).penuhTidak) warn.push('<span class="chip err">' + esc(shortName(g.nama)) + ' tidak tersedia</span>'); });
        return '<div class="card-x ' + (d === today ? 'today' : '') + '"><div class="piket-day"><div class="dn">' + d + '<small>' + rows.length + '/' + q + ' guru</small></div><div class="names">' + (rows.length ? rows.map(r => '<span class="gchip">' + esc((X.guru[r.guru_id] || {}).nama || '?') + '</span>').join('') : '<span class="muted small">Belum ada</span>') + warn.join('') + '</div><button class="btn btn-outline-secondary btn-sm" onclick="editPiket(\'' + d + '\')" aria-label="Ubah piket ' + d + '"><i class="bi bi-pencil"></i></button></div></div>';
      }).join('');
  }
};
async function autoPiket(btn) {
  const r = await act(btn, 'apiAutoPiket', S.token); if (!r) return;
  applyRes(r); rerender(); toast(r.message, r.data.kurang.length ? 'warn' : 'ok');
}
function editPiket(hari) {
  const q = (M.PengaturanHari.filter(h => h.hari === hari)[0] || {}).guru_piket || 0, cur = new Set(M.JadwalPiket.filter(r => r.hari === hari).map(r => r.guru_id));
  S.pkHari = hari;
  const rows = aktifG().map(g => ({ g, i: piketInfo(g, hari) })).sort((a, b) => (cur.has(b.g.id) - cur.has(a.g.id)) || a.i.total - b.i.total || a.g.nama.localeCompare(b.g.nama));
  openModal({
    title: 'Piket hari ' + hari,
    body: '<p class="small muted">Target <b>' + q + '</b> guru. Guru yang mengajar pada hari itu diprioritaskan; yang tidak tersedia sepanjang hari dinonaktifkan.</p>' +
      rows.map(r => '<label class="opt ' + (r.i.penuhTidak && !cur.has(r.g.id) ? 'dis' : '') + '"><input type="checkbox" class="pkChk" value="' + r.g.id + '"' + (cur.has(r.g.id) ? ' checked' : '') + (r.i.penuhTidak && !cur.has(r.g.id) ? ' disabled' : '') + '><span class="ob"><b>' + esc(r.g.nama) + '</b><small>' + (r.i.penuhTidak ? 'Tidak tersedia seharian' : r.i.ngajar ? 'Mengajar ' + r.i.ngajar + ' jam hari ini' : 'Tidak mengajar hari ini') + ' • piket ' + r.i.total + '×/minggu</small></span></label>').join(''),
    footer: '<button class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" data-busy="Menyimpan…" onclick="savePiket(this)">Simpan</button>'
  });
}
async function savePiket(btn) {
  const ids = Array.from(document.querySelectorAll('.pkChk:checked')).map(c => c.value);
  const r = await act(btn, 'apiSetPiket', S.token, S.pkHari, ids); if (!r) return;
  applyRes(r); closeModal(); rerender(); toast(r.message);
}


// ════════ BAGIAN 14: MASTER DATA (CRUD) ════════
const tRank = t => { const m = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 }, k = String(t).trim().toUpperCase(); return m[k] || parseInt(k, 10) || 99; };
const tingkatList = () => { const s = {}; (M.Kelas || []).forEach(k => { s[k.tingkat] = 1; }); (M.MapelJam || []).forEach(k => { s[k.tingkat] = 1; }); return Object.keys(s).sort((a, b) => tRank(a) - tRank(b)); };
const badgeOff = r => r.status === 'Nonaktif' ? ' <span class="chip">Nonaktif</span>' : '';
PAGES.master = {
  auth: true, adm: true, title: 'Data Master',
  render(el) {
    const tabs = [['guru', 'Guru'], ['mapel', 'Mapel'], ['kelas', 'Kelas'], ['ruangan', 'Ruangan'], ['beban', 'Beban']];
    el.innerHTML = '<div class="page-head"><div><h1>Data Master</h1><p>Tambah, ubah, atau nonaktifkan kapan saja — riwayat jadwal tetap aman.</p></div></div><div class="seg" role="tablist">' + tabs.map(t => '<button class="' + (S.mt === t[0] ? 'on' : '') + '" onclick="mTab(\'' + t[0] + '\')">' + t[1] + '</button>').join('') + '</div><div id="mBody"></div>';
    $('mBody').innerHTML = ({ guru: tabGuru, mapel: tabMapel, kelas: tabKelas, ruangan: tabRuangan, beban: tabBeban }[S.mt])();
  }
};
function mTab(t) { S.mt = t; S.mq = ''; rerender(); }
function searchBox(ph) { return '<div class="search"><i class="bi bi-search"></i><input class="form-control" type="search" placeholder="' + ph + '" value="' + esc(S.mq || '') + '" oninput="mSearch(this.value)" aria-label="Cari"></div>'; }
function mSearch(q) { S.mq = q; $('mList').innerHTML = ({ guru: itemsGuru, mapel: itemsMapel, kelas: itemsKelas, ruangan: itemsRuangan }[S.mt])(); }
const matchQ = (...f) => { const q = (S.mq || '').toLowerCase(); return !q || f.join(' ').toLowerCase().indexOf(q) >= 0; };
const fab = (fn, l) => '<button class="fab" onclick="' + fn + '"><i class="bi bi-plus-lg"></i> ' + l + '</button>';
function delBtn(name, id) { return '<button class="btn btn-outline-danger" onclick="delMaster(\'' + name + '\',\'' + id + '\')"><i class="bi bi-trash"></i> Hapus</button>'; }
function delMaster(name, id) {
  confirmBox('Hapus data ini secara permanen? Jika sudah dipakai di jadwal/beban, sistem akan menolak dan Anda sebaiknya menonaktifkannya.', 'Hapus', async () => {
    const r = await act(null, 'apiDeleteMaster', S.token, name, id); if (!r) return;
    applyRes(r); closeModal(); rerender(); toast(r.message);
  }, true);
}
async function saveMaster(btn, fn, obj, extra) {
  const r = await (extra === undefined ? act(btn, fn, S.token, obj) : act(btn, fn, S.token, obj, extra)); if (!r) return;
  applyRes(r); closeModal(); rerender(); toast(r.message);
}
const statusSel = v => '<div class="field"><label class="form-label" for="fStatus">Status</label><select id="fStatus" class="form-select"><option value="Aktif"' + (v !== 'Nonaktif' ? ' selected' : '') + '>Aktif</option><option value="Nonaktif"' + (v === 'Nonaktif' ? ' selected' : '') + '>Nonaktif (riwayat tetap tersimpan)</option></select></div>';

// ── Guru ──
function tabGuru() { return searchBox('Cari nama atau NIP guru…') + '<div id="mList">' + itemsGuru() + '</div>' + fab('editGuru()', 'Guru'); }
function itemsGuru() {
  const L = M.Guru.filter(g => matchQ(g.nama, g.nip)); if (!L.length) return stateEmpty('bi-person-badge', 'Guru tidak ditemukan');
  return L.map(g => {
    const nm = M.GuruMapel.filter(x => x.guru_id === g.id).length, bj = M.BebanMengajar.filter(b => b.guru_id === g.id).reduce((a, b) => a + b.jam_per_minggu, 0);
    return '<button class="item" onclick="editGuru(\'' + g.id + '\')"><span class="avatar">' + esc(initials(g.nama)) + '</span><span class="item-body"><strong>' + esc(g.nama) + badgeOff(g) + '</strong><small>' + (g.nip ? 'NIP ' + esc(g.nip) + ' • ' : '') + nm + ' mapel • beban ' + bj + '/' + g.maks_jam_minggu + ' jam</small></span><i class="bi bi-chevron-right go"></i></button>';
  }).join('');
}
function editGuru(id) {
  const g = id ? X.guru[id] : { maks_jam_hari: ADM.cfg.maks_jam_hari_default || 8, maks_jam_minggu: ADM.cfg.maks_jam_minggu_default || 30, status: 'Aktif' };
  const cur = new Set(M.GuruMapel.filter(x => x.guru_id === id).map(x => x.mapel_id)); S.fid = id || '';
  openModal({
    title: id ? 'Ubah guru' : 'Tambah guru',
    body: '<div class="field"><label class="form-label" for="fNama">Nama lengkap & gelar</label><input id="fNama" class="form-control" value="' + esc(g.nama) + '" required></div><div class="field"><label class="form-label" for="fNip">NIP (opsional)</label><input id="fNip" class="form-control" inputmode="numeric" value="' + esc(g.nip) + '"></div>' +
      '<div class="grid-2"><div class="field"><label class="form-label" for="fMh">Maks jam/hari</label><input id="fMh" type="number" min="1" max="16" class="form-control" value="' + g.maks_jam_hari + '"></div><div class="field"><label class="form-label" for="fMm">Maks jam/minggu</label><input id="fMm" type="number" min="1" max="60" class="form-control" value="' + g.maks_jam_minggu + '"></div></div>' + statusSel(g.status) +
      '<h3 class="fs-6 mb-2">Mata pelajaran yang diampu</h3>' + (M.Mapel.length ? M.Mapel.filter(m => m.status !== 'Nonaktif' || cur.has(m.id)).map(m => '<label class="opt"><input type="checkbox" class="gmChk" value="' + m.id + '"' + (cur.has(m.id) ? ' checked' : '') + '><span class="ob"><b><span class="swatch" style="--h:' + (X.hue[m.id] || 150) + '"></span>' + esc(m.nama) + '</b><small>' + esc(m.kode) + ' • ' + esc(m.kelompok) + '</small></span></label>').join('') : '<p class="muted small">Tambahkan mata pelajaran terlebih dahulu.</p>'),
    footer: (id ? delBtn('Guru', id) : '') + '<button class="btn btn-primary" data-busy="Menyimpan…" onclick="saveGuru(this)">Simpan</button>'
  });
}
function saveGuru(btn) {
  saveMaster(btn, 'apiSaveGuru', { id: S.fid, nama: val('fNama'), nip: val('fNip'), maks_jam_hari: val('fMh'), maks_jam_minggu: val('fMm'), status: val('fStatus') }, Array.from(document.querySelectorAll('.gmChk:checked')).map(c => c.value));
}

// ── Mapel ──
function tabMapel() { return searchBox('Cari kode atau nama mapel…') + '<div id="mList">' + itemsMapel() + '</div>' + fab('editMapel()', 'Mapel'); }
function itemsMapel() {
  const L = M.Mapel.filter(m => matchQ(m.kode, m.nama, m.kelompok)); if (!L.length) return stateEmpty('bi-book', 'Mapel tidak ditemukan');
  return L.map(m => {
    const jt = M.MapelJam.filter(x => x.mapel_id === m.id).sort((a, b) => tRank(a.tingkat) - tRank(b.tingkat)).map(x => x.tingkat + ':' + x.jam_per_minggu).join('  ');
    const np = M.GuruMapel.filter(x => x.mapel_id === m.id).length;
    return '<button class="item" onclick="editMapel(\'' + m.id + '\')"><span class="avatar sw" style="--h:' + (X.hue[m.id] || 150) + '">' + esc(m.kode) + '</span><span class="item-body"><strong>' + esc(m.nama) + badgeOff(m) + (m.blok_jam >= 2 ? ' <span class="chip info"><i class="bi bi-layers-half"></i> berurutan ' + m.blok_jam + ' jam</span>' : '') + (m.gabung_maks >= 2 ? ' <span class="chip info"><i class="bi bi-people"></i> gabungan ≤' + m.gabung_maks + ' kelas</span>' : '') + '</strong><small>' + esc(m.kelompok) + ' • ' + (jt || 'jam belum diatur') + ' • ' + np + ' pengampu</small></span><i class="bi bi-chevron-right go"></i></button>';
  }).join('');
}
function editMapel(id) {
  const m = id ? X.mapel[id] : { kode: '', nama: '', kelompok: 'Umum', status: 'Aktif', blok_jam: 0, gabung_maks: 0 }, ts = tingkatList(); S.fid = id || ''; S.ts = ts;
  openModal({
    title: id ? 'Ubah mata pelajaran' : 'Tambah mata pelajaran',
    body: '<div class="grid-2"><div class="field"><label class="form-label" for="fKode">Kode</label><input id="fKode" class="form-control" maxlength="8" value="' + esc(m.kode) + '" style="text-transform:uppercase"></div><div class="field"><label class="form-label" for="fKel">Kelompok</label><input id="fKel" list="dlKel" class="form-control" value="' + esc(m.kelompok) + '"><datalist id="dlKel"><option>Agama</option><option>Umum</option><option>Muatan Lokal</option><option>Pengembangan Diri</option></datalist></div></div>' +
      '<div class="field"><label class="form-label" for="fNama">Nama mata pelajaran</label><input id="fNama" class="form-control" value="' + esc(m.nama) + '"></div>' + statusSel(m.status) +
      '<div class="field"><label class="form-label" for="fBlok">Susunan jam dalam sehari</label><select id="fBlok" class="form-select" onchange="blokHint()"><option value="0"' + (!(m.blok_jam >= 2) ? ' selected' : '') + '>Bebas (boleh terpisah-pisah)</option>' + [2, 3, 4, 5, 6].map(n => '<option value="' + n + '"' + (m.blok_jam === n ? ' selected' : '') + '>Harus berurutan: ' + n + ' jam per pertemuan</option>').join('') + '</select><div class="form-text" id="fBlokHint"></div></div>' +
      '<div class="field"><label class="form-label" for="fGab">Kelas gabungan (satu guru, beberapa kelas bersamaan)</label><select id="fGab" class="form-select"><option value="0"' + (!(m.gabung_maks >= 2) ? ' selected' : '') + '>Tidak — satu guru hanya satu kelas pada satu jam</option>' + [2, 3, 4, 5, 6].map(n => '<option value="' + n + '"' + (m.gabung_maks === n ? ' selected' : '') + '>Boleh digabung hingga ' + n + ' kelas</option>').join('') + '</select><div class="form-text">Contoh: PJOK dua rombel digabung di lapangan. Hanya kelas <b>satu tingkat</b> yang digabung otomatis. Tiap rombel tetap dihitung sebagai jam mengajar tersendiri.</div></div>' +
      '<h3 class="fs-6 mb-1">Jam standar per minggu tiap tingkat</h3><p class="small muted">Boleh berbeda antar tingkat. Jumlah jam dan mapel dapat disesuaikan per rombel di Data → Beban.</p>' +
      (ts.length ? '<div class="grid-3">' + ts.map((t, i) => '<div class="field"><label class="form-label" for="jt' + i + '">Tingkat ' + esc(t) + '</label><input id="jt' + i + '" type="number" min="0" max="30" class="form-control" value="' + ((M.MapelJam.filter(x => x.mapel_id === id && x.tingkat === t)[0] || {}).jam_per_minggu || '') + '"></div>').join('') + '</div>' : '<div class="notice warn"><i class="bi bi-exclamation-triangle"></i><div>Tambahkan kelas terlebih dahulu agar tingkat tersedia.</div></div>'),
    footer: (id ? delBtn('Mapel', id) : '') + '<button class="btn btn-primary" data-busy="Menyimpan…" onclick="saveMapel(this)">Simpan</button>',
    onShown: blokHint
  });
  blokHint();
}
/** Jam bersambung terpanjang pada pengaturan waktu saat ini (dibatasi istirahat/blok/upacara) */
function maxRun() { let best = 0; X.days.forEach(d => { let run = 0; X.jam[d].forEach(r => { if (r.jam_ke > 0 && r.jenis === 'KBM') { run++; best = Math.max(best, run); } else run = 0; }); }); return best; }
function blokHint() {
  const e = $('fBlokHint'); if (!e) return; const n = Number(val('fBlok')) || 0, mx = maxRun();
  e.innerHTML = n >= 2 ? (n > mx ? '<span style="color:var(--err)"><b>Tidak mungkin terpenuhi:</b> jam bersambung terpanjang hanya ' + mx + ' jam (dibatasi istirahat/blok waktu).</span>' : 'Jam bersambung terpanjang pada pengaturan waktu: ' + mx + ' jam. Sisa jam yang kurang dari ' + n + ' dijadikan satu pertemuan lebih pendek.') : 'Jam bersambung terpanjang pada pengaturan waktu: ' + mx + ' jam.';
}
function saveMapel(btn) {
  const jm = {}; S.ts.forEach((t, i) => { jm[t] = val('jt' + i); });
  saveMaster(btn, 'apiSaveMapel', { id: S.fid, kode: val('fKode'), nama: val('fNama'), kelompok: val('fKel'), status: val('fStatus'), blok_jam: val('fBlok'), gabung_maks: val('fGab') }, jm);
}

// ── Kelas ──
function tabKelas() { return searchBox('Cari kelas…') + '<div id="mList">' + itemsKelas() + '</div>' + fab('editKelas()', 'Kelas'); }
function itemsKelas() {
  const L = M.Kelas.filter(k => matchQ(k.nama, k.tingkat)); if (!L.length) return stateEmpty('bi-mortarboard', 'Kelas tidak ditemukan');
  return L.map(k => {
    const bj = M.BebanMengajar.filter(b => b.kelas_id === k.id).reduce((a, b) => a + b.jam_per_minggu, 0);
    return '<button class="item" onclick="editKelas(\'' + k.id + '\')"><span class="avatar">' + esc(k.nama.replace(/^\D*/, '').slice(0, 4) || k.nama.slice(0, 3)) + '</span><span class="item-body"><strong>Kelas ' + esc(k.nama) + badgeOff(k) + '</strong><small>Tingkat ' + esc(k.tingkat) + ' • wali: ' + esc(shortName((X.guru[k.wali_kelas_id] || {}).nama) || '-') + ' • beban ' + bj + ' jam</small></span><i class="bi bi-chevron-right go"></i></button>';
  }).join('');
}
function editKelas(id) {
  const k = id ? X.kelas[id] : { nama: '', tingkat: '', wali_kelas_id: '', status: 'Aktif' }; S.fid = id || '';
  const ts = Array.from(new Set(['VII', 'VIII', 'IX'].concat(tingkatList())));
  openModal({
    title: id ? 'Ubah kelas' : 'Tambah kelas',
    body: '<div class="grid-2"><div class="field"><label class="form-label" for="fNama">Nama rombel</label><input id="fNama" class="form-control" placeholder="mis. VII A" value="' + esc(k.nama) + '"></div><div class="field"><label class="form-label" for="fTing">Tingkat</label><input id="fTing" list="dlTing" class="form-control" placeholder="VII" value="' + esc(k.tingkat) + '"><datalist id="dlTing">' + ts.map(t => '<option>' + esc(t) + '</option>').join('') + '</datalist></div></div>' +
      '<div class="field"><label class="form-label" for="fWali">Wali kelas</label><select id="fWali" class="form-select"><option value="">— Belum ditentukan —</option>' + aktifG().map(g => '<option value="' + g.id + '"' + (g.id === k.wali_kelas_id ? ' selected' : '') + '>' + esc(g.nama) + '</option>').join('') + '</select></div>' + statusSel(k.status),
    footer: (id ? delBtn('Kelas', id) : '') + '<button class="btn btn-primary" data-busy="Menyimpan…" onclick="saveKelas(this)">Simpan</button>'
  });
}
function saveKelas(btn) { saveMaster(btn, 'apiSaveKelas', { id: S.fid, nama: val('fNama'), tingkat: val('fTing'), wali_kelas_id: val('fWali'), status: val('fStatus') }); }

// ── Ruangan ──
function tabRuangan() { return searchBox('Cari ruangan…') + '<div id="mList">' + itemsRuangan() + '</div>' + fab('editRuangan()', 'Ruangan'); }
function itemsRuangan() {
  const L = (M.Ruangan || []).filter(r => matchQ(r.nama, r.jenis)); if (!L.length) return stateEmpty('bi-door-open', 'Belum ada ruangan', 'Ruangan bersifat opsional.');
  return L.map(r => '<button class="item" onclick="editRuangan(\'' + r.id + '\')"><span class="avatar"><i class="bi bi-door-open"></i></span><span class="item-body"><strong>' + esc(r.nama) + badgeOff(r) + '</strong><small>' + esc(r.jenis) + ' • kapasitas ' + r.kapasitas + '</small></span><i class="bi bi-chevron-right go"></i></button>').join('');
}
function editRuangan(id) {
  const r = id ? X.ruangan[id] : { nama: '', kapasitas: 30, jenis: 'kelas', status: 'Aktif' }; S.fid = id || '';
  openModal({
    title: id ? 'Ubah ruangan' : 'Tambah ruangan',
    body: '<div class="field"><label class="form-label" for="fNama">Nama ruangan</label><input id="fNama" class="form-control" value="' + esc(r.nama) + '"></div><div class="grid-2"><div class="field"><label class="form-label" for="fKap">Kapasitas</label><input id="fKap" type="number" min="0" class="form-control" value="' + r.kapasitas + '"></div><div class="field"><label class="form-label" for="fJenis">Jenis</label><select id="fJenis" class="form-select">' + ['kelas', 'lab', 'aula', 'lainnya'].map(j => '<option' + (j === r.jenis ? ' selected' : '') + '>' + j + '</option>').join('') + '</select></div></div>' + statusSel(r.status),
    footer: (id ? delBtn('Ruangan', id) : '') + '<button class="btn btn-primary" data-busy="Menyimpan…" onclick="saveRuangan(this)">Simpan</button>'
  });
}
function saveRuangan(btn) { saveMaster(btn, 'apiSaveRuangan', { id: S.fid, nama: val('fNama'), kapasitas: val('fKap'), jenis: val('fJenis'), status: val('fStatus') }); }

// ── Beban mengajar per ROMBEL: mapel & jumlah jam boleh berbeda antar rombel dalam satu tingkat ──
function bbInit(kid) {
  const k = X.kelas[kid], std = {}, rows = [], seen = {};
  M.MapelJam.filter(x => x.tingkat === k.tingkat && x.jam_per_minggu > 0).forEach(x => { std[x.mapel_id] = x.jam_per_minggu; });
  M.BebanMengajar.filter(b => b.kelas_id === kid && X.mapel[b.mapel_id]).forEach(b => {
    const r = seen[b.mapel_id]; if (r) { r.jam += b.jam_per_minggu; if (!r.guru) r.guru = b.guru_id; return; }
    seen[b.mapel_id] = { mid: b.mapel_id, jam: b.jam_per_minggu, guru: b.guru_id }; rows.push(seen[b.mapel_id]);
  });
  Object.keys(std).forEach(mid => { if (!seen[mid] && X.mapel[mid] && X.mapel[mid].status !== 'Nonaktif') rows.push({ mid, jam: std[mid], guru: '' }); });
  const ord = {}; M.Mapel.forEach((m, i) => { ord[m.id] = i; }); rows.sort((p, q) => ord[p.mid] - ord[q.mid]);
  S.bb = { kid, rows, std, dirty: false };
}
function bbHint(r) {
  const std = S.bb.std[r.mid], m = X.mapel[r.mid] || {};
  let t = std ? 'Standar tingkat: ' + std + ' jam' + (r.jam !== std && r.jam > 0 ? ' • diubah untuk rombel ini' : '') : 'Mapel khusus rombel ini';
  if (m.blok_jam >= 2) t += ' • diatur berurutan ' + m.blok_jam + ' jam';
  if (!(r.jam > 0) && std) t = 'Rombel ini tidak mengambil mapel ini';
  return t;
}
function bbRowsHtml() {
  const b = S.bb;
  if (!b.rows.length) return stateEmpty('bi-book', 'Belum ada mata pelajaran', 'Tambahkan di bawah, atau atur jam standar di tab Mapel.');
  return b.rows.map((r, i) => {
    const m = X.mapel[r.mid] || { kode: '?', nama: '?' }, std = b.std[r.mid];
    const gs = M.GuruMapel.filter(x => x.mapel_id === r.mid).map(x => X.guru[x.guru_id]).filter(g => g && (g.status !== 'Nonaktif' || g.id === r.guru));
    return '<div class="item" style="display:block"><div class="d-flex align-items-center gap-2 mb-2"><span class="avatar sw" style="--h:' + (X.hue[r.mid] || 150) + ';width:36px;height:36px">' + esc(m.kode) + '</span><div class="flex-fill" style="min-width:0"><strong>' + esc(m.nama) + '</strong>' + (std ? '' : ' <span class="chip info">Khusus rombel</span>') + '<div class="form-text mt-0" id="bbH' + i + '">' + esc(bbHint(r)) + '</div></div>' +
      (std ? '' : '<button class="icon-btn" onclick="bbDel(' + i + ')" aria-label="Hapus mapel dari rombel ini"><i class="bi bi-trash"></i></button>') + '</div>' +
      '<div class="grid-2"><div><label class="form-label" for="bj' + i + '">Jam/minggu</label><input id="bj' + i + '" type="number" min="0" max="30" class="form-control" value="' + r.jam + '" oninput="bbSet(' + i + ',\'jam\',this.value)"></div>' +
      '<div><label class="form-label" for="bg' + i + '">Guru</label><select id="bg' + i + '" class="form-select" onchange="bbSet(' + i + ',\'guru\',this.value)"><option value="">' + (gs.length ? '— Pilih guru —' : 'Belum ada pengampu') + '</option>' + gs.map(g => '<option value="' + g.id + '"' + (g.id === r.guru ? ' selected' : '') + '>' + esc(shortName(g.nama)) + '</option>').join('') + '</select></div></div></div>';
  }).join('');
}
function tabBeban() {
  const kl = aktifK(); if (!kl.length) return '<div class="card-x">' + stateEmpty('bi-mortarboard', 'Belum ada kelas aktif') + '</div>';
  if (!S.bk || !X.kelas[S.bk]) S.bk = kl[0].id;
  if (!S.bb || S.bb.kid !== S.bk) bbInit(S.bk);
  const k = X.kelas[S.bk], b = S.bb;
  const free = M.Mapel.filter(m => m.status !== 'Nonaktif' && !b.rows.some(r => r.mid === m.id));
  const others = kl.filter(x => x.id !== k.id);
  const gl = aktifG().map(g => ({ g, j: M.BebanMengajar.filter(x => x.guru_id === g.id).reduce((a2, x) => a2 + x.jam_per_minggu, 0) })).sort((p, q) => q.j - p.j);
  return '<div class="chips-row" role="tablist" aria-label="Pilih rombel">' + kl.map(x => '<button class="pick ' + (x.id === S.bk ? 'on' : '') + '" onclick="bbPick(\'' + x.id + '\')">' + esc(x.nama) + '</button>').join('') + '</div>' +
    '<div class="card-x"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1"><h2 class="mb-0"><i class="bi bi-diagram-3"></i> Beban rombel ' + esc(k.nama) + '</h2><span class="chip pri" id="bbTot"></span></div>' +
    '<p class="small muted">Setiap rombel boleh memiliki mapel dan jumlah jam yang berbeda, meski satu tingkat. Ubah jam, atur jam <b>0</b> bila rombel tidak mengambil mapel standar, atau tambahkan mapel khusus.</p>' +
    '<div id="bbRows">' + bbRowsHtml() + '</div>' +
    (free.length ? '<div class="d-flex gap-2 mt-2"><select id="bbAdd" class="form-select" aria-label="Mapel yang ditambahkan">' + free.map(m => '<option value="' + m.id + '">' + esc(m.nama) + '</option>').join('') + '</select><button class="btn btn-outline-primary flex-none" onclick="bbAdd()"><i class="bi bi-plus-lg"></i> Tambah</button></div>' : '') +
    '<div class="btn-row mt-3">' + (others.length ? '<div class="d-flex gap-2 w-100"><select id="bbSrc" class="form-select" aria-label="Salin dari rombel"><option value="">Salin pengaturan dari rombel…</option>' + others.map(x => '<option value="' + x.id + '">' + esc(x.nama) + '</option>').join('') + '</select><button class="btn btn-outline-secondary flex-none" onclick="bbCopy()"><i class="bi bi-copy"></i> Salin</button></div>' : '') +
    '<button class="btn btn-outline-secondary" onclick="bbReset()"><i class="bi bi-arrow-counterclockwise"></i> Kembalikan ke standar tingkat</button><button class="btn btn-outline-secondary" data-busy="Mengisi…" onclick="autoBeban(this,\'' + k.id + '\')"><i class="bi bi-magic"></i> Isi guru otomatis</button><button class="btn btn-outline-secondary" data-busy="Mengisi…" onclick="autoBeban(this,\'\')"><i class="bi bi-magic"></i> Semua rombel</button></div></div>' +
    '<div class="sticky-save"><button class="btn btn-primary flex-fill" data-busy="Menyimpan…" onclick="saveBeban(this)"><i class="bi bi-check2"></i> Simpan beban ' + esc(k.nama) + '</button></div>' +
    '<details class="card-x"><summary class="fw-7">Ringkasan beban per guru</summary><div class="mt-3">' + gl.map(x => { const mm = +x.g.maks_jam_minggu || 30; return '<div class="mb-2"><div class="d-flex justify-content-between small"><span>' + esc(shortName(x.g.nama)) + '</span><b>' + x.j + '/' + mm + '</b></div><div class="progress-x ' + (x.j > mm ? 'err' : x.j >= mm * 0.9 ? 'warn' : '') + '"><i style="width:' + Math.min(100, x.j / mm * 100) + '%"></i></div></div>'; }).join('') + '</div></details>';
}
function bbSum() { const e = $('bbTot'); if (e && S.bb) e.textContent = S.bb.rows.reduce((t, r) => t + (r.jam > 0 ? r.jam : 0), 0) + ' jam/minggu'; }
function bbSet(i, f, v) {
  const r = S.bb.rows[i]; r[f] = f === 'jam' ? (v === '' ? 0 : Math.max(0, Number(v) || 0)) : v; S.bb.dirty = true;
  const h = $('bbH' + i); if (h) h.textContent = bbHint(r); bbSum();
}
function bbPick(id) {
  const go2 = () => { S.bk = id; S.bb = null; rerender(); };
  if (S.bb && S.bb.dirty) confirmBox('Perubahan pada rombel ini belum disimpan. Buang perubahan dan pindah rombel?', 'Buang & pindah', go2, true); else go2();
}
function bbAdd() {
  const mid = val('bbAdd'); if (!mid) return;
  const mj = M.MapelJam.filter(x => x.mapel_id === mid && x.jam_per_minggu > 0)[0];
  S.bb.rows.push({ mid, jam: mj ? mj.jam_per_minggu : 2, guru: '' }); S.bb.dirty = true; rerender();
}
function bbDel(i) { S.bb.rows.splice(i, 1); S.bb.dirty = true; rerender(); }
function bbCopy() {
  const src = val('bbSrc'); if (!src) { toast('Pilih rombel sumber terlebih dahulu.', 'warn'); return; }
  const rows = [], seen = {};
  M.BebanMengajar.filter(b => b.kelas_id === src && X.mapel[b.mapel_id]).forEach(b => { if (seen[b.mapel_id]) { seen[b.mapel_id].jam += b.jam_per_minggu; return; } seen[b.mapel_id] = { mid: b.mapel_id, jam: b.jam_per_minggu, guru: b.guru_id }; rows.push(seen[b.mapel_id]); });
  Object.keys(S.bb.std).forEach(mid => { if (!seen[mid] && X.mapel[mid]) rows.push({ mid, jam: S.bb.std[mid], guru: '' }); });
  S.bb.rows = rows; S.bb.dirty = true; rerender(); toast('Disalin dari rombel ' + X.kelas[src].nama + '. Periksa lalu simpan.');
}
function bbReset() {
  const go2 = () => { S.bb = null; rerender(); toast('Dikembalikan ke pengaturan tersimpan / standar tingkat.'); };
  if (S.bb && S.bb.dirty) confirmBox('Buang perubahan yang belum disimpan dan kembali ke standar?', 'Kembalikan', go2, true); else go2();
}
async function saveBeban(btn) {
  const items = [];
  for (const r of S.bb.rows) {
    if (r.jam > 0 && !r.guru) { toast('Pilih guru untuk ' + X.mapel[r.mid].nama + ' atau set jam 0.', 'warn'); return; }
    items.push({ mapel_id: r.mid, guru_id: r.guru, jam: r.jam });
  }
  const r = await act(btn, 'apiSetBebanKelas', S.token, S.bk, items); if (!r) return; applyRes(r); S.bb = null; rerender(); toast(r.message);
}
async function autoBeban(btn, kid) {
  const r = await act(btn, 'apiAutoBeban', S.token, kid); if (!r) return; applyRes(r); S.bb = null; rerender(); toast(r.message, r.data.dilewati.length ? 'warn' : 'ok');
}

// ════════ BAGIAN 15: PENGATURAN WAKTU & KALENDER BELAJAR ════════
function blokBerlaku(b, h) { const x = String(b.hari || 'Semua').trim(); return !x || x.toLowerCase() === 'semua' || x.split(',').map(s => s.trim()).indexOf(h) >= 0; }
/** Cermin logika server buildJamTable_ untuk pratinjau langsung */
function buildJamClient(h, bl) {
  const out = [], dur = +h.durasi_jam_menit || 40, n = +h.jumlah_jam || 0; let cur = tmin(h.jam_masuk); if (isNaN(cur)) return out;
  const aktifHari = bl.filter(b => b.aktif && blokBerlaku(b, h.hari)), adaIsi = b => b.mengisi_jam !== '' && b.mengisi_jam != null && Number(b.mengisi_jam) >= 1, isi = {};
  aktifHari.forEach(b => { if (adaIsi(b) && !isi[Number(b.mengisi_jam)]) isi[Number(b.mengisi_jam)] = b; });
  const blks = aktifHari.filter(b => !adaIsi(b)).map(b => ({ b, after: (b.posisi_setelah_jam === '' || b.posisi_setelah_jam == null) ? null : +b.posisi_setelah_jam, fixed: b.jam_mulai ? tmin(b.jam_mulai) : null, placed: false }));
  const dayStart = cur;
  const put = x => {
    const d = +x.b.durasi_menit || 0;
    if (x.after === null && x.fixed !== null && x.fixed + d <= dayStart) { out.push({ jam_ke: 0, mulai: fmin(x.fixed), selesai: fmin(x.fixed + d), jenis: x.b.nama || x.b.jenis }); x.placed = true; return; }   // sebelum jam masuk: tidak menggeser jam pelajaran
    out.push({ jam_ke: 0, mulai: fmin(cur), selesai: fmin(cur + d), jenis: x.b.nama || x.b.jenis }); cur += d; x.placed = true;
  };
  const flush = k => { let again = true; while (again) { again = false; blks.forEach(x => { if (x.placed) return; if ((x.after !== null && x.after === k) || (x.after === null && x.fixed !== null && x.fixed <= cur)) { put(x); again = true; } }); } };
  for (let j = 1; j <= n; j++) { flush(j - 1); out.push({ jam_ke: j, mulai: fmin(cur), selesai: fmin(cur + dur), jenis: isi[j] ? (isi[j].nama || isi[j].jenis) : 'KBM' }); cur += dur; }
  flush(n); blks.forEach(x => { if (!x.placed) { if (x.fixed !== null && x.fixed > cur) cur = x.fixed; put(x); } });
  return out;
}
function wkInit() {
  S.wk = {
    hari: DAYS.map(d => { const h = ADM.PengaturanHari.filter(x => x.hari === d)[0]; return h ? Object.assign({}, h) : { hari: d, aktif: false, jam_masuk: '07:00', durasi_jam_menit: 40, jumlah_jam: 8, guru_piket: 2 }; }),
    blok: ADM.BlokWaktu.map(b => Object.assign({}, b)), mh: ADM.cfg.maks_jam_hari_default || 8, mm: ADM.cfg.maks_jam_minggu_default || 30
  };
  S.wkDay = null;
}
PAGES.waktu = {
  auth: true, adm: true, title: 'Pengaturan Waktu',
  render(el) {
    if (!S.wk) wkInit(); const w = S.wk;
    el.innerHTML = '<div class="page-head"><div><h1>Pengaturan Waktu</h1><p>Hari belajar, jam pelajaran, istirahat, dan aturan beban guru.</p></div></div>' +
      '<div class="card-x"><h2><i class="bi bi-calendar-week"></i> Hari belajar & jam pelajaran</h2><div id="wkDays">' + wkDays() + '</div><button class="btn btn-outline-secondary btn-sm mt-2" onclick="wkCopy()"><i class="bi bi-copy"></i> Samakan semua hari dengan hari aktif pertama</button></div>' +
      '<div class="card-x"><h2><i class="bi bi-cup-hot"></i> Blok waktu khusus (non-KBM)</h2><p class="small muted">Upacara, istirahat, shalat, dan kegiatan lain. Slot ini tidak bisa diisi mapel.</p><div id="wkBlok">' + wkBlok() + '</div><button class="btn btn-outline-primary btn-sm" onclick="editBlok(-1)"><i class="bi bi-plus-lg"></i> Tambah blok waktu</button></div>' +
      '<div class="card-x"><h2><i class="bi bi-speedometer"></i> Aturan beban guru (bawaan)</h2><div class="grid-2"><div class="field mb-0"><label class="form-label" for="wkMh">Maks jam mengajar / hari</label><input id="wkMh" type="number" min="1" max="16" class="form-control" value="' + w.mh + '" oninput="S.wk.mh=this.value"></div><div class="field mb-0"><label class="form-label" for="wkMm">Maks jam mengajar / minggu</label><input id="wkMm" type="number" min="1" max="60" class="form-control" value="' + w.mm + '" oninput="S.wk.mm=this.value"></div></div><p class="form-text mt-2 mb-0">Dapat diubah per guru di Data → Guru.</p></div>' +
      '<div class="card-x"><h2><i class="bi bi-eye"></i> Pratinjau tabel jam pelajaran</h2><div id="wkPrev">' + wkPrev() + '</div></div>' +
      '<div class="sticky-save"><button class="btn btn-outline-secondary" onclick="S.wk=null;rerender()">Batalkan</button><button class="btn btn-primary flex-fill" data-busy="Menyimpan…" onclick="wkSave(this)"><i class="bi bi-check2"></i> Simpan & terapkan</button></div>';
  }
};
function wkDays() {
  return S.wk.hari.map(h => '<div class="day-card ' + (h.aktif ? '' : 'off') + '"><div class="dh"><span>' + h.hari + '</span><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="wa_' + h.hari + '" ' + (h.aktif ? 'checked' : '') + ' onchange="wkSet(\'' + h.hari + '\',\'aktif\',this.checked)"><label class="form-check-label small" for="wa_' + h.hari + '">Aktif</label></div></div>' +
    '<div class="grid-2" style="grid-template-columns:repeat(2,1fr)"><div><label class="form-label">Jam masuk</label><input type="time" class="form-control" value="' + esc(h.jam_masuk) + '" oninput="wkSet(\'' + h.hari + '\',\'jam_masuk\',this.value)"></div><div><label class="form-label">Durasi/jam (menit)</label><input type="number" min="10" max="120" class="form-control" value="' + h.durasi_jam_menit + '" oninput="wkSet(\'' + h.hari + '\',\'durasi_jam_menit\',this.value)"></div><div><label class="form-label">Jumlah jam</label><input type="number" min="0" max="16" class="form-control" value="' + h.jumlah_jam + '" oninput="wkSet(\'' + h.hari + '\',\'jumlah_jam\',this.value)"></div><div><label class="form-label">Guru piket</label><input type="number" min="0" max="20" class="form-control" value="' + h.guru_piket + '" oninput="wkSet(\'' + h.hari + '\',\'guru_piket\',this.value)"></div></div></div>').join('');
}
function wkSet(d, f, v) {
  const h = S.wk.hari.filter(x => x.hari === d)[0]; h[f] = f === 'aktif' ? !!v : v;
  if (f === 'aktif') $('wkDays').innerHTML = wkDays(); $('wkPrev').innerHTML = wkPrev();
}
function wkCopy() {
  const a = S.wk.hari.filter(h => h.aktif)[0]; if (!a) return;
  S.wk.hari.forEach(h => { if (h.aktif && h !== a) { h.jam_masuk = a.jam_masuk; h.durasi_jam_menit = a.durasi_jam_menit; h.jumlah_jam = a.jumlah_jam; h.guru_piket = a.guru_piket; } });
  $('wkDays').innerHTML = wkDays(); $('wkPrev').innerHTML = wkPrev(); toast('Pola ' + a.hari + ' disalin ke semua hari aktif.');
}
function wkBlok() {
  if (!S.wk.blok.length) return '<p class="muted small">Belum ada blok waktu.</p>';
  return S.wk.blok.map((b, i) => '<button class="item" onclick="editBlok(' + i + ')"><span class="avatar"><i class="bi ' + ({ upacara: 'bi-flag', istirahat: 'bi-cup-hot', shalat: 'bi-moon-stars' }[b.jenis] || 'bi-clock') + '"></i></span><span class="item-body"><strong>' + esc(b.nama) + (b.aktif ? '' : ' <span class="chip">Nonaktif</span>') + '</strong><small>' + esc(b.hari || 'Semua') + ' • ' + (b.mengisi_jam !== '' && b.mengisi_jam != null ? 'menggantikan jam ke-' + b.mengisi_jam : (b.jam_mulai ? 'mulai ' + esc(b.jam_mulai) : 'setelah jam ke-' + b.posisi_setelah_jam) + ' • ' + b.durasi_menit + ' menit') + '</small></span><i class="bi bi-chevron-right go"></i></button>').join('');
}
function wkPrev() {
  const ak = S.wk.hari.filter(h => h.aktif); if (!ak.length) return '<div class="notice warn"><i class="bi bi-exclamation-triangle"></i><div>Aktifkan minimal satu hari belajar.</div></div>';
  if (!S.wkDay || !ak.some(h => h.hari === S.wkDay)) S.wkDay = ak[0].hari;
  const h = ak.filter(x => x.hari === S.wkDay)[0], rows = buildJamClient(h, S.wk.blok), kbm = rows.filter(r => r.jenis === 'KBM').length;
  return '<div class="daytabs">' + ak.map(x => '<button class="daytab ' + (x.hari === S.wkDay ? 'on' : '') + '" onclick="S.wkDay=\'' + x.hari + '\';$(\'wkPrev\').innerHTML=wkPrev()">' + x.hari.slice(0, 3) + '<small>' + (+x.jumlah_jam || 0) + ' jam</small></button>').join('') + '</div>' +
    (rows.length ? '<ul class="tl">' + rows.map(r => '<li><span class="t">' + esc(r.mulai) + '–' + esc(r.selesai) + '</span>' + (r.jenis === 'KBM' ? '<span>Jam ke-<b>' + r.jam_ke + '</b></span>' : '<span class="blk"><i class="bi bi-' + (r.jam_ke ? 'flag' : 'cup-hot') + '"></i> ' + (r.jam_ke ? 'Jam ke-' + r.jam_ke + ' • ' : '') + esc(r.jenis) + '</span>') + '</li>').join('') + '</ul><p class="small muted mt-2 mb-0">' + kbm + ' jam pelajaran • selesai pukul ' + esc(rows[rows.length - 1].selesai) + '</p>' : '<p class="muted">Jam masuk belum valid.</p>');
}
function editBlok(i) {
  const b = i >= 0 ? S.wk.blok[i] : { jenis: 'istirahat', nama: '', hari: 'Semua', posisi_setelah_jam: 3, jam_mulai: '', durasi_menit: 15, aktif: true, mengisi_jam: '' };
  const sel = String(b.hari || 'Semua').toLowerCase() === 'semua' ? null : String(b.hari).split(',').map(s => s.trim()); S.bi = i;
  const mode = (b.mengisi_jam !== '' && b.mengisi_jam != null) ? 'isi' : (b.jam_mulai ? 'fix' : 'after');
  openModal({
    title: i >= 0 ? 'Ubah blok waktu' : 'Tambah blok waktu',
    body: '<div class="grid-2"><div class="field"><label class="form-label" for="bJenis">Jenis</label><select id="bJenis" class="form-select">' + [['upacara', 'Upacara'], ['istirahat', 'Istirahat'], ['shalat', 'Shalat'], ['lainnya', 'Lainnya']].map(j => '<option value="' + j[0] + '"' + (j[0] === b.jenis ? ' selected' : '') + '>' + j[1] + '</option>').join('') + '</select></div><div class="field"><label class="form-label" for="bNama">Nama</label><input id="bNama" class="form-control" value="' + esc(b.nama) + '"></div></div>' +
      '<div class="field"><label class="form-label">Hari berlaku</label><div class="d-flex flex-wrap gap-2"><label class="pick ' + (!sel ? 'on' : '') + '"><input type="checkbox" id="bAll" class="visually-hidden-x" ' + (!sel ? 'checked' : '') + ' onchange="this.parentNode.classList.toggle(\'on\',this.checked)"> Semua hari</label>' + DAYS.map(d => '<label class="pick ' + (sel && sel.indexOf(d) >= 0 ? 'on' : '') + '"><input type="checkbox" class="bDay visually-hidden-x" value="' + d + '" ' + (sel && sel.indexOf(d) >= 0 ? 'checked' : '') + ' onchange="this.parentNode.classList.toggle(\'on\',this.checked)"> ' + d.slice(0, 3) + '</label>').join('') + '</div><div class="form-text">Jika "Semua hari" aktif, pilihan hari diabaikan.</div></div>' +
      '<div class="field"><label class="form-label">Posisi</label>' +
      '<label class="opt"><input type="radio" name="bPos" value="isi" ' + (mode === 'isi' ? 'checked' : '') + ' onchange="bModeSync()"><span class="ob">Menggantikan jam pelajaran ke-<input id="bIsi" type="number" min="1" max="16" class="form-control d-inline-block ms-1" style="width:84px" value="' + (b.mengisi_jam === '' || b.mengisi_jam == null ? 1 : b.mengisi_jam) + '"><small>Contoh: Upacara di jam ke-1. Durasi mengikuti durasi jam pelajaran dan nomor jam lain tidak bergeser.</small></span></label>' +
      '<label class="opt"><input type="radio" name="bPos" value="after" ' + (mode === 'after' ? 'checked' : '') + ' onchange="bModeSync()"><span class="ob">Ditambahkan setelah jam pelajaran ke-<input id="bAfter" type="number" min="0" max="16" class="form-control d-inline-block ms-1" style="width:84px" value="' + (b.posisi_setelah_jam === '' || b.posisi_setelah_jam == null ? 0 : b.posisi_setelah_jam) + '"><small>0 = sebelum jam ke-1. Menambah waktu di antara jam pelajaran.</small></span></label>' +
      '<label class="opt"><input type="radio" name="bPos" value="fix" ' + (mode === 'fix' ? 'checked' : '') + ' onchange="bModeSync()"><span class="ob">Jam mulai tertentu <input id="bFix" type="time" class="form-control d-inline-block ms-1" style="width:130px" value="' + esc(b.jam_mulai) + '"></span></label></div>' +
      '<div class="field"><label class="form-label" for="bDur">Durasi (menit)</label><input id="bDur" type="number" min="1" max="240" class="form-control" value="' + (b.durasi_menit || 15) + '"><div class="form-text" id="bDurHint"></div></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="bAktif" ' + (b.aktif ? 'checked' : '') + '><label class="form-check-label" for="bAktif">Aktif</label></div>',
    footer: (i >= 0 ? '<button class="btn btn-outline-danger" onclick="delBlok()"><i class="bi bi-trash"></i> Hapus</button>' : '') + '<button class="btn btn-primary" onclick="saveBlok()">Simpan</button>',
    onShown: bModeSync
  });
  bModeSync();
}
const bMode = () => (document.querySelector('input[name=bPos]:checked') || {}).value || 'after';
function bModeSync() {
  const isi = bMode() === 'isi', d = $('bDur'); if (!d) return;
  d.disabled = isi; $('bDurHint').textContent = isi ? 'Mengikuti durasi jam pelajaran pada hari tersebut.' : '';
}
function saveBlok() {
  const nama = val('bNama').trim(); if (!nama) { toast('Nama blok wajib diisi.', 'warn'); return; }
  const mode = bMode();
  if (mode === 'fix' && isNaN(tmin(val('bFix')))) { toast('Isi jam mulai (HH:mm).', 'warn'); return; }
  if (mode === 'isi' && !(Number(val('bIsi')) >= 1)) { toast('Isi nomor jam pelajaran yang digantikan (mulai 1).', 'warn'); return; }
  const days = Array.from(document.querySelectorAll('.bDay:checked')).map(c => c.value);
  if (!chk('bAll') && !days.length) { toast('Pilih minimal satu hari atau "Semua hari".', 'warn'); return; }
  const o = {
    id: S.bi >= 0 ? S.wk.blok[S.bi].id : '', jenis: val('bJenis'), nama, hari: chk('bAll') ? 'Semua' : days.join(','),
    mengisi_jam: mode === 'isi' ? Number(val('bIsi')) : '',
    posisi_setelah_jam: mode === 'after' ? (val('bAfter') === '' ? 0 : Number(val('bAfter'))) : '',
    jam_mulai: mode === 'fix' ? val('bFix') : '',
    durasi_menit: mode === 'isi' ? 0 : (Number(val('bDur')) || 0), aktif: chk('bAktif')
  };
  if (S.bi >= 0) S.wk.blok[S.bi] = o; else S.wk.blok.push(o);
  closeModal(); $('wkBlok').innerHTML = wkBlok(); $('wkPrev').innerHTML = wkPrev();
}
function delBlok() { S.wk.blok.splice(S.bi, 1); closeModal(); $('wkBlok').innerHTML = wkBlok(); $('wkPrev').innerHTML = wkPrev(); }
async function wkSave(btn) {
  const w = S.wk;
  const r = await act(btn, 'apiSaveWaktu', S.token, { hari: w.hari, blok: w.blok, cfg: { maks_jam_hari_default: w.mh, maks_jam_minggu_default: w.mm } }); if (!r) return;
  applyRes(r); S.wk = null; const d = r.data; rerender();
  if (d.total || d.ubahWaktu || d.ketersediaan) {
    openModal({
      title: 'Perubahan memengaruhi jadwal', body: '<div class="notice warn"><i class="bi bi-exclamation-triangle"></i><div>Pengaturan tersimpan. Jadwal lama <b>tidak dihapus otomatis</b>; periksa dampak berikut.</div></div>' +
        (d.total ? '<h3 class="fs-6">' + d.total + ' slot jadwal kehilangan jam/hari-nya</h3>' + d.daftar.map(x => '<div class="item" style="min-height:0;padding:8px 12px"><span class="item-body"><strong>' + esc(x.kelas) + ' — ' + esc(x.mapel) + '</strong><small>' + x.hari + ' jam ke-' + x.jam_ke + '</small></span></div>').join('') + (d.total > d.daftar.length ? '<p class="small muted">dan ' + (d.total - d.daftar.length) + ' lainnya (lihat daftar peringatan di menu Jadwal).</p>' : '') : '') +
        (d.ubahWaktu ? '<p>' + d.ubahWaktu + ' slot berubah waktu mulainya.</p>' : '') + (d.ketersediaan ? '<p>' + d.ketersediaan + ' data ketersediaan guru merujuk slot yang tidak ada lagi.</p>' : ''),
      footer: '<button class="btn btn-outline-secondary" data-bs-dismiss="modal">Nanti</button><button class="btn btn-primary" onclick="closeModal();setTimeout(()=>nav(\'jadwal\'),300)">Buka jadwal</button>'
    });
  } else toast(r.message);
}

// ════════ BAGIAN 16: EKSPOR, PUBLIKASI, ARSIP, TAHUN AJARAN BARU ════════
PAGES.ekspor = {
  auth: true, adm: true, title: 'Ekspor & Publikasi',
  render(el) {
    const c = ADM.cfg, nc = ADM.conflicts.length;
    const pc = (t, key, st, cnt, ic) => '<div class="card-x"><div class="d-flex justify-content-between align-items-start gap-2"><div><h2 class="mb-1"><i class="bi ' + ic + '"></i> ' + t + '</h2><p class="small muted mb-2">' + cnt + '</p></div><span class="chip ' + (st === 'Dipublikasikan' ? 'ok' : 'warn') + '">' + esc(st) + '</span></div>' +
      (st === 'Dipublikasikan' ? '<button class="btn btn-outline-secondary w-100" data-busy="Memproses…" onclick="setPublish(\'' + key + '\',\'Draf\',this)"><i class="bi bi-eye-slash"></i> Tarik ke Draf</button>' : '<button class="btn btn-primary w-100" onclick="askPublish(\'' + key + '\',this)"><i class="bi bi-megaphone"></i> Publikasikan</button>') + '</div>';
    const gl = aktifG(), kl = aktifK();
    el.innerHTML = '<div class="page-head"><div><h1>Ekspor & Publikasi</h1><p>Periode aktif: ' + esc(c.tahun_ajaran) + ' ' + esc(c.semester) + '</p></div></div>' +
      pc('Jadwal Pelajaran', 'jadwal', c.publish_jadwal, ADM.Jadwal.length + ' jam terjadwal' + (nc ? ' • ' + nc + ' peringatan' : ''), 'bi-calendar3') + pc('Jadwal Piket', 'piket', c.publish_piket, ADM.JadwalPiket.length + ' penugasan', 'bi-shield-check') +
      '<div class="card-x"><h2><i class="bi bi-file-earmark-arrow-down"></i> Pratinjau & unduh</h2><div class="field"><label class="form-label" for="exPer">Periode</label><select id="exPer" class="form-select" onchange="exPeriod(this.value)"><option value="">Periode aktif (' + esc(c.tahun_ajaran) + ' ' + esc(c.semester) + ')</option>' + ((S.periods || []).filter(p => !p.aktif).map(p => '<option value="' + esc(p.tahun_ajaran + '|' + p.semester) + '"' + (S.expPer === p.tahun_ajaran + '|' + p.semester ? ' selected' : '') + '>Arsip ' + esc(p.tahun_ajaran) + ' ' + esc(p.semester) + '</option>').join('')) + '</select></div>' +
      '<div class="grid-2"><div class="field"><label class="form-label" for="exJenis">Jenis</label><select id="exJenis" class="form-select" onchange="exJenis()"><option value="kelas">Per kelas</option><option value="guru">Per guru</option><option value="sekolah">Seluruh sekolah</option><option value="piket">Jadwal piket</option></select></div><div class="field"><label class="form-label" for="exTarget">Pilihan</label><select id="exTarget" class="form-select"></select></div></div>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="exGo(false,this)"><i class="bi bi-eye"></i> Pratinjau & PDF</button><button class="btn btn-outline-primary" data-busy="Membuat Excel…" onclick="exGo(true,this)"><i class="bi bi-file-earmark-excel"></i> Unduh Excel</button></div><p class="form-text mt-2 mb-0">Berkas juga tersimpan di folder <b>Ekspor</b> pada Google Drive.</p></div>' +
      '<div class="card-x"><h2><i class="bi bi-archive"></i> Tahun ajaran & arsip</h2><p class="small muted">Memulai periode baru tidak menghapus jadwal lama; seluruhnya tersimpan sebagai arsip per tahun ajaran dan semester.</p><button class="btn btn-outline-primary" onclick="openNewPeriod()"><i class="bi bi-calendar-plus"></i> Tahun ajaran / semester baru</button></div>';
    window._exKl = kl; window._exGl = gl; exJenis(); if (!S.periods) loadPeriods();
  }
};
async function loadPeriods() { const r = await act(null, 'apiListPeriods', S.token); if (r) { S.periods = r.data; if (S.page === 'ekspor' && S.periods.length > 1) { const y = window.scrollY; rerender(); window.scrollTo(0, y); } } }
function exJenis() {
  const j = val('exJenis'), t = $('exTarget'); if (!t) return;
  const ar = S.expModel || ADM;
  if (j === 'kelas') t.innerHTML = (ar.Kelas || []).filter(k => k.status !== 'Nonaktif').map(k => '<option value="' + k.id + '">' + esc(k.nama) + '</option>').join('');
  else if (j === 'guru') t.innerHTML = (ar.Guru || []).filter(g => g.status !== 'Nonaktif').map(g => '<option value="' + g.id + '">' + esc(g.nama) + '</option>').join('');
  else t.innerHTML = '<option value="">—</option>';
  t.disabled = j === 'sekolah' || j === 'piket';
}
async function exPeriod(v) {
  S.expPer = v; if (!v) { S.expModel = null; toast('Memakai periode aktif.'); return; }
  const [ta, sem] = v.split('|'), r = await act(null, 'apiLoadArchive', S.token, ta, sem); if (!r) return;
  S.expModel = Object.assign({}, ADM, { Jadwal: r.data.Jadwal, JadwalPiket: r.data.JadwalPiket, conflicts: [], cfg: Object.assign({}, ADM.cfg, { tahun_ajaran: ta, semester: sem }), _x: null });
  toast('Arsip ' + ta + ' ' + sem + ' dimuat.'); exJenis();
}
async function exGo(xlsx, btn) {
  const j = val('exJenis'), id = val('exTarget');
  if ((j === 'kelas' || j === 'guru') && !id) { toast('Pilih kelas/guru terlebih dahulu.', 'warn'); return; }
  useModel(S.expModel || ADM);
  try {
    if (!xlsx) { previewExport(j, id); }
    else { const pk = buildExport(j, id); S.prev = pk; await downloadXlsx(btn); }
  } finally { useModel(ADM); }
}
function askPublish(key, btn) {
  const nc = key === 'jadwal' ? ADM.conflicts.length : 0;
  confirmBox('Publikasikan ' + (key === 'jadwal' ? 'jadwal pelajaran' : 'jadwal piket') + '? Siswa dan umum akan dapat melihatnya.' + (nc ? '<br><br><b style="color:var(--err)">Masih ada ' + nc + ' peringatan bentrok.</b>' : ''), 'Publikasikan', () => setPublish(key, 'Dipublikasikan', null));
}
async function setPublish(key, st, btn) { const r = await act(btn, 'apiSetPublish', S.token, key, st); if (!r) return; applyRes(r); rerender(); toast(r.message, r.data.bentrok && st !== 'Draf' ? 'warn' : 'ok'); }
function openNewPeriod() {
  const c = ADM.cfg, y = parseInt(String(c.tahun_ajaran).split('/')[0], 10) || new Date().getFullYear();
  const nTa = c.semester === 'Ganjil' ? c.tahun_ajaran : (y + 1) + '/' + (y + 2), nSem = c.semester === 'Ganjil' ? 'Genap' : 'Ganjil';
  openModal({
    title: 'Periode baru',
    body: '<div class="notice"><i class="bi bi-info-circle"></i><div>Data master (guru, mapel, kelas, beban) tetap dipakai. Jadwal periode sekarang <b>tersimpan di arsip</b>.</div></div><div class="grid-2"><div class="field"><label class="form-label" for="npTa">Tahun ajaran</label><input id="npTa" class="form-control" placeholder="2026/2027" value="' + esc(nTa) + '"></div><div class="field"><label class="form-label" for="npSem">Semester</label><select id="npSem" class="form-select"><option' + (nSem === 'Ganjil' ? ' selected' : '') + '>Ganjil</option><option' + (nSem === 'Genap' ? ' selected' : '') + '>Genap</option></select></div></div>' +
      '<div class="form-check"><input class="form-check-input" type="checkbox" id="npSalin" checked><label class="form-check-label" for="npSalin">Salin jadwal & piket periode ini sebagai Draf awal</label></div>',
    footer: '<button class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" data-busy="Memproses…" onclick="doNewPeriod(this)">Mulai periode baru</button>'
  });
}
async function doNewPeriod(btn) {
  const r = await act(btn, 'apiNewPeriod', S.token, { tahun_ajaran: val('npTa').trim(), semester: val('npSem'), salin: chk('npSalin') }); if (!r) return;
  applyRes(r); S.periods = null; S.expModel = null; S.expPer = ''; S.av = null; closeModal(); rerender(); toast(r.message);
}

// ════════ BAGIAN 17: AKUN, PENGATURAN, LOG ════════
PAGES.akun = {
  auth: true, adm: true, title: 'Akun Pengguna',
  render(el) {
    el.innerHTML = '<div class="page-head"><div><h1>Akun Pengguna</h1><p>' + (S.user.peran === 'superadmin' ? 'Kelola akun admin dan guru.' : 'Kelola akun guru.') + '</p></div></div><div class="btn-row mb-3"><button class="btn btn-primary" data-busy="Membuat akun…" onclick="makeGuruAccounts(this)"><i class="bi bi-people"></i> Buat akun semua guru</button><button class="btn btn-outline-secondary" onclick="editUser(\'\')"><i class="bi bi-person-plus"></i> Tambah akun</button></div><div id="uList">' + skeleton(4) + '</div>';
    loadUsers();
  }
};
async function loadUsers() {
  const r = await act(null, 'apiListUsers', S.token); if (S.page !== 'akun') return;
  if (!r) { $('uList').innerHTML = stateEmpty('bi-exclamation-triangle', 'Gagal memuat akun'); return; }
  S.users = r.data; const role = { superadmin: 'Super Admin', admin: 'Admin', guru: 'Guru' };
  $('uList').innerHTML = S.users.length ? S.users.map(u => '<button class="item" onclick="editUser(\'' + u.id + '\')"><span class="avatar">' + esc(initials(u.nama)) + '</span><span class="item-body"><strong>' + esc(u.nama) + '</strong><small>' + esc(u.username) + ' • ' + role[u.peran] + (u.terakhir_login ? ' • masuk ' + esc(u.terakhir_login) : ' • belum pernah masuk') + '</small></span>' + (u.status !== 'Aktif' ? '<span class="chip">Nonaktif</span>' : u.wajib_ganti ? '<span class="chip warn">Ganti pw</span>' : '') + '</button>').join('') : stateEmpty('bi-people', 'Belum ada akun');
}
function showCreds(list, title) {
  const txt = list.map(x => x.nama + ' | ' + x.username + ' | ' + x.password).join('\n'); S.creds = list;
  openModal({
    title: title, body: '<div class="notice warn"><i class="bi bi-shield-lock"></i><div>Password hanya tampil <b>sekali</b>. Salin dan bagikan secara aman. Pengguna wajib menggantinya saat masuk pertama.</div></div><textarea id="credTxt" class="form-control creds" readonly>' + esc(txt) + '</textarea>',
    footer: '<button class="btn btn-outline-secondary" onclick="copyText(\'credTxt\')"><i class="bi bi-clipboard"></i> Salin</button><button class="btn btn-outline-secondary" onclick="credCsv()"><i class="bi bi-filetype-csv"></i> Unduh CSV</button><button class="btn btn-primary" data-bs-dismiss="modal">Selesai</button>'
  });
}
function credCsv() { const t = 'Nama,Username,Password\n' + S.creds.map(x => [x.nama, x.username, x.password].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n'); saveB64(btoa(unescape(encodeURIComponent('\ufeff' + t))), 'akun_guru.csv', 'text/csv'); }
async function makeGuruAccounts(btn) { const r = await act(btn, 'apiCreateGuruAccounts', S.token); if (!r) return; toast(r.message); loadUsers(); if (r.data.length) showCreds(r.data, 'Akun guru dibuat'); }
function editUser(id) {
  const u = id ? S.users.filter(x => x.id === id)[0] : { nama: '', username: '', peran: 'guru', guru_id: '', status: 'Aktif' }, sa = S.user.peran === 'superadmin'; S.fid = id;
  openModal({
    title: id ? 'Ubah akun' : 'Tambah akun',
    body: '<div class="field"><label class="form-label" for="uNama">Nama</label><input id="uNama" class="form-control" value="' + esc(u.nama) + '"></div><div class="field"><label class="form-label" for="uUser">Username</label><input id="uUser" class="form-control" autocapitalize="none" value="' + esc(u.username) + '"></div>' +
      '<div class="grid-2"><div class="field"><label class="form-label" for="uPeran">Peran</label><select id="uPeran" class="form-select" onchange="$(\'uGuruBox\').style.display=this.value===\'guru\'?\'\':\'none\'">' + (sa ? ['guru', 'admin', 'superadmin'] : ['guru']).map(p => '<option value="' + p + '"' + (p === u.peran ? ' selected' : '') + '>' + ({ guru: 'Guru', admin: 'Admin', superadmin: 'Super Admin' })[p] + '</option>').join('') + '</select></div><div class="field"><label class="form-label" for="fStatus">Status</label><select id="fStatus" class="form-select"><option' + (u.status === 'Aktif' ? ' selected' : '') + '>Aktif</option><option' + (u.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div></div>' +
      '<div class="field" id="uGuruBox" style="' + (u.peran === 'guru' ? '' : 'display:none') + '"><label class="form-label" for="uGuru">Terhubung ke data guru</label><select id="uGuru" class="form-select"><option value="">— Pilih guru —</option>' + aktifG().map(g => '<option value="' + g.id + '"' + (g.id === u.guru_id ? ' selected' : '') + '>' + esc(g.nama) + '</option>').join('') + '</select></div>' + (id ? '' : '<p class="form-text">Password awal dibuat otomatis dan ditampilkan sekali setelah disimpan.</p>'),
    footer: (id ? '<button class="btn btn-outline-secondary" onclick="resetPw(\'' + id + '\')"><i class="bi bi-key"></i> Reset password</button>' : '') + '<button class="btn btn-primary" data-busy="Menyimpan…" onclick="saveUser(this)">Simpan</button>'
  });
}
async function saveUser(btn) {
  const r = await act(btn, 'apiSaveUser', S.token, { id: S.fid, nama: val('uNama'), username: val('uUser'), peran: val('uPeran'), guru_id: val('uGuru'), status: val('fStatus') }); if (!r) return;
  closeModal(); toast(r.message); loadUsers();
  if (r.data.passwordAwal) setTimeout(() => showCreds([{ nama: val('uNama') || '-', username: val('uUser').toLowerCase(), password: r.data.passwordAwal }], 'Akun dibuat'), 400);
}
function resetPw(id) {
  confirmBox('Reset password akun ini? Password lama tidak berlaku lagi dan pengguna wajib menggantinya.', 'Reset', async () => {
    const r = await act(null, 'apiResetPassword', S.token, id); if (!r) return;
    closeModal(); setTimeout(() => showCreds([{ nama: (S.users.filter(u => u.id === id)[0] || {}).nama || '-', username: r.data.username, password: r.data.password }], 'Password direset'), 400); loadUsers();
  });
}
PAGES.pengaturan = {
  auth: true, adm: true, title: 'Pengaturan Umum',
  render(el) {
    const c = ADM.cfg, sa = S.user.peran === 'superadmin', dark = document.documentElement.getAttribute('data-theme') === 'dark';
    el.innerHTML = '<div class="page-head"><div><h1>Pengaturan Umum</h1><p>Identitas madrasah dan sistem.</p></div></div>' +
      '<div class="card-x"><h2><i class="bi bi-building"></i> Identitas madrasah</h2><div class="field"><label class="form-label" for="cNama">Nama madrasah</label><input id="cNama" class="form-control" value="' + esc(c.nama_madrasah) + '"></div><div class="field"><label class="form-label" for="cLogo">URL logo (https)</label><input id="cLogo" class="form-control" inputmode="url" placeholder="https://…" value="' + esc(c.logo_url) + '"><div class="form-text">Opsional. Gunakan tautan gambar langsung.</div></div>' +
      '<div class="notice"><i class="bi bi-calendar-check"></i><div>Periode aktif: <b>' + esc(c.tahun_ajaran) + ' ' + esc(c.semester) + '</b>. Untuk berganti periode gunakan menu Ekspor & Publikasi → Tahun ajaran baru.</div></div><button class="btn btn-primary" data-busy="Menyimpan…" onclick="saveCfg(this)"><i class="bi bi-check2"></i> Simpan identitas</button></div>' +
      (sa ? '<div class="card-x"><h2><i class="bi bi-hdd-network"></i> Sistem (Super Admin)</h2><div class="field"><label class="form-label">ID Spreadsheet database</label><input class="form-control" readonly value="' + esc(c.spreadsheetId) + '"><a class="small" target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/' + esc(c.spreadsheetId) + '">Buka spreadsheet <i class="bi bi-box-arrow-up-right"></i></a></div><div class="field"><label class="form-label">ID Folder utama Drive</label><input class="form-control" readonly value="' + esc(c.folderId) + '"></div><div class="field"><label class="form-label" for="cEks">ID Folder hasil ekspor</label><input id="cEks" class="form-control" value="' + esc(c.ekspor_folder_id) + '"><div class="form-text">Ubah hanya jika ingin memindahkan folder ekspor.</div></div><button class="btn btn-outline-primary" data-busy="Menyimpan…" onclick="saveCfg(this,true)">Simpan pengaturan sistem</button></div>' : '') +
      '<div class="card-x"><h2><i class="bi bi-palette"></i> Tampilan</h2><button class="btn btn-outline-secondary" onclick="toggleTheme();rerender()"><i class="bi ' + (dark ? 'bi-sun' : 'bi-moon-stars') + '"></i> Beralih ke mode ' + (dark ? 'terang' : 'gelap') + '</button><p class="form-text mt-2 mb-0">Pilihan tema tersimpan di perangkat ini.</p></div>';
  }
};
async function saveCfg(btn, sys) {
  const kv = sys ? { ekspor_folder_id: val('cEks') } : { nama_madrasah: val('cNama'), logo_url: val('cLogo') };
  const r = await act(btn, 'apiSaveConfig', S.token, kv); if (!r) return;
  applyRes(r); if (!sys) { $('sideTitle').textContent = ADM.cfg.nama_madrasah; refreshPublic(); } rerender(); toast(r.message);
}
PAGES.log = {
  auth: true, adm: true, title: 'Log Aktivitas',
  render(el) {
    if (S.user.peran !== 'superadmin') { el.innerHTML = stateEmpty('bi-lock', 'Hanya Super Admin'); return; }
    el.innerHTML = '<div class="page-head"><div><h1>Log Aktivitas</h1><p>300 aktivitas terakhir.</p></div></div><div id="lgList">' + skeleton(5) + '</div>'; loadLog();
  }
};
async function loadLog() {
  const r = await act(null, 'apiGetLog', S.token); if (S.page !== 'log') return;
  $('lgList').innerHTML = r && r.data.length ? r.data.map(l => '<div class="item" style="min-height:0"><span class="item-body"><strong>' + esc(l.aksi) + '</strong><small>' + esc(l.waktu) + ' • ' + esc(l.pengguna) + (l.detail ? ' • ' + esc(l.detail) : '') + '</small></span></div>').join('') : stateEmpty('bi-journal-text', 'Belum ada aktivitas');
}

