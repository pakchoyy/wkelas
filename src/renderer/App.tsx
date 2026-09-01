import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import OnboardingGate from './components/OnboardingGate'
import Dashboard from './pages/dashboard/Dashboard'
import DataSiswa from './pages/siswa/data-siswa/DataSiswa'
import Presensi from './pages/siswa/presensi/Presensi'
import Penilaian from './pages/siswa/penilaian/Penilaian'
import Perilaku from './pages/siswa/perilaku/Perilaku'
import Jadwal from './pages/aktivitas/Jadwal'
import Rencana from './pages/aktivitas/Rencana'
import Kalender from './pages/aktivitas/Kalender'
import Jurnal from './pages/aktivitas/Jurnal'
import Catatan from './pages/aktivitas/Catatan'
import ToDo from './pages/aktivitas/ToDo'
import PerangkatAjar from './pages/perangkat-ajar/PerangkatAjar'
import Laporan from './pages/laporan/Laporan'
import Pengaturan from './pages/pengaturan/Pengaturan'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Login dinonaktifkan sementara selama pengembangan fitur. */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<OnboardingGate><Layout /></OnboardingGate>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/siswa/data-siswa" element={<DataSiswa />} />
          <Route path="/siswa/presensi" element={<Presensi />} />
          <Route path="/siswa/penilaian" element={<Penilaian />} />
          <Route path="/siswa/perilaku" element={<Perilaku />} />
          <Route path="/aktivitas/jadwal" element={<Jadwal />} />
          <Route path="/aktivitas/rencana" element={<Rencana />} />
          <Route path="/aktivitas/kalender" element={<Kalender />} />
          <Route path="/aktivitas/jurnal" element={<Jurnal />} />
          <Route path="/aktivitas/catatan" element={<Catatan />} />
          <Route path="/aktivitas/todo" element={<ToDo />} />
          <Route path="/perangkat-ajar" element={<PerangkatAjar />} />
          <Route path="/laporan" element={<Laporan />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
