import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiGet } from '../api/client.js';
import WeightageRing from '../components/WeightageRing.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { IconGoals, IconTarget, IconTrend, IconSpark } from '../components/Icons.jsx';

function getDaysInfo(cycles) {
    const now = new Date();
    const upcoming = cycles
        ?.filter(c => new Date(c.window_close) > now)
        .sort((a, b) => new Date(a.window_open) - new Date(b.window_open))[0];

    if (!upcoming) return { text: 'No upcoming check-in windows', days: null, isOpen: false };

    const openDate = new Date(upcoming.window_open);
    const closeDate = new Date(upcoming.window_close);

    if (now >= openDate && now <= closeDate) {
        const daysLeft = Math.ceil((closeDate - now) / (1000 * 60 * 60 * 24));
        return {
            text: `${upcoming.name} closes in`,
            days: daysLeft,
            suffix: daysLeft === 1 ? 'day' : 'days',
            isOpen: true
        };
    } else if (now < openDate) {
        const daysUntil = Math.ceil((openDate - now) / (1000 * 60 * 60 * 24));
        return {
            text: 'Next window opens in',
            days: daysUntil,
            suffix: daysUntil === 1 ? 'day' : 'days',
            subtext: `${upcoming.name} — ${openDate.toLocaleDateString()}`,
            isOpen: false
        };
    }
    return { text: 'No upcoming windows', days: null, isOpen: false };
}

export default function EmployeeDashboard() {
    const { user } = useAuth();
    const [sheetData, setSheetData] = useState(null);
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiGet('/api/goals/my-sheet'),
            apiGet('/api/checkins/cycles')
        ]).then(([sheet, cyc]) => {
            setSheetData(sheet);
            setCycles(cyc);
        }).catch(() => {})
          .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div>
                <div className="page-header"><div className="skeleton" style={{ width: 200, height: 32 }} /></div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 110 }} />)}
                </div>
            </div>
        );
    }

    const sheet = sheetData?.sheet;
    const goals = sheetData?.goals || [];
    const totalWeightage = goals.reduce((s, g) => s + (g.weightage || 0), 0);
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const onTrackGoals = goals.filter(g => g.status === 'on_track').length;
    const atRiskGoals = goals.filter(g => g.risk_flag === 'at_risk' || g.risk_flag === 'off_track').length;
    const countdown = getDaysInfo(cycles);

    return (
        <div className="animate-in">
            <PageHeader
                title={`Welcome, ${user.name.split(' ')[0]}`}
                subtitle={`${user.department} Department — Your performance command center`}
                badge="Employee View"
            />

            <div className={`countdown-banner ${countdown.isOpen ? '' : 'closed'}`}>
                <div>
                    <div className="countdown-text">{countdown.text}</div>
                    {countdown.subtext && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{countdown.subtext}</div>}
                </div>
                {countdown.days !== null && (
                    <div style={{ textAlign: 'right' }}>
                        <div className="countdown-days">{countdown.days}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{countdown.suffix}</div>
                    </div>
                )}
            </div>

            <div className="stats-grid">
                <StatCard label="Goal Sheet Status" accent="purple" icon={IconSpark}>
                    <span className={`badge badge-${sheet?.status || 'draft'}`} style={{ marginTop: 8, fontSize: 13 }}>
                        {sheet?.status?.replace('_', ' ') || 'Not Started'}
                    </span>
                </StatCard>
                <StatCard label="Total Goals" value={goals.length} sub={`of 8 max goals`} accent="blue" icon={IconGoals} />
                <StatCard label="Weightage" accent="cyan" icon={IconTarget}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                        <WeightageRing value={totalWeightage} size={52} />
                        <span className="stat-value" style={{ fontSize: 22 }}>{Math.round(totalWeightage * 10) / 10}%</span>
                    </div>
                </StatCard>
                <StatCard
                    label="On Track"
                    value={completedGoals + onTrackGoals}
                    change={atRiskGoals > 0 ? `${atRiskGoals} at risk` : 'All goals healthy'}
                    changeType={atRiskGoals > 0 ? 'negative' : 'positive'}
                    accent="green"
                    icon={IconTrend}
                />
            </div>

            <div className="flex-between mb-16">
                <h2 className="section-title">My Goals</h2>
                {(!sheet || sheet.status === 'draft' || sheet.status === 'returned') && (
                    <Link to="/goals/create" className="btn btn-primary btn-sm">
                        {sheet ? 'Edit Goals' : 'Create Goals'}
                    </Link>
                )}
            </div>

            {sheet?.status === 'returned' && sheet.return_comment && (
                <div className="countdown-banner closed mb-16">
                    <div>
                        <div className="countdown-text" style={{ color: 'var(--accent-amber)' }}>Returned for Rework</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{sheet.return_comment}</div>
                    </div>
                </div>
            )}

            {goals.length === 0 ? (
                <div className="empty-state card">
                    <div className="empty-state-title">No Goals Created Yet</div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Start by creating your goals for this cycle</p>
                    <Link to="/goals/create" className="btn btn-primary">Create Goal Sheet</Link>
                </div>
            ) : (
                goals.map((goal, idx) => (
                    <div key={goal.id} className="goal-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                        <div className="goal-card-header">
                            <div>
                                <div className="goal-card-title">{goal.title}</div>
                                {goal.description && (
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{goal.description}</p>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {goal.risk_flag && goal.risk_flag !== 'on_track' && goal.risk_flag !== 'not_started' && (
                                    <span className={`badge badge-${goal.risk_flag}`}>
                                        {goal.risk_flag === 'at_risk' ? 'At Risk' : 'Off Track'}
                                    </span>
                                )}
                                <span className={`badge badge-${goal.status}`}>
                                    {goal.status?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        <div className="goal-card-meta">
                            <span className="goal-card-meta-item">Type: {goal.uom_type}</span>
                            {goal.target_value !== null && <span className="goal-card-meta-item">Target: {goal.target_value}</span>}
                            {goal.target_date && <span className="goal-card-meta-item">Deadline: {new Date(goal.target_date).toLocaleDateString()}</span>}
                            <span className="goal-card-meta-item">Weight: {goal.weightage}%</span>
                            {goal.thrust_area_name && <span className="goal-card-meta-item">Area: {goal.thrust_area_name}</span>}
                        </div>
                        {(goal.achievement_q1 !== null || goal.achievement_q2 !== null) && (
                            <div style={{ marginTop: 12 }}>
                                <div className="progress-bar-wrapper">
                                    <div
                                        className={`progress-bar-fill ${goal.risk_flag === 'at_risk' ? 'amber' : goal.risk_flag === 'off_track' ? 'red' : 'green'}`}
                                        style={{ width: `${Math.min(((goal.achievement_q1 || 0) / (goal.target_value || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
