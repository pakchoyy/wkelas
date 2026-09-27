type Task = { status?: string | null; deadline?: string | null; deleted_at?: string | null }

export function reminderSummary(tasks: Task[], today: string): { title: string; body: string } | null {
  const active = tasks.filter(t => t.status !== 'selesai' && !t.deleted_at && t.deadline)
  const due = active.filter(t => t.deadline === today).length
  const late = active.filter(t => t.deadline! < today).length
  if (!due && !late) return null
  const parts = [due && `${due} tugas jatuh tempo hari ini`, late && `${late} tugas terlambat`].filter(Boolean)
  return { title: 'Pengingat Tugas Wali Kelas', body: `${parts.join(' dan ')}. Ketuk untuk membuka.` }
}
