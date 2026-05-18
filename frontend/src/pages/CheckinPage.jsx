import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiGet, apiPost } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';

export default function CheckinPage() {
    const { user } = useAuth();
    const isManager = user.role === 'manager';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const endpoint = isManager ? '/api/checkins/team' : '/api/checkins/my-checkins';
        apiGet(endpoint, true)
            .then(d => setData(d))
            .catch(() => showToast('Failed to load check-in data', 'error'))
            .finally(() => setLoading(false));
    }, [isManager]);

    if (loading) return <div><div className="skeleton" style={{ width: 250, height: 32, marginBottom: 24 }} /></div>;

    if (isManager) return <ManagerCheckinView data={data} />;
    return <EmployeeCheckinView data={data} />;
}

function EmployeeCheckinView({ data }) {
    const { goals, cycle, windowOpen, adminOverride } = data || {};
    const [updates, setUpdates] = useState({});
    const [saving, setSaving] = useState({});

    const handleUpdate = (goalId, field, value) => {
        setUpdates(prev => ({
            ...prev,
            [goalId]: { ...prev[goalId], [field]: value }
        }));
    };

    const handleSubmit = async (goalId) => {
        const upd = updates[goalId];
        if (!upd) return;

        setSaving(prev => ({ ...prev, [goalId]: true }));
        try {
            await apiPost('/api/checkins/submit', {
                goal_id: goalId,
                actual_value: Number(upd.actual_value),
                status: upd.status || 'on_track',
                employee_notes: upd.employee_notes || ''
            });
            showToast('Check-in saved', 'success');
        } catch (err) { showToast(err.message, 'error'); }
        setSaving(prev => ({ ...prev, [goalId]: false }));
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">Quarterly Check-in</h1>
                <p className="page-subtitle">
                    {cycle ? `${cycle.name} | ${new Date(cycle.window_open).toLocaleDateString()} - ${new Date(cycle.window_close).toLocaleDateString()}` : 'No active cycle'}
                </p>
            </div>

            {adminOverride && (
                <div className="countdown-banner mb-24">
                    <div>
                        <div className="countdown-text" style={{ color: 'var(--accent-green)' }}>Check-in period opened by HR / Admin</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            {cycle?.name} — scheduled: {new Date(cycle?.window_open).toLocaleDateString()} to {new Date(cycle?.window_close).toLocaleDateString()}
                        </div>
                    </div>
                    <span className="badge badge-on_track">Open</span>
                </div>
            )}

            {!windowOpen && (
                <div className="countdown-banner closed mb-24">
                    <div>
                        <div className="countdown-text" style={{ color: 'var(--accent-amber)' }}>Check-in window is currently closed</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            {cycle ? `${cycle.name} opens ${new Date(cycle.window_open).toLocaleDateString()}. Ask HR to activate it under Admin → Annual Cycle.` : 'Contact admin to configure check-in cycles'}
                        </div>
                    </div>
                </div>
            )}

            {(!goals || goals.length === 0) ? (
                <div className="empty-state card">
                    <div className="empty-state-title">No Locked Goals</div>
                    <p style={{ color: 'var(--text-muted)' }}>Your goals must be approved and locked before check-ins</p>
                </div>
            ) : (
                goals.map(goal => {
                    const upd = updates[goal.id] || {};
                    const existing = goal.checkin;
                    const isRecipient = goal.shared_role === 'recipient';

                    return (
                        <div key={goal.id} className="card mb-16">
                            <div className="flex-between mb-8">
                                <div className="goal-card-title">
                                    {goal.title}
                                    {goal.shared_role === 'primary' && (
                                        <span className="badge badge-on_track" style={{ marginLeft: 8 }}>Primary — you sync team</span>
                                    )}
                                    {isRecipient && (
                                        <span className="badge badge-submitted" style={{ marginLeft: 8 }}>Synced KPI</span>
                                    )}
                                </div>
                                <span className={`badge badge-${goal.risk_flag || goal.status}`}>
                                    {(goal.risk_flag === 'at_risk' ? 'At Risk' : goal.risk_flag === 'off_track' ? 'Off Track' : goal.status?.replace('_', ' '))}
                                </span>
                            </div>
                            <div className="goal-card-meta mb-16">
                                <span>Type: {goal.uom_type}</span>
                                <span>Target: {goal.target_value || goal.target_date}</span>
                                <span>Weight: {goal.weightage}%</span>
                            </div>

                            {windowOpen && isRecipient ? (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '12px 0' }}>
                                    Achievement is updated by the primary owner and syncs here automatically.
                                    Current: {existing?.actual_value ?? goal[`achievement_${cycle?.phase?.toLowerCase()}`] ?? 'Not yet reported'}
                                </p>
                            ) : windowOpen ? (
                                <div className="form-row">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Actual Achievement</label>
                                        <input type="number" className="form-input"
                                            placeholder={existing?.actual_value ?? 'Enter value'}
                                            value={upd.actual_value ?? existing?.actual_value ?? ''}
                                            onChange={e => handleUpdate(goal.id, 'actual_value', e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Status</label>
                                        <select className="form-select"
                                            value={upd.status || existing?.status || 'not_started'}
                                            onChange={e => handleUpdate(goal.id, 'status', e.target.value)}>
                                            <option value="not_started">Not Started</option>
                                            <option value="on_track">On Track</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                            ) : existing ? (
                                <div className="goal-card-meta">
                                    <span>Achievement: {existing.actual_value}</span>
                                    <span>Status: {existing.status?.replace('_', ' ')}</span>
                                    {existing.manager_comment && <span>Manager: {existing.manager_comment}</span>}
                                </div>
                            ) : null}

                            {windowOpen && !isRecipient && (
                                <>
                                    <div className="form-group mt-16" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Notes</label>
                                        <textarea className="form-textarea" rows={2} placeholder="Add notes about your progress..."
                                            value={upd.employee_notes ?? existing?.employee_notes ?? ''}
                                            onChange={e => handleUpdate(goal.id, 'employee_notes', e.target.value)} />
                                    </div>
                                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => handleSubmit(goal.id)}
                                            disabled={saving[goal.id]}>
                                            {saving[goal.id] ? 'Saving...' : 'Save Check-in'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {goal.score !== null && goal.score !== undefined && (
                                <div style={{ marginTop: 12 }}>
                                    <div className="progress-bar-wrapper">
                                        <div className={`progress-bar-fill ${goal.score >= 80 ? 'green' : goal.score >= 50 ? 'amber' : 'red'}`}
                                            style={{ width: `${Math.min(goal.score, 100)}%` }} />
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Score: {goal.score}%</div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}

function ManagerCheckinView({ data }) {
    const { employees, cycle } = data || {};
    const [expandedEmp, setExpandedEmp] = useState(null);
    const [comments, setComments] = useState({});
    const [saving, setSaving] = useState({});

    const handleComment = async (goalId, quarter) => {
        const comment = comments[goalId];
        if (!comment) return;

        setSaving(prev => ({ ...prev, [goalId]: true }));
        try {
            await apiPost('/api/checkins/comment', { goal_id: goalId, quarter: cycle?.phase || 'Q1', comment });
            showToast('Comment added', 'success');
        } catch (err) { showToast(err.message, 'error'); }
        setSaving(prev => ({ ...prev, [goalId]: false }));
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">Team Check-ins</h1>
                <p className="page-subtitle">{cycle?.name || 'No active check-in cycle'}</p>
            </div>

            {(!employees || employees.length === 0) ? (
                <div className="empty-state card"><div className="empty-state-title">No team members found</div></div>
            ) : (
                employees.map(emp => (
                    <div key={emp.id} className="card mb-16" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="flex-between" style={{ padding: '16px 20px', cursor: 'pointer' }}
                            onClick={() => setExpandedEmp(expandedEmp === emp.id ? null : emp.id)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="sidebar-avatar" style={{ background: emp.avatar_color, width: 36, height: 36, fontSize: 13 }}>
                                    {emp.name?.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.department} | {emp.goals?.length || 0} goals</div>
                                </div>
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>{expandedEmp === emp.id ? 'Collapse' : 'Expand'}</span>
                        </div>

                        {expandedEmp === emp.id && (
                            <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                                {emp.goals?.length === 0 ? (
                                    <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No locked goals</p>
                                ) : emp.goals?.map(goal => (
                                    <div key={goal.id} style={{ padding: '16px 0', borderBottom: '1px solid rgba(45,49,72,0.3)' }}>
                                        <div className="flex-between mb-8">
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{goal.title}</span>
                                            <span className={`badge badge-${goal.risk_flag || 'not_started'}`}>
                                                {goal.risk_flag === 'at_risk' ? 'At Risk' : goal.risk_flag === 'off_track' ? 'Off Track' : goal.checkin_status?.replace('_', ' ') || 'Pending'}
                                            </span>
                                        </div>
                                        <div className="goal-card-meta mb-8">
                                            <span>Planned: {goal.target_value || goal.target_date}</span>
                                            <span>Actual: {goal.checkin_value ?? 'Not reported'}</span>
                                            <span>Score: {goal.score !== null ? `${goal.score}%` : 'N/A'}</span>
                                        </div>
                                        {goal.employee_notes && (
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                                Employee: {goal.employee_notes}
                                            </p>
                                        )}
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input className="form-input" style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                                                placeholder="Add check-in comment..."
                                                value={comments[goal.id] || goal.manager_comment || ''}
                                                onChange={e => setComments(prev => ({ ...prev, [goal.id]: e.target.value }))} />
                                            <button className="btn btn-primary btn-sm" onClick={() => handleComment(goal.id)}
                                                disabled={saving[goal.id]}>
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
