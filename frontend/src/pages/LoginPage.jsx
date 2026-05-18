import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppBackground from '../components/AppBackground.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

const FEATURES = [
    { icon: '1', title: 'Phase 1 — Goal Creation', desc: 'Thrust areas, UoM, targets, 100% weightage (min 10%, max 8 goals)' },
    { icon: '2', title: 'Phase 2 — Check-ins', desc: 'Quarterly planned vs. actual with manager comments' },
    { icon: 'M', title: 'Manager Approval', desc: 'Review, inline edit, return for rework, lock on approval' },
    { icon: 'A', title: 'Reports & Audit', desc: 'CSV export, completion dashboard, full audit trail' },
];

export default function LoginPage() {
    const { login, register, user } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', name: '', department: 'Engineering', role: 'employee' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        fetch('/api/auth/departments').then(r => r.json()).then(setDepartments).catch(() => {});
    }, []);

    if (user) {
        navigate('/', { replace: true });
        return null;
    }

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let u;
            if (isRegister) {
                if (!form.name.trim()) throw new Error('Full name is required');
                if (form.password.length < 6) throw new Error('Password must be at least 6 characters');
                u = await register(form);
            } else {
                u = await login(form.email, form.password);
            }
            navigate(u.role === 'admin' ? '/admin' : u.role === 'manager' ? '/manager' : '/employee');
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <AppBackground />

            <section className="login-hero">
                <div className="login-hero-bg" />
                <div className="login-hero-content animate-in">

                    <h1>
                        Goal Setting &amp; <span>Tracking Portal</span>
                    </h1>
                    <p className="login-hero-tagline">
                        Structured digital goals from creation and L1 approval through quarterly check-ins —
                        aligned, visible, and audit-ready for your organization.
                    </p>
                    <div className="login-features">
                        {FEATURES.map(f => (
                            <div key={f.title} className="login-feature">
                                <div className="login-feature-icon">{f.icon}</div>
                                <div>
                                    <h3>{f.title}</h3>
                                    <p>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="login-panel">
                <div className="login-panel-theme">
                    <ThemeToggle />
                </div>
                <div className="login-container animate-in">
                    <div className="login-card">
                        <div className="login-brand">
                            <div className="login-brand-icon">AQ</div>
                            <h1>Welcome Back</h1>
                            <p>{isRegister ? 'Create your AtomQuest account' : 'Sign in to your goal portal'}</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {isRegister && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-name">Full Name</label>
                                    <input
                                        id="reg-name"
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Arjun Mehta"
                                        value={form.name}
                                        onChange={e => updateForm('name', e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label" htmlFor="login-email">Email</label>
                                <input
                                    id="login-email"
                                    type="email"
                                    className="form-input"
                                    placeholder="you@company.com"
                                    value={form.email}
                                    onChange={e => updateForm('email', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="login-password">Password</label>
                                <input
                                    id="login-password"
                                    type="password"
                                    className="form-input"
                                    placeholder={isRegister ? 'Min 6 characters' : 'Enter password'}
                                    value={form.password}
                                    onChange={e => updateForm('password', e.target.value)}
                                    required
                                />
                            </div>

                            {isRegister && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="reg-dept">Department</label>
                                        <select
                                            id="reg-dept"
                                            className="form-select"
                                            value={form.department}
                                            onChange={e => updateForm('department', e.target.value)}
                                        >
                                            {(departments.length > 0 ? departments : ['Engineering', 'Operations', 'HR', 'Finance', 'Marketing', 'Sales']).map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="reg-role">Role</label>
                                        <select
                                            id="reg-role"
                                            className="form-select"
                                            value={form.role}
                                            onChange={e => updateForm('role', e.target.value)}
                                        >
                                            <option value="employee">Employee</option>
                                            <option value="manager">Manager</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {error && <div className="form-error mb-16">{error}</div>}

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%' }}
                                disabled={loading}
                            >
                                {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
                            </button>
                        </form>

                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                                style={{ fontSize: 13 }}
                            >
                                {isRegister ? 'Already have an account? Sign In' : 'New user? Create Account'}
                            </button>
                        </div>

                        {!isRegister && (
                            <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600, marginBottom: 12, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                    Hackathon Demo Quick Login
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary btn-sm"
                                        style={{ flex: 1, padding: '6px 4px', fontSize: 12 }}
                                        onClick={() => setForm(prev => ({...prev, email: 'admin@atomquest.com', password: 'admin123'}))}
                                    >
                                        Admin
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary btn-sm"
                                        style={{ flex: 1, padding: '6px 4px', fontSize: 12 }}
                                        onClick={() => setForm(prev => ({...prev, email: 'manager@atomquest.com', password: 'manager123'}))}
                                    >
                                        Manager
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary btn-sm"
                                        style={{ flex: 1, padding: '6px 4px', fontSize: 12 }}
                                        onClick={() => setForm(prev => ({...prev, email: 'employee@atomquest.com', password: 'employee123'}))}
                                    >
                                        Rohit
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
