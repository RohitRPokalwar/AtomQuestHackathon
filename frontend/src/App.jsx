import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppBackground from './components/AppBackground.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import GoalCreatePage from './pages/GoalCreatePage.jsx';
import GoalReviewPage from './pages/GoalReviewPage.jsx';
import CheckinPage from './pages/CheckinPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AuditLogPage from './pages/AuditLogPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SharedGoalsPage from './pages/SharedGoalsPage.jsx';

function LoadingScreen() {
    return (
        <div className="app-loading">
            <AppBackground />
            <div className="app-loading-logo">AQ</div>
            <div className="app-loading-text">AtomQuest Goal Portal</div>
            <div className="app-loading-bar">
                <div className="app-loading-bar-fill" />
            </div>
        </div>
    );
}

function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
    return children;
}

function DashboardRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'manager') return <Navigate to="/manager" />;
    return <Navigate to="/employee" />;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<DashboardRedirect />} />

                    <Route path="/employee" element={
                        <ProtectedRoute roles={['employee']}>
                            <DashboardLayout><EmployeeDashboard /></DashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/goals/create" element={
                        <ProtectedRoute roles={['employee']}>
                            <DashboardLayout><GoalCreatePage /></DashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/checkin" element={
                        <ProtectedRoute roles={['employee']}>
                            <DashboardLayout><CheckinPage /></DashboardLayout>
                        </ProtectedRoute>
                    } />

                    <Route path="/manager" element={
                        <ProtectedRoute roles={['manager']}>
                            <DashboardLayout><ManagerDashboard /></DashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/manager/review/:sheetId" element={
                        <ProtectedRoute roles={['manager']}>
                            <DashboardLayout><GoalReviewPage /></DashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/manager/checkins" element={
                        <ProtectedRoute roles={['manager']}>
                            <DashboardLayout><CheckinPage /></DashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/shared-goals" element={
                        <ProtectedRoute roles={['manager', 'admin']}>
                            <DashboardLayout><SharedGoalsPage /></DashboardLayout>
                        </ProtectedRoute>
                    } />

                    <Route path="/admin" element={
                        <ProtectedRoute roles={['admin']}>
                            <DashboardLayout><AdminDashboard /></DashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/audit" element={
                        <ProtectedRoute roles={['admin']}>
                            <DashboardLayout><AuditLogPage /></DashboardLayout>
                        </ProtectedRoute>
                    } />

                    <Route path="/reports" element={
                        <ProtectedRoute roles={['admin', 'manager']}>
                            <DashboardLayout><ReportsPage /></DashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                        <ProtectedRoute roles={['admin', 'manager']}>
                            <DashboardLayout><AnalyticsPage /></DashboardLayout>
                        </ProtectedRoute>
                    } />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
