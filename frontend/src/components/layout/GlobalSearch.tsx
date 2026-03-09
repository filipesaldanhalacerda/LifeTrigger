import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, LayoutDashboard, FilePlus, Settings,
  Shield, Cpu, Users, BarChart2, UserCheck, CreditCard, BookOpen,
  Zap, FileText, ArrowRight, Building2, Eye, HeartPulse, BarChart3,
  Hash, CornerDownLeft,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getEvaluations, getUsers } from '../../lib/api'
import { formatDate, actionLabel, riskLabel, evalStatusLabel } from '../../lib/utils'
import type { UserRole } from '../../contexts/AuthContext'
import type { EvaluationSummary, UserRecord } from '../../types/api'

// ── Static page definitions ─────────────────────────────────────
interface PageItem {
  label: string
  path: string
  icon: React.ElementType
  keywords: string[]
  minRole?: UserRole
  tenantOnly?: boolean
}

const PAGES: PageItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, keywords: ['dashboard', 'inicio', 'home', 'painel', 'visão geral'], tenantOnly: true },
  { label: 'Nova Avaliação', path: '/evaluations/new', icon: FilePlus, keywords: ['nova', 'avaliação', 'avaliar', 'criar', 'formulário'], minRole: 'Broker', tenantOnly: true },
  { label: 'Meus Clientes', path: '/clients', icon: UserCheck, keywords: ['clientes', 'meus', 'consentid', 'carteira', 'histórico', 'avaliações', 'lista', 'consultar'], tenantOnly: true },
  { label: 'Gatilhos de Vida', path: '/triggers/new', icon: Zap, keywords: ['gatilho', 'trigger', 'evento', 'vida', 'casamento', 'filho'], minRole: 'Broker', tenantOnly: true },
  { label: 'Gestão de Equipe', path: '/team', icon: Users, keywords: ['equipe', 'time', 'usuários', 'gerenciar', 'criar usuário'], minRole: 'Manager', tenantOnly: true },
  { label: 'Relatórios', path: '/reports', icon: BarChart2, keywords: ['relatório', 'report', 'análise', 'gerencial', 'dados'], minRole: 'Manager', tenantOnly: true },
  { label: 'Auditoria', path: '/audit', icon: Shield, keywords: ['auditoria', 'integridade', 'hash', 'verificar', 'sha'], minRole: 'Manager', tenantOnly: true },
  { label: 'Motor', path: '/engine', icon: Cpu, keywords: ['motor', 'engine', 'versão', 'saúde', 'status'], minRole: 'Manager', tenantOnly: true },
  { label: 'Configurações', path: '/settings', icon: Settings, keywords: ['configurações', 'settings', 'parâmetros', 'fórmulas'], minRole: 'TenantOwner', tenantOnly: true },
  { label: 'Plano & Faturamento', path: '/billing', icon: CreditCard, keywords: ['plano', 'faturamento', 'billing', 'assinatura', 'pagamento'], minRole: 'TenantOwner', tenantOnly: true },
  { label: 'Guia do Sistema', path: '/guide', icon: BookOpen, keywords: ['guia', 'ajuda', 'documentação', 'manual', 'como usar'] },
  { label: 'Meu Perfil', path: '/profile', icon: UserCheck, keywords: ['perfil', 'conta', 'minha conta', 'email'] },
  // SuperAdmin
  { label: 'Corretoras', path: '/admin/tenants', icon: Building2, keywords: ['corretoras', 'tenants', 'empresas'], minRole: 'SuperAdmin' },
  { label: 'Usuários Globais', path: '/admin/users', icon: Users, keywords: ['usuários globais', 'todos usuários'], minRole: 'SuperAdmin' },
  { label: 'Monitor de Acessos', path: '/admin/access', icon: Eye, keywords: ['monitor', 'acessos', 'login', 'eventos'], minRole: 'SuperAdmin' },
  { label: 'Análise do Motor', path: '/admin/analytics', icon: BarChart3, keywords: ['análise', 'analytics', 'motor'], minRole: 'SuperAdmin' },
  { label: 'Saúde da Plataforma', path: '/admin/health', icon: HeartPulse, keywords: ['saúde', 'health', 'plataforma', 'diagnóstico'], minRole: 'SuperAdmin' },
]

// ── Result types ────────────────────────────────────────────────
interface SearchResult {
  type: 'page' | 'evaluation' | 'user'
  label: string
  subtitle: string
  path: string
  icon: React.ElementType
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  page:       { label: 'Páginas',    color: 'text-brand-600', bg: 'bg-brand-50' },
  evaluation: { label: 'Avaliações', color: 'text-amber-600', bg: 'bg-amber-50' },
  user:       { label: 'Usuários',   color: 'text-blue-600',  bg: 'bg-blue-50' },
}

// ── Component ───────────────────────────────────────────────────
export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()

  const isSuperAdmin = user?.role === 'SuperAdmin'

  // ── Keyboard shortcut (Escape) ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // ── Filter pages by role ──
  const visiblePages = PAGES.filter((p) => {
    if (isSuperAdmin) return p.minRole === 'SuperAdmin' || (!p.minRole && !p.tenantOnly)
    if (p.minRole === 'SuperAdmin') return false
    if (p.tenantOnly && !user?.tenantId) return false
    if (p.minRole && !hasRole(p.minRole)) return false
    return true
  })

  // ── Search logic ──
  const performSearch = useCallback(async (q: string) => {
    const term = q.toLowerCase().trim()
    if (!term) {
      setResults([])
      setLoading(false)
      return
    }

    const allResults: SearchResult[] = []

    // 1. Pages (instant)
    const pageResults = visiblePages
      .filter((p) =>
        p.label.toLowerCase().includes(term) ||
        p.keywords.some((k) => k.includes(term))
      )
      .slice(0, 5)
      .map((p): SearchResult => ({
        type: 'page',
        label: p.label,
        subtitle: p.path,
        path: p.path,
        icon: p.icon,
      }))
    allResults.push(...pageResults)

    // 2. Evaluations (API — only for terms >= 3 chars)
    if (term.length >= 3 && !isSuperAdmin && user?.tenantId) {
      try {
        const res = await getEvaluations(user.tenantId, { limit: 200, offset: 0 })
        const evalResults = res.items
          .filter((ev: EvaluationSummary) =>
            ev.id.toLowerCase().includes(term) ||
            (ev.consentId && ev.consentId.toLowerCase().includes(term)) ||
            actionLabel(ev.action).toLowerCase().includes(term) ||
            riskLabel(ev.risk).toLowerCase().includes(term) ||
            (ev.status && evalStatusLabel(ev.status).toLowerCase().includes(term))
          )
          .slice(0, 6)
          .map((ev: EvaluationSummary): SearchResult => ({
            type: 'evaluation',
            label: `Avaliação ${ev.id.slice(0, 8)}…`,
            subtitle: `${actionLabel(ev.action)} · ${riskLabel(ev.risk)} · Score ${ev.score} · ${formatDate(ev.timestamp)}`,
            path: `/evaluations/${ev.id}`,
            icon: FileText,
          }))
        allResults.push(...evalResults)
      } catch {
        // silently ignore
      }
    }

    // 3. Users (API — Manager+ only, terms >= 2 chars)
    if (term.length >= 2 && hasRole('Manager') && !isSuperAdmin) {
      try {
        const users = await getUsers()
        const userResults = users
          .filter((u: UserRecord) =>
            u.email.toLowerCase().includes(term) ||
            u.role.toLowerCase().includes(term)
          )
          .slice(0, 5)
          .map((u: UserRecord): SearchResult => ({
            type: 'user',
            label: u.email,
            subtitle: `${u.role} · ${u.isActive ? 'Ativo' : 'Inativo'}`,
            path: '/team',
            icon: Users,
          }))
        allResults.push(...userResults)
      } catch {
        // silently ignore
      }
    }

    setResults(allResults)
    setSelectedIdx(0)
    setLoading(false)
  }, [visiblePages, user, hasRole, isSuperAdmin])

  // ── Debounced search ──
  function handleQueryChange(value: string) {
    setQuery(value)
    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(value), 250)
  }

  // ── Navigate to result ──
  function goTo(result: SearchResult) {
    onClose()
    navigate(result.path)
  }

  // ── Keyboard navigation ──
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
      scrollSelectedIntoView(selectedIdx + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
      scrollSelectedIntoView(selectedIdx - 1)
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      goTo(results[selectedIdx])
    }
  }

  function scrollSelectedIntoView(idx: number) {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-search-item]')
    items[idx]?.scrollIntoView({ block: 'nearest' })
  }

  // ── Group results by type ──
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  // Flat index for keyboard navigation
  let flatIdx = 0

  // Quick-access pages when no query
  const quickPages = visiblePages.slice(0, 6)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-slate-900/50 backdrop-blur-[6px] animate-fadeIn"
        onClick={() => onClose()}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[3vh] sm:pt-[10vh] px-3 sm:px-4">
        <div
          className="w-full max-w-[560px] rounded-xl bg-white shadow-elevated overflow-hidden animate-scaleIn max-h-[94vh] sm:max-h-[80vh] flex flex-col"
          style={{
            boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 24px 48px -12px rgba(0,0,0,0.18), 0 8px 16px -4px rgba(0,0,0,0.08)',
          }}
        >

          {/* ── Search input ── */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <Search className="h-[18px] w-[18px] text-brand-500" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="O que você está procurando?"
              className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {query ? (
              <button
                onClick={() => handleQueryChange('')}
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-slate-50/80 px-2 py-1 text-[11px] font-medium text-slate-400 tracking-wide">
                ESC
              </kbd>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-slate-100" />

          {/* ── Results area ── */}
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">

            {/* ── Empty state: quick access ── */}
            {!query && (
              <div className="p-3">
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Acesso rápido
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {quickPages.map((p) => (
                    <button
                      key={p.path}
                      onClick={() => { onClose(); navigate(p.path) }}
                      className="group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 group-hover:bg-brand-50 transition-colors">
                        <p.icon className="h-4 w-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-600 group-hover:text-slate-900 truncate transition-colors">
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Loading ── */}
            {query && loading && (
              <div className="flex items-center justify-center gap-3 px-5 py-10">
                <div className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-brand-500 animate-spin" />
                <p className="text-sm text-slate-400">Buscando…</p>
              </div>
            )}

            {/* ── No results ── */}
            {query && !loading && results.length === 0 && (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Search className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Nenhum resultado encontrado</p>
                <p className="mt-1 text-xs text-slate-400">
                  Tente usar termos diferentes como "avaliação", "equipe" ou "relatório"
                </p>
              </div>
            )}

            {/* ── Grouped results ── */}
            {!loading && Object.entries(grouped).map(([type, items]) => {
              const config = TYPE_CONFIG[type] ?? { label: type, color: 'text-slate-600', bg: 'bg-slate-50' }
              return (
                <div key={type} className="p-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5">
                    <Hash className={`h-3 w-3 ${config.color} opacity-50`} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      {config.label}
                    </p>
                    <span className="text-[10px] font-medium text-slate-300">{items.length}</span>
                  </div>
                  {items.map((item) => {
                    const idx = flatIdx++
                    const isSelected = idx === selectedIdx
                    return (
                      <button
                        key={`${item.type}-${item.path}-${idx}`}
                        data-search-item
                        onClick={() => goTo(item)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-100 ${
                          isSelected
                            ? 'bg-brand-50/80 ring-1 ring-brand-200/50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isSelected ? 'bg-brand-100/80' : 'bg-slate-100/80'
                        }`}>
                          <item.icon className={`h-[18px] w-[18px] transition-colors ${
                            isSelected ? 'text-brand-600' : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-semibold truncate transition-colors ${
                            isSelected ? 'text-brand-700' : 'text-slate-700'
                          }`}>
                            {item.label}
                          </p>
                          <p className={`text-[11px] truncate mt-0.5 transition-colors ${
                            isSelected ? 'text-brand-500/70' : 'text-slate-400'
                          }`}>
                            {item.subtitle}
                          </p>
                        </div>
                        <ArrowRight className={`h-4 w-4 shrink-0 transition-all ${
                          isSelected
                            ? 'text-brand-400 opacity-100 translate-x-0'
                            : 'text-slate-300 opacity-0 -translate-x-1'
                        }`} />
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-slate-200 bg-slate-50/80 px-1 text-[10px] font-medium">↑</kbd>
                <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-slate-200 bg-slate-50/80 px-1 text-[10px] font-medium">↓</kbd>
                <span className="ml-0.5">navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-5 items-center justify-center rounded border border-slate-200 bg-slate-50/80 px-1.5 text-[10px] font-medium">
                  <CornerDownLeft className="h-2.5 w-2.5" />
                </kbd>
                <span className="ml-0.5">abrir</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-5 items-center justify-center rounded border border-slate-200 bg-slate-50/80 px-1.5 text-[10px] font-medium">Esc</kbd>
                <span className="ml-0.5">fechar</span>
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-300 tracking-wide">LifeTrigger Search</p>
          </div>

        </div>
      </div>
    </>
  )
}
