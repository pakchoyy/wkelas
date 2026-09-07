import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleX, Megaphone } from 'lucide-react'
import { BGY_PRODUCTS } from '../../shared/bgy-products'

export default function RunningPromo() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(sessionStorage.getItem('bgy-promo-hidden') === '1')
  }, [])

  if (hidden) return null

  return <aside aria-label="Rekomendasi produk Bantu Guru Yuk" className="running-promo relative z-10 flex min-h-9 shrink-0 items-center overflow-hidden border-t border-teal-800 bg-teal-950 text-white print:hidden">
    <Link to="/produk" title="Lihat semua produk BGY" aria-label="Lihat semua produk BGY" className="absolute inset-y-0 left-0 z-10 flex items-center gap-2 bg-teal-950 py-1 pl-3 pr-4 text-teal-200 hover:text-white sm:pl-4"><Megaphone size={15}/><span className="hidden text-[11px] font-bold underline underline-offset-4 sm:inline">Semua</span></Link>
    <div className="relative h-9 min-w-0 flex-1 overflow-hidden pl-10 sm:pl-24">
      <div className="running-promo-track flex h-9 w-max items-center">
        {[false, true].map((duplicate) => (
          <div key={duplicate ? 'copy' : 'main'} aria-hidden={duplicate || undefined} className="flex h-9 items-center">
            {BGY_PRODUCTS.map((promo) => (
              <a key={`${duplicate ? 'copy-' : ''}${promo.id}`} href={promo.href} target="_blank" rel="noreferrer" tabIndex={duplicate ? -1 : undefined} className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap px-5 text-xs font-semibold text-white hover:text-teal-100">
                <span aria-hidden="true" className="text-teal-500">•</span>
                <span>{promo.promoText}</span>
                <span className="font-extrabold text-amber-300">{promo.action} →</span>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
    <button type="button" onClick={() => { sessionStorage.setItem('bgy-promo-hidden', '1'); setHidden(true) }} aria-label="Tutup rekomendasi produk" title="Tutup" className="relative z-20 mr-1 grid size-8 shrink-0 place-items-center rounded-full text-teal-200 hover:bg-white/10 hover:text-white"><CircleX size={16}/></button>
  </aside>
}
