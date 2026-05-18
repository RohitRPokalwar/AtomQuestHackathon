# 🎯 AtomQuest Hackathon 1.0 — Goal Setting & Tracking Portal

> **Solving the alignment, visibility, and accountability gaps in modern organizations.**

This repository contains our submission for the **AtomQuest Hackathon 1.0**. We have built a structured, digital Goal Setting & Tracking Portal that supports the full lifecycle of employee goals — from creation and alignment to quarterly check-ins and performance visibility.

---

## 🚀 The Solution: What We Built

We designed a unified, role-based platform that replaces fragmented spreadsheets and emails. It is intuitive, reliable, and entirely audit-ready. 

### 🌟 Core Features (Must-Haves Achieved 100%)

#### Phase 1: Goal Creation & Approval
*   **Smart Goal Sheets:** Employees can draft up to 8 goals, categorizing them by Thrust Area.
*   **Dynamic Unit of Measurement (UoM):** Supports Numeric, Percentage (%), Timeline, and Zero-based targets. 
*   **System-Enforced Validation:** Ensures total weightage strictly equals **100%** and no individual goal drops below **10%**.
*   **Manager L1 Approval:** Managers can review, perform inline edits on targets/weightages, return for rework, or approve (which securely **locks** the sheet).
*   **Shared Goals Engine:** Admins/Managers can push departmental KPIs. Employees can only adjust weightage (Title and Target are read-only). Achievements sync automatically across the entire org.

#### Phase 2: Achievement Tracking & Quarterly Check-ins
*   **Quarterly Check-ins:** Employees log Actual Achievement against Planned Targets during active Check-in Windows (Q1, Q2, Q3, Q4).
*   **Manager Module:** Managers view Planned vs. Actuals side-by-side and log structured feedback/comments.
*   **Algorithmic Progress Scoring:** The system automatically computes performance scores based on the UoM Type (Min, Max, Timeline, Zero).

### 📈 Bonus Features Implemented
*   **Analytics Module (5.4):** A rich, real-time dashboard showing Quarter-on-Quarter (QoQ) goal achievement trends, Goal distribution by Thrust Area, and Manager completion rates.
*   **Cost Optimization (6.0):** Built entirely on **SQLite (WAL mode)** with an in-memory **LRU Caching Engine** to achieve zero managed-DB costs while maintaining high-concurrency read performance.

---

## 🛠️ Architecture & Tech Stack

Our solution is architected for speed, simplicity, and zero-cost hosting requirements.

*   **Frontend:** React (Vite) + Vanilla CSS (No heavy UI frameworks to ensure blazing fast load times).
*   **Backend:** Node.js + Express.js.
*   **Database:** SQLite (Cost-optimized, stored locally, zero external dependencies).
*   **State Management:** Context API + custom `LRUCache` for API response optimization.

---

## ⚙️ Getting Started (Local Setup)

Want to run the portal locally? It takes less than 60 seconds.

### 1. Install Dependencies
Navigate to the root folder and install concurrently (handles both frontend and backend):
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Seed the Database
Our robust seeding script sets up the configurations, cycles, and thrust areas automatically.
```bash
npm run seed
```

### 3. Run the App
Launch both the backend API and frontend React app simultaneously:
```bash
npm run dev
```

The portal will be available at: **http://localhost:5173**

---

## 🔑 Demo Credentials

You can test all three User Journeys using the following credentials:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@atomquest.com` | `admin123` |
| **Manager** | Register a new account and change role via Admin | - |
| **Employee** | Register a new account via the `/login` page | - |

*(Note: Employees and Managers can self-register from the login screen. Admins can manage their roles via the Admin Dashboard).*

---

## 📊 Evaluation Checklist
- [x] End-to-end functionality (Create, Approve, Check-in)
- [x] BRD Validation Rules Enforced (100% weight, max 8 goals)
- [x] Role-based User Friendliness
- [x] Bug-free normal & edge-case flows
- [x] Cost Optimized (LRU Cache + SQLite)
- [x] Bonus: Analytics Module

<p align="center"><i>Built with ❤️ for AtomQuest 1.0</i></p>
