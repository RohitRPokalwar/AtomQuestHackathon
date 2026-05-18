export default function StatCard({ label, value, sub, change, changeType, accent = 'blue', icon: Icon, children }) {
    return (
        <div className={`stat-card stat-card-${accent}`}>
            <div className="stat-card-glow" aria-hidden="true" />
            <div className="stat-card-inner">
                <div className="stat-card-top">
                    <span className="stat-label">{label}</span>
                    {Icon && (
                        <span className="stat-icon-wrap">
                            <Icon />
                        </span>
                    )}
                </div>
                {children || (
                    <>
                        <div className="stat-value">{value}</div>
                        {sub && <div className="stat-sub">{sub}</div>}
                        {change && (
                            <div className={`stat-change ${changeType || 'positive'}`}>{change}</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
