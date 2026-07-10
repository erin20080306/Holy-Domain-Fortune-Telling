import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './state/AuthContext';
import { SplitLayout } from './components/SplitLayout';
import { InstallBanner } from './components/InstallBanner';
import { UpdateBanner } from './components/UpdateBanner';
import { OfflineBanner } from './components/OfflineBanner';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { subscribeNetworkStatus } from './pwa/networkStatus';
import { applyPerfClass } from './lib/device/performanceMode';
import { isAdminSession } from './lib/adminSession';

const OpeningScreen = lazy(() =>
  import('./screens/OpeningScreen').then((module) => ({ default: module.OpeningScreen })),
);
const GuideScreen = lazy(() =>
  import('./screens/GuideScreen').then((module) => ({ default: module.GuideScreen })),
);
const AuthScreen = lazy(() =>
  import('./screens/AuthScreen').then((module) => ({ default: module.AuthScreen })),
);
const ResetPasswordScreen = lazy(() =>
  import('./screens/ResetPasswordScreen').then((module) => ({ default: module.ResetPasswordScreen })),
);
const PlansScreen = lazy(() =>
  import('./screens/PlansScreen').then((module) => ({ default: module.PlansScreen })),
);
const DashboardScreen = lazy(() =>
  import('./screens/DashboardScreen').then((module) => ({ default: module.DashboardScreen })),
);
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((module) => ({ default: module.SettingsScreen })),
);
const AdminDashboard = lazy(() =>
  import('./screens/AdminDashboard').then((module) => ({ default: module.AdminDashboard })),
);
const AuditLogScreen = lazy(() =>
  import('./screens/AuditLogScreen').then((module) => ({ default: module.AuditLogScreen })),
);
const PrivacyScreen = lazy(() =>
  import('./screens/LegalScreens').then((module) => ({ default: module.PrivacyScreen })),
);
const TermsScreen = lazy(() =>
  import('./screens/LegalScreens').then((module) => ({ default: module.TermsScreen })),
);

function RouteLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] text-sm tracking-widest text-[#A89882]">
      載入命理資料中…
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="app-shell muted">載入中…</div>;
  if (!session && !isAdminSession())
    return <Navigate to="/auth?mode=login" replace state={{ from: loc }} />;
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
      // Do not reload while a user may be filling birth data or reading a
      // report. Those screens keep the update banner for an explicit tap.
      autoReloadOnUpdate: () =>
        !['/app', '/auth', '/reset-password'].includes(window.location.pathname),
    });
    if (update) setDoUpdate(() => update);
    return subscribeNetworkStatus(setOnline);
  }, []);

  return (
    <div className="min-h-screen bg-[#050508]">
      <div className="app-shell" style={{ paddingBottom: 0, minHeight: 0 }}>
        <OfflineBanner online={online} />
      </div>
      <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<OpeningScreen />} />
        <Route
          path="/guide"
          element={
            <SplitLayout showBack>
              <GuideScreen />
            </SplitLayout>
          }
        />
        <Route
          path="/auth"
          element={
            <SplitLayout showBack>
              <AuthScreen />
            </SplitLayout>
          }
        />
        <Route
          path="/reset-password"
          element={
            <SplitLayout showBack>
              <ResetPasswordScreen />
            </SplitLayout>
          }
        />
        <Route
          path="/plans"
          element={
            <SplitLayout showBack>
              <PlansScreen />
            </SplitLayout>
          }
        />
        <Route
          path="/privacy"
          element={
            <SplitLayout showBack compactGuide>
              <PrivacyScreen />
            </SplitLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <SplitLayout showBack compactGuide>
              <TermsScreen />
            </SplitLayout>
          }
        />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <SplitLayout showLogout compactGuide>
                <DashboardScreen />
              </SplitLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SplitLayout showLogout>
                <SettingsScreen />
              </SplitLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <SplitLayout showLogout>
              <AdminDashboard />
            </SplitLayout>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <SplitLayout showLogout>
              <AuditLogScreen />
            </SplitLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

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
