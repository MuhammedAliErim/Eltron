import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GuildProvider } from './contexts/GuildContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServerOverviewPage } from './pages/ServerOverviewPage';
import { CommandsPage } from './pages/CommandsPage';
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
import { LevelingConfigPage } from './pages/LevelingConfigPage';
import { GiveawaysPage } from './pages/GiveawaysPage';
import { EventsPage } from './pages/EventsPage';
import { PollsPage } from './pages/PollsPage';
import { RemindersPage } from './pages/RemindersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AutoResponsesPage } from './pages/AutoResponsesPage';
import { TagsPage } from './pages/TagsPage';
import { CustomCommandsPage } from './pages/CustomCommandsPage';
import { CountingPage } from './pages/CountingPage';
import { StatsChannelsPage } from './pages/StatsChannelsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BotStatusPage } from './pages/BotStatusPage';
import { EmojiStatsPage } from './pages/EmojiStatsPage';
import { ServerTemplatePage } from './pages/ServerTemplatePage';
import { MessageLogsPage } from './pages/MessageLogsPage';
import { LockdownsPage } from './pages/LockdownsPage';
import { BanAppealsPage } from './pages/BanAppealsPage';
import { StarboardPage } from './pages/StarboardPage';
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
      <Route path="/dashboard" element={<ProtectedRoute><ErrorBoundary><DashboardPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/overview" element={<ProtectedRoute><ErrorBoundary><ServerOverviewPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/commands" element={<ProtectedRoute><ErrorBoundary><CommandsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><ErrorBoundary><AnalyticsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/moderation" element={<ProtectedRoute><ErrorBoundary><ModerationPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/message-logs" element={<ProtectedRoute><ErrorBoundary><MessageLogsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/lockdowns" element={<ProtectedRoute><ErrorBoundary><LockdownsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/ban-appeals" element={<ProtectedRoute><ErrorBoundary><BanAppealsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/starboard" element={<ProtectedRoute><ErrorBoundary><StarboardPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/automod" element={<ProtectedRoute><ErrorBoundary><AutoModPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute><ErrorBoundary><SecurityPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><ErrorBoundary><TicketsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/applications" element={<ProtectedRoute><ErrorBoundary><ApplicationsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><ErrorBoundary><StaffPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/welcome" element={<ProtectedRoute><ErrorBoundary><WelcomePage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/roles" element={<ProtectedRoute><ErrorBoundary><RolesPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/leveling" element={<ProtectedRoute><ErrorBoundary><LevelingPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/leveling-config" element={<ProtectedRoute><ErrorBoundary><LevelingConfigPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/giveaways" element={<ProtectedRoute><ErrorBoundary><GiveawaysPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><ErrorBoundary><EventsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/polls" element={<ProtectedRoute><ErrorBoundary><PollsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/reminders" element={<ProtectedRoute><ErrorBoundary><RemindersPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><ErrorBoundary><AuditLogsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/auto-responses" element={<ProtectedRoute><ErrorBoundary><AutoResponsesPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/tags" element={<ProtectedRoute><ErrorBoundary><TagsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/custom-commands" element={<ProtectedRoute><ErrorBoundary><CustomCommandsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/counting" element={<ProtectedRoute><ErrorBoundary><CountingPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/stats-channels" element={<ProtectedRoute><ErrorBoundary><StatsChannelsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><ErrorBoundary><SettingsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/bot-status" element={<ProtectedRoute><ErrorBoundary><BotStatusPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/emoji-stats" element={<ProtectedRoute><ErrorBoundary><EmojiStatsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/template" element={<ProtectedRoute><ErrorBoundary><ServerTemplatePage /></ErrorBoundary></ProtectedRoute>} />
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
            <ThemeProvider>
              <ToastProvider>
                <ToastRenderer />
                <AppRoutes />
              </ToastProvider>
            </ThemeProvider>
          </GuildProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
