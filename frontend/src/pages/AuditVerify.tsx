import { useState } from 'react'
import { Shield, Search, CheckCircle2, XCircle, AlertCircle, Clock, Info } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { verifyEvaluationIntegrity } from '../lib/api'
import type { AuditVerifyResult } from '../types/api'

// UUID v4 format: 8-4-4-4-12 hex chars
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value.trim())
}

/** Parses raw API error body (may be JSON) into a human-readable message. */
function parseApiError(raw: string, status?: number): string {
  if (status === 404) return 'Avaliação não encontrada. Verifique se o ID está correto e pertence a este tenant.'
  try {
    const json = JSON.parse(raw) as {
      error_code?: string
      message?: string
      details?: { field: string; message: string }[]
    }
    if (json.error_code === 'VALIDATION_ERROR') {
      const detail = json.details?.[0]?.message
      if (detail?.toLowerCase().includes('not valid')) {
        return 'ID com formato inválido. Certifique-se de copiar o UUID completo (36 caracteres) do histórico.'
      }
      return `Dados invalidos: ${detail ?? json.message ?? 'verifique o campo preenchido.'}`
    }
    return json.message ?? raw
  } catch {
    return raw
  }
}

export default function AuditVerify() {
  const [evalId, setEvalId]     = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<AuditVerifyResult | null>(null)
  const [error, setError]       = useState<string | null>(null)

  function handleChange(value: string) {
    // Auto-strip surrounding whitespace as the user types/pastes
    const clean = value.replace(/\s/g, '')
    setEvalId(clean)
    setError(null)
    setResult(null)

    if (!clean) { setInputError(null); return }

    // Show a live hint while they're still typing the full UUID
    if (clean.length < 36) {
      setInputError(`${clean.length}/36 caracteres — UUID incompleto.`)
    } else if (!isValidUUID(clean)) {
      setInputError('Formato inválido. Esperado: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
    } else {
      setInputError(null)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const id = evalId.trim()
    if (!id) return
    if (!isValidUUID(id)) {
      setInputError('Cole ou digite um UUID válido antes de verificar.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await verifyEvaluationIntegrity(id)
      setResult(data)
    } catch (err) {
      if (err instanceof Error) {
        // ApiError.message may contain raw JSON body or status-derived message
        const status = (err as { status?: number }).status
        setError(parseApiError(err.message, status))
      } else {
        setError('Erro inesperado ao verificar integridade. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputIsValid = !!evalId && !inputError

  return (
    <div>
      <TopBar title="Verificação de Auditoria" subtitle="Valida a integridade criptográfica de avaliações" />

      <div className="p-3 sm:p-4 lg:p-5 animate-fadeIn">
        <div className="mx-auto max-w-xl space-y-4 sm:space-y-5">
          {/* Explanation card */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-brand-50">
                <Shield className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">AuditHash SHA-256</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Cada avaliação recebe um hash criptográfico gerado a partir dos dados do cliente,
                  resultado e parâmetros da engine. Esta verificação regera o hash e compara com o
                  valor armazenado — garantindo que o resultado não foi adulterado.
                </p>
              </div>
            </div>
          </div>

          {/* Search form */}
          <form onSubmit={handleVerify} className="rounded-sm border border-slate-200 bg-white p-5 shadow-card space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Verificar Avaliação</h2>

            <div className="space-y-1.5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={evalId}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    spellCheck={false}
                    className={`w-full rounded-sm border bg-white px-3 py-2.5 font-mono text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-colors ${
                      inputError
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : inputIsValid
                          ? 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100'
                          : 'border-slate-200 focus:border-brand-400 focus:ring-brand-100'
                    }`}
                  />
                  {/* Status indicator */}
                  {evalId && (
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {inputIsValid
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <XCircle className="h-4 w-4 text-red-400" />
                      }
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !inputIsValid}
                  className="flex items-center justify-center gap-2 rounded-sm bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors sm:py-2"
                >
                  <Search className="h-4 w-4" />
                  {loading ? 'Verificando…' : 'Verificar'}
                </button>
              </div>

              {/* Inline field feedback */}
              {inputError ? (
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {inputError}
                </p>
              ) : inputIsValid ? (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  UUID válido — pronto para verificar.
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info className="h-3 w-3 shrink-0" />
                  Cole o ID copiado do histórico de avaliações ou do cabeçalho{' '}
                  <code className="font-mono">X-Evaluation-Id</code>.
                </p>
              )}
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Não foi possível verificar</p>
                <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-sm border p-5 shadow-card ${
              result.status === 'PASS' ? 'border-emerald-200 bg-emerald-50' :
              result.status === 'FAIL' ? 'border-red-200 bg-red-50' :
              'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {result.status === 'PASS' && <CheckCircle2 className="h-7 w-7 text-emerald-600" />}
                {result.status === 'FAIL' && <XCircle className="h-7 w-7 text-red-600" />}
                {result.status === 'UNAVAILABLE' && <Clock className="h-7 w-7 text-slate-500" />}
                <div>
                  <p className={`text-lg font-bold ${
                    result.status === 'PASS' ? 'text-emerald-700' :
                    result.status === 'FAIL' ? 'text-red-700' : 'text-slate-700'
                  }`}>
                    {result.status === 'PASS' ? 'Integridade Confirmada' :
                     result.status === 'FAIL' ? 'Adulteração Detectada' :
                     'Hash Indisponível'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 tabular-nums">{result.id}</p>
                </div>
              </div>

              {result.message && (
                <p className="mb-4 text-sm text-slate-600">{result.message}</p>
              )}

              {result.storedHash && (
                <div className="space-y-3">
                  <HashRow
                    label="Hash Armazenado"
                    value={result.storedHash}
                    match={result.status === 'PASS'}
                  />
                  {result.computedHash && (
                    <HashRow
                      label="Hash Recomputado"
                      value={result.computedHash}
                      match={result.status === 'PASS'}
                    />
                  )}
                  {result.status === 'PASS' && (
                    <p className="text-xs text-emerald-600 font-medium">
                      ✓ Os hashes coincidem. O resultado desta avaliação é autêntico e não foi modificado após o registro.
                    </p>
                  )}
                  {result.status === 'FAIL' && (
                    <p className="text-xs text-red-600 font-medium">
                      ✗ Os hashes divergem. O resultado pode ter sido modificado no banco de dados após o registro original.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Como funciona?</h2>
            <ol className="space-y-2.5 text-sm text-slate-600">
              {[
                'No momento da avaliação, o motor serializa o payload do cliente, o resultado e os parâmetros do motor.',
                'Aplica SHA-256 sobre essa serialização canônica e armazena junto ao registro.',
                'Na verificação, o motor recalcula o hash a partir dos dados armazenados.',
                'Se os hashes coincidem: PASS. Se divergem: FAIL — possível adulteração detectada.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-600">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

function HashRow({ label, value, match }: { label: string; value: string; match: boolean }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`break-all font-mono text-xs tabular-nums ${match ? 'text-emerald-700' : 'text-red-700'}`}>
        {value}
      </p>
    </div>
  )
}
