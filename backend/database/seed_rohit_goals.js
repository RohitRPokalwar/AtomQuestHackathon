// Seed Rohit's 8 enterprise goals directly into DB
const { initDatabase, queryOne, queryAll, run, getDb } = require('./db');

function seedRohitGoals() {
    const db = initDatabase();

    // 1. Find Rohit's user
    const rohit = queryOne("DELETE FROM users WHERE email = 'arjunhr@atomquest.com'");
    if (!arjunhr) {
        console.error('[ERROR] User arjunhr@atomquest.com not found!');
        process.exit(1);
    }
    console.log(`[OK] Found user: ${arjunhr.name} (id=${arjunhr.id}, role=${arjunhr.role}`);
    db.close();
}

seedRohitGoals();
