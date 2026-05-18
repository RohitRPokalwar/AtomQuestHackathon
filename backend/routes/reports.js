// Reports routes — CSV export and dashboard data
const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeScore } = require('../services/scoring');
const cache = require('../services/cache');

// achievement report data
router.get('/achievement', requireAuth, requireRole('admin', 'manager'), (req, res) => {
    const { department, quarter } = req.query;
    const q = quarter || 'Q1';

    cache.trackDbQuery();
    let sql = `SELECT u.name as employee_name, u.department, u.email,
                      g.title as goal_title, g.uom_type, g.uom_direction,
                      g.target_value, g.target_date, g.weightage, g.status,
                      g.achievement_q1, g.achievement_q2, g.achievement_q3, g.achievement_q4,
                      t.name as thrust_area
               FROM goals g
               JOIN goal_sheets gs ON g.sheet_id = gs.id
               JOIN users u ON gs.employee_id = u.id
               LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id
               WHERE gs.locked = 1`;
    const params = [];

    if (department) { sql += ' AND u.department = ?'; params.push(department); }
    sql += ' ORDER BY u.name, g.id';

    const rows = queryAll(sql, params);

    rows.forEach(r => {
        const achCol = `achievement_${q.toLowerCase()}`;
        r.achievement = r[achCol];
        r.score = computeScore(
            { uom_type: r.uom_type, uom_direction: r.uom_direction, target_value: r.target_value, target_date: r.target_date },
            r.achievement
        );
    });

    res.json(rows);
});

// CSV export
router.get('/export-csv', requireAuth, requireRole('admin', 'manager'), (req, res) => {
    const { quarter } = req.query;
    const q = quarter || 'Q1';

    cache.trackDbQuery();
    const rows = queryAll(
        `SELECT u.name as employee_name, u.department,
                g.title, g.uom_type, g.target_value, g.weightage, g.status,
                g.achievement_q1, g.achievement_q2, g.achievement_q3, g.achievement_q4,
                t.name as thrust_area
         FROM goals g
         JOIN goal_sheets gs ON g.sheet_id = gs.id
         JOIN users u ON gs.employee_id = u.id
         LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id
         WHERE gs.locked = 1
         ORDER BY u.name, g.id`
    );

    // build CSV
    const headers = ['Employee', 'Department', 'Goal', 'Thrust Area', 'UoM', 'Target', 'Weightage', 'Achievement', 'Score', 'Status'];
    const csvRows = [headers.join(',')];

    rows.forEach(r => {
        const ach = r[`achievement_${q.toLowerCase()}`];
        const score = computeScore(
            { uom_type: r.uom_type, uom_direction: r.uom_direction, target_value: r.target_value, target_date: r.target_date },
            ach
        );
        csvRows.push([
            `"${r.employee_name}"`, `"${r.department}"`, `"${r.title}"`,
            `"${r.thrust_area || ''}"`, r.uom_type, r.target_value || '',
            r.weightage, ach || '', score !== null ? score : '', r.status
        ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=achievement_report_${q}.csv`);
    res.send(csvRows.join('\n'));
});

// completion dashboard data
router.get('/completion', requireAuth, requireRole('admin', 'manager'), (req, res) => {
    const cacheKey = 'report_completion';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    cache.trackDbQuery();
    const data = queryAll(
        `SELECT u.department, u.name as manager_name, u.id as manager_id,
                COUNT(DISTINCT emp.id) as total_employees,
                COUNT(DISTINCT CASE WHEN gs.locked = 1 THEN gs.id END) as goals_approved,
                COUNT(DISTINCT CASE WHEN c.checked_in_at IS NOT NULL THEN c.id END) as checkins_done
         FROM users u
         JOIN users emp ON emp.manager_id = u.id AND emp.role = 'employee'
         LEFT JOIN goal_sheets gs ON emp.id = gs.employee_id
         LEFT JOIN goals g ON gs.id = g.sheet_id
         LEFT JOIN checkins c ON g.id = c.goal_id
         WHERE u.role = 'manager'
         GROUP BY u.id
         ORDER BY u.department`
    );

    cache.set(cacheKey, data);
    res.json(data);
});

// analytics: QoQ trends
router.get('/analytics', requireAuth, requireRole('admin', 'manager'), (req, res) => {
    cache.trackDbQuery();
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const trends = quarters.map(q => {
        const col = `achievement_${q.toLowerCase()}`;
        const stats = queryOne(
            `SELECT AVG(CASE WHEN g.${col} IS NOT NULL THEN g.${col} END) as avg_achievement,
                    COUNT(CASE WHEN g.${col} IS NOT NULL THEN 1 END) as reported,
                    COUNT(*) as total
             FROM goals g JOIN goal_sheets gs ON g.sheet_id = gs.id WHERE gs.locked = 1`
        );
        return { quarter: q, ...stats };
    });

    // department-wise breakdown
    cache.trackDbQuery();
    const deptBreakdown = queryAll(
        `SELECT u.department, g.uom_type, g.status, COUNT(*) as count
         FROM goals g JOIN goal_sheets gs ON g.sheet_id = gs.id JOIN users u ON gs.employee_id = u.id
         WHERE gs.locked = 1 GROUP BY u.department, g.uom_type, g.status`
    );

    // thrust area distribution
    cache.trackDbQuery();
    const thrustDist = queryAll(
        `SELECT t.name, COUNT(*) as count, AVG(g.weightage) as avg_weightage
         FROM goals g JOIN thrust_areas t ON g.thrust_area_id = t.id
         JOIN goal_sheets gs ON g.sheet_id = gs.id WHERE gs.locked = 1
         GROUP BY t.id ORDER BY count DESC`
    );

    res.json({ trends, deptBreakdown, thrustDist });
});

module.exports = router;
