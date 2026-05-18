import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';
import WeightageRing from '../components/WeightageRing.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { IconUsers, IconGoals, IconSpark, IconTrend } from '../components/Icons.jsx';
import CyclesPanel from '../components/CyclesPanel.jsx';

export default function AdminDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [sheets, setSheets] = useState([]);
    const [users, setUsers] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'employee', department: 'Engineering', manager_id: '' });
    const [creating, setCreating] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [escalations, setEscalations] = useState([]);
    const [runningEscalations, setRunningEscalations] = useState(false);

    const loadData = () => {
        Promise.all([
            apiGet('/api/admin/dashboard', true),
            apiGet('/api/admin/all-sheets', true),
            apiGet('/api/admin/users', true),
            apiGet('/api/admin/managers', true),
        ]).then(([dash, sh, usr, mgrs]) => {
            setDashboard(dash);
            setSheets(sh);
            setUsers(usr);
            setManagers(mgrs);
        }).catch(() => showToast('Failed to load dashboard', 'error'))
          .finally(() => setLoading(false));
    };

    const loadEscalations = () => {
        apiGet('/api/admin/escalations?status=open', true)
            .then(setEscalations)
            .catch(() => {});
    };

    useEffect(() => {
        loadData();
        loadEscalations();
    }, []);

    const handleRunEscalations = async () => {
        setRunningEscalations(true);
        try {
            const res = await apiPost('/api/admin/escalations/run', {});
            showToast(res.message || 'Escalation scan complete', 'success');
            loadEscalations();
        } catch (err) {
            showToast(err.message, 'error');
        }
        setRunningEscalations(false);
    };

    const handleResolveEscalation = async (id) => {
        try {
            await apiPost(`/api/admin/escalations/${id}/resolve`, {});
            showToast('Escalation resolved', 'success');
            loadEscalations();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleUnlock = async (sheetId) => {
        try {
            await apiPost(`/api/admin/sheets/${sheetId}/unlock`, {});
            showToast('Sheet unlocked', 'success');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.password || !newUser.name) {
            return showToast('All fields are required', 'error');
        }
        setCreating(true);
        try {
            await apiPost('/api/admin/users', {
                ...newUser,
                manager_id: newUser.manager_id ? Number(newUser.manager_id) : null
            });
            showToast('User created successfully', 'success');
            setShowCreateUser(false);
            setNewUser({ email: '', password: '', name: '', role: 'employee', department: 'Engineering', manager_id: '' });
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
        setCreating(false);
    };

    const handleAssignManager = async (userId, managerId) => {
        try {
            await apiPut(`/api/admin/users/${userId}`, { manager_id: managerId ? Number(managerId) : null });
            showToast('Manager assigned', 'success');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const handleChangeRole = async (userId, role) => {
        try {
            await apiPut(`/api/admin/users/${userId}`, { role });
            showToast('Role updated', 'success');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const handleDeleteUser = async (userId, name) => {
        if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast('User deleted', 'success');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    if (loading) return <div><div className="skeleton" style={{ width: 250, height: 32, marginBottom: 24 }} />
        <div className="stats-grid">{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}</div></div>;

    const d = dashboard || {};

    return (
        <div className="animate-in">
            <PageHeader
                title="Admin Dashboard"
                subtitle="Cycle management, org hierarchy, completion rates & audit governance"
                badge="Admin / HR"
                actions={<button className="btn btn-primary" onClick={() => setShowCreateUser(true)}>Create User</button>}
            />

            <div className="dashboard-tabs flex flex-gap-8 flex-wrap mb-24">
                {['overview', 'cycles', 'users', 'sheets'].map(tab => (
                    <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'} btn-sm`}
                        onClick={() => setActiveTab(tab)} style={{ textTransform: 'capitalize' }}>
                        {tab === 'sheets' ? 'Goal Sheets' : tab === 'cycles' ? 'Annual Cycle' : tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <>
                    <div className="stats-grid">
                        <StatCard label="Total Employees" value={d.totalEmployees || 0} accent="blue" icon={IconUsers} />
                        <StatCard label="Total Managers" value={d.totalManagers || 0} accent="purple" icon={IconSpark} />
                        <StatCard label="Goals Approved" value={d.sheetsApproved || 0} accent="green" icon={IconGoals} />
                        <StatCard label="Completion Rate" accent="cyan" icon={IconTrend}>
                            <div className="stat-metric-row">
                                <WeightageRing value={d.completionRate || 0} size={44} showCenterLabel={false} />
                                <span className="stat-value stat-value--compact">{d.completionRate || 0}%</span>
                            </div>
                        </StatCard>
                    </div>

                    {d.deptStats?.length > 0 && (
                        <div className="mb-32">
                            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Department Breakdown</h2>
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <table className="data-table">
                                    <thead><tr><th>Department</th><th>Employees</th><th>Approved</th><th>Pending</th><th>Rate</th></tr></thead>
                                    <tbody>
                                        {d.deptStats.map(dept => (
                                            <tr key={dept.department}>
                                                <td style={{ fontWeight: 600 }}>{dept.department}</td>
                                                <td>{dept.total_employees}</td>
                                                <td style={{ color: 'var(--accent-green)' }}>{dept.approved_sheets}</td>
                                                <td style={{ color: 'var(--accent-amber)' }}>{dept.pending_sheets}</td>
                                                <td>
                                                    <div className="progress-bar-wrapper" style={{ width: 100, height: 6 }}>
                                                        <div className="progress-bar-fill green"
                                                            style={{ width: `${dept.total_employees ? (dept.approved_sheets / dept.total_employees) * 100 : 0}%` }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {d.activeCycle && (
                        <div className="countdown-banner mb-16">
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>Active: {d.activeCycle.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {d.activeCycle.window_open} to {d.activeCycle.window_close}
                                </div>
                            </div>
                            <span className="badge badge-on_track">Active</span>
                        </div>
                    )}

                    <div className="card mb-24 escalation-panel">
                        <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Escalation Engine</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                                    BRD 5.3 — Flags employees without submitted goals, managers with pending approvals, and missing check-ins.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleRunEscalations}
                                disabled={runningEscalations}
                            >
                                {runningEscalations ? 'Scanning...' : 'Trigger Escalation Scan'}
                            </button>
                        </div>
                        {escalations.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                No open escalations. Run a scan to detect overdue submissions or approvals (e.g. Rohit awaiting Arjun).
                            </p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Rule</th>
                                            <th>User</th>
                                            <th>Cycle</th>
                                            <th>Level</th>
                                            <th>Triggered</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {escalations.map(e => (
                                            <tr key={e.id}>
                                                <td style={{ fontSize: 13 }}>{e.rule_label || e.rule_type}</td>
                                                <td>{e.target_name}</td>
                                                <td>{e.cycle_name || '—'}</td>
                                                <td>L{e.escalation_level}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {new Date(e.triggered_at).toLocaleString()}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() => handleResolveEscalation(e.id)}
                                                    >
                                                        Resolve
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'cycles' && <CyclesPanel />}

            {activeTab === 'users' && (
                <>
                    <div className="flex-between mb-16">
                        <h2 style={{ fontSize: 18, fontWeight: 600 }}>User Management ({users.length} users)</h2>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateUser(true)}>Add User</button>
                    </div>
                    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Manager</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div className="sidebar-avatar" style={{ background: u.avatar_color, width: 28, height: 28, fontSize: 10 }}>
                                                    {u.name?.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                {u.name}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                                        <td>
                                            <select className="form-select" style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
                                                value={u.role} onChange={e => handleChangeRole(u.id, e.target.value)}
                                                disabled={u.role === 'admin'}>
                                                <option value="employee">Employee</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>{u.department}</td>
                                        <td>
                                            {u.role === 'employee' ? (
                                                <select className="form-select" style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
                                                    value={u.manager_id || ''} onChange={e => handleAssignManager(u.id, e.target.value)}>
                                                    <option value="">No manager</option>
                                                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                </select>
                                            ) : (
                                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.manager_name || '-'}</span>
                                            )}
                                        </td>
                                        <td>
                                            {u.role !== 'admin' && (
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)', fontSize: 12 }}
                                                    onClick={() => handleDeleteUser(u.id, u.name)}>Delete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                        No users yet. Click "Add User" to create employees and managers.
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'sheets' && (
                <>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>All Goal Sheets</h2>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Employee</th><th>Manager</th><th>Dept</th><th>Goals</th><th>Status</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {sheets.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div className="sidebar-avatar" style={{ background: s.avatar_color, width: 28, height: 28, fontSize: 10 }}>
                                                    {s.employee_name?.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                {s.employee_name}
                                            </div>
                                        </td>
                                        <td>{s.manager_name || '-'}</td>
                                        <td>{s.department}</td>
                                        <td>{s.goal_count}</td>
                                        <td><span className={`badge badge-${s.status}`}>{s.status?.replace('_', ' ')}</span></td>
                                        <td>
                                            {s.locked ? (
                                                <button className="btn btn-outline btn-sm" onClick={() => handleUnlock(s.id)}>Unlock</button>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {sheets.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                        No goal sheets yet. Employees need to create and submit their goals.
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {showCreateUser && (
                <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Create New User</div>

                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" placeholder="e.g. Arjun Mehta" value={newUser.name}
                                onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" type="email" placeholder="arjun@company.com" value={newUser.email}
                                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" placeholder="Min 6 characters" value={newUser.password}
                                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select className="form-select" value={newUser.role}
                                    onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select className="form-select" value={newUser.department}
                                    onChange={e => setNewUser(p => ({ ...p, department: e.target.value }))}>
                                    {['Engineering', 'Operations', 'HR', 'Finance', 'Marketing', 'Sales'].map(dep => (
                                        <option key={dep} value={dep}>{dep}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {newUser.role === 'employee' && managers.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Assign Manager</label>
                                <select className="form-select" value={newUser.manager_id}
                                    onChange={e => setNewUser(p => ({ ...p, manager_id: e.target.value }))}>
                                    <option value="">Select manager</option>
                                    {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.department})</option>)}
                                </select>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setShowCreateUser(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateUser} disabled={creating}>
                                {creating ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
