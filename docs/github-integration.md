# GitHub Integration Guide

This guide details how to configure both the **GitHub OAuth App** (for user login) and the **GitHub App** (for repository access and autonomous operations).

---

## 1. Why Two Separate GitHub Applications?

DevPilot AI implements a dual-layer security architecture:

1. **GitHub OAuth App**:
   - Used solely to authenticate engineers logging into the DevPilot web dashboard.
   - Requests minimal scope (`read:user`, `user:email`).
   - Does **not** possess read/write access to organizational private repositories.

2. **GitHub App**:
   - Installed on specific team repositories by repository administrators.
   - Operates using GitHub App installations with short-lived tokens (1 hour expiration).
   - Allows fine-grained, least-privilege repository access without tying repo permissions to personal user accounts.

---

## 2. GitHub OAuth App Setup (User Login)

1. Navigate to: **GitHub Settings** &rarr; **Developer Settings** &rarr; **OAuth Apps** &rarr; **New OAuth App**.
2. Configure the following fields:
   - **Application name**: `DevPilot AI Login`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:4000/api/auth/github/callback`
3. Click **Register application**.
4. Generate a **Client Secret**.
5. Copy the credentials to your `.env` file:
   ```env
   GITHUB_CLIENT_ID=your_oauth_client_id
   GITHUB_CLIENT_SECRET=your_oauth_client_secret
   ```

---

## 3. GitHub App Setup (Repository Authorization)

1. Navigate to: **GitHub Settings** &rarr; **Developer Settings** &rarr; **GitHub Apps** &rarr; **New GitHub App**.
2. Configure general settings:
   - **GitHub App name**: `DevPilot AI Agent` (or your preferred unique name)
   - **Homepage URL**: `http://localhost:3000`
   - **Callback URL**: `http://localhost:4000/api/github/callback`
   - **Expire user authorization tokens**: Checked
   - **Request user authorization (OAuth) during installation**: Unchecked (login is handled by the dedicated OAuth App)
3. Configure **Webhook**:
   - **Active**: Checked
   - **Webhook URL**: `http://your-domain-or-tunnel/api/github/webhooks` (e.g. via ngrok or smee in development)
   - **Webhook secret**: Generate a secure random string (e.g. `openssl rand -hex 20`) and set as `GITHUB_WEBHOOK_SECRET`.
4. Configure **Permissions**:
   - **Repository Permissions**:
     - *Contents*: Read & write (required in Phase 2 for branch commits)
     - *Pull requests*: Read & write (required for creating PRs)
     - *Issues*: Read & write
     - *Metadata*: Read-only (mandatory default)
5. Select **Where can this GitHub App be installed?**:
   - Choose *Any account* (for multi-tenant SaaS) or *Only on this account* (for internal use).
6. Click **Create GitHub App**.
7. Note down the **App ID** and **App Slug** on the General settings tab.
8. Scroll down to **Private keys** and click **Generate a private key**.
   - Download the `.pem` file.
   - Format the private key into a single string with `\n` linebreaks, or store the key file and set the contents in `.env`:
   ```env
   GITHUB_APP_ID=123456
   GITHUB_APP_SLUG=devpilot-ai-agent
   GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
   GITHUB_WEBHOOK_SECRET=your_webhook_secret
   ```

---

## 4. Installation Flow & Repository Authorization

1. When an authenticated user visits the **Repositories** page in DevPilot AI, they can click **Install / Add Repos**.
2. DevPilot generates a secure installation URL (`https://github.com/apps/<app-slug>/installations/new?state=...`) with a cryptographic state cookie.
3. GitHub presents the user with the repository selector (All repositories or Only select repositories).
4. Upon confirmation, GitHub redirects back to `/api/github/callback?installation_id=...`.
5. DevPilot immediately lists accessible repositories via:
   ```ts
   octokit.rest.apps.listReposAccessibleToInstallation({ installation_id })
   ```
6. The user selects which authorized repositories to connect into DevPilot's daily engineering workflow.

