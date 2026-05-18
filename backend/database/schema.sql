-- AtomQuest Goal Portal — Database Schema
-- Cost-optimized: SQLite, zero managed-DB cost

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employee', 'manager', 'admin')),
    department TEXT NOT NULL,
    manager_id INTEGER,
    avatar_color TEXT DEFAULT '#5b8def',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    phase TEXT NOT NULL,
    window_open DATE NOT NULL,
    window_close DATE NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thrust_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goal_sheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    cycle_id INTEGER NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'returned', 'locked')),
    submitted_at DATETIME,
    approved_at DATETIME,
    approved_by INTEGER,
    locked INTEGER DEFAULT 0,
    return_comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (cycle_id) REFERENCES cycles(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sheet_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thrust_area_id INTEGER,
    uom_type TEXT NOT NULL CHECK(uom_type IN ('numeric', 'percentage', 'timeline', 'zero')),
    uom_direction TEXT DEFAULT 'min' CHECK(uom_direction IN ('min', 'max')),
    target_value REAL,
    target_date DATE,
    weightage REAL NOT NULL CHECK(weightage >= 10),
    status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'on_track', 'completed', 'at_risk', 'off_track')),
    is_shared INTEGER DEFAULT 0,
    shared_from_id INTEGER,
    achievement_q1 REAL,
    achievement_q2 REAL,
    achievement_q3 REAL,
    achievement_q4 REAL,
    completion_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sheet_id) REFERENCES goal_sheets(id),
    FOREIGN KEY (thrust_area_id) REFERENCES thrust_areas(id),
    FOREIGN KEY (shared_from_id) REFERENCES goals(id)
);

CREATE TABLE IF NOT EXISTS shared_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_goal_id INTEGER NOT NULL,
    target_employee_id INTEGER NOT NULL,
    target_goal_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_goal_id) REFERENCES goals(id),
    FOREIGN KEY (target_employee_id) REFERENCES users(id),
    FOREIGN KEY (target_goal_id) REFERENCES goals(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    quarter TEXT NOT NULL CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    planned_value REAL,
    actual_value REAL,
    status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'on_track', 'completed')),
    employee_notes TEXT,
    manager_comment TEXT,
    checked_in_at DATETIME,
    manager_checked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES goals(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    changed_by INTEGER NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_type TEXT NOT NULL,
    target_user_id INTEGER NOT NULL,
    cycle_id INTEGER,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    escalation_level INTEGER DEFAULT 1,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved')),
    FOREIGN KEY (target_user_id) REFERENCES users(id),
    FOREIGN KEY (cycle_id) REFERENCES cycles(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance (cost optimization: faster reads = fewer CPU cycles)
CREATE INDEX IF NOT EXISTS idx_goals_sheet ON goals(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheets_employee ON goal_sheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_sheets_cycle ON goal_sheets(cycle_id);
CREATE INDEX IF NOT EXISTS idx_checkins_goal ON checkins(goal_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);
