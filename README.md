

<h1 align="center">TrackMate — Goal Setting & Tracking Portal</h1>

<p align="center">
  <strong>(A full-stack, production-grade goal management system that transforms how organizations set, track, and achieve their objectives.)</strong>
</p>

---

## The Problem

Organizations face critical challenges in goal management:

| Pain Point | Impact |
|---|---|
| **Scattered Goals** | Employees set goals on spreadsheets, emails, or disconnected tools — no single source of truth |
| **Zero Visibility** | Managers can't see real-time goal progress; rely on manual quarterly reviews |
| **No Accountability** | No submission deadlines, no approval workflows — goals silently die |
| **Inconsistent Metrics** | Every department uses different KPIs, weightages, and scoring — impossible to compare |
| **Audit Gaps** | No history of who changed what, when, or why — compliance nightmare |
| **Delayed Escalation** | Pending approvals sit for weeks; no automated reminders or escalation |

> **Result**: 60% of organizational goals fail not because of bad strategy, but because of broken execution tracking.

---

## The Solution

**TrackMate** is a purpose-built goal management platform that solves every pain point with a structured, audited, role-based workflow:

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Employee │────▶│  Draft Goals│────▶│   Submit for │────▶│ Approved│
│  Creates │     │  (1-8 goals) │     │   Approval   │     │ & Locked │
└──────────┘     └──────────────┘     └──────────────┘     └──────────┘
                                             │                    │
                                      ┌──────▼──────┐     ┌──────▼──────┐
                                      │   Manager   │     │  Quarterly  │
                                      │   Reviews   │     │ Achievement │
                                      └─────────────┘     │  Tracking   │
                                                          └─────────────┘
```

### How TrackMate Solves Each Pain Point

| Problem | TrackMate Solution |
|---|---|
| Scattered Goals | **Single portal** — all goals in one system with structured templates |
| Zero Visibility | **Real-time dashboards** — Managers see team status instantly, admins see org-wide KPIs |
| No Accountability | **Enforced workflow** — Draft → Submit → Approve/Reject with mandatory validation |
| Inconsistent Metrics | **4 UoM types** (Numeric, Percentage, Timeline, Zero-Based) with automatic scoring engine |
| Audit Gaps | **Full audit trail** — every mutation logged with actor, timestamp, delta, and IP |
| Delayed Escalation | **Escalation rules** — configurable SLA thresholds with auto-notification |

---

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │           Frontend (React)          │
                    │  Vite 8 + TailwindCSS + TanStack    │
                    │  Dark-mode UI + Glassmorphism       │
                    └──────────────┬──────────────────────┘
                                   │ HTTP/REST (Axios)
                                   ▼
                    ┌─────────────────────────────────────┐
                    │           Backend (FastAPI)          │
                    │  Async Python + SQLAlchemy ORM       │
                    │  JWT Auth + RBAC + Audit Middleware  │
                    └──────────────┬──────────────────────┘
                                   │ asyncpg
                                   ▼
                    ┌─────────────────────────────────────┐
                    │      PostgreSQL (Supabase)           │
                    │  8 Tables + JSONB Audit Logs         │
                    │  Connection Pooling via Supavisor    │
                    └─────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────┴──────────────────────┐
                    │        Microsoft Entra ID            │
                    │  SSO + App Roles + Token Validation  │
                    └─────────────────────────────────────┘
```

### Key Architectural Decisions

- **Async-first**: All database I/O is non-blocking (asyncpg + SQLAlchemy async)
- **Non-blocking notifications**: Webhook dispatches use FastAPI `BackgroundTasks` — API responds instantly
- **Decimal arithmetic**: Financial-grade precision — never uses `float` for scores/weightages
- **Dual auth**: Supports both Microsoft SSO and local email/password fallback
- **Audit by default**: Every mutating request is automatically logged via middleware
- **Recursive CTEs**: Goal hierarchy lineage is resolved via PostgreSQL recursive queries for O(depth) performance
- **Role-derived navigation**: UI dynamically adapts based on Azure AD App Roles or local role assignment

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** `0.115` | High-performance async REST API framework |
| **SQLAlchemy** `2.0` | Async ORM with native PostgreSQL type support |
| **asyncpg** | Zero-copy PostgreSQL driver for async Python |
| **Alembic** | Database migration management |
| **PyJWT** + **MSAL** | Dual JWT validation (Azure AD RS256 + Local HS256) |
| **Pydantic** `2.9` | Request/response validation with `ConfigDict` |
| **Supabase PostgreSQL** | Managed database with connection pooling |

### Frontend

| Technology | Purpose |
|---|---|
| **React** `19` | Component-based UI with hooks |
| **Vite** `8` | Lightning-fast dev server + build tool |
| **TailwindCSS** `4` | Utility-first CSS with custom design tokens |
| **TanStack React Query** | Server-state management with cache invalidation |
| **Recharts** | Data visualization (bar charts, line charts) |
| **Lucide React** | Beautiful icon library |
| **Radix UI** | Accessible, unstyled UI primitives |
| **MSAL React** | Microsoft authentication library for React |
| **Axios** | HTTP client with interceptors for auth |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Microsoft Entra ID** | Enterprise SSO with App Roles for RBAC |
| **Supabase** | Managed PostgreSQL with real-time capabilities |
| **GZip Middleware** | Response compression for all payloads > 500 bytes |

---

## Features

### Employee Portal
- **Goal Sheet Creation** — Create annual goal sheets mapped to financial years (e.g., FY2025-26)
- **Goal CRUD** — Add, edit, delete goals with thrust areas, targets, and weightages
- **Smart Validation** — Real-time validation checklist: total weightage = 100%, min 10% per goal, 1-8 goals max
- **Submit Workflow** — One-click submission with pre-flight validation
- **Achievement Tracking** — Record quarterly actuals with automatic score computation
- **Field-Level Locks** — Admin-pushed KPIs have locked titles and targets
- **Goal Alignment View** — See how any cascaded goal rolls up through the hierarchy (employee → manager → org)

### Manager Dashboard
- **Team Overview** — See all direct reports with goal status at a glance
- **Approve/Reject** — One-click approval or rejection with reason
- **Check-in System** — Structured quarterly check-ins with optional rating (1-5)
- **Sheet Detail** — Deep-dive into any team member's goal sheet
- **Cascade Goals** — Push any of your own goals down to direct reports as linked child goals

### Admin Console
- **Org-Wide KPIs** — Total employees, submitted sheets, approval rate, average score
- **Department Analytics** — Bar chart comparing average scores by department
- **Quarter Trends** — Line chart showing score progression across quarters
- **User Management** — CRUD users, assign roles, toggle active status
- **Quarterly Cycles** — Configure time-gate windows for achievement submission
- **Escalation Rules** — Set SLA thresholds for automated escalation
- **Audit Logs** — Paginated, filterable log viewer with expandable JSON deltas
- **Push Goals (KPIs)** — Cascade shared goals to multiple employees simultaneously

### Cascading OKRs / Goal Hierarchy
- **Parent-Child Goal Links** — Goals pushed by admins or cascaded by managers maintain a `parent_goal_id` link back to the source goal
- **Recursive Lineage API** — PostgreSQL Recursive CTE walks up the `parent_goal_id` chain to build the full ancestry path from organizational objective → manager key result → employee target
- **Visual Lineage Tracker** — Inline breadcrumb-style UI in the Goal Editor shows the full alignment chain with contextual icons (🏢 Org → 👥 Manager → 🎯 Employee) and gradient-highlighted current goal
- **Alignment Badges** — Goals that are part of a hierarchy display an "Aligned" badge on the Dashboard and an "Alignment" toggle in the Goal Editor
- **Manager Cascade Flow** — Managers can cascade any of their own goals to selected direct reports via a modal with employee picker, creating linked child goals automatically

### Event-Driven Notifications
- **Async Webhook Dispatcher** — Critical goal sheet lifecycle events (approval, rejection, unlock) trigger Slack/Discord webhook notifications via `httpx.AsyncClient`
- **Non-Blocking Execution** — Notifications are dispatched via FastAPI `BackgroundTasks`, so the API response is never delayed by third-party network calls
- **Graceful Degradation** — If no `SLACK_WEBHOOK_URL` is configured, the system logs a warning and continues without error — safe for local development
- **Robust Error Handling** — All network/transport errors are caught and logged; a failing webhook never crashes the worker or propagates to the caller

### Data Export
- **CSExport** — Flat-file export of achievement data with role-based filtering
- **XLSX Export** — Styled Excel export with headers, auto-fit columns, and frozen panes

### Authentication
- **Microsoft Entra ID (SSO)** — Production-grade Azure AD integration with MSAL
- **Local Email/Password** — Fallback authentication with JWT tokens
- **Quick Demo Login** — One-click login as Employee, Manager, or Admin for testing

### Audit & Compliance
- **Automatic Audit Logging** — Every POST/PATCH/PUT/DELETE is logged
- **JSONB Delta Storage** — Exact before/after values for every field change
- **Actor Tracking** — Who changed what, when, from which IP

---

## Project Structure

```
TrackMate/
├── backend/
│   ├── main.py                          # FastAPI app entry point
│   ├── database.py                      # Async engine + session factory
│   ├── requirements.txt                 # Python dependencies
│   │
│   ├── models/                          # SQLAlchemy ORM models
│   │   ├── user.py                      # User with Azure OID + password hash
│   │   ├── goal_sheet.py                # Goal sheet lifecycle (draft→approved)
│   │   ├── goal.py                      # Individual goals with field locks
│   │   ├── achievement.py               # Quarterly achievement records
│   │   ├── checkin.py                   # Manager check-in entries
│   │   ├── audit_log.py                 # JSONB audit trail
│   │   ├── quarterly_cycle.py           # Time-gate configuration
│   │   ├── escalation_rule.py           # SLA escalation rules
│   │   └── enums.py                     # PostgreSQL ENUM types
│   │
│   ├── schemas/                         # Pydantic request/response models
│   │   ├── user.py, goal.py, goal_sheet.py
│   │   ├── achievement.py, checkin.py
│   │   ├── admin.py, common.py
│   │   └── __init__.py
│   │
│   ├── routers/                         # API route handlers
│   │   ├── auth.py                      # Login/Register (local JWT)
│   │   ├── goals.py                     # Goal sheet + goal CRUD + workflow
│   │   ├── achievements.py              # Achievement submission + scoring
│   │   ├── manager.py                   # Team overview + check-ins
│   │   ├── admin.py                     # Users, cycles, dashboard, audit
│   │   └── export.py                    # CSV/XLSX data export
│   │
│   ├── services/                        # Business logic layer
│   │   ├── scoring.py                   # Score computation engine (4 UoM types)
│   │   ├── goal_validation.py           # Weightage + count validation
│   │   ├── audit.py                     # Audit log writer + delta computation
│   │   └── notifications.py             # Async webhook dispatcher (Slack/Discord)
│   │
│   ├── middleware/                       # Request pipeline
│   │   ├── auth.py                      # JWT validation (Azure AD + Local)
│   │   └── audit.py                     # Automatic mutation logging
│   │
│   └── migrations/                      # Alembic schema migrations
│       └── versions/
│           ├── 001_initial_schema.py
│           └── 002_rls_policies.py
│
└── frontend/
    ├── index.html                        # Entry HTML with Inter font + SEO
    ├── vite.config.js                    # Vite + TailwindCSS + path aliases
    ├── .env                              # API URL + Azure AD credentials
    │
    └── src/
        ├── main.jsx                      # React root + MsalProvider
        ├── App.jsx                       # Router + QueryClient + LocalAuthProvider
        ├── index.css                     # Design tokens + glassmorphism + animations
        │
        ├── lib/                          # Core utilities
        │   ├── api.js                    # Axios client with dual auth interceptors
        │   ├── auth.jsx                  # Unified useAuth() (MSAL + Local JWT)
        │   ├── msalConfig.js             # Azure AD MSAL configuration
        │   ├── queries.js                # 17 TanStack React Query hooks
        │   └── utils.js                  # cn() class merge utility
        │
        ├── components/                   # Shared components
        │   ├── AppLayout.jsx             # Sidebar + header + auth controls
        │   ├── ui.jsx                    # Button, Card, Modal, StatusBadge, etc.
        │   ├── GoalLineageTracker.jsx    # Cascading OKR hierarchy visualizer
        │   ├── CascadeGoalModal.jsx      # Manager goal cascade modal
        │   └── PushGoalModal.jsx         # Admin push shared KPI modal
        │
        └── pages/                        # Route pages
            ├── LoginPage.jsx             # Dual auth login (SSO + email/password)
            ├── Dashboard.jsx             # Employee dashboard
            ├── GoalEditor.jsx            # Goal CRUD + validation + submit
            ├── Achievements.jsx          # Quarterly achievement tracking
            ├── TeamDashboard.jsx         # Manager team overview
            ├── AdminDashboard.jsx        # Admin KPIs + charts
            ├── UserManagement.jsx        # Admin user CRUD
            ├── QuarterlyCycles.jsx        # Admin cycle configuration
            └── AuditLogs.jsx             # Admin audit log viewer
```

---

### Test Accounts

| Role | Email | Password |
|---|---|---|
| Employee | `employee@trackmate.com` | `employee123` |
| Manager | `manager@trackmate.com` | `manager123` |
| Admin | `admin@trackmate.com` | `admin123` |

---

## API Reference

All endpoints are prefixed with `/api/v1`. Interactive docs available at `/docs`.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Email/password login → JWT |
| `POST` | `/auth/register` | Create local account → JWT |

### Goal Sheets
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/goal-sheets/` | Create draft sheet |
| `GET` | `/goal-sheets/me` | List my sheets |
| `GET` | `/goal-sheets/{id}` | Get sheet with goals |
| `POST` | `/goal-sheets/{id}/submit` | Submit for approval |
| `POST` | `/goal-sheets/{id}/approve` | Manager approves |
| `POST` | `/goal-sheets/{id}/reject` | Manager rejects |
| `POST` | `/goal-sheets/{id}/unlock` | Admin unlocks |

### Goals
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/goal-sheets/{id}/goals` | Add goal to sheet |
| `PATCH` | `/goal-sheets/{id}/goals/{gid}` | Update goal |
| `DELETE` | `/goal-sheets/{id}/goals/{gid}` | Delete goal |
| `GET` | `/goal-sheets/{id}/goals/{gid}/lineage` | Get cascading OKR lineage (root → leaf) |

### Achievements
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/goals/{id}/achievements` | Submit quarterly achievement |
| `GET` | `/goals/{id}/achievements` | Get achievement history |

### Manager
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/manager/team` | Team overview |
| `GET` | `/manager/team/{eid}/sheet` | Employee's sheet |
| `POST` | `/manager/team/{eid}/goals/{gid}/checkin` | Log check-in |
| `POST` | `/manager/goals/{gid}/cascade` | Cascade goal to direct reports |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/dashboard` | Org-wide KPIs |
| `GET/POST/PATCH` | `/admin/users` | User management |
| `GET/POST/PATCH` | `/admin/quarterly-cycles` | Cycle config |
| `GET` | `/admin/audit-logs` | Audit log viewer |
| `POST` | `/admin/push-goal` | Push shared KPI |

### Export
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/export/achievements` | CSV/XLSX export |

---

## Authentication

TrackMate supports **two authentication methods** that can coexist:

### 1. Microsoft Entra ID (SSO)
- MSAL-based login via popup/redirect
- RS256 token validation against Azure AD JWKS endpoint
- Auto-provisioning: first login creates user automatically
- App Roles (`Admin`, `Manager`) determine RBAC

### 2. Local Email/Password
- SHA-256 hashed passwords with salt
- HS256 JWT tokens (24-hour expiry)
- Token identified by `iss: "trackmate-local"` claim
- Falls back to this when Azure AD is unavailable

### Token Priority (API Interceptor)
```
1. Check localStorage for local_token → Use as Bearer
2. Check MSAL for active account → acquireTokenSilent → Use as Bearer
3. No token → Request proceeds unauthenticated
```

---

## Role-Based Access

| Feature | Employee | Manager | Admin |
|---|:---:|:---:|:---:|
| Create/edit own goals | ✅ | ✅ | ✅ |
| Submit goal sheet | ✅ | ✅ | ✅ |
| View own achievements | ✅ | ✅ | ✅ |
| View goal alignment/lineage | ✅ | ✅ | ✅ |
| View team goals | ❌ | ✅ | ✅ |
| Approve/reject sheets | ❌ | ✅ | ✅ |
| Log check-ins | ❌ | ✅ | ✅ |
| Cascade goals to team | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Configure quarterly cycles | ❌ | ❌ | ✅ |
| Push shared KPIs | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Unlock approved sheets | ❌ | ❌ | ✅ |
| Export org-wide data | ❌ | ❌ | ✅ |

---
## Business Rules

### Goal Validation Rules
- **Minimum 1, maximum 8 goals** per sheet
- **Minimum 10% weightage** per goal
- **Total weightage must equal exactly 100%** (Decimal precision)
- **Sheet must be in "draft" status** to add/edit goals

### Score Computation (4 UoM Types)

| Type | Formula | Example |
|---|---|---|
| **Numeric** | `min(actual/target, 1.0) × 100` | Target: 500 units, Actual: 450 → Score: 90.00 |
| **Percentage** | `min(actual/target, 1.0) × 100` | Target: 80%, Actual: 75% → Score: 93.75 |
| **Timeline** | `100 - (days_late/allowed_days × 100)` | Due: Mar 31, Done: Apr 5 → Score: 94.44 |
| **Zero-Based** | `100 if actual == 0, else 0` | Zero defects? → Score: 100.00 |

### Workflow State Machine
```
draft ──submit──▶ pending_approval ──approve──▶ approved (locked)
                        │                           │
                        └──reject──▶ rejected   unlock (admin)
                                                    │
                                                     ▼
                                               approved (unlocked)
```

### Notification Events

| Event | Webhook Message | Trigger |
|---|---|---|
| Sheet Approved | *Goal Sheet Approved*: `{actor}` approved the `{FY}` goal sheet. | `POST /{id}/approve` |
| Sheet Rejected | *Goal Sheet Rejected*: `{actor}` rejected the `{FY}` goal sheet. Reason: `{reason}` | `POST /{id}/reject` |
| Sheet Unlocked | *Goal Sheet Unlocked*: `{actor}` unlocked the `{FY}` goal sheet. Reason: `{reason}` | `POST /{id}/unlock` |

> **Configuration**: Set `SLACK_WEBHOOK_URL` in `.env` to enable. Notifications are dispatched via FastAPI `BackgroundTasks` so the API responds instantly without waiting for the webhook call. Leave empty to silently disable notifications in local development.

---

Deployed Link -> https://trackmate-frontend-e26o.onrender.com/