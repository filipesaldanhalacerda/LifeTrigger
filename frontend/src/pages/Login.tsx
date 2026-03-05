import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Activity, Loader2, ShieldCheck, BarChart2, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ApiError } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, login } = useAuth()
  const navigate = useNavigate()

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
        try {
          const body = JSON.parse(err.message) as { code?: string }
          if (body.code === 'TENANT_INACTIVE') {
            setError('Sua organização foi desativada. Entre em contato com o suporte LifeTrigger.')
          } else if (body.code === 'USER_INACTIVE') {
            setError('Sua conta está inativa. Entre em contato com o administrador da sua corretora.')
          } else {
            setError('E-mail ou senha inválidos.')
          }
        } catch {
          setError('E-mail ou senha inválidos.')
        }
      } else {
        setError('Não foi possível conectar ao servidor. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left: Brand panel ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #071528 0%, #1A3C6E 50%, #0B1F3A 100%)' }}
      >
        {/* Decorative mesh pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(40, 89, 162, 0.4) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(251, 191, 36, 0.3) 0%, transparent 40%),
                              radial-gradient(circle at 60% 80%, rgba(33, 75, 136, 0.3) 0%, transparent 45%)`,
          }}
        />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <Activity className="h-6 w-6 text-brand-300" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">LifeTrigger</h1>
              <p className="text-sm font-medium text-brand-300/80">Engine</p>
            </div>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight text-white">
            Motor de Inteligência<br />
            <span className="text-brand-300">de Proteção de Vida</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-brand-200/70">
            Avaliações automatizadas de seguros de vida com inteligência de mercado para corretores que buscam excelência.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 space-y-4">
            {[
              { icon: ShieldCheck, text: 'Avaliação de cobertura em tempo real' },
              { icon: BarChart2, text: 'Relatórios e insights por cliente' },
              { icon: Zap, text: 'Gatilhos de vida com reavaliação automática' },
            ].map(({ icon: FIcon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <FIcon className="h-4 w-4 text-brand-300" />
                </div>
                <p className="text-sm font-medium text-white/80">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-12 xl:px-16 py-6">
          <p className="text-xs text-brand-400/50">B2B SaaS · Plataforma para corretoras de seguros</p>
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo (hidden on lg) */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">LifeTrigger</h1>
              <p className="mt-0.5 text-sm text-slate-500">Motor de Inteligência de Proteção de Vida</p>
            </div>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-slate-500">Entre com suas credenciais para acessar a plataforma.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-fadeIn" style={{ animationDelay: '50ms' }}>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div className="animate-fadeIn" style={{ animationDelay: '100ms' }}>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Senha</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="animate-fadeIn rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            <div className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-60 transition-all"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </div>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Credenciais de demonstração
              </p>
              <div className="space-y-1">
                {[
                  { role: 'Super Admin',  email: 'superadmin@lifetrigger.io', password: 'Super@123!',  color: 'text-red-500' },
                  { role: 'Proprietário', email: 'owner@alpha.demo',          password: 'Alpha@123!',  color: 'text-purple-500' },
                  { role: 'Gerente',      email: 'manager@alpha.demo',        password: 'Alpha@123!',  color: 'text-blue-500'   },
                  { role: 'Corretor',     email: 'broker@alpha.demo',         password: 'Alpha@123!',  color: 'text-emerald-500' },
                  { role: 'Observador',   email: 'viewer@alpha.demo',         password: 'Alpha@123!',  color: 'text-slate-500'  },
                ].map(({ role, email: demoEmail, password: demoPw, color }) => (
                  <button
                    key={demoEmail}
                    type="button"
                    onClick={() => { setEmail(demoEmail); setPassword(demoPw) }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white transition-colors group"
                  >
                    <span className={`w-20 shrink-0 text-[10px] font-bold ${color}`}>{role}</span>
                    <span className="font-mono text-[11px] text-slate-500 group-hover:text-slate-700 transition-colors truncate">{demoEmail}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
