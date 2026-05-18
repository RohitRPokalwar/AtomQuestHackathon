import { useState, useEffect } from 'react';
import { apiGet, downloadCsv } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';

export default function ReportsPage() {
    const [reportData, setReportData] = useState([]);
    const [completion, setCompletion] = useState([]);
    const [quarter, setQuarter] = useState('Q1');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiGet(`/api/reports/achievement?quarter=${quarter}`, true),
            apiGet('/api/reports/completion', true)
        ]).then(([ach, comp]) => {
            setReportData(ach);
            setCompletion(comp);
        }).catch(() => showToast('Failed to load reports', 'error'))
          .finally(() => setLoading(false));
    }, [quarter]);

    const handleExport = () => {
        downloadCsv(`/api/reports/export-csv?quarter=${quarter}`, `achievement_report_${quarter}.csv`);
        showToast('CSV download started', 'success');
    };

    if (loading) return <div><div className="skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} /></div>;

    return (
        <div className="animate-in">
            <div className="flex-between mb-24">
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">Achievement reports and completion tracking</p>
                </div>
                <div className="flex flex-gap-12">
                    <select className="form-select" style={{ width: 120 }} value={quarter}
                        onChange={e => setQuarter(e.target.value)}>
                        <option value="Q1">Q1</option>
                        <option value="Q2">Q2</option>
                        <option value="Q3">Q3</option>
                        <option value="Q4">Q4</option>
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={handleExport}>Export CSV</button>
                </div>
            </div>

            {/* completion dashboard */}
            {completion.length > 0 && (
                <div className="mb-32">
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Manager Completion Rates</h2>
                    <div className="stats-grid">
                        {completion.map(c => (
                            <div key={c.manager_id} className="stat-card">
                                <div className="stat-label">{c.manager_name}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{c.department}</div>
                                <div className="goal-card-meta">
                                    <span>Team: {c.total_employees}</span>
                                    <span style={{ color: 'var(--accent-green)' }}>Approved: {c.goals_approved}</span>
                                    <span style={{ color: 'var(--accent-blue)' }}>Check-ins: {c.checkins_done}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* achievement table */}
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Achievement Report — {quarter}</h2>
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Dept</th>
                            <th>Goal</th>
                            <th>Thrust Area</th>
                            <th>UoM</th>
                            <th>Target</th>
                            <th>Weight</th>
                            <th>Achievement</th>
                            <th>Score</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.length === 0 ? (
                            <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No data available</td></tr>
                        ) : reportData.map((r, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 500 }}>{r.employee_name}</td>
                                <td>{r.department}</td>
                                <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.goal_title}</td>
                                <td>{r.thrust_area || '-'}</td>
                                <td>{r.uom_type}</td>
                                <td>{r.target_value || r.target_date || '-'}</td>
                                <td>{r.weightage}%</td>
                                <td style={{ fontWeight: 600 }}>{r.achievement ?? '-'}</td>
                                <td>
                                    {r.score !== null ? (
                                        <span style={{ color: r.score >= 80 ? 'var(--accent-green)' : r.score >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)', fontWeight: 600 }}>
                                            {r.score}%
                                        </span>
                                    ) : '-'}
                                </td>
                                <td><span className={`badge badge-${r.status}`}>{r.status?.replace('_', ' ')}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
