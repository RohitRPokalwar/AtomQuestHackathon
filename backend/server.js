// Express server — single entry point serving API + React build
const express = require('express');
const session = require('express-session');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;

// initialize database
initDatabase();

// middleware
app.use(compression()); // gzip — ~70% bandwidth reduction
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'atomquest-hackathon-2026-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/shared', require('./routes/shared'));

// serve React build in production
const frontendBuild = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendBuild, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`[AtomQuest] Server running on http://localhost:${PORT}`);
    console.log(`[AtomQuest] SQLite database ready — zero external DB cost`);
});
// Trigger reload
