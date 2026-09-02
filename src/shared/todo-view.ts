export type TaskFilter = 'aktif' | 'hari-ini' | 'terlambat' | 'mendatang' | 'selesai'
type Task = { id?: number; judul?: string; deskripsi?: string; status?: string; deadline?: string; prioritas?: string }

export function visibleTasks<T extends Task>(data: T[], filter: TaskFilter, today: string, search = ''): T[] {
  const query = search.trim().toLocaleLowerCase('id')
  const priority: Record<string, number> = { tinggi: 0, normal: 1, rendah: 2 }
  return data.filter(item => {
    if ((item.status === 'selesai') !== (filter === 'selesai')) return false
    if (filter === 'hari-ini' && item.deadline !== today) return false
    if (filter === 'terlambat' && (!item.deadline || item.deadline >= today)) return false
    if (filter === 'mendatang' && (!item.deadline || item.deadline <= today)) return false
    return `${item.judul || ''} ${item.deskripsi || ''}`.toLocaleLowerCase('id').includes(query)
  }).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')
    || (priority[a.prioritas || 'normal'] ?? 1) - (priority[b.prioritas || 'normal'] ?? 1)
    || (a.judul || '').localeCompare(b.judul || '', 'id')
    || (a.id || 0) - (b.id || 0))
}
