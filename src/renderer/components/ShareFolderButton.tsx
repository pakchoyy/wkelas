import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { publicFolderUrl } from '../../shared/pak-choy-folders'

// Bagikan folder Ref Dokumen: share sheet HP bila ada, kalau tidak salin link.
export default function ShareFolderButton({ folderId, name }: { folderId: string | null; name: string }) {
  const [note, setNote] = useState('')
  const share = async () => {
    const url = publicFolderUrl(window.location.origin, folderId)
    const text = `${name} (gratis) di Wkelas:`
    try {
      if (navigator.share) { await navigator.share({ title: name, text, url }); return }
      await navigator.clipboard.writeText(url); setNote('Link disalin')
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer')
    }
    setTimeout(() => setNote(''), 2500)
  }
  return <button type="button" onClick={() => void share()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 text-sm font-bold text-teal-800 hover:bg-teal-50"><Share2 size={16}/>{note || 'Bagikan folder'}</button>
}
