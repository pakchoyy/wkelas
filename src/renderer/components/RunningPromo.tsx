import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { BGY_PRODUCTS } from '../../shared/bgy-products'

export default function RunningPromo() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % BGY_PRODUCTS.length), 4000)
    return () => window.clearInterval(timer)
  }, [])

  const promo = BGY_PRODUCTS[index]

  return <aside aria-label="Rekomendasi produk Bantu Guru Yuk" className="running-promo relative z-10 flex min-h-9 shrink-0 items-center overflow-hidden border-t border-teal-900/30 print:hidden" style={{ background: 'var(--header-bg)' }}>
    <Link to="/produk" title="Lihat semua produk BGY" aria-label="Lihat semua produk BGY" className="absolute inset-y-0 left-0 z-10 flex items-center gap-2 py-1 pl-3 pr-4 text-teal-100 hover:text-white sm:pl-4" style={{ background: 'var(--header-bg)' }}><Megaphone size={15}/><span className="hidden text-[11px] font-bold underline underline-offset-4 sm:inline">Semua</span></Link>
    <div className="relative h-9 min-w-0 flex-1 overflow-hidden pl-10 sm:pl-24">
      <div className="running-promo-track hidden h-9 w-max items-center sm:flex">
        {[false, true].map((duplicate) => (
          <div key={duplicate ? 'copy' : 'main'} aria-hidden={duplicate || undefined} className="flex h-9 items-center">
            {BGY_PRODUCTS.map((item, i) => (
              <a key={`${duplicate ? 'copy-' : ''}${item.id}`} href={item.href} target="_blank" rel="noreferrer" tabIndex={duplicate ? -1 : undefined} className={`flex h-9 shrink-0 items-center gap-2 whitespace-nowrap px-5 text-xs font-semibold ${i % 2 ? 'text-amber-200' : 'text-white'}`}>
                <span aria-hidden="true" className="text-teal-300">•</span>
                <span>{item.promoText}</span>
                <span className="font-extrabold text-emerald-300 underline underline-offset-4">{item.action} →</span>
              </a>
            ))}
          </div>
        ))}
      </div>
      <a key={promo.id} href={promo.href} target="_blank" rel="noreferrer" className={`running-promo-fade flex h-9 items-center justify-center gap-2 whitespace-nowrap px-2 text-center text-xs font-semibold sm:hidden ${index % 2 ? 'text-amber-200' : 'text-white'}`}><span className="truncate">{promo.promoText}</span><span className="shrink-0 font-extrabold text-emerald-300 underline underline-offset-4">{promo.action} →</span></a>
    </div>
  </aside>
}
