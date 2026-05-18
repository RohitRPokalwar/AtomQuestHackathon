import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';

const emptyKpi = () => ({
    title: '',
    description: '',
    thrust_area_id: '',
    uom_type: 'numeric',
    uom_direction: 'min',
    target_value: '',
    target_date: '',
    weightage: 10,
});

/** BRD 2.1 — push one KPI to multiple employees; primary owner syncs check-ins */
export default function SharedGoalPushForm({ onSuccess, showWorkflowHint = true }) {
    const [form, setForm] = useState(emptyKpi());
    const [thrustAreas, setThrustAreas] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selected, setSelected] = useState([]);
    const [primaryId, setPrimaryId] = useState('');
    const [loading, setLoading] = useState(true);
    const [pushing, setPushing] = useState(false);

    useEffect(() => {
        Promise.all([
            apiGet('/api/goals/thrust-areas', true),
            apiGet('/api/shared/recipients', true),
        ]).then(([areas, emps]) => {
            setThrustAreas(areas);
            setEmployees(emps);
        }).catch(() => showToast('Failed to load shared goal data', 'error'))
          .finally(() => setLoading(false));
    }, []);

    const toggleEmployee = (id) => {
        setSelected(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            if (!next.includes(Number(primaryId))) {
                setPrimaryId(next.length ? String(next[0]) : '');
            }
            return next;
        });
    };

    const selectAll = () => {
        const ids = employees.map(e => e.id);
        setSelected(ids);
        if (!primaryId && ids.length) setPrimaryId(String(ids[0]));
    };

    const handlePush = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return showToast('KPI title is required', 'error');
        if (selected.length === 0) return showToast('Select at least one employee', 'error');
        if (!primaryId) return showToast('Choose a primary owner', 'error');

        setPushing(true);
        try {
            await apiPost('/api/shared/push', {
                ...form,
                thrust_area_id: form.thrust_area_id || null,
                target_value: form.uom_type === 'zero' ? 0 : form.target_value ? Number(form.target_value) : null,
                target_date: form.uom_type === 'timeline' ? form.target_date : null,
                weightage: Number(form.weightage),
                employee_ids: selected,
                primary_owner_id: Number(primaryId),
            });
            showToast(`KPI pushed to ${selected.length} employee(s)`, 'success');
            setForm(emptyKpi());
            setSelected([]);
            setPrimaryId('');
            onSuccess?.();
        } catch (err) {
            showToast(err.message, 'error');
        }
        setPushing(false);
    };

    if (loading) {
        return <div className="skeleton" style={{ height: 200 }} />;
    }

    return (
        <form onSubmit={handlePush}>
            {showWorkflowHint && (
                <div className="shared-workflow-card" style={{ marginBottom: 20, padding: 14 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                        One KPI → many sheets. <strong>Primary owner</strong> updates achievement at check-in;
                        recipients see synced results and may edit <strong>weightage only</strong>.
                    </p>
                </div>
            )}

            <div className="form-group">
                <label className="form-label">KPI Title</label>
                <input className="form-input" required placeholder="e.g. Achieve 95% customer satisfaction"
                    value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={2} placeholder="What success looks like"
                    value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Thrust Area</label>
                    <select className="form-select" value={form.thrust_area_id}
                        onChange={e => setForm(p => ({ ...p, thrust_area_id: e.target.value }))}>
                        <option value="">Select</option>
                        {thrustAreas.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Default weightage %</label>
                    <input type="number" className="form-input" min={10} max={100}
                        value={form.weightage} onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))} />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">UoM</label>
                    <select className="form-select" value={form.uom_type}
                        onChange={e => setForm(p => ({ ...p, uom_type: e.target.value }))}>
                        <option value="numeric">Numeric</option>
                        <option value="percentage">Percentage</option>
                        <option value="timeline">Timeline</option>
                        <option value="zero">Zero-based</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Target</label>
                    {form.uom_type === 'timeline' ? (
                        <input type="date" className="form-input" value={form.target_date}
                            onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))} />
                    ) : form.uom_type === 'zero' ? (
                        <input className="form-input" value="0" readOnly />
                    ) : (
                        <input type="number" className="form-input" value={form.target_value}
                            onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))} />
                    )}
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Primary owner (syncs achievement)</label>
                <select className="form-select" value={primaryId} required
                    onChange={e => setPrimaryId(e.target.value)}>
                    <option value="">Select from chosen employees</option>
                    {employees.filter(e => selected.includes(e.id)).map(e => (
                        <option key={e.id} value={e.id}>{e.name} — {e.department}</option>
                    ))}
                </select>
            </div>

            <div className="flex-between mb-8">
                <label className="form-label" style={{ marginBottom: 0 }}>Recipients ({selected.length})</label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={selectAll}>Select all</button>
            </div>
            <div className="shared-employee-list">
                {employees.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No employees in your team</p>
                ) : employees.map(emp => (
                    <label key={emp.id} className={`shared-employee-chip ${selected.includes(emp.id) ? 'selected' : ''}`}>
                        <input type="checkbox" checked={selected.includes(emp.id)}
                            onChange={() => toggleEmployee(emp.id)} />
                        <span>{emp.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.department}</span>
                    </label>
                ))}
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 20 }}
                disabled={pushing}>
                {pushing ? 'Pushing...' : 'Push KPI to selected employees'}
            </button>
        </form>
    );
}
