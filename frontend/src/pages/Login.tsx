import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Activity, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ApiError } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, login } = useAuth()
  const navigate = useNavigate()

  // Já autenticado → vai direto ao dashboard
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.')
      } else {
        setError('Não foi possível conectar ao servidor. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">LifeTrigger</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Motor de Inteligência de Proteção de Vida
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="mb-6 text-center text-base font-semibold text-white">
            Entrar na plataforma
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Senha</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Credenciais de demonstração
          </p>
          <div className="space-y-0.5 font-mono text-[11px] text-slate-500">
            <p>partner@alpha.demo · Alpha@123!</p>
            <p>admin@alpha.demo · Alpha@123!</p>
            <p>superadmin@lifetrigger.io · Super@123!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
