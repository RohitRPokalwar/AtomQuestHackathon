// Database connection and helpers
// Uses better-sqlite3 for synchronous, zero-latency SQLite access

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'portal.db');
let db;

// initialize database and run schema
function initDatabase() {
    db = new Database(DB_PATH);

    // enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);

    console.log('[DB] SQLite initialized at', DB_PATH);
    return db;
}

// get database instance
function getDb() {
    if (!db) {
        return initDatabase();
    }
    return db;
}

// helper: run a query and return all rows
function queryAll(sql, params = []) {
    return getDb().prepare(sql).all(...params);
}

// helper: run a query and return first row
function queryOne(sql, params = []) {
    return getDb().prepare(sql).get(...params);
}

// helper: run an insert/update and return result info
function run(sql, params = []) {
    return getDb().prepare(sql).run(...params);
}

// helper: run multiple statements in a transaction
function transaction(fn) {
    const trans = getDb().transaction(fn);
    return trans();
}

module.exports = { initDatabase, getDb, queryAll, queryOne, run, transaction };
