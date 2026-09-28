import './style.css'

const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
const url = env.VITE_SUPABASE_URL || ''
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

async function requestCode(email: string): Promise<string> {
  if (!url || !key) throw new Error('Layanan aktivasi belum dikonfigurasi. Hubungi admin.')
  const response = await fetch(`${url}/rest/v1/rpc/bgy_request_activation_code`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_email: email, p_access: 'wali_kelas' }),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message || 'Kode belum bisa dibuat. Coba lagi.')
  return String(body)
}

$('form').addEventListener('submit', async event => {
  event.preventDefault()
  const email = $<HTMLInputElement>('email').value.trim().toLowerCase()
  const button = $<HTMLButtonElement>('submit')
  $('error').hidden = true
  button.disabled = true; button.textContent = 'Memproses…'
  try {
    const code = await requestCode(email)
    $('code').textContent = code
    $<HTMLAnchorElement>('open').href = `/#/aktivasi?${new URLSearchParams({ email, kode: code })}`
    $('result').hidden = false
    $('form').hidden = true
  } catch (error) {
    $('error').textContent = error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.'
    $('error').hidden = false
  } finally {
    button.disabled = false; button.textContent = 'Dapatkan Kode'
  }
})

$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('code').textContent || ''); $('copy').textContent = 'Tersalin' }
  catch { $('copy').textContent = 'Salin manual' }
})
