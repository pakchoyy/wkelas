import NavigationGuard from './components/NavigationGuard'
import { createHashRouter, createRoutesFromElements, RouterProvider, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import OnboardingGate from './components/OnboardingGate'
import Dashboard from './pages/dashboard/Dashboard'
import DataSiswa from './pages/siswa/data-siswa/DataSiswa'
import Presensi from './pages/siswa/presensi/Presensi'
import Penilaian from './pages/siswa/penilaian/Penilaian'
import Perilaku from './pages/siswa/perilaku/Perilaku'
import Jadwal from './pages/aktivitas/Jadwal'
import MataPelajaran from './pages/aktivitas/MataPelajaran'
import Rencana from './pages/aktivitas/Rencana'
import Kalender from './pages/aktivitas/Kalender'
import Jurnal from './pages/aktivitas/Jurnal'
import ToDo from './pages/aktivitas/ToDo'
import PerangkatAjar from './pages/perangkat-ajar/PerangkatAjar'
import Laporan from './pages/laporan/Laporan'
import Pengaturan from './pages/pengaturan/Pengaturan'
import BantuanKomunitas from './pages/bantuan/BantuanKomunitas'
import ProdukBGY from './pages/produk/ProdukBGY'
import InfoPembaruan from './pages/info/InfoPembaruan'

const router = createHashRouter(createRoutesFromElements(<>
        {/* Login dinonaktifkan sementara selama pengembangan fitur. */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<><NavigationGuard/><OnboardingGate><Layout /></OnboardingGate></>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/siswa/data-siswa" element={<DataSiswa />} />
          <Route path="/siswa/presensi" element={<Presensi />} />
          <Route path="/siswa/penilaian" element={<Penilaian />} />
          <Route path="/siswa/perilaku" element={<Perilaku />} />
          <Route path="/aktivitas/jadwal" element={<Jadwal />} />
          <Route path="/aktivitas/mapel" element={<MataPelajaran />} />
          <Route path="/aktivitas/rencana" element={<Rencana />} />
          <Route path="/aktivitas/kalender" element={<Kalender />} />
          <Route path="/aktivitas/jurnal" element={<Jurnal />} />
          <Route path="/aktivitas/todo" element={<ToDo />} />
          <Route path="/perangkat-ajar" element={<PerangkatAjar />} />
          <Route path="/laporan" element={<Laporan />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
          <Route path="/bantuan" element={<BantuanKomunitas />} />
          <Route path="/produk" element={<ProdukBGY />} />
          <Route path="/pembaruan" element={<InfoPembaruan />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
</>))

export default function App() { return <RouterProvider router={router}/> }
