import { useState, useEffect, useCallback } from 'react'
import type { Siswa, SiswaFieldDefinition, SiswaFieldValue } from '../../shared/types'

export function useSiswaList(kelasId: number) {
  const [data, setData] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.siswa.list(kelasId)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [kelasId])

  useEffect(() => { load() }, [load])

  return { data, loading, reload: load }
}

export function useFieldDefs(kelasId: number) {
  const [data, setData] = useState<SiswaFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.fieldDef.list(kelasId)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [kelasId])

  useEffect(() => { load() }, [load])

  return { data, loading, reload: load }
}

export function useFieldValues(siswaId: number) {
  const [data, setData] = useState<SiswaFieldValue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await window.electronAPI.fieldVal.get(siswaId)
        setData(res)
      } finally {
        setLoading(false)
      }
    })()
  }, [siswaId])

  return { data, loading }
}
