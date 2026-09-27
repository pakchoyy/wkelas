import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db, type Kelas } from '../../lib/db'
import { activateClass, listClasses } from '../../lib/class-manager'
import { mayLeave } from '../../shared/unsaved-changes'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'

export function useClasses() {
  const mode = useAuthStore(s => s.mode)
  const [classes, setClasses] = useState<Kelas[]>([])
  useEffect(() => {
    const sub = liveQuery(() => listClasses(db)).subscribe({ next: setClasses, error: () => setClasses([]) })
    return () => sub.unsubscribe()
  }, [mode])
  return classes
}

export async function switchClass(id: number): Promise<boolean> {
  if (id === useAppStore.getState().kelasAktifId) return true
  if (!mayLeave(m => window.confirm(m), m => window.alert(m))) return false
  await activateClass(db, id)
  useAppStore.setState({ kelasAktifId: id })
  return true
}
