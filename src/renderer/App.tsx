import NavigationGuard from './components/NavigationGuard'
import { lazy, Suspense } from 'react'
import { createHashRouter, createRoutesFromElements, RouterProvider, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import OnboardingGate from './components/OnboardingGate'
import RouteError from './components/RouteError'

function lazyWithRetry<T>(importer: () => Promise<{ default: React.ComponentType<T> } | T>) {
  return lazy(async () => {
    try {
      return (await importer()) as { default: React.ComponentType<T> }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const isChunk = /Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i.test(message)
      if (isChunk && !sessionStorage.getItem('chunk-reload')) {
        sessionStorage.setItem('chunk-reload', '1')
        window.location.reload()
      }
      throw error
    }
  }) as unknown as React.LazyExoticComponent<React.ComponentType<T>>
}

const Dashboard = lazyWithRetry(() => import('./pages/dashboard/Dashboard'))
const DataSiswa = lazyWithRetry(() => import('./pages/siswa/data-siswa/DataSiswa'))
const Presensi = lazyWithRetry(() => import('./pages/siswa/presensi/Presensi'))
const Penilaian = lazyWithRetry(() => import('./pages/siswa/penilaian/Penilaian'))
const Perilaku = lazyWithRetry(() => import('./pages/siswa/perilaku/Perilaku'))
const Jadwal = lazyWithRetry(() => import('./pages/aktivitas/Jadwal'))
const MataPelajaran = lazyWithRetry(() => import('./pages/aktivitas/MataPelajaran'))
const Rencana = lazyWithRetry(() => import('./pages/aktivitas/Rencana'))
const Kalender = lazyWithRetry(() => import('./pages/aktivitas/Kalender'))
const Jurnal = lazyWithRetry(() => import('./pages/aktivitas/Jurnal'))
const ToDo = lazyWithRetry(() => import('./pages/aktivitas/ToDo'))
const PerangkatAjar = lazyWithRetry(() => import('./pages/perangkat-ajar/PerangkatAjar'))
const Laporan = lazyWithRetry(() => import('./pages/laporan/Laporan'))
const Pengaturan = lazyWithRetry(() => import('./pages/pengaturan/Pengaturan'))
const BantuanKomunitas = lazyWithRetry(() => import('./pages/bantuan/BantuanKomunitas'))
const ProdukBGY = lazyWithRetry(() => import('./pages/produk/ProdukBGY'))
const InfoPembaruan = lazyWithRetry(() => import('./pages/info/InfoPembaruan'))
const Tentang = lazyWithRetry(() => import('./pages/info/Tentang'))
const MulaiDiSini = lazyWithRetry(() => import('./pages/panduan/MulaiDiSini'))
const AdminFilePakChoy = lazyWithRetry(() => import('./pages/admin/AdminFilePakChoy'))
const Login = lazyWithRetry(() => import('./pages/Login'))

const page = (content: React.ReactNode) => <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-500">Memuat halaman…</p>}>{content}</Suspense>

const router = createHashRouter(createRoutesFromElements(<>
        <Route path="/login" element={page(<Login />)} errorElement={<RouteError/>} />
        <Route element={<><NavigationGuard/><OnboardingGate><Layout /></OnboardingGate></>} errorElement={<RouteError/>}>
          <Route path="/" element={page(<Dashboard />)} />
          <Route path="/siswa/data-siswa" element={page(<DataSiswa />)} />
          <Route path="/siswa/presensi" element={page(<Presensi />)} />
          <Route path="/siswa/penilaian" element={page(<Penilaian />)} />
          <Route path="/siswa/perilaku" element={page(<Perilaku />)} />
          <Route path="/aktivitas/jadwal" element={page(<Jadwal />)} />
          <Route path="/aktivitas/mapel" element={page(<MataPelajaran />)} />
          <Route path="/aktivitas/rencana" element={page(<Rencana />)} />
          <Route path="/aktivitas/kalender" element={page(<Kalender />)} />
          <Route path="/aktivitas/jurnal" element={page(<Jurnal />)} />
          <Route path="/aktivitas/todo" element={page(<ToDo />)} />
          <Route path="/perangkat-ajar" element={page(<PerangkatAjar />)} />
          <Route path="/laporan" element={page(<Laporan />)} />
          <Route path="/pengaturan" element={page(<Pengaturan />)} />
          <Route path="/bantuan" element={page(<BantuanKomunitas />)} />
          <Route path="/produk" element={page(<ProdukBGY />)} />
          <Route path="/pembaruan" element={page(<InfoPembaruan />)} />
          <Route path="/tentang" element={page(<Tentang />)} />
          <Route path="/mulai" element={page(<MulaiDiSini />)} />
          <Route path="/admin" element={page(<AdminFilePakChoy />)} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
</>))

export default function App() { return <RouterProvider router={router}/> }
