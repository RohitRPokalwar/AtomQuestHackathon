# 🏗️ AtomQuest Portal Architecture

Our architecture is designed for **blazing-fast performance**, **zero managed-database costs**, and **high scalability**. Below is the complete system topography, mapping the user journey from the browser down to our cost-optimized data layer.

```mermaid
graph TD
    %% Define vibrant color classes for a highly impressive visual hierarchy
    classDef actor fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff,rx:10,ry:10;
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef api fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef service fill:#14b8a6,stroke:#0f766e,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef database fill:#f59e0b,stroke:#b45309,stroke-width:3px,color:#fff,rx:15,ry:15;
    classDef cache fill:#ec4899,stroke:#be185d,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef cloud fill:#64748b,stroke:#334155,stroke-width:2px,color:#fff,stroke-dasharray: 5 5,rx:5,ry:5;

    %% User Personas (Actors)
    subgraph Users ["👥 User Roles & Access"]
        E(["👨‍💻 Employee"]):::actor
        M(["👔 Manager (L1)"]):::actor
        A(["🛡️ Admin / HR"]):::actor
    end

    %% Cloud Deployment
    subgraph Render ["☁️ Render Cloud Infrastructure"]
        
        %% Frontend Layer
        subgraph Client ["💻 Client Tier (React + Vite)"]
            UI["User Interface (Vanilla CSS)"]:::frontend
            State["Auth & Theme Context"]:::frontend
            Router["Dashboard Routers"]:::frontend
        end

        %% Backend Layer
        subgraph Server ["⚙️ Application Tier (Node.js + Express)"]
            Gateway{"API Gateway / Router"}:::api
            Auth["Security & Auth Middleware"]:::api
            
            subgraph Microservices ["🧠 Core Business Logic"]
                Scoring["Scoring Engine (UoM Math)"]:::service
                Goals["Goal Lifecycle Manager"]:::service
                Audit["Audit Trail Service"]:::service
            end
            
            LRU[("⚡ In-Memory LRU Cache\n(Performance Optimizer)")]:::cache
        end

        %% Database Layer
        subgraph Data ["🗄️ Persistence Tier"]
            SQLite[("💾 SQLite Database\n(WAL Mode Enabled)")]:::database
        end
    end

    %% Define Relationships and Data Flow
    E -->|Drafts & Checks-in| UI
    M -->|Approves & Reviews| UI
    A -->|Configures Cycles| UI

    UI -->|API Requests| Router
    Router -->|JSON Payloads| Gateway
    Gateway --> Auth
    
    Auth -->|Validates Sessions| Goals
    Auth -->|Validates Sessions| Scoring
    Auth -->|Validates Sessions| Audit

    Goals -.->|Reads/Writes| SQLite
    Scoring -.->|Reads/Writes| SQLite
    Audit -.->|Logs Activity| SQLite

    %% Cache Interception
    Goals -.->|Intercepts Reads| LRU
    Scoring -.->|Intercepts Reads| LRU
    LRU -.->|Cache Miss| SQLite

```

### 🧠 Architectural Highlights for the Evaluation Panel:

1. **Zero External DB Cost:** By utilizing **SQLite in WAL (Write-Ahead Logging) mode**, we achieve high-concurrency read/write operations locally without the overhead or recurring cost of an external database like RDS or MongoDB.
2. **Lightning Fast Analytics:** The custom **In-Memory LRU Cache** (`cache.js`) intercepts heavy dashboard queries, delivering millisecond response times and protecting the database from read-spikes during quarter-end check-in rushes.
3. **Monolithic Efficiency:** Hosted as a monolithic web service on **Render**, eliminating complex microservice orchestration while maintaining logical separation of concerns internally (UI, API, Services, DB). 
4. **Secure Access Control:** The `Auth & Role Middleware` sits at the top of the application tier, ensuring that Employees, Managers, and Admins are strictly gated from each other's data endpoints.
