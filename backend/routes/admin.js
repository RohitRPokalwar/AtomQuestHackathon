// Admin routes — cycle management, unlock, hierarchy, cost meter
const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logChange, logUnlock, getAuditLog } = require('../services/audit');
const { computeHealthScore } = require('../services/scoring');
const cache = require('../services/cache');
const { enrichCycles } = require('../services/cycles');
const { runEscalationEngine, listEscalations, resolveEscalation, RULE_LABELS } = require('../services/escalationEngine');

// get all cycles with real-time window status
router.get('/cycles', requireAuth, requireRole('admin'), (req, res) => {
    cache.trackDbQuery();
    const rows = queryAll('SELECT * FROM cycles ORDER BY year DESC, window_open');
    res.json(enrichCycles(rows));
});

// create a new cycle
router.post('/cycles', requireAuth, requireRole('admin'), (req, res) => {
    const { name, year, phase, window_open, window_close } = req.body;
    cache.trackDbQuery();
    const result = run(
        'INSERT INTO cycles (name, year, phase, window_open, window_close) VALUES (?, ?, ?, ?, ?)',
        [name, year, phase, window_open, window_close]
    );
    cache.invalidate(/^cycle/);
    res.json({ id: result.lastInsertRowid, message: 'Cycle created' });
});

// toggle cycle active status
router.post('/cycles/:id/toggle', requireAuth, requireRole('admin'), (req, res) => {
    cache.trackDbQuery();
    const cycle = queryOne('SELECT * FROM cycles WHERE id = ?', [req.params.id]);
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });

    const newStatus = cycle.is_active ? 0 : 1;
    if (newStatus) {
        run('UPDATE cycles SET is_active = 0');
    }
    run('UPDATE cycles SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    cache.invalidate(/^cycle/);
    cache.invalidate('admin_dashboard');
    const rows = queryAll('SELECT * FROM cycles ORDER BY year DESC, window_open');
    res.json({
        message: `Cycle ${newStatus ? 'activated' : 'deactivated'}`,
        ...enrichCycles(rows),
    });
});

// unlock a goal sheet (with audit logging)
router.post('/sheets/:id/unlock', requireAuth, requireRole('admin'), (req, res) => {
    cache.trackDbQuery();
    const sheet = queryOne('SELECT * FROM goal_sheets WHERE id = ?', [req.params.id]);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (!sheet.locked) return res.status(400).json({ error: 'Sheet is not locked' });

    // log the unlock action before making the change
    logUnlock(sheet.id, req.session.user.id);

    run("UPDATE goal_sheets SET locked = 0, status = 'submitted' WHERE id = ?", [sheet.id]);

    // notify employee
    run(`INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
        [sheet.employee_id, 'unlock', 'Goal Sheet Unlocked',
         'Your goal sheet has been unlocked by Admin for editing', '/goals/create']);

    cache.invalidate(/^goals_/);
    res.json({ message: 'Sheet unlocked' });
});

// get all users (org hierarchy)
router.get('/users', requireAuth, requireRole('admin', 'manager'), (req, res) => {
    cache.trackDbQuery();
    const users = queryAll(
        `SELECT u.id, u.email, u.name, u.role, u.department, u.manager_id, u.avatar_color,
                m.name as manager_name
         FROM users u LEFT JOIN users m ON u.manager_id = m.id ORDER BY u.department, u.name`
    );
    res.json(users);
});

// get completion dashboard stats
router.get('/dashboard', requireAuth, requireRole('admin'), (req, res) => {
    const cacheKey = 'admin_dashboard';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    cache.trackDbQuery();
    const totalEmployees = queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['employee']).count;
    const totalManagers = queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['manager']).count;

    cache.trackDbQuery();
    const sheetsSubmitted = queryOne("SELECT COUNT(*) as count FROM goal_sheets WHERE status IN ('submitted','locked','approved')").count;
    const sheetsApproved = queryOne("SELECT COUNT(*) as count FROM goal_sheets WHERE status IN ('locked','approved')").count;
    const sheetsDraft = queryOne("SELECT COUNT(*) as count FROM goal_sheets WHERE status = 'draft'").count;

    cache.trackDbQuery();
    const activeCycle = queryOne('SELECT * FROM cycles WHERE is_active = 1 LIMIT 1');

    // department breakdown
    cache.trackDbQuery();
    const deptStats = queryAll(
        `SELECT u.department, 
                COUNT(DISTINCT u.id) as total_employees,
                COUNT(DISTINCT CASE WHEN gs.status IN ('locked','approved') THEN gs.id END) as approved_sheets,
                COUNT(DISTINCT CASE WHEN gs.status = 'submitted' THEN gs.id END) as pending_sheets
         FROM users u 
         LEFT JOIN goal_sheets gs ON u.id = gs.employee_id
         WHERE u.role = 'employee'
         GROUP BY u.department`
    );

    // recent activity
    cache.trackDbQuery();
    const recentAudit = queryAll(
        `SELECT a.*, u.name as changed_by_name FROM audit_log a 
         JOIN users u ON a.changed_by = u.id ORDER BY a.timestamp DESC LIMIT 10`
    );

    const data = {
        totalEmployees, totalManagers, sheetsSubmitted, sheetsApproved, sheetsDraft,
        activeCycle, deptStats, recentAudit,
        completionRate: totalEmployees > 0 ? Math.round((sheetsApproved / totalEmployees) * 100) : 0
    };

    cache.set(cacheKey, data);
    res.json(data);
});

// get audit log
router.get('/audit-log', requireAuth, requireRole('admin'), (req, res) => {
    const { entityType, entityId } = req.query;
    const log = getAuditLog({ entityType, entityId: entityId ? parseInt(entityId) : null });
    res.json(log);
});

// get cost metrics (live cost meter)
router.get('/cost-metrics', requireAuth, requireRole('admin'), (req, res) => {
    res.json(cache.getCostMetrics());
});

// get all goal sheets for admin view
router.get('/all-sheets', requireAuth, requireRole('admin'), (req, res) => {
    cache.trackDbQuery();
    const sheets = queryAll(
        `SELECT gs.*, u.name as employee_name, u.department, u.email, u.avatar_color,
                m.name as manager_name,
                (SELECT COUNT(*) FROM goals WHERE sheet_id = gs.id) as goal_count
         FROM goal_sheets gs 
         JOIN users u ON gs.employee_id = u.id 
         LEFT JOIN users m ON u.manager_id = m.id
         ORDER BY gs.created_at DESC`
    );
    res.json(sheets);
});

// get notifications for current user
router.get('/notifications', requireAuth, (req, res) => {
    cache.trackDbQuery();
    const notifs = queryAll(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [req.session.user.id]
    );
    res.json(notifs);
});

// mark notification as read
router.post('/notifications/:id/read', requireAuth, (req, res) => {
    run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.user.id]);
    res.json({ message: 'Marked as read' });
});

// ---- USER MANAGEMENT (Admin) ----

const crypto = require('crypto');
function hashPassword(pw) { return crypto.createHash('sha256').update(pw).digest('hex'); }

// create a new user (admin only)
router.post('/users', requireAuth, requireRole('admin'), (req, res) => {
    const { email, password, name, role, department, manager_id } = req.body;

    if (!email || !password || !name || !role || !department) {
        return res.status(400).json({ error: 'All fields required: email, password, name, role, department' });
    }
    if (!['employee', 'manager', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role must be employee, manager, or admin' });
    }

    cache.trackDbQuery();
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const colors = ['#5b8def', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#34d399', '#60a5fa'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    cache.trackDbQuery();
    const result = run(
        `INSERT INTO users (email, password_hash, name, role, department, manager_id, avatar_color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [email.toLowerCase().trim(), hashPassword(password), name.trim(), role, department.trim(),
         manager_id || null, avatarColor]
    );

    cache.invalidate(/^admin/);
    res.json({ id: result.lastInsertRowid, message: `${role} "${name}" created successfully` });
});

// update user role or manager assignment
router.put('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
    const { role, department, manager_id } = req.body;
    cache.trackDbQuery();
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (role) run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    if (department) run('UPDATE users SET department = ? WHERE id = ?', [department, req.params.id]);
    if (manager_id !== undefined) run('UPDATE users SET manager_id = ? WHERE id = ?', [manager_id || null, req.params.id]);

    cache.invalidate(/^admin/);
    res.json({ message: 'User updated' });
});

// delete user (admin only)
router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
    cache.trackDbQuery();
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin accounts' });

    run('DELETE FROM users WHERE id = ?', [req.params.id]);
    cache.invalidate(/^admin/);
    res.json({ message: 'User deleted' });
});

// escalations — BRD 5.3
router.get('/escalations', requireAuth, requireRole('admin'), (req, res) => {
    const status = req.query.status || 'open';
    const rows = listEscalations({ status, limit: 100 });
    res.json(rows.map(r => ({ ...r, rule_label: RULE_LABELS[r.rule_type] || r.rule_type })));
});

router.post('/escalations/run', requireAuth, requireRole('admin'), (req, res) => {
    const result = runEscalationEngine();
    cache.invalidate('admin_dashboard');
    res.json({
        message: `Escalation scan complete — ${result.created.length} new, ${result.skipped} already open`,
        ...result,
    });
});

router.post('/escalations/:id/resolve', requireAuth, requireRole('admin'), (req, res) => {
    const row = queryOne('SELECT * FROM escalations WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Escalation not found' });
    resolveEscalation(row.id);
    res.json({ message: 'Escalation resolved' });
});

// get all managers (for dropdown assignment)
router.get('/managers', requireAuth, requireRole('admin'), (req, res) => {
    cache.trackDbQuery();
    const managers = queryAll("SELECT id, name, department FROM users WHERE role = 'manager' ORDER BY name");
    res.json(managers);
});

module.exports = router;
