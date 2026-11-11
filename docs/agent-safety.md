# DevPilot AI — Agent Safety & Guardrail Policy

## 1. Safety Core Philosophy

DevPilot AI is designed to act as an autonomous junior engineer working within rigorous team boundaries. Autonomous agents must never have unchecked or unilateral access to production environments or critical mainline branches.

The following non-negotiable safety guardrails are architected into DevPilot AI:

---

## 2. Fundamental Guardrails

### 1. Zero Direct Mainline Commits
- Autonomous agents are **strictly prohibited** from pushing directly to `main`, `master`, `production`, `staging`, or `release/*` branches.
- Every modification must be committed to an isolated branch with the designated prefix (default `devpilot/`).

### 2. Mandatory Pull Request Review (Human-in-the-Loop)
- All proposed code changes must be submitted as Pull Requests on GitHub.
- Direct merge capability is disabled by default. Pull Requests must undergo normal CI test pipelines and team code reviews before being merged by human engineers.

### 3. Strict Path Boundaries & Blacklisting
- The agent configuration supports both whitelists and blacklists.
- Sensitive files and configuration are blacklisted by default and cannot be modified by the agent:
  - CI/CD workflows: `.github/**`, `.gitlab-ci.yml`, `Jenkinsfile`
  - Infrastructure definitions: `docker/**`, `docker-compose.yml`, `k8s/**`, `terraform/**`
  - Secrets and credentials: `.env*`, `*.pem`, `*.key`, `*.cert`
  - Package locks: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

### 4. Bounded Daily Runs (Rate Limiting)
- Each repository has an enforceable `maxDailyRuns` setting (default 3).
- Prevents runaway loops, excessive API consumption, or noise generation in team repositories.

### 5. Short-Lived Ephemeral Permissions
- Repository actions run exclusively using GitHub App installation tokens that expire automatically after 60 minutes.
- No personal access tokens (PATs) or long-lived credentials are ever created or stored in the database.

### 6. Comprehensive Audit Logging
- Every administrative action (repository connection, disconnection, settings update, agent run trigger) is permanently recorded in the PostgreSQL `AuditLog` table with IP address, user identity, and metadata.

---

## 3. Phase 1 Verification Policy

During Phase 1:
- The autonomous execution loop is intentionally kept in **standby mode**.
- The system will **never** generate fake commits, create dummy pull requests, or push artificial branches to your repository.
- Phase 1 strictly verifies repository authorization, metadata synchronization, and settings configuration.

