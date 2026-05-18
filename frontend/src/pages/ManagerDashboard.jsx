import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';
import WeightageRing from '../components/WeightageRing.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import SharedGoalPushForm from '../components/SharedGoalPushForm.jsx';
import { IconTeam, IconGoals, IconSpark, IconTrend } from '../components/Icons.jsx';

export default function ManagerDashboard() {
    const [sheets, setSheets] = useState([]);
    const [pushedCount, setPushedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showSharedModal, setShowSharedModal] = useState(false);

    useEffect(() => {
        Promise.all([
            apiGet('/api/goals/team-sheets', true),
            apiGet('/api/shared/pushed', true).catch(() => []),
        ])
            .then(([data, pushed]) => {
                setSheets(data);
                setPushedCount(pushed?.length || 0);
            })
            .catch(() => showToast('Failed to load team data', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const refreshPushed = () => {
        apiGet('/api/shared/pushed', true)
            .then(p => setPushedCount(p?.length || 0))
            .catch(() => {});
    };

    if (loading) {
        return (
            <div>
                <div className="page-header"><div className="skeleton" style={{ width: 250, height: 32 }} /></div>
                <div className="stats-grid">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 110 }} />)}</div>
            </div>
        );
    }

    const submitted = sheets.filter(s => s.status === 'submitted');
    const approved = sheets.filter(s => s.status === 'locked' || s.status === 'approved');
    const pending = sheets.filter(s => s.status === 'draft' || s.status === 'returned');
    const completionRate = sheets.length ? Math.round((approved.length / sheets.length) * 100) : 0;

    return (
        <div className="animate-in">
            <PageHeader
                title="Team Dashboard"
                subtitle="Review and manage goal sheets for your team"
                badge="Manager View"
            />

            <div className="stats-grid">
                <StatCard label="Pending Review" value={submitted.length} accent="amber" icon={IconSpark} />
                <StatCard label="Approved" value={approved.length} accent="green" icon={IconGoals} />
                <StatCard label="Not Submitted" value={pending.length} accent="purple" icon={IconTeam} />
                <StatCard label="Completion Rate" accent="blue" icon={IconTrend}>
                    <div className="stat-metric-row">
                        <WeightageRing value={completionRate} size={44} showCenterLabel={false} />
                        <span className="stat-value stat-value--compact">{completionRate}%</span>
                    </div>
                </StatCard>
            </div>

            <div className="card mb-24 shared-goals-cta-card">
                <div className="flex-between" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h2 className="section-title" style={{ marginBottom: 6 }}>Push Shared KPI</h2>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 520 }}>
                            BRD 2.1 — Assign one departmental KPI to multiple team members. Primary owner syncs achievement at check-in.
                        </p>
                        {pushedCount > 0 && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                {pushedCount} shared KPI{pushedCount !== 1 ? 's' : ''} pushed previously
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                        <Link to="/shared-goals" className="btn btn-outline">View history</Link>
                        <button type="button" className="btn btn-primary" onClick={() => setShowSharedModal(true)}>
                            Create Shared Goal
                        </button>
                    </div>
                </div>
            </div>

            {submitted.length > 0 && (
                <>
                    <h2 className="section-title amber">Awaiting Your Review</h2>
                    {submitted.map(sheet => (
                        <div key={sheet.id} className="goal-card">
                            <div className="goal-card-header">
                                <div>
                                    <div className="goal-card-title">{sheet.employee_name}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        {sheet.department} | {sheet.goal_count} goals | Submitted {new Date(sheet.submitted_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <Link to={`/manager/review/${sheet.id}`} className="btn btn-primary btn-sm">Review</Link>
                            </div>
                        </div>
                    ))}
                </>
            )}

            <h2 className="section-title" style={{ marginTop: 24 }}>All Team Members</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Goals</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sheets.map(sheet => (
                            <tr key={sheet.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="sidebar-avatar" style={{ background: sheet.avatar_color || '#5b8def', width: 32, height: 32, fontSize: 12 }}>
                                            {sheet.employee_name?.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        {sheet.employee_name}
                                    </div>
                                </td>
                                <td>{sheet.department}</td>
                                <td>{sheet.goal_count}</td>
                                <td><span className={`badge badge-${sheet.status}`}>{sheet.status?.replace('_', ' ')}</span></td>
                                <td>
                                    {sheet.status === 'submitted' ? (
                                        <Link to={`/manager/review/${sheet.id}`} className="btn btn-primary btn-sm">Review</Link>
                                    ) : sheet.status === 'locked' ? (
                                        <Link to={`/manager/review/${sheet.id}`} className="btn btn-outline btn-sm">View</Link>
                                    ) : (
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Waiting</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showSharedModal && (
                <div className="modal-overlay" onClick={() => setShowSharedModal(false)}>
                    <div className="modal-content modal-content--wide" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Create Shared Goal</div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                            Requires Phase 1 (Goal Setting) active under Admin → Annual Cycle.
                        </p>
                        <SharedGoalPushForm
                            onSuccess={() => { refreshPushed(); setShowSharedModal(false); }}
                            showWorkflowHint
                        />
                        <div className="modal-actions">
                            <button type="button" className="btn btn-outline" onClick={() => setShowSharedModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
