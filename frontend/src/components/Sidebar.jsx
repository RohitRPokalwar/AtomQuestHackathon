import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';
import {
    IconDashboard, IconGoals, IconCheckin, IconTeam,
    IconReports, IconAnalytics, IconAudit, IconLogout
} from './Icons.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const ICON_MAP = {
    Dashboard: IconDashboard,
    'My Goals': IconGoals,
    'Check-in': IconCheckin,
    'Team Dashboard': IconTeam,
    'Team Check-ins': IconCheckin,
    Reports: IconReports,
    Analytics: IconAnalytics,
    'Admin Dashboard': IconDashboard,
    'Audit Log': IconAudit,
    'Shared KPIs': IconGoals,
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [notifCount, setNotifCount] = useState(0);

    useEffect(() => {
        apiGet('/api/admin/notifications')
            .then(data => { setNotifCount(data.filter(n => !n.read).length); })
            .catch(() => {});
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const employeeLinks = [
        { to: '/employee', label: 'Dashboard' },
        { to: '/goals/create', label: 'My Goals' },
        { to: '/checkin', label: 'Check-in' },
    ];

    const managerLinks = [
        { to: '/manager', label: 'Team Dashboard' },
        { to: '/shared-goals', label: 'Shared KPIs' },
        { to: '/manager/checkins', label: 'Team Check-ins' },
        { to: '/reports', label: 'Reports' },
        { to: '/analytics', label: 'Analytics' },
    ];

    const adminLinks = [
        { to: '/admin', label: 'Admin Dashboard' },
        { to: '/shared-goals', label: 'Shared KPIs' },
        { to: '/reports', label: 'Reports' },
        { to: '/audit', label: 'Audit Log' },
        { to: '/analytics', label: 'Analytics' },
    ];

    const links = user?.role === 'admin' ? adminLinks
                 : user?.role === 'manager' ? managerLinks
                 : employeeLinks;

    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

    return (
        <nav className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">AQ</div>
                <div>
                    <div className="sidebar-brand-text">AtomQuest</div>
                    <div className="sidebar-brand-sub">Goal Portal</div>
                </div>
            </div>

            <div className="hackathon-ribbon">
                <span className="hackathon-ribbon-dot" />
                Hackathon 1.0
            </div>

            <div className="sidebar-section">
                <div className="sidebar-section-label">Navigation</div>
                {links.map(link => {
                    const Icon = ICON_MAP[link.label] || IconDashboard;
                    return (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="sidebar-link-icon"><Icon /></span>
                            <span>{link.label}</span>
                            {link.label === 'Dashboard' && notifCount > 0 && (
                                <span className="notif-count">{notifCount}</span>
                            )}
                        </NavLink>
                    );
                })}
            </div>

            <div className="sidebar-theme">
                <ThemeToggle className="sidebar-theme-toggle" />
            </div>

            <div className="sidebar-user">
                <div className="sidebar-avatar" style={{ background: user?.avatar_color || '#5b8def' }}>
                    {initials}
                </div>
                <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{user?.name}</div>
                    <div className="sidebar-user-role">{user?.role}</div>
                </div>
                <button className="btn-ghost btn-sm" onClick={handleLogout} title="Logout" aria-label="Logout">
                    <IconLogout width={18} height={18} />
                </button>
            </div>
        </nav>
    );
}
