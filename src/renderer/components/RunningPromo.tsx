import { useEffect, useState } from 'react'
import { CircleX, Megaphone } from 'lucide-react'
import { BGY_PRODUCTS } from '../../shared/bgy-products'

export default function RunningPromo() {
  const [index, setIndex] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(sessionStorage.getItem('bgy-promo-hidden') === '1')
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % BGY_PRODUCTS.length), 7000)
    return () => window.clearInterval(timer)
  }, [])

  if (hidden) return null
  const promo = BGY_PRODUCTS[index]

  return <aside aria-label="Rekomendasi produk Bantu Guru Yuk" className="running-promo relative z-10 flex min-h-9 shrink-0 items-center overflow-hidden border-t border-teal-800 bg-teal-950 text-white print:hidden">
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center bg-teal-950 px-3 text-teal-200 sm:px-4" aria-hidden="true"><Megaphone size={15}/></div>
    <div className="relative h-9 min-w-0 flex-1 overflow-hidden"><a key={index} href={promo.href} target="_blank" rel="noreferrer" className="running-promo-message absolute top-0 flex h-9 items-center gap-2 whitespace-nowrap text-xs font-semibold text-white hover:text-teal-100"><span>{promo.promoText}</span><span className="font-extrabold text-amber-300">{promo.action} →</span></a></div>
    <button type="button" onClick={() => { sessionStorage.setItem('bgy-promo-hidden', '1'); setHidden(true) }} aria-label="Tutup rekomendasi produk" title="Tutup" className="relative z-20 mr-1 grid size-8 shrink-0 place-items-center rounded-full text-teal-200 hover:bg-white/10 hover:text-white"><CircleX size={16}/></button>
  </aside>
}
