// Seed script — creates ONLY configuration data (no users, no mock goals)
// Users register through the portal or are created by Admin
// Run with: npm run seed

const { initDatabase, run, queryOne } = require('./db');
const crypto = require('crypto');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function seed() {
    const db = initDatabase();

    console.log('[SEED] Clearing existing data...');
    db.pragma('foreign_keys = OFF');
    db.exec(`
        DELETE FROM notifications;
        DELETE FROM escalations;
        DELETE FROM audit_log;
        DELETE FROM checkins;
        DELETE FROM shared_goals;
        DELETE FROM goals;
        DELETE FROM goal_sheets;
        DELETE FROM thrust_areas;
        DELETE FROM cycles;
        DELETE FROM users;
    `);
    db.pragma('foreign_keys = ON');

    // create default admin account (only pre-created user)
    console.log('[SEED] Creating default admin account...');
    run(`INSERT INTO users (email, password_hash, name, role, department, avatar_color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin@atomquest.com', hashPassword('admin123'), 'System Admin', 'admin', 'HR', '#5b8def']);

    run(`INSERT INTO users (email, password_hash, name, role, department, avatar_color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['manager@atomquest.com', hashPassword('manager123'), 'Arjun', 'manager', 'Engineering', '#f59e0b']);

    run(`INSERT INTO users (email, password_hash, name, role, department, avatar_color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['employee@atomquest.com', hashPassword('employee123'), 'Rohit', 'employee', 'Engineering', '#10b981']);

    // Set Arjun as Rohit's manager
    const mgr = queryOne("SELECT id FROM users WHERE email = 'manager@atomquest.com'");
    const emp = queryOne("SELECT id FROM users WHERE email = 'employee@atomquest.com'");
    if (mgr && emp) run('UPDATE users SET manager_id = ? WHERE id = ?', [mgr.id, emp.id]);

    console.log('[SEED] Creating cycles...');

    // goal setting cycle
    run(`INSERT INTO cycles (name, year, phase, window_open, window_close, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['FY 2026-27 Goal Setting', 2026, 'goal_setting', '2026-05-01', '2026-06-30', 1]);

    // quarterly check-in cycles
    run(`INSERT INTO cycles (name, year, phase, window_open, window_close, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['FY 2026-27 Q1 Check-in', 2026, 'Q1', '2026-07-01', '2026-07-31', 0]);

    run(`INSERT INTO cycles (name, year, phase, window_open, window_close, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['FY 2026-27 Q2 Check-in', 2026, 'Q2', '2026-10-01', '2026-10-31', 0]);

    run(`INSERT INTO cycles (name, year, phase, window_open, window_close, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['FY 2026-27 Q3 Check-in', 2026, 'Q3', '2027-01-01', '2027-01-31', 0]);

    run(`INSERT INTO cycles (name, year, phase, window_open, window_close, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['FY 2026-27 Q4 / Annual', 2026, 'Q4', '2027-03-01', '2027-04-30', 0]);

    console.log('[SEED] Creating thrust areas...');

    const thrustAreas = [
        ['Revenue Growth', null],
        ['Customer Satisfaction', null],
        ['Operational Excellence', null],
        ['Innovation & R&D', null],
        ['Cost Optimization', null],
        ['People Development', null],
        ['Safety & Compliance', null],
        ['Digital Transformation', null]
    ];

    thrustAreas.forEach(([name, dept]) => {
        run('INSERT INTO thrust_areas (name, department) VALUES (?, ?)', [name, dept]);
    });

    console.log('[SEED] Configuration seeded successfully!');
    console.log('');
    console.log('Default Admin Account:');
    console.log('  Email:    admin@atomquest.com');
    console.log('  Password: admin123');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Login as admin');
    console.log('  2. Create managers and employees from the User Management panel');
    console.log('  3. Or users can self-register at /register');

    db.close();
}

seed();
