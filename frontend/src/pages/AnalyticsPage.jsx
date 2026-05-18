import { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';

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

    const { trends = [], deptBreakdown = [], thrustDist = [] } = analytics || {};

    // build simple bar chart using CSS
    const maxCount = Math.max(...thrustDist.map(t => t.count), 1);

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Quarter-on-quarter trends and organizational insights</p>
            </div>

            {/* QoQ trend cards */}
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quarter-on-Quarter Trends</h2>
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

            {/* thrust area distribution */}
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Goal Distribution by Thrust Area</h2>
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

            {/* department breakdown */}
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Status by Department</h2>
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
