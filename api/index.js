const express = require('express');
const session = require('express-session');
const compression = require('compression');
const cors = require('cors');
const { initDatabase } = require('../backend/database/db');

const app = express();

// initialize database (Will write to /tmp/portal.db on Vercel)
initDatabase();

app.use(compression());
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'atomquest-hackathon-2026-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'none', secure: true } // Vercel needs secure cookies
}));

// API routes
app.use('/api/auth', require('../backend/routes/auth'));
app.use('/api/goals', require('../backend/routes/goals'));
app.use('/api/checkins', require('../backend/routes/checkins'));
app.use('/api/admin', require('../backend/routes/admin'));
app.use('/api/reports', require('../backend/routes/reports'));
app.use('/api/shared', require('../backend/routes/shared'));

module.exports = app;
