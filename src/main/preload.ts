import { contextBridge, ipcRenderer } from 'electron'

const api = {
  db: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    queryOne: (sql: string, params?: any[]) => ipcRenderer.invoke('db:queryOne', sql, params),
    exec: (sql: string, params?: any[]) => ipcRenderer.invoke('db:exec', sql, params),
  },
  siswa: {
    list: (kelasId: number) => ipcRenderer.invoke('siswa:list', kelasId),
    create: (data: any) => ipcRenderer.invoke('siswa:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('siswa:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('siswa:delete', id),
  },
  fieldDef: {
    list: (kelasId: number) => ipcRenderer.invoke('fieldDef:list', kelasId),
    create: (data: any) => ipcRenderer.invoke('fieldDef:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('fieldDef:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('fieldDef:delete', id),
  },
  fieldVal: {
    get: (siswaId: number) => ipcRenderer.invoke('fieldVal:get', siswaId),
    set: (siswaId: number, fieldId: number, nilai: string | null) => ipcRenderer.invoke('fieldVal:set', siswaId, fieldId, nilai),
  },
  perilaku: {
    list: (siswaId?: number) => ipcRenderer.invoke('perilaku:list', siswaId),
    create: (data: any) => ipcRenderer.invoke('perilaku:create', data),
    delete: (id: number) => ipcRenderer.invoke('perilaku:delete', id),
  },
  presensi: {
    get: (kelasId: number, tanggal: string) => ipcRenderer.invoke('presensi:get', kelasId, tanggal),
    save: (records: any[]) => ipcRenderer.invoke('presensi:save', records),
  },
  mapel: {
    list: (kelasId: number) => ipcRenderer.invoke('mapel:list', kelasId),
    create: (data: any) => ipcRenderer.invoke('mapel:create', data),
    delete: (id: number) => ipcRenderer.invoke('mapel:delete', id),
  },
  kolom: {
    list: (mapelId: number) => ipcRenderer.invoke('kolom:list', mapelId),
    create: (data: any) => ipcRenderer.invoke('kolom:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('kolom:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('kolom:delete', id),
  },
  nilai: {
    list: (kolomId: number) => ipcRenderer.invoke('nilai:list', kolomId),
    getAll: (mapelId: number, siswaIds: number[]) => ipcRenderer.invoke('nilai:getAll', mapelId, siswaIds),
    save: (sId: number, kId: number, val: number | null) => ipcRenderer.invoke('nilai:save', sId, kId, val),
  },
  jadwal: {
    list: (kelasId: number) => ipcRenderer.invoke('jadwal:list', kelasId),
    save: (data: any) => ipcRenderer.invoke('jadwal:save', data),
    delete: (id: number) => ipcRenderer.invoke('jadwal:delete', id),
  },
  rencana: {
    list: (kelasId: number) => ipcRenderer.invoke('rencana:list', kelasId),
    save: (data: any) => ipcRenderer.invoke('rencana:save', data),
    delete: (id: number) => ipcRenderer.invoke('rencana:delete', id),
  },
  kalender: {
    list: (kelasId: number) => ipcRenderer.invoke('kalender:list', kelasId),
    save: (data: any) => ipcRenderer.invoke('kalender:save', data),
    delete: (id: number) => ipcRenderer.invoke('kalender:delete', id),
  },
  jurnal: {
    list: (kelasId: number) => ipcRenderer.invoke('jurnal:list', kelasId),
    save: (data: any) => ipcRenderer.invoke('jurnal:save', data),
    delete: (id: number) => ipcRenderer.invoke('jurnal:delete', id),
  },
  catatan: {
    list: () => ipcRenderer.invoke('catatan:list'),
    save: (data: any) => ipcRenderer.invoke('catatan:save', data),
    delete: (id: number) => ipcRenderer.invoke('catatan:delete', id),
  },
  todo: {
    list: () => ipcRenderer.invoke('todo:list'),
    save: (data: any) => ipcRenderer.invoke('todo:save', data),
    toggle: (id: number) => ipcRenderer.invoke('todo:toggle', id),
    delete: (id: number) => ipcRenderer.invoke('todo:delete', id),
  },
  dokumenSaya: {
    list: () => ipcRenderer.invoke('dokumenSaya:list'),
    create: (data: any) => ipcRenderer.invoke('dokumenSaya:create', data),
    upload: (data: any) => ipcRenderer.invoke('dokumenSaya:upload', data),
    delete: (id: number) => ipcRenderer.invoke('dokumenSaya:delete', id),
  },
  dialog: {
    openFile: (filters?: any[]) => ipcRenderer.invoke('dialog:openFile', filters),
  },
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
  },
  platform: process.platform,
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
