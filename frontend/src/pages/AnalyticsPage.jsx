import { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';

const HEAT_COLORS = [
    'rgba(99,102,241,0.08)',   // 0%    — empty
    'rgba(99,102,241,0.2)',    // 1-25% — light
    'rgba(99,102,241,0.4)',    // 26-50%
    'rgba(99,102,241,0.6)',    // 51-75%
    'rgba(99,102,241,0.85)',   // 76-100%
];

function getHeatColor(rate) {
    if (rate === null || rate === undefined || rate === 0) return HEAT_COLORS[0];
    if (rate <= 25) return HEAT_COLORS[1];
    if (rate <= 50) return HEAT_COLORS[2];
    if (rate <= 75) return HEAT_COLORS[3];
    return HEAT_COLORS[4];
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiGet('/api/reports/analytics', true)
            .then(data => setAnalytics(data))
            .catch(() => showToast('Failed to load analytics', 'error'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div><div className="skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} /></div>;

    const {
        trends = [], deptBreakdown = [], thrustDist = [],
        heatmap = [], managerEffectiveness = []
    } = analytics || {};

    const maxCount = Math.max(...thrustDist.map(t => t.count), 1);
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Quarter-on-quarter trends, heatmaps, and organizational insights</p>
            </div>

            {/* QoQ trend cards */}
            <h2 className="section-title">Quarter-on-Quarter Trends</h2>
            <div className="stats-grid mb-32">
                {trends.map(t => (
                    <div key={t.quarter} className="stat-card">
                        <div className="stat-label">{t.quarter} Progress</div>
                        <div className="stat-value" style={{
                            color: t.avg_achievement !== null ? 'var(--accent-blue)' : 'var(--text-muted)',
                            fontSize: 28
                        }}>
                            {t.avg_achievement !== null ? `${Math.round(t.avg_achievement)}` : 'N/A'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            {t.reported} of {t.total} goals reported
                        </div>
                        <div className="progress-bar-wrapper" style={{ marginTop: 8, height: 4 }}>
                            <div className="progress-bar-fill" style={{ width: `${t.total ? (t.reported / t.total) * 100 : 0}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Department × Quarter Heatmap */}
            {heatmap.length > 0 && (
                <>
                    <h2 className="section-title">Department Completion Heatmap</h2>
                    <div className="card mb-32" style={{ padding: 0, overflow: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    {quarters.map(q => <th key={q} style={{ textAlign: 'center' }}>{q}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmap.map(row => (
                                    <tr key={row.department}>
                                        <td style={{ fontWeight: 600 }}>{row.department}</td>
                                        {quarters.map(q => {
                                            const cell = row[q] || {};
                                            return (
                                                <td key={q} style={{
                                                    textAlign: 'center',
                                                    background: getHeatColor(cell.rate),
                                                    color: cell.rate > 50 ? '#fff' : 'var(--text-primary)',
                                                    fontWeight: 600,
                                                    fontSize: 13,
                                                    transition: 'background 0.3s ease'
                                                }}>
                                                    {cell.rate > 0 ? `${cell.rate}%` : '—'}
                                                    {cell.avg !== null && cell.avg !== undefined && (
                                                        <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>
                                                            avg: {cell.avg}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                            <span>Completion Rate:</span>
                            {[0, 25, 50, 75, 100].map((v, i) => (
                                <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 14, height: 14, borderRadius: 3, background: HEAT_COLORS[i] }} />
                                    <span>{v}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Manager Effectiveness Dashboard */}
            {managerEffectiveness.length > 0 && (
                <>
                    <h2 className="section-title">Manager Effectiveness Dashboard</h2>
                    <div className="card mb-32" style={{ padding: 0, overflow: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Manager</th>
                                    <th>Dept</th>
                                    <th>Team</th>
                                    <th>Approved</th>
                                    <th>Pending</th>
                                    <th>Checkins</th>
                                    <th>Reviews</th>
                                    <th>Approval Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managerEffectiveness.map(m => {
                                    const rate = m.team_size > 0 ? Math.round((m.goals_approved / m.team_size) * 100) : 0;
                                    return (
                                        <tr key={m.id}>
                                            <td style={{ fontWeight: 600 }}>{m.manager_name}</td>
                                            <td>{m.department}</td>
                                            <td>{m.team_size}</td>
                                            <td style={{ color: 'var(--accent-green)' }}>{m.goals_approved}</td>
                                            <td style={{ color: m.goals_pending > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                                                {m.goals_pending}
                                            </td>
                                            <td>{m.checkins_done}</td>
                                            <td>{m.manager_reviews_done}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="progress-bar-wrapper" style={{ width: 80, height: 6 }}>
                                                        <div className={`progress-bar-fill ${rate >= 80 ? 'green' : rate >= 50 ? 'amber' : 'red'}`}
                                                            style={{ width: `${rate}%` }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Thrust area distribution */}
            <h2 className="section-title">Goal Distribution by Thrust Area</h2>
            <div className="card mb-32">
                {thrustDist.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No data available</p>
                ) : thrustDist.map(t => (
                    <div key={t.name} style={{ marginBottom: 16 }}>
                        <div className="flex-between" style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {t.count} goals | Avg weight: {Math.round(t.avg_weightage)}%
                            </span>
                        </div>
                        <div className="progress-bar-wrapper" style={{ height: 20, borderRadius: 4 }}>
                            <div className="progress-bar-fill"
                                style={{
                                    width: `${(t.count / maxCount) * 100}%`,
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: 8,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: 'white',
                                    minWidth: 30
                                }}>
                                {t.count}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Department breakdown table */}
            <h2 className="section-title">Status by Department</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr><th>Department</th><th>UoM Type</th><th>Status</th><th>Count</th></tr>
                    </thead>
                    <tbody>
                        {deptBreakdown.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No data</td></tr>
                        ) : deptBreakdown.map((row, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 500 }}>{row.department}</td>
                                <td>{row.uom_type}</td>
                                <td><span className={`badge badge-${row.status}`}>{row.status?.replace('_', ' ')}</span></td>
                                <td>{row.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
