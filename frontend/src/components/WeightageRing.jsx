// Animated donut ring showing weightage out of 100%
export default function WeightageRing({ value = 0, size = 64, strokeWidth = 5, showCenterLabel = true }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value, 100) / 100;
    const offset = circumference * (1 - progress);

    // color based on value
    const color = value >= 100 ? 'var(--accent-green)'
                : value >= 70 ? 'var(--accent-blue)'
                : value >= 40 ? 'var(--accent-amber)'
                : 'var(--accent-red)';

    return (
        <div className="weightage-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                {/* background circle */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="var(--bg-elevated)"
                    strokeWidth={strokeWidth}
                />
                {/* progress circle */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                />
            </svg>
            {showCenterLabel && (
                <span className="weightage-ring-label" style={{ fontSize: size < 50 ? 10 : 12 }}>
                    {Math.round(value)}
                </span>
            )}
        </div>
    );
}
