import { useEffect, useState } from 'react'
import { documentClient } from '../../lib/document-client'

const READ_KEY = 'bgy-announcements-read'

function readIds(): Set<string> {
  try {
    const value = localStorage.getItem(READ_KEY)
    const ids = value ? JSON.parse(value) : []
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

// Jumlah pengumuman belum dibaca. null = belum tahu; 0 saat tak ada klien/galat
// agar alert install tidak pernah tertahan oleh kegagalan jaringan.
export function useUnreadAnnouncements(): number | null {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    const client = documentClient()
    if (!client) { setCount(0); return }
    let cancelled = false
    const refresh = () => {
      void client.from('announcements').select('id').then(({ data, error }) => {
        if (cancelled) return
        if (error) { setCount(0); return }
        const read = readIds()
        setCount((data || []).filter((item) => !read.has(item.id)).length)
      }).catch(() => { if (!cancelled) setCount(0) })
    }
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('bgy-announcements-read', refresh)
    return () => { cancelled = true; window.removeEventListener('storage', refresh); window.removeEventListener('bgy-announcements-read', refresh) }
  }, [])
  return count
}
