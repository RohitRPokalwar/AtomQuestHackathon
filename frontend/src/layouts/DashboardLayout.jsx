import Sidebar from '../components/Sidebar.jsx';
import ToastContainer from '../components/Toast.jsx';
import AppBackground from '../components/AppBackground.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout({ children }) {
    const { user } = useAuth();
    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="app-layout">
            <AppBackground />
            <Sidebar />
            <main className="main-content">
                <div className="top-bar">
                    <div className="top-bar-greeting">
                        Signed in as <strong>{user?.name}</strong>
                        <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
                        <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                    </div>
                    <div className="top-bar-actions">
                        <ThemeToggle />
                        <div className="top-bar-date">{today}</div>
                    </div>
                </div>
                {children}
            </main>
            <ToastContainer />
        </div>
    );
}
