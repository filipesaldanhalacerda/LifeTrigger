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
import TeamManagement from './pages/TeamManagement'
import UserProfile from './pages/UserProfile'
import Reports from './pages/Reports'
import TenantManagement from './pages/TenantManagement'
import ClientHistory from './pages/ClientHistory'
import Billing from './pages/Billing'
import GlobalUsers from './pages/GlobalUsers'
import SystemGuide from './pages/SystemGuide'
import AccessMonitor from './pages/AccessMonitor'

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

              {/* ── Tenant-required routes ──────────────────────────────────────
                  SuperAdmin has no tenantId → redirected to /admin/tenants.
                  All operational screens (evaluations, team, billing…) live here. */}
              <Route element={<ProtectedRoute tenantRequired />}>
                <Route index element={<Dashboard />} />

                {/* Evaluations */}
                <Route path="evaluations">
                  <Route index element={<EvaluationHistory />} />
                  <Route element={<ProtectedRoute minRole="Broker" />}>
                    <Route path="new" element={<NewEvaluation />} />
                  </Route>
                  <Route path="result" element={<EvaluationResult />} />
                  <Route path=":id" element={<EvaluationResult />} />
                </Route>

                {/* Broker+ */}
                <Route element={<ProtectedRoute minRole="Broker" />}>
                  <Route path="triggers/new" element={<NewTrigger />} />
                  <Route path="clients" element={<ClientHistory />} />
                </Route>

                {/* Manager+ */}
                <Route element={<ProtectedRoute minRole="Manager" />}>
                  <Route path="team" element={<TeamManagement />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="audit" element={<AuditVerify />} />
                  <Route path="engine" element={<EngineInfo />} />
                </Route>

                {/* TenantOwner+ */}
                <Route element={<ProtectedRoute minRole="TenantOwner" />}>
                  <Route path="settings" element={<TenantSettings />} />
                  <Route path="billing" element={<Billing />} />
                </Route>
              </Route>

              {/* ── SuperAdmin routes ────────────────────────────────────────── */}
              <Route element={<ProtectedRoute minRole="SuperAdmin" />}>
                <Route path="admin/tenants" element={<TenantManagement />} />
                <Route path="admin/users" element={<GlobalUsers />} />
                <Route path="admin/access" element={<AccessMonitor />} />
              </Route>

              {/* All authenticated users */}
              <Route path="guide" element={<SystemGuide />} />
              <Route path="profile" element={<UserProfile />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
