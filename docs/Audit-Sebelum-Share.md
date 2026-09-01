# Audit sebelum dibagikan kepada guru

Tanggal: 1 September 2026. Basis: kode lokal setelah commit a6d9712.

Audit kode semua menu utama selesai. Build produksi berhasil memakai runtime Node bawaan. Koneksi browser gagal dimulai dua kali; pengujian klik, tampilan HP, unduhan, dan cetak belum terverifikasi. Temuan berikut berasal dari kode, bukan hasil uji pengguna. Tidak ada kode aplikasi yang diubah dalam audit ini.

Prioritas: P0 = risiko kehilangan data; P1 = catatan/hasil salah atau fungsi utama terhambat; P2 = kemudahan penggunaan dan kelengkapan.

## 0. Penyimpanan dan akses

- P0: backup.restore di src/lib/web-api.ts mengosongkan seluruh tabel sebelum memeriksa struktur cadangan. JSON valid seperti {} bisa diterima sebagai pemulihan sukses dengan data kosong. Validasi format, versi, tabel, dan record sebelum transaksi; tampilkan ringkasan cadangan sebelum konfirmasi.
- P1: data hanya di IndexedDB browser; login dinonaktifkan dan tidak ada sinkronisasi HP–laptop. Onboarding sudah menyebut penyimpanan perangkat. Ulangi informasi ini pada Pengaturan dan panduan; tentukan cakupan rilis satu perangkat atau akun tersinkron.
- P1: constructor BgyDatabase di src/lib/db.ts selalu memakai nama database utama, meskipun getDemoDb memberikan nama demo. Perbaiki sebelum mengaktifkan demo; saat ini rute login/demo tidak tersedia.
- P1: cadangan memakai JSON biasa untuk file_data Uint8Array, dan restore tidak mengembalikan tipe byte array. Uji round-trip dokumen setelah mekanisme unduh tersedia.

## 1. Navigasi, header, dan dialog

- P1: Sidebar.tsx selalu w-64 (256 px), tanpa breakpoint untuk HP. Gunakan drawer di HP dan area konten min-w-0.
- P2: isOpen selalu membuka grup route aktif, sehingga grup aktif tidak bisa dilipat manual.
- P2: header memakai Admin Lokal dari auth store, bukan nama guru dari onboarding. Samakan profil dan tampilkan kelas/periode aktif.
- P2: Modal belum memiliki role dialog, aria-modal, manajemen fokus, Escape, dan label tombol tutup. Modal Kalender/Perangkat Ajar juga tidak membatasi tinggi/scroll seperti Modal bersama.
- P2: perlindungan draf belum konsisten saat menutup modal atau pindah menu. Samakan status menyimpan/tersimpan/gagal.
- Uji tertunda: 360/390/768/1366 px, nama panjang, buka/tutup menu, tombol Back, Tab/Escape, dan keyboard HP.

## 2. Onboarding

- P1: contoh tingkat 7/SMP/fase D bertentangan dengan pilihan Pengaturan yang hanya tingkat 1–6. Tentukan jenjang sasaran lalu samakan.
- P1: finish menulis guru, kelas, mapel, dan pengaturan tanpa transaksi atau catch/finally. Kegagalan dapat meninggalkan setup parsial dan status Menyimpan menetap.
- P2: validasi baru string terisi; perlu trim, tingkat valid, dan format tahun ajaran. Ikon X tidak memiliki aksi.

## 3. Dashboard

- P1: status Terlambat tidak masuk Hadir maupun Tidak hadir pada ringkasan. Samakan definisi dengan laporan.
- P1: hari jadwal lokal tetapi query presensi menggunakan todayISO berbasis UTC. Sebelum 07.00 WIB dapat mengambil data kemarin. day/dateLabel dihitung saat modul dimuat sehingga bisa usang melewati tengah malam.
- P2: daftar pekerjaan terdekat mengambil empat record pertama tanpa urut deadline.
- P2: bedakan data kosong, loading, dan gagal memuat; jangan menampilkan nol sebagai hasil final saat belum selesai.

## 4. Data Siswa / Atur Kolom / Impor

- P1: spreadsheet.ts selalu create saat impor; impor ulang menggandakan siswa. Tambahkan pratinjau dan pencocokan NIS dengan pilihan lewati/perbarui. Nama sama tidak otomatis berarti orang sama.
- P1: siswa dibuat sebelum kolom tambahan disimpan tanpa transaksi; kegagalan field dapat dilaporkan sebagai baris gagal meskipun siswa sudah tercipta.
- P1: KelolaField memuat pilihan dropdown sebagai JSON mentah lalu split koma dan stringify lagi. Edit-simpan tanpa perubahan dapat merusak pilihan. Parse ketika memuat dan gabungkan untuk input teks.
- P2: impor tidak memvalidasi kolom wajib/tipe; pesan gagal tidak menyebut nomor baris/sebab. Jelaskan bahwa baris contoh template harus diganti/dihapus.
- P2: no_absen tersedia lewat impor, tetapi tidak ada pada form manual; beberapa daftar menggunakan nomor urutan hasil sort. Pisahkan nomor absen dari nomor baris.
- P2: HP gunakan daftar ringkas dengan detail siswa untuk kolom tambahan.

## 5. Presensi

- P1: Auto Hadir default aktif dan effect menulis semua status kosong pada tanggal sekolah yang dibuka, termasuk tanggal lama. Melihat riwayat dapat menciptakan catatan baru. Jadikan pengisian massal tindakan eksplisit.
- P1: Rekap menghitung H/total, Laporan menghitung (H+T)/total. H=1,T=1 menghasilkan 50% vs 100%. Gunakan satu rumus bersama.
- P1: state status berubah sebelum simpan; saat gagal hanya toast muncul. Pertahankan tanda belum tersimpan dan retry atau rollback.
- P2: semester default Rekap 1, tidak mengikuti semester kelas jika pengaturan presensi belum tersimpan.
- P2: HP perlu nama jelas, status mudah disentuh, pencarian, dan status penyimpanan. Uji perubahan cepat serta perpindahan tanggal saat simpan berlangsung.

## 6. Penilaian

- P1: kolom terikat mapel/kelas tanpa pemisahan semester. Pengaturan hanya mengubah metadata periode; nilai lama tetap tampil dengan label semester baru. Perlu struktur periode/arsip.
- P1: Penilaian menghitung seluruh komponen harian, tetapi laporan hanya 10 pertama. Data di atas 10 komponen dari cadangan/versi lama dapat menghasilkan angka berbeda. Samakan batas dan perhitungan.
- P2: rata-rata menggunakan bobot yang nilainya tersedia. Beri label sementara/belum lengkap agar tidak dianggap nilai akhir lengkap.
- P2: loadNilai mengganti state dan menghapus dirty set saat ganti mapel; lindungi nilai yang gagal tersimpan.
- P2: HP pilih mapel/komponen lalu input per siswa; keyboard angka; bedakan kosong dan nol.

## 7. Perilaku

- P2: tersedia tambah/hapus, belum edit catatan atau memperbarui tindak lanjut.
- P2: riwayat belum memiliki filter periode/semester; gunakan kartu detail di HP.
- P2: effect pemuatan bergantung pada siswa.length. Bila kumpulan siswa berganti dengan jumlah sama, catatan berpotensi tidak diperbarui; relevan untuk dukungan multi-kelas.

## 8. Mata Pelajaran

- P1: hapus mapel membersihkan nilai/kolom tetapi meninggalkan referensi jadwal dan rencana. Utamakan nonaktif/arsip dan tentukan penanganan referensi.
- P1: batal edit hanya menutup modal; tombol Tambah tidak mereset editId/form. Pengguna dapat mengedit record lama ketika mengira sedang menambah.
- P2: teks menyebut Proyek Kokurikuler tetapi tidak ada route/menu tersebut.
- P2: validasi nama/kode duplikat, label aksesibel switch aktif, dan tampilan HP.

## 9. Jadwal

- P1: defaultTime memberi jam bertingkat, tetapi setCell menyimpan 07:00–07:35 pada slot baru tanpa pengaturan. Jam kedua dapat tampak 07:40 lalu tersimpan 07:00. Gunakan satu sumber default.
- P1: handleCell menyebarkan key mulai/selesai, tetapi form memakai jam_mulai/jam_selesai. Map field secara eksplisit.
- P1: impor selalu menambah; tidak ada keunikan kelas/hari/jam. Impor ulang menggandakan slot.
- P2: validasi akhir setelah mulai, batas slot, dan benturan istirahat. Uji pengurangan jumlah jam/hari agar record tersembunyi tidak masih muncul di fitur lain.
- P2: HP agenda per hari; desktop dapat mempertahankan tampilan mingguan.

## 10. Rencana Mengajar

- P1: createJournal selalu menambah record. Klik Buat Draft berulang dapat menggandakan jurnal pada slot sama. Buka/perbarui jurnal yang sudah ada.
- P2: rencana dicocokkan tanggal/mapel tanpa slot. Dua sesi mapel sama berbagi rencana; mapel custom tanpa ID dapat berbagi rencana juga. Tegaskan rencana per hari/mapel atau per sesi.
- P2: HP daftar per hari, ringkasan topik/status, form satu kolom, dan perlindungan draf.

## 11. Jurnal Harian

- P1: quickSave/quickWeeklySave tidak menangani error/retry, berbeda dari form utama.
- P2: perlu uji cepat dua sel slot baru: sebelum load selesai, dua save bisa sama-sama create tanpa id. Gunakan upsert slot dan antrean penyimpanan.
- P2: export Word memasukkan teks langsung ke HTML; escape karakter markup agar dokumen tidak berubah struktur.
- P2: PDF memakai window.print dan jurnal belum memiliki aturan cetak sendiri. Uji sidebar/tombol tidak ikut, paragraf panjang, dan halaman lanjutan.
- P2: urutan jam bulanan memakai string, sehingga jam 10 bisa muncul sebelum jam 2.

## 12. Kalender Akademik

- P1: periode bawaan tetap 2026/2027, bukan dari tahun ajaran aktif; default Presensi sama. Turunkan dari kelas aktif.
- P2: akhir sebelum mulai bisa disimpan; validasi kegiatan dan semester.
- P2: daftar belum diurutkan tanggal; tambahkan filter bulan/agenda. Jelaskan hari efektif hanya memperhitungkan libur yang sudah dimasukkan.

## 13. Perangkat Ajar

- P1: Dokumen Saya bisa upload dan hapus, tetapi belum ada buka/unduh. Ini memutus kegunaan utama penyimpanan dokumen.
- P2: Dokumen Resmi seluruhnya placeholder. Jadikan Dokumen Saya tab awal atau sembunyikan katalog sampai berisi.
- P2: upload belum menangani pembatalan/error secara lengkap; tambahkan informasi ukuran/jenis, batas ukuran, dan hasil gagal simpan.

## 14. Tugas Saya

- P2: disebut pengingat, tetapi belum ada notifikasi; jelaskan tugas terlihat saat membuka aplikasi.
- P2: ringkasan Terlambat belum memiliki filter khusus; kartu bisa membuka filter yang sesuai.
- P2: simpan belum punya loading/error guard; cegah submit ganda.
- P2: HP rapikan judul/tombol Tambah dan area sentuh checkbox.

## 15. Laporan

- P1: filter tanggal terlihat namun diabaikan pada Nilai, sementara ekspor tetap menuliskan periode pilihan. Hubungkan ke periode akademik atau hilangkan filter yang tidak berlaku.
- P1: samakan hasil dengan Presensi/Penilaian untuk siswa dan periode yang sama.
- P2: filter Kalender hanya memeriksa tanggal mulai; kegiatan lintas batas periode dapat hilang. Gunakan irisan rentang.
- P2: header Excel berasal dari property internal seperti siswa_nama. Gunakan label guru, lebar kolom, dan kop yang rapi.
- P2: cetak 2+ halaman belum terverifikasi; periksa wrapper tinggi layar/overflow, kepala tabel, periode, dan teks panjang.

## 16. Pengaturan

- P0/P1: utamakan pemulihan aman dan arsip/periode baru; mengganti metadata saja tidak memisahkan data akademik.
- P2: tampilkan lokasi penyimpanan, waktu cadangan terakhir, panduan pindah perangkat, dan bantuan.
- P2: konsistenkan loading/error ketika simpan profil/kelas; pertahankan isian saat gagal.

## Urutan perbaikan

1. Restore, tanggal lokal, pemisahan periode nilai.
2. Auto Hadir dan kesamaan hasil rekap/laporan.
3. Waktu jadwal, impor duplikat, dropdown tambahan, dan reset form mapel.
4. Navigasi HP, lalu Presensi, Jurnal, Jadwal, Data Siswa.
5. Dokumen, ekspor, error/simpan, dan panduan penggunaan.
6. Uji data contoh desktop/HP, kemudian uji terbatas bersama guru.

## Checklist penerimaan — belum dijalankan

- [ ] Setup baru sampai 35 siswa; nama panjang, NIS nol awal, field wajib.
- [ ] Impor ulang tidak menggandakan record; error menyebut baris dan sebab.
- [ ] Edit dropdown tanpa mengubah pilihan tetap mempertahankan pilihan asli.
- [ ] Batal edit mapel lalu Tambah membuat record baru.
- [ ] Melihat tanggal lama tidak menulis presensi tanpa tindakan eksplisit.
- [ ] H=1,T=1 konsisten pada semua ringkasan/rekap/laporan.
- [ ] Tanggal sebelum 07.00 WIB benar; uji WITA/WIT dan lintas tengah malam.
- [ ] Semester baru tidak mencampurkan nilai periode sebelumnya.
- [ ] Jam jadwal yang terlihat sama dengan yang tersimpan; impor tidak ganda.
- [ ] Buat Jurnal berulang tidak menciptakan duplikat slot.
- [ ] Gagal simpan dapat dikenali dan dicoba ulang.
- [ ] Restore cadangan valid memulihkan data/dokumen; JSON {} ditolak tanpa mengubah data.
- [ ] Data bertahan setelah browser ditutup dan dibuka lagi.
- [ ] Dokumen upload dapat dibuka/diunduh dengan byte yang sama.
- [ ] Semua menu layak di 360/390 px; keyboard tidak menutupi field/tombol penting.
- [ ] Tab/Escape dan label tombol ikon bisa digunakan.
- [ ] Excel/cetak sama dengan periode dan angka di layar; seluruh halaman utuh.
- [ ] Guru memahami penyimpanan lokal, cadangan, dan batas fitur rilis pertama.

## Pembaruan pengerjaan — pengamanan penyimpanan lokal

Selesai pada tahap pertama:
- Validasi struktur/tabel/record dan versi cadangan sebelum konfirmasi atau transaksi tulis.
- Menolak JSON kosong, cadangan tidak lengkap, kunci ganda, serta byte dokumen rusak.
- Pemulihan hanya berjalan setelah ringkasan isi dan konfirmasi; perubahan seluruh tabel berada dalam satu transaksi.
- Membaca cadangan lama dan memulihkan Uint8Array; ekspor baru memiliki format dan versi.
- Memisahkan nama database demo dari database utama.
- Petunjuk data lokal dan pindah perangkat, status proses/error, serta penanganan batal pilih file.

Validasi: 11 tes otomatis lulus untuk format, byte dokumen, pembatalan, dan batas transaksi. Tes transaksi memakai adapter terisolasi, bukan IndexedDB browser nyata. Pengujian browser/HP dan unduhan nyata masih tertunda. Temuan menu lain tetap terbuka.

## Pembaruan 2 September 2026 — tanggal dan presensi

- Tanggal hari ini mengikuti kalender lokal; helper JavaScript mengacu ke helper TypeScript yang sama.
- Dashboard memperbarui tanggal saat kembali fokus dan setiap 30 detik, menghitung Terlambat sebagai Hadir, serta mengecualikan siswa yang tidak lagi aktif dari hitungan presensi.
- Membuka tanggal hanya membaca data. Pengisian massal memakai tombol eksplisit dan konfirmasi jumlah siswa/tanggal; status yang ada tidak ditimpa.
- Perubahan status ditampilkan setelah simpan berhasil. Kegagalan menampilkan pesan menetap dan mengembalikan keterangan sebelumnya.
- Penyimpanan massal berada dalam satu transaksi; kontrol dinonaktifkan saat menyimpan. Respons pemuatan tanggal lama diabaikan setelah berpindah tanggal.
- Rumus persentase Rekap dan Laporan disatukan: (Hadir + Terlambat) / hari tercatat. Belum ada data ditampilkan sebagai tanda pisah.
- Semester Rekap mengikuti kelas; periode bawaan Presensi mengikuti tahun ajaran kelas. Rentang tanggal pengaturan divalidasi.

Validasi: 18 tes lulus (7 tes tanggal/presensi dan 11 tes cadangan); zona WIB, WITA, WIT, pergantian tahun, serta zona barat UTC dicakup. Build produksi berhasil. Uji interaksi browser/HP, kegagalan IndexedDB nyata, dan perpindahan fokus saat mengetik masih perlu dilakukan. Pemisahan nilai per semester dan temuan menu lain belum dikerjakan.

## Pembaruan 2 September 2026 — pemisahan nilai per periode

- Komponen nilai memiliki penanda tahun ajaran dan semester; ID komponen/nilai lama dipertahankan.
- Data lama tanpa penanda ditempatkan pada periode kelas yang tersimpan saat pertama diproses. Sistem tidak bisa menyimpulkan semester historis yang dahulu sudah tercampur; penempatan awal ini dijelaskan di Pengaturan.
- Migrasi dilakukan secara transaksional sebelum pergantian periode dan ketika nilai pertama dibaca. Cadangan lama tetap dimigrasikan menggunakan kelas yang ikut dipulihkan.
- Bobot lama disalin ke periode awal satu kali; periode baru mempunyai bobot sendiri. Memilih kembali periode lama di Pengaturan membuka nilai dan bobotnya kembali.
- API nilai dan komponen memfilter periode aktif, menolak edit/hapus/simpan pada kolom periode lain, serta mencegah duplikasi UTS/UAS dari permintaan bersamaan.
- Penilaian dan Laporan memakai rumus bersama, mencakup seluruh komponen harian, mempertahankan nilai nol, dan menandai hasil belum lengkap dengan tanda bintang.
- Filter tanggal yang tidak berlaku pada laporan Nilai diganti keterangan periode aktif. Ekspor mencantumkan tahun ajaran/semester yang digunakan.
- Pergantian periode tidak membuat roster siswa atau jadwal baru. Arsip roster historis dan pengelolaan kenaikan kelas masih merupakan pekerjaan terpisah.

Validasi: 25 tes lulus. Tujuh tes periode memakai Dexie dengan fake-indexeddb terisolasi, termasuk pindah semester/tahun dan kembali, migrasi berulang, cadangan lama/baru, bobot, penolakan edit lintas periode, serta permintaan UTS bersamaan. Dependensi fake-indexeddb berada di folder sementara wkelas-grade-tests; petunjuk ada pada tests/grade-periods.test.mjs. Build produksi berhasil. Uji klik browser/HP masih tertunda.

## Pembaruan 2 September 2026 — jadwal dan impor ganda

- Impor siswa sekarang memiliki tahap pratinjau sebelum penyimpanan, hasil ditambahkan/dilewati/gagal, serta alasan per baris.
- NIS yang sudah ada dilewati tanpa menimpa data. Nama sama tanpa NIS yang dapat membedakan siswa ditandai untuk pemeriksaan; nama sama dengan NIS berbeda tetap boleh.
- Impor memvalidasi nama, JK, nomor absen, field wajib, angka, tanggal, dan pilihan dropdown. Siswa serta field tambahannya disimpan dalam satu transaksi per baris.
- Pembacaan Excel mempertahankan format sel NIS termasuk nol awal jika tersimpan sebagai teks atau memakai format angka yang sesuai. Nol yang sudah hilang dari file sumber tidak dapat direkonstruksi.
- Template siswa tidak lagi memasukkan siswa contoh ke sheet data; petunjuk ditempatkan pada sheet terpisah.
- Waktu jadwal menggunakan helper yang sama pada tampilan dan penyimpanan; slot kedua default 07:40–08:15. Sel waktu numerik Excel didukung.
- Penyimpanan jadwal menolak slot ganda, waktu terbalik/bertabrakan, hari/jam di luar pengaturan, serta slot istirahat. Impor ulang melewati slot terisi tanpa mengganti data lama.
- Perubahan waktu baris disimpan untuk seluruh hari dalam satu transaksi. Nama mapel custom tetap terlihat dan Detail membuka form yang sudah diperbaiki.
- Pengaturan hari/jam memakai draf terpisah sehingga Batal tidak mengubah tampilan aktif. Pengurangan batas ditolak jika masih ada record jadwal di luar batas baru.
- Data duplikat yang sudah ada sebelumnya tidak dihapus otomatis. Penggabungan/perapian data historis tetap perlu keputusan pengguna.

Validasi: 36 tes lulus, termasuk 11 tes baru impor/jadwal dengan Dexie dan IndexedDB tiruan: impor ulang/paralel, NIS nol awal, nama sama, rollback field tambahan, benturan waktu, slot istirahat, dan waktu lintas hari. Build produksi berhasil. Pemeriksaan klik dan tampilan HP tetap belum dilakukan.

## Pembaruan 2 September 2026 — dropdown dan form mapel

- Editor pilihan dropdown memakai satu pilihan per baris. JSON dibaca saat edit dan ditulis kembali saat simpan; koma/tanda kutip dalam pilihan tetap utuh.
- Pilihan kosong/berulang ditolak. JSON tersimpan yang rusak ditolak saat edit, tanpa menimpanya dengan daftar kosong.
- Form siswa tidak crash saat pilihan tersimpan rusak; nilai siswa yang tidak lagi ada dalam daftar tetap terlihat sebagai pilihan lama.
- Memilih Edit kolom yang sama berulang kali tetap memuat data yang benar. Error simpan/hapus ditampilkan dan perubahan form diblokir selama penyimpanan.
- Tambah mapel dan tutup modal mereset editId/isian. Nama kosong serta nama/kode duplikat ditolak di form mapel; simpan ganda diblokir, dan isian dipertahankan ketika gagal.
- Switch mapel memiliki status/label aksesibel; teks tentang menu Proyek Kokurikuler yang belum tersedia dihapus.

Validasi: 4 tes dropdown baru lulus, termasuk round-trip koma/tanda kutip, newline Windows, pilihan berulang, dan JSON rusak. Build produksi berhasil; diff check bersih. Uji klik form/browser/HP belum dilakukan. Tes regresi 36 kasus tahap sebelumnya tidak diulang karena perubahan terbatas pada editor dan form ini.

## Pembaruan 2 September 2026 — navigasi dan layout HP

- Di bawah 1024 px sidebar tetap diganti menu dialog dari sisi kiri; konten mendapat lebar penuh.
- Navigasi bawah menyediakan Beranda, Presensi, Jurnal, dan Menu dengan safe-area bawah perangkat.
- Menu memakai dialog native untuk fokus modal/Escape, tombol tutup, klik backdrop, dan penutupan setelah memilih route. Beralih ke layar desktop menutup dialog.
- Grup sidebar aktif kini dapat dilipat manual. Identitas panel menggunakan ID unik pada instance desktop dan HP.
- Layout memakai tinggi viewport dinamis, min-width/min-height fleksibel, dan area scroll konten sendiri. Header tidak lagi berada di atas modal biasa.
- Ukuran field di HP menjadi 16 px; tombol tutup modal lebih besar, footer tombol membungkus, dan tinggi modal mengikuti viewport dinamis.
- Navigasi bawah dikecualikan dari cetak; preferensi reduced-motion dihormati.

Validasi: build produksi berhasil dan diff check bersih. Percobaan Browser kembali gagal sebelum koneksi, dengan error lingkungan sandbox setup refresh. Interaksi/fokus native dialog, screenshot ukuran 360/390 px, dan keyboard HP belum diverifikasi langsung. Tampilan khusus tiap halaman (misalnya agenda jadwal per hari dan kartu penilaian) masih merupakan tahap terpisah.


### Perapian Presensi dan Jadwal untuk HP

- Presensi: navigasi tanggal dipisah dari input tanggal, toolbar dapat turun baris, nama siswa membungkus, status memiliki target sentuh minimal 44px dan penanda pilihan aksesibel.
- Rekap semester menggunakan kartu per siswa pada layar kecil; tabel tetap tersedia pada desktop.
- Jadwal menggunakan agenda per hari di bawah 1024px, termasuk slot kosong, guru/ruang, edit pelajaran, pengaturan waktu seluruh hari, serta pengaturan istirahat.
- Editor waktu menyimpan mulai dan selesai bersama melalui transaksi yang sudah ada, menampilkan kesalahan dan mencegah simpan ganda. Form pelajaran dapat digulir pada layar pendek.
- Verifikasi: build produksi berhasil. Pemeriksaan visual dan interaksi browser belum dilakukan karena runtime browser gagal dijalankan di lingkungan ini; perlu pengecekan pada HP sebelum dibagikan.


### Perapian Jurnal dan Penilaian untuk HP

- Jurnal mingguan dan laporan bulanan ditampilkan sebagai kartu pada layar di bawah 1024px. Isi/edit membuka formulir lengkap dengan tombol Simpan Jurnal, pengunci simpan ganda, dan pesan gagal yang mempertahankan isian. Tabel tetap tersedia pada desktop dan cetak.
- Navigasi minggu memiliki tombol 44px; periode laporan dapat turun baris; pengosongan input bulan tidak lagi membuat tanggal laporan tidak valid. Penanggalan minggu memakai tanggal lokal.
- Penilaian HP menampilkan satu komponen yang dapat dipilih, input nilai per siswa, status penyimpanan, nilai akhir, serta edit/hapus komponen. Pencarian dan tombol simpan perubahan tetap tersedia; formulir mapel disusun vertikal pada layar kecil.
- Verifikasi: build produksi berhasil, 7 pengujian periode/perhitungan nilai lulus, diff check tanpa kesalahan whitespace. Browser pengujian belum tersedia, sehingga tata letak dan interaksi HP belum diverifikasi secara visual.
- Audit belum selesai: penyimpanan cepat Jurnal desktop dan alur modal bersama tetap memerlukan pemeriksaan lanjutan.


### Perapian Data Siswa dan Laporan untuk HP

- Data Siswa memakai kartu di bawah 1024px dengan NIS, jenis kelamin, nomor absen, data tambahan yang dapat dibuka, serta tombol edit/hapus berlabel. Filter, pencarian, dan pengurutan tetap berlaku; tersedia reset saat hasil kosong.
- Input formulir siswa memakai ukuran teks 16px di HP dan label aksesibel. Tabel desktop diperbaiki jumlah kolom pada status kosong/loading.
- Kelima jenis laporan memakai kartu berlabel di HP. Tab dapat digeser; tanggal dan tombol ekspor dapat turun baris. Cetak tetap menggunakan tabel.
- Laporan menampilkan status pemuatan/gagal, menolak rentang tanggal terbalik, menonaktifkan ekspor saat data belum siap, serta mengabaikan hasil pemuatan tab lama setelah berpindah tab.
- Verifikasi: build produksi berhasil; diff check tanpa kesalahan whitespace. Tampilan HP, alur interaksi, dan hasil cetak belum diverifikasi melalui browser karena runtime pengujian masih terkendala.


### Perapian Perilaku dan Kalender untuk HP

- Perilaku: navigasi tanggal dipisah dari pemilih tanggal, nama siswa dapat membungkus, tombol kategori minimal 44px, label input diperjelas, dan hasil pencarian kosong diberi penjelasan. Riwayat memakai kartu di bawah 1024px dengan tanggal, jenis, deskripsi, tindak lanjut, dan tombol hapus.
- Kalender: judul/tanggal kegiatan dipisah, tombol Edit/Hapus berlabel dan lebih besar, teks panjang membungkus, toolbar periode dapat turun baris. Form kegiatan memakai satu kolom tanggal pada HP, input 16px, serta batas tinggi dan gulir.
- Verifikasi: build produksi berhasil; diff check tanpa kesalahan whitespace. Pemeriksaan visual dan interaksi HP belum dilakukan karena runtime browser pengujian terkendala.
- Temuan untuk tahap fungsi berikutnya: Kalender belum memvalidasi tanggal terbalik dan belum menangani kegagalan simpan secara memadai. Pemuatan Perilaku masih bergantung pada jumlah siswa sehingga perlu diperiksa saat berpindah kelas dengan jumlah siswa sama.


### Validasi Kalender dan pergantian kelas Perilaku

- Kalender menolak tanggal kosong/tidak nyata, rentang terbalik, dan judul kosong sebelum penulisan database. Edit memeriksa keberadaan kegiatan dan kelasnya. Periode disimpan secara transaksional tanpa menimpa pengaturan semester lain.
- Form tetap terbuka dengan pesan saat simpan gagal. Pengunci mencegah simpan ganda; kegagalan refresh setelah berhasil simpan dilaporkan berbeda agar pengguna tidak mengulang penambahan. Hapus dan pemuatan awal juga memiliki pesan kesalahan. Tanggal awal semester mengikuti tahun ajaran kelas.
- Kalender dan Perilaku memiliki state halaman terpisah per kelas. Perilaku memuat ulang berdasarkan daftar siswa lengkap, mengosongkan catatan saat daftar kosong, dan mengabaikan respons pemuatan yang sudah kedaluwarsa.
- Verifikasi: build berhasil, 4 tes database Kalender lulus (tanggal invalid, edit mempertahankan data lama, periode, simulasi kegagalan tulis); diff check bersih. Pergantian kelas dan kegagalan simpan di UI belum diuji melalui browser karena kendala runtime.


### Penyimpanan cepat Jurnal dan dialog bersama

- Input cepat hanya memperbarui kolom yang diubah. Transaksi membaca jurnal terbaru dan membuat satu jurnal untuk slot kelas/tanggal/jam; slot lama yang memiliki beberapa jurnal ditolak dengan pesan agar diedit lewat laporan bulanan.
- Antrean penyimpanan menjaga urutan input. Draft terkontrol mempertahankan isian ketika rerender atau simpan gagal; status tertunda dan pesan kegagalan ditampilkan. Hasil simpan memperbarui daftar tanpa memuat ulang seluruh halaman. State Jurnal dipisahkan per kelas.
- Modal dan ConfirmDialog memakai dialog native dengan judul aksesibel, pengelolaan fokus bawaan browser, Escape melalui callback penutupan, serta tombol Batal sebagai fokus awal konfirmasi. Penutupan saat sibuk tetap mengikuti callback masing-masing halaman.
- Verifikasi: build berhasil, 4 tes database Jurnal lulus (simpan bersamaan, patch kolom, duplikat lama, kegagalan dan retry), diff check bersih. Fokus, Escape, dialog bertumpuk, dan interaksi input langsung belum diverifikasi di browser karena kendala runtime.


### Dokumen dan Rencana Mengajar

- Dokumen Saya memiliki pemilih berkas langsung, unduhan byte tersimpan, tombol hapus berlabel, tampilan kartu HP, dan pesan kegagalan. Formulir memakai Modal bersama dan mencegah simpan ganda. Dokumen resmi diberi penjelasan belum tersedia.
- Rencana memiliki navigasi minggu/tanggal yang tidak berdesakan, kartu kosong lebih ringkas, state per kelas, dan pengunci tindakan selama penyimpanan. Kesalahan ditampilkan di dalam formulir.
- Pembuatan draft jurnal menolak slot kelas/tanggal/jam yang sudah memiliki jurnal secara transaksional, tanpa menimpa isi jurnal lama.
- Verifikasi: build berhasil; tes penyimpanan jurnal mencakup pembuatan draft berulang/bersamaan. Unduhan file, pemilih berkas, dan interaksi HP belum diverifikasi langsung di browser.


### To-Do, Pengaturan, dan kesiapan berbagi

- To-Do: target sentuh dan label tombol diperbesar, tab dibatasi lebar layar, teks panjang membungkus, formulir tanggal satu kolom di HP. Simpan/hapus/toggle memiliki pengunci dan pesan kegagalan; draft tetap tersedia. Hari ini diperbarui saat fokus dan pergantian hari.
- Pengaturan: tab dapat digeser tanpa melebar keluar halaman, state dipisah per kelas, formulir dikunci saat memuat/menyimpan, dan kegagalan profil/periode ditampilkan pada halaman.
- Verifikasi gabungan: build produksi berhasil; seluruh 49 tes tersedia lulus; diff check tanpa kesalahan whitespace. Tes belum mencakup interaksi browser, tampilan HP nyata, unduhan, hasil cetak, atau semua formulir.

**Status: belum dinyatakan siap rilis umum.** Banyak perbaikan UI dan penyimpanan sudah selesai, tetapi pemeriksaan langsung HP/desktop masih tertunda karena runtime browser tidak berjalan. Perubahan audit masih lokal, belum dipush pada rangkaian ini.

Sisa prioritas sebelum berbagi luas:
1. Hapus mapel masih perlu penanganan referensi jadwal/rencana.
2. Nilai yang gagal disimpan perlu dilindungi saat berganti mapel.
3. Ekspor Word Jurnal perlu escape teks; tata cetak dan unduhan perlu diuji.
4. Tentukan apakah rencana per hari/mapel atau per sesi, khususnya mapel custom dan sesi berulang.
5. Uji nyata alur tambah/edit, pergantian kelas, keyboard/dialog, backup-pulihkan, unduh dokumen, dan cetak pada HP serta desktop.


### Hapus mapel dan perlindungan nilai

- Penghapusan mapel ditolak bila masih direferensikan jadwal/rencana, dengan jumlah referensi pada pesan. Penghapusan kolom/nilai semua periode dan mapel tanpa referensi berlangsung dalam satu transaksi.
- Pergantian mapel melalui pemilih maupun setelah menambah mapel ditahan bila draft nilai belum tersimpan. Draft tidak dihapus oleh pemuatan ulang nilai. Simpan per sel diantrekan dan memakai revisi agar respons lama tidak menghapus tanda perubahan yang lebih baru; simpan sebagian gagal mempertahankan sel yang gagal.
- Penghapusan komponen/mapel melalui Penilaian juga ditahan saat draft belum disimpan. Perlindungan ini belum mencakup berpindah halaman, menutup browser, atau berganti kelas.
- Build berhasil; tes database penghapusan mencakup referensi jadwal/rencana, isolasi data mapel lain, serta rollback kegagalan. Interaksi pergantian mapel dan retry belum diuji langsung di browser.


### Ekspor Word dan tata cetak Jurnal

- Semua teks identitas/isi jurnal di-escape sebelum menjadi HTML. Baris baru dipertahankan, nilai nol tidak hilang, dan urutan jam memakai perbandingan numerik.
- Cetak memakai laporan bulanan khusus berisi teks lengkap, identitas, bulan dan tabel, bukan input/textarea. CSS mengatur A4 landscape, menyembunyikan navigasi/kontrol, mengulang header tabel dan membungkus teks panjang.
- Tombol ekspor/cetak ditahan selama draft input cepat belum tersimpan. Ekspor Word masih berupa HTML berakhiran .doc seperti sebelumnya, bukan DOCX native.
- Build berhasil; 3 tes laporan lulus untuk escaping, baris baru/teks panjang/nol, dan urutan jam. Hasil halaman cetak serta pembukaan berkas di Word belum diverifikasi langsung karena browser/aplikasi pengujian belum tersedia.


### Perlindungan keluar halaman untuk draft nilai dan input cepat Jurnal

- Router memakai data hash router agar perpindahan route termasuk Back dapat dibatalkan. Registry draft memeriksa nilai Penilaian dan input cepat Jurnal. Draft belum tersimpan meminta konfirmasi buang; proses simpan aktif menahan perpindahan.
- Setter kelas memeriksa registry yang sama. Setelah pengguna mengizinkan berganti kelas, state Penilaian dipisahkan per kelas sehingga draft tidak tercampur.
- beforeunload didaftarkan untuk memberi peringatan bawaan browser ketika reload/menutup tab. Browser dapat membatasi peringatan ini, terutama saat aplikasi HP dihentikan paksa; draft belum disimpan otomatis ke penyimpanan tahan-reload.
- Cakupan belum meliputi semua formulir lain atau perubahan tab internal. Build berhasil; pengujian keputusan registry tersedia. Perilaku Back, dialog konfirmasi, dan tutup tab belum terverifikasi langsung di browser.
