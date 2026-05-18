// Escalation engine — BRD 5.3: flag overdue goal submission & manager approvals
const { queryAll, queryOne, run } = require('../database/db');

const RULE_LABELS = {
    employee_goal_pending: 'Employee has not submitted goals',
    manager_approval_pending: 'Manager has not approved submitted goals',
    employee_checkin_pending: 'Employee has not completed quarterly check-in',
};

function getActiveGoalSettingCycle() {
    return queryOne("SELECT * FROM cycles WHERE is_active = 1 AND phase = 'goal_setting' LIMIT 1")
        || queryOne("SELECT * FROM cycles WHERE phase = 'goal_setting' ORDER BY id DESC LIMIT 1");
}

function getActiveCheckinCycle() {
    return queryOne("SELECT * FROM cycles WHERE is_active = 1 AND phase IN ('Q1','Q2','Q3','Q4') LIMIT 1")
        || queryOne("SELECT * FROM cycles WHERE phase IN ('Q1','Q2','Q3','Q4') AND is_active = 1 LIMIT 1");
}

function hasOpenEscalation(ruleType, targetUserId, cycleId) {
    return queryOne(
        `SELECT id FROM escalations
         WHERE rule_type = ? AND target_user_id = ? AND COALESCE(cycle_id, 0) = COALESCE(?, 0) AND status = 'open'`,
        [ruleType, targetUserId, cycleId ?? null]
    );
}

function createEscalation(ruleType, targetUserId, cycleId, level = 1) {
    if (hasOpenEscalation(ruleType, targetUserId, cycleId)) return null;

    const result = run(
        `INSERT INTO escalations (rule_type, target_user_id, cycle_id, escalation_level, status)
         VALUES (?, ?, ?, ?, 'open')`,
        [ruleType, targetUserId, cycleId ?? null, level]
    );

    const user = queryOne('SELECT name, email FROM users WHERE id = ?', [targetUserId]);
    const label = RULE_LABELS[ruleType] || ruleType;
    run(
        `INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
        [
            targetUserId,
            'escalation',
            'Escalation: Action Required',
            `${label}. Please take action in the portal.`,
            ruleType.includes('manager') ? '/manager' : '/goals/create',
        ]
    );

    return {
        id: result.lastInsertRowid,
        rule_type: ruleType,
        target_user_id: targetUserId,
        target_name: user?.name,
        target_email: user?.email,
        cycle_id: cycleId,
    };
}

/**
 * Scan org for BRD escalation conditions and write open records (deduped).
 */
function runEscalationEngine() {
    const created = [];
    let skipped = 0;

    const goalCycle = getActiveGoalSettingCycle();
    if (goalCycle) {
        const employees = queryAll(
            `SELECT u.id, u.name, u.manager_id FROM users u WHERE u.role = 'employee'`
        );

        for (const emp of employees) {
            const sheet = queryOne(
                'SELECT status FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?',
                [emp.id, goalCycle.id]
            );
            const needsSubmit = !sheet || sheet.status === 'draft' || sheet.status === 'returned';
            if (!needsSubmit) continue;

            const row = createEscalation('employee_goal_pending', emp.id, goalCycle.id);
            if (row) created.push(row);
            else skipped++;
        }

        const managersWithPending = queryAll(
            `SELECT DISTINCT u.manager_id as manager_id
             FROM goal_sheets gs
             JOIN users u ON gs.employee_id = u.id
             WHERE gs.cycle_id = ? AND gs.status = 'submitted' AND u.manager_id IS NOT NULL`,
            [goalCycle.id]
        );

        for (const { manager_id } of managersWithPending) {
            const row = createEscalation('manager_approval_pending', manager_id, goalCycle.id, 2);
            if (row) created.push(row);
            else skipped++;
        }
    }

    const checkinCycle = getActiveCheckinCycle();
    if (checkinCycle) {
        const quarter = checkinCycle.phase;
        const lockedSheets = queryAll(
            `SELECT gs.id, gs.employee_id FROM goal_sheets gs
             WHERE gs.status IN ('locked', 'approved')`
        );

        for (const sheet of lockedSheets) {
            const goals = queryAll('SELECT id FROM goals WHERE sheet_id = ?', [sheet.id]);
            if (!goals.length) continue;

            const missing = goals.some(g => {
                const isPrimary = queryOne(
                    'SELECT COUNT(*) as c FROM shared_goals WHERE source_goal_id = ?', [g.id]
                ).c > 0;
                const goal = queryOne('SELECT is_shared, shared_from_id FROM goals WHERE id = ?', [g.id]);
                if (goal?.is_shared && goal.shared_from_id && !isPrimary) return false;

                const checkin = queryOne(
                    'SELECT id FROM checkins WHERE goal_id = ? AND quarter = ?',
                    [g.id, quarter]
                );
                return !checkin;
            });

            if (missing) {
                const row = createEscalation('employee_checkin_pending', sheet.employee_id, checkinCycle.id);
                if (row) created.push(row);
                else skipped++;
            }
        }
    }

    return { created, skipped, total_open: queryOne("SELECT COUNT(*) as c FROM escalations WHERE status = 'open'").c };
}

function listEscalations({ status = 'open', limit = 50 } = {}) {
    return queryAll(
        `SELECT e.*, u.name as target_name, u.email as target_email, u.role as target_role,
                c.name as cycle_name, c.phase as cycle_phase
         FROM escalations e
         JOIN users u ON e.target_user_id = u.id
         LEFT JOIN cycles c ON e.cycle_id = c.id
         WHERE (? = 'all' OR e.status = ?)
         ORDER BY e.triggered_at DESC
         LIMIT ?`,
        [status, status, limit]
    );
}

function resolveEscalation(id) {
    run("UPDATE escalations SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?", [id]);
}

module.exports = {
    runEscalationEngine,
    listEscalations,
    resolveEscalation,
    RULE_LABELS,
};
