import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { LoginPage } from './pages/LoginPage';
import { DashboardOverview } from './pages/DashboardOverview';
import { UserManagement } from './pages/UserManagement';
import { MemberManagement } from './pages/MemberManagement';
import { MemberFormPage } from './pages/MemberFormPage';
import { MemberProfilePage } from './pages/MemberProfilePage';
import { CardManagement } from './pages/CardManagement';
import { EventManagement } from './pages/EventManagement';
import { AttendanceManagement } from './pages/AttendanceManagement';
import { FollowupManagement } from './pages/FollowupManagement';
import { RewardManagement } from './pages/RewardManagement';
import { SettingsPage } from './pages/SettingsPage';
import { BirthdayManagement } from './pages/BirthdayManagement';
import { ReportManagement } from './pages/ReportManagement';
import { QRScanner } from './components/QRScanner';

import { ClassManagement } from './pages/ClassManagement';
import { ClassFormPage } from './pages/ClassFormPage';
import { ClassDetailsPage } from './pages/ClassDetailsPage';
import { SummerActivityManagement } from './pages/SummerActivityManagement';
import { AuditLogsPage } from './pages/AuditLogsPage';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Page error caught by PageErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2.5rem',
          textAlign: 'center',
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          margin: '2rem auto',
          maxWidth: '560px'
        }}>
          <h3 style={{ color: '#f87171', fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            ⚠️ حدث خطأ أثناء تحميل هذه الصفحة
          </h3>
          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'يرجى إعادة المحاولة أو تحديث الصفحة.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.25rem' }}
          >
            إعادة تحميل الصفحة 🔄
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-main)',
        fontSize: '1.1rem',
        fontWeight: 700
      }}>
        جاري تهيئة منظومة الخدمة...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="main-content">
        <Navbar onToggleMobileSidebar={() => setMobileOpen(prev => !prev)} />
        <main className="page-body">
          <PageErrorBoundary>
            <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/users" element={<UserManagement />} />
            
            {/* Members Routes */}
            <Route path="/members" element={<MemberManagement />} />
            <Route path="/members/new" element={<MemberFormPage />} />
            <Route path="/members/:id/edit" element={<MemberFormPage />} />
            <Route path="/members/:id" element={<MemberProfilePage />} />

            {/* Classes Routes */}
            <Route path="/classes" element={<ClassManagement />} />
            <Route path="/classes/new" element={<ClassFormPage />} />
            <Route path="/classes/:id" element={<ClassDetailsPage />} />

            <Route path="/summer-activities" element={<Navigate to="/classes?group_type=Summer" replace />} />
            <Route path="/cards" element={<Navigate to="/members" replace />} />
            <Route path="/scan" element={<QRScanner />} />
            <Route path="/events" element={<EventManagement />} />
            <Route path="/attendance" element={<AttendanceManagement />} />
            <Route path="/followup" element={<FollowupManagement />} />
            <Route path="/rewards" element={<RewardManagement />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/birthdays" element={<BirthdayManagement />} />
            <Route path="/reports" element={<ReportManagement />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
