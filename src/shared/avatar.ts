// Avatar profil guru. Pilihan disimpan di tabel pengaturan (ikut sinkron cloud untuk Pro).
export type AvatarChoice = 'auto' | 'pak' | 'bu' | 'bu-hijab' | 'inisial'
export type AvatarKind = Exclude<AvatarChoice, 'auto'>
export const AVATAR_KEY = 'avatar_profil'

const FEMALE_TITLE = /^(bu|ibu|hj|hajah|hajjah|ny|nyonya|umi|ummi)\b/i
const MALE_TITLE = /^(pak|bapak|bpk|h|haji|kh|ust|ustadz|ustaz|kyai|kiai|gus)\b/i
const FEMALE_FIRST = /^(siti|sri|dewi|nur(ul)?|ani|ana|rina|rini|ratna|yuli|lina|tri|wulan|indah|fitri|putri|ayu|dian|eka|endah|erna|evi|ika|ina|lestari|maya|mega|nia|novi|nurul|puji|retno|rika|rosa|sari|septi|suci|susi|tika|tuti|umi|wati|yanti|yeni|yuni|anisa|annisa|aisyah|fatimah|khadijah|zahra|nadia|nabila)/i
const MALE_FIRST = /^(muhammad|muhamad|moh|mohammad|mochamad|m|ahmad|achmad|abdul|abd|agus|budi|bambang|dedi|deni|eko|faisal|fajar|hadi|hendra|imam|joko|rudi|rizki|rizky|slamet|sugeng|teguh|wahyu|yusuf|arif|andi|anton|bayu|dimas|doni|edi|fikri|hasan|husein|ilham|iwan|kurniawan|nanang|rahmat|ridwan|samsul|syaiful|taufik|udin|zainal|choir|khoir|khairul|choiruddin)/i
const FEMALE_END = /(wati|ningsih|yanti|ningrum|nengsih|astuti|lestari|ningtyas|sari)$/i

// Tebakan dari nama: gelar dulu, lalu nama depan, lalu akhiran nama. Ragu = inisial.
export function guessAvatar(name: string | null | undefined): AvatarKind {
  const clean = String(name || '').trim().replace(/[.,]/g, ' ').replace(/\s+/g, ' ')
  if (!clean) return 'inisial'
  if (FEMALE_TITLE.test(clean)) return 'bu-hijab'
  if (MALE_TITLE.test(clean)) return 'pak'
  const words = clean.split(' ').filter(w => !/^(s|m|dr|drs|dra|ir|pd|si|sos|kom|ag|hum|gr)$/i.test(w))
  const first = words[0] || ''
  if (MALE_FIRST.test(first)) return 'pak'
  if (FEMALE_FIRST.test(first)) return 'bu-hijab'
  if (words.some(w => FEMALE_END.test(w) && w.length > 4)) return 'bu-hijab'
  return 'inisial'
}

export function resolveAvatar(choice: string | null | undefined, name: string | null | undefined): AvatarKind {
  return choice === 'pak' || choice === 'bu' || choice === 'bu-hijab' || choice === 'inisial' ? choice : guessAvatar(name)
}

export function initials(name: string | null | undefined): string {
  const words = String(name || '').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(w => w.length > 1 && !/^(pak|bapak|bu|ibu|hj|h)$/i.test(w))
  return (words.slice(0, 2).map(w => w[0]).join('') || 'G').toUpperCase()
}
