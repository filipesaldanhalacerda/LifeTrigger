import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import NewEvaluation from './pages/NewEvaluation'
import EvaluationResult from './pages/EvaluationResult'
import EvaluationHistory from './pages/EvaluationHistory'
import NewTrigger from './pages/NewTrigger'
import TenantSettings from './pages/TenantSettings'
import AuditVerify from './pages/AuditVerify'
import EngineInfo from './pages/EngineInfo'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          {/* Evaluations */}
          <Route path="evaluations">
            <Route index element={<EvaluationHistory />} />
            <Route path="new" element={<NewEvaluation />} />
            <Route path="result" element={<EvaluationResult />} />
            <Route path=":id" element={<EvaluationResult />} />
          </Route>

          {/* Triggers */}
          <Route path="triggers/new" element={<NewTrigger />} />

          {/* Admin */}
          <Route path="settings" element={<TenantSettings />} />
          <Route path="audit" element={<AuditVerify />} />
          <Route path="engine" element={<EngineInfo />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
