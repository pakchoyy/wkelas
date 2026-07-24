import { create } from 'zustand'

interface AppState {
  kelasAktifId: number | null
  mode: 'login' | 'demo' | null
  setKelasAktif: (id: number) => void
  setMode: (mode: 'login' | 'demo') => void
}

export const useAppStore = create<AppState>((set) => ({
  kelasAktifId: null,
  mode: null,
  setKelasAktif: (id) => set({ kelasAktifId: id }),
  setMode: (mode) => set({ mode }),
}))
