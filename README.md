# Jadwal MTs — Frontend

Aplikasi web penyusun **jadwal pelajaran** dan **jadwal piket guru** untuk madrasah (MTs).
Frontend statis (HTML/CSS/vanilla JS) untuk **GitHub Pages**; backend berupa **Google Apps Script** (REST API JSON) dengan Google Sheets sebagai database.

- Siswa/umum: lihat jadwal kelas, jadwal guru, dan piket tanpa login (setelah dipublikasikan), cetak/unduh PDF.
- Guru: lihat jadwal pribadi & piket, atur jam tidak bisa mengajar.
- Admin / Super Admin: master data, pengaturan waktu, susun otomatis + manual dengan deteksi bentrok, piket, dasbor + insight, publikasi, ekspor, akun.

Pasang mengikuti **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**. Satu-satunya berkas yang diedit: `js/config.js` (`GAS_URL`).
