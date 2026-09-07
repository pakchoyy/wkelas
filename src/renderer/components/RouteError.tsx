import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { RefreshCw, TriangleAlert } from 'lucide-react'

export default function RouteError() {
  const error = useRouteError() as unknown
  const message =
    isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` :
    error instanceof Error ? error.message : 'Halaman gagal dimuat.'

  const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i.test(message)

  const reload = () => {
    sessionStorage.removeItem('chunk-reload')
    window.location.reload()
  }

  // Auto reload once for chunk errors (deploy baru ganti hash)
  if (isChunkError && !sessionStorage.getItem('chunk-reload')) {
    sessionStorage.setItem('chunk-reload', '1')
    window.location.reload()
    return <p className="p-6 text-sm text-slate-500">Memuat ulang…</p>
  }

  return <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700"><TriangleAlert size={20}/></span>
      <div className="min-w-0">
        <h1 className="font-extrabold text-amber-950">Gagal memuat halaman</h1>
        <p className="mt-1 break-words text-amber-800">{isChunkError ? 'Versi aplikasi baru tersedia. Muat ulang untuk mendapatkan file terbaru.' : message}</p>
        <p className="mt-1 text-xs text-amber-700">Jika terus muncul, coba tutup tab lalu buka lagi.</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      <button onClick={reload} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-800"><RefreshCw size={16}/>Muat ulang</button>
      <a href="#/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-bold text-amber-900">Kembali ke Beranda</a>
    </div>
  </div>
}
