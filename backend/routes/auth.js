// Auth routes — login, logout, register, session check
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { queryOne, queryAll, run } = require('../database/db');
const cache = require('../services/cache');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// register a new user
router.post('/register', (req, res) => {
    cache.trackDbQuery();
    const { email, password, name, role, department } = req.body;

    if (!email || !password || !name || !department) {
        return res.status(400).json({ error: 'All fields are required: email, password, name, department' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // check if email exists
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // new users register as employee by default
    // admin can change role later
    const userRole = role === 'manager' ? 'manager' : 'employee';
    const colors = ['#5b8def', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fb923c', '#e879f9'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    cache.trackDbQuery();
    const result = run(
        `INSERT INTO users (email, password_hash, name, role, department, avatar_color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email.toLowerCase().trim(), hashPassword(password), name.trim(), userRole, department.trim(), avatarColor]
    );

    // auto-login after registration
    const user = queryOne('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
    req.session.user = {
        id: user.id, email: user.email, name: user.name,
        role: user.role, department: user.department,
        manager_id: user.manager_id, avatar_color: user.avatar_color
    };

    res.json({ user: req.session.user, message: 'Account created successfully' });
});

// login
router.post('/login', (req, res) => {
    cache.trackDbQuery();
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const user = queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user || user.password_hash !== hashPassword(password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.user = {
        id: user.id, email: user.email, name: user.name,
        role: user.role, department: user.department,
        manager_id: user.manager_id, avatar_color: user.avatar_color
    };

    res.json({ user: req.session.user });
});

// logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// get current session
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: req.session.user });
});

// get all departments (for registration dropdown)
router.get('/departments', (req, res) => {
    cache.trackDbQuery();
    const depts = queryAll('SELECT DISTINCT department FROM users WHERE department IS NOT NULL ORDER BY department');
    // add default departments if none exist
    const defaults = ['Engineering', 'Operations', 'HR', 'Finance', 'Marketing', 'Sales'];
    const existing = depts.map(d => d.department);
    const all = [...new Set([...existing, ...defaults])].sort();
    res.json(all);
});

module.exports = router;
