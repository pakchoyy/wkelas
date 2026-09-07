import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = (import.meta as ImportMeta & {env:Record<string,string|undefined>}).env
function pair(urlKey:string,keyA:string,keyB:string):{url:string;key:string}|null {
  const url = env[urlKey] || ''
  const key = env[keyA] || env[keyB] || ''
  if (!url || !key || /YOUR_PROJECT|REPLACE_ME/.test(url+key)) return null
  return {url,key}
}
const clients = new Map<string,SupabaseClient>()
function makeClient(id:string,url:string,key:string):SupabaseClient {
  const hit = clients.get(id)
  if (hit) return hit
  const created = createClient(url,key,{auth:{storageKey:`pak-choy-admin-auth-${id}`,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}})
  clients.set(id,created)
  return created
}
// Configuration is optional: personal documents and the offline app keep working.
export function documentClient():SupabaseClient|null {
  const primary = pair('VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_ANON_KEY')
  if (!primary) return null
  return makeClient('utama',primary.url,primary.key)
}
// Multi-backend: tambah VITE_SUPABASE_URL_2 + VITE_SUPABASE_PUBLISHABLE_KEY_2
// (project gratis baru) bila backend utama penuh. Baca digabung semua backend,
// unggah baru selalu ke backend pertama (utama) — pindahkan manual ke _2 bila penuh.
export function documentClients():SupabaseClient[] {
  const list:SupabaseClient[] = []
  const primary = documentClient()
  if (primary) list.push(primary)
  const second = pair('VITE_SUPABASE_URL_2','VITE_SUPABASE_PUBLISHABLE_KEY_2','VITE_SUPABASE_ANON_KEY_2')
  if (second) list.push(makeClient('cadangan',second.url,second.key))
  return list
}
