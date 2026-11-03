# Panduan Instalasi — Jadwal MTs (Frontend GitHub Pages + Backend Google Apps Script)

```
Siswa/Guru/Admin → https://USERNAME.github.io/jadwal-mts/   (frontend statis, GitHub Pages)
                          │  fetch() JSON
                          ▼
                 Google Apps Script Web App  (/exec)         (backend REST API)
                          │
                          ▼
                 Google Sheets + Drive                        (database & berkas ekspor)
```

Ada **dua bagian** yang dipasang terpisah. Kerjakan **A dulu** (backend), karena URL-nya dibutuhkan oleh **B** (frontend).

---

## A. Backend — Google Apps Script (±10 menit)

Berkas yang dipakai: **`Kode.gs`** dan **`appsscript.json`** (diberikan terpisah dari ZIP ini; *tidak* diunggah ke GitHub).

1. Buka <https://script.google.com> → **Proyek baru** → beri nama *Jadwal MTs API*.
2. Ganti nama `Code.gs` menjadi **`Kode.gs`**, hapus isinya, tempel seluruh isi `Kode.gs`.
3. Ikon roda gigi **Pengaturan Proyek** → centang **"Tampilkan berkas manifes appsscript.json"** → kembali ke editor, buka `appsscript.json`, ganti isinya dengan berkas `appsscript.json` yang diberikan → simpan.
4. Pilih fungsi **`setupAppEnvironment`** → **Jalankan** (sekali saja).
   - Klik **Tinjau izin** → pilih akun → **Lanjutan** → **Buka Jadwal MTs API (tidak aman)** → **Izinkan**. Peringatan ini normal untuk skrip buatan sendiri.
   - Buka **Log eksekusi**. Akan tertulis baris **🔑 AKUN SUPER ADMIN — username: `superadmin` | password awal: `admin123`**.
   - Setup membuat folder `Folder_Jadwal_MTs` + spreadsheet `DB_Jadwal_MTs` (16 sheet + data contoh), kunci rahasia token, dan *trigger* penulis log tiap 5 menit.
5. **Terapkan → Deployment baru → ikon roda gigi → Aplikasi web**
   - *Jalankan sebagai*: **Saya** • *Yang memiliki akses*: **Siapa saja**
   - **Terapkan** → **salin URL Aplikasi Web** (berakhiran `/exec`).
6. **Uji backend**: tempel `URL_EXEC?action=ping` di tab browser baru. Harus tampil JSON berisi `"message":"pong"`.

> ⚠️ **Memperbarui kode backend nanti**: *Terapkan → **Kelola deployment** → ✏️ Edit → Versi: **Versi baru** → Terapkan*. Jangan pilih "Deployment baru" — itu membuat URL `/exec` baru dan frontend berhenti bekerja.
> **Password awal Super Admin: `admin123`** (username `superadmin`). Aplikasi **memaksa menggantinya saat login pertama**, jadi segera login sebelum alamat situs dibagikan. Lupa password? Jalankan fungsi `resetSuperAdmin` dari editor — password dikembalikan ke `admin123` dan wajib diganti lagi.

---

## B. Frontend — GitHub Pages

### Isi folder (sudah benar, jangan diubah susunannya)

```
jadwal-mts/              ← FOLDER INI yang di-"git init" (hasil ekstraksi ZIP)
├── index.html           ← harus ada di root
├── README.md
├── PANDUAN-INSTALASI.md
├── .nojekyll
├── css/style.css
└── js/
    ├── config.js        ← satu-satunya berkas yang Anda edit
    ├── core.js
    └── admin.js         (dimuat otomatis hanya untuk admin)
```

### B1. Isi URL backend (WAJIB sebelum push pertama)

Buka `js/config.js` dengan Notepad, ganti `PASTE_URL_EXEC_DI_SINI` dengan URL `/exec` dari langkah A5:

```js
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

### B2. Pasang Git & siapkan akun (sekali saja)

- Windows: unduh Git dari <https://git-scm.com/download/win> (pengaturan default). Mac: ketik `git --version` di Terminal. Lalu buka **PowerShell** (Windows) atau Terminal.
- Daftar di <https://github.com>. Username Anda menjadi bagian alamat situs (`username.github.io`).
- Setel identitas Git:
  ```bash
  git config --global user.name "Nama Anda"
  git config --global user.email "email-akun-github@contoh.com"
  ```

### B3. Buat repository di GitHub

**+** → **New repository** → nama `jadwal-mts` → **Public** → **JANGAN** centang README/.gitignore/license → **Create repository**. Biarkan halamannya terbuka.

### B4. Masuk ke folder yang BENAR lalu verifikasi

Ekstrak `jadwal-mts.zip`. Masuk ke folder hasil ekstraksi **`jadwal-mts`** — itulah folder kerja. *Jangan masuk lebih dalam, jangan naik satu level.* Cara cepat di Windows: buka folder `jadwal-mts` di File Explorer → klik address bar → ketik `powershell` → Enter.

Cek isinya **sebelum** `git init`:

```powershell
dir          # Windows PowerShell   (Mac/Linux: ls -la)
```

Harus terlihat **`index.html`**, folder **`css`** dan **`js`**. Jika yang terlihat malah folder lain, Anda salah folder — jangan lanjut.

### B5. Push pertama (satu per satu)

```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/jadwal-mts.git
git push -u origin main
```

(`USERNAME` = username GitHub Anda.) Saat diminta *Password*, tempel **Personal Access Token**, bukan password akun. Layar tidak menampilkan karakter apa pun saat Anda paste — itu normal.
Membuat token: <https://github.com/settings/tokens> → *Generate new token (classic)* → centang **repo** → salin `ghp_…` (hanya tampil sekali). Alternatif tanpa terminal: **GitHub Desktop**.

### B6. Aktifkan GitHub Pages

Repo di GitHub → **Settings → Pages** → *Source*: **Deploy from a branch** → *Branch*: **main** / **(root)** → **Save** → centang **Enforce HTTPS**. Tunggu 1–2 menit; alamat situs muncul: `https://USERNAME.github.io/jadwal-mts/`.

### B7. Update di kemudian hari

```bash
git add .
git commit -m "Deskripsi perubahan"
git push
```
Jika tampilan lama masih muncul: **Ctrl+Shift+R**. Setelah mengubah berkas JS/CSS, naikkan `APP_VERSION` di `js/config.js` dan angka `?v=` di `index.html` agar cache browser terbarui.

---

## C. Uji menyeluruh

1. Buka alamat situs. Halaman publik tampil; sebelum jadwal dipublikasikan akan ada catatan "belum dipublikasikan".
2. **Masuk** → `superadmin` + `admin123` → wajib ganti password → dasbor tampil.
3. Ikuti alur: Pengaturan Waktu → Data → Beban → Jadwal → *Susun otomatis* → Piket → **Ekspor & Publikasi → Publikasikan**. Buka situs di HP lain (tanpa login): jadwal kelas tampil.
4. Chrome DevTools (F12) → Console → ketik `Perf.table()` untuk melihat **waktu jaringan vs waktu server** tiap aksi.

## D. Catatan teknis & keamanan

- **Token** = HMAC stateless, berlaku 12 jam (diperpanjang otomatis), dicabut otomatis saat password diganti/direset atau akun dinonaktifkan. Password di-hash + salt; 5 kali gagal → kunci 15 menit.
- **Data di perangkat**: untuk kecepatan, data layar terakhir disimpan di *localStorage* peramban. Data dihapus saat **Keluar**. Di komputer bersama, selalu tekan Keluar.
- **Kecepatan**: login = 1 panggilan (token + data awal); halaman dirender dari cache perangkat lalu disegarkan di latar; tulis idempoten (aman saat sinyal putus); kode admin tidak diunduh siswa/guru.
- **Kuota GAS**: dengan *Jalankan sebagai: Saya*, semua pengunjung memakai kuota akun pemilik (±30 eksekusi serentak). Data publik di-cache server 15 menit; hindari membagikan tautan ke ratusan siswa dalam detik yang sama.
- **PDF**: dibuat server dari HTML; bila kolom terpotong gunakan tombol **Cetak** → *Simpan sebagai PDF*.

## E. Pemecahan masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| Situs menampilkan **404** | `index.html` tidak di root repo / salah folder saat `git init` | Buka repo di GitHub: harus terlihat `index.html` di root. Jika terlihat folder lain, push ulang dari folder `jadwal-mts` |
| Muncul peringatan kuning *"Backend Apps Script belum diperbarui"*, atau pesan galat lama (mis. *"Durasi blok … harus bilangan bulat 1–240"* saat menyimpan Upacara di jam ke-1) | `Kode.gs` sudah ditempel di editor, tetapi **alamat /exec masih menjalankan versi lama** | Apps Script → **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**. Alamat `/exec` tetap sama. Cek: `…/exec?action=ping` harus memuat `"v":"1.1.0"` |
| Pilihan **Kelas gabungan** / **Susunan jam** di Data → Mapel selalu kembali ke "Tidak"/"Standar" setelah disimpan (atau muncul banner kuning *"Backend belum diperbarui"*) | Backend (Apps Script) yang berjalan di alamat `/exec` masih **versi lama**; kolom pengaturan baru diabaikan tanpa galat | Tempel `Kode.gs` terbaru → **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan** → jalankan `setupAppEnvironment` sekali. Cek `…/exec?action=ping` harus memuat `"v":"1.4.0"` (atau lebih baru), lalu muat ulang situs (Ctrl+Shift+R) dan simpan ulang mapel |
| Setup gagal: *"Anda tidak memiliki izin untuk memanggil ScriptApp.getProjectTriggers"* | Izin `script.scriptapp` belum diberikan (otorisasi lama tanpa izin ini) | Ganti `appsscript.json` dengan versi terbaru (berisi `oauthScopes`) → simpan → jalankan `pasangTrigger` → **Tinjau izin → Izinkan**. Bila jendela izin tidak muncul: buka <https://myaccount.google.com/permissions>, cabut akses *Jadwal*, lalu jalankan ulang |
| Lupa / tidak tahu password Super Admin | Sudah diganti, atau setup versi lama memakai password acak | Jalankan fungsi `resetSuperAdmin` → password menjadi `admin123` (wajib diganti saat login) |
| Halaman tanpa styling, 404 pada `.css/.js` | Berkas diunggah via web GitHub sehingga rata di root | Push dari terminal agar folder `css/` & `js/` terjaga |
| Tulisan "URL backend belum diisi" | `GAS_URL` belum diisi | Edit `js/config.js`, push ulang |
| "Server membalas HTTP … (bukan JSON)" | URL salah, atau deployment bukan *Siapa saja* | Cek `…/exec?action=ping` di browser; ulangi langkah A5 |
| Data lama setelah update backend | Deployment belum diberi *Versi baru* | A: *Kelola deployment → Edit → Versi baru* |
| "Sesi berakhir" | Token kedaluwarsa/dicabut | Masuk kembali |
| `Password authentication is not supported` | GitHub menolak password akun | Pakai Personal Access Token (B5) |
| `fatal: not a git repository` | Belum `git init` / salah folder | Jalankan `dir`, pastikan ada `index.html`, lalu `git init` |
| Peringatan `LF will be replaced by CRLF` | Perbedaan format baris Windows | Abaikan — hanya peringatan |

## F. Upacara bendera di jam pelajaran ke-1

Di **Pengaturan Waktu → Blok waktu khusus** (data contoh: *Upacara Bendera*, hari Senin), ada tiga pilihan **Posisi**:

| Posisi | Efek |
| --- | --- |
| **Menggantikan jam pelajaran ke-N** | Jam ke-N pada hari itu dipakai kegiatan tersebut (mis. Upacara di jam ke-1 Senin). Durasinya mengikuti durasi jam pelajaran, nomor jam lain **tidak bergeser**, dan slot itu tidak bisa diisi mapel (dilewati susun otomatis). |
| Ditambahkan setelah jam ke-N | Menambah waktu ekstra di antara jam pelajaran (cara lama; `0` = sebelum jam ke-1). |
| Jam mulai tertentu | Disisipkan pada jam yang ditentukan. |

**Kegiatan sebelum jam masuk** (mis. *Shalat Dhuha* mulai 06:45, 15 menit, saat jam masuk 07:00) ditempatkan pada jamnya dan **tidak menggeser** jam pelajaran.

Contoh: pilih jenis *Upacara*, hari *Senin*, posisi *Menggantikan jam pelajaran ke-1* → Senin jam ke-1 = Upacara (07:00–07:40), jam ke-2 mulai 07:40. Hari lain tetap normal. Klik **Simpan & terapkan**; bila sudah ada jadwal di slot tersebut, sistem menampilkan daftar slot terdampak (tidak dihapus otomatis).

## G. Memperbarui dari versi sebelumnya

1. **Backend**: tempel `Kode.gs` terbaru → jalankan **`setupAppEnvironment`** lagi (aman; hanya menambah kolom baru: `mengisi_jam`/`tingkat` pada `BlokWaktu`, `tingkat` pada `JamPelajaran`, `kode` pada `Guru`, serta `blok_jam`/`gabung_maks` pada `Mapel`; data tidak berubah; kode guru yang kosong diisi otomatis) → *Terapkan → Kelola deployment → ✏️ Edit → Versi baru → Terapkan*.
2. **Frontend**: ganti isi folder dengan versi baru (atau salin berkas yang berubah), lalu `git add .` → `git commit -m "Update"` → `git push`. Tekan **Ctrl+Shift+R** bila tampilan lama masih muncul.
3. Blok *Upacara* lama (cara "ditambahkan") tidak berubah otomatis; ubah posisinya di Pengaturan Waktu bila ingin menempati jam ke-1.
4. **Perubahan perilaku** dari versi sebelumnya: mapel yang dulu berstatus "Bebas" (nilai 0) kini menjadi **Standar** (genap = 2 jam/pertemuan, ganjil = 3 jam + sisa 2 jam; blok non-KBM diabaikan). Ubah ke *Bebas* di Data → Mapel bila ingin perilaku lama. Buka **Pengaturan Waktu → Simpan & terapkan** sekali agar tabel jam dibuat per tingkat (sebelum itu semua tingkat memakai tabel yang sama).

## H. Susunan jam mapel (pertemuan 2 jam & 3 jam) dan beban berbeda per rombel

**Aturan standar** — berlaku otomatis untuk semua mapel (*Data → Mapel → Susunan jam dalam sehari → Standar*). Tiap pertemuan = jam pelajaran **berurutan**:

| Jam/minggu | Pertemuan |
| --- | --- |
| 1 | 1 jam |
| **Genap** — 2, 4, 6, 8 … | **setiap pertemuan 2 jam**: 2 = 2 • 4 = 2+2 • 6 = 2+2+2 • 8 = 2+2+2+2 |
| **Ganjil** — 3, 5, 7, 9 … | **satu pertemuan 3 jam**, sisanya 2 jam: 3 = 3 • 5 = 3+2 • 7 = 3+2+2 • 9 = 3+2+2+2 |

- **Blok non-KBM di antara jam pertama dan terakhir diabaikan.** Istirahat, shalat, upacara, dan kegiatan lain yang tidak berupa jam pelajaran tidak memutus pertemuan. Contoh: pertemuan 3 jam boleh menempati jam ke-3, ke-4, dan ke-5 walau ada istirahat di antara jam ke-3 dan ke-4.
- Dua pertemuan yang kebetulan bersebelahan pada hari yang sama (mis. 2+2 menjadi 4 jam beruntun) tetap dianggap sah.
- Susun otomatis memakai susunan baku di atas dan bersifat **ketat**: bila tidak ada slot berurutan yang kosong untuk kelas **dan** guru, jam itu dilaporkan "belum tertempatkan" beserta alasannya.
- **Edit manual** yang menyimpang muncul di daftar peringatan, mis. *"susunan jam 1+1+2 tidak sesuai aturan (4 jam seharusnya 2+2)"*.
- Pilihan lain per mapel: **Bebas** (boleh terpisah-pisah, tidak diperiksa) dan **Harus berurutan N jam** (pertemuan tetap N jam, sisanya satu pertemuan lebih pendek) — pakai ini bila ingin pengecualian, mis. 6 jam = 3+3.
- Di dialog slot ada **Jumlah jam berurutan** untuk mengisi beberapa jam sekaligus; nilai awalnya mengikuti aturan (sisa genap → 2 jam, sisa ganjil ≥ 3 → 3 jam).

**Mapel dan jam berbeda tiap rombel** — *Data → Beban → (pilih rombel)*:

- Jam standar per tingkat (Data → Mapel) hanyalah **nilai awal**. Di tab Beban, jam setiap mapel dapat diubah **per rombel**, mis. VII A IPA 6 jam sedangkan VII B 4 jam.
- Isi jam **0** bila rombel itu **tidak mengambil** mapel standar tingkatnya (tidak akan diisi ulang oleh *Isi guru otomatis*).
- Tombol **Tambah** memasukkan mapel khusus yang tidak ada di standar tingkat (diberi tanda *Khusus rombel*).
- **Salin dari rombel…** menyalin mapel, jam, dan guru dari rombel lain; **Kembalikan ke standar** mengembalikan ke jam standar tingkat. Perubahan baru tersimpan setelah menekan *Simpan beban*.

## I. Kelas gabungan (satu guru, beberapa kelas bersamaan)

*Data → Mapel → (pilih mapel) → **Kelas gabungan***: pilih **Boleh digabung hingga N kelas** (2–6). Default-nya *Tidak*.

- Untuk mapel tersebut, guru **boleh terjadwal di lebih dari satu kelas pada jam yang sama** (mis. PJOK VII A + VII B di lapangan). Tidak dianggap bentrok selama: mapelnya sama, jumlah kelas tidak melebihi N, dan (sebaiknya) kelasnya **satu tingkat**.
- **Tiap rombel dihitung sebagai jam mengajar tersendiri.** Dua kelas yang diajar bersamaan = **2 jam** terhadap batas jam/hari dan jam/minggu guru, dasbor, dan tampilan jadwal guru. Jadi gabungan **hanya melonggarkan bentrok waktu**, tidak mengurangi beban jam guru.
- **Kapan berguna:** saat waktu tersedia guru terbatas (mis. guru hanya hadir jam ke-1 s.d. 4, sehingga 14 kelas × 3 jam tidak muat sebagai 42 slot terpisah). Pada uji: tanpa gabungan 19 jam gagal tertempatkan, dengan gabungan ≤2 semuanya tertempatkan. Bila kendalanya batas jam/minggu guru, gabungan tidak membantu — naikkan batas guru atau tambah guru.
- **Susun otomatis** menggabungkan sendiri hanya kelas **satu tingkat** dan sedikit mengutamakan penggabungan.
- **Edit manual**: di dialog slot, guru yang bisa digabung ditandai *"digabung dengan VII A"*. Bila batas penuh, mapel berbeda, atau mapel belum diizinkan, muncul alasan jelas. Gabungan lintas tingkat diperbolehkan manual tetapi diberi peringatan.
- Pada tampilan *Per guru*, PDF, dan Excel, sel kelas gabungan tampil sebagai **"VII A + VII B"**.
- Dapat dikombinasikan dengan *Harus berurutan* (mis. PJOK gabungan 2 kelas, 2 jam berurutan).
- Data contoh: PJOK diatur boleh digabung hingga 2 kelas.

## J. Kode huruf guru & tampilan jadwal cetak

- Setiap guru punya **kode huruf** (A, B, … Z, AA, AB, …). Dibuat otomatis saat setup/guru baru; dapat diubah di *Data → Guru → Kode guru* (1–3 huruf, unik) atau diisi massal dengan tombol **Beri kode huruf otomatis**.
- Pada **jadwal kelas** (layar, PDF, Excel) tiap sel berisi **kode mapel + kode guru** (mis. `BIN` / `C`). **Nama guru tidak tercetak di sel**; nama dan kode dijelaskan pada tabel **Keterangan kode** di bawah jadwal (Kode Mapel – Mata Pelajaran – Kode Guru – Nama Guru).
- **Jadwal piket** dicetak dengan kode huruf guru + keterangan. **Jadwal per guru** memuat nama & kode guru pada judul, sedangkan sel berisi kode mapel + kelas.
- Excel: keterangan kode ditempatkan di bawah tabel jadwal pada tiap lembar.

## K. Blok non-KBM berbeda untuk setiap tingkat

*Pengaturan Waktu → Blok waktu khusus → (blok) → **Berlaku untuk tingkat***: pilih **Semua tingkat** atau tingkat tertentu (mis. VII dan VIII saja).

- Contoh: *Istirahat 1* untuk VII & VIII setelah jam ke-3 (15 menit), sedangkan *Istirahat IX* untuk tingkat IX setelah jam ke-4 (20 menit). Upacara, shalat, dan blok lain pun dapat diatur per tingkat.
- Sistem membuat **tabel jam terpisah untuk tiap tingkat**; pratinjau di Pengaturan Waktu memiliki pilihan tingkat. Jam masuk, durasi jam pelajaran, dan jumlah jam per hari tetap satu pengaturan per hari.
- **Bentrok guru ditentukan dari waktu yang bertumpuk**, bukan nomor jam. Guru yang mengajar VII jam ke-6 (10:35–11:15) dan IX jam ke-5 (10:00–10:40) tetap dianggap bentrok karena waktunya bertumpuk; sebaliknya jam bernomor sama pada tingkat berbeda yang waktunya tidak bertumpuk bukan bentrok. Susun otomatis ikut menghindari tumpukan ini.
- **Ketersediaan guru** tetap dicatat per nomor jam (grid memakai tabel acuan tingkat terendah).
- Menambah kelas dengan tingkat baru otomatis membuat tabel jam untuk tingkat tersebut.
