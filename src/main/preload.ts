export interface ElectronAPI {
  db: {
    query: (sql: string, params?: any[]) => Promise<any[]>
    queryOne: (sql: string, params?: any[]) => Promise<any>
    exec: (sql: string, params?: any[]) => Promise<any>
  }
  siswa: {
    list: (kelasId: number) => Promise<any[]>
    create: (data: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  fieldDef: {
    list: (kelasId: number) => Promise<any[]>
    create: (data: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  fieldVal: {
    get: (siswaId: number) => Promise<any[]>
    set: (siswaId: number, fieldId: number, nilai: string | null) => Promise<any>
  }
  perilaku: {
    list: (siswaId?: number) => Promise<any[]>
    create: (data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  presensi: {
    get: (kelasId: number, tanggal: string) => Promise<any[]>
    save: (records: any[]) => Promise<any>
  }
  mapel: {
    list: (kelasId: number) => Promise<any[]>
    create: (data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  kolom: {
    list: (mapelId: number) => Promise<any[]>
    create: (data: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  nilai: {
    list: (kolomId: number) => Promise<any[]>
    getAll: (mapelId: number, siswaIds: number[]) => Promise<Record<string, number | null>>
    save: (sId: number, kId: number, val: number | null) => Promise<any>
  }
  jadwal: {
    list: (kelasId: number) => Promise<any[]>
    save: (data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  rencana: {
    list: (kelasId: number) => Promise<any[]>
    save: (data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  kalender: {
    list: (kelasId: number) => Promise<any[]>
    save: (data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  jurnal: {
    list: (kelasId: number) => Promise<any[]>
    save: (data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  catatan: {
    list: () => Promise<any[]>
    save: (data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  todo: {
    list: () => Promise<any[]>
    save: (data: any) => Promise<any>
    toggle: (id: number) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  dokumenSaya: {
    list: () => Promise<any[]>
    create: (data: any) => Promise<any>
    upload: (data: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }
  dialog: {
    openFile: (filters?: any[]) => Promise<any>
  }
  backup: {
    create: () => Promise<any>
    restore: () => Promise<any>
  }
  platform: string
}
