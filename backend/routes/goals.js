// Goals routes — CRUD for goal sheets and individual goals
const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run, transaction, getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateGoalSheet } = require('../middleware/validate');
const { logChange } = require('../services/audit');
const { computeScore, computeRiskFlag } = require('../services/scoring');
const { sendEmail, EmailTemplates } = require('../services/email');
const cache = require('../services/cache');

// get active cycle
function getActiveCycle() {
    cache.trackDbQuery();
    return queryOne("SELECT * FROM cycles WHERE is_active = 1 AND phase = 'goal_setting' LIMIT 1");
}

// get all thrust areas
router.get('/thrust-areas', requireAuth, (req, res) => {
    cache.trackDbQuery();
    const areas = queryAll('SELECT * FROM thrust_areas ORDER BY name');
    res.json(areas);
});

// get current employee's goal sheet
router.get('/my-sheet', requireAuth, (req, res) => {
    const cycle = getActiveCycle();
    if (!cycle) return res.json({ sheet: null, cycle: null });

    cache.trackDbQuery();
    const sheet = queryOne(
        'SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?',
        [req.session.user.id, cycle.id]
    );

    if (!sheet) return res.json({ sheet: null, cycle });

    cache.trackDbQuery();
    const goals = queryAll(
        `SELECT g.*, t.name as thrust_area_name 
         FROM goals g LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id 
         WHERE g.sheet_id = ? ORDER BY g.id`, [sheet.id]
    );

    goals.forEach(g => {
        g.risk_flag = computeRiskFlag(g, 'Q1');
        const isPrimary = queryOne(
            'SELECT COUNT(*) as c FROM shared_goals WHERE source_goal_id = ?', [g.id]
        ).c > 0;
        if (isPrimary) {
            g.shared_role = 'primary';
            g.shared_note = 'You update achievement — team copies sync automatically';
        } else if (g.is_shared && g.shared_from_id) {
            g.shared_role = 'recipient';
            const owner = queryOne(
                `SELECT u.name FROM shared_goals sg
                 JOIN goals pg ON pg.id = sg.source_goal_id
                 JOIN goal_sheets gs ON gs.id = pg.sheet_id
                 JOIN users u ON u.id = gs.employee_id
                 WHERE sg.target_goal_id = ? LIMIT 1`, [g.id]
            );
            g.shared_note = owner
                ? `Synced from primary owner: ${owner.name}. Adjust weightage only.`
                : 'Synced from primary owner. Adjust weightage only.';
        }
    });

    res.json({ sheet, goals, cycle });
});

// create or update goal sheet (draft)
router.post('/sheet', requireAuth, (req, res) => {
    const cycle = getActiveCycle();
    if (!cycle) return res.status(400).json({ error: 'No active goal setting cycle' });

    cache.trackDbQuery();
    let sheet = queryOne(
        'SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?',
        [req.session.user.id, cycle.id]
    );

    if (sheet && sheet.locked) {
        return res.status(400).json({ error: 'Goal sheet is locked. Contact admin to unlock.' });
    }

    if (!sheet) {
        cache.trackDbQuery();
        const result = run(
            'INSERT INTO goal_sheets (employee_id, cycle_id, status) VALUES (?, ?, ?)',
            [req.session.user.id, cycle.id, 'draft']
        );
        sheet = { id: result.lastInsertRowid };
    }

    res.json({ sheet_id: sheet.id });
});

// save goals to a sheet (draft save)
router.put('/sheet/:id/goals', requireAuth, (req, res) => {
    const { goals } = req.body;
    cache.trackDbQuery();
    const sheet = queryOne('SELECT * FROM goal_sheets WHERE id = ? AND employee_id = ?',
        [req.params.id, req.session.user.id]);

    if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
    if (sheet.locked) return res.status(400).json({ error: 'Sheet is locked' });
    if (sheet.status === 'approved') return res.status(400).json({ error: 'Sheet already approved' });

    const db = getDb();
    const trans = db.transaction(() => {
        // delete existing non-shared goals
        db.prepare('DELETE FROM goals WHERE sheet_id = ? AND is_shared = 0').run(sheet.id);

        // insert new goals
        const insert = db.prepare(
            `INSERT INTO goals (sheet_id, title, description, thrust_area_id, uom_type, uom_direction, target_value, target_date, weightage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        goals.forEach(g => {
            insert.run(sheet.id, g.title, g.description || null, g.thrust_area_id || null,
                g.uom_type, g.uom_direction || 'min', g.target_value || null, g.target_date || null, g.weightage);
        });

        // update sheet status to draft
        db.prepare("UPDATE goal_sheets SET status = 'draft' WHERE id = ?").run(sheet.id);
    });
    trans();

    cache.invalidate(/^goals_/);
    res.json({ message: 'Goals saved' });
});

// submit goal sheet for approval
router.post('/sheet/:id/submit', requireAuth, validateGoalSheet, (req, res) => {
    const { goals } = req.body;
    cache.trackDbQuery();
    const sheet = queryOne('SELECT * FROM goal_sheets WHERE id = ? AND employee_id = ?',
        [req.params.id, req.session.user.id]);

    if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
    if (sheet.locked) return res.status(400).json({ error: 'Sheet is locked' });

    const db = getDb();
    const trans = db.transaction(() => {
        db.prepare('DELETE FROM goals WHERE sheet_id = ? AND is_shared = 0').run(sheet.id);

        const insert = db.prepare(
            `INSERT INTO goals (sheet_id, title, description, thrust_area_id, uom_type, uom_direction, target_value, target_date, weightage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        goals.forEach(g => {
            insert.run(sheet.id, g.title, g.description || null, g.thrust_area_id || null,
                g.uom_type, g.uom_direction || 'min', g.target_value || null, g.target_date || null, g.weightage);
        });

        db.prepare("UPDATE goal_sheets SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?").run(sheet.id);
    });
    trans();

    // notify manager
    const user = req.session.user;
    if (user.manager_id) {
        run(`INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
            [user.manager_id, 'submission', 'Goal Sheet Submitted',
             `${user.name} has submitted their goal sheet for review`, `/manager/review/${sheet.id}`]);
             
        const manager = queryOne('SELECT name, email FROM users WHERE id = ?', [user.manager_id]);
        if (manager && manager.email) {
            const baseUrl = req.protocol + '://' + req.get('host');
            const tmpl = EmailTemplates.goalSubmitted(user.name, manager.name, baseUrl);
            sendEmail(manager.email, tmpl.subject, tmpl.html);
        }
    }

    cache.invalidate(/^goals_/);
    res.json({ message: 'Goal sheet submitted for approval' });
});

// manager: get team goal sheets
router.get('/team-sheets', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    const userId = req.session.user.id;
    cache.trackDbQuery();
    const sheets = queryAll(
        `SELECT gs.*, u.name as employee_name, u.department, u.email,
                (SELECT COUNT(*) FROM goals WHERE sheet_id = gs.id) as goal_count
         FROM goal_sheets gs 
         JOIN users u ON gs.employee_id = u.id 
         WHERE u.manager_id = ? 
         ORDER BY gs.submitted_at DESC`, [userId]
    );
    res.json(sheets);
});

// manager: get specific sheet with goals for review
router.get('/sheet/:id/review', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    cache.trackDbQuery();
    const sheet = queryOne(
        `SELECT gs.*, u.name as employee_name, u.department, u.email
         FROM goal_sheets gs JOIN users u ON gs.employee_id = u.id 
         WHERE gs.id = ?`, [req.params.id]
    );

    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });

    cache.trackDbQuery();
    const goals = queryAll(
        `SELECT g.*, t.name as thrust_area_name 
         FROM goals g LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id 
         WHERE g.sheet_id = ? ORDER BY g.id`, [sheet.id]
    );

    res.json({ sheet, goals });
});

// manager: approve goal sheet
router.post('/sheet/:id/approve', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    const { edited_goals } = req.body;
    cache.trackDbQuery();
    const sheet = queryOne('SELECT * FROM goal_sheets WHERE id = ?', [req.params.id]);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (sheet.status !== 'submitted') return res.status(400).json({ error: 'Sheet must be in submitted status' });

    const db = getDb();
    const trans = db.transaction(() => {
        // apply any inline edits from manager
        if (edited_goals && edited_goals.length > 0) {
            const update = db.prepare(
                'UPDATE goals SET target_value = ?, weightage = ? WHERE id = ? AND sheet_id = ?'
            );
            edited_goals.forEach(eg => {
                const original = queryOne('SELECT * FROM goals WHERE id = ?', [eg.id]);
                if (original) {
                    if (original.target_value !== eg.target_value) {
                        logChange('goal', eg.id, 'manager_edit', req.session.user.id, 'target_value',
                            original.target_value, eg.target_value);
                    }
                    if (original.weightage !== eg.weightage) {
                        logChange('goal', eg.id, 'manager_edit', req.session.user.id, 'weightage',
                            original.weightage, eg.weightage);
                    }
                }
                update.run(eg.target_value, eg.weightage, eg.id, sheet.id);
            });
        }

        db.prepare(
            `UPDATE goal_sheets SET status = 'locked', locked = 1, approved_at = datetime('now'), approved_by = ? WHERE id = ?`
        ).run(req.session.user.id, sheet.id);

        logChange('goal_sheet', sheet.id, 'approved', req.session.user.id, 'status', 'submitted', 'locked');
    });
    trans();

    // notify employee
    run(`INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
        [sheet.employee_id, 'approval', 'Goals Approved', 'Your goal sheet has been approved and locked', '/goals']);

    const emp = queryOne('SELECT name, email FROM users WHERE id = ?', [sheet.employee_id]);
    if (emp && emp.email) {
        const baseUrl = req.protocol + '://' + req.get('host');
        const tmpl = EmailTemplates.goalApproved(emp.name, baseUrl);
        sendEmail(emp.email, tmpl.subject, tmpl.html);
    }

    cache.invalidate(/^goals_/);
    res.json({ message: 'Goal sheet approved and locked' });
});

// manager: return sheet for rework
router.post('/sheet/:id/return', requireAuth, requireRole('manager', 'admin'), (req, res) => {
    const { comment } = req.body;
    cache.trackDbQuery();
    const sheet = queryOne('SELECT * FROM goal_sheets WHERE id = ?', [req.params.id]);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });

    run("UPDATE goal_sheets SET status = 'returned', return_comment = ? WHERE id = ?",
        [comment || 'Please revise and resubmit', sheet.id]);

    logChange('goal_sheet', sheet.id, 'returned', req.session.user.id, 'status', sheet.status, 'returned');

    run(`INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
        [sheet.employee_id, 'returned', 'Goals Returned', comment || 'Your goals have been returned for rework', '/goals/create']);

    const emp = queryOne('SELECT name, email FROM users WHERE id = ?', [sheet.employee_id]);
    if (emp && emp.email) {
        const baseUrl = req.protocol + '://' + req.get('host');
        const tmpl = EmailTemplates.goalReturned(emp.name, baseUrl);
        sendEmail(emp.email, tmpl.subject, tmpl.html);
    }

    cache.invalidate(/^goals_/);
    res.json({ message: 'Sheet returned for rework' });
});

module.exports = router;
