// Shared goals — push departmental KPIs to multiple employees (BRD 2.1)
const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run, getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const cache = require('../services/cache');

function getGoalSettingCycle() {
    return queryOne("SELECT * FROM cycles WHERE is_active = 1 AND phase = 'goal_setting' LIMIT 1")
        || queryOne("SELECT * FROM cycles WHERE phase = 'goal_setting' ORDER BY id DESC LIMIT 1");
}

// employees manager/admin can push to
router.get('/recipients', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    cache.trackDbQuery();
    const isAdmin = req.session.user.role === 'admin';
    const employees = isAdmin
        ? queryAll(`SELECT u.id, u.name, u.email, u.department, u.avatar_color,
                    m.name as manager_name
             FROM users u LEFT JOIN users m ON u.manager_id = m.id
             WHERE u.role = 'employee' ORDER BY u.department, u.name`)
        : queryAll(
            `SELECT u.id, u.name, u.email, u.department, u.avatar_color
             FROM users u WHERE u.role = 'employee' AND u.manager_id = ?
             ORDER BY u.name`, [req.session.user.id]
        );
    res.json(employees);
});

// list KPI pushes created by this user
router.get('/pushed', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    cache.trackDbQuery();
    const rows = queryAll(
        `SELECT g.id as source_goal_id, g.title, g.target_value, g.target_date, g.uom_type,
                u.name as primary_owner_name,
                (SELECT COUNT(*) FROM shared_goals s2 WHERE s2.source_goal_id = g.id) as recipient_count,
                MIN(sg.created_at) as created_at
         FROM shared_goals sg
         JOIN goals g ON g.id = sg.source_goal_id
         JOIN goal_sheets gs ON gs.id = g.sheet_id
         JOIN users u ON u.id = gs.employee_id
         WHERE sg.created_by = ?
         GROUP BY g.id
         ORDER BY created_at DESC`, [req.session.user.id]
    );
    res.json(rows);
});

// push shared KPI to team
router.post('/push', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    const {
        title, description, thrust_area_id, uom_type, uom_direction,
        target_value, target_date, weightage, employee_ids, primary_owner_id
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Goal title is required' });
    if (!employee_ids?.length) return res.status(400).json({ error: 'Select at least one employee' });

    const uniqueIds = [...new Set(employee_ids.map(Number))];
    const primaryId = primary_owner_id ? Number(primary_owner_id) : uniqueIds[0];
    if (!uniqueIds.includes(primaryId)) {
        return res.status(400).json({ error: 'Primary owner must be in the selected employees' });
    }

    const cycle = getGoalSettingCycle();
    if (!cycle) {
        return res.status(400).json({
            error: 'Goal Setting phase is not active. Activate Phase 1 under Admin → Annual Cycle first.'
        });
    }

    const w = Number(weightage) || 10;
    if (w < 10) return res.status(400).json({ error: 'Minimum weightage is 10%' });

    const db = getDb();
    let primaryGoalId = null;
    const created = [];

    const trans = db.transaction(() => {
        uniqueIds.forEach(empId => {
            cache.trackDbQuery();
            let sheet = queryOne(
                'SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?',
                [empId, cycle.id]
            );
            if (!sheet) {
                const r = run(
                    'INSERT INTO goal_sheets (employee_id, cycle_id, status) VALUES (?, ?, ?)',
                    [empId, cycle.id, 'draft']
                );
                sheet = { id: r.lastInsertRowid, locked: 0 };
            }
            if (sheet.locked) return;

            const goalCount = queryOne('SELECT COUNT(*) as c FROM goals WHERE sheet_id = ?', [sheet.id]).c;
            if (goalCount >= 8) return;

            const isPrimary = empId === primaryId;
            const r2 = run(
                `INSERT INTO goals (sheet_id, title, description, thrust_area_id, uom_type, uom_direction,
                 target_value, target_date, weightage, is_shared, shared_from_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
                [
                    sheet.id, title.trim(), description || null, thrust_area_id || null,
                    uom_type || 'numeric', uom_direction || 'min',
                    target_value ?? null, target_date || null, w,
                    isPrimary ? null : null // set shared_from_id after primary known
                ]
            );
            const goalId = r2.lastInsertRowid;

            if (isPrimary) {
                primaryGoalId = goalId;
            }
            created.push({ employee_id: empId, goal_id: goalId, is_primary: isPrimary });
        });

        if (!primaryGoalId) {
            throw new Error('Could not create primary goal — check employee sheets are not locked/full');
        }

        created.forEach(({ employee_id, goal_id, is_primary }) => {
            run(
                'UPDATE goals SET shared_from_id = ? WHERE id = ?',
                [primaryGoalId, goal_id]
            );
            run(
                'INSERT INTO shared_goals (source_goal_id, target_employee_id, target_goal_id, created_by) VALUES (?, ?, ?, ?)',
                [primaryGoalId, employee_id, goal_id, req.session.user.id]
            );
            run(`INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
                [
                    employee_id,
                    'shared_goal',
                    'Shared KPI Assigned',
                    is_primary
                        ? `You are the primary owner for shared KPI: "${title}"`
                        : `Shared KPI assigned (synced from primary owner): "${title}"`,
                    '/goals/create'
                ]);
        });
    });

    try {
        trans();
    } catch (err) {
        return res.status(400).json({ error: err.message || 'Push failed' });
    }

    if (!primaryGoalId) {
        return res.status(400).json({ error: 'No goals created — sheets may be locked or at 8 goal limit' });
    }

    cache.invalidate(/^goals_/);
    res.json({
        message: `Shared KPI pushed to ${created.length} employee(s)`,
        primary_goal_id: primaryGoalId,
        created_count: created.length
    });
});

// employee: update weightage only on shared goal
router.patch('/goals/:goalId/weightage', requireAuth, requireRole('employee'), (req, res) => {
    const { weightage } = req.body;
    const w = Number(weightage);
    if (w < 10) return res.status(400).json({ error: 'Minimum weightage is 10%' });

    cache.trackDbQuery();
    const goal = queryOne(
        `SELECT g.*, gs.employee_id, gs.locked FROM goals g
         JOIN goal_sheets gs ON g.sheet_id = gs.id WHERE g.id = ?`,
        [req.params.goalId]
    );
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.employee_id !== req.session.user.id) return res.status(403).json({ error: 'Not your goal' });
    if (!goal.is_shared) return res.status(400).json({ error: 'Only shared goals allow weightage-only edits' });
    if (goal.locked) return res.status(400).json({ error: 'Sheet is locked' });

    run('UPDATE goals SET weightage = ?, updated_at = datetime(\'now\') WHERE id = ?', [w, goal.id]);
    cache.invalidate(/^goals_/);
    res.json({ message: 'Weightage updated' });
});

module.exports = router;
