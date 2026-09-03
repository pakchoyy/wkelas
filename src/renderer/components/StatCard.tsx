import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  detail?: string
  value: number | string
  icon: LucideIcon
}

export default function StatCard({ label, detail, value, icon: Icon }: Props) {
  return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-xs font-semibold leading-relaxed text-slate-600">{label}</span>
      <Icon size={18} aria-hidden="true" className="shrink-0 text-slate-500"/>
    </div>
    <div className="text-2xl leading-[1.2] font-bold tracking-tight tabular-nums">{value}</div>
    {detail && <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>}
  </div>
}
