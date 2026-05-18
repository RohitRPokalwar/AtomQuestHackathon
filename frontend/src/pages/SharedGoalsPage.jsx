import { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SharedGoalPushForm from '../components/SharedGoalPushForm.jsx';

export default function SharedGoalsPage() {
    const [pushed, setPushed] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = () => {
        apiGet('/api/shared/pushed', true)
            .then(setPushed)
            .catch(() => showToast('Failed to load push history', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadHistory(); }, []);

    return (
        <div className="animate-in">
            <PageHeader
                title="Push Shared KPI"
                subtitle="Assign the same departmental goal to multiple employees — primary owner syncs achievement"
                badge="BRD · Shared Goals"
            />

            <div className="card mb-24 shared-workflow-card">
                <h3 className="shared-workflow-title">How it works</h3>
                <ol className="shared-workflow-steps">
                    <li><strong>Manager / HR</strong> defines one KPI and selects team members.</li>
                    <li><strong>Primary owner</strong> (one employee) logs achievement at check-in.</li>
                    <li><strong>Other recipients</strong> see the same result — title & target are read-only; they may change <strong>weightage only</strong>.</li>
                </ol>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                <div className="card">
                    <h2 className="section-title">New shared KPI</h2>
                    <SharedGoalPushForm onSuccess={loadHistory} showWorkflowHint={false} />
                </div>

                <div>
                    <h2 className="section-title">Previously pushed</h2>
                    {loading ? (
                        <div className="skeleton" style={{ height: 120 }} />
                    ) : pushed.length === 0 ? (
                        <div className="empty-state card">
                            <div className="empty-state-title">No shared KPIs yet</div>
                            <p style={{ color: 'var(--text-muted)' }}>Pushed goals appear here</p>
                        </div>
                    ) : (
                        pushed.map(row => (
                            <div key={row.source_goal_id || row.id} className="card mb-12">
                                <div className="goal-card-title">{row.title}</div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Primary: {row.primary_owner_name} · {row.recipient_count || row.recipients} recipients
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    Target: {row.target_value ?? row.target_date ?? '—'} · {row.uom_type}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
