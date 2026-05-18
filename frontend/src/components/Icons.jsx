const iconProps = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconDashboard(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
    );
}

export function IconGoals(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

export function IconCheckin(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <path d="M9 16l2 2 4-4" />
        </svg>
    );
}

export function IconTeam(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
    );
}

export function IconReports(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
    );
}

export function IconAnalytics(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <path d="M3 3v18h18" />
            <path d="M7 16l4-6 4 3 5-8" />
        </svg>
    );
}

export function IconAudit(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    );
}

export function IconLogout(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
    );
}

export function IconTarget(props) {
    return <IconGoals {...props} />;
}

export function IconTrend(props) {
    return <IconAnalytics {...props} />;
}

export function IconUsers(props) {
    return <IconTeam {...props} />;
}

export function IconSpark(props) {
    return (
        <svg viewBox="0 0 24 24" {...iconProps} {...props}>
            <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
            <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
        </svg>
    );
}
