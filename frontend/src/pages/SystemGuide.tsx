import { useState } from 'react'
import {
  BookOpen, Target, Shield, TrendingUp, Users, Zap, BarChart3,
  Cpu, CheckCircle, ChevronDown, ChevronUp,
  Lightbulb, DollarSign, ClipboardCheck, Activity, Eye,
  UserCheck, Settings, CreditCard, Building2, Globe,
  Lock, Hash, Layers, GitBranch, ShieldCheck, Database,
  Phone, Filter, Send, CalendarClock, Rocket,
  Plug, MessageSquare, Bot, Webhook, Code2, RefreshCcw, FileJson,
  ArrowRight,
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
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-3 px-4 sm:px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-4.5 w-4.5 text-brand-600" />
        </div>
        <span className="flex-1 text-sm font-semibold text-slate-900">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-100 px-4 sm:px-6 py-4 sm:py-5">{children}</div>}
    </div>
  )
}

// ── Section Label ────────────────────────────────────────────────
function SectionLabel({ children, color = 'text-brand-600' }: { children: React.ReactNode; color?: string }) {
  return <p className={`mb-3 text-xs font-semibold uppercase tracking-wider ${color}`}>{children}</p>
}

// ── Info Card (icon + title + desc) ─────────────────────────────
function InfoCard({ icon: Icon, title, desc, bg = 'bg-brand-600' }: {
  icon: React.ElementType; title: string; desc: string; bg?: string
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Compact Field (title + desc inline) ─────────────────────────
function FieldRow({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div>
        <p className="text-xs font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{children}</p>
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
    brand:   { border: 'border-brand-100',   bg: 'bg-brand-50',   icon: 'text-brand-600',   text: 'text-brand-800' },
    amber:   { border: 'border-amber-200',   bg: 'bg-amber-50',   icon: 'text-amber-600',   text: 'text-amber-800' },
    emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-800' },
  }
  const s = styles[variant]
  return (
    <div className={`flex gap-3 rounded-xl border ${s.border} ${s.bg} p-4`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`} />
      <div>
        {title && <p className={`text-sm font-semibold ${s.text}`}>{title}</p>}
        <div className={`${title ? 'mt-1 ' : ''}text-xs ${s.text} leading-relaxed`}>{children}</div>
      </div>
    </div>
  )
}

// ── Screen Reference ────────────────────────────────────────────
function ScreenRef({ icon: Icon, name, path, desc }: {
  icon: React.ElementType; name: string; path: string; desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{name}</p>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{path}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
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
    DELETE:   'bg-red-100 text-red-700',
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
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

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn max-w-4xl">

        {/* ── Hero ── */}
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 sm:p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-900/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">LifeTrigger Engine</h1>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Motor inteligente de avaliacao de seguro de vida para corretoras. Analisa o perfil de cada cliente
                e entrega em segundos um diagnostico completo: score de protecao, gap de cobertura, recomendacao
                de acao e insights prontos para usar na conversa com o cliente.
              </p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Objetivo: <strong className="text-brand-700">ajudar corretores a vender mais e melhor</strong>,
                com dados concretos e argumentacao tecnica que transforma uma conversa de vendas em uma consultoria de protecao.
              </p>
            </div>
          </div>
        </div>

        {/* ━━ 1. O QUE O SISTEMA FAZ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="what" title="O que o LifeTrigger faz?" icon={Target} openId={openId} onToggle={toggle}>
          <div className="space-y-6">

            {/* A Dor */}
            <div>
              <SectionLabel color="text-red-500">O Problema</SectionLabel>
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-2">
                <p className="text-sm text-red-900 leading-relaxed">
                  Hoje, a maioria dos corretores de seguro de vida <strong>vende no achismo</strong>. Nao tem ferramenta que diga
                  quanto de cobertura o cliente realmente precisa, nem dados concretos para justificar a recomendacao.
                </p>
                <ul className="text-xs text-red-800 space-y-1.5 ml-4 list-disc">
                  <li><strong>Clientes subprotegidos</strong> — familias que ficariam desamparadas porque o corretor "chutou" um valor</li>
                  <li><strong>Clientes sobresegurados</strong> — pagando premio alto demais por cobertura que nao precisam</li>
                  <li><strong>Vendas perdidas</strong> — sem argumentos tecnicos, o cliente nao enxerga valor e nao fecha</li>
                  <li><strong>Risco juridico</strong> — sem registro tecnico que comprove a analise feita</li>
                  <li><strong>Zero acompanhamento</strong> — eventos de vida mudam a necessidade, mas o corretor nao tem gatilho para retomar</li>
                </ul>
              </div>
            </div>

            {/* A Solucao */}
            <div>
              <SectionLabel>A Solucao</SectionLabel>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                O LifeTrigger e um <strong>motor de inteligencia de protecao de vida</strong> que recebe os dados do cliente
                e devolve uma analise completa em milissegundos. Em vez de achismo, o corretor passa a ter
                <strong> dados concretos, argumentacao tecnica e registro auditavel</strong> de cada recomendacao.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard icon={Shield}     title="Score de Protecao (0-100)"  desc="Nota unica que resume o quao protegido o cliente esta. Quanto maior, melhor a cobertura em relacao a necessidade real." bg="bg-brand-600" />
                <InfoCard icon={DollarSign}  title="Gap de Cobertura"          desc="Diferenca exata entre a cobertura atual e a recomendada, em reais e em percentual. Mostra o 'buraco' na protecao." bg="bg-red-500" />
                <InfoCard icon={TrendingUp}  title="Recomendacao de Acao"      desc="AUMENTAR, MANTER, REDUZIR ou REVISAR — diretriz clara para o corretor saber o que fazer." bg="bg-amber-500" />
                <InfoCard icon={BarChart3}   title="Classificacao de Risco"    desc="CRITICO, MODERADO ou ADEQUADO — cruza idade, profissao, fumante e dependentes para classificar." bg="bg-violet-500" />
                <InfoCard icon={Lightbulb}   title="5 Insights por Avaliacao"  desc="Abertura de conversa, argumento principal, objecao prevista, produto sugerido e proximo passo." bg="bg-sky-500" />
                <InfoCard icon={Zap}         title="Gatilhos de Vida"          desc="Casamento, filho, promocao, divorcio — eventos que recalculam a protecao automaticamente." bg="bg-emerald-500" />
              </div>
            </div>

            {/* ConsentId e Protecao Juridica */}
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
              <div className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <p className="text-sm font-semibold text-brand-800">ID de vinculacao e protecao juridica do corretor</p>
              </div>
              <p className="text-xs text-brand-700 leading-relaxed">
                Cada avaliacao e vinculada a um <strong>Consent ID</strong> — identificador unico que conecta a analise ao cliente
                no sistema do corretor. O LifeTrigger <strong>nao armazena nome, CPF, email nem qualquer dado pessoal</strong>.
                Apenas dados demograficos anonimizados (idade, faixa de renda, quantidade de dependentes).
              </p>
              <p className="text-xs text-brand-700 leading-relaxed">
                Cada avaliacao gera um registro imutavel com hash SHA-256, timestamp, versao do motor e resultado completo.
                Se no futuro houver qualquer questionamento, o corretor tem uma <strong>prova tecnica auditavel</strong> de que
                a analise foi feita com base em dados concretos e regras deterministicas — sem possibilidade de adulteracao.
              </p>
              <p className="text-xs text-brand-700 leading-relaxed">
                <strong>Voce mantem o controle dos dados do seu cliente; nos fornecemos a inteligencia tecnica e o registro de prova.</strong>
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 2. COMO FUNCIONA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="how" title="Como funciona na pratica?" icon={ClipboardCheck} openId={openId} onToggle={toggle}>
          <div className="space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              O fluxo de trabalho do corretor segue 4 passos simples:
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { n: 1, title: 'Coleta dos dados', desc: 'Formulario guiado em 4 etapas (Pessoal, Financeiro, Familia, Operacional) com validacao em tempo real e formatacao BRL automatica.' },
                { n: 2, title: 'Motor processa', desc: 'Mais de 30 regras deterministicas cruzadas em milissegundos. Mesmo input, mesmo resultado — sempre.' },
                { n: 3, title: 'Resultado completo', desc: 'Score, gap, acao, justificativas e 5 insights prontos para usar na conversa com o cliente.' },
                { n: 4, title: 'Historico e acompanhamento', desc: 'Todas as avaliacoes ficam salvas com hash de auditoria imutavel. Consulte e acompanhe a evolucao.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{n}</div>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <HighlightBox icon={Zap} title="Gatilhos de Vida" variant="amber">
              O corretor pode registrar <strong>eventos de vida</strong> (casamento, filho, promocao, divorcio, aposentadoria).
              O motor recalcula a protecao com base no evento e gera nova recomendacao — abordagem proativa com dados concretos.
            </HighlightBox>
          </div>
        </Accordion>

        {/* ━━ 3. POTENCIA DO MOTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="engine-power" title="Potencia do motor: determinismo, complexidade e auditoria" icon={Cpu} openId={openId} onToggle={toggle}>
          <div className="space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              O LifeTrigger e um <strong>motor de regras deterministico de alta complexidade</strong>, projetado para
              entregar diagnosticos de grau institucional com a robustez que seguradoras e auditorias exigem.
            </p>

            {/* Determinismo */}
            <div>
              <SectionLabel>Motor 100% Deterministico</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={GitBranch} title="Zero aleatoriedade">
                  Sem IA, sem machine learning, sem heuristicas probabilisticas. Regras deterministicas puras: mesmo input = mesmo output, sempre, em qualquer servidor. Reprodutibilidade total.
                </HighlightBox>
                <HighlightBox icon={ShieldCheck} title="Regras versionadas e rastreadas">
                  Cada avaliacao registra <code className="text-brand-600 bg-slate-100 px-1 rounded">engineVersion</code>,{' '}
                  <code className="text-brand-600 bg-slate-100 px-1 rounded">ruleSetVersion</code> e{' '}
                  <code className="text-brand-600 bg-slate-100 px-1 rounded">ruleSetHash</code>. Se as regras mudarem, voce verifica com qual versao cada diagnostico foi produzido.
                </HighlightBox>
              </div>
            </div>

            {/* Pipeline de 6 fases */}
            <div>
              <SectionLabel>Pipeline de Calculo (6 Fases)</SectionLabel>
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                <PipelinePhase n={1} title="Substituicao de Renda" desc="Calcula quantos anos de renda a familia precisa (2-10 anos), com bonificacao por dependente (ate +3), limitada por teto configuravel." />
                <PipelinePhase n={2} title="Quitacao de Dividas" desc="Soma o saldo total de dividas para garantir que a cobertura cubra 100% dos debitos pendentes." />
                <PipelinePhase n={3} title="Reserva de Transicao" desc="Adiciona colchao de seguranca (3-9 meses de renda), descontando reserva existente. Clampeado por limites rigidos." />
                <PipelinePhase n={4} title="Guardrails (Teto e Piso)" desc="Cobertura recomendada nunca fica abaixo de 2x nem acima de 20x a renda anual (configuravel). Evita recomendacoes absurdas." />
                <PipelinePhase n={5} title="Score + Penalidades" desc="Protection Score (razao cobertura/necessidade) com 3 penalidades independentes: dependentes subprotegidos (-10), divida alta (-10), sem reserva (-10)." />
                <PipelinePhase n={6} title="Overrides de Acao + Insights" desc={`Verifica condicoes especiais (revisao > 12 meses, dados nao confirmados, gatilho recente) que forcam REVISAR. Gera 5 insights personalizados.`} />
              </div>
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>20 regras catalogadas</strong> em enum fortemente tipado (<code className="text-brand-600 bg-white px-1 rounded">EngineRuleId</code>),
                  cada uma com template de justificativa e rastreabilidade completa. Nenhuma "string magica" — tudo validado em compilacao.
                </p>
              </div>
            </div>

            {/* Auditoria e Integridade */}
            <div>
              <SectionLabel>Auditoria e Integridade</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard icon={Hash}     title="Hash SHA-256 Imutavel"    desc="Cada avaliacao recebe hash criptografico na criacao. Qualquer alteracao posterior invalida o hash. Verificavel na tela de Auditoria." bg="bg-violet-600" />
                <InfoCard icon={Layers}   title="Snapshot Completo"        desc="Congela regras aplicadas, justificativas, versao do motor e timestamp. A 'foto' juridica do momento da avaliacao." bg="bg-brand-600" />
                <InfoCard icon={Lock}     title="Imutabilidade por Design" desc="Avaliacoes salvas NUNCA sao alteradas. Parametros mudam? Avaliacoes anteriores mantem resultado original." bg="bg-red-500" />
                <InfoCard icon={Database} title="Isolamento Multi-Tenant"  desc="Cada corretora em silo isolado via tenant_id no JWT. Impossivel que dados vazem entre corretoras." bg="bg-sky-600" />
              </div>
            </div>

            {/* Seguranca */}
            <div>
              <SectionLabel>Seguranca em Camadas</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={ShieldCheck} variant="emerald">
                  <strong>JWT com refresh automatico:</strong> tokens de curta duracao com renovacao transparente.
                  5 niveis de role cumulativo. Sem token valido, a API recusa 100% das chamadas.
                </HighlightBox>
                <HighlightBox icon={Shield} variant="emerald">
                  <strong>Zero dados pessoais na API:</strong> sem nome, CPF ou email. Apenas dados demograficos anonimizados.
                  LGPD by design — nao ha dados pessoais para vazar.
                </HighlightBox>
                <HighlightBox icon={Lock} variant="emerald">
                  <strong>Consentimento obrigatorio:</strong> toda avaliacao exige{' '}
                  <code className="bg-emerald-100 px-1 rounded">hasExplicitActiveConsent=true</code> e{' '}
                  <code className="bg-emerald-100 px-1 rounded">consentId</code> valido. Sem bypass.
                </HighlightBox>
                <HighlightBox icon={Database} variant="emerald">
                  <strong>Guardrails contra manipulacao:</strong> parametros configurados pelo tenant sao clampeados por limites rigidos
                  no codigo-fonte. Mesmo valores extremos sao travados por teto e piso de seguranca.
                </HighlightBox>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Em resumo:</strong> precisao de um motor deterministico + rastreabilidade de sistema de auditoria +
                seguranca de arquitetura zero-trust. Cada avaliacao e reproduzivel, verificavel, imutavel e segregada.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 4. TELAS DO SISTEMA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="screens" title="Telas do sistema" icon={Eye} openId={openId} onToggle={toggle}>
          <div className="space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada perfil de usuario ve um conjunto diferente de telas. Abaixo esta o mapa completo:
            </p>

            <div>
              <SectionLabel>Area Principal</SectionLabel>
              <div className="space-y-2">
                <ScreenRef icon={BarChart3}      name="Dashboard"              path="/"                 desc="Visao consolidada da carteira: saude geral, distribuicao de risco e acoes, barra de protecao, ultimas avaliacoes e acoes rapidas." />
                <ScreenRef icon={ClipboardCheck}  name="Nova Avaliacao"         path="/evaluations/new"  desc="Formulario guiado em 4 etapas com validacao em tempo real, formatacao BRL e indicador de progresso." />
                <ScreenRef icon={Zap}             name="Gatilhos de Vida"       path="/triggers/new"     desc="Registro de eventos de vida vinculados a uma avaliacao base. Motor recalcula considerando o impacto." />
                <ScreenRef icon={BookOpen}         name="Historico de Avaliacoes" path="/evaluations"     desc="Lista paginada com filtros por data. Cada linha mostra acao, risco, score e gap." />
                <ScreenRef icon={UserCheck}        name="Meus Clientes"          path="/clients"         desc="Visao agrupada por consentId, mostrando o historico de avaliacoes de cada cliente." />
              </div>
            </div>

            <div>
              <SectionLabel>Administracao</SectionLabel>
              <div className="space-y-2">
                <ScreenRef icon={Users}      name="Gestao de Equipe"   path="/team"      desc="Criar, ativar/desativar usuarios e alterar perfis de acesso." />
                <ScreenRef icon={BarChart3}  name="Relatorios"         path="/reports"   desc="Relatorio agregado: total de avaliacoes, distribuicao por risco e acao, gatilhos disparados." />
                <ScreenRef icon={Shield}     name="Auditoria"          path="/audit"     desc="Verificacao de integridade: compara hash armazenado com hash recalculado." />
                <ScreenRef icon={Cpu}        name="Motor"              path="/engine"    desc="Status do motor: saude, versao, ruleset e endpoints disponiveis." />
                <ScreenRef icon={Settings}   name="Configuracoes"      path="/settings"  desc="Parametros do motor: multiplicadores de renda, reserva de emergencia, limite de cobertura." />
                <ScreenRef icon={CreditCard} name="Plano e Faturamento" path="/billing"  desc="Plano contratado, uso da plataforma e gestao de assinatura." />
              </div>
            </div>

            <div>
              <SectionLabel>Plataforma (SuperAdmin)</SectionLabel>
              <div className="space-y-2">
                <ScreenRef icon={Building2} name="Corretoras"        path="/admin/tenants"   desc="Gestao de todas as corretoras. Criar, ativar ou desativar tenants." />
                <ScreenRef icon={Globe}     name="Plataforma"        path="/admin/platform"  desc="Metricas globais, status dos servicos e monitoramento." />
                <ScreenRef icon={Users}     name="Usuarios Globais"  path="/admin/users"     desc="Gestao de todos os usuarios de todas as corretoras." />
              </div>
            </div>
          </div>
        </Accordion>

        {/* ━━ 5. PERFIS DE ACESSO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="roles" title="Perfis de acesso (Roles)" icon={Users} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              5 perfis <strong>cumulativos</strong> — cada perfil inclui todas as permissoes dos perfis abaixo dele:
            </p>

            <div className="space-y-2">
              {[
                { role: 'Super Admin', level: 5, color: 'bg-red-600',     desc: 'Administrador da plataforma. Gerencia todas as corretoras, todos os usuarios e visao global.' },
                { role: 'Proprietario', level: 4, color: 'bg-purple-600', desc: 'Dono da corretora. Configuracoes do motor (formulas) e plano/faturamento. Controle total.' },
                { role: 'Gerente',      level: 3, color: 'bg-blue-600',   desc: 'Gestor de equipe. Relatorios agregados, auditoria e acesso ao motor. Ve todas as avaliacoes.' },
                { role: 'Corretor',     level: 2, color: 'bg-emerald-600',desc: 'Operacional. Cria avaliacoes, registra gatilhos, consulta clientes. Ve apenas suas avaliacoes.' },
                { role: 'Observador',   level: 1, color: 'bg-slate-500',  desc: 'Visualizacao apenas. Dashboard (sem acoes), historico e perfil. Ideal para auditores.' },
              ].map(({ role, level, color, desc }) => (
                <div key={role} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold text-white ${color}`}>{role}</span>
                    <span className="text-[10px] font-mono text-slate-400">Lv {level}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Hierarquia cumulativa:</strong> SuperAdmin (5) {'>'} TenantOwner (4) {'>'} Manager (3) {'>'} Broker (2) {'>'} Viewer (1).
                Nao e preciso atribuir multiplos roles — um nivel inclui todos os anteriores.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 6. RESULTADO DA AVALIACAO ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="result" title="Entendendo o resultado da avaliacao" icon={CheckCircle} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              O motor retorna um conjunto completo de informacoes. Aqui esta o significado de cada campo:
            </p>

            {/* Metricas numericas */}
            <div>
              <SectionLabel>Metricas Numericas</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FieldRow icon={Shield} title="Score de Protecao (0-100)">
                  Nota que resume a adequacao da cobertura. Acima de 70 e saudavel. Abaixo de 45 requer atencao.
                </FieldRow>
                <FieldRow icon={Target} title="Eficiencia de Cobertura (0-100)">
                  Quao bem a cobertura atual se aproxima da ideal. 100 = perfeito. Acima = sobresegurado.
                </FieldRow>
                <FieldRow icon={DollarSign} title="Gap de Protecao (R$ e %)">
                  Diferenca entre a cobertura recomendada e a atual. Positivo = subprotegido. Negativo = sobresegurado.
                </FieldRow>
              </div>
            </div>

            {/* Classificacoes */}
            <div>
              <SectionLabel>Classificacoes</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-800 mb-2">Acao Recomendada</p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500"><strong className="text-amber-600">AUMENTAR</strong> — cobertura insuficiente, ampliar apolice</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-emerald-600">MANTER</strong> — cobertura adequada, revisao periodica</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-blue-600">REDUZIR</strong> — cobertura excessiva, otimizar premio</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-violet-600">REVISAR</strong> — dados incompletos ou situacao atipica</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-800 mb-2">Classificacao de Risco</p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500"><strong className="text-red-600">CRITICO</strong> — alta vulnerabilidade, atencao imediata</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-amber-600">MODERADO</strong> — protecao parcial, melhorias recomendadas</p>
                    <p className="text-[11px] text-slate-500"><strong className="text-emerald-600">ADEQUADO</strong> — protecao alinhada com o perfil</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div>
              <SectionLabel>5 Insights para o Corretor</SectionLabel>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {[
                    { title: 'Abertura',            desc: 'Frase para iniciar a conversa' },
                    { title: 'Argumento Principal',  desc: 'Dado mais forte para convencer' },
                    { title: 'Objecao Prevista',     desc: 'Questao provavel e contra-argumento' },
                    { title: 'Produto Sugerido',     desc: 'Tipo de apolice mais indicado' },
                    { title: 'Proximo Passo',        desc: 'Acao concreta apos a conversa' },
                  ].map(({ title, desc }) => (
                    <div key={title} className="text-center p-2 rounded-lg bg-white border border-slate-100">
                      <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">{title}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Accordion>

        {/* ━━ 7. CONFIGURACOES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="settings" title="Configuracoes personalizaveis" icon={Settings} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada corretora personaliza as formulas do motor para adaptar a sua estrategia comercial:
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { title: 'Multiplicador de Renda (Solteiro)',        desc: 'Anos de renda para pessoa sem dependentes. Padrao: 5.' },
                { title: 'Multiplicador de Renda (Com Dependentes)', desc: 'Anos de renda com dependentes. Padrao: 10. Mais alto = mais conservador.' },
                { title: 'Buffer de Reserva de Emergencia',         desc: 'Meses de renda como colchao de seguranca. Padrao: 6.' },
                { title: 'Limite Maximo de Cobertura',               desc: 'Teto em multiplos de renda anual. Evita recomendacoes irreais. Padrao: 25x.' },
              ].map(({ title, desc }) => (
                <div key={title} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-800">{title}</p>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Dica:</strong> alteracoes impactam apenas avaliacoes futuras. Avaliacoes ja realizadas mantem
                o resultado original (imutavel). Use a simulacao ao vivo na tela de Configuracoes para testar antes de salvar.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 8. SEGURANCA E LGPD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="security" title="Seguranca, LGPD e Conformidade" icon={Shield} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Projetado com seguranca e conformidade desde o primeiro dia:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard icon={Shield}      title="Sem Dados Pessoais na API"  desc="Sem nome, CPF ou qualquer PII. Apenas perfil demografico anonimizado. LGPD by design." bg="bg-brand-600" />
              <InfoCard icon={CheckCircle} title="Consentimento Obrigatorio"  desc="Toda avaliacao exige consentimento ativo + consentId. Sem consentimento, a API recusa." bg="bg-emerald-500" />
              <InfoCard icon={Hash}        title="Audit Hash Imutavel"       desc="SHA-256 na criacao. Qualquer alteracao quebra o hash — detectavel na tela de Auditoria." bg="bg-violet-500" />
              <InfoCard icon={Database}    title="Isolamento Multi-tenant"   desc="Cada corretora em isolamento total. Avaliacoes, usuarios e configuracoes segregados por tenant." bg="bg-sky-500" />
            </div>
          </div>
        </Accordion>

        {/* ━━ 9. DICAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="tips" title="Dicas para tirar o maximo do LifeTrigger" icon={Lightbulb} openId={openId} onToggle={toggle}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { title: 'Preencha todos os campos', desc: 'Quanto mais dados, mais preciso o diagnostico. Divida zerada vs. vazia muda a recomendacao. Dados incompletos geram REVISAR.' },
              { title: 'Use os Insights na conversa', desc: 'Os 5 insights sao gerados para o perfil especifico. A Abertura inicia a conversa. A Objecao Prevista prepara voce para a resistencia.' },
              { title: 'Registre Gatilhos de Vida', desc: 'Casamento, filho ou promocao? Registre o evento para novo diagnostico e oportunidade natural de contato.' },
              { title: 'Acompanhe o Dashboard', desc: 'A barra de saude da carteira e o termometro da operacao. Score medio caindo? Hora de revisitar clientes com acao AUMENTAR.' },
              { title: 'Mostre o resultado ao cliente', desc: 'O Score de Protecao e visual e facil de entender. Dados concretos vendem mais que argumentos abstratos.' },
            ].map(({ title, desc }) => (
              <HighlightBox key={title} icon={ArrowRight} title={title} variant="emerald">
                {desc}
              </HighlightBox>
            ))}
          </div>
        </Accordion>

        {/* ━━ 10. ESTRATEGIAS DE VENDA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="sales" title="Estrategias de venda, recontato e captacao" icon={Rocket} openId={openId} onToggle={toggle}>
          <div className="space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              O LifeTrigger e uma <strong>plataforma de inteligencia comercial</strong> que ajuda o corretor a vender mais,
              no momento certo, com os argumentos certos.
            </p>

            {/* 1. Gatilhos para retorno de contato */}
            <div>
              <SectionLabel>1. Gatilhos para Retornar Contato</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={Phone} title="Eventos de vida como gatilho">
                  <strong>7 tipos de gatilhos</strong> (casamento, filho, imovel, salario, divorcio, aposentadoria, personalizado).
                  Cada um gera nova avaliacao com diagnostico atualizado — motivo concreto para retomar contato.
                </HighlightBox>
                <HighlightBox icon={CalendarClock} title="Revisao anual automatica">
                  Avaliacoes com mais de 12 meses recebem acao <strong>REVISAR</strong> automaticamente.
                  O insight PROXIMO_PASSO sugere agendar revisao e perguntar sobre mudancas de vida.
                </HighlightBox>
              </div>
              <div className="mt-3">
                <HighlightBox icon={Rocket} title="Em breve no roadmap" variant="amber">
                  Notificacoes automaticas por email/push quando avaliacao completar 12 meses.
                  Lembretes programados para datas de gatilhos futuros. Alerta proativo quando score da carteira cair.
                </HighlightBox>
              </div>
            </div>

            {/* 2. Questionario */}
            <div>
              <SectionLabel>2. Questionario de Atualizacao</SectionLabel>
              <div className="space-y-3">
                <HighlightBox icon={ClipboardCheck} title="Formulario completo de avaliacao">
                  <strong>4 etapas guiadas</strong> (Pessoal, Financeiro, Familia, Operacional) com validacao em tempo real
                  e formatacao automatica. Preencha junto com o cliente em atendimento presencial ou por telefone.
                </HighlightBox>
                <HighlightBox icon={Send} title="Em breve no roadmap" variant="amber">
                  Link compartilhavel por WhatsApp/email para que o <strong>proprio cliente preencha</strong> o questionario.
                  Vinculado ao consentId, sem login, dispara avaliacao automaticamente com notificacao para o corretor.
                </HighlightBox>
              </div>
            </div>

            {/* 3. Filtragem de leads */}
            <div>
              <SectionLabel>3. Filtragem de Leads e Insights de Venda</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={Filter} title="Identifique oportunidades">
                  <strong>Meus Clientes</strong> agrupa avaliacoes por consentId com risco, acao e score.
                  <strong> Dashboard</strong> mostra distribuicao consolidada — veja quantos clientes precisam de atencao.
                </HighlightBox>
                <HighlightBox icon={Lightbulb} title="5 insights por avaliacao">
                  Abertura, argumento, objecao, produto e proximo passo — personalizados para cada perfil,
                  calibrados para <strong>maximizar a conversao</strong>.
                </HighlightBox>
              </div>
              <div className="mt-3">
                <HighlightBox icon={TrendingUp} title="Em breve no roadmap" variant="amber">
                  Filtros avancados por acao, score e risco. Ranking de oportunidades por potencial de conversao.
                  Painel de "leads quentes" no Dashboard. Exportacao para CRM externo.
                </HighlightBox>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Resumo:</strong> gatilhos de vida, revisao anual automatica, formulario completo, visao por cliente
                e 5 insights personalizados ja disponiveis. Funcionalidades marcadas "Em breve" expandirao a plataforma para
                uma <strong>central completa de inteligencia comercial</strong>.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ━━ 11. API E INTEGRACOES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Accordion id="api" title="API 100% integravel — conecte a qualquer sistema" icon={Plug} openId={openId} onToggle={toggle}>
          <div className="space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              O LifeTrigger tem <strong>API REST completa</strong> integravel a qualquer sistema: CRM, ERP, chatbot, WhatsApp, app mobile ou plataforma propria.
              Tudo o que o frontend faz, a API faz programaticamente.
            </p>

            {/* Endpoints */}
            <div>
              <SectionLabel>Endpoints Disponiveis</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <EndpointRow method="POST" path="/api/v1/evaluations"                       desc="Envia dados do cliente, recebe diagnostico completo com score, gap, acao e insights." />
                <EndpointRow method="POST" path="/api/v1/triggers"                          desc="Registra gatilho de vida e recebe avaliacao recalculada." />
                <EndpointRow method="GET"  path="/api/v1/evaluations"                       desc="Lista avaliacoes com paginacao e filtros por data." />
                <EndpointRow method="GET"  path={'/api/v1/evaluations/{id}'}                desc="Registro completo: request, resultado, justificativas e auditoria." />
                <EndpointRow method="GET"  path={'/api/v1/admin/audit/evaluations/{id}/verify'} desc="Verifica integridade criptografica (SHA-256). PASS ou FAIL." />
                <EndpointRow method="GET"  path="/api/v1/admin/reports/pilot"                desc="Relatorio agregado: distribuicao por risco, acao e gatilhos." />
                <EndpointRow method="GET/PUT" path={'/api/v1/admin/tenants/{id}/settings'}  desc="Consulta e atualiza parametros do motor via API." />
                <EndpointRow method="GET"  path="/api/v1/engine/versions"                   desc="Versao do motor e ruleset. Health check e monitoramento." />
              </div>
            </div>

            {/* Caracteristicas tecnicas */}
            <div>
              <SectionLabel>Caracteristicas Tecnicas</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: FileJson,   title: 'REST + JSON',         desc: 'Qualquer linguagem: Python, Node, Java, PHP, no-code', bg: 'bg-brand-600' },
                  { icon: Lock,       title: 'JWT Auth',            desc: 'Todas as rotas protegidas. Refresh automatico',        bg: 'bg-violet-600' },
                  { icon: RefreshCcw, title: 'Idempotencia',        desc: 'Header Idempotency-Key. Seguro para retries',          bg: 'bg-sky-600' },
                  { icon: Database,   title: 'Multi-tenant',        desc: 'Silo isolado por tenant_id no JWT',                    bg: 'bg-emerald-600' },
                ] .map(({ icon: FIcon, title, desc, bg }) => (
                  <div key={title} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                      <FIcon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cenarios de integracao */}
            <div>
              <SectionLabel>Cenarios de Integracao</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HighlightBox icon={MessageSquare} title="WhatsApp / Chatbot">
                  Integre com Twilio, Z-API ou Evolution API. Cliente responde perguntas simples,
                  bot chama <code className="bg-slate-100 px-1 rounded text-brand-600">POST /evaluations</code> e envia score no WhatsApp.
                </HighlightBox>
                <HighlightBox icon={Code2} title="CRM / Sistema da Corretora">
                  Conecte a Pipedrive, HubSpot, Salesforce ou sistema proprio.
                  Lead entra no funil, avaliacao dispara automaticamente. Score e gap ficam no CRM.
                </HighlightBox>
                <HighlightBox icon={Webhook} title="Automacao (n8n, Zapier, Make)">
                  Fluxos sem codigo: Google Forms preenchido → avaliacao na API → resultado por email/Slack/WhatsApp.
                  Automatize lembretes de revisao de 12 meses.
                </HighlightBox>
                <HighlightBox icon={Bot} title="Landing Page de Captacao">
                  "Descubra se voce esta protegido" — visitante preenche dados, ve score.
                  Gap significativo? Ofereca agendamento. Lead qualificado com diagnostico pronto.
                </HighlightBox>
                <HighlightBox icon={BarChart3} title="BI / Dashboard Executivo">
                  <code className="bg-slate-100 px-1 rounded text-brand-600">GET /reports/pilot</code> alimenta Power BI, Metabase ou Looker.
                  KPIs da operacao em dashboards executivos atualizados em tempo real.
                </HighlightBox>
                <HighlightBox icon={Send} title="App Mobile / PWA">
                  React Native, Flutter ou PWA consumindo a mesma API.
                  Corretor faz avaliacoes pelo celular em visitas — resultado instantaneo na tela.
                </HighlightBox>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>A API e o produto.</strong> O frontend web e uma das formas de usar o motor.
                A API RESTful permite integrar o motor ao ecossistema da corretora — cada ponto de contato vira oportunidade de diagnostico e venda.
              </p>
            </div>
          </div>
        </Accordion>

        {/* Footer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-card text-center">
          <p className="text-sm font-semibold text-slate-700">LifeTrigger Engine v1.0.0</p>
          <p className="mt-1 text-xs text-slate-400">Motor de Inteligencia de Protecao de Vida · B2B SaaS</p>
        </div>
      </div>
    </div>
  )
}
