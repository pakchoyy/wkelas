import { DatabaseBackup, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BACKUP_HISTORY_KEY, backupIsDue, readBackupHistory } from '../../lib/backup-history'

export default function BackupReminderBanner() {
  const history = readBackupHistory(localStorage.getItem(BACKUP_HISTORY_KEY))
  const reminderKey = `bgy-backup-reminder-hidden-${history?.startedAt || 'none'}`
  const [hidden, setHidden] = useState(() => sessionStorage.getItem(reminderKey) === '1')
  if (hidden || !backupIsDue(history)) return null
  return <aside className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <DatabaseBackup size={20} className="shrink-0 text-amber-700"/><p className="min-w-52 flex-1">{history ? 'Sudah 30 hari sejak cadangan terakhir. Simpan cadangan baru agar data kelas tetap aman.' : 'Data belum pernah dicadangkan di browser ini. Simpan cadangan agar aman saat pindah perangkat.'}</p>
    <Link to="/pengaturan" state={{ tab: 'backup' }} className="inline-flex min-h-11 items-center rounded-xl bg-amber-700 px-4 py-2 font-bold text-white hover:bg-amber-800">Buka cadangan</Link>
    <button type="button" aria-label="Tutup pengingat cadangan" onClick={() => { sessionStorage.setItem(reminderKey,'1'); setHidden(true) }} className="grid size-11 place-items-center rounded-xl hover:bg-amber-100"><X size={17}/></button>
  </aside>
}
