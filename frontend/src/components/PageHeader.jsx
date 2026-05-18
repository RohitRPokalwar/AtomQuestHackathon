export default function PageHeader({ title, subtitle, badge, actions, children }) {
    return (
        <header className="page-header page-header-premium">
            <div className="page-header-content">
                {badge && <span className="page-badge">{badge}</span>}
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
                {children}
            </div>
            {actions && <div className="page-header-actions">{actions}</div>}
        </header>
    );
}
