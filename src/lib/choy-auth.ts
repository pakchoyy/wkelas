import { useEffect, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { documentClient, documentClients } from './document-client'

export interface ChoyAdminUser {
  user_id: string
  email: string
  full_name: string
  avatar_url: string | null
  provider: string
  created_at: string
  last_sign_in_at: string | null
}

// Backend utama = index 0. Kalau 1 GB backend utama habis, tambah
// VITE_SUPABASE_URL_2 + VITE_SUPABASE_PUBLISHABLE_KEY_2 (project gratis baru)
// dan unggahan baru otomatis lari ke sana; file lama tetap terbaca.
export function backendClients(): SupabaseClient[] {
  return documentClients()
}

export async function isChoyAdmin(client: SupabaseClient): Promise<boolean> {
  const { data } = await client.auth.getUser()
  const user: User | null = data?.user || null
  if (!user) return false
  const { data: row } = await client.from('pak_choy_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!row
}

export async function listChoyUsers(client: SupabaseClient): Promise<ChoyAdminUser[]> {
  const { data, error } = await client.rpc('admin_list_users')
  if (error) throw new Error('Daftar pengguna belum tersedia. Jalankan SQL Admin Pengguna di Supabase lalu muat ulang.')
  return (data || []) as ChoyAdminUser[]
}

export function useChoySession(client: SupabaseClient | null) {
  const [user, setUser] = useState<User | null>(null)
  const [admin, setAdmin] = useState(false)
  const [checking, setChecking] = useState(!!client)
  useEffect(() => {
    if (!client) { setUser(null); setAdmin(false); setChecking(false); return }
    let cancelled = false
    setChecking(true)
    client.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      const u = data?.session?.user || null
      setUser(u)
      setAdmin(u ? await isChoyAdmin(client).catch(() => false) : false)
      setChecking(false)
    })
    const { data: listener } = client.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return
      const u = session?.user || null
      setUser(u)
      setAdmin(u ? await isChoyAdmin(client).catch(() => false) : false)
    })
    return () => { cancelled = true; listener.subscription.unsubscribe() }
  }, [client])
  return { user, admin, checking }
}

export async function choySignIn(client: SupabaseClient, email: string, password: string) {
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error('Login gagal. Periksa email dan kata sandi admin.')
}

export async function choySignOut(client: SupabaseClient) {
  await client.auth.signOut()
}

export function primaryClient(): SupabaseClient | null {
  return documentClient()
}
