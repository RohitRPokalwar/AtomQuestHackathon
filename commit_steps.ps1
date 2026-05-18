git add .gitignore package.json
git commit -m "Initial project scaffolding and dependencies"

git add backend/database/schema.sql backend/database/seed.js backend/database/seed_rohit_goals.js backend/package.json
git commit -m "Implement cost-optimized SQLite schema and seed scripts"

git add backend/middleware/ backend/services/cache.js backend/services/scoring.js backend/services/cycles.js backend/services/audit.js
git commit -m "Scoring engine, LRU caching, and cycle management"

git add backend/routes/auth.js backend/routes/goals.js backend/routes/shared.js backend/server.js backend/database/db.js
git commit -m "User authentication, goals CRUD, and shared KPI pushing"

git add backend/routes/checkins.js backend/routes/admin.js backend/routes/reports.js
git commit -m "Quarterly check-ins, reporting, and admin controls"

git add frontend/package.json frontend/index.html frontend/vite.config.js frontend/src/main.jsx frontend/src/App.jsx frontend/src/index.css
git commit -m "React frontend setup, routing, and global css system"

git add frontend/src/api/ frontend/src/context/ frontend/src/components/ frontend/src/layouts/
git commit -m "API client, auth context, and shared components"

git add frontend/src/pages/LoginPage.jsx frontend/src/pages/GoalCreatePage.jsx frontend/src/pages/GoalReviewPage.jsx frontend/src/pages/CheckinPage.jsx
git commit -m "Authentication and core goal setting/check-in flows"

git add frontend/src/pages/EmployeeDashboard.jsx frontend/src/pages/ManagerDashboard.jsx frontend/src/pages/AdminDashboard.jsx frontend/src/pages/ReportsPage.jsx frontend/src/pages/AnalyticsPage.jsx frontend/src/pages/AuditLogPage.jsx
git commit -m "Role-based dashboards, analytics, and audit logging"

git add .
git commit -m "Finalize AtomQuest Goal Portal hackathon submission"
