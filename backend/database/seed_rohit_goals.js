// Seed Rohit's 8 enterprise goals directly into DB
const { initDatabase, queryOne, queryAll, run, getDb } = require('./db');

function seedRohitGoals() {
    const db = initDatabase();

    // 1. Find Rohit's user
    const rohit = queryOne("SELECT * FROM users WHERE email = 'employee@atomquest.com'");
    if (!rohit) {
        console.error('[ERROR] User rohit@atomquest.com not found!');
        process.exit(1);
    }
    console.log(`[OK] Found user: ${rohit.name} (id=${rohit.id}, role=${rohit.role})`);

    // 2. Find active goal_setting cycle
    const cycle = queryOne("SELECT * FROM cycles WHERE is_active = 1 AND phase = 'goal_setting' LIMIT 1");
    if (!cycle) {
        console.error('[ERROR] No active goal_setting cycle found!');
        // Try to find any goal_setting cycle and activate it
        const anyCycle = queryOne("SELECT * FROM cycles WHERE phase = 'goal_setting' LIMIT 1");
        if (anyCycle) {
            console.log(`[FIX] Found goal_setting cycle (id=${anyCycle.id}), activating it...`);
            run('UPDATE cycles SET is_active = 0'); // deactivate all
            run('UPDATE cycles SET is_active = 1 WHERE id = ?', [anyCycle.id]);
        } else {
            console.error('[ERROR] No goal_setting cycle exists at all!');
            process.exit(1);
        }
    }
    const activeCycle = queryOne("SELECT * FROM cycles WHERE is_active = 1 AND phase = 'goal_setting' LIMIT 1");
    console.log(`[OK] Active cycle: ${activeCycle.name} (id=${activeCycle.id})`);

    // 3. Get thrust area IDs
    const thrustAreas = queryAll('SELECT * FROM thrust_areas');
    const taMap = {};
    thrustAreas.forEach(ta => { taMap[ta.name] = ta.id; });
    console.log('[OK] Thrust areas loaded:', Object.keys(taMap).join(', '));

    // 4. Check if Rohit already has a sheet for this cycle
    let sheet = queryOne('SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?', [rohit.id, activeCycle.id]);
    if (sheet) {
        console.log(`[OK] Existing sheet found (id=${sheet.id}, status=${sheet.status}). Clearing old goals...`);
        run('DELETE FROM goals WHERE sheet_id = ?', [sheet.id]);
        run("UPDATE goal_sheets SET status = 'submitted', submitted_at = datetime('now'), locked = 0 WHERE id = ?", [sheet.id]);
    } else {
        const result = run(
            "INSERT INTO goal_sheets (employee_id, cycle_id, status, submitted_at) VALUES (?, ?, 'submitted', datetime('now'))",
            [rohit.id, activeCycle.id]
        );
        sheet = { id: Number(result.lastInsertRowid) };
        console.log(`[OK] Created new goal sheet (id=${sheet.id})`);
    }

    // 5. Define the 8 enterprise goals
    const goals = [
        {
            title: 'Improve API Response Time for Core Services',
            description: 'Optimize backend API performance for critical services to ensure average response time remains below 120ms under production load.',
            thrust_area: 'Operational Excellence',
            uom_type: 'numeric',
            uom_direction: 'max',  // Lower is Better
            target_value: 120,
            target_date: null,
            weightage: 15
        },
        {
            title: 'Reduce Production Bug Escalations',
            description: 'Minimize production-level customer escalations by improving QA validation and release stability.',
            thrust_area: 'Customer Satisfaction',
            uom_type: 'percentage',
            uom_direction: 'max',  // Lower is Better
            target_value: 5,
            target_date: null,
            weightage: 10
        },
        {
            title: 'Increase CI/CD Automation Coverage',
            description: 'Improve deployment automation coverage across backend and frontend services to accelerate release cycles.',
            thrust_area: 'Digital Transformation',
            uom_type: 'percentage',
            uom_direction: 'min',  // Higher is Better
            target_value: 90,
            target_date: null,
            weightage: 15
        },
        {
            title: 'Maintain Zero Critical Security Incidents',
            description: 'Ensure no critical security vulnerabilities or incidents occur in production systems throughout the review cycle.',
            thrust_area: 'Safety & Compliance',
            uom_type: 'zero',
            uom_direction: 'min',  // Higher is Better
            target_value: 0,
            target_date: null,
            weightage: 10
        },
        {
            title: 'Launch Real-Time Monitoring Dashboard Before Deadline',
            description: 'Successfully deploy centralized monitoring and alerting dashboard before the committed release timeline.',
            thrust_area: 'Innovation & R&D',
            uom_type: 'timeline',
            uom_direction: 'min',  // Higher is Better
            target_value: null,
            target_date: '2026-10-31',
            weightage: 10
        },
        {
            title: 'Improve Enterprise Platform Performance',
            description: 'Enhance enterprise platform performance and scalability to improve customer retention and premium client satisfaction.',
            thrust_area: 'Revenue Growth',
            uom_type: 'percentage',
            uom_direction: 'min',  // Higher is Better
            target_value: 25,
            target_date: null,
            weightage: 15
        },
        {
            title: 'Reduce Cloud Infrastructure Cost per Deployment',
            description: 'Optimize deployment pipelines and resource utilization to reduce cloud infrastructure spending per release cycle.',
            thrust_area: 'Cost Optimization',
            uom_type: 'percentage',
            uom_direction: 'max',  // Lower is Better
            target_value: 12,
            target_date: null,
            weightage: 10
        },
        {
            title: 'Conduct Internal Technical Knowledge Sharing Sessions',
            description: 'Organize technical learning and mentoring sessions to improve engineering collaboration and internal capability growth.',
            thrust_area: 'People Development',
            uom_type: 'numeric',
            uom_direction: 'min',  // Higher is Better
            target_value: 6,
            target_date: null,
            weightage: 15
        }
    ];

    // 6. Insert all goals
    const insert = db.prepare(
        `INSERT INTO goals (sheet_id, title, description, thrust_area_id, uom_type, uom_direction, target_value, target_date, weightage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertAll = db.transaction(() => {
        goals.forEach((g, idx) => {
            const taId = taMap[g.thrust_area] || null;
            if (!taId) console.warn(`[WARN] Thrust area "${g.thrust_area}" not found!`);
            insert.run(sheet.id, g.title, g.description, taId, g.uom_type, g.uom_direction, g.target_value, g.target_date, g.weightage);
            console.log(`  [${idx + 1}/8] ✓ ${g.title} (${g.weightage}%)`);
        });
    });
    insertAll();

    // 7. Verify
    const totalWeightage = goals.reduce((s, g) => s + g.weightage, 0);
    const insertedCount = queryOne('SELECT COUNT(*) as cnt FROM goals WHERE sheet_id = ?', [sheet.id]).cnt;

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`  Goal Sheet ID:    ${sheet.id}`);
    console.log(`  Employee:         ${rohit.name} (${rohit.email})`);
    console.log(`  Goals inserted:   ${insertedCount}`);
    console.log(`  Total Weightage:  ${totalWeightage}%`);
    console.log(`  Sheet Status:     submitted`);
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('Done! Rohit\'s goal sheet is ready for manager approval.');

    db.close();
}

seedRohitGoals();
