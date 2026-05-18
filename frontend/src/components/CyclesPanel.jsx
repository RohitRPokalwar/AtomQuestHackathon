import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../api/client.js';
import { showToast } from './Toast.jsx';

const PHASES = [
    {
        phase: 'goal_setting',
        title: 'Goal Setting',
        subtitle: 'Phase 1',
        month: 'May – June',
        employee: 'Create & submit goal sheets',
        manager: 'Review, approve & lock goals',
        hr: 'Monitor submission & approval rates',
    },
    {
        phase: 'Q1',
        title: 'Q1 Check-in',
        subtitle: 'Quarter 1',
        month: 'July',
        employee: 'Update achievement vs. target',
        manager: 'Conduct check-in & add comments',
        hr: 'Track check-in completion',
    },
    {
        phase: 'Q2',
        title: 'Q2 Check-in',
        subtitle: 'Quarter 2',
        month: 'October',
        employee: 'Update achievement vs. target',
        manager: 'Conduct check-in & add comments',
        hr: 'Track check-in completion',
    },
    {
        phase: 'Q3',
        title: 'Q3 Check-in',
        subtitle: 'Quarter 3',
        month: 'January',
        employee: 'Update achievement vs. target',
        manager: 'Conduct check-in & add comments',
        hr: 'Track check-in completion',
    },
    {
        phase: 'Q4',
        title: 'Annual Review',
        subtitle: 'Quarter 4',
        month: 'March – April',
        employee: 'Final achievement capture',
        manager: 'Year-end check-in & sign-off',
        hr: 'Close cycle & export reports',
    },
];

const HR_STATUS = {
    open: { label: 'In Progress', badge: 'badge-on_track', desc: 'Employees & managers can act now' },
    upcoming: { label: 'Scheduled', badge: 'badge-submitted', desc: 'Opens automatically on calendar date' },
    ended: { label: 'Completed', badge: 'badge-approved', desc: 'This window has closed' },
};

function formatToday(date) {
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function timeMessage(cycle) {
    if (!cycle) return '';
    if (cycle.window_status === 'open' && cycle.days_remaining != null) {
        return `${cycle.days_remaining} day${cycle.days_remaining === 1 ? '' : 's'} remaining in this period`;
    }
    if (cycle.window_status === 'upcoming' && cycle.days_until_open != null) {
        return `Starts in ${cycle.days_until_open} day${cycle.days_until_open === 1 ? '' : 's'}`;
    }
    if (cycle.window_status === 'ended') return 'This period has ended';
    return '';
}

export default function CyclesPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);
    const [now, setNow] = useState(() => new Date());
    const [showAdminControls, setShowAdminControls] = useState(false);

    const cycles = data?.cycles || [];

    const fetchCycles = useCallback(async (silent = false) => {
        try {
            const res = await apiGet('/api/admin/cycles', true);
            setData(res);
            if (!silent) setLoading(false);
        } catch {
            if (!silent) showToast('Failed to load cycle calendar', 'error');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCycles();
        const poll = setInterval(() => fetchCycles(true), 10000);
        return () => clearInterval(poll);
    }, [fetchCycles]);

    useEffect(() => {
        const tick = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(tick);
    }, []);

    const handleToggle = async (cycleId) => {
        setTogglingId(cycleId);
        try {
            const res = await apiPost(`/api/admin/cycles/${cycleId}/toggle`, {});
            setData(res);
            showToast(res.message || 'Portal phase updated', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
        setTogglingId(null);
    };

    if (loading) {
        return (
            <div>
                <div className="skeleton" style={{ height: 140, marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 400 }} />
            </div>
        );
    }

    const currentPhase = cycles.find(c => c.is_live_window) || cycles.find(c => c.is_active);
    const currentMeta = PHASES.find(p => p.phase === currentPhase?.phase);
    const nextPhaseKey = PHASES.find(p => {
        const c = cycles.find(x => x.phase === p.phase);
        return c?.window_status === 'upcoming';
    })?.phase;

    return (
        <div className="cycles-panel animate-in">
            {/* HR hero — what matters for video */}
            <div className="cycle-hero card">
                <div className="cycle-hero-top">
                    <span className="cycle-hero-eyebrow">FY 2026–27 Performance Year</span>
                    <span className="cycle-hero-today">{formatToday(now)}</span>
                </div>
                <h2 className="cycle-hero-title">
                    {currentMeta ? (
                        <>Organization is in <span>{currentMeta.title}</span></>
                    ) : (
                        <>Performance cycle calendar</>
                    )}
                </h2>
                {currentPhase && (
                    <p className="cycle-hero-sub">
                        {timeMessage(currentPhase)} · {currentPhase.window_open} to {currentPhase.window_close}
                    </p>
                )}
                <div className="cycle-hero-actions">
                    <div className="cycle-hero-pill">
                        <span className="cycle-hero-pill-label">Employees</span>
                        <span>{currentMeta?.employee || '—'}</span>
                    </div>
                    <div className="cycle-hero-pill">
                        <span className="cycle-hero-pill-label">Managers</span>
                        <span>{currentMeta?.manager || '—'}</span>
                    </div>
                    <div className="cycle-hero-pill">
                        <span className="cycle-hero-pill-label">HR / Admin</span>
                        <span>{currentMeta?.hr || '—'}</span>
                    </div>
                </div>
            </div>

            {/* Visual timeline — one card per phase */}
            <h2 className="section-title">Annual performance calendar</h2>
            <div className="cycle-timeline">
                {PHASES.map((phase, idx) => {
                    const cycle = cycles.find(c => c.phase === phase.phase);
                    const st = cycle ? HR_STATUS[cycle.window_status] : null;
                    const isCurrent = cycle?.is_live_window;
                    const isNext = phase.phase === nextPhaseKey && !isCurrent;

                    return (
                        <div
                            key={phase.phase}
                            className={`cycle-card ${isCurrent ? 'cycle-card-current' : ''} ${isNext ? 'cycle-card-next' : ''}`}
                        >
                            {isCurrent && <span className="cycle-card-ribbon">Now</span>}
                            {isNext && !isCurrent && <span className="cycle-card-ribbon cycle-card-ribbon-next">Up Next</span>}

                            <div className="cycle-card-header">
                                <div>
                                    <span className="cycle-card-phase">{phase.subtitle}</span>
                                    <h3 className="cycle-card-title">{phase.title}</h3>
                                    <span className="cycle-card-month">{phase.month}</span>
                                </div>
                                {st && (
                                    <span className={`badge ${st.badge}`}>{st.label}</span>
                                )}
                            </div>

                            {cycle?.window_status === 'open' && (
                                <div className="cycle-card-progress">
                                    <div className="progress-bar-wrapper" style={{ height: 8 }}>
                                        <div className="progress-bar-fill green" style={{ width: `${cycle.window_progress}%` }} />
                                    </div>
                                    <span className="cycle-card-progress-text">{timeMessage(cycle)}</span>
                                </div>
                            )}

                            <ul className="cycle-card-checklist">
                                <li><strong>Employees:</strong> {phase.employee}</li>
                                <li><strong>Managers:</strong> {phase.manager}</li>
                                <li><strong>HR:</strong> {phase.hr}</li>
                            </ul>

                            {st && (
                                <p className="cycle-card-status-note">{st.desc}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Collapsed admin — not for HR video */}
            <div className="cycle-admin-section">
                <button
                    type="button"
                    className="cycle-admin-toggle btn btn-ghost"
                    onClick={() => setShowAdminControls(v => !v)}
                >
                    {showAdminControls ? 'Hide' : 'Show'} portal phase controls (Admin only)
                </button>

                {showAdminControls && (
                    <div className="card cycle-admin-table-wrap">
                        <p className="cycle-admin-note">
                            <strong>Set active</strong> opens the portal for that phase immediately (even before the calendar date).
                            Use this to run Q1 check-in demos in May. Employees will see a green &quot;opened by HR&quot; banner on Check-in.
                        </p>
                        <table className="data-table">
                            <thead>
                                <tr><th>Phase</th><th>Dates</th><th>Calendar</th><th>Portal active</th></tr>
                            </thead>
                            <tbody>
                                {PHASES.map(phase => {
                                    const cycle = cycles.find(c => c.phase === phase.phase);
                                    const st = cycle ? HR_STATUS[cycle.window_status] : null;
                                    return (
                                        <tr key={phase.phase}>
                                            <td style={{ fontWeight: 600 }}>{phase.title}</td>
                                            <td>{phase.month}</td>
                                            <td>
                                                {cycle && st ? (
                                                    <span className={`badge ${st.badge}`}>{st.label}</span>
                                                ) : '—'}
                                            </td>
                                            <td>
                                                {cycle ? (
                                                    <button
                                                        className={`btn btn-sm ${cycle.is_active ? 'btn-success' : 'btn-outline'}`}
                                                        disabled={togglingId === cycle.id}
                                                        onClick={() => handleToggle(cycle.id)}
                                                    >
                                                        {togglingId === cycle.id ? '…' : cycle.is_active ? 'Active' : 'Set active'}
                                                    </button>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
