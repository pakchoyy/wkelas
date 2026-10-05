import { useEffect, useState } from 'react'
import { documentClient } from '../../lib/document-client'
import { autoSync, type AutoDecision } from '../../lib/cloud-sync'
import { useAuthStore } from '../stores/authStore'

const MIN_INTERVAL = 2 * 60 * 1000

export function useCloudAutoSync(): AutoDecision | null {
  const uid = useAuthStore(s => s.mode === 'login' && s.plan === 'pro' ? s.user?.id || null : null)
  const [last, setLast] = useState<AutoDecision | null>(null)
  useEffect(() => {
    const client = documentClient()
    if (!client || !uid) { setLast(null); return }
    let running = false
    let lastRun = 0
    const run = async (force = false) => {
      if (running || (!force && Date.now() - lastRun < MIN_INTERVAL)) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      running = true
      try { setLast(await autoSync(client, uid)) } catch { /* coba lagi pada kesempatan berikutnya */ }
      finally { running = false; lastRun = Date.now() }
    }
    const onHide = () => { if (document.visibilityState === 'hidden') void run(true) }
    void run(true)
    const timer = window.setInterval(() => void run(), MIN_INTERVAL)
    document.addEventListener('visibilitychange', onHide)
    const onState = () => setLast(null)
    window.addEventListener('bgy-sync-state', onState)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('bgy-sync-state', onState) }
  }, [uid])
  return last
}
