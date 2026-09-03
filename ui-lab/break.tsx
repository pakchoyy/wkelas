import React from 'react'
import { createRoot } from 'react-dom/client'
import { Users, CheckCircle2, BookOpen, ListTodo } from 'lucide-react'
import StatCard from '../src/renderer/components/StatCard'
import '../src/renderer/globals.css'

const scenarios = [
  { name: '01 · Nilai nol', width: 320, label: 'Total siswa', value: 0, icon: Users },
  { name: '02 · Data kelas biasa', width: 320, label: 'Hadir', detail: 'Termasuk terlambat', value: 28, icon: CheckCircle2 },
  { name: '03 · Angka besar pada kartu sempit', width: 140, label: 'Tugas tertunda', value: 10000, icon: ListTodo },
  { name: '04 · Memuat atau gagal membaca data', width: 320, label: 'Total siswa', value: '—', icon: Users },
  { name: '05 · Terdesak kolom sebelah: 140 px', width: 140, label: 'Jurnal belum diisi', value: 8, icon: BookOpen },
  { name: '06 · Detail di kolom sempit: 140 px', width: 140, label: 'Hadir', detail: 'Termasuk terlambat', value: 28, icon: CheckCircle2 },
  { name: '07 · Ruang sangat lebar: 960 px', width: 960, label: 'Total siswa', value: 28, icon: Users },
]

function BreakPage() {
  return <main className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
    <header className="max-w-2xl space-y-3">
      <h1 className="text-2xl font-bold">Uji kartu ringkasan</h1>
      <p className="text-sm leading-relaxed text-slate-600">Komponen yang sama dengan dashboard, ditampilkan dengan angka dan lebar berbeda. Semua data di halaman ini adalah contoh; halaman ini tidak membaca data kelas.</p>
      <p className="text-sm leading-relaxed text-slate-600">Teks label tetap, jadi uji paragraf panjang, emoji, dan bahasa lain tidak diterapkan. Kartu tidak memiliki tombol, status disabled, atau daftar item. Tanda — mewakili data yang belum tersedia.</p>
      <p className="text-sm leading-relaxed text-slate-600">Untuk melihat semua lebar pada satu layar, buka di desktop. Pada ponsel, contoh 320 px dan 960 px sengaja dapat digeser secara horizontal. Zoom browser dan pengaturan gerakan mengikuti lingkungan browser Anda.</p>
      <p id="observation" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">Hasil pengamatan: ketujuh skenario bertahan. Pada pemeriksaan visual di Edge, angka dan label tetap berada di dalam kartu; tidak terlihat teks terpotong atau saling menimpa. Lebar kartu uji: 140, 320, dan 960 px.</p>
    </header>
    {scenarios.map(({name, width, ...props}) => <section key={name} className="space-y-3">
      <h2 className="text-sm font-bold">{name}</h2>
      <div className="overflow-x-auto pb-2"><div style={{width}}><StatCard {...props}/></div></div>
    </section>)}
  </main>
}

createRoot(document.getElementById('root')!).render(<BreakPage/>);
