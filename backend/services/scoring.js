// Scoring service — computes progress scores per goal
// Handles all 4 UoM types with division-by-zero guards

// compute score for a single goal based on its UoM type
function computeScore(goal, achievement) {
    if (achievement === null || achievement === undefined) {
        return null;
    }

    switch (goal.uom_type) {
        case 'numeric':
        case 'percentage':
            return computeNumericScore(goal, achievement);
        case 'timeline':
            return computeTimelineScore(goal, achievement);
        case 'zero':
            return computeZeroScore(achievement);
        default:
            return null;
    }
}

// numeric and percentage scoring with direction handling
// min direction = higher is better (achievement / target)
// max direction = lower is better (target / achievement)
function computeNumericScore(goal, achievement) {
    const target = goal.target_value;

    if (goal.uom_direction === 'min') {
        // higher is better: score = achievement / target
        if (target === 0 || target === null) {
            // guard: if target is zero, any positive achievement = 100%
            return achievement > 0 ? 100 : 0;
        }
        return Math.min(Math.round((achievement / target) * 100 * 10) / 10, 150);
    } else {
        // lower is better: score = target / achievement
        if (achievement === 0) {
            // guard: if achievement is zero and target > 0, perfect score
            // if both zero, perfect score
            return 100;
        }
        if (target === 0 || target === null) {
            // guard: target zero means goal is to have zero, any achievement is bad
            return 0;
        }
        return Math.min(Math.round((target / achievement) * 100 * 10) / 10, 150);
    }
}

// timeline scoring: completed on or before deadline = 100, else 0
function computeTimelineScore(goal, completionDate) {
    if (!goal.target_date || !completionDate) {
        return null;
    }
    const deadline = new Date(goal.target_date);
    const completed = new Date(completionDate);
    return completed <= deadline ? 100 : 0;
}

// zero-based scoring: zero = success (100%), anything else = 0%
function computeZeroScore(achievement) {
    return achievement === 0 ? 100 : 0;
}

// compute weighted overall score for a goal sheet
function computeSheetScore(goals) {
    let totalWeighted = 0;
    let totalWeight = 0;

    goals.forEach(goal => {
        const achievement = goal.achievement_q4 ?? goal.achievement_q3 ?? goal.achievement_q2 ?? goal.achievement_q1;
        const score = computeScore(goal, achievement);
        if (score !== null) {
            totalWeighted += score * (goal.weightage / 100);
            totalWeight += goal.weightage;
        }
    });

    if (totalWeight === 0) return null;
    return Math.round((totalWeighted / (totalWeight / 100)) * 10) / 10;
}

// compute health score for a goal sheet (0-100 composite)
// factors: weightage balance, check-in timeliness, achievement trajectory
function computeHealthScore(goals, checkins) {
    let balanceScore = 0;
    let timelinessScore = 0;
    let trajectoryScore = 0;

    // weightage balance: are goals spread evenly?
    // perfect balance = all goals have equal weightage
    if (goals.length > 0) {
        const idealWeight = 100 / goals.length;
        const deviations = goals.map(g => Math.abs(g.weightage - idealWeight));
        const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
        // max deviation from ideal is idealWeight itself
        balanceScore = Math.max(0, 100 - (avgDeviation / idealWeight) * 100);
    }

    // check-in timeliness: what % of expected check-ins are completed?
    if (checkins.length > 0) {
        const completed = checkins.filter(c => c.checked_in_at).length;
        timelinessScore = (completed / checkins.length) * 100;
    } else {
        timelinessScore = 50; // neutral if no check-ins expected yet
    }

    // achievement trajectory: are goals on track?
    if (goals.length > 0) {
        const onTrack = goals.filter(g => g.status === 'on_track' || g.status === 'completed').length;
        trajectoryScore = (onTrack / goals.length) * 100;
    }

    // composite: 30% balance + 30% timeliness + 40% trajectory
    return Math.round(balanceScore * 0.3 + timelinessScore * 0.3 + trajectoryScore * 0.4);
}

// compute trajectory risk flags
// returns: 'on_track', 'at_risk' (amber), or 'off_track' (red)
function computeRiskFlag(goal, currentQuarter) {
    const quarterMap = { Q1: 0.25, Q2: 0.5, Q3: 0.75, Q4: 1.0 };
    const expectedProgress = quarterMap[currentQuarter] || 0;

    if (goal.uom_type === 'zero') {
        // for zero-based goals, any non-zero = off track
        const latestAchievement = goal.achievement_q4 ?? goal.achievement_q3 ?? goal.achievement_q2 ?? goal.achievement_q1;
        if (latestAchievement !== null && latestAchievement > 0) return 'off_track';
        return 'on_track';
    }

    if (goal.uom_type === 'timeline') {
        // for timeline goals, check if completion date is approaching
        if (goal.completion_date) return 'completed';
        if (!goal.target_date) return 'on_track';
        const now = new Date();
        const deadline = new Date(goal.target_date);
        const daysRemaining = (deadline - now) / (1000 * 60 * 60 * 24);
        if (daysRemaining < 30) return 'at_risk';
        return 'on_track';
    }

    // for numeric/percentage goals
    const target = goal.target_value;
    if (!target || target === 0) return 'on_track';

    const latestAchievement = goal.achievement_q4 ?? goal.achievement_q3 ?? goal.achievement_q2 ?? goal.achievement_q1;
    if (latestAchievement === null || latestAchievement === undefined) return 'not_started';

    const progressRatio = latestAchievement / target;

    // compare actual progress to expected progress
    if (progressRatio < expectedProgress * 0.4) return 'off_track';  // below 40% of expected
    if (progressRatio < expectedProgress * 0.7) return 'at_risk';    // below 70% of expected
    return 'on_track';
}

module.exports = { computeScore, computeSheetScore, computeHealthScore, computeRiskFlag };
