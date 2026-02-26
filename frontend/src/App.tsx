import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import Login from './pages/Login'
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
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />

              {/* Evaluations */}
              <Route path="evaluations">
                <Route index element={<EvaluationHistory />} />
                {/* Partner+ can create new evaluations */}
                <Route element={<ProtectedRoute minRole="Partner" />}>
                  <Route path="new" element={<NewEvaluation />} />
                </Route>
                <Route path="result" element={<EvaluationResult />} />
                <Route path=":id" element={<EvaluationResult />} />
              </Route>

              {/* Triggers — Partner+ */}
              <Route element={<ProtectedRoute minRole="Partner" />}>
                <Route path="triggers/new" element={<NewTrigger />} />
              </Route>

              {/* Admin section — TenantAdmin+ */}
              <Route element={<ProtectedRoute minRole="TenantAdmin" />}>
                <Route path="settings" element={<TenantSettings />} />
                <Route path="audit" element={<AuditVerify />} />
                <Route path="engine" element={<EngineInfo />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
