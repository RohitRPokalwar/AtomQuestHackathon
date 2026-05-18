import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';

export default function GoalReviewPage() {
    const { sheetId } = useParams();
    const navigate = useNavigate();
    const [sheet, setSheet] = useState(null);
    const [goals, setGoals] = useState([]);
    const [editedGoals, setEditedGoals] = useState([]);
    const [returnComment, setReturnComment] = useState('');
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        apiGet(`/api/goals/sheet/${sheetId}/review`, true)
            .then(data => {
                setSheet(data.sheet);
                setGoals(data.goals);
                setEditedGoals(data.goals.map(g => ({
                    id: g.id, target_value: g.target_value, weightage: g.weightage
                })));
            })
            .catch(() => showToast('Failed to load sheet', 'error'))
            .finally(() => setLoading(false));
    }, [sheetId]);

    const updateEdited = (idx, field, value) => {
        setEditedGoals(prev => prev.map((eg, i) => i === idx ? { ...eg, [field]: Number(value) } : eg));
    };

    const handleApprove = async () => {
        // check weightage
        const total = Math.round(editedGoals.reduce((s, g) => s + g.weightage, 0) * 10) / 10;
        if (total !== 100) return showToast(`Weightage must equal 100%. Currently: ${total}%`, 'error');

        setSubmitting(true);
        try {
            await apiPost(`/api/goals/sheet/${sheetId}/approve`, { edited_goals: editedGoals });
            showToast('Goal sheet approved and locked', 'success');
            navigate('/manager');
        } catch (err) { showToast(err.message, 'error'); }
        setSubmitting(false);
    };

    const handleReturn = async () => {
        setSubmitting(true);
        try {
            await apiPost(`/api/goals/sheet/${sheetId}/return`, { comment: returnComment });
            showToast('Sheet returned for rework', 'success');
            navigate('/manager');
        } catch (err) { showToast(err.message, 'error'); }
        setSubmitting(false);
    };

    if (loading) return <div><div className="skeleton" style={{ width: 250, height: 32 }} /></div>;
    if (!sheet) return <div className="empty-state"><div className="empty-state-title">Sheet not found</div></div>;

    const isReviewable = sheet.status === 'submitted';
    const totalEdited = Math.round(editedGoals.reduce((s, g) => s + g.weightage, 0) * 10) / 10;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">Review: {sheet.employee_name}</h1>
                <p className="page-subtitle">{sheet.department} | {sheet.email} | Status: {sheet.status}</p>
            </div>

            {isReviewable && (
                <div className="card mb-24" style={{ padding: '12px 20px' }}>
                    <div className="flex-between">
                        <span style={{ fontSize: 13 }}>Edited Weightage Total</span>
                        <span style={{
                            fontWeight: 700, fontSize: 16,
                            color: totalEdited === 100 ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>{totalEdited}%</span>
                    </div>
                </div>
            )}

            {goals.map((goal, idx) => (
                <div key={goal.id} className="goal-card">
                    <div className="goal-card-header">
                        <div>
                            <div className="goal-card-title">{goal.title}</div>
                            {goal.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{goal.description}</p>}
                        </div>
                        {goal.is_shared ? <span className="badge badge-submitted">Shared</span> : null}
                    </div>

                    <div className="goal-card-meta mb-16">
                        <span>Area: {goal.thrust_area_name || 'None'}</span>
                        <span>Type: {goal.uom_type}</span>
                        <span>Direction: {goal.uom_direction === 'min' ? 'Higher is Better' : 'Lower is Better'}</span>
                    </div>

                    {isReviewable ? (
                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Target {goal.uom_type === 'timeline' ? '(Date)' : '(Value)'}</label>
                                {goal.uom_type === 'timeline' ? (
                                    <span style={{ fontSize: 14 }}>{goal.target_date}</span>
                                ) : (
                                    <input type="number" className="inline-edit" style={{ width: '100%' }}
                                        value={editedGoals[idx]?.target_value ?? ''}
                                        onChange={e => updateEdited(idx, 'target_value', e.target.value)} />
                                )}
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Weightage (%)</label>
                                <input type="number" className="inline-edit" style={{ width: '100%' }} min="10" max="100"
                                    value={editedGoals[idx]?.weightage ?? ''}
                                    onChange={e => updateEdited(idx, 'weightage', e.target.value)} />
                            </div>
                        </div>
                    ) : (
                        <div className="goal-card-meta">
                            <span>Target: {goal.target_value || goal.target_date}</span>
                            <span>Weightage: {goal.weightage}%</span>
                            <span className={`badge badge-${goal.status}`}>{goal.status?.replace('_', ' ')}</span>
                        </div>
                    )}
                </div>
            ))}

            {isReviewable && (
                <div className="flex-between mt-24">
                    <button className="btn btn-danger" onClick={() => setShowReturnModal(true)} disabled={submitting}>
                        Return for Rework
                    </button>
                    <button className="btn btn-success" onClick={handleApprove}
                        disabled={submitting || totalEdited !== 100}>
                        {submitting ? 'Processing...' : 'Approve and Lock'}
                    </button>
                </div>
            )}

            {/* return modal */}
            {showReturnModal && (
                <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Return for Rework</div>
                        <div className="form-group">
                            <label className="form-label">Comment for Employee</label>
                            <textarea className="form-textarea" rows={4} placeholder="Explain what needs to change..."
                                value={returnComment} onChange={e => setReturnComment(e.target.value)} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setShowReturnModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleReturn} disabled={submitting}>
                                {submitting ? 'Returning...' : 'Return Sheet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
