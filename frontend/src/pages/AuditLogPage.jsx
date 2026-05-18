import { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';
import { showToast } from '../components/Toast.jsx';

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        apiGet('/api/admin/audit-log', true)
            .then(data => setLogs(data))
            .catch(() => showToast('Failed to load audit log', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = filter
        ? logs.filter(l => l.action.includes(filter) || l.entity_type.includes(filter) || l.changed_by_name?.toLowerCase().includes(filter.toLowerCase()))
        : logs;

    if (loading) return <div><div className="skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} /></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">Audit Trail</h1>
                <p className="page-subtitle">All changes to goals after lock date</p>
            </div>

            <div className="card mb-24" style={{ padding: '12px 20px' }}>
                <input className="form-input" placeholder="Filter by action, entity, or user..."
                    value={filter} onChange={e => setFilter(e.target.value)}
                    style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 14 }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Entity</th>
                            <th>Field</th>
                            <th>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No audit entries found</td></tr>
                        ) : filtered.map(log => (
                            <tr key={log.id}>
                                <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td style={{ fontWeight: 500 }}>{log.changed_by_name}</td>
                                <td>
                                    <span className={`badge ${log.action === 'admin_unlock' ? 'badge-returned' : log.action === 'approved' ? 'badge-approved' : 'badge-submitted'}`}>
                                        {log.action.replace('_', ' ')}
                                    </span>
                                </td>
                                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    {log.entity_type} #{log.entity_id}
                                </td>
                                <td style={{ fontSize: 13 }}>{log.field_name || '-'}</td>
                                <td>
                                    {/* visual diff — GitHub-style */}
                                    {log.old_value || log.new_value ? (
                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {log.old_value && (
                                                <span className="audit-diff-old">{log.old_value}</span>
                                            )}
                                            <span className="audit-diff-arrow">to</span>
                                            {log.new_value && (
                                                <span className="audit-diff-new">{log.new_value}</span>
                                            )}
                                        </div>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
