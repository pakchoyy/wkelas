import { create } from 'zustand'
import { isDemoMode } from '../../lib/db'
import type { AccountPlan } from '../../shared/subscription'

type AuthMode = 'login' | 'demo' | null

interface AuthState {
  mode: AuthMode
  user: { nama: string; email: string } | null
  isLicensed: boolean
  plan: AccountPlan
  setLogin: (user: { nama: string; email: string }) => void
  setDemo: () => void
  logout: () => void
  setLicensed: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Akses lokal sementara selama autentikasi belum diaktifkan.
  mode: isDemoMode() ? 'demo' : 'login',
  user: isDemoMode() ? { nama: 'Data Contoh', email: 'demo@bgy.app' } : { nama: 'Admin Lokal', email: 'admin@lokal' },
  isLicensed: true,
  plan: 'free',
  setLogin: (user) => set({ mode: 'login', user, isLicensed: true, plan: 'free' }),
  setDemo: () => set({ mode: 'demo', user: { nama: 'Data Contoh', email: 'demo@bgy.app' }, isLicensed: true, plan: 'free' }),
  logout: () => set({ mode: null, user: null, isLicensed: false, plan: 'free' }),
  setLicensed: (v) => set({ isLicensed: v }),
}))
