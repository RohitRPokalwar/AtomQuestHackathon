import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiPost, apiPatch } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';
import WeightageRing from '../components/WeightageRing.jsx';

const emptyGoal = () => ({
    title: '', description: '', thrust_area_id: '', uom_type: 'numeric',
    uom_direction: 'min', target_value: '', target_date: '', weightage: 10
});

export default function GoalCreatePage() {
    const navigate = useNavigate();
    const [goals, setGoals] = useState([emptyGoal()]);
    const [thrustAreas, setThrustAreas] = useState([]);
    const [sheetId, setSheetId] = useState(null);
    const [sheetStatus, setSheetStatus] = useState('draft');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            apiGet('/api/goals/thrust-areas'),
            apiGet('/api/goals/my-sheet'),
        ]).then(([areas, sheetData]) => {
            setThrustAreas(areas);
            if (sheetData.sheet) {
                setSheetId(sheetData.sheet.id);
                setSheetStatus(sheetData.sheet.status);
                if (sheetData.goals?.length > 0) {
                    setGoals(sheetData.goals.map(g => ({
                        ...g, thrust_area_id: g.thrust_area_id || '',
                        target_value: g.target_value ?? '', target_date: g.target_date || ''
                    })));
                }
            }
        }).catch(() => showToast('Failed to load data', 'error'))
          .finally(() => setLoading(false));
    }, []);

    const totalWeightage = Math.round(goals.reduce((s, g) => s + Number(g.weightage || 0), 0) * 10) / 10;
    const isLocked = sheetStatus === 'locked' || sheetStatus === 'approved';

    const updateGoal = (idx, field, value) => {
        setGoals(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
    };

    const saveSharedWeightage = async (goal) => {
        if (!goal.id || !goal.is_shared) return;
        try {
            await apiPatch(`/api/shared/goals/${goal.id}/weightage`, { weightage: Number(goal.weightage) });
            showToast('Shared goal weightage saved', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const addGoal = () => {
        if (goals.length >= 8) return showToast('Maximum 8 goals allowed', 'error');
        setGoals(prev => [...prev, emptyGoal()]);
    };

    const removeGoal = (idx) => {
        if (goals.length <= 1) return;
        // don't allow removing shared goals
        if (goals[idx].is_shared) return showToast('Shared goals cannot be removed', 'error');
        setGoals(prev => prev.filter((_, i) => i !== idx));
    };

    const ensureSheet = async () => {
        if (sheetId) return sheetId;
        const res = await apiPost('/api/goals/sheet', {});
        setSheetId(res.sheet_id);
        return res.sheet_id;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const sid = await ensureSheet();
            await apiPut(`/api/goals/sheet/${sid}/goals`, { goals: goals.filter(g => !g.is_shared) });
            showToast('Goals saved as draft', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
        setSaving(false);
    };

    const handleSubmit = async () => {
        // client-side validation
        if (totalWeightage !== 100) return showToast(`Total weightage must be 100%. Currently: ${totalWeightage}%`, 'error');
        if (goals.length > 8) return showToast('Maximum 8 goals allowed', 'error');

        for (let i = 0; i < goals.length; i++) {
            const g = goals[i];
            if (!g.title.trim()) return showToast(`Goal ${i + 1}: Title is required`, 'error');
            if (Number(g.weightage) < 10) return showToast(`Goal ${i + 1}: Minimum weightage is 10%`, 'error');
            if (g.uom_type !== 'zero' && g.uom_type !== 'timeline' && !g.target_value) {
                return showToast(`Goal ${i + 1}: Target value required`, 'error');
            }
            if (g.uom_type === 'timeline' && !g.target_date) {
                return showToast(`Goal ${i + 1}: Target date required for timeline goals`, 'error');
            }
        }

        setSaving(true);
        try {
            const sid = await ensureSheet();
            await apiPost(`/api/goals/sheet/${sid}/submit`, { goals });
            showToast('Goal sheet submitted for approval', 'success');
            navigate('/employee');
        } catch (err) {
            showToast(err.message, 'error');
        }
        setSaving(false);
    };

    if (loading) {
        return <div><div className="page-header"><div className="skeleton" style={{ width: 250, height: 32 }} /></div></div>;
    }

    if (isLocked) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <h1 className="page-title">My Goals</h1>
                    <p className="page-subtitle">Your goal sheet is locked. Contact admin to unlock.</p>
                </div>
                {goals.map((goal, idx) => (
                    <div key={idx} className="goal-card">
                        <div className="goal-card-header">
                            <div className="goal-card-title">{goal.title}</div>
                            <span className={`badge badge-${goal.status}`}>{goal.status?.replace('_', ' ')}</span>
                        </div>
                        <div className="goal-card-meta">
                            <span>Type: {goal.uom_type}</span>
                            <span>Target: {goal.target_value || goal.target_date}</span>
                            <span>Weight: {goal.weightage}%</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">
                    {sheetStatus === 'returned' ? 'Revise Goals' : sheetId ? 'Edit Goals' : 'Create Goals'}
                </h1>
                <p className="page-subtitle">Define your goals for this cycle. Total weightage must equal 100%.</p>
            </div>

            {/* weightage progress bar */}
            <div className="card mb-24" style={{ padding: '16px 24px' }}>
                <div className="flex-between mb-8">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Total Weightage</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <WeightageRing value={totalWeightage} size={40} strokeWidth={4} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: totalWeightage === 100 ? 'var(--accent-green)' : totalWeightage > 100 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                            {totalWeightage}%
                        </span>
                    </div>
                </div>
                <div className="progress-bar-wrapper" style={{ height: 6 }}>
                    <div
                        className={`progress-bar-fill ${totalWeightage === 100 ? 'green' : totalWeightage > 100 ? 'red' : 'amber'}`}
                        style={{ width: `${Math.min(totalWeightage, 100)}%` }}
                    />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    {goals.length} of 8 goals used | {totalWeightage === 100 ? 'Ready to submit' : `${100 - totalWeightage}% remaining`}
                </div>
            </div>

            {/* goal forms */}
            {goals.map((goal, idx) => (
                <div key={idx} className="card mb-16" style={{ position: 'relative' }}>
                    <div className="flex-between mb-16">
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Goal {idx + 1}
                            {goal.shared_role === 'primary' && (
                                <span className="badge badge-on_track" style={{ marginLeft: 8 }}>Primary Owner</span>
                            )}
                            {goal.shared_role === 'recipient' && (
                                <span className="badge badge-submitted" style={{ marginLeft: 8 }}>Shared KPI</span>
                            )}
                            {goal.is_shared && !goal.shared_role && (
                                <span className="badge badge-submitted" style={{ marginLeft: 8 }}>Shared</span>
                            )}
                        </span>
                        {!goal.is_shared && goals.length > 1 && (
                            <button className="btn btn-ghost btn-sm" onClick={() => removeGoal(idx)}>Remove</button>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Goal Title</label>
                            <input
                                className="form-input"
                                placeholder="e.g. Increase API throughput by 40%"
                                value={goal.title}
                                onChange={e => updateGoal(idx, 'title', e.target.value)}
                                readOnly={goal.is_shared}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Thrust Area</label>
                            <select className="form-select" value={goal.thrust_area_id}
                                onChange={e => updateGoal(idx, 'thrust_area_id', e.target.value)}
                                disabled={goal.is_shared}>
                                <option value="">Select area</option>
                                {thrustAreas.map(ta => (
                                    <option key={ta.id} value={ta.id}>{ta.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {goal.shared_note && (
                        <p className="shared-note-banner">{goal.shared_note}</p>
                    )}

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" placeholder="Describe what success looks like"
                            value={goal.description} onChange={e => updateGoal(idx, 'description', e.target.value)}
                            readOnly={goal.is_shared} rows={2} />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Unit of Measurement</label>
                            <select className="form-select" value={goal.uom_type}
                                onChange={e => updateGoal(idx, 'uom_type', e.target.value)}
                                disabled={goal.is_shared}>
                                <option value="numeric">Numeric</option>
                                <option value="percentage">Percentage</option>
                                <option value="timeline">Timeline (Date)</option>
                                <option value="zero">Zero-based</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Direction</label>
                            <select className="form-select" value={goal.uom_direction}
                                onChange={e => updateGoal(idx, 'uom_direction', e.target.value)}
                                disabled={goal.is_shared || goal.uom_type === 'zero' || goal.uom_type === 'timeline'}>
                                <option value="min">Higher is Better (Min)</option>
                                <option value="max">Lower is Better (Max)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                {goal.uom_type === 'timeline' ? 'Target Date' : goal.uom_type === 'zero' ? 'Target (always 0)' : 'Target Value'}
                            </label>
                            {goal.uom_type === 'timeline' ? (
                                <input type="date" className="form-input" value={goal.target_date}
                                    onChange={e => updateGoal(idx, 'target_date', e.target.value)}
                                    readOnly={goal.is_shared} />
                            ) : goal.uom_type === 'zero' ? (
                                <input className="form-input" value="0" readOnly />
                            ) : (
                                <input type="number" className="form-input" placeholder="e.g. 40"
                                    value={goal.target_value}
                                    onChange={e => updateGoal(idx, 'target_value', e.target.value)}
                                    readOnly={goal.is_shared} />
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Weightage (%)</label>
                            <input type="number" className="form-input" min="10" max="100" step="5"
                                value={goal.weightage}
                                onChange={e => updateGoal(idx, 'weightage', Number(e.target.value))}
                                onBlur={() => goal.is_shared && goal.id && saveSharedWeightage(goal)} />
                            {Number(goal.weightage) < 10 && (
                                <div className="form-error">Minimum weightage is 10%</div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {/* action buttons */}
            <div className="flex-between mt-24">
                <button className="btn btn-outline" onClick={addGoal} disabled={goals.length >= 8}>
                    Add Goal ({goals.length}/8)
                </button>
                <div className="flex flex-gap-12">
                    <button className="btn btn-outline" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit}
                        disabled={saving || totalWeightage !== 100}>
                        Submit for Approval
                    </button>
                </div>
            </div>
        </div>
    );
}
