import { useRef, useState } from 'react'
import {
  BookOpen, Target, Shield, TrendingUp, Users, Zap, BarChart3,
  Cpu, CheckCircle, ChevronDown, ChevronUp,
  Lightbulb, DollarSign, ClipboardCheck, Activity, Eye,
  UserCheck, Settings, CreditCard,
  Lock, Hash, Layers, GitBranch, ShieldCheck, Database,
  Phone, Filter, Send, CalendarClock, Rocket,
  Plug, MessageSquare, Bot, Webhook, Code2, RefreshCcw, FileJson,
  ArrowRight, Repeat, FileCheck,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'

// ── Accordion ───────────────────────────────────────────────────
function Accordion({ id, title, icon: Icon, children, openId, onToggle }: {
  id: string
  title: string
  icon: React.ElementType
  children: React.ReactNode
  openId: string | null
  onToggle: (id: string) => void
}) {
  const open = openId === id
  const ref = useRef<HTMLDivElement>(null)

  function handleToggle() {
    onToggle(id)
    setTimeout(() => {
      if (!ref.current) return
      const top = ref.current.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }, 60)
  }

  return (
    <div ref={ref} className="box scroll-mt-[5rem]">
      <button
        onClick={handleToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100/80">
          <Icon className="h-4 w-4 text-brand-600" />
        </div>
        <span className="flex-1 text-sm font-semibold text-slate-900">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-4">{children}</div>}
    </div>
  )
}

// ── Section Label ────────────────────────────────────────────────
function SectionLabel({ children, color = 'text-brand-600' }: { children: React.ReactNode; color?: string }) {
  return <p className={`mb-3 text-xs font-semibold uppercase tracking-wider ${color}`}>{children}</p>
}

// ── Info Card (icon + title + desc) ─────────────────────────────
function InfoCard({ icon: Icon, title, desc, iconBg = 'bg-brand-100/80', iconColor = 'text-brand-600' }: {
  icon: React.ElementType; title: string; desc: string; iconBg?: string; iconColor?: string
}) {
  return (
    <div className="flex gap-3 rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Compact Field (title + desc inline) ─────────────────────────
function FieldRow({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div>
        <p className="text-xs font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

// ── Highlight Box ────────────────────────────────────────────────
function HighlightBox({ icon: Icon, title, children, variant = 'brand' }: {
  icon: React.ElementType; title?: string; children: React.ReactNode
  variant?: 'brand' | 'amber' | 'emerald'
}) {
  const styles = {
    brand:   { border: 'border-brand-100',   bg: 'bg-brand-50/80',   icon: 'text-brand-600',   text: 'text-brand-800' },
    amber:   { border: 'border-amber-200',   bg: 'bg-amber-50/80',   icon: 'text-amber-600',   text: 'text-amber-800' },
    emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50/80', icon: 'text-emerald-600', text: 'text-emerald-800' },
  }
  const s = styles[variant]
  return (
    <div className={`flex gap-3 rounded-sm border ${s.border} ${s.bg} px-4 py-3`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`} />
      <div>
        {title && <p className={`text-sm font-semibold ${s.text}`}>{title}</p>}
        <div className={`${title ? 'mt-0.5 ' : ''}text-xs ${s.text} leading-relaxed`}>{children}</div>
      </div>
    </div>
  )
}

// ── Screen Reference ────────────────────────────────────────────
function ScreenRef({ icon: Icon, name, path, desc }: {
  icon: React.ElementType; name: string; path: string; desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{name}</p>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{path}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Pipeline Phase ──────────────────────────────────────────────
function PipelinePhase({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{n}</span>
      <div>
        <p className="text-xs font-semibold text-slate-700">{title}</p>
        <p className="text-[11px] text-slate-500">{desc}</p>
      </div>
    </div>
  )
}

// ── API Endpoint Row ────────────────────────────────────────────
function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    POST:     'bg-emerald-100 text-emerald-700',
    GET:      'bg-blue-100 text-blue-700',
    'GET/PUT':'bg-violet-100 text-violet-700',
    PATCH:    'bg-amber-100 text-amber-700',
    DELETE:   'bg-red-100 text-red-700',
  }
  return (
    <div className="flex items-start gap-3 rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
      <code className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${colors[method] ?? 'bg-slate-100 text-slate-700'}`}>{method}</code>
      <div>
        <code className="text-xs font-semibold text-slate-800">{path}</code>
        <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────
export default function SystemGuide() {
  const [openId, setOpenId] = useState<string | null>('what')
  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id)

  return (
    <div>
      <TopBar title="Guia do Sistema" subtitle="Entenda o que o LifeTrigger faz e como usar cada funcionalidade" />

      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 animate-fadeIn max-w-4xl">

        {/* ── Hero ── */}
        <div className="box border-l-4 border-l-brand-300">
          <div className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100/80">
                <Activity className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">LifeTrigger Engine</h1>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Motor inteligente de avaliação de seguro de vida para corretoras. Analisa o perfil de cada cliente
                  e entrega em segundos um diagnóstico completo: score de proteção, gap de cobertura, recomendação
                  de ação e insights prontos para usar na conversa com o cliente.
                </p>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Objetivo: <strong className="text-brand-700">ajudar corretores a vender mais e melhor</strong>,
                  com dados concretos e argumentação técnica que transforma uma conversa de vendas em uma consultoria de proteção.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ━━ 1. O QUE O SISTEMA FAZ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="what" title="O que o LifeTrigger faz?" icon={Target} openId={openId} onToggle={toggle}>
          <div className="space-y-5">

            {/* A Dor */}
            <div>
              <SectionLabel color="text-red-500">O Problema</SectionLabel>
              <div className="rounded-sm border border-red-200 bg-red-50/80 px-4 py-3 space-y-2">
                <p className="text-xs text-red-900 leading-relaxed">
                  Hoje, a maioria dos corretores de seguro de vida <strong>vende no achismo</strong>. Não tem ferramenta que diga
                  quanto de cobertura o cliente realmente precisa, nem dados concretos para justificar a recomendação.
                </p>
                <ul className="text-xs text-red-800 space-y-1.5 ml-4 list-disc">
                  <li><strong>Clientes subprotegidos</strong> — famílias que ficariam desamparadas porque o corretor "chutou" um valor</li>
                  <li><strong>Clientes sobresegurados</strong> — pagando prêmio alto demais por cobertura que não precisam</li>
                  <li><strong>Vendas perdidas</strong> — sem argumentos técnicos, o cliente não enxerga valor e não fecha</li>
                  <li><strong>Risco jurídico</strong> — sem registro técnico que comprove a análise feita</li>
                  <li><strong>Zero acompanhamento</strong> — eventos de vida mudam a necessidade, mas o corretor não tem gatilho para retomar</li>
                </ul>
              </div>
            </div>

            {/* A Solução */}
            <div>
              <SectionLabel>A Solução</SectionLabel>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                O LifeTrigger é um <strong>motor de inteligência de proteção de vida</strong> que recebe os dados do cliente
                e devolve uma análise completa em milissegundos. Em vez de achismo, o corretor passa a ter
                <strong> dados concretos, argumentação técnica e registro auditável</strong> de cada recomendação.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard icon={Shield}     title="Score de Proteção (0-100)"  desc="Nota única que resume o quão protegido o cliente está. Quanto maior, melhor a cobertura em relação a necessidade real." iconBg="bg-brand-100/80" iconColor="text-brand-600" />
                <InfoCard icon={DollarSign}  title="Gap de Cobertura"          desc="Diferença exata entre a cobertura atual e a recomendada, em reais e em percentual. Mostra o 'buraco' na proteção." iconBg="bg-red-100/80" iconColor="text-red-500" />
                <InfoCard icon={TrendingUp}  title="Recomendação de Ação"      desc="AUMENTAR, MANTER, REDUZIR ou REVISAR — diretriz clara para o corretor saber o que fazer." iconBg="bg-amber-100/80" iconColor="text-amber-600" />
                <InfoCard icon={BarChart3}   title="Classificação de Risco"    desc="CRITICO, MODERADO ou ADEQUADO — cruza idade, profissão, fumante e dependentes para classificar." iconBg="bg-violet-100/80" iconColor="text-violet-500" />
                <InfoCard icon={Lightbulb}   title="5 Insights por Avaliação"  desc="Abertura de conversa, argumento principal, objeção prevista, produto sugerido e próximo passo." iconBg="bg-sky-100/80" iconColor="text-sky-500" />
                <InfoCard icon={Zap}         title="Gatilhos de Vida"          desc="Casamento, filho, promoção, divórcio — eventos que recalculam a proteção automaticamente." iconBg="bg-emerald-100/80" iconColor="text-emerald-500" />
              </div>
            </div>

            {/* ConsentId e Proteção Jurídica */}
            <div className="rounded-sm border border-brand-200 bg-brand-50/80 px-4 py-3 space-y-2">
              <div className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <p className="text-xs font-semibold text-brand-800">ID de vinculação e proteção jurídica do corretor</p>
              </div>
              <p className="text-[11px] text-brand-700 leading-relaxed">
                Cada avaliação é vinculada a um <strong>Consent ID</strong> — identificador único que conecta a análise ao cliente
                no sistema do corretor. O LifeTrigger <strong>não armazena nome, CPF, email nem qualquer dado pessoal</strong>.
                Apenas dados demográficos anonimizados (idade, faixa de renda, quantidade de dependentes).
              </p>
              <p className="text-[11px] text-brand-700 leading-relaxed">
                Cada avaliação gera um registro imutável com hash SHA-256, timestamp, versão do motor e resultado completo.
                Se no futuro houver qualquer questionamento, o corretor tem uma <strong>prova técnica auditável</strong> de que
                a análise foi feita com base em dados concretos e regras determinísticas — sem possibilidade de adulteração.
              </p>
              <p className="text-[11px] text-brand-700 leading-relaxed">
                <strong>Você mantém o controle dos dados do seu cliente; nós fornecemos a inteligência técnica e o registro de prova.</strong>
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 2. COMO FUNCIONA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="how" title="Como funciona na prática?" icon={ClipboardCheck} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              O fluxo de trabalho do corretor segue 4 passos simples:
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { n: 1, title: 'Coleta dos dados', desc: 'Formulário guiado em 4 etapas (Pessoal, Financeiro, Família, Operacional) com validação em tempo real e formatação BRL automática.' },
                { n: 2, title: 'Motor processa', desc: 'Mais de 30 regras determinísticas cruzadas em milissegundos. Mesmo input, mesmo resultado — sempre.' },
                { n: 3, title: 'Resultado completo', desc: 'Score, gap, ação, justificativas e 5 insights prontos para usar na conversa com o cliente.' },
                { n: 4, title: 'Histórico e acompanhamento', desc: 'Todas as avaliações ficam salvas com hash de auditoria imutável. Consulte e acompanhe a evolução.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-3 rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{n}</div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <HighlightBox icon={Zap} title="Gatilhos de Vida" variant="amber">
              O corretor pode registrar <strong>eventos de vida</strong> (casamento, filho, promoção, divórcio, aposentadoria).
              O motor recalcula a proteção com base no evento e gera nova recomendação — abordagem proativa com dados concretos.
            </HighlightBox>
          </div>
        </Accordion>

        {/* ━━ 3. POTÊNCIA DO MOTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="engine-power" title="Potência do motor: determinismo, complexidade e auditoria" icon={Cpu} openId={openId} onToggle={toggle}>
          <div className="space-y-5">
            <p className="text-xs text-slate-600 leading-relaxed">
              O LifeTrigger é um <strong>motor de regras determinístico de alta complexidade</strong>, projetado para
              entregar diagnósticos de grau institucional com a robustez que seguradoras e auditorias exigem.
            </p>

            {/* Determinismo */}
            <div>
              <SectionLabel>Motor 100% Determinístico</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={GitBranch} title="Zero aleatoriedade">
                  Sem IA, sem machine learning, sem heurísticas probabilísticas. Regras determinísticas puras: mesmo input = mesmo output, sempre, em qualquer servidor. Reprodutibilidade total.
                </HighlightBox>
                <HighlightBox icon={ShieldCheck} title="Regras versionadas e rastreadas">
                  Cada avaliação registra <code className="text-brand-600 bg-slate-100 px-1 rounded">engineVersion</code>,{' '}
                  <code className="text-brand-600 bg-slate-100 px-1 rounded">ruleSetVersion</code> e{' '}
                  <code className="text-brand-600 bg-slate-100 px-1 rounded">ruleSetHash</code>. Se as regras mudarem, você verifica com qual versão cada diagnóstico foi produzido.
                </HighlightBox>
              </div>
            </div>

            {/* Pipeline de 6 fases */}
            <div>
              <SectionLabel>Pipeline de Cálculo (6 Fases)</SectionLabel>
              <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3 space-y-2.5">
                <PipelinePhase n={1} title="Substituição de Renda" desc="Calcula quantos anos de renda a família precisa (2-10 anos), com bonificação por dependente (até +3), limitada por teto configurável." />
                <PipelinePhase n={2} title="Quitação de Dívidas" desc="Soma o saldo total de dívidas para garantir que a cobertura cubra 100% dos débitos pendentes." />
                <PipelinePhase n={3} title="Reserva de Transição" desc="Adiciona colchão de segurança (3-9 meses de renda), descontando reserva existente. Clampeado por limites rígidos." />
                <PipelinePhase n={4} title="Guardrails (Teto e Piso)" desc="Cobertura recomendada nunca fica abaixo de 3x nem acima de 20x a renda anual (configurável por tenant). Evita recomendações absurdas." />
                <PipelinePhase n={5} title="Score + Penalidades" desc="Protection Score (razão cobertura/necessidade) com 3 penalidades independentes: dependentes subprotegidos (-10), dívida alta (-10), sem reserva (-10)." />
                <PipelinePhase n={6} title="Overrides de Ação + Insights" desc={`Verifica condições especiais (revisão > 12 meses, dados não confirmados, gatilho recente) que forçam REVISAR. Gera 5 insights personalizados.`} />
              </div>
              <div className="mt-2 rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>20 regras catalogadas</strong> em enum fortemente tipado (<code className="text-brand-600 bg-slate-100 px-1 rounded">EngineRuleId</code>),
                  cada uma com template de justificativa e rastreabilidade completa. Nenhuma "string mágica" — tudo validado em compilação.
                </p>
              </div>
            </div>

            {/* Tipos de Apólice */}
            <div>
              <SectionLabel>Tipos de Apólice e Cobertura Efetiva</SectionLabel>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                O motor reconhece diferentes tipos de apólice e aplica percentuais de cobertura efetiva:
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800">Individual / Famíliar</p>
                  <p className="text-[11px] text-slate-500">100% da cobertura contabilizada</p>
                </div>
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800">Grupo Empresarial</p>
                  <p className="text-[11px] text-slate-500">100% contabilizado, mas sinaliza risco de portabilidade (vinculado ao emprego)</p>
                </div>
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800">Acidentes Pessoais (AP)</p>
                  <p className="text-[11px] text-slate-500">Apenas 25% contabilizado — não cobre morte natural</p>
                </div>
              </div>
              <div className="mt-2 rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold text-slate-800">Prestamista</p>
                <p className="text-[11px] text-slate-500">0% contabilizado — cobertura vinculada ao financiamento, não protege a família</p>
              </div>
            </div>

            {/* Composição da Cobertura Recomendada */}
            <div>
              <SectionLabel>Composição da Cobertura Recomendada (6 Componentes)</SectionLabel>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                O valor final de cobertura recomendada é composto por até 6 parcelas independentes:
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { title: 'Substituição de Renda',  desc: 'Anos de renda necessários para a família manter o padrão de vida.' },
                  { title: 'Quitação de Dívidas',     desc: 'Saldo total de dívidas para garantir quitação integral.' },
                  { title: 'Reserva de Transição',    desc: 'Colchão de meses de renda para adaptação, menos reserva existente.' },
                  { title: 'Educação dos Filhos',      desc: 'Custo estimado de educação por dependente menor de idade.' },
                  { title: 'ITCMD / Inventário',       desc: 'Custos estimados de inventário e impostos sobre herança.' },
                  { title: 'Custos de Inventário',     desc: 'Percentual configurável sobre patrimônio para custos legais.' },
                ].map(({ title, desc }) => (
                  <div key={title} className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-800">{title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Auditoria e Integridade */}
            <div>
              <SectionLabel>Auditoria e Integridade</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard icon={Hash}     title="Hash SHA-256 Imutável"    desc="Cada avaliação recebe hash criptográfico na criação. Qualquer alteração posterior invalida o hash. Verificável na tela de Auditoria." iconBg="bg-violet-100/80" iconColor="text-violet-500" />
                <InfoCard icon={Layers}   title="Snapshot Completo"        desc="Congela regras aplicadas, justificativas, versão do motor e timestamp. A 'foto' jurídica do momento da avaliação." iconBg="bg-brand-100/80" iconColor="text-brand-600" />
                <InfoCard icon={Lock}     title="Imutabilidade por Design" desc="Avaliações salvas NUNCA são alteradas. Parâmetros mudam? Avaliações anteriores mantém resultado original." iconBg="bg-red-100/80" iconColor="text-red-500" />
                <InfoCard icon={Database} title="Isolamento Multi-Tenant"  desc="Cada corretora em silo isolado via tenant_id no JWT. Impossível que dados vazem entre corretoras." iconBg="bg-sky-100/80" iconColor="text-sky-500" />
              </div>
            </div>

            {/* Segurança */}
            <div>
              <SectionLabel>Segurança em Camadas</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={ShieldCheck} variant="emerald">
                  <strong>JWT com refresh automático:</strong> tokens de curta duração com renovação transparente.
                  4 níveis de role cumulativo. Sem token válido, a API recusa 100% das chamadas.
                </HighlightBox>
                <HighlightBox icon={Shield} variant="emerald">
                  <strong>Zero dados pessoais na API:</strong> sem nome, CPF ou email. Apenas dados demográficos anonimizados.
                  LGPD by design — não há dados pessoais para vazar.
                </HighlightBox>
                <HighlightBox icon={Lock} variant="emerald">
                  <strong>Consentimento obrigatório:</strong> toda avaliação exige{' '}
                  <code className="bg-emerald-100 px-1 rounded">hasExplicitActiveConsent=true</code> e{' '}
                  <code className="bg-emerald-100 px-1 rounded">consentId</code> válido. Sem bypass.
                </HighlightBox>
                <HighlightBox icon={Database} variant="emerald">
                  <strong>Guardrails contra manipulação:</strong> parâmetros configurados pelo tenant são clampeados por limites rígidos
                  no código-fonte. Mesmo valores extremos são travados por teto e piso de segurança.
                </HighlightBox>
              </div>
            </div>

            <div className="rounded-sm border border-brand-200 bg-brand-50/80 px-4 py-3">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Em resumo:</strong> precisão de um motor determinístico + rastreabilidade de sistema de auditoria +
                segurança de arquitetura zero-trust. Cada avaliação é reproduzível, verificável, imutável e segregada.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 4. TELAS DO SISTEMA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="screens" title="Telas do sistema" icon={Eye} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada perfil de usuário vê um conjunto diferente de telas. Abaixo está o mapa completo:
            </p>

            <div>
              <SectionLabel>Área Principal</SectionLabel>
              <div className="space-y-2">
                <ScreenRef icon={BarChart3}      name="Dashboard"              path="/"                 desc="Visão consolidada: anel de saúde da carteira, barra de portfólio por status (aberta/convertida/parcial/arquivada), 4 indicadores-chave, atividades recentes com progress bar de score e status." />
                <ScreenRef icon={ClipboardCheck}  name="Nova Avaliação"         path="/evaluations/new"  desc="Formulário guiado em 4 etapas com validação em tempo real, formatação BRL e indicador de progresso." />
                <ScreenRef icon={Zap}             name="Gatilhos de Vida"       path="/triggers/new"     desc="Registro de eventos de vida vinculados a uma avaliação base. Motor recalcula considerando o impacto." />
                <ScreenRef icon={BookOpen}         name="Histórico de Avaliações" path="/evaluations"     desc="Lista paginada com filtros avançados: período por data, pills de status (Aberto/Convertido/Parcial/Arquivado), dropdowns de ação, risco e tipo. Cada linha mostra ação, risco, score, gap e status." />
                <ScreenRef icon={UserCheck}        name="Meus Clientes"          path="/clients"         desc="Visão agrupada por consentId, mostrando o histórico de avaliações de cada cliente." />
              </div>
            </div>

            <div>
              <SectionLabel>Administração</SectionLabel>
              <div className="space-y-2">
                <ScreenRef icon={Users}      name="Gestão de Equipe"   path="/team"      desc="Criar, ativar/desativar usuários e alterar perfis. Filtros por status (ativo/inativo), role com contadores e busca por nome/email." />
                <ScreenRef icon={BarChart3}  name="Relatórios"         path="/reports"   desc="Relatório agregado: total de avaliações, distribuição por risco e ação, gatilhos disparados." />
                <ScreenRef icon={Shield}     name="Auditoria"          path="/audit"     desc="Verificação de integridade: compara hash armazenado com hash recalculado." />
                <ScreenRef icon={Cpu}        name="Motor"              path="/engine"    desc="Status do motor: saúde, versão, ruleset e endpoints disponíveis." />
                <ScreenRef icon={Settings}   name="Configurações"      path="/settings"  desc="Parâmetros do motor: multiplicadores de renda, reserva de emergência, limite de cobertura." />
                <ScreenRef icon={CreditCard} name="Plano e Faturamento" path="/billing"  desc="Plano contratado, uso da plataforma e gestão de assinatura." />
              </div>
            </div>

          </div>
        </Accordion>

        {/* ━━ 5. PERFIS DE ACESSO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="roles" title="Perfis de acesso (Roles)" icon={Users} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              4 perfis <strong>cumulativos</strong> — cada perfil inclui todas as permissões dos perfis abaixo dele:
            </p>

            <div className="space-y-2">
              {[
                { role: 'Proprietário', level: 4, color: 'bg-purple-600', desc: 'Dono da corretora. Configurações do motor (fórmulas) e plano/faturamento. Controle total da operação.' },
                { role: 'Gerente',      level: 3, color: 'bg-blue-600',   desc: 'Gestor de equipe. Relatórios agregados, auditoria e acesso ao motor. Vê todas as avaliações da corretora.' },
                { role: 'Corretor',     level: 2, color: 'bg-emerald-600',desc: 'Operacional. Cria avaliações, registra gatilhos, consulta clientes. Vê apenas suas avaliações.' },
                { role: 'Observador',   level: 1, color: 'bg-slate-500',  desc: 'Visualização apenas. Dashboard (sem ações), histórico e perfil. Ideal para auditores.' },
              ].map(({ role, level, color, desc }) => (
                <div key={role} className="flex items-start gap-3 rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold text-white ${color}`}>{role}</span>
                    <span className="text-[10px] font-mono text-slate-400">Lv {level}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Hierarquia cumulativa:</strong> Proprietário (4) {'>'} Gerente (3) {'>'} Corretor (2) {'>'} Observador (1).
                Não é preciso atribuir múltiplos roles — um nível inclui todos os anteriores.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 6. RESULTADO DA AVALIAÇÃO ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="result" title="Entendendo o resultado da avaliação" icon={CheckCircle} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              O motor retorna um conjunto completo de informações. Aqui está o significado de cada campo:
            </p>

            {/* Métricas numéricas */}
            <div>
              <SectionLabel>Métricas Numéricas</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FieldRow icon={Shield} title="Score de Proteção (0-100)">
                  Nota que resume a adequação da cobertura. Acima de 70 é saudável. Abaixo de 45 requer atenção.
                </FieldRow>
                <FieldRow icon={Target} title="Eficiência de Cobertura (0-100)">
                  Quão bem a cobertura atual se aproxima da ideal. 100 = perfeito. Acima = sobresegurado.
                </FieldRow>
                <FieldRow icon={DollarSign} title="Gap de Proteção (R$ e %)">
                  Diferença entre a cobertura recomendada e a atual. Positivo = subprotegido. Negativo = sobresegurado.
                </FieldRow>
              </div>
            </div>

            {/* Classificações */}
            <div>
              <SectionLabel>Classificações</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800 mb-2">Ação Recomendada</p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500"><strong className="text-amber-600">AUMENTAR</strong> — cobertura insuficiente, ampliar apólice</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-emerald-600">MANTER</strong> — cobertura adequada, revisão periódica</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-blue-600">REDUZIR</strong> — cobertura excessiva, otimizar prêmio</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-violet-600">REVISAR</strong> — dados incompletos ou situação atípica</p>
                  </div>
                </div>
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800 mb-2">Classificação de Risco</p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500"><strong className="text-red-600">CRITICO</strong> — alta vulnerabilidade, atenção imediata</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-amber-600">MODERADO</strong> — proteção parcial, melhorias recomendadas</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-emerald-600">ADEQUADO</strong> — proteção alinhada com o perfil</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div>
              <SectionLabel>5 Insights para o Corretor</SectionLabel>
              <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {[
                    { title: 'Abertura',            desc: 'Frase para iniciar a conversa' },
                    { title: 'Argumento Principal',  desc: 'Dado mais forte para convencer' },
                    { title: 'Objeção Prevista',     desc: 'Questão provável e contra-argumento' },
                    { title: 'Produto Sugerido',     desc: 'Tipo de apólice mais indicado' },
                    { title: 'Próximo Passo',        desc: 'Ação concreta após a conversa' },
                  ].map(({ title, desc }) => (
                    <div key={title} className="text-center p-2 rounded-sm bg-white/80 border border-slate-100">
                      <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">{title}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Accordion>

        {/* ━━ 7. STATUS E ACOMPANHAMENTO ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="status" title="Status de avaliação e acompanhamento" icon={Repeat} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada avaliação possui um <strong>status de acompanhamento</strong> que permite ao corretor controlar
              o progresso comercial após o diagnóstico técnico. O status é independente da ação recomendada pelo motor.
            </p>

            <div>
              <SectionLabel>4 Status Disponíveis</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3 flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Aberto</p>
                    <p className="text-[11px] text-slate-500">Status inicial. Avaliação realizada, aguardando ação do corretor.</p>
                  </div>
                </div>
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3 flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Convertido</p>
                    <p className="text-[11px] text-slate-500">Cliente contratou a cobertura recomendada. Venda concluída com sucesso.</p>
                  </div>
                </div>
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3 flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Convertido Parcial</p>
                    <p className="text-[11px] text-slate-500">Cliente contratou cobertura, mas abaixo do recomendado. Oportunidade de upsell futura.</p>
                  </div>
                </div>
                <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3 flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-300 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Arquivado</p>
                    <p className="text-[11px] text-slate-500">Avaliação descartada ou cliente desistiu. Pode ser reaberta se necessário.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>Como Usar</SectionLabel>
              <div className="space-y-2">
                <HighlightBox icon={FileCheck} title="Atualize na tela de detalhe">
                  Abra qualquer avaliação e altere o status no topo da página. Adicione notas opcionais para registrar contexto.
                </HighlightBox>
                <HighlightBox icon={BarChart3} title="Acompanhe pelo Dashboard">
                  A barra de portfólio mostra a distribuição por status em tempo real. A taxa de conversão é calculada automaticamente.
                  Filtre o histórico por status para focar nas avaliações que precisam de atenção.
                </HighlightBox>
              </div>
            </div>

            <div className="rounded-sm border border-brand-200 bg-brand-50/80 px-4 py-3">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Importante:</strong> o status é comercial, não técnico. A ação recomendada (AUMENTAR, MANTER, REDUZIR, REVISAR)
                é o que o motor sugere. O status é o que o corretor registra como resultado da abordagem comercial.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 8. CONFIGURAÇÕES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="settings" title="Configurações personalizáveis" icon={Settings} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada corretora personaliza as fórmulas do motor para adaptar a sua estratégia comercial:
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { title: 'Substituição de Renda (Solteiro)',         desc: 'Anos de renda para pessoa sem dependentes. Padrão: 3 anos.' },
                { title: 'Substituição de Renda (Com Dependentes)',  desc: 'Anos de renda com dependentes. Padrão: 5 anos. Mais alto = mais conservador.' },
                { title: 'Buffer de Reserva de Emergência',          desc: 'Meses de renda como colchão de segurança. Padrão: 6 meses.' },
                { title: 'Limite Máximo de Cobertura',                desc: 'Teto em múltiplos de renda anual. Evita recomendações irreais. Padrão: 20x.' },
                { title: 'Mínimo de Cobertura (Renda Anual)',         desc: 'Piso mínimo em múltiplos de renda anual. Padrão: 3x.' },
                { title: 'Máximo de Anos de Substituição',            desc: 'Limite superior de anos para cálculo de substituição de renda. Padrão: 10 anos.' },
                { title: 'Taxa de Inventário (ITCMD)',                desc: 'Percentual usado para estimar custos de inventário e ITCMD. Padrão: 8%.' },
              ].map(({ title, desc }) => (
                <div key={title} className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-sm border border-brand-200 bg-brand-50/80 px-4 py-3">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Dica:</strong> alterações impactam apenas avaliações futuras. Avaliações já realizadas mantém
                o resultado original (imutável). Use a simulação ao vivo na tela de Configurações para testar antes de salvar.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 9. SEGURANÇA E LGPD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="security" title="Segurança, LGPD e Conformidade" icon={Shield} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Projetado com segurança e conformidade desde o primeiro dia:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard icon={Shield}      title="Sem Dados Pessoais na API"  desc="Sem nome, CPF ou qualquer PII. Apenas perfil demográfico anonimizado. LGPD by design." iconBg="bg-brand-100/80" iconColor="text-brand-600" />
              <InfoCard icon={CheckCircle} title="Consentimento Obrigatório"  desc="Toda avaliação exige consentimento ativo + consentId. Sem consentimento, a API recusa." iconBg="bg-emerald-100/80" iconColor="text-emerald-500" />
              <InfoCard icon={Hash}        title="Audit Hash Imutável"       desc="SHA-256 na criação. Qualquer alteração quebra o hash — detectável na tela de Auditoria." iconBg="bg-violet-100/80" iconColor="text-violet-500" />
              <InfoCard icon={Database}    title="Isolamento Multi-tenant"   desc="Cada corretora em isolamento total. Avaliações, usuários e configurações segregados por tenant." iconBg="bg-sky-100/80" iconColor="text-sky-500" />
            </div>
          </div>
        </Accordion>

        {/* ━━ 10. DICAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="tips" title="Dicas para tirar o máximo do LifeTrigger" icon={Lightbulb} openId={openId} onToggle={toggle}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { title: 'Preencha todos os campos', desc: 'Quanto mais dados, mais preciso o diagnóstico. Dívida zerada vs. vazia muda a recomendação. Dados incompletos geram REVISAR.' },
              { title: 'Use os Insights na conversa', desc: 'Os 5 insights são gerados para o perfil específico. A Abertura inicia a conversa. A Objeção Prevista prepara você para a resistência.' },
              { title: 'Registre Gatilhos de Vida', desc: 'Casamento, filho ou promoção? Registre o evento para novo diagnóstico e oportunidade natural de contato.' },
              { title: 'Acompanhe o Dashboard', desc: 'A barra de saúde da carteira é o termômetro da operação. Score médio caindo? Hora de revisitar clientes com ação AUMENTAR.' },
              { title: 'Mostre o resultado ao cliente', desc: 'O Score de Proteção é visual e fácil de entender. Dados concretos vendem mais que argumentos abstratos.' },
            ].map(({ title, desc }) => (
              <HighlightBox key={title} icon={ArrowRight} title={title} variant="emerald">
                {desc}
              </HighlightBox>
            ))}
          </div>
        </Accordion>

        {/* ━━ 11. ESTRATÉGIAS DE VENDA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="sales" title="Estratégias de venda, recontato e captação" icon={Rocket} openId={openId} onToggle={toggle}>
          <div className="space-y-5">
            <p className="text-xs text-slate-600 leading-relaxed">
              O LifeTrigger é uma <strong>plataforma de inteligência comercial</strong> que ajuda o corretor a vender mais,
              no momento certo, com os argumentos certos.
            </p>

            {/* 1. Gatilhos para retorno de contato */}
            <div>
              <SectionLabel>1. Gatilhos para Retornar Contato</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={Phone} title="Eventos de vida como gatilho">
                  <strong>7 tipos de gatilhos</strong> (casamento, filho, imóvel, salário, divórcio, aposentadoria, personalizado).
                  Cada um gera nova avaliação com diagnóstico atualizado — motivo concreto para retomar contato.
                </HighlightBox>
                <HighlightBox icon={CalendarClock} title="Revisão anual automática">
                  Avaliações com mais de 12 meses recebem ação <strong>REVISAR</strong> automaticamente.
                  O insight PROXIMO_PASSO sugere agendar revisão e perguntar sobre mudanças de vida.
                </HighlightBox>
              </div>
              <div className="mt-3">
                <HighlightBox icon={Rocket} title="Em breve no roadmap" variant="amber">
                  Notificações automáticas por email/push quando avaliação completar 12 meses.
                  Lembretes programados para datas de gatilhos futuros. Alerta proativo quando score da carteira cair.
                </HighlightBox>
              </div>
            </div>

            {/* 2. Questionário */}
            <div>
              <SectionLabel>2. Questionário de Atualização</SectionLabel>
              <div className="space-y-3">
                <HighlightBox icon={ClipboardCheck} title="Formulário completo de avaliação">
                  <strong>4 etapas guiadas</strong> (Pessoal, Financeiro, Família, Operacional) com validação em tempo real
                  e formatação automática. Preencha junto com o cliente em atendimento presencial ou por telefone.
                </HighlightBox>
                <HighlightBox icon={Send} title="Em breve no roadmap" variant="amber">
                  Link compartilhável por WhatsApp/email para que o <strong>próprio cliente preencha</strong> o questionário.
                  Vinculado ao consentId, sem login, dispara avaliação automaticamente com notificação para o corretor.
                </HighlightBox>
              </div>
            </div>

            {/* 3. Filtragem de leads */}
            <div>
              <SectionLabel>3. Filtragem de Leads e Insights de Venda</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={Filter} title="Identifique oportunidades">
                  <strong>Meus Clientes</strong> agrupa avaliações por consentId com risco, ação e score.
                  <strong> Dashboard</strong> mostra distribuição consolidada — veja quantos clientes precisam de atenção.
                </HighlightBox>
                <HighlightBox icon={Lightbulb} title="5 insights por avaliação">
                  Abertura, argumento, objeção, produto e próximo passo — personalizados para cada perfil,
                  calibrados para <strong>maximizar a conversão</strong>.
                </HighlightBox>
              </div>
              <div className="mt-3">
                <HighlightBox icon={TrendingUp} title="Em breve no roadmap" variant="amber">
                  Filtros avançados por ação, score e risco. Ranking de oportunidades por potencial de conversão.
                  Painel de "leads quentes" no Dashboard. Exportação para CRM externo.
                </HighlightBox>
              </div>
            </div>

            <div className="rounded-sm border border-brand-200 bg-brand-50/80 px-4 py-3">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Resumo:</strong> gatilhos de vida, revisão anual automática, formulário completo, visão por cliente
                e 5 insights personalizados já disponíveis. Funcionalidades marcadas "Em breve" expandirão a plataforma para
                uma <strong>central completa de inteligência comercial</strong>.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 12. API E INTEGRAÇÕES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="api" title="API 100% integrável — conecte a qualquer sistema" icon={Plug} openId={openId} onToggle={toggle}>
          <div className="space-y-5">
            <p className="text-xs text-slate-600 leading-relaxed">
              O LifeTrigger tem <strong>API REST completa</strong> integrável a qualquer sistema: CRM, ERP, chatbot, WhatsApp, app mobile ou plataforma própria.
              Tudo o que o frontend faz, a API faz programaticamente.
            </p>

            {/* Endpoints */}
            <div>
              <SectionLabel>Endpoints Disponíveis</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <EndpointRow method="POST" path="/api/v1/evaluations"                       desc="Envia dados do cliente, recebe diagnóstico completo com score, gap, ação e insights." />
                <EndpointRow method="POST" path="/api/v1/triggers"                          desc="Registra gatilho de vida e recebe avaliação recalculada." />
                <EndpointRow method="GET"  path="/api/v1/evaluations"                       desc="Lista avaliações com paginação e filtros por data." />
                <EndpointRow method="GET"  path={'/api/v1/evaluations/{id}'}                desc="Registro completo: request, resultado, justificativas e auditoria." />
                <EndpointRow method="PATCH" path={'/api/v1/evaluations/{id}/status'}        desc="Atualiza status comercial (Aberto, Convertido, Parcial, Arquivado) com notas opcionais." />
                <EndpointRow method="GET"  path={'/api/v1/admin/audit/evaluations/{id}/verify'} desc="Verifica integridade criptográfica (SHA-256). PASS ou FAIL." />
                <EndpointRow method="GET"  path="/api/v1/admin/reports/pilot"                desc="Relatório agregado: distribuição por risco, ação e gatilhos." />
                <EndpointRow method="GET/PUT" path={'/api/v1/admin/tenants/{id}/settings'}  desc="Consulta e atualiza parâmetros do motor via API." />
                <EndpointRow method="GET"  path="/api/v1/engine/versions"                   desc="Versão do motor e ruleset. Health check e monitoramento." />
              </div>
            </div>

            {/* Características técnicas */}
            <div>
              <SectionLabel>Características Técnicas</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { icon: FileJson,   title: 'REST + JSON',         desc: 'Qualquer linguagem: Python, Node, Java, PHP, no-code', iconBg: 'bg-brand-100/80', iconColor: 'text-brand-600' },
                  { icon: Lock,       title: 'JWT Auth',            desc: 'Todas as rotas protegidas. Refresh automático',        iconBg: 'bg-violet-100/80', iconColor: 'text-violet-500' },
                  { icon: RefreshCcw, title: 'Idempotência',        desc: 'Header Idempotency-Key. Seguro para retries',          iconBg: 'bg-sky-100/80', iconColor: 'text-sky-500' },
                  { icon: Database,   title: 'Multi-tenant',        desc: 'Silo isolado por tenant_id no JWT',                    iconBg: 'bg-emerald-100/80', iconColor: 'text-emerald-500' },
                ].map(({ icon: FIcon, title, desc, iconBg, iconColor }) => (
                  <div key={title} className="rounded-sm border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
                    <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full ${iconBg}`}>
                      <FIcon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cenários de integração */}
            <div>
              <SectionLabel>Cenários de Integração</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={MessageSquare} title="WhatsApp / Chatbot">
                  Integre com Twilio, Z-API ou Evolution API. Cliente responde perguntas simples,
                  bot chama <code className="bg-slate-100 px-1 rounded text-brand-600">POST /evaluations</code> e envia score no WhatsApp.
                </HighlightBox>
                <HighlightBox icon={Code2} title="CRM / Sistema da Corretora">
                  Conecte a Pipedrive, HubSpot, Salesforce ou sistema próprio.
                  Lead entra no funil, avaliação dispara automaticamente. Score e gap ficam no CRM.
                </HighlightBox>
                <HighlightBox icon={Webhook} title="Automação (n8n, Zapier, Make)">
                  Fluxos sem código: Google Forms preenchido → avaliação na API → resultado por email/Slack/WhatsApp.
                  Automatize lembretes de revisão de 12 meses.
                </HighlightBox>
                <HighlightBox icon={Bot} title="Landing Page de Captação">
                  "Descubra se você está protegido" — visitante preenche dados, vê score.
                  Gap significativo? Ofereça agendamento. Lead qualificado com diagnóstico pronto.
                </HighlightBox>
                <HighlightBox icon={BarChart3} title="BI / Dashboard Executivo">
                  <code className="bg-slate-100 px-1 rounded text-brand-600">GET /reports/pilot</code> alimenta Power BI, Metabase ou Looker.
                  KPIs da operação em dashboards executivos atualizados em tempo real.
                </HighlightBox>
                <HighlightBox icon={Send} title="App Mobile / PWA">
                  React Native, Flutter ou PWA consumindo a mesma API.
                  Corretor faz avaliações pelo celular em visitas — resultado instantâneo na tela.
                </HighlightBox>
              </div>
            </div>

            <div className="rounded-sm border border-brand-200 bg-brand-50/80 px-4 py-3">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>A API é o produto.</strong> O frontend web é uma das formas de usar o motor.
                A API RESTful permite integrar o motor ao ecossistema da corretora — cada ponto de contato vira oportunidade de diagnóstico e venda.
              </p>
            </div>
          </div>
        </Accordion>

        {/* Footer */}
        <div className="box">
          <div className="px-4 py-3 text-center">
            <p className="text-sm font-semibold text-slate-700">LifeTrigger Engine v1.0.0</p>
            <p className="mt-0.5 text-xs text-slate-400">Motor de Inteligência de Proteção de Vida · B2B SaaS</p>
          </div>
        </div>
      </div>
    </div>
  )
}
