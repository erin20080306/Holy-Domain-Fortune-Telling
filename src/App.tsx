import { useEffect, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './state/AuthContext';
import { OpeningScreen } from './screens/OpeningScreen';
import { AuthScreen } from './screens/AuthScreen';
import { PlansScreen } from './screens/PlansScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AdminDashboard } from './screens/AdminDashboard';
import { AuditLogScreen } from './screens/AuditLogScreen';
import { InstallBanner } from './components/InstallBanner';
import { UpdateBanner } from './components/UpdateBanner';
import { OfflineBanner } from './components/OfflineBanner';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { subscribeNetworkStatus } from './pwa/networkStatus';
import { applyPerfClass } from './lib/device/performanceMode';

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="app-shell muted">載入中…</div>;
  if (!session) return <Navigate to="/auth?mode=login" replace state={{ from: loc }} />;
  return <>{children}</>;
}

function Shell() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [online, setOnline] = useState(true);
  const [doUpdate, setDoUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    applyPerfClass();
    const update = registerServiceWorker({
      onNeedRefresh: () => setNeedRefresh(true),
    });
    if (update) setDoUpdate(() => update);
    return subscribeNetworkStatus(setOnline);
  }, []);

  return (
    <div className="min-h-screen bg-[#050508]">
      <div className="app-shell" style={{ paddingBottom: 0, minHeight: 0 }}>
        <OfflineBanner online={online} />
      </div>
      <Routes>
        <Route path="/" element={<OpeningScreen />} />
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/plans" element={<PlansScreen />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <DashboardScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RequireAuth>
              <AuditLogScreen />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <InstallBanner />
      <UpdateBanner visible={needRefresh} onUpdate={() => doUpdate?.()} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
