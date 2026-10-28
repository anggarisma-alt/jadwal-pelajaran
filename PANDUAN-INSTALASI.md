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
   - Buka **Log eksekusi**. Catat baris **🔑 AKUN SUPER ADMIN — username: `superadmin` | password awal: `…`**.
   - Setup membuat folder `Folder_Jadwal_MTs` + spreadsheet `DB_Jadwal_MTs` (16 sheet + data contoh), kunci rahasia token, dan *trigger* penulis log tiap 5 menit.
5. **Terapkan → Deployment baru → ikon roda gigi → Aplikasi web**
   - *Jalankan sebagai*: **Saya** • *Yang memiliki akses*: **Siapa saja**
   - **Terapkan** → **salin URL Aplikasi Web** (berakhiran `/exec`).
6. **Uji backend**: tempel `URL_EXEC?action=ping` di tab browser baru. Harus tampil JSON berisi `"message":"pong"`.

> ⚠️ **Memperbarui kode backend nanti**: *Terapkan → **Kelola deployment** → ✏️ Edit → Versi: **Versi baru** → Terapkan*. Jangan pilih "Deployment baru" — itu membuat URL `/exec` baru dan frontend berhenti bekerja.
> Lupa password Super Admin? Jalankan fungsi `resetSuperAdmin` dari editor, lalu lihat Log eksekusi.

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
2. **Masuk** → `superadmin` + password awal → wajib ganti password → dasbor tampil.
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
| Setup gagal: *"Anda tidak memiliki izin untuk memanggil ScriptApp.getProjectTriggers"* | Izin `script.scriptapp` belum diberikan (otorisasi lama tanpa izin ini) | Ganti `appsscript.json` dengan versi terbaru (berisi `oauthScopes`) → simpan → jalankan `pasangTrigger` → **Tinjau izin → Izinkan**. Bila jendela izin tidak muncul: buka <https://myaccount.google.com/permissions>, cabut akses *Jadwal*, lalu jalankan ulang |
| Password Super Admin tidak terlihat di log | Setup terhenti sebelum mencetaknya (versi lama) | Jalankan fungsi `resetSuperAdmin`, lihat Log eksekusi |
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

1. **Backend**: tempel `Kode.gs` terbaru → jalankan **`setupAppEnvironment`** lagi (aman; hanya menambah kolom baru: `mengisi_jam` pada `BlokWaktu` dan `blok_jam` pada `Mapel`; data tidak berubah) → *Terapkan → Kelola deployment → ✏️ Edit → Versi baru → Terapkan*.
2. **Frontend**: ganti isi folder dengan versi baru (atau salin berkas yang berubah), lalu `git add .` → `git commit -m "Update"` → `git push`. Tekan **Ctrl+Shift+R** bila tampilan lama masih muncul.
3. Blok *Upacara* lama (cara "ditambahkan") tidak berubah otomatis; ubah posisinya di Pengaturan Waktu bila ingin menempati jam ke-1.

## H. Mapel yang harus berurutan & beban berbeda per rombel

**Mapel harus berurutan** — *Data → Mapel → (pilih mapel) → Susunan jam dalam sehari*:

| Pilihan | Arti |
| --- | --- |
| Bebas | Jam boleh terpisah-pisah (perilaku awal; sistem tetap mengutamakan pasangan 2 jam). |
| Harus berurutan: N jam | Setiap pertemuan = N jam **bersambung** pada hari yang sama. Jam sisa yang kurang dari N menjadi satu pertemuan lebih pendek. Contoh PJOK 3 jam/minggu & N=2 → satu pertemuan 2 jam + satu pertemuan 1 jam. |

- **Susun otomatis** memperlakukannya sebagai aturan ketat dan tidak memecah pertemuan. Jika tidak ada slot berurutan yang kosong untuk kelas **dan** guru, jam itu dilaporkan "belum tertempatkan" beserta alasannya (longgarkan ketersediaan guru atau ubah ke *Bebas*).
- **Jam bersambung tidak menyeberangi istirahat/shalat/upacara.** Pada data contoh, jam bersambung terpanjang per hari hanya 3 jam (jam 1–3, 4–5, 6, 7–8), sehingga N=3 untuk banyak kelas sekaligus tidak akan muat. Form mapel menampilkan jam bersambung terpanjang dan memperingatkan bila N terlalu besar.
- **Edit manual**: di dialog slot ada pilihan **Jumlah jam berurutan** untuk mengisi beberapa jam sekaligus (jam yang sudah terisi ditimpa). Mapel yang pertemuannya terpisah-pisah akan muncul di daftar peringatan bentrok.

**Mapel dan jam berbeda tiap rombel** — *Data → Beban → (pilih rombel)*:

- Jam standar per tingkat (Data → Mapel) hanyalah **nilai awal**. Di tab Beban, jam setiap mapel dapat diubah **per rombel**, mis. VII A IPA 6 jam sedangkan VII B 4 jam.
- Isi jam **0** bila rombel itu **tidak mengambil** mapel standar tingkatnya (tidak akan diisi ulang oleh *Isi guru otomatis*).
- Tombol **Tambah** memasukkan mapel khusus yang tidak ada di standar tingkat (diberi tanda *Khusus rombel*).
- **Salin dari rombel…** menyalin mapel, jam, dan guru dari rombel lain; **Kembalikan ke standar** mengembalikan ke jam standar tingkat. Perubahan baru tersimpan setelah menekan *Simpan beban*.
