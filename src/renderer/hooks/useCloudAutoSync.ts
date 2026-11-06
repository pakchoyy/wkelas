import { useEffect, useState } from 'react'
import { documentClient } from '../../lib/document-client'
import { autoSync, bootSync, markSyncError, type AutoDecision } from '../../lib/cloud-sync'
import { useAuthStore } from '../stores/authStore'
import { canUse } from '../../shared/subscription'

const MIN_INTERVAL = 20 * 1000

export function useCloudAutoSync(): AutoDecision | null {
  const uid = useAuthStore(s => canUse('sinkron_cloud', s.plan, s.mode) ? s.user?.id || null : null)
  const [last, setLast] = useState<AutoDecision | null>(null)
  useEffect(() => {
    const client = documentClient()
    if (!client || !uid) { setLast(null); return }
    let running = false
    let lastRun = 0
    const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false
    const run = async (force = false) => {
      if (running || (!force && Date.now() - lastRun < MIN_INTERVAL)) return
      if (offline()) return
      // Hemat kuota: tab tersembunyi tidak mengecek cloud (kirim tetap jalan saat ditinggalkan).
      if (!force && document.visibilityState !== 'visible') return
      running = true
      try {
        let decision = await autoSync(client, uid)
        // Perangkat lain baru mengirim: ambil diam-diam bila di sini tidak ada editan tertunda.
        if (decision === 'remote-newer') decision = await bootSync(client, uid)
        setLast(decision)
      } catch (error) { markSyncError(uid, error) }
      finally { running = false; lastRun = Date.now() }
    }
    const boot = async () => {
      if (running || offline()) return
      running = true
      try { setLast(await bootSync(client, uid)) } catch (error) { markSyncError(uid, error) }
      finally { running = false; lastRun = Date.now() }
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') void run(true)
      else void boot()
    }
    void boot()
    const timer = window.setInterval(() => void run(), MIN_INTERVAL)
    document.addEventListener('visibilitychange', onVis)
    const onState = () => setLast(null)
    window.addEventListener('bgy-sync-state', onState)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('bgy-sync-state', onState) }
  }, [uid])
  return last
}
