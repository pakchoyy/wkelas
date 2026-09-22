import { useEffect, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { documentClient } from './document-client'
import { isDemoMode } from './db'
import { createInitialAuthGate, googleOAuthOptions } from './oauth-login'
import { useAuthStore } from '../renderer/stores/authStore'

export const userClient = documentClient
export function useUserSession(client: SupabaseClient | null) {
  const [session,setSession] = useState<Session|null>(null)
  const [checking,setChecking] = useState(!!client)
  useEffect(() => {
    if (!client) { setSession(null); setChecking(false); return }
    let cancelled=false
    const apply=(next:Session|null) => {
      if(cancelled)return
      setSession(next)
      if(next?.user) useAuthStore.getState().setLogin({nama:String(next.user.user_metadata?.full_name || next.user.user_metadata?.name || next.user.email?.split('@')[0] || 'Guru'),email:next.user.email || ''})
      else if (!isDemoMode()) useAuthStore.getState().logout()
      setChecking(false)
    }
    const initialAuth = createInitialAuthGate<Session>(apply)
    const finishOAuthCallback = async () => {
      const callback = new URL(window.location.href)
      const code = callback.searchParams.get('code')
      if (code) {
        const { data, error } = await client.auth.exchangeCodeForSession(code)
        if (!error) {
          callback.searchParams.delete('code')
          window.history.replaceState({}, '', `${callback.pathname}${callback.search}${callback.hash}`)
          return data.session
        }
      }
      const { data } = await client.auth.getSession()
      return data.session
    }
    finishOAuthCallback().then(initialAuth.resolveInitial).catch(()=>initialAuth.resolveInitial(null))
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,next)=>initialAuth.onAuthEvent(next))
    return ()=>{cancelled=true;subscription.unsubscribe()}
  },[client])
  return {user:session?.user || null,checking}
}
export async function signInUser(client:SupabaseClient,email:string,password:string) { const {error}=await client.auth.signInWithPassword({email:email.trim(),password}); if(error) throw new Error('Email atau kata sandi belum sesuai. Periksa kembali lalu coba lagi.') }
export async function signUpUser(client:SupabaseClient,email:string,password:string) { const {data,error}=await client.auth.signUp({email:email.trim(),password}); if(error) throw new Error(error.message.includes('already registered')?'Email sudah terdaftar. Pilih Masuk.':'Pendaftaran belum berhasil. Periksa email dan kata sandi lalu coba lagi.'); return data.session }
export async function signInGoogle(client:SupabaseClient) { const {error}=await client.auth.signInWithOAuth(googleOAuthOptions(window.location.origin)); if(error) throw new Error('Login Google belum aktif di Supabase. Aktifkan provider Google lalu coba lagi.') }
export async function resetUserPassword(client:SupabaseClient,email:string) { const {error}=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/#/login`}); if(error) throw new Error('Email reset kata sandi belum dapat dikirim. Periksa email dan konfigurasi Supabase.') }
