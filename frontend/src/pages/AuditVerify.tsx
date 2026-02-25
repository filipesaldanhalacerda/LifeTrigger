import { useState } from 'react'
import { Shield, Search, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { verifyEvaluationIntegrity, fetchDemoToken, getToken, getActiveTenantId } from '../lib/api'
import type { AuditVerifyResult } from '../types/api'

export default function AuditVerify() {
  const [evalId, setEvalId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditVerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!evalId.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      if (!getToken()) await fetchDemoToken(getActiveTenantId())
      const data = await verifyEvaluationIntegrity(evalId.trim())
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao verificar integridade.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <TopBar title="Verificação de Auditoria" subtitle="Valida a integridade criptográfica de avaliações" />

      <div className="p-6">
        <div className="mx-auto max-w-xl space-y-5">
          {/* Explanation card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                <Shield className="h-5 w-5 text-indigo-600" />
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
          <form onSubmit={handleVerify} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Verificar Avaliação</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={evalId}
                onChange={(e) => setEvalId(e.target.value)}
                placeholder="ID da avaliação (UUID)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={loading || !evalId.trim()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Search className="h-4 w-4" />
                {loading ? 'Verificando…' : 'Verificar'}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Você pode copiar o ID a partir do cabeçalho <code className="font-mono">X-Evaluation-Id</code> da resposta da API ou do histórico de avaliações.
            </p>
          </form>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Erro na verificação</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-xl border p-5 shadow-xs ${
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
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{result.id}</p>
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
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Como funciona?</h2>
            <ol className="space-y-2.5 text-sm text-slate-600">
              {[
                'No momento da avaliação, o motor serializa o payload do cliente, o resultado e os parâmetros do motor.',
                'Aplica SHA-256 sobre essa serialização canônica e armazena junto ao registro.',
                'Na verificação, o motor recalcula o hash a partir dos dados armazenados.',
                'Se os hashes coincidem: PASS. Se divergem: FAIL — possível adulteração detectada.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">
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
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`break-all font-mono text-xs ${match ? 'text-emerald-700' : 'text-red-700'}`}>
        {value}
      </p>
    </div>
  )
}
