export type BgyProduct = {
  id: string
  name: string
  description: string
  promoText: string
  action: string
  href: string
}

export const BGY_PRODUCTS: BgyProduct[] = [
  { id: 'presiswa', name: 'Presiswa', description: 'Presensi yang diisi guru dengan pengaturan dan akses yang lebih fleksibel.', promoText: 'Presensi lebih fleksibel', action: 'Coba', href: 'https://presiswa.bantuguruyuk.web.id/' },
  { id: 'soal', name: 'Pembuat Soal AI', description: 'Bantu menyusun soal sesuai kebutuhan pembelajaran.', promoText: 'Buat soal dengan AI', action: 'Buka', href: 'https://www.bantuguruyuk.web.id/soal' },
  { id: 'lkpd', name: 'Prompt LKPD', description: 'Buat prompt terarah untuk menyusun LKPD.', promoText: 'Buat prompt LKPD', action: 'Coba', href: 'https://www.bantuguruyuk.web.id/lkpd' },
  { id: 'modul', name: 'Prompt Modul Ajar', description: 'Buat prompt modul ajar sesuai konteks kelas.', promoText: 'Buat prompt modul ajar', action: 'Mulai', href: 'https://www.bantuguruyuk.web.id/modul-ajar' },
  { id: 'game', name: 'Prompt Game Edukatif', description: 'Susun ide dan prompt game untuk pembelajaran.', promoText: 'Buat prompt game edukatif', action: 'Buka', href: 'https://bmedia.bantuguruyuk.web.id/buat' },
  { id: 'kokurikuler', name: 'Prompt Kokurikuler', description: 'Bantu merancang kegiatan kokurikuler yang relevan.', promoText: 'Buat prompt kokurikuler', action: 'Coba', href: 'https://www.bantuguruyuk.web.id/kokurikuler' },
  { id: 'katrol', name: 'Katrol Nilai', description: 'Sesuaikan nilai secara lebih cepat dengan kontrol guru.', promoText: 'Katrol nilai otomatis', action: 'Mulai', href: 'https://www.bantuguruyuk.web.id/katrol-nilai' },
  { id: 'tp', name: 'Draft Tujuan Pembelajaran', description: 'Bantu membuat rancangan awal tujuan pembelajaran.', promoText: 'Susun draft TP', action: 'Buka', href: 'https://www.bantuguruyuk.web.id/?tool=draft-tp' },
]
