import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { LoginPage } from './pages/LoginPage';
import { DashboardOverview } from './pages/DashboardOverview';
import { UserManagement } from './pages/UserManagement';
import { MemberManagement } from './pages/MemberManagement';
import { CardManagement } from './pages/CardManagement';
import { EventManagement } from './pages/EventManagement';
import { AttendanceManagement } from './pages/AttendanceManagement';
import { FollowupManagement } from './pages/FollowupManagement';
import { RewardManagement } from './pages/RewardManagement';
import { SettingsPage } from './pages/SettingsPage';
import { BirthdayManagement } from './pages/BirthdayManagement';
import { ReportManagement } from './pages/ReportManagement';
import { QRScanner } from './components/QRScanner';

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
        background: 'var(--bg-gradient)',
        color: 'var(--text-main)',
        fontSize: '1.2rem',
        fontWeight: 700
      }}>
        جاري تهيئة نظام المسلة...
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
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/members" element={<MemberManagement />} />
            <Route path="/cards" element={<CardManagement />} />
            <Route path="/scan" element={<QRScanner />} />
            <Route path="/events" element={<EventManagement />} />
            <Route path="/attendance" element={<AttendanceManagement />} />
            <Route path="/followup" element={<FollowupManagement />} />
            <Route path="/rewards" element={<RewardManagement />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/birthdays" element={<BirthdayManagement />} />
            <Route path="/reports" element={<ReportManagement />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
