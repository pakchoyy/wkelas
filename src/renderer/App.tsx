import NavigationGuard from './components/NavigationGuard'
import { lazy, Suspense } from 'react'
import { createHashRouter, createRoutesFromElements, RouterProvider, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import OnboardingGate from './components/OnboardingGate'
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const DataSiswa = lazy(() => import('./pages/siswa/data-siswa/DataSiswa'))
const Presensi = lazy(() => import('./pages/siswa/presensi/Presensi'))
const Penilaian = lazy(() => import('./pages/siswa/penilaian/Penilaian'))
const Perilaku = lazy(() => import('./pages/siswa/perilaku/Perilaku'))
const Jadwal = lazy(() => import('./pages/aktivitas/Jadwal'))
const MataPelajaran = lazy(() => import('./pages/aktivitas/MataPelajaran'))
const Rencana = lazy(() => import('./pages/aktivitas/Rencana'))
const Kalender = lazy(() => import('./pages/aktivitas/Kalender'))
const Jurnal = lazy(() => import('./pages/aktivitas/Jurnal'))
const ToDo = lazy(() => import('./pages/aktivitas/ToDo'))
const PerangkatAjar = lazy(() => import('./pages/perangkat-ajar/PerangkatAjar'))
const Laporan = lazy(() => import('./pages/laporan/Laporan'))
const Pengaturan = lazy(() => import('./pages/pengaturan/Pengaturan'))
const BantuanKomunitas = lazy(() => import('./pages/bantuan/BantuanKomunitas'))
const ProdukBGY = lazy(() => import('./pages/produk/ProdukBGY'))
const InfoPembaruan = lazy(() => import('./pages/info/InfoPembaruan'))
const MulaiDiSini = lazy(() => import('./pages/panduan/MulaiDiSini'))
const AdminFilePakChoy = lazy(() => import('./pages/admin/AdminFilePakChoy'))
const Login = lazy(() => import('./pages/Login'))

const page = (content: React.ReactNode) => <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-500">Memuat halaman…</p>}>{content}</Suspense>

const router = createHashRouter(createRoutesFromElements(<>
        <Route path="/login" element={page(<Login />)} />
        <Route element={<><NavigationGuard/><OnboardingGate><Layout /></OnboardingGate></>}>
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
          <Route path="/mulai" element={page(<MulaiDiSini />)} />
          <Route path="/admin" element={page(<AdminFilePakChoy />)} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
</>))

export default function App() { return <RouterProvider router={router}/> }
