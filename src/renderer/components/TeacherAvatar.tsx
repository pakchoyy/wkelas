import { initials, type AvatarKind } from '../../shared/avatar'

// Ilustrasi sederhana (SVG) agar tajam di semua layar dan tidak bergantung emoji HP.
export default function TeacherAvatar({ kind, name, size = 32 }: { kind: AvatarKind; name?: string | null; size?: number }) {
  if (kind === 'inisial') return <span aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.38 }} className="grid shrink-0 place-items-center rounded-full bg-amber-100 font-black text-amber-800">{initials(name)}</span>
  const skin = '#F2C9A0'
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0 rounded-full">
    <circle cx="32" cy="32" r="32" fill={kind === 'pak' ? '#CCFBF1' : '#FCE7F3'} />
    {kind === 'bu-hijab' && <path d="M12 64c0-16 6-38 20-38s20 22 20 38z" fill="#0F766E" />}
    <path d="M14 64c2-10 9-15 18-15s16 5 18 15z" fill={kind === 'pak' ? '#1E3A8A' : '#BE185D'} />
    {kind === 'pak' && <path d="M28 49h8l-4 9z" fill="#F8FAFC" />}
    {kind === 'bu-hijab'
      ? <><path d="M17 33c0-10 7-17 15-17s15 7 15 17v12c-4 5-9 7-15 7s-11-2-15-7z" fill="#14B8A6" /><ellipse cx="32" cy="33" rx="9" ry="10.5" fill={skin} /></>
      : <>
          {kind === 'bu' && <path d="M19 34c0-12 6-19 13-19s13 7 13 19v12h-6V30H25v16h-6z" fill="#3F2A1D" />}
          <ellipse cx="32" cy="31" rx="10" ry="11.5" fill={skin} />
          {kind === 'pak' ? <path d="M21 28c0-8 5-12 11-12s11 4 11 12c-3-4-7-5-11-5s-8 1-11 5z" fill="#1F2937" /> : <path d="M22 28c1-7 5-11 10-11s9 4 10 11c-4-3-7-6-10-6s-6 3-10 6z" fill="#3F2A1D" />}
        </>}
    <circle cx="28" cy="32" r="1.4" fill="#1F2937" /><circle cx="36" cy="32" r="1.4" fill="#1F2937" />
    <path d="M28.5 37c2 1.6 5 1.6 7 0" stroke="#9A3412" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
}
