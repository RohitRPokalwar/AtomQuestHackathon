// Check-in routes — quarterly achievement tracking
const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run, getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeScore, computeRiskFlag } = require('../services/scoring');
const { logChange } = require('../services/audit');
const cache = require('../services/cache');
const { getWindowState } = require('../services/cycles');

// get active check-in cycle
function getActiveCheckinCycle() {
    cache.trackDbQuery();
    return queryOne(
        `SELECT * FROM cycles WHERE is_active = 1 AND phase IN ('Q1','Q2','Q3','Q4') LIMIT 1`
    );
}

// get all cycles for window info
router.get('/cycles', requireAuth, (req, res) => {
    cache.trackDbQuery();
    const cycles = queryAll('SELECT * FROM cycles ORDER BY window_open');
    res.json(cycles);
});

// get employee's goals with check-in data for current quarter
router.get('/my-checkins', requireAuth, (req, res) => {
    const cycle = getActiveCheckinCycle();
    cache.trackDbQuery();
    const sheet = queryOne(
        `SELECT gs.* FROM goal_sheets gs 
         JOIN cycles c ON gs.cycle_id = c.id 
         WHERE gs.employee_id = ? AND gs.locked = 1 
         ORDER BY gs.approved_at DESC LIMIT 1`,
        [req.session.user.id]
    );

    if (!sheet) return res.json({ goals: [], cycle, windowOpen: false });

    cache.trackDbQuery();
    const goals = queryAll(
        `SELECT g.*, t.name as thrust_area_name FROM goals g 
         LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id 
         WHERE g.sheet_id = ? ORDER BY g.id`, [sheet.id]
    );

    // get existing check-ins
    const quarter = cycle ? cycle.phase : null;
    goals.forEach(g => {
        if (quarter) {
            cache.trackDbQuery();
            g.checkin = queryOne(
                'SELECT * FROM checkins WHERE goal_id = ? AND quarter = ?', [g.id, quarter]
            );
        }
        g.score = computeScore(g, g[`achievement_${quarter?.toLowerCase()}`]);
        g.risk_flag = computeRiskFlag(g, quarter || 'Q1');
        const isPrimary = queryOne(
            'SELECT COUNT(*) as c FROM shared_goals WHERE source_goal_id = ?', [g.id]
        ).c > 0;
        if (isPrimary) g.shared_role = 'primary';
        else if (g.is_shared && g.shared_from_id) g.shared_role = 'recipient';
    });

    const { windowOpen, adminOverride, calendarOpen } = getWindowState(cycle);

    res.json({ goals, cycle, windowOpen, adminOverride, calendarOpen, sheet });
});

// submit check-in for a goal
router.post('/submit', requireAuth, (req, res) => {
    const { goal_id, actual_value, status, employee_notes } = req.body;
    const cycle = getActiveCheckinCycle();

    if (!cycle) return res.status(400).json({ error: 'No active check-in cycle. Ask HR to activate a quarterly check-in phase.' });

    const { windowOpen } = getWindowState(cycle);
    if (!windowOpen) {
        return res.status(400).json({
            error: 'Check-in window is closed',
            window_open: cycle.window_open,
            window_close: cycle.window_close
        });
    }

    cache.trackDbQuery();
    const goal = queryOne('SELECT g.*, gs.employee_id FROM goals g JOIN goal_sheets gs ON g.sheet_id = gs.id WHERE g.id = ?', [goal_id]);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.employee_id !== req.session.user.id) return res.status(403).json({ error: 'Not your goal' });

    const quarter = cycle.phase;
    const achievementCol = `achievement_${quarter.toLowerCase()}`;

    // upsert check-in
    cache.trackDbQuery();
    const existing = queryOne('SELECT * FROM checkins WHERE goal_id = ? AND quarter = ?', [goal_id, quarter]);

    if (existing) {
        run(`UPDATE checkins SET actual_value = ?, status = ?, employee_notes = ?, checked_in_at = datetime('now') WHERE id = ?`,
            [actual_value, status || 'on_track', employee_notes || null, existing.id]);
    } else {
        run(`INSERT INTO checkins (goal_id, quarter, planned_value, actual_value, status, employee_notes, checked_in_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [goal_id, quarter, goal.target_value, actual_value, status || 'on_track', employee_notes || null]);
    }

    // update achievement on goal
    run(`UPDATE goals SET ${achievementCol} = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
        [actual_value, status || 'on_track', goal_id]);

    // sync shared goals from primary owner to all linked copies
    cache.trackDbQuery();
    const isPrimary = queryOne(
        'SELECT COUNT(*) as c FROM shared_goals WHERE source_goal_id = ?', [goal_id]
    ).c > 0;

    if (isPrimary) {
        const sharedLinks = queryAll(
            'SELECT target_goal_id FROM shared_goals WHERE source_goal_id = ? AND target_goal_id != ?',
            [goal_id, goal_id]
        );
        sharedLinks.forEach(link => {
            run(`UPDATE goals SET ${achievementCol} = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
                [actual_value, status || 'on_track', link.target_goal_id]);
            const existing = queryOne('SELECT id FROM checkins WHERE goal_id = ? AND quarter = ?',
                [link.target_goal_id, quarter]);
            if (existing) {
                run(`UPDATE checkins SET actual_value = ?, status = ?, checked_in_at = datetime('now') WHERE id = ?`,
                    [actual_value, status || 'on_track', existing.id]);
            } else {
                const tg = queryOne('SELECT target_value FROM goals WHERE id = ?', [link.target_goal_id]);
                run(`INSERT INTO checkins (goal_id, quarter, planned_value, actual_value, status, checked_in_at)
                     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                    [link.target_goal_id, quarter, tg?.target_value, actual_value, status || 'on_track']);
            }
        });
    } else {
        const link = queryOne('SELECT * FROM shared_goals WHERE target_goal_id = ?', [goal_id]);
        if (link && link.source_goal_id !== goal_id) {
            return res.status(403).json({
                error: 'This is a shared KPI. Only the primary owner can submit achievement updates.'
            });
        }
    }

    cache.invalidate(/^checkin_|^goals_/);
    res.json({ message: 'Check-in recorded' });
});

// manager: get team check-in data
router.get('/team', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    const managerId = req.session.user.id;
    cache.trackDbQuery();

    const employees = queryAll(
        `SELECT u.id, u.name, u.email, u.department, u.avatar_color,
                gs.id as sheet_id, gs.status as sheet_status
         FROM users u 
         LEFT JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.locked = 1
         WHERE u.manager_id = ? ORDER BY u.name`, [managerId]
    );

    const cycle = getActiveCheckinCycle();
    const quarter = cycle ? cycle.phase : 'Q1';

    employees.forEach(emp => {
        if (emp.sheet_id) {
            cache.trackDbQuery();
            emp.goals = queryAll(
                `SELECT g.*, t.name as thrust_area_name,
                        c.actual_value as checkin_value, c.status as checkin_status,
                        c.employee_notes, c.manager_comment, c.checked_in_at, c.manager_checked_at
                 FROM goals g 
                 LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id
                 LEFT JOIN checkins c ON g.id = c.goal_id AND c.quarter = ?
                 WHERE g.sheet_id = ? ORDER BY g.id`, [quarter, emp.sheet_id]
            );
            emp.goals.forEach(g => {
                g.score = computeScore(g, g.checkin_value);
                g.risk_flag = computeRiskFlag(g, quarter);
            });
        } else {
            emp.goals = [];
        }
    });

    res.json({ employees, cycle });
});

// manager: add check-in comment
router.post('/comment', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    const { goal_id, quarter, comment } = req.body;

    cache.trackDbQuery();
    const checkin = queryOne('SELECT * FROM checkins WHERE goal_id = ? AND quarter = ?', [goal_id, quarter]);
    if (!checkin) return res.status(404).json({ error: 'Check-in not found' });

    run(`UPDATE checkins SET manager_comment = ?, manager_checked_at = datetime('now') WHERE id = ?`,
        [comment, checkin.id]);

    cache.invalidate(/^checkin_/);
    res.json({ message: 'Comment added' });
});

module.exports = router;
