import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GuildProvider } from './contexts/GuildContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ModerationPage } from './pages/ModerationPage';
import { AutoModPage } from './pages/AutoModPage';
import { SecurityPage } from './pages/SecurityPage';
import { TicketsPage } from './pages/TicketsPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { StaffPage } from './pages/StaffPage';
import { WelcomePage } from './pages/WelcomePage';
import { RolesPage } from './pages/RolesPage';
import { LevelingPage } from './pages/LevelingPage';
import { GiveawaysPage } from './pages/GiveawaysPage';
import { EventsPage } from './pages/EventsPage';
import { PollsPage } from './pages/PollsPage';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Icon } from './components/ui/Icon';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-eltron-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-eltron-accent flex items-center justify-center animate-pulse">
          <Icon name="Bot" size={20} className="text-white" />
        </div>
        <p className="text-sm text-eltron-muted">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function ToastRenderer() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onDismiss={removeToast} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/moderation" element={<ProtectedRoute><ModerationPage /></ProtectedRoute>} />
      <Route path="/automod" element={<ProtectedRoute><AutoModPage /></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
      <Route path="/applications" element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
      <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
      <Route path="/roles" element={<ProtectedRoute><RolesPage /></ProtectedRoute>} />
      <Route path="/leveling" element={<ProtectedRoute><LevelingPage /></ProtectedRoute>} />
      <Route path="/giveaways" element={<ProtectedRoute><GiveawaysPage /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
      <Route path="/polls" element={<ProtectedRoute><PollsPage /></ProtectedRoute>} />
      <Route path="/reminders" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <GuildProvider>
            <ToastProvider>
              <ToastRenderer />
              <AppRoutes />
            </ToastProvider>
          </GuildProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
