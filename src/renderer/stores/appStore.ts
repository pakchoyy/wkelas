import {mayLeave} from '../../shared/unsaved-changes'
import { create } from 'zustand'

interface AppState {
  kelasAktifId: number | null
  mode: 'login' | 'demo' | null
  setKelasAktif: (id: number) => void
  setMode: (mode: 'login' | 'demo') => void
}

export const useAppStore = create<AppState>((set,get) => ({
  kelasAktifId: null,
  mode: null,
  setKelasAktif: (id) => { if(id===get().kelasAktifId)return; if(!mayLeave(message=>window.confirm(message),message=>window.alert(message)))return; set({kelasAktifId:id}) },
  setMode: (mode) => set({ mode }),
}))
