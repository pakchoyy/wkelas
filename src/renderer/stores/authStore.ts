import { create } from 'zustand'

type AuthMode = 'login' | 'demo' | null

interface AuthState {
  mode: AuthMode
  user: { nama: string; email: string } | null
  isLicensed: boolean
  setLogin: (user: { nama: string; email: string }) => void
  setDemo: () => void
  logout: () => void
  setLicensed: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Akses lokal sementara selama autentikasi belum diaktifkan.
  mode: 'login',
  user: { nama: 'Admin Lokal', email: 'admin@lokal' },
  isLicensed: true,
  setLogin: (user) => set({ mode: 'login', user, isLicensed: false }),
  setDemo: () => set({ mode: 'demo', user: { nama: 'Demo User', email: 'demo@bgy.app' }, isLicensed: true }),
  logout: () => set({ mode: null, user: null, isLicensed: false }),
  setLicensed: (v) => set({ isLicensed: v }),
}))
