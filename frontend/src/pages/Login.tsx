import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  Activity, Loader2, ShieldCheck, BarChart2, Zap,
  Target, Lightbulb, Users, Lock, TrendingUp, Hash,
} from 'lucide-react'
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
      <div className="relative hidden lg:flex lg:w-[55%] flex-col justify-between overflow-hidden"
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
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16 2xl:px-20">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <Activity className="h-6 w-6 text-brand-300" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">LifeTrigger</h1>
              <p className="text-sm font-medium text-brand-300/80">Engine</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight text-white">
            Pare de vender no achismo.<br />
            <span className="text-accent-400">Venda com inteligência.</span>
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-brand-200/70">
            O motor que transforma dados do cliente em diagnósticos de proteção de vida — com score, gap de cobertura,
            argumentos de venda e insights prontos para usar na conversa. Em segundos, não em horas.
          </p>

          {/* Feature grid */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              { icon: Target,      title: 'Score de Proteção',        desc: 'Nota 0–100 que mostra exatamente quão protegido o cliente está' },
              { icon: TrendingUp,  title: 'Gap de Cobertura',         desc: 'Diferença em R$ entre a cobertura atual e a ideal — o argumento que vende' },
              { icon: Lightbulb,   title: '5 Insights por Avaliação', desc: 'Abertura, argumento, objeção, produto e próximo passo — prontos para usar' },
              { icon: Zap,         title: 'Gatilhos de Vida',         desc: 'Casamento, filho, promoção — eventos que criam oportunidades de recontato' },
              { icon: Users,       title: 'Gestão de Carteira',       desc: 'Visão por cliente com risco, ação e histórico completo de avaliações' },
              { icon: Hash,        title: 'Auditoria Imutável',       desc: 'Hash SHA-256 em cada avaliação — prova técnica que protege você juridicamente' },
              { icon: ShieldCheck, title: 'Motor Determinístico',     desc: '13 regras tipadas, sem IA — mesmo input, mesmo resultado, sempre' },
              { icon: Lock,        title: 'LGPD by Design',           desc: 'Zero dados pessoais na API — apenas perfil anônimo vinculado por Consent ID' },
            ].map(({ icon: FIcon, title, desc }) => (
              <div key={title} className="flex gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 hover:bg-white/[0.07] transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <FIcon className="h-4 w-4 text-accent-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-brand-300/60">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof / CTA */}
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <p className="text-xs font-medium text-brand-300/50 uppercase tracking-wider">Usado por corretoras que vendem mais</p>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <p className="mt-4 text-sm text-brand-200/50 leading-relaxed max-w-lg">
            Cada avaliação gera um registro auditável que comprova sua recomendação técnica.
            Seus clientes recebem proteção adequada. Você constrói credibilidade e fecha mais negócios.
          </p>
        </div>

        <div className="relative z-10 px-12 xl:px-16 2xl:px-20 py-6 border-t border-white/5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-brand-400/50">LifeTrigger Engine v1.0.0</p>
            <p className="text-xs text-brand-400/50">B2B SaaS · Plataforma para corretoras de seguros</p>
          </div>
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo (hidden on lg) */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">LifeTrigger</h1>
              <p className="mt-0.5 text-sm text-slate-500">Motor de Inteligência de Proteção de Vida</p>
            </div>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Acesse sua conta</h2>
            <p className="mt-1 text-sm text-slate-500">Seus diagnósticos, insights e clientes estão esperando.</p>
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
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
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-60 transition-all"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Entrando…' : 'Entrar na plataforma'}
              </button>
            </div>
          </form>

          {/* Value reminder */}
          <div className="mt-6 animate-fadeIn rounded-xl border border-brand-100 bg-brand-50 p-4" style={{ animationDelay: '180ms' }}>
            <div className="flex gap-3">
              <BarChart2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div>
                <p className="text-xs font-semibold text-brand-800">Cada avaliação é uma oportunidade de venda</p>
                <p className="mt-1 text-[11px] text-brand-600 leading-relaxed">
                  O motor gera diagnóstico completo com score, gap em R$, classificação de risco e 5 insights
                  prontos para converter — tudo em milissegundos, com registro auditável.
                </p>
              </div>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-4 animate-fadeIn" style={{ animationDelay: '220ms' }}>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
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
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 transition-colors group"
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
