import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  Activity, Loader2, ShieldCheck, Zap,
  Target, Lightbulb, Users, Lock, TrendingUp, Hash, FlaskConical,
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white">LifeTrigger</h1>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider ring-1 ring-amber-400/30">Demo</span>
              </div>
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
              { icon: ShieldCheck, title: 'Motor Determinístico',     desc: '20 regras tipadas, sem IA — mesmo input, mesmo resultado, sempre' },
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
          <p className="mt-4 text-sm text-brand-200/50 leading-relaxed max-w-sm">
            Registro auditável a cada avaliação. Proteção adequada para seus clientes. Credibilidade que fecha negócios.
          </p>
        </div>

        <div className="relative z-10 px-12 xl:px-16 2xl:px-20 py-6 border-t border-white/5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-brand-400/50">LifeTrigger Engine v1.0.0 · <span className="text-amber-400/70 font-semibold">Versão Demonstração</span></p>
            <p className="text-xs text-brand-300/60">
              Desenvolvido por <span className="font-semibold text-brand-300/80">AllTask Soluções Integradas</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo (hidden on lg) */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">LifeTrigger</h1>
              <p className="mt-0.5 text-sm text-slate-500">Motor de Inteligência de Proteção de Vida</p>
              <span className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider">Demo</span>
            </div>
          </div>

          {/* Demo banner */}
          <div className="mb-6 animate-fadeIn rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100">
                <FlaskConical className="h-3.5 w-3.5 text-brand-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-brand-900 uppercase tracking-wide">Ambiente de Demonstração</p>
                <p className="text-[10px] text-brand-500">Dados fictícios · Redefinidos periodicamente</p>
              </div>
            </div>
            <p className="text-[12px] text-brand-700 leading-relaxed">
              Explore todas as funcionalidades do <strong>LifeTrigger Engine</strong> livremente.
              Este ambiente é para demonstração — navegue sem compromisso.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-100/60 px-3 py-2.5">
              <span className="text-[11px] text-brand-700">Quer contratar?</span>
              <a
                href="mailto:alltasksolucoesintegradas@gmail.com"
                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
              >
                Fale conosco
              </a>
            </div>
          </div>

          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Explore a plataforma</h2>
            <p className="mt-1 text-sm text-slate-500">Escolha um perfil abaixo e veja o motor em ação — sem compromisso.</p>
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


          {/* Demo quick-access */}
          <div className="mt-5 animate-fadeIn" style={{ animationDelay: '220ms' }}>
            <div className="rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-100">
                  <Zap className="h-3.5 w-3.5 text-accent-600" />
                </div>
                <p className="text-xs font-bold text-accent-900 uppercase tracking-wide">Acesso rápido à demonstração</p>
              </div>
              <p className="text-[12px] text-accent-700 leading-relaxed mb-3">
                Clique em um dos perfis abaixo para <strong>entrar automaticamente</strong> na plataforma e explorar todas as funcionalidades.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'Proprietário', desc: 'Gestão completa da corretora', email: 'owner@alpha.demo',   password: 'Alpha@123!', iconBg: 'bg-purple-100',  iconText: 'text-purple-600',  hoverBorder: 'hover:border-purple-300', hoverBg: 'hover:bg-purple-50' },
                  { role: 'Gerente',      desc: 'Equipe, relatórios e motor',   email: 'manager@alpha.demo', password: 'Alpha@123!', iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    hoverBorder: 'hover:border-blue-300',   hoverBg: 'hover:bg-blue-50' },
                  { role: 'Corretor',     desc: 'Avaliações, clientes e gatilhos', email: 'broker@alpha.demo', password: 'Alpha@123!', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', hoverBorder: 'hover:border-emerald-300', hoverBg: 'hover:bg-emerald-50' },
                  { role: 'Observador',   desc: 'Apenas visualização (read-only)', email: 'viewer@alpha.demo', password: 'Alpha@123!', iconBg: 'bg-slate-100',   iconText: 'text-slate-600',   hoverBorder: 'hover:border-slate-300',  hoverBg: 'hover:bg-slate-50' },
                ].map(({ role, desc, email: demoEmail, password: demoPw, iconBg, iconText, hoverBorder, hoverBg }) => (
                  <button
                    key={demoEmail}
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setEmail(demoEmail)
                      setPassword(demoPw)
                      setError(null)
                      setLoading(true)
                      try {
                        await login(demoEmail, demoPw)
                        navigate('/', { replace: true })
                      } catch {
                        setError('Não foi possível conectar. Tente novamente.')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className={`group relative rounded-xl border border-slate-200 bg-white p-3 text-left ${hoverBorder} ${hoverBg} hover:shadow-md transition-all duration-200 disabled:opacity-60 cursor-pointer`}
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                        <span className={`text-xs font-bold ${iconText}`}>{role[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">{role}</p>
                        <p className="text-[10px] text-slate-400 leading-snug">{desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 rounded-md bg-brand-50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Zap className="h-3 w-3 text-brand-500" />
                      <span className="text-[10px] font-semibold text-brand-600">Clique para entrar como {role}</span>
                    </div>
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
