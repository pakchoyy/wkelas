import { ExternalLink, LayoutGrid } from 'lucide-react'
import { BGY_PRODUCTS } from '../../../shared/bgy-products'

export default function ProdukBGY() {
  return <div className="mx-auto max-w-6xl space-y-6">
    <header>
      <div className="mb-2 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-teal-100 text-teal-700"><LayoutGrid size={23}/></span><div><h1 className="text-2xl font-black text-slate-800">Produk BGY</h1><p className="text-sm text-slate-500">Alat bantu lain dari Bantu Guru Yuk.</p></div></div>
    </header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {BGY_PRODUCTS.map((product) => <article key={product.id} className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800">{product.name}</h2>
        <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{product.description}</p>
        <a href={product.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700">Buka produk <ExternalLink size={16}/></a>
      </article>)}
    </section>
  </div>
}
