import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Building2, BrainCircuit, ClipboardList, History, LogOut, ShieldCheck, FileText, Settings, Users } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './modules/auth/LoginPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { EmpresasPage } from './modules/empresas/EmpresasPage';
import { HistorialPage } from './modules/historial/HistorialPage';
import { OrdenesPage } from './modules/ordenes/OrdenesPage';
import { ProfesiogramaGeneratorPage } from './modules/profesiograma/ProfesiogramaGeneratorPage';
import { InformePage } from './modules/informe/InformePage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { UsuariosPage } from './modules/usuarios/UsuariosPage';

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { token, user } = useAuthStore();
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly && user?.rol !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profesiograma', label: 'Profesiograma', icon: BrainCircuit },
  { to: '/informe', label: 'Informe', icon: FileText },
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/ordenes', label: 'Órdenes', icon: ClipboardList },
  { to: '/historial', label: 'Historial', icon: History },
];

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const navItems = user?.rol === 'admin'
    ? [...NAV_ITEMS, { to: '/usuarios', label: 'Usuarios', icon: Users }, { to: '/settings', label: 'Ajustes', icon: Settings }]
    : NAV_ITEMS;

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <aside
        className="print:hidden"
        style={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid var(--color-border)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 24 }}>
          <ShieldCheck size={22} color="#f59e0b" />
          <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, color: 'var(--color-text)' }}>
            Profesiograma
          </span>
        </div>

        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                color: active ? '#f59e0b' : 'var(--color-text-muted)',
                background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
              }}
            >
              <Icon size={16} /> {label}
            </Link>
          );
        })}

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ padding: '0 8px 10px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {user?.nombre ?? user?.email}
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="print:p-0 print:w-full" style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>{children}</main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profesiograma"
        element={
          <ProtectedRoute>
            <Layout>
              <ProfesiogramaGeneratorPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/informe"
        element={
          <ProtectedRoute>
            <Layout>
              <InformePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresas"
        element={
          <ProtectedRoute>
            <Layout>
              <EmpresasPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ordenes"
        element={
          <ProtectedRoute>
            <Layout>
              <OrdenesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/historial"
        element={
          <ProtectedRoute>
            <Layout>
              <HistorialPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <UsuariosPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
