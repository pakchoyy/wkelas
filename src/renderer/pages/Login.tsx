import { useState } from 'react'
import { GraduationCap, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setLogin, setDemo } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // TODO: connect to Supabase Auth
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      // if (error) throw error
      // setLogin({ nama: data.user.email!, email: data.user.email! })
      // lalu cek lisensi
      throw new Error('Supabase Auth belum dikonfigurasi')
    } catch (err: any) {
      setError(err.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = () => {
    setDemo()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)' }}
          >
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold">BGY Wali Kelas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-light)' }}>
            Masuk untuk melanjutkan
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
              placeholder="guru@sekolah.sch.id"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
              placeholder="******"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Masuk'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-xs" style={{ color: 'var(--text-light)' }}>atau</span>
        </div>

        <button
          onClick={handleDemo}
          className="w-full rounded-xl py-2.5 text-sm font-semibold mt-2 transition-all duration-200 active:scale-[0.98] border"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          Demo Mode
        </button>
      </div>
    </div>
  )
}
