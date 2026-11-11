# DevPilot AI — Autonomous GitHub Developer Agent (Phase 1)

> **Phase 1 Implementation: Foundation, Developer Dashboard, PostgreSQL Database, and GitHub Integration.**

DevPilot AI connects to existing GitHub team repositories, understands codebase structure and responsibilities, identifies meaningful development tasks, and orchestrates verified daily engineering workflows with strict human-in-the-loop oversight.

---

## 1. System Architecture & Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Lucide React icons.
- **Backend**: Node.js, Express.js, TypeScript, REST API, Zod validation, HTTP-only session cookies.
- **Database**: PostgreSQL 16, Prisma ORM with CUID primary keys, database indexes, and complete audit logging.
- **GitHub Integration**: Dual-layer architecture:
  - **GitHub OAuth App**: User identity authentication and sign-in.
  - **GitHub App**: Installation-based repository authorization using short-lived tokens.
- **Infrastructure**: Docker Compose (PostgreSQL, Redis), npm workspaces monorepo.

---

## 2. Monorepo Structure

```
devpilot-ai/
├── apps/
│   ├── api/                 # Express REST API, auth middleware, controllers, services
│   ├── web/                 # React SPA developer dashboard
│   └── worker/              # Agent pipeline scaffolding (planner, coder, reviewer, scheduler)
├── packages/
│   ├── database/            # Prisma schema, client instance, migrations
│   ├── github/              # Octokit wrapper, GitHub App auth, OAuth service, webhook crypto
│   └── shared/              # Shared types, constants, Zod schemas, DTOs
├── docs/
│   ├── architecture.md      # Comprehensive architecture document
│   ├── github-integration.md# GitHub App & OAuth setup instructions
│   └── agent-safety.md      # Safety policies, blast radius controls & guardrails
├── docker-compose.yml       # PostgreSQL and Redis services
├── .env.example             # Environment variable template
└── package.json             # Root monorepo workspace configuration
```

---

## 3. Quickstart & Installation

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- Docker & Docker Compose (or a local PostgreSQL instance)

### Step 1: Clone and Configure Environment

```bash
# Clone the repository
git clone <repo-url>
cd devpilot-ai

# Copy environment variable template
cp .env.example .env
```

Review `.env` and fill in your settings. See [docs/github-integration.md](docs/github-integration.md) for step-by-step guidance on creating your GitHub OAuth and GitHub Apps.

### Step 2: Start Infrastructure (PostgreSQL & Redis)

```bash
docker compose up -d
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Database Migrations

Generate the Prisma client and apply the initial database schema to PostgreSQL:

```bash
npm run db:generate
npm run db:push
```

### Step 5: Start Development Servers

Run the backend API and frontend dashboard concurrently:

```bash
npm run dev:all
```

Or run them individually in separate terminal sessions:

```bash
# Start Backend API (runs at http://localhost:4000)
npm run dev:api

# Start Frontend Dashboard (runs at http://localhost:3000)
npm run dev:web
```

---

## 4. API Endpoints

### Authentication
- `GET /api/auth/github`: Initiates GitHub OAuth login flow.
- `GET /api/auth/github/callback`: Handles OAuth redirect, sets secure session cookie.
- `GET /api/auth/me`: Returns current authenticated user profile and organizations.
- `POST /api/auth/logout`: Clears session cookie.

### GitHub Integration
- `GET /api/github/install`: Generates GitHub App installation URL.
- `GET /api/github/callback`: Handles post-install redirect from GitHub.
- `GET /api/github/repositories`: Lists accessible repositories for connected GitHub App installations.
- `POST /api/github/repositories/sync`: Connects authorized repository and synchronizes metadata into PostgreSQL.
- `DELETE /api/github/repositories/:id`: Safely disconnects repository and halts automated jobs.

### Repositories & Agent Settings
- `GET /api/repositories`: Lists all connected repositories for the active workspace.
- `GET /api/repositories/dashboard/stats`: Returns workspace metrics and chronological audit feed.
- `GET /api/repositories/:id`: Returns single repository details.
- `PATCH /api/repositories/:id/settings`: Updates agent execution schedule, branch prefix, and path guardrails.

### System
- `GET /health`: Health check reporting API, database, and process uptime.

---

## 5. Testing & Verification

```bash
# Run unit tests across the monorepo
npm run test

# Run TypeScript typechecks across all packages and apps
npm run typecheck
```

---

## 6. Safety Guardrails (Phase 1 Status)

- **Standby Mode**: Autonomous code synthesis and automated branch pushes are deferred until Phase 2.
- **No Dummy Data**: No simulated commits, artificial PRs, or mocked statistics.
- **Human-in-the-Loop**: All automated actions in Phase 2 require engineer PR review.
- **Short-Lived Access**: GitHub App tokens expire after 1 hour. Private keys are never stored in the database.

