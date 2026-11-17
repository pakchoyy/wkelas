// Satu-satunya tempat nomor WhatsApp kontak/admin. Format wa.me: kode negara 62, tanpa 0 dan tanpa tanda.
// Ganti di sini saja; semua tombol WhatsApp aplikasi dan halaman klaim Pro ikut berubah.
export const WHATSAPP_NUMBER = '6285600410357'

export function whatsappUrl(text?: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// Tampilan lokal: 6285600410357 -> 0856-0041-0357
export function whatsappDisplay(): string {
  const local = `0${WHATSAPP_NUMBER.replace(/^62/, '')}`
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3')
}
